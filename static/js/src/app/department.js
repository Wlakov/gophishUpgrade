const departmentID = window.location.pathname.split("/").pop()

const departmentItems = (items) => items || []

const departmentRole = (role) => {
    switch ((role || {}).slug) {
    case "campaign_manager": return "Керівник кампаній"
    case "editor": return "Редактор"
    case "viewer": return "Спостерігач"
    case "admin": return "Системний адміністратор"
    default: return (role || {}).name || "Користувач"
    }
}

const departmentInitials = (username) => {
    const value = (username || "?").trim()
    return value ? value.charAt(0).toUpperCase() : "?"
}

const departmentStatusClass = (status) => {
    switch ((status || "").toLowerCase()) {
    case "completed": return "success"
    case "in progress": return "primary"
    case "emails sent": return "info"
    case "queued": return "warning"
    default: return "default"
    }
}

const departmentStatusLabel = (status) => ({
    "completed": "Завершено", "in progress": "Виконується", "emails sent": "Листи надіслано", "queued": "У черзі"
}[String(status || "").toLowerCase()] || status || "Створено")

const departmentMetric = (icon, value, label, modifier) =>
    "<div class='department-metric " + (modifier || "") + "'><i class='fa " + icon + "'></i><div><strong>" + value +
    "</strong><span>" + escapeHtml(label) + "</span></div></div>"

const departmentResourceItem = (icon, title, detail, index) =>
    "<li class='department-resource-item" + (index > 3 ? " department-resource-extra" : "") + "' data-department-search='" +
    escapeHtml((title + " " + detail).toLowerCase()) + "'><i class='fa " + icon + "'></i><div><strong>" +
    escapeHtml(title || "Без назви") + "</strong>" + (detail ? "<span>" + escapeHtml(detail) + "</span>" : "") + "</div></li>"

const departmentResourceCard = (key, icon, title, items, render) => {
    const resources = departmentItems(items)
    const content = resources.length
        ? "<ul class='department-resource-list'>" + resources.map((item, index) => render(item, index)).join("") + "</ul>"
        : "<div class='department-resource-empty'><i class='fa fa-folder-open-o'></i> Матеріали ще не створено</div>"
    const toggle = resources.length > 4
        ? "<button type='button' class='btn btn-link department-resource-toggle' data-resource='" + key + "'>Показати всі (" + resources.length + ") <i class='fa fa-angle-down'></i></button>"
        : ""
    return "<section class='department-resource-card' data-resource-card='" + key + "'><header><div><i class='fa " + icon + "'></i><span>" +
        escapeHtml(title) + "</span></div><b>" + resources.length + "</b></header>" + content + toggle + "</section>"
}

const departmentMemberCard = (workspace, managerID) => {
    const user = workspace.user || {}
    const isManager = user.id === managerID
    const role = departmentRole(user.role)
    const resources = departmentItems(workspace.campaigns).length + departmentItems(workspace.groups).length +
        departmentItems(workspace.templates).length + departmentItems(workspace.pages).length +
        departmentItems(workspace.sending_profiles).length + departmentItems(workspace.phishing_scenarios).length
    const accessText = isManager
        ? "Власник спільного простору"
        : user.role && user.role.slug === "editor"
            ? "Редагує спільні матеріали відділу"
            : "Переглядає спільні матеріали та результати"
    return "<article class='department-member-card" + (isManager ? " manager" : "") + "' data-department-search='" +
        escapeHtml((user.username || "").toLowerCase()) + "'><div class='department-member-avatar'>" + departmentInitials(user.username) +
        "</div><div class='department-member-content'><div><strong>" + escapeHtml(user.username || "Користувач") + "</strong>" +
        (isManager ? "<span class='label label-primary'>Керівник</span>" : "") + "</div><span class='department-member-role'>" +
        escapeHtml(role) + "</span><small>" + escapeHtml(accessText) + "</small></div>" +
        (resources > 0 && !isManager ? "<span class='department-member-legacy' title='Матеріали, що належали користувачу раніше'>" + resources + "</span>" : "") +
        "</article>"
}

const renderDepartment = (department) => {
    const manager = department.manager || {}
    const workspaces = departmentItems(department.workspaces)
    const managerWorkspace = workspaces.find(workspace => workspace.user && workspace.user.id === manager.id) || workspaces[0] || {}
    const members = workspaces.filter(workspace => !workspace.user || workspace.user.id !== manager.id)
    const groups = departmentItems(managerWorkspace.groups)
    const templates = departmentItems(managerWorkspace.templates)
    const pages = departmentItems(managerWorkspace.pages)
    const profiles = departmentItems(managerWorkspace.sending_profiles)
    const scenarios = departmentItems(managerWorkspace.phishing_scenarios)
    const campaigns = departmentItems(managerWorkspace.campaigns)
    const editors = members.filter(workspace => workspace.user && workspace.user.role && workspace.user.role.slug === "editor").length
    const viewers = members.filter(workspace => workspace.user && workspace.user.role && workspace.user.role.slug === "viewer").length

    $("#departmentTitle").text("Відділ: " + (manager.username || "без назви"))
    $("#departmentSubtitle").text("Спільний робочий простір керівника кампаній та призначених учасників")

    return "<div class='department-dashboard'>" +
        "<section class='department-overview'><div class='department-lead'><div class='department-lead-avatar'>" + departmentInitials(manager.username) +
        "</div><div><span>Керівник відділу</span><h2>" + escapeHtml(manager.username || "Не визначено") + "</h2><p>Матеріали відділу зберігаються у спільному просторі. Редактори працюють із ними, а спостерігачі мають доступ лише для перегляду.</p></div></div>" +
        "<div class='department-overview-metrics'>" +
        departmentMetric("fa-users", members.length + 1, pluralizeUk(members.length + 1, "учасник", "учасники", "учасників"), "primary") +
        departmentMetric("fa-bullhorn", campaigns.length, pluralizeUk(campaigns.length, "кампанія", "кампанії", "кампаній"), "info") +
        departmentMetric("fa-sitemap", scenarios.length, pluralizeUk(scenarios.length, "сценарій", "сценарії", "сценаріїв"), "warning") +
        departmentMetric("fa-users", groups.length, pluralizeUk(groups.length, "група отримувачів", "групи отримувачів", "груп отримувачів"), "success") +
        "</div></section>" +
        "<section class='department-team-section'><div class='department-section-heading'><div><span>Склад відділу</span><h3>Ролі та доступ учасників</h3></div><div class='department-role-summary'><span><b>" + editors + "</b> " + pluralizeUk(editors, "редактор", "редактори", "редакторів") + "</span><span><b>" + viewers + "</b> " + pluralizeUk(viewers, "спостерігач", "спостерігачі", "спостерігачів") + "</span></div></div>" +
        "<div class='department-members-grid'>" + workspaces.map(workspace => departmentMemberCard(workspace, manager.id)).join("") + "</div></section>" +
        "<section class='department-resources-section'><div class='department-section-heading'><div><span>Спільний простір</span><h3>Матеріали та результати відділу</h3></div><div class='department-resource-search'><i class='fa fa-search'></i><input type='search' id='departmentFilter' placeholder='Пошук у матеріалах і складі відділу'></div></div>" +
        "<div class='department-resource-grid'>" +
        departmentResourceCard("campaigns", "fa-bullhorn", "Кампанії", campaigns, (campaign, index) =>
            departmentResourceItem("fa-bullhorn", campaign.name, departmentStatusLabel(campaign.status), index).replace("<strong>", "<strong><span class='label label-" + departmentStatusClass(campaign.status) + " department-status-label'>" + escapeHtml(departmentStatusLabel(campaign.status)) + "</span> ")) +
        departmentResourceCard("groups", "fa-users", "Групи отримувачів", groups, (group, index) =>
            departmentResourceItem("fa-users", group.name, countLabelUk(departmentItems(group.targets).length, "отримувач", "отримувачі", "отримувачів"), index)) +
        departmentResourceCard("templates", "fa-envelope", "Шаблони листів", templates, (template, index) =>
            departmentResourceItem("fa-envelope-o", template.name, template.subject || "Без теми", index)) +
        departmentResourceCard("pages", "fa-file-text-o", "Сторінки переходу", pages, (page, index) =>
            departmentResourceItem("fa-file-text-o", page.name, "Сторінка переходу", index)) +
        departmentResourceCard("profiles", "fa-paper-plane", "Профілі відправлення", profiles, (profile, index) =>
            departmentResourceItem("fa-paper-plane-o", profile.name, profile.host || "Сервер не вказано", index)) +
        departmentResourceCard("scenarios", "fa-random", "Фішингові сценарії", scenarios, (scenario, index) => {
            const template = scenario.template || {}
            const page = scenario.page || {}
            const smtp = scenario.smtp || {}
            return departmentResourceItem("fa-random", scenario.name, (template.name || "—") + " · " + (page.name || "—") + " · " + (smtp.name || "—"), index)
        }) +
        "</div></section></div>"
}

$(document).ready(() => {
    api.departments.get(departmentID).success((department) => {
        $("#loading").hide()
        $("#departmentWorkspace").html(renderDepartment(department)).show()
    }).error((data) => {
        $("#loading").hide()
        errorFlash(data.responseJSON ? data.responseJSON.message : "Не вдалося завантажити дані відділу")
    })

    $("#departmentWorkspace").on("click", ".department-resource-toggle", function () {
        const card = $(this).closest(".department-resource-card")
        const hiddenItems = card.find(".department-resource-extra")
        const opened = card.hasClass("expanded")
        card.toggleClass("expanded", !opened)
        hiddenItems.toggle(!opened)
        $(this).html((opened ? "Показати всі (" : "Згорнути (") + card.find(".department-resource-item").length + ") <i class='fa fa-angle-" + (opened ? "down" : "up") + "'></i>")
    })

    $("#departmentWorkspace").on("input", "#departmentFilter", function () {
        const term = ($(this).val() || "").trim().toLowerCase()
        $(".department-resource-item, .department-member-card").each(function () {
            const searchable = $(this).data("department-search") || ""
            $(this).toggle(!term || searchable.indexOf(term) !== -1)
        })
    })
})
