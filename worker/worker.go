package worker

import (
	"context"
	"fmt"
	"time"

	log "github.com/gophish/gophish/logger"
	"github.com/gophish/gophish/mailer"
	"github.com/gophish/gophish/models"
	"github.com/sirupsen/logrus"
)

// Worker is an interface that defines the operations needed for a background worker
type Worker interface {
	Start()
	LaunchCampaign(c models.Campaign)
	SendTestEmail(s *models.EmailRequest) error
}

// DefaultWorker is the background worker that handles watching for new campaigns and sending emails appropriately.
type DefaultWorker struct {
	mailer mailer.Mailer
}

// New creates a new worker object to handle the creation of campaigns
func New(options ...func(Worker) error) (Worker, error) {
	defaultMailer := mailer.NewMailWorker()
	w := &DefaultWorker{
		mailer: defaultMailer,
	}
	for _, opt := range options {
		if err := opt(w); err != nil {
			return nil, err
		}
	}
	return w, nil
}

// WithMailer sets the mailer for a given worker.
// By default, workers use a standard, default mailworker.
func WithMailer(m mailer.Mailer) func(*DefaultWorker) error {
	return func(w *DefaultWorker) error {
		w.mailer = m
		return nil
	}
}

// processCampaigns loads maillogs scheduled to be sent before the provided
// time and sends them to the mailer.
func (w *DefaultWorker) processCampaigns(t time.Time) error {
	ms, err := models.GetQueuedMailLogs(t.UTC())
	if err != nil {
		log.Error(err)
		return err
	}
	// Lock the MailLogs (they will be unlocked after processing)
	err = models.LockMailLogs(ms, true)
	if err != nil {
		return err
	}
	campaignCache := make(map[string]models.Campaign)
	// We'll group the maillogs by campaign ID to (roughly) group
	// them by sending profile. This lets the mailer re-use the Sender
	// instead of having to re-connect to the SMTP server for every
	// email.
	msg := make(map[string][]mailer.Mail)
	for _, m := range ms {
		result, err := models.GetResult(m.RId)
		if err != nil {
			return err
		}
		cacheKey := fmt.Sprintf("%d:%d", m.CampaignId, result.ScenarioId)
		// We cache the campaign here to greatly reduce the time it takes to
		// generate the message. Scenario ID is included because each scenario
		// can use a different sending profile and email template.
		c, ok := campaignCache[cacheKey]
		if !ok {
			c, err = models.GetCampaignMailContextForScenario(m.CampaignId, m.UserId, result.ScenarioId)
			if err != nil {
				return err
			}
			campaignCache[cacheKey] = c
		}
		m.CacheCampaign(&c)
		msg[cacheKey] = append(msg[cacheKey], m)
	}

	// Next, we process each group of maillogs in parallel
	for cacheKey, msc := range msg {
		go func(c models.Campaign, msc []mailer.Mail) {
			if c.Status == models.CampaignQueued {
				err := c.UpdateStatus(models.CampaignInProgress)
				if err != nil {
					log.Error(err)
					return
				}
			}
			log.WithFields(logrus.Fields{
				"num_emails": len(msc),
			}).Info("Sending emails to mailer for processing")
			w.mailer.Queue(msc)
		}(campaignCache[cacheKey], msc)
	}
	return nil
}

// Start launches the worker to poll the database every minute for any pending maillogs
// that need to be processed.
func (w *DefaultWorker) Start() {
	log.Info("Background Worker Started Successfully - Waiting for Campaigns")
	go w.mailer.Start(context.Background())
	for t := range time.Tick(1 * time.Minute) {
		err := w.processCampaigns(t)
		if err != nil {
			log.Error(err)
			continue
		}
	}
}

// LaunchCampaign starts a campaign
func (w *DefaultWorker) LaunchCampaign(c models.Campaign) {
	ms, err := models.GetMailLogsByCampaign(c.Id)
	if err != nil {
		log.Error(err)
		return
	}
	models.LockMailLogs(ms, true)
	// This is required since you cannot pass a slice of values
	// that implements an interface as a slice of that interface.
	mailEntries := []mailer.Mail{}
	currentTime := time.Now().UTC()
	campaignCache := make(map[string]models.Campaign)
	for _, m := range ms {
		// Only send the emails scheduled to be sent for the past minute to
		// respect the campaign scheduling options
		if m.SendDate.After(currentTime) {
			m.Unlock()
			continue
		}
		result, err := models.GetResult(m.RId)
		if err != nil {
			log.Error(err)
			return
		}
		cacheKey := fmt.Sprintf("%d:%d", m.CampaignId, result.ScenarioId)
		campaignMailCtx, ok := campaignCache[cacheKey]
		if !ok {
			campaignMailCtx, err = models.GetCampaignMailContextForScenario(m.CampaignId, m.UserId, result.ScenarioId)
			if err != nil {
				log.Error(err)
				return
			}
			campaignCache[cacheKey] = campaignMailCtx
		}
		err = m.CacheCampaign(&campaignMailCtx)
		if err != nil {
			log.Error(err)
			return
		}
		mailEntries = append(mailEntries, m)
	}
	w.mailer.Queue(mailEntries)
}

// SendTestEmail sends a test email
func (w *DefaultWorker) SendTestEmail(s *models.EmailRequest) error {
	go func() {
		ms := []mailer.Mail{s}
		w.mailer.Queue(ms)
	}()
	return <-s.ErrorChan
}
