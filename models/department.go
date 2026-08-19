package models

import "errors"

// ErrDepartmentNotFound is returned when an administrator requests a user who
// is not a campaign manager as a department.
var ErrDepartmentNotFound = errors.New("Department not found")

// UserWorkspace is the read-only inventory of a department member's owned
// resources. It is returned only to a system administrator.
type UserWorkspace struct {
	User              User               `json:"user"`
	Campaigns         []Campaign         `json:"campaigns"`
	Groups            []Group            `json:"groups"`
	Templates         []Template         `json:"templates"`
	Pages             []Page             `json:"pages"`
	SendingProfiles   []SMTP             `json:"sending_profiles"`
	PhishingScenarios []PhishingScenario `json:"phishing_scenarios"`
}

// DepartmentWorkspace contains a campaign manager and all editors and viewers
// assigned to that manager, together with each user's owned resources.
type DepartmentWorkspace struct {
	Manager    User            `json:"manager"`
	Workspaces []UserWorkspace `json:"workspaces"`
}

func getUserWorkspace(user User) (UserWorkspace, error) {
	workspace := UserWorkspace{User: user}
	var err error
	if workspace.Campaigns, err = GetCampaigns(user.Id); err != nil {
		return workspace, err
	}
	if workspace.Groups, err = GetGroups(user.Id); err != nil {
		return workspace, err
	}
	if workspace.Templates, err = GetTemplates(user.Id); err != nil {
		return workspace, err
	}
	if workspace.Pages, err = GetPages(user.Id); err != nil {
		return workspace, err
	}
	if workspace.SendingProfiles, err = GetSMTPs(user.Id); err != nil {
		return workspace, err
	}
	if workspace.PhishingScenarios, err = GetPhishingScenarios(user.Id); err != nil {
		return workspace, err
	}
	return workspace, nil
}

// GetDepartmentWorkspace returns every owned resource for the selected
// campaign manager and their directly assigned editors and viewers.
func GetDepartmentWorkspace(managerID int64) (DepartmentWorkspace, error) {
	department := DepartmentWorkspace{}
	manager, err := GetUser(managerID)
	if err != nil {
		return department, err
	}
	if manager.Role.Slug != RoleCampaignManager {
		return department, ErrDepartmentNotFound
	}
	department.Manager = manager
	members, err := GetDepartmentMembers(managerID)
	if err != nil {
		return department, err
	}
	owners := append([]User{manager}, members...)
	department.Workspaces = make([]UserWorkspace, 0, len(owners))
	for _, owner := range owners {
		workspace, err := getUserWorkspace(owner)
		if err != nil {
			return department, err
		}
		department.Workspaces = append(department.Workspaces, workspace)
	}
	return department, nil
}
