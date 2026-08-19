-- +goose Up
CREATE TABLE campaign_groups (
    campaign_id bigint NOT NULL,
    group_id bigint NOT NULL
);
CREATE UNIQUE INDEX idx_campaign_groups_campaign_group ON campaign_groups(campaign_id, group_id);

-- +goose Down
DROP TABLE campaign_groups;
