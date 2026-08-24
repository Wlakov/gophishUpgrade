let userCampaignWorkspaces = []
let displayedCampaigns = []
let openedCampaignMaterials = { email: [], landing: [] }

const campaignItems = (items, render, emptyMessage) => {
    if (!items || items.length === 0) {
        return "<p class='text-muted'>" + (emptyMessage || "Немає даних.") + "</p>"
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
        return "Не вказано"
    }
    const date = new Date(value)
    return isNaN(date.getTime()) ? "Не вказано" : formatDateUk(date)
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

const statusLabelUk = (status) => ({
    "Completed": "Завершено", "In progress": "Виконується", "Emails Sent": "Листи надіслано",
    "Queued": "У черзі", "Email Sent": "Лист надіслано", "Email Opened": "Лист відкрито",
    "Clicked Link": "Перехід за посиланням", "Submitted Data": "Введено дані",
    "Email Reported": "Про лист повідомлено", "Error": "Помилка",
    "Error Sending Email": "Помилка надсилання листа", "Scheduled": "Заплановано",
    "Retrying": "Повторна спроба", "Campaign Created": "Кампанію створено"
}[status] || status || "Не вказано")

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
    "<p class='text-muted user-campaign-preview-note'><i class='fa fa-shield'></i> Попередній перегляд ізольовано; посилання, форми та скрипти вимкнено.</p>"

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
    addMaterial(kind === "email" ? campaign.template : campaign.page, "Основний матеріал кампанії")
    ;(campaign.scenarios || []).forEach(scenario =>
        addMaterial(kind === "email" ? scenario.template : scenario.page, scenario.name || "Сценарій без назви"))
    return materials
}

const campaignMaterialSelector = (kind, materials) => "<div class='user-campaign-material-browser'><div class='list-group user-campaign-material-list'>" +
    materials.map((material, index) => "<button type='button' class='list-group-item user-campaign-material-selector" + (index === 0 ? " active" : "") +
        "' data-material-kind='" + kind + "' data-material-index='" + index + "'><i class='fa fa-" + (kind === "email" ? "envelope" : "file-text-o") +
        "'></i><span><strong>" + escapeHtml(material.resource.name || "[Видалено]") + "</strong><small>Використовується: " + escapeHtml(material.sources.join(", ")) + "</small></span></button>").join("") +
    "</div><div id='userCampaign" + (kind === "email" ? "Email" : "Landing") + "Preview' class='user-campaign-selected-preview'></div></div>"

const campaignMaterialPanel = (kind, title, campaign) => campaignMaterialSelector(kind, campaignMaterialList(campaign, kind))

const groupList = (campaign) => {
    const groups = campaignItems(campaign.groups, group =>
        "<strong>" + escapeHtml(group.name) + "</strong> <span class='text-muted pull-right'>" +
        countLabelUk((group.targets || []).length, "отримувач", "отримувачі", "отримувачів") + "</span>", "Для цієї кампанії групи не прив’язані.")
    const legacyNote = campaign.groups_inferred
        ? "<div class='alert alert-info user-campaign-inline-alert'><i class='fa fa-info-circle'></i> Зв’язки з групами не збереглися під час створення кампанії. Нижче показано групи, визначені за отримувачами.</div>"
        : ""
    return legacyNote + groups
}

const scenarioList = (campaign) => {
    const scenarios = campaign.scenarios || []
    if (scenarios.length === 0) {
        return "<div class='user-campaign-empty-state'><i class='fa fa-sitemap'></i><strong>Окремих сценаріїв немає</strong><p>Для всіх отримувачів використовуються основні шаблон листа, цільова сторінка та профіль відправлення.</p></div>"
    }
    return scenarios.map(scenario => {
        const recipients = (campaign.results || []).filter(result => result.scenario_id === scenario.id)
        const stats = campaignStats({ results: recipients })
        const template = scenario.template || {}
        const page = scenario.page || {}
        const smtp = scenario.smtp || {}
        return "<article class='user-campaign-scenario'>" +
            "<div class='user-campaign-scenario-heading'><div><strong>" + escapeHtml(scenario.name) + "</strong><span>" + countLabelUk(recipients.length, "призначений отримувач", "призначені отримувачі", "призначених отримувачів") + "</span></div>" +
            "<span class='label label-" + (stats.submitted ? "danger" : "default") + "'>" + percentage(stats.clicked + stats.submitted, stats.total) + " ризикових дій</span></div>" +
            "<div class='row user-campaign-scenario-components'>" +
            "<div class='col-sm-4'><i class='fa fa-envelope'></i><small>Шаблон листа</small><strong>" + escapeHtml(template.name || "[Видалено]") + "</strong></div>" +
            "<div class='col-sm-4'><i class='fa fa-file-text-o'></i><small>Цільова сторінка</small><strong>" + escapeHtml(page.name || "[Видалено]") + "</strong></div>" +
            "<div class='col-sm-4'><i class='fa fa-paper-plane'></i><small>Профіль відправлення</small><strong>" + escapeHtml(smtp.name || "[Видалено]") + "</strong></div>" +
            "</div>" +
            "<div class='user-campaign-scenario-stats'><span><b>" + countLabelUk(stats.opened, "лист відкрито", "листи відкрито", "листів відкрито") + "</b></span><span><b>" + countLabelUk(stats.clicked, "перехід", "переходи", "переходів") + "</b></span><span><b>" + countLabelUk(stats.submitted, "введення даних", "введення даних", "введень даних") + "</b></span><span><b>" + countLabelUk(stats.reported, "повідомлення", "повідомлення", "повідомлень") + "</b></span></div>" +
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
    case "Training Viewed": return { icon: "fa-book", modifier: "opened" }
    case "Training Quiz Passed": return { icon: "fa-check", modifier: "reported" }
    case "Training Quiz Failed": return { icon: "fa-times", modifier: "error" }
    default: return { icon: "fa-circle", modifier: "default" }
    }
}

const eventDetailsSummary = (event) => {
    if (!event.details) return ""
    try {
        const details = JSON.parse(event.details)
        if (details.error) return "<span class='user-campaign-event-detail'><i class='fa fa-exclamation-circle'></i> " + escapeHtml(details.error) + "</span>"
        if (details.browser) return "<span class='user-campaign-event-detail'><i class='fa fa-desktop'></i> Дані браузера збережено</span>"
        if (details.payload) return "<span class='user-campaign-event-detail'><i class='fa fa-check-circle'></i> Взаємодію з формою зафіксовано</span>"
    } catch (e) {
        return "<span class='user-campaign-event-detail'><i class='fa fa-info-circle'></i> Додаткові дані події збережено</span>"
    }
    return ""
}

const eventTimeline = (events) => {
    if (!events || events.length === 0) {
        return "<div class='user-campaign-empty-state'><i class='fa fa-clock-o'></i><strong>Подій ще немає</strong><p>Події з’являться, коли отримувачі взаємодіятимуть із кампанією.</p></div>"
    }
    return "<div class='user-campaign-event-timeline'>" + events.slice().sort((a, b) => new Date(b.time) - new Date(a.time)).map(event => {
        const presentation = eventPresentation(event.message)
        return "<article class='user-campaign-event " + presentation.modifier + "'><div class='user-campaign-event-icon'><i class='fa " + presentation.icon + "'></i></div>" +
            "<div class='user-campaign-event-content'><div><strong>" + escapeHtml(statusLabelUk(event.message)) + "</strong><time>" + formatDate(event.time) + "</time></div>" +
            (event.email ? "<span class='user-campaign-event-email'><i class='fa fa-user'></i> " + escapeHtml(event.email) + "</span>" : "") + eventDetailsSummary(event) + "</div></article>"
    }).join("") + "</div>"
}

const recipientList = (results) => {
    if (!results || results.length === 0) return "<p class='text-muted'>Отримувачів не зафіксовано.</p>"
    return "<div class='table-responsive'><table class='table table-condensed user-campaign-results-table'><thead><tr><th>Отримувач</th><th>Стан</th><th>Остання активність</th></tr></thead><tbody>" +
        results.map(result => "<tr><td>" + escapeHtml(result.email) + "</td><td><span class='label label-" + resultStatusClass(result) + "'>" +
            escapeHtml(result.reported ? "Повідомлено" : statusLabelUk(result.status)) + "</span></td><td>" + formatDate(result.modified_date) + "</td></tr>").join("") + "</tbody></table></div>"
}

const showMaterialPreview = (kind, index) => {
    const material = (openedCampaignMaterials[kind] || [])[index]
    if (!material) return
    const resource = material.resource
    const isEmail = kind === "email"
    const metadata = isEmail
        ? "<span>Тема: " + escapeHtml(resource.subject || "Не вказано") + "</span>" +
            (resource.envelope_sender ? "<span>Відправник: " + escapeHtml(resource.envelope_sender) + "</span>" : "")
        : "<span>Збір облікових даних: " + (resource.capture_credentials ? "увімкнено" : "вимкнено") + "</span>" +
            (resource.redirect_url ? "<span>Перенаправлення налаштовано</span>" : "")
    const selector = "#userCampaign" + (isEmail ? "Email" : "Landing") + "Preview"
    $(selector).html(previewPanel(isEmail ? "Перегляд листа" : "Перегляд цільової сторінки", resource.name, metadata, kind))
    const content = resource.html || (isEmail
        ? "<main style='font-family:Arial,sans-serif;padding:24px;white-space:pre-wrap'>" + escapeHtml(resource.text || "Вміст листа відсутній.") + "</main>"
        : "<main style='font-family:Arial,sans-serif;padding:24px'>Вміст цільової сторінки відсутній.</main>")
    const documentContent = "<!doctype html><html><head><base target='_blank'></head><body>" + content + "</body></html>"
    $(selector + " [data-preview='" + kind + "']").attr("srcdoc", documentContent)
    $(".user-campaign-material-selector[data-material-kind='" + kind + "']").removeClass("active")
    $(".user-campaign-material-selector[data-material-kind='" + kind + "'][data-material-index='" + index + "']").addClass("active")
}

const campaignDetails = (campaign) => {
    const smtp = campaign.smtp || {}
    const stats = campaignStats(campaign)
    return "<div class='row user-campaign-details-summary'>" +
        metric("Отримувачі", stats.total, "", "") +
        metric("Відкрито", stats.opened, percentage(stats.opened, stats.total), "") +
        metric("Переходи", stats.clicked, percentage(stats.clicked, stats.total), "") +
        metric("Введено дані", stats.submitted, percentage(stats.submitted, stats.total), "danger") +
        "</div>" +
        "<dl class='dl-horizontal user-campaign-description'><dt>Стан</dt><dd><span class='label label-" + statusClass(campaign.status) + "'>" + escapeHtml(statusLabelUk(campaign.status)) + "</span></dd>" +
        "<dt>Створено</dt><dd>" + formatDate(campaign.created_date) + "</dd><dt>Дата запуску</dt><dd>" + formatDate(campaign.launch_date) +
        "</dd><dt>URL кампанії</dt><dd class='text-break'>" + escapeHtml(campaign.url || "Не вказано") + "</dd></dl>" +
        campaignResource("Групи", groupList(campaign)) +
        campaignResource("Шаблони листів", campaignMaterialPanel("email", "Шаблони листів", campaign)) +
        campaignResource("Цільові сторінки", campaignMaterialPanel("landing", "Цільові сторінки", campaign)) +
        campaignResource("Профіль відправлення", "<p><strong>" + escapeHtml(smtp.name || "[Видалено]") + "</strong> " + escapeHtml(smtp.host || "") + " / " + escapeHtml(smtp.from_address || "") + "</p>") +
        campaignResource("Фішингові сценарії", scenarioList(campaign)) +
        campaignResource("Отримувачі та результати", recipientList(campaign.results)) +
        campaignResource("Хронологія подій", eventTimeline(campaign.timeline))
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
        " <span class='user-campaign-separator'>•</span> Створено " + formatDate(campaign.created_date) + "</p></div>" +
        "<div class='col-sm-4 text-right'><span class='label label-" + statusClass(campaign.status) + " user-campaign-status'>" +
        escapeHtml(statusLabelUk(campaign.status)) + "</span></div></div>" +
        "<div class='row user-campaign-card-metrics'>" +
        metric("Отримувачі", stats.total, "", "") + metric("Відкрито", percentage(stats.opened, stats.total), countLabelUk(stats.opened, "особа", "особи", "осіб"), "") +
        metric("Повідомлено", percentage(stats.reported, stats.total), countLabelUk(stats.reported, "особа", "особи", "осіб"), "success") +
        metric("Ризикові дії", percentage(stats.clicked + stats.submitted, stats.total), countLabelUk(activity, "взаємодія", "взаємодії", "взаємодій"), "danger") +
        "</div>" +
        "<div class='user-campaign-card-footer'><span class='text-muted'><i class='fa fa-users'></i> " + countLabelUk((campaign.groups || []).length, "група", "групи", "груп") + " &nbsp; <i class='fa fa-sitemap'></i> " + countLabelUk((campaign.scenarios || []).length, "сценарій", "сценарії", "сценаріїв") + "</span>" +
        "<button class='btn btn-primary btn-sm pull-right show-user-campaign-details' data-campaign-index='" + index + "'><i class='fa fa-eye'></i> Переглянути деталі</button></div>" +
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
        totalCard("fa-users", "Користувачі", userCampaignWorkspaces.length, "primary") +
        totalCard("fa-bullhorn", "Кампанії", campaigns.length, "info") +
        totalCard("fa-envelope", "Отримувачі", recipients, "warning") +
        totalCard("fa-flag", "Повідомлені листи", reported + " / " + submitted + " із введеними даними", "success"))
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
            "</h2><span>" + escapeHtml((workspace.user.role || {}).name || "Користувач") + "</span></div><span class='badge pull-right'>" +
            countLabelUk((workspace.campaigns || []).length, "кампанія", "кампанії", "кампаній") + "</span></div>" + cards + "</section>"
    }).join("")
    $("#userCampaignWorkspaces").html(content)
    $("#userCampaignFilterCount").text(displayedCampaigns.length)
    $("#userCampaignEmpty").toggle(displayedCampaigns.length === 0)
}

const fillFilters = () => {
    const statuses = {}
    userCampaignWorkspaces.forEach(workspace => (workspace.campaigns || []).forEach(campaign => { if (campaign.status) statuses[campaign.status] = true }))
    Object.keys(statuses).sort().forEach(status => $("#userCampaignStatus").append($("<option>").val(status).text(statusLabelUk(status))))
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
        errorFlash(data.responseJSON ? data.responseJSON.message : "Помилка завантаження кампаній користувачів")
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
