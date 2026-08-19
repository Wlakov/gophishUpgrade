package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gophish/gophish/models"
)

func TestSystemAdministratorCanViewUserCampaigns(t *testing.T) {
	testCtx := setupTest(t)
	createTestData(t)

	r := httptest.NewRequest(http.MethodGet, "/api/user_campaigns/", nil)
	r.Header.Set("Authorization", fmt.Sprintf("Bearer %s", testCtx.apiKey))
	w := httptest.NewRecorder()
	testCtx.apiServer.ServeHTTP(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("unexpected error code received. expected %d got %d", http.StatusOK, w.Code)
	}
	workspaces := []models.UserCampaignWorkspace{}
	if err := json.NewDecoder(w.Body).Decode(&workspaces); err != nil {
		t.Fatalf("error decoding user campaigns payload: %v", err)
	}
	if len(workspaces) != 1 || len(workspaces[0].Campaigns) != 1 {
		t.Fatal("system administrator did not receive the expected campaign workspace")
	}
}

func TestCampaignManagerCannotViewUserCampaigns(t *testing.T) {
	testCtx := setupTest(t)
	manager := createUnpriviledgedUser(t, models.RoleCampaignManager)

	r := httptest.NewRequest(http.MethodGet, "/api/user_campaigns/", nil)
	r.Header.Set("Authorization", fmt.Sprintf("Bearer %s", manager.ApiKey))
	w := httptest.NewRecorder()
	testCtx.apiServer.ServeHTTP(w, r)
	if w.Code != http.StatusForbidden {
		t.Fatalf("unexpected error code received. expected %d got %d", http.StatusForbidden, w.Code)
	}
}
