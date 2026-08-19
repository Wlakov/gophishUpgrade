const departmentID = window.location.pathname.split("/").pop()

const resourceList = (items, render) => {
    if (!items || items.length === 0) {
        return "<p class='text-muted'>No items.</p>"
    }
    return "<ul class='list-group'>" + $.map(items, (item) =>
        "<li class='list-group-item'>" + render(item) + "</li>"
    ).join("") + "</ul>"
}

const panel = (title, content) => "<div class='panel panel-default'>" +
    "<div class='panel-heading'><strong>" + escapeHtml(title) + "</strong></div>" +
    "<div class='panel-body'>" + content + "</div></div>"

const renderWorkspace = (workspace) => {
    const owner = workspace.user
    const campaigns = resourceList(workspace.campaigns, campaign =>
        "<strong>" + escapeHtml(campaign.name) + "</strong> <span class='text-muted'>" + escapeHtml(campaign.status) + "</span>")
    const groups = resourceList(workspace.groups, group =>
        "<strong>" + escapeHtml(group.name) + "</strong> <span class='text-muted'>" + (group.targets || []).length + " members</span>")
    const templates = resourceList(workspace.templates, template =>
        "<strong>" + escapeHtml(template.name) + "</strong> <span class='text-muted'>" + escapeHtml(template.subject || "") + "</span>")
    const pages = resourceList(workspace.pages, page =>
        "<strong>" + escapeHtml(page.name) + "</strong>")
    const profiles = resourceList(workspace.sending_profiles, profile =>
        "<strong>" + escapeHtml(profile.name) + "</strong> <span class='text-muted'>" + escapeHtml(profile.host) + "</span>")
    const scenarios = resourceList(workspace.phishing_scenarios, scenario =>
        "<strong>" + escapeHtml(scenario.name) + "</strong> <span class='text-muted'>" +
        escapeHtml(scenario.template.name) + " / " + escapeHtml(scenario.page.name) + " / " + escapeHtml(scenario.smtp.name) + "</span>")

    return "<div class='panel panel-primary'><div class='panel-heading'><h3 class='panel-title'>" +
        escapeHtml(owner.username) + " <small>" + escapeHtml(owner.role.name) + "</small></h3></div><div class='panel-body'>" +
        panel("Campaigns", campaigns) +
        panel("Groups", groups) +
        panel("Email Templates", templates) +
        panel("Landing Pages", pages) +
        panel("Sending Profiles", profiles) +
        panel("Phishing Scenarios", scenarios) +
        "</div></div>"
}

$(document).ready(() => {
    api.departments.get(departmentID).success((department) => {
        $("#loading").hide()
        $(".page-header").text("Department: " + department.manager.username)
        $("#departmentWorkspace").html($.map(department.workspaces, renderWorkspace).join(""))
        $("#departmentWorkspace").show()
    }).error((data) => {
        $("#loading").hide()
        errorFlash(data.responseJSON ? data.responseJSON.message : "Error loading department workspace")
    })
})
