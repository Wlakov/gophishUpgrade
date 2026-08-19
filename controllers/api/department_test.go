package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gophish/gophish/models"
)

func TestDepartmentWorkspace(t *testing.T) {
	testCtx := setupTest(t)
	manager := createUnpriviledgedUser(t, models.RoleCampaignManager)
	editorRole, err := models.GetRoleBySlug(models.RoleEditor)
	if err != nil {
		t.Fatalf("error getting editor role: %v", err)
	}
	editor := &models.User{
		Username: "department-editor",
		Hash:     "bar",
		ApiKey:   "department-editor-key",
		Role:     editorRole,
		RoleID:   editorRole.ID,
	}
	editor.ManagerID = &manager.Id
	if err := models.PutUser(editor); err != nil {
		t.Fatalf("error assigning editor to manager: %v", err)
	}

	r := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/departments/%d", manager.Id), nil)
	r.Header.Set("Authorization", fmt.Sprintf("Bearer %s", testCtx.apiKey))
	w := httptest.NewRecorder()
	testCtx.apiServer.ServeHTTP(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("unexpected error code received. expected %d got %d", http.StatusOK, w.Code)
	}
	department := &models.DepartmentWorkspace{}
	if err := json.NewDecoder(w.Body).Decode(department); err != nil {
		t.Fatalf("error decoding department payload: %v", err)
	}
	if department.Manager.Id != manager.Id || len(department.Workspaces) != 2 {
		t.Fatalf("unexpected department workspace returned")
	}
}
