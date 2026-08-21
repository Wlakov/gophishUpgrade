let userCampaignWorkspaces = []
let displayedCampaigns = []
let openedCampaignMaterials = { email: [], landing: [] }

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

const previewFrame = (kind, title) =>
    "<div class='user-campaign-preview-wrap'><iframe class='user-campaign-preview' title='" + escapeHtml(title) +
    "' data-preview='" + kind + "' sandbox referrerpolicy='no-referrer'></iframe></div>" +
    "<p class='text-muted user-campaign-preview-note'><i class='fa fa-shield'></i> Preview is isolated; links, forms, and scripts are disabled.</p>"

const previewPanel = (title, name, metadata, kind) =>
    "<div class='user-campaign-material'><div class='user-campaign-material-heading'><div><i class='fa fa-eye'></i> <strong>" +
    escapeHtml(title) + "</strong><span>" + escapeHtml(name || "[Deleted]") + "</span></div>" + metadata + "</div>" + previewFrame(kind, title) + "</div>"

const campaignMaterialList = (campaign, kind) => {
    const materials = []
    const addMaterial = (resource, source) => {
        const item = resource || {}
        const key = String(item.id || "") + "|" + String(item.name || "[Deleted]") + "|" + String(item.html || "")
        const existing = materials.find(material => material.key === key)
        if (existing) {
            existing.sources.push(source)
            return
        }
        materials.push({ key: key, resource: item, sources: [source] })
    }
    addMaterial(kind === "email" ? campaign.template : campaign.page, "Campaign default")
    ;(campaign.scenarios || []).forEach(scenario =>
        addMaterial(kind === "email" ? scenario.template : scenario.page, scenario.name || "Unnamed scenario"))
    return materials
}

const campaignMaterialSelector = (kind, materials) => "<div class='user-campaign-material-browser'><div class='list-group user-campaign-material-list'>" +
    materials.map((material, index) => "<button type='button' class='list-group-item user-campaign-material-selector" + (index === 0 ? " active" : "") +
        "' data-material-kind='" + kind + "' data-material-index='" + index + "'><i class='fa fa-" + (kind === "email" ? "envelope" : "file-text-o") +
        "'></i><span><strong>" + escapeHtml(material.resource.name || "[Deleted]") + "</strong><small>Used by: " + escapeHtml(material.sources.join(", ")) + "</small></span></button>").join("") +
    "</div><div id='userCampaign" + (kind === "email" ? "Email" : "Landing") + "Preview' class='user-campaign-selected-preview'></div></div>"

const campaignMaterialPanel = (kind, title, campaign) => campaignMaterialSelector(kind, campaignMaterialList(campaign, kind))

const groupList = (campaign) => {
    const groups = campaignItems(campaign.groups, group =>
        "<strong>" + escapeHtml(group.name) + "</strong> <span class='text-muted pull-right'>" +
        ((group.targets || []).length) + " recipient(s)</span>", "No group association is available for this campaign.")
    const legacyNote = campaign.groups_inferred
        ? "<div class='alert alert-info user-campaign-inline-alert'><i class='fa fa-info-circle'></i> Group links were not stored when this campaign was created. The groups below were matched to saved recipients.</div>"
        : ""
    return legacyNote + groups
}

const scenarioList = (campaign) => {
    const scenarios = campaign.scenarios || []
    if (scenarios.length === 0) {
        return "<div class='user-campaign-empty-state'><i class='fa fa-sitemap'></i><strong>No dedicated scenarios</strong><p>This campaign uses its main email template, landing page, and sending profile for all recipients.</p></div>"
    }
    return scenarios.map(scenario => {
        const recipients = (campaign.results || []).filter(result => result.scenario_id === scenario.id)
        const stats = campaignStats({ results: recipients })
        const template = scenario.template || {}
        const page = scenario.page || {}
        const smtp = scenario.smtp || {}
        return "<article class='user-campaign-scenario'>" +
            "<div class='user-campaign-scenario-heading'><div><strong>" + escapeHtml(scenario.name) + "</strong><span>" + recipients.length + " assigned recipient(s)</span></div>" +
            "<span class='label label-" + (stats.submitted ? "danger" : "default") + "'>" + percentage(stats.clicked + stats.submitted, stats.total) + " risk actions</span></div>" +
            "<div class='row user-campaign-scenario-components'>" +
            "<div class='col-sm-4'><i class='fa fa-envelope'></i><small>Email template</small><strong>" + escapeHtml(template.name || "[Deleted]") + "</strong></div>" +
            "<div class='col-sm-4'><i class='fa fa-file-text-o'></i><small>Landing page</small><strong>" + escapeHtml(page.name || "[Deleted]") + "</strong></div>" +
            "<div class='col-sm-4'><i class='fa fa-paper-plane'></i><small>Sending profile</small><strong>" + escapeHtml(smtp.name || "[Deleted]") + "</strong></div>" +
            "</div>" +
            "<div class='user-campaign-scenario-stats'><span><b>" + stats.opened + "</b> opened</span><span><b>" + stats.clicked + "</b> clicked</span><span><b>" + stats.submitted + "</b> submitted</span><span><b>" + stats.reported + "</b> reported</span></div>" +
            "</article>"
    }).join("")
}

const eventPresentation = (message) => {
    switch (message) {
    case "Email Sent": return { icon: "fa-paper-plane", modifier: "sent" }
    case "Email Opened": return { icon: "fa-envelope-open", modifier: "opened" }
    case "Clicked Link": return { icon: "fa-mouse-pointer", modifier: "clicked" }
    case "Submitted Data": return { icon: "fa-keyboard-o", modifier: "submitted" }
    case "Email Reported": return { icon: "fa-flag", modifier: "reported" }
    case "Error Sending Email": return { icon: "fa-exclamation-triangle", modifier: "error" }
    default: return { icon: "fa-circle", modifier: "default" }
    }
}

const eventDetailsSummary = (event) => {
    if (!event.details) return ""
    try {
        const details = JSON.parse(event.details)
        if (details.error) return "<span class='user-campaign-event-detail'><i class='fa fa-exclamation-circle'></i> " + escapeHtml(details.error) + "</span>"
        if (details.browser) return "<span class='user-campaign-event-detail'><i class='fa fa-desktop'></i> Browser information recorded</span>"
        if (details.payload) return "<span class='user-campaign-event-detail'><i class='fa fa-check-circle'></i> Form interaction recorded</span>"
    } catch (e) {
        return "<span class='user-campaign-event-detail'><i class='fa fa-info-circle'></i> Additional event data recorded</span>"
    }
    return ""
}

const eventTimeline = (events) => {
    if (!events || events.length === 0) {
        return "<div class='user-campaign-empty-state'><i class='fa fa-clock-o'></i><strong>No events recorded yet</strong><p>Events will appear here as recipients interact with the campaign.</p></div>"
    }
    return "<div class='user-campaign-event-timeline'>" + events.slice().sort((a, b) => new Date(b.time) - new Date(a.time)).map(event => {
        const presentation = eventPresentation(event.message)
        return "<article class='user-campaign-event " + presentation.modifier + "'><div class='user-campaign-event-icon'><i class='fa " + presentation.icon + "'></i></div>" +
            "<div class='user-campaign-event-content'><div><strong>" + escapeHtml(event.message) + "</strong><time>" + formatDate(event.time) + "</time></div>" +
            (event.email ? "<span class='user-campaign-event-email'><i class='fa fa-user'></i> " + escapeHtml(event.email) + "</span>" : "") + eventDetailsSummary(event) + "</div></article>"
    }).join("") + "</div>"
}

const recipientList = (results) => {
    if (!results || results.length === 0) return "<p class='text-muted'>No recipients were recorded.</p>"
    return "<div class='table-responsive'><table class='table table-condensed user-campaign-results-table'><thead><tr><th>Recipient</th><th>Status</th><th>Last activity</th></tr></thead><tbody>" +
        results.map(result => "<tr><td>" + escapeHtml(result.email) + "</td><td><span class='label label-" + resultStatusClass(result) + "'>" +
            escapeHtml(result.reported ? "Reported" : result.status) + "</span></td><td>" + formatDate(result.modified_date) + "</td></tr>").join("") + "</tbody></table></div>"
}

const showMaterialPreview = (kind, index) => {
    const material = (openedCampaignMaterials[kind] || [])[index]
    if (!material) return
    const resource = material.resource
    const isEmail = kind === "email"
    const metadata = isEmail
        ? "<span>Subject: " + escapeHtml(resource.subject || "Not set") + "</span>" +
            (resource.envelope_sender ? "<span>Sender: " + escapeHtml(resource.envelope_sender) + "</span>" : "")
        : "<span>Credential capture: " + (resource.capture_credentials ? "enabled" : "disabled") + "</span>" +
            (resource.redirect_url ? "<span>Redirect configured</span>" : "")
    const selector = "#userCampaign" + (isEmail ? "Email" : "Landing") + "Preview"
    $(selector).html(previewPanel(isEmail ? "Email preview" : "Landing page preview", resource.name, metadata, kind))
    const content = resource.html || (isEmail
        ? "<main style='font-family:Arial,sans-serif;padding:24px;white-space:pre-wrap'>" + escapeHtml(resource.text || "No email content is available.") + "</main>"
        : "<main style='font-family:Arial,sans-serif;padding:24px'>No landing page content is available.</main>")
    const documentContent = "<!doctype html><html><head><base target='_blank'></head><body>" + content + "</body></html>"
    $(selector + " [data-preview='" + kind + "']").attr("srcdoc", documentContent)
    $(".user-campaign-material-selector[data-material-kind='" + kind + "']").removeClass("active")
    $(".user-campaign-material-selector[data-material-kind='" + kind + "'][data-material-index='" + index + "']").addClass("active")
}

const campaignDetails = (campaign) => {
    const smtp = campaign.smtp || {}
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
        campaignResource("Groups", groupList(campaign)) +
        campaignResource("Email templates", campaignMaterialPanel("email", "Email templates", campaign)) +
        campaignResource("Landing pages", campaignMaterialPanel("landing", "Landing pages", campaign)) +
        campaignResource("Sending Profile", "<p><strong>" + escapeHtml(smtp.name || "[Deleted]") + "</strong> " + escapeHtml(smtp.host || "") + " / " + escapeHtml(smtp.from_address || "") + "</p>") +
        campaignResource("Phishing scenarios", scenarioList(campaign)) +
        campaignResource("Recipients and results", recipientList(campaign.results)) +
        campaignResource("Event timeline", eventTimeline(campaign.timeline))
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
    openedCampaignMaterials = {
        email: campaignMaterialList(item.campaign, "email"),
        landing: campaignMaterialList(item.campaign, "landing")
    }
    showMaterialPreview("email", 0)
    showMaterialPreview("landing", 0)
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
    $(document).on("click", ".user-campaign-material-selector", function () {
        showMaterialPreview($(this).data("material-kind"), Number($(this).data("material-index")))
    })
    $("#resetUserCampaignFilters").click(() => {
        $("#userCampaignSearch").val("")
        $("#userCampaignStatus, #userCampaignOwner").val("")
        renderCampaigns()
    })
})
