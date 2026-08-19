-- +goose Up
ALTER TABLE users ADD COLUMN manager_id INTEGER;
CREATE INDEX idx_users_manager_id ON users(manager_id);

-- +goose Down
DROP INDEX IF EXISTS idx_users_manager_id;
