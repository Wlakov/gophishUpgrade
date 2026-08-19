const campaignItems = (items, render) => {
    if (!items || items.length === 0) {
        return "<p class='text-muted'>No items.</p>"
    }
    return "<ul class='list-group'>" + $.map(items, item =>
        "<li class='list-group-item'>" + render(item) + "</li>"
    ).join("") + "</ul>"
}

const campaignResource = (title, content) => "<div class='panel panel-default'>" +
    "<div class='panel-heading'><strong>" + escapeHtml(title) + "</strong></div>" +
    "<div class='panel-body'>" + content + "</div></div>"

const campaignDetails = (campaign) => {
    const template = campaign.template || {}
    const page = campaign.page || {}
    const smtp = campaign.smtp || {}
    const scenarios = campaignItems(campaign.scenarios, scenario =>
        "<strong>" + escapeHtml(scenario.name) + "</strong> <span class='text-muted'>" +
        escapeHtml(scenario.template.name) + " / " + escapeHtml(scenario.page.name) + " / " + escapeHtml(scenario.smtp.name) + "</span>")
    const results = campaignItems(campaign.results, result =>
        "<strong>" + escapeHtml(result.email) + "</strong> <span class='text-muted'>" + escapeHtml(result.status) + "</span>")
    const events = campaignItems(campaign.timeline, event =>
        "<strong>" + escapeHtml(event.email) + "</strong> <span class='text-muted'>" + escapeHtml(event.message) + "</span>")
    const groups = campaignItems(campaign.groups, group =>
        "<strong>" + escapeHtml(group.name) + "</strong>")

    return "<details><summary><strong>" + escapeHtml(campaign.name) + "</strong> <span class='label label-info'>" +
        escapeHtml(campaign.status) + "</span></summary><br>" +
        "<p><strong>URL:</strong> " + escapeHtml(campaign.url || "") + "</p>" +
        campaignResource("Groups", groups) +
        campaignResource("Email Template", "<p><strong>" + escapeHtml(template.name || "[Deleted]") + "</strong> " + escapeHtml(template.subject || "") + "</p><pre>" + escapeHtml(template.text || "") + "</pre><pre>" + escapeHtml(template.html || "") + "</pre>") +
        campaignResource("Landing Page", "<p><strong>" + escapeHtml(page.name || "[Deleted]") + "</strong></p><pre>" + escapeHtml(page.html || "") + "</pre>") +
        campaignResource("Sending Profile", "<p><strong>" + escapeHtml(smtp.name || "[Deleted]") + "</strong> " + escapeHtml(smtp.host || "") + " / " + escapeHtml(smtp.from_address || "") + "</p>") +
        campaignResource("Phishing Scenarios", scenarios) +
        campaignResource("Recipients and Results", results) +
        campaignResource("Event Timeline", events) +
        "</details>"
}

$(document).ready(() => {
    api.userCampaigns.get().success((workspaces) => {
        $("#loading").hide()
        const content = $.map(workspaces, workspace => {
            const campaigns = workspace.campaigns && workspace.campaigns.length > 0
                ? $.map(workspace.campaigns, campaignDetails).join("<hr>")
                : "<p class='text-muted'>No campaigns.</p>"
            return "<div class='panel panel-primary'><div class='panel-heading'><h3 class='panel-title'>" +
                escapeHtml(workspace.user.username) + " <small>" + escapeHtml(workspace.user.role.name) +
                "</small></h3></div><div class='panel-body'>" + campaigns + "</div></div>"
        }).join("")
        $("#userCampaignWorkspaces").html(content).show()
    }).error((data) => {
        $("#loading").hide()
        errorFlash(data.responseJSON ? data.responseJSON.message : "Error loading user campaigns")
    })
})
