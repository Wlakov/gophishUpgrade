package api

import (
	"net/http"

	ctx "github.com/gophish/gophish/context"
	"github.com/gophish/gophish/models"
)

// workspaceOwnerID resolves the shared department workspace for the account
// authenticated on an API request. Editors and viewers therefore see the
// materials and results owned by their assigned campaign manager.
func workspaceOwnerID(r *http.Request) int64 {
	if user, ok := ctx.Get(r, "user").(models.User); ok {
		return user.WorkspaceOwnerID()
	}
	return ctx.Get(r, "user_id").(int64)
}
