package models

import (
	"errors"
	"time"

	"github.com/jinzhu/gorm"
)

// PhishingScenario is a reusable, internally consistent phishing exercise.
// Each scenario binds exactly one email template, landing page, and sending
// profile that are used together for a recipient.
type PhishingScenario struct {
	Id           int64     `json:"id" gorm:"column:id; primary_key:yes"`
	UserId       int64     `json:"-" gorm:"column:user_id"`
	Name         string    `json:"name"`
	TemplateId   int64     `json:"template_id"`
	Template     Template  `json:"template" gorm:"-"`
	PageId       int64     `json:"page_id"`
	Page         Page      `json:"page" gorm:"-"`
	SMTPId       int64     `json:"smtp_id"`
	SMTP         SMTP      `json:"smtp" gorm:"-"`
	CreatedDate  time.Time `json:"created_date"`
	ModifiedDate time.Time `json:"modified_date"`
}

// CampaignScenario is the persisted relationship between a campaign and a
// scenario selected for that campaign.
type CampaignScenario struct {
	Id         int64 `json:"id"`
	CampaignId int64 `json:"campaign_id"`
	ScenarioId int64 `json:"scenario_id"`
}

var (
	ErrScenarioNameNotSpecified     = errors.New("Phishing scenario name not specified")
	ErrScenarioTemplateNotSpecified = errors.New("Phishing scenario email template not specified")
	ErrScenarioPageNotSpecified     = errors.New("Phishing scenario landing page not specified")
	ErrScenarioSMTPNotSpecified     = errors.New("Phishing scenario sending profile not specified")
	ErrScenarioNotFound             = errors.New("Phishing scenario not found")
	ErrScenarioInUse                = errors.New("Phishing scenario is used by a campaign and cannot be deleted")
)

// Validate ensures a scenario contains all three required components.
func (s *PhishingScenario) Validate() error {
	switch {
	case s.Name == "":
		return ErrScenarioNameNotSpecified
	case s.TemplateId == 0:
		return ErrScenarioTemplateNotSpecified
	case s.PageId == 0:
		return ErrScenarioPageNotSpecified
	case s.SMTPId == 0:
		return ErrScenarioSMTPNotSpecified
	}
	return nil
}

func (s *PhishingScenario) getDetails() error {
	if err := s.Validate(); err != nil {
		return err
	}
	t, err := GetTemplate(s.TemplateId, s.UserId)
	if err != nil {
		return err
	}
	p, err := GetPage(s.PageId, s.UserId)
	if err != nil {
		return err
	}
	smtp, err := GetSMTP(s.SMTPId, s.UserId)
	if err != nil {
		return err
	}
	s.Template = t
	s.Page = p
	s.SMTP = smtp
	return nil
}

// GetPhishingScenarios returns all scenarios owned by a user.
func GetPhishingScenarios(uid int64) ([]PhishingScenario, error) {
	scenarios := []PhishingScenario{}
	if err := db.Where("user_id=?", uid).Find(&scenarios).Error; err != nil {
		return scenarios, err
	}
	for i := range scenarios {
		if err := scenarios[i].getDetails(); err != nil {
			return scenarios, err
		}
	}
	return scenarios, nil
}

// GetPhishingScenario returns a scenario owned by a user.
func GetPhishingScenario(id int64, uid int64) (PhishingScenario, error) {
	scenario := PhishingScenario{}
	if err := db.Where("id=? AND user_id=?", id, uid).First(&scenario).Error; err != nil {
		return scenario, err
	}
	if err := scenario.getDetails(); err != nil {
		return scenario, err
	}
	return scenario, nil
}

// GetPhishingScenarioByName returns a scenario by name for duplicate checks.
func GetPhishingScenarioByName(name string, uid int64) (PhishingScenario, error) {
	scenario := PhishingScenario{}
	err := db.Where("name=? AND user_id=?", name, uid).First(&scenario).Error
	return scenario, err
}

// PostPhishingScenario creates a scenario after verifying its references.
func PostPhishingScenario(s *PhishingScenario) error {
	if err := s.Validate(); err != nil {
		return err
	}
	if err := s.getDetails(); err != nil {
		return err
	}
	return db.Save(s).Error
}

// PutPhishingScenario updates a scenario after verifying its references.
func PutPhishingScenario(s *PhishingScenario) error {
	if err := s.Validate(); err != nil {
		return err
	}
	if err := s.getDetails(); err != nil {
		return err
	}
	return db.Where("id=? AND user_id=?", s.Id, s.UserId).Save(s).Error
}

// DeletePhishingScenario deletes an unused scenario.
func DeletePhishingScenario(id int64, uid int64) error {
	var count int64
	if err := db.Model(&CampaignScenario{}).Where("scenario_id=?", id).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrScenarioInUse
	}
	return db.Where("id=? AND user_id=?", id, uid).Delete(&PhishingScenario{}).Error
}

// GetCampaignScenarios returns the scenarios selected when a campaign was created.
func GetCampaignScenarios(campaignID int64, uid int64) ([]PhishingScenario, error) {
	links := []CampaignScenario{}
	if err := db.Where("campaign_id=?", campaignID).Find(&links).Error; err != nil {
		return nil, err
	}
	scenarios := make([]PhishingScenario, 0, len(links))
	for _, link := range links {
		scenario, err := GetPhishingScenario(link.ScenarioId, uid)
		if err != nil {
			return nil, err
		}
		scenarios = append(scenarios, scenario)
	}
	return scenarios, nil
}

// GetCampaignMailContextForScenario returns a mail context with the scenario's
// components substituted. A zero scenario ID preserves legacy campaign behavior.
func GetCampaignMailContextForScenario(id int64, uid int64, scenarioID int64) (Campaign, error) {
	campaign, err := GetCampaignMailContext(id, uid)
	if err != nil || scenarioID == 0 {
		return campaign, err
	}
	scenario, err := GetPhishingScenario(scenarioID, uid)
	if err != nil {
		return campaign, err
	}
	campaign.TemplateId = scenario.TemplateId
	campaign.Template = scenario.Template
	campaign.PageId = scenario.PageId
	campaign.Page = scenario.Page
	campaign.SMTPId = scenario.SMTPId
	campaign.SMTP = scenario.SMTP
	return campaign, nil
}

// ResolvePhishingScenarios validates campaign selections and removes duplicates.
func ResolvePhishingScenarios(selections []PhishingScenario, uid int64) ([]PhishingScenario, error) {
	resolved := make([]PhishingScenario, 0, len(selections))
	seen := make(map[int64]bool)
	for _, selection := range selections {
		if selection.Id == 0 || seen[selection.Id] {
			continue
		}
		scenario, err := GetPhishingScenario(selection.Id, uid)
		if err == gorm.ErrRecordNotFound {
			return nil, ErrScenarioNotFound
		}
		if err != nil {
			return nil, err
		}
		seen[selection.Id] = true
		resolved = append(resolved, scenario)
	}
	if len(resolved) == 0 {
		return nil, ErrScenarioNotFound
	}
	return resolved, nil
}
