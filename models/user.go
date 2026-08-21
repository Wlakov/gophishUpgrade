package models

import (
	"errors"
	"time"

	log "github.com/gophish/gophish/logger"
)

// ErrModifyingOnlyAdmin occurs when there is an attempt to modify the only
// user account with the Admin role in such a way that there will be no user
// accounts left in Gophish with that role.
var ErrModifyingOnlyAdmin = errors.New("Cannot remove the only administrator")

var (
	ErrManagerRequired       = errors.New("A campaign manager must be selected for an editor or viewer")
	ErrInvalidManager        = errors.New("The selected user is not a campaign manager")
	ErrManagerHasMembers     = errors.New("Cannot delete a campaign manager while users are assigned to them")
	ErrManagerCannotHaveLead = errors.New("A system administrator or campaign manager cannot be assigned to a department")
)

// User represents the user model for gophish.
type User struct {
	Id                     int64     `json:"id"`
	Username               string    `json:"username" sql:"not null;unique"`
	Hash                   string    `json:"-"`
	ApiKey                 string    `json:"api_key" sql:"not null;unique"`
	Role                   Role      `json:"role" gorm:"association_autoupdate:false;association_autocreate:false"`
	RoleID                 int64     `json:"-"`
	ManagerID              *int64    `json:"manager_id,omitempty"`
	PasswordChangeRequired bool      `json:"password_change_required"`
	AccountLocked          bool      `json:"account_locked"`
	LastLogin              time.Time `json:"last_login"`
}

// GetUser returns the user that the given id corresponds to. If no user is found, an
// error is thrown.
func GetUser(id int64) (User, error) {
	u := User{}
	err := db.Preload("Role").Where("id=?", id).First(&u).Error
	return u, err
}

// GetUsers returns the users registered in Gophish
func GetUsers() ([]User, error) {
	us := []User{}
	err := db.Preload("Role").Find(&us).Error
	return us, err
}

// GetDepartmentMembers returns the editors and viewers assigned to a campaign
// manager. Managers remain the owners of their own data; this relationship is
// used for organisation and administrator reporting.
func GetDepartmentMembers(managerID int64) ([]User, error) {
	users := []User{}
	err := db.Preload("Role").Where("manager_id=?", managerID).Find(&users).Error
	return users, err
}

// WorkspaceOwnerID returns the account that owns the department workspace a
// user works in. Campaign managers own their own workspace; editors and
// viewers work with the shared workspace of their assigned campaign manager.
// System administrators keep their personal workspace separate and use the
// administrator views when they need to inspect other departments.
func (u User) WorkspaceOwnerID() int64 {
	if (u.Role.Slug == RoleEditor || u.Role.Slug == RoleViewer) && u.ManagerID != nil {
		return *u.ManagerID
	}
	return u.Id
}

// ValidateManagerAssignment verifies the department relationship required by
// the selected role.
func ValidateManagerAssignment(roleSlug string, managerID *int64, userID int64) error {
	switch roleSlug {
	case RoleAdmin, RoleCampaignManager:
		if managerID != nil {
			return ErrManagerCannotHaveLead
		}
		return nil
	case RoleEditor, RoleViewer:
		if managerID == nil {
			return ErrManagerRequired
		}
		if *managerID == userID && userID != 0 {
			return ErrInvalidManager
		}
		manager, err := GetUser(*managerID)
		if err != nil {
			return ErrInvalidManager
		}
		if manager.Role.Slug != RoleCampaignManager {
			return ErrInvalidManager
		}
		return nil
	default:
		return ErrInvalidManager
	}
}

// GetUserByAPIKey returns the user that the given API Key corresponds to. If no user is found, an
// error is thrown.
func GetUserByAPIKey(key string) (User, error) {
	u := User{}
	err := db.Preload("Role").Where("api_key = ?", key).First(&u).Error
	return u, err
}

// GetUserByUsername returns the user that the given username corresponds to. If no user is found, an
// error is thrown.
func GetUserByUsername(username string) (User, error) {
	u := User{}
	err := db.Preload("Role").Where("username = ?", username).First(&u).Error
	return u, err
}

// PutUser updates the given user
func PutUser(u *User) error {
	err := db.Save(u).Error
	return err
}

// EnsureEnoughAdmins ensures that there is more than one user account in
// Gophish with the Admin role. This function is meant to be called before
// modifying a user account with the Admin role in a non-revokable way.
func EnsureEnoughAdmins() error {
	role, err := GetRoleBySlug(RoleAdmin)
	if err != nil {
		return err
	}
	var adminCount int
	err = db.Model(&User{}).Where("role_id=?", role.ID).Count(&adminCount).Error
	if err != nil {
		return err
	}
	if adminCount == 1 {
		return ErrModifyingOnlyAdmin
	}
	return nil
}

// DeleteUser deletes the given user. To ensure that there is always at least
// one user account with the Admin role, this function will refuse to delete
// the last Admin.
func DeleteUser(id int64) error {
	existing, err := GetUser(id)
	if err != nil {
		return err
	}
	// If the user is an admin, we need to verify that it's not the last one.
	if existing.Role.Slug == RoleAdmin {
		err = EnsureEnoughAdmins()
		if err != nil {
			return err
		}
	}
	if existing.Role.Slug == RoleCampaignManager {
		members, err := GetDepartmentMembers(id)
		if err != nil {
			return err
		}
		if len(members) > 0 {
			return ErrManagerHasMembers
		}
	}
	campaigns, err := GetCampaigns(id)
	if err != nil {
		return err
	}
	// Delete the campaigns
	log.Infof("Deleting campaigns for user ID %d", id)
	for _, campaign := range campaigns {
		err = DeleteCampaign(campaign.Id)
		if err != nil {
			return err
		}
	}
	log.Infof("Deleting pages for user ID %d", id)
	// Delete the landing pages
	pages, err := GetPages(id)
	if err != nil {
		return err
	}
	for _, page := range pages {
		err = DeletePage(page.Id, id)
		if err != nil {
			return err
		}
	}
	// Delete the templates
	log.Infof("Deleting templates for user ID %d", id)
	templates, err := GetTemplates(id)
	if err != nil {
		return err
	}
	for _, template := range templates {
		err = DeleteTemplate(template.Id, id)
		if err != nil {
			return err
		}
	}
	// Delete the groups
	log.Infof("Deleting groups for user ID %d", id)
	groups, err := GetGroups(id)
	if err != nil {
		return err
	}
	for _, group := range groups {
		err = DeleteGroup(&group)
		if err != nil {
			return err
		}
	}
	// Delete the sending profiles
	log.Infof("Deleting sending profiles for user ID %d", id)
	profiles, err := GetSMTPs(id)
	if err != nil {
		return err
	}
	for _, profile := range profiles {
		err = DeleteSMTP(profile.Id, id)
		if err != nil {
			return err
		}
	}
	// Finally, delete the user
	err = db.Where("id=?", id).Delete(&User{}).Error
	return err
}
