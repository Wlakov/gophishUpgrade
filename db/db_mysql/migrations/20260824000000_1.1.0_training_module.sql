-- +goose Up
ALTER TABLE campaigns ADD COLUMN training_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE results ADD COLUMN training_viewed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE results ADD COLUMN training_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE results ADD COLUMN training_passed BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down
ALTER TABLE results DROP COLUMN training_passed;
ALTER TABLE results DROP COLUMN training_completed;
ALTER TABLE results DROP COLUMN training_viewed;
ALTER TABLE campaigns DROP COLUMN training_enabled;
