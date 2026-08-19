package api

import (
	"net/http"

	"github.com/gophish/gophish/models"
)

// UserCampaigns returns every user's campaigns and their related materials.
// The route is restricted to system administrators by the router.
func (as *Server) UserCampaigns(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		return
	}
	workspaces, err := models.GetUserCampaignWorkspaces()
	if err != nil {
		JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
		return
	}
	JSONResponse(w, workspaces, http.StatusOK)
}
