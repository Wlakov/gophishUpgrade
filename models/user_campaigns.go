package models

// UserCampaignWorkspace is the administrator's read-only view of all
// campaigns owned by one user. Each campaign includes its related template,
// landing page, sending profile, scenarios, results, and event timeline.
type UserCampaignWorkspace struct {
	User      User       `json:"user"`
	Campaigns []Campaign `json:"campaigns"`
}

// GetUserCampaignWorkspaces returns campaign workspaces for every user in the
// system. It is intended exclusively for the system-administrator API.
func GetUserCampaignWorkspaces() ([]UserCampaignWorkspace, error) {
	users, err := GetUsers()
	if err != nil {
		return nil, err
	}
	workspaces := make([]UserCampaignWorkspace, 0, len(users))
	for _, user := range users {
		campaigns, err := GetCampaigns(user.Id)
		if err != nil {
			return nil, err
		}
		workspaces = append(workspaces, UserCampaignWorkspace{
			User:      user,
			Campaigns: campaigns,
		})
	}
	return workspaces, nil
}
