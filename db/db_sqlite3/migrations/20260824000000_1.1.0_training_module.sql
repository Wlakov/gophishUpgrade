-- +goose Up
ALTER TABLE campaigns ADD COLUMN training_enabled boolean NOT NULL DEFAULT 0;
ALTER TABLE results ADD COLUMN training_viewed boolean NOT NULL DEFAULT 0;
ALTER TABLE results ADD COLUMN training_completed boolean NOT NULL DEFAULT 0;
ALTER TABLE results ADD COLUMN training_passed boolean NOT NULL DEFAULT 0;

-- +goose Down
-- SQLite cannot reliably drop columns on all supported versions. The columns
-- are intentionally retained when rolling back this optional feature.
