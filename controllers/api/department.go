package api

import (
	"net/http"
	"strconv"

	"github.com/gophish/gophish/models"
	"github.com/gorilla/mux"
	"github.com/jinzhu/gorm"
)

// DepartmentWorkspace returns the owned resources of a campaign manager and
// every editor or viewer assigned to that manager. The route is restricted to
// system administrators by the router.
func (as *Server) DepartmentWorkspace(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		return
	}
	managerID, err := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	if err != nil {
		JSONResponse(w, models.Response{Success: false, Message: "Department not found"}, http.StatusNotFound)
		return
	}
	department, err := models.GetDepartmentWorkspace(managerID)
	if err != nil {
		status := http.StatusInternalServerError
		if err == gorm.ErrRecordNotFound || err == models.ErrDepartmentNotFound {
			status = http.StatusNotFound
		}
		JSONResponse(w, models.Response{Success: false, Message: err.Error()}, status)
		return
	}
	JSONResponse(w, department, http.StatusOK)
}
