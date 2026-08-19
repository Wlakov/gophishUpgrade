package api

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gophish/gophish/models"
)

func TestEditorCannotCreateCampaign(t *testing.T) {
	testCtx := setupTest(t)
	editor := createUnpriviledgedUser(t, models.RoleEditor)

	r := httptest.NewRequest(http.MethodPost, "/api/campaigns/", bytes.NewBufferString(`{}`))
	r.Header.Set("Authorization", fmt.Sprintf("Bearer %s", editor.ApiKey))
	w := httptest.NewRecorder()

	testCtx.apiServer.ServeHTTP(w, r)
	if w.Code != http.StatusForbidden {
		t.Fatalf("unexpected error code received. expected %d got %d", http.StatusForbidden, w.Code)
	}
}

func TestCampaignManagerCanCreateCampaign(t *testing.T) {
	testCtx := setupTest(t)
	manager := createUnpriviledgedUser(t, models.RoleCampaignManager)

	r := httptest.NewRequest(http.MethodPost, "/api/campaigns/", bytes.NewBufferString(`{}`))
	r.Header.Set("Authorization", fmt.Sprintf("Bearer %s", manager.ApiKey))
	w := httptest.NewRecorder()

	testCtx.apiServer.ServeHTTP(w, r)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("unexpected error code received. expected %d got %d", http.StatusBadRequest, w.Code)
	}
}
