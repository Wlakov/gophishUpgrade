package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gophish/gophish/models"
)

func TestPhishingScenarioAPI(t *testing.T) {
	testCtx := setupTest(t)
	createTestData(t)

	template, err := models.GetTemplateByName("Test Template", testCtx.admin.Id)
	if err != nil {
		t.Fatalf("getting template: %v", err)
	}
	page, err := models.GetPageByName("Test Page", testCtx.admin.Id)
	if err != nil {
		t.Fatalf("getting landing page: %v", err)
	}
	smtp, err := models.GetSMTPByName("Test Page", testCtx.admin.Id)
	if err != nil {
		t.Fatalf("getting sending profile: %v", err)
	}
	payload := models.PhishingScenario{
		Name:       "Scenario API test",
		TemplateId: template.Id,
		PageId:     page.Id,
		SMTPId:     smtp.Id,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("encoding scenario: %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "/api/phishing_scenarios/", bytes.NewReader(body))
	request.Header.Set("Authorization", "Bearer "+testCtx.apiKey)
	response := httptest.NewRecorder()
	testCtx.apiServer.ServeHTTP(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("creating scenario: expected %d, got %d: %s", http.StatusCreated, response.Code, response.Body.String())
	}
	created := models.PhishingScenario{}
	if err := json.NewDecoder(response.Body).Decode(&created); err != nil {
		t.Fatalf("decoding created scenario: %v", err)
	}
	if created.Id == 0 || created.Template.Id != template.Id || created.Page.Id != page.Id || created.SMTP.Id != smtp.Id {
		t.Fatalf("created scenario has incomplete dependencies: %#v", created)
	}

	request = httptest.NewRequest(http.MethodGet, "/api/phishing_scenarios/", nil)
	request.Header.Set("Authorization", "Bearer "+testCtx.apiKey)
	response = httptest.NewRecorder()
	testCtx.apiServer.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("listing scenarios: expected %d, got %d", http.StatusOK, response.Code)
	}
	listed := []models.PhishingScenario{}
	if err := json.NewDecoder(response.Body).Decode(&listed); err != nil {
		t.Fatalf("decoding scenarios: %v", err)
	}
	if len(listed) != 1 || listed[0].Id != created.Id {
		t.Fatalf("unexpected scenarios response: %#v", listed)
	}

	request = httptest.NewRequest(http.MethodPost, "/api/phishing_scenarios/", bytes.NewReader(body))
	request.Header.Set("Authorization", "Bearer "+testCtx.apiKey)
	response = httptest.NewRecorder()
	testCtx.apiServer.ServeHTTP(response, request)
	if response.Code != http.StatusConflict {
		t.Fatalf("duplicate scenario: expected %d, got %d", http.StatusConflict, response.Code)
	}

	request = httptest.NewRequest(http.MethodDelete, "/api/phishing_scenarios/"+strconv.FormatInt(created.Id, 10), nil)
	request.Header.Set("Authorization", "Bearer "+testCtx.apiKey)
	response = httptest.NewRecorder()
	testCtx.apiServer.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("deleting scenario: expected %d, got %d: %s", http.StatusOK, response.Code, response.Body.String())
	}
}
