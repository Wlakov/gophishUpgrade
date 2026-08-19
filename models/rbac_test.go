package models

import (
	"fmt"

	check "gopkg.in/check.v1"
)

type PermissionCheck map[string]bool

func (s *ModelsSuite) TestHasPermission(c *check.C) {

	permissionTests := map[string]PermissionCheck{
		RoleAdmin: PermissionCheck{
			PermissionModifySystem:    true,
			PermissionModifyObjects:   true,
			PermissionViewObjects:     true,
			PermissionLaunchCampaigns: true,
		},
		RoleCampaignManager: PermissionCheck{
			PermissionModifySystem:    false,
			PermissionModifyObjects:   true,
			PermissionViewObjects:     true,
			PermissionLaunchCampaigns: true,
		},
		RoleEditor: PermissionCheck{
			PermissionModifySystem:    false,
			PermissionModifyObjects:   true,
			PermissionViewObjects:     true,
			PermissionLaunchCampaigns: false,
		},
		RoleViewer: PermissionCheck{
			PermissionModifySystem:    false,
			PermissionModifyObjects:   false,
			PermissionViewObjects:     true,
			PermissionLaunchCampaigns: false,
		},
	}

	for r, checks := range permissionTests {
		// Create the user with the provided role
		role, err := GetRoleBySlug(r)
		c.Assert(err, check.Equals, nil)
		user := User{
			Username: fmt.Sprintf("test-%s", r),
			Hash:     "12345",
			ApiKey:   fmt.Sprintf("%s-key", r),
			RoleID:   role.ID,
		}
		PutUser(&user)

		// Perform the permission checks
		for permission, expected := range checks {
			access, err := user.HasPermission(permission)
			fmt.Printf("Checking %s -> %s\n", r, permission)
			c.Assert(err, check.Equals, nil)
			c.Assert(access, check.Equals, expected)
		}
	}
}

func (s *ModelsSuite) TestGetRoleBySlug(c *check.C) {
	roles := []string{RoleAdmin, RoleCampaignManager, RoleEditor, RoleViewer}
	for _, role := range roles {
		got, err := GetRoleBySlug(role)
		c.Assert(err, check.Equals, nil)
		c.Assert(got.Slug, check.Equals, role)
	}
	_, err := GetRoleBySlug("bogus")
	c.Assert(err, check.NotNil)
}

func (s *ModelsSuite) TestIsAssignableRole(c *check.C) {
	for _, role := range []string{RoleAdmin, RoleCampaignManager, RoleEditor, RoleViewer} {
		c.Assert(IsAssignableRole(role), check.Equals, true)
	}
	c.Assert(IsAssignableRole("user"), check.Equals, false)
	c.Assert(IsAssignableRole("unsupported"), check.Equals, false)
}
