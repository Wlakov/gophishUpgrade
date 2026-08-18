-- +goose Up
CREATE TABLE phishing_scenarios (
    id integer primary key autoincrement,
    user_id bigint NOT NULL,
    name varchar(255) NOT NULL,
    template_id bigint NOT NULL,
    page_id bigint NOT NULL,
    smtp_id bigint NOT NULL,
    created_date datetime,
    modified_date datetime
);
CREATE UNIQUE INDEX idx_phishing_scenarios_user_name ON phishing_scenarios(user_id, name);
CREATE TABLE campaign_scenarios (
    id integer primary key autoincrement,
    campaign_id bigint NOT NULL,
    scenario_id bigint NOT NULL
);
CREATE UNIQUE INDEX idx_campaign_scenarios_campaign_scenario ON campaign_scenarios(campaign_id, scenario_id);
ALTER TABLE results ADD COLUMN scenario_id bigint;

-- +goose Down
DROP TABLE campaign_scenarios;
DROP TABLE phishing_scenarios;
