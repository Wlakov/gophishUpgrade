package api

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gophish/gophish/models"
)

func createDepartmentMember(t *testing.T, manager *models.User, username, slug string) *models.User {
	t.Helper()
	role, err := models.GetRoleBySlug(slug)
	if err != nil {
		t.Fatalf("getting %s role: %v", slug, err)
	}
	member := &models.User{
		Username:  username,
		Hash:      "bar",
		ApiKey:    username + "-key",
		Role:      role,
		RoleID:    role.ID,
		ManagerID: &manager.Id,
	}
	if err := models.PutUser(member); err != nil {
		t.Fatalf("creating department member: %v", err)
	}
	return member
}

func createDepartmentWorkspace(t *testing.T, ownerID int64) models.Campaign {
	t.Helper()
	group := models.Group{
		UserId: ownerID,
		Name:   "Department group",
		Targets: []models.Target{{BaseRecipient: models.BaseRecipient{
			Email: "employee@example.com",
		}}},
	}
	if err := models.PostGroup(&group); err != nil {
		t.Fatalf("creating group: %v", err)
	}
	template := models.Template{UserId: ownerID, Name: "Department template", Subject: "Subject", Text: "Body"}
	if err := models.PostTemplate(&template); err != nil {
		t.Fatalf("creating template: %v", err)
	}
	page := models.Page{UserId: ownerID, Name: "Department page", HTML: "<html><body>Page</body></html>"}
	if err := models.PostPage(&page); err != nil {
		t.Fatalf("creating page: %v", err)
	}
	smtp := models.SMTP{UserId: ownerID, Name: "Department SMTP", Host: "localhost", FromAddress: "sender@example.com"}
	if err := models.PostSMTP(&smtp); err != nil {
		t.Fatalf("creating SMTP profile: %v", err)
	}
	scenario := models.PhishingScenario{
		UserId: ownerID, Name: "Department scenario", TemplateId: template.Id, PageId: page.Id, SMTPId: smtp.Id,
	}
	if err := models.PostPhishingScenario(&scenario); err != nil {
		t.Fatalf("creating phishing scenario: %v", err)
	}
	campaign := models.Campaign{
		Name: "Department campaign", Template: template, Page: page, SMTP: smtp, Groups: []models.Group{group},
	}
	if err := models.PostCampaign(&campaign, ownerID); err != nil {
		t.Fatalf("creating campaign: %v", err)
	}
	return campaign
}

func TestDepartmentMembersUseCampaignManagerWorkspace(t *testing.T) {
	testCtx := setupTest(t)
	manager := createUnpriviledgedUser(t, models.RoleCampaignManager)
	viewer := createDepartmentMember(t, manager, "department-viewer", models.RoleViewer)
	campaign := createDepartmentWorkspace(t, manager.Id)

	for _, path := range []string{
		"/api/groups/",
		"/api/groups/summary",
		"/api/templates/",
		"/api/pages/",
		"/api/smtp/",
		"/api/phishing_scenarios/",
		"/api/campaigns/",
		"/api/campaigns/summary",
		fmt.Sprintf("/api/campaigns/%d", campaign.Id),
		fmt.Sprintf("/api/campaigns/%d/results", campaign.Id),
	} {
		r := httptest.NewRequest(http.MethodGet, path, nil)
		r.Header.Set("Authorization", "Bearer "+viewer.ApiKey)
		w := httptest.NewRecorder()
		testCtx.apiServer.ServeHTTP(w, r)
		if w.Code != http.StatusOK {
			t.Fatalf("viewer cannot access manager workspace at %s: %d: %s", path, w.Code, w.Body.String())
		}
	}

	r := httptest.NewRequest(http.MethodPost, "/api/groups/", bytes.NewBufferString(`{"name":"Denied"}`))
	r.Header.Set("Authorization", "Bearer "+viewer.ApiKey)
	w := httptest.NewRecorder()
	testCtx.apiServer.ServeHTTP(w, r)
	if w.Code != http.StatusForbidden {
		t.Fatalf("viewer unexpectedly changed a department resource: %d", w.Code)
	}

	for _, path := range []string{"/api/imap/", "/api/imap/validate"} {
		r := httptest.NewRequest(http.MethodGet, path, nil)
		r.Header.Set("Authorization", "Bearer "+viewer.ApiKey)
		w := httptest.NewRecorder()
		testCtx.apiServer.ServeHTTP(w, r)
		if w.Code != http.StatusForbidden {
			t.Fatalf("viewer unexpectedly accessed reporting settings at %s: %d", path, w.Code)
		}
	}
}

func TestEditorCreatesMaterialsInCampaignManagerWorkspace(t *testing.T) {
	testCtx := setupTest(t)
	manager := createUnpriviledgedUser(t, models.RoleCampaignManager)
	editor := createDepartmentMember(t, manager, "department-editor", models.RoleEditor)

	r := httptest.NewRequest(http.MethodPost, "/api/templates/", bytes.NewBufferString(`{"name":"Editor template","subject":"Subject","text":"Body"}`))
	r.Header.Set("Authorization", "Bearer "+editor.ApiKey)
	w := httptest.NewRecorder()
	testCtx.apiServer.ServeHTTP(w, r)
	if w.Code != http.StatusCreated {
		t.Fatalf("editor could not create a department template: %d: %s", w.Code, w.Body.String())
	}
	templates, err := models.GetTemplates(manager.Id)
	if err != nil || len(templates) != 1 || templates[0].Name != "Editor template" {
		t.Fatalf("editor template was not saved in manager workspace: %#v, %v", templates, err)
	}
}

func TestViewerAPIKeyCannotAccessRestrictedRoutes(t *testing.T) {
	testCtx := setupTest(t)
	manager := createUnpriviledgedUser(t, models.RoleCampaignManager)
	viewer := createDepartmentMember(t, manager, "restricted-viewer", models.RoleViewer)

	tests := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/api/reset"},
		{http.MethodPost, "/api/campaigns/"},
		{http.MethodGet, "/api/campaigns/1/complete"},
		{http.MethodPost, "/api/groups/"},
		{http.MethodPut, "/api/groups/1"},
		{http.MethodDelete, "/api/groups/1"},
		{http.MethodPost, "/api/templates/"},
		{http.MethodPost, "/api/pages/"},
		{http.MethodPost, "/api/smtp/"},
		{http.MethodPost, "/api/phishing_scenarios/"},
		{http.MethodPost, "/api/imap/"},
		{http.MethodPost, "/api/imap/validate"},
		{http.MethodPost, "/api/util/send_test_email"},
		{http.MethodPost, "/api/import/group"},
		{http.MethodPost, "/api/import/email"},
		{http.MethodPost, "/api/import/site"},
		{http.MethodGet, "/api/users/"},
		{http.MethodGet, fmt.Sprintf("/api/users/%d", manager.Id)},
		{http.MethodPut, fmt.Sprintf("/api/users/%d", viewer.Id)},
		{http.MethodGet, "/api/user_campaigns/"},
		{http.MethodGet, fmt.Sprintf("/api/departments/%d", manager.Id)},
		{http.MethodGet, "/api/webhooks/"},
	}

	for _, tt := range tests {
		r := httptest.NewRequest(tt.method, tt.path, bytes.NewBufferString(`{}`))
		r.Header.Set("Authorization", "Bearer "+viewer.ApiKey)
		w := httptest.NewRecorder()
		testCtx.apiServer.ServeHTTP(w, r)
		if w.Code != http.StatusForbidden {
			t.Errorf("viewer API key accessed %s %s: got %d, want %d; response: %s", tt.method, tt.path, w.Code, http.StatusForbidden, w.Body.String())
		}
	}
}
