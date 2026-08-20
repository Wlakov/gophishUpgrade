let userCampaignWorkspaces = []
let displayedCampaigns = []

const campaignItems = (items, render, emptyMessage) => {
    if (!items || items.length === 0) {
        return "<p class='text-muted'>" + (emptyMessage || "No items.") + "</p>"
    }
    return "<ul class='list-group'>" + $.map(items, item =>
        "<li class='list-group-item'>" + render(item) + "</li>"
    ).join("") + "</ul>"
}

const campaignResource = (title, content) => "<div class='panel panel-default'>" +
    "<div class='panel-heading'><strong>" + escapeHtml(title) + "</strong></div>" +
    "<div class='panel-body'>" + content + "</div></div>"

const formatDate = (value) => {
    if (!value || value === "0001-01-01T00:00:00Z") {
        return "Not set"
    }
    const date = new Date(value)
    return isNaN(date.getTime()) ? "Not set" : date.toLocaleString()
}

const campaignStats = (campaign) => {
    const results = campaign.results || []
    const countStatus = status => results.filter(result => result.status === status).length
    const submitted = countStatus("Submitted Data")
    const clicked = countStatus("Clicked Link") + submitted
    const opened = countStatus("Email Opened") + clicked
    return {
        total: results.length,
        sent: countStatus("Email Sent") + opened,
        opened: opened,
        clicked: clicked,
        submitted: submitted,
        reported: results.filter(result => result.reported).length,
        errors: countStatus("Error")
    }
}

const percentage = (value, total) => total ? Math.round((value / total) * 100) + "%" : "—"

const statusClass = (status) => {
    switch ((status || "").toLowerCase()) {
    case "completed": return "success"
    case "in progress": return "primary"
    case "emails sent": return "info"
    case "queued": return "warning"
    default: return "default"
    }
}

const metric = (label, value, detail, modifier) =>
    "<div class='col-xs-6 col-sm-3 user-campaign-metric " + (modifier || "") + "'>" +
    "<span class='user-campaign-metric-value'>" + value + "</span>" +
    "<span class='user-campaign-metric-label'>" + escapeHtml(label) + "</span>" +
    (detail ? "<small>" + escapeHtml(detail) + "</small>" : "") + "</div>"

const resultStatusClass = (result) => {
    if (result.reported) return "success"
    if (result.status === "Submitted Data") return "danger"
    if (result.status === "Clicked Link") return "warning"
    if (result.status === "Error") return "danger"
    return "default"
}

const campaignDetails = (campaign) => {
    const template = campaign.template || {}
    const page = campaign.page || {}
    const smtp = campaign.smtp || {}
    const scenarios = campaignItems(campaign.scenarios, scenario =>
        "<strong>" + escapeHtml(scenario.name) + "</strong> <span class='text-muted'>" +
        escapeHtml((scenario.template || {}).name || "[Deleted]") + " / " + escapeHtml((scenario.page || {}).name || "[Deleted]") + " / " + escapeHtml((scenario.smtp || {}).name || "[Deleted]") + "</span>")
    const results = campaignItems(campaign.results, result =>
        "<strong>" + escapeHtml(result.email) + "</strong> <span class='label label-" + resultStatusClass(result) + "'>" +
        escapeHtml(result.reported ? "Reported" : result.status) + "</span>")
    const events = campaignItems(campaign.timeline, event =>
        "<strong>" + escapeHtml(event.email) + "</strong> <span class='text-muted'>" + escapeHtml(event.message) + "</span>")
    const groups = campaignItems(campaign.groups, group =>
        "<strong>" + escapeHtml(group.name) + "</strong>")

    const stats = campaignStats(campaign)
    return "<div class='row user-campaign-details-summary'>" +
        metric("Recipients", stats.total, "", "") +
        metric("Opened", stats.opened, percentage(stats.opened, stats.total), "") +
        metric("Clicked", stats.clicked, percentage(stats.clicked, stats.total), "") +
        metric("Submitted", stats.submitted, percentage(stats.submitted, stats.total), "danger") +
        "</div>" +
        "<dl class='dl-horizontal user-campaign-description'><dt>Status</dt><dd><span class='label label-" + statusClass(campaign.status) + "'>" + escapeHtml(campaign.status || "Unknown") + "</span></dd>" +
        "<dt>Created</dt><dd>" + formatDate(campaign.created_date) + "</dd><dt>Launch date</dt><dd>" + formatDate(campaign.launch_date) +
        "</dd><dt>Campaign URL</dt><dd class='text-break'>" + escapeHtml(campaign.url || "Not set") + "</dd></dl>" +
        campaignResource("Groups", groups) +
        campaignResource("Email Template", "<p><strong>" + escapeHtml(template.name || "[Deleted]") + "</strong> " + escapeHtml(template.subject || "") + "</p><pre>" + escapeHtml(template.text || "") + "</pre><pre>" + escapeHtml(template.html || "") + "</pre>") +
        campaignResource("Landing Page", "<p><strong>" + escapeHtml(page.name || "[Deleted]") + "</strong></p><pre>" + escapeHtml(page.html || "") + "</pre>") +
        campaignResource("Sending Profile", "<p><strong>" + escapeHtml(smtp.name || "[Deleted]") + "</strong> " + escapeHtml(smtp.host || "") + " / " + escapeHtml(smtp.from_address || "") + "</p>") +
        campaignResource("Phishing Scenarios", scenarios) +
        campaignResource("Recipients and Results", results) +
        campaignResource("Event Timeline", events)
}

const campaignSearchText = (workspace, campaign) => {
    const collectNames = items => (items || []).map(item => item.name || "").join(" ")
    return [workspace.user.username, workspace.user.role.name, campaign.name, campaign.status,
        campaign.template && campaign.template.name, campaign.page && campaign.page.name,
        campaign.smtp && campaign.smtp.name, collectNames(campaign.groups), collectNames(campaign.scenarios)].join(" ").toLowerCase()
}

const campaignCard = (workspace, campaign, index) => {
    const stats = campaignStats(campaign)
    const activity = stats.opened + stats.clicked + stats.submitted + stats.reported
    return "<article class='panel panel-default user-campaign-card' data-campaign-index='" + index + "'>" +
        "<div class='panel-body'>" +
        "<div class='row'><div class='col-sm-8'><h3 class='user-campaign-card-title'>" + escapeHtml(campaign.name) + "</h3>" +
        "<p class='text-muted user-campaign-card-meta'><i class='fa fa-user'></i> " + escapeHtml(workspace.user.username) +
        " <span class='user-campaign-separator'>•</span> Created " + formatDate(campaign.created_date) + "</p></div>" +
        "<div class='col-sm-4 text-right'><span class='label label-" + statusClass(campaign.status) + " user-campaign-status'>" +
        escapeHtml(campaign.status || "Unknown") + "</span></div></div>" +
        "<div class='row user-campaign-card-metrics'>" +
        metric("Recipients", stats.total, "", "") + metric("Opened", percentage(stats.opened, stats.total), stats.opened + " people", "") +
        metric("Reported", percentage(stats.reported, stats.total), stats.reported + " people", "success") +
        metric("Risk actions", percentage(stats.clicked + stats.submitted, stats.total), activity + " interactions", "danger") +
        "</div>" +
        "<div class='user-campaign-card-footer'><span class='text-muted'><i class='fa fa-users'></i> " + (campaign.groups || []).length + " group(s) &nbsp; <i class='fa fa-sitemap'></i> " + (campaign.scenarios || []).length + " scenario(s)</span>" +
        "<button class='btn btn-primary btn-sm pull-right show-user-campaign-details' data-campaign-index='" + index + "'><i class='fa fa-eye'></i> View details</button></div>" +
        "</div></article>"
}

const totalCard = (icon, label, value, modifier) =>
    "<div class='col-xs-6 col-md-3'><div class='user-campaign-total " + modifier + "'><i class='fa " + icon + "'></i><div><span>" + value +
    "</span><small>" + escapeHtml(label) + "</small></div></div></div>"

const renderTotals = () => {
    const campaigns = []
    let recipients = 0
    let reported = 0
    let submitted = 0
    userCampaignWorkspaces.forEach(workspace => (workspace.campaigns || []).forEach(campaign => {
        const stats = campaignStats(campaign)
        campaigns.push(campaign)
        recipients += stats.total
        reported += stats.reported
        submitted += stats.submitted
    }))
    $("#userCampaignTotals").html(
        totalCard("fa-users", "Users", userCampaignWorkspaces.length, "primary") +
        totalCard("fa-bullhorn", "Campaigns", campaigns.length, "info") +
        totalCard("fa-envelope", "Recipients", recipients, "warning") +
        totalCard("fa-flag", "Reported emails", reported + " / " + submitted + " submitted", "success"))
}

const renderCampaigns = () => {
    const query = $("#userCampaignSearch").val().trim().toLowerCase()
    const status = $("#userCampaignStatus").val()
    const owner = $("#userCampaignOwner").val()
    displayedCampaigns = []
    const content = userCampaignWorkspaces.map(workspace => {
        if (owner && owner !== String(workspace.user.id)) return ""
        const cards = (workspace.campaigns || []).filter(campaign =>
            (!status || campaign.status === status) && (!query || campaignSearchText(workspace, campaign).indexOf(query) !== -1)
        ).map(campaign => {
            const index = displayedCampaigns.length
            displayedCampaigns.push({ workspace: workspace, campaign: campaign })
            return campaignCard(workspace, campaign, index)
        }).join("")
        if (!cards) return ""
        return "<section class='user-campaign-workspace'><div class='user-campaign-workspace-heading'><div class='user-campaign-avatar'>" +
            escapeHtml(workspace.user.username.charAt(0).toUpperCase()) + "</div><div><h2>" + escapeHtml(workspace.user.username) +
            "</h2><span>" + escapeHtml((workspace.user.role || {}).name || "User") + "</span></div><span class='badge pull-right'>" +
            (workspace.campaigns || []).length + " campaign(s)</span></div>" + cards + "</section>"
    }).join("")
    $("#userCampaignWorkspaces").html(content)
    $("#userCampaignFilterCount").text(displayedCampaigns.length)
    $("#userCampaignEmpty").toggle(displayedCampaigns.length === 0)
}

const fillFilters = () => {
    const statuses = {}
    userCampaignWorkspaces.forEach(workspace => (workspace.campaigns || []).forEach(campaign => { if (campaign.status) statuses[campaign.status] = true }))
    Object.keys(statuses).sort().forEach(status => $("#userCampaignStatus").append($("<option>").val(status).text(status)))
    userCampaignWorkspaces.slice().sort((a, b) => a.user.username.localeCompare(b.user.username)).forEach(workspace =>
        $("#userCampaignOwner").append($("<option>").val(workspace.user.id).text(workspace.user.username)))
}

const openCampaignDetails = (index) => {
    const item = displayedCampaigns[index]
    if (!item) return
    $("#userCampaignDetailsTitle").text(item.campaign.name + " — " + item.workspace.user.username)
    $("#userCampaignDetailsContent").html(campaignDetails(item.campaign))
    $("#userCampaignDetailsModal").modal("show")
}

$(document).ready(() => {
    api.userCampaigns.get().success((workspaces) => {
        userCampaignWorkspaces = workspaces || []
        $("#loading").hide()
        fillFilters()
        renderTotals()
        renderCampaigns()
        $("#userCampaignDashboard").show()
    }).error((data) => {
        $("#loading").hide()
        errorFlash(data.responseJSON ? data.responseJSON.message : "Error loading user campaigns")
    })

    $(document).on("input change", "#userCampaignSearch, #userCampaignStatus, #userCampaignOwner", renderCampaigns)
    $(document).on("click", ".show-user-campaign-details", function () { openCampaignDetails(Number($(this).data("campaign-index"))) })
    $("#resetUserCampaignFilters").click(() => {
        $("#userCampaignSearch").val("")
        $("#userCampaignStatus, #userCampaignOwner").val("")
        renderCampaigns()
    })
})
