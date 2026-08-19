package models

import (
	"errors"

	"github.com/jinzhu/gorm"
	"gopkg.in/check.v1"
)

func scenarioForCampaign(c Campaign, name string) PhishingScenario {
	return PhishingScenario{
		Name:       name,
		UserId:     c.UserId,
		TemplateId: c.Template.Id,
		PageId:     c.Page.Id,
		SMTPId:     c.SMTP.Id,
	}
}

func (s *ModelsSuite) TestPhishingScenarioCRUD(c *check.C) {
	campaign := s.createCampaignDependencies(c)
	scenario := scenarioForCampaign(campaign, "Credential update")

	c.Assert(PostPhishingScenario(&scenario), check.IsNil)
	c.Assert(scenario.Id, check.Not(check.Equals), int64(0))

	got, err := GetPhishingScenario(scenario.Id, scenario.UserId)
	c.Assert(err, check.IsNil)
	c.Assert(got.Name, check.Equals, scenario.Name)
	c.Assert(got.Template.Id, check.Equals, campaign.Template.Id)
	c.Assert(got.Page.Id, check.Equals, campaign.Page.Id)
	c.Assert(got.SMTP.Id, check.Equals, campaign.SMTP.Id)

	scenario.Name = "Updated credential update"
	c.Assert(PutPhishingScenario(&scenario), check.IsNil)
	got, err = GetPhishingScenario(scenario.Id, scenario.UserId)
	c.Assert(err, check.IsNil)
	c.Assert(got.Name, check.Equals, scenario.Name)

	c.Assert(DeletePhishingScenario(scenario.Id, scenario.UserId), check.IsNil)
	_, err = GetPhishingScenario(scenario.Id, scenario.UserId)
	c.Assert(errors.Is(err, gorm.ErrRecordNotFound), check.Equals, true)
}

func (s *ModelsSuite) TestPhishingScenarioCampaignAssignment(c *check.C) {
	campaign := s.createCampaignDependencies(c)
	first := scenarioForCampaign(campaign, "First scenario")
	c.Assert(PostPhishingScenario(&first), check.IsNil)

	secondTemplate := Template{
		Name:    "Second template",
		Subject: "Second subject",
		Text:    "Second text",
		HTML:    "<html>Second</html>",
		UserId:  campaign.UserId,
	}
	c.Assert(PostTemplate(&secondTemplate), check.IsNil)
	secondPage := Page{Name: "Second page", HTML: "<html>Second page</html>", UserId: campaign.UserId}
	c.Assert(PostPage(&secondPage), check.IsNil)
	secondSMTP := SMTP{Name: "Second SMTP", Host: "example.org", FromAddress: "second@example.org", UserId: campaign.UserId}
	c.Assert(PostSMTP(&secondSMTP), check.IsNil)
	second := PhishingScenario{
		Name:       "Second scenario",
		UserId:     campaign.UserId,
		TemplateId: secondTemplate.Id,
		PageId:     secondPage.Id,
		SMTPId:     secondSMTP.Id,
	}
	c.Assert(PostPhishingScenario(&second), check.IsNil)

	campaign.Scenarios = []PhishingScenario{first, second, first}
	c.Assert(PostCampaign(&campaign, campaign.UserId), check.IsNil)

	stored, err := GetCampaign(campaign.Id, campaign.UserId)
	c.Assert(err, check.IsNil)
	c.Assert(len(stored.Scenarios), check.Equals, 2)
	for _, result := range stored.Results {
		c.Assert(result.ScenarioId == first.Id || result.ScenarioId == second.Id, check.Equals, true)
	}

	mailContext, err := GetCampaignMailContextForScenario(campaign.Id, campaign.UserId, second.Id)
	c.Assert(err, check.IsNil)
	c.Assert(mailContext.Template.Id, check.Equals, secondTemplate.Id)
	c.Assert(mailContext.Page.Id, check.Equals, secondPage.Id)
	c.Assert(mailContext.SMTP.Id, check.Equals, secondSMTP.Id)

	c.Assert(DeletePhishingScenario(first.Id, first.UserId), check.Equals, ErrScenarioInUse)

	statuses := []string{EventSent, EventOpened, EventClicked, EventDataSubmit}
	for i := range stored.Results {
		result := stored.Results[i]
		result.Status = statuses[i]
		if i < 2 {
			result.ScenarioId = first.Id
		} else {
			result.ScenarioId = second.Id
		}
		result.Reported = i == 0
		c.Assert(db.Save(&result).Error, check.IsNil)
	}
	results, err := GetCampaignResults(campaign.Id, campaign.UserId)
	c.Assert(err, check.IsNil)
	c.Assert(len(results.ScenarioStats), check.Equals, 2)
	firstStats := results.ScenarioStats[0].Stats
	c.Assert(firstStats.Total, check.Equals, int64(2))
	c.Assert(firstStats.EmailsSent, check.Equals, int64(2))
	c.Assert(firstStats.OpenedEmail, check.Equals, int64(1))
	c.Assert(firstStats.EmailReported, check.Equals, int64(1))
	secondStats := results.ScenarioStats[1].Stats
	c.Assert(secondStats.Total, check.Equals, int64(2))
	c.Assert(secondStats.EmailsSent, check.Equals, int64(2))
	c.Assert(secondStats.OpenedEmail, check.Equals, int64(2))
	c.Assert(secondStats.ClickedLink, check.Equals, int64(2))
	c.Assert(secondStats.SubmittedData, check.Equals, int64(1))

	c.Assert(DeleteCampaign(campaign.Id), check.IsNil)
	c.Assert(DeletePhishingScenario(first.Id, first.UserId), check.IsNil)
}

func (s *ModelsSuite) TestPhishingScenarioValidation(c *check.C) {
	scenario := PhishingScenario{}
	c.Assert(scenario.Validate(), check.Equals, ErrScenarioNameNotSpecified)
	scenario.Name = "Missing dependencies"
	c.Assert(scenario.Validate(), check.Equals, ErrScenarioTemplateNotSpecified)
	scenario.TemplateId = 1
	c.Assert(scenario.Validate(), check.Equals, ErrScenarioPageNotSpecified)
	scenario.PageId = 1
	c.Assert(scenario.Validate(), check.Equals, ErrScenarioSMTPNotSpecified)
}
