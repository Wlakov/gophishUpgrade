-- +goose Up
ALTER TABLE users ADD COLUMN manager_id BIGINT NULL;
CREATE INDEX idx_users_manager_id ON users(manager_id);

-- +goose Down
DROP INDEX idx_users_manager_id ON users;
ALTER TABLE users DROP COLUMN manager_id;
