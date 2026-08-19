-- +goose Up
CREATE TABLE campaign_groups (
    campaign_id bigint NOT NULL,
    group_id bigint NOT NULL,
    UNIQUE KEY idx_campaign_groups_campaign_group (campaign_id, group_id)
);

-- +goose Down
DROP TABLE campaign_groups;
