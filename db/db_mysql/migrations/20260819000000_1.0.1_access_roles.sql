-- +goose Up
INSERT IGNORE INTO permissions (slug, name, description)
VALUES ('launch_campaigns', 'Launch Campaigns', 'Launch, complete, and delete owned campaigns');

INSERT IGNORE INTO roles (slug, name, description)
VALUES
    ('campaign_manager', 'Campaign Manager', 'Can manage and launch owned campaigns'),
    ('editor', 'Editor', 'Can manage owned campaign materials but cannot launch campaigns'),
    ('viewer', 'Viewer', 'Can view owned campaign materials and results');

UPDATE roles SET name='System Administrator', description='Manages users and system-wide configuration' WHERE slug='admin';

UPDATE users
SET role_id=(SELECT id FROM (SELECT * FROM roles) AS migrated_role WHERE slug='campaign_manager')
WHERE role_id=(SELECT id FROM (SELECT * FROM roles) AS legacy_role WHERE slug='user');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug IN ('admin', 'campaign_manager') AND p.slug='launch_campaigns';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug IN ('campaign_manager', 'editor') AND p.slug IN ('view_objects', 'modify_objects');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug='viewer' AND p.slug='view_objects';

DELETE FROM role_permissions WHERE role_id=(SELECT id FROM (SELECT * FROM roles) AS legacy_role WHERE slug='user');
DELETE FROM roles WHERE slug='user';

-- +goose Down
INSERT IGNORE INTO roles (slug, name, description)
VALUES ('user', 'User', 'User role with edit access to objects and campaigns');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug='user' AND p.slug IN ('view_objects', 'modify_objects');

UPDATE users
SET role_id=(SELECT id FROM (SELECT * FROM roles) AS legacy_role WHERE slug='user')
WHERE role_id IN (SELECT id FROM (SELECT * FROM roles) AS migrated_roles WHERE slug IN ('campaign_manager', 'editor', 'viewer'));

DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM (SELECT * FROM roles) AS migrated_roles WHERE slug IN ('campaign_manager', 'editor', 'viewer'));
DELETE FROM roles WHERE slug IN ('campaign_manager', 'editor', 'viewer');
DELETE FROM permissions WHERE slug='launch_campaigns';
