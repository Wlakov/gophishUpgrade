package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	ctx "github.com/gophish/gophish/context"
	"github.com/gophish/gophish/models"
	"github.com/gorilla/mux"
	"github.com/jinzhu/gorm"
)

// PhishingScenarios handles the collection endpoint for reusable scenarios.
func (as *Server) PhishingScenarios(w http.ResponseWriter, r *http.Request) {
	uid := ctx.Get(r, "user_id").(int64)
	switch r.Method {
	case http.MethodGet:
		scenarios, err := models.GetPhishingScenarios(uid)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, scenarios, http.StatusOK)
	case http.MethodPost:
		scenario := models.PhishingScenario{}
		if err := json.NewDecoder(r.Body).Decode(&scenario); err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Invalid request"}, http.StatusBadRequest)
			return
		}
		if _, err := models.GetPhishingScenarioByName(scenario.Name, uid); err != gorm.ErrRecordNotFound {
			JSONResponse(w, models.Response{Success: false, Message: "Phishing scenario name already in use"}, http.StatusConflict)
			return
		}
		scenario.UserId = uid
		scenario.CreatedDate = time.Now().UTC()
		scenario.ModifiedDate = scenario.CreatedDate
		if err := models.PostPhishingScenario(&scenario); err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		JSONResponse(w, scenario, http.StatusCreated)
	}
}

// PhishingScenario handles a single scenario resource.
func (as *Server) PhishingScenario(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	uid := ctx.Get(r, "user_id").(int64)
	scenario, err := models.GetPhishingScenario(id, uid)
	if err != nil {
		JSONResponse(w, models.Response{Success: false, Message: "Phishing scenario not found"}, http.StatusNotFound)
		return
	}
	switch r.Method {
	case http.MethodGet:
		JSONResponse(w, scenario, http.StatusOK)
	case http.MethodDelete:
		if err := models.DeletePhishingScenario(id, uid); err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusConflict)
			return
		}
		JSONResponse(w, models.Response{Success: true, Message: "Phishing scenario deleted successfully"}, http.StatusOK)
	case http.MethodPut:
		updated := models.PhishingScenario{}
		if err := json.NewDecoder(r.Body).Decode(&updated); err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Invalid request"}, http.StatusBadRequest)
			return
		}
		if updated.Id != id {
			JSONResponse(w, models.Response{Success: false, Message: "/:id and /:scenario_id mismatch"}, http.StatusBadRequest)
			return
		}
		if updated.Name != scenario.Name {
			if _, err := models.GetPhishingScenarioByName(updated.Name, uid); err != gorm.ErrRecordNotFound {
				JSONResponse(w, models.Response{Success: false, Message: "Phishing scenario name already in use"}, http.StatusConflict)
				return
			}
		}
		updated.UserId = uid
		updated.CreatedDate = scenario.CreatedDate
		updated.ModifiedDate = time.Now().UTC()
		if err := models.PutPhishingScenario(&updated); err != nil {
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		JSONResponse(w, updated, http.StatusOK)
	}
}
