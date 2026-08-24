function errorFlash(message) {
    $("#flashes").empty()
    $("#flashes").append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
        <i class=\"fa fa-exclamation-circle\"></i> " + message + "</div>")
}

function successFlash(message) {
    $("#flashes").empty()
    $("#flashes").append("<div style=\"text-align:center\" class=\"alert alert-success\">\
        <i class=\"fa fa-check-circle\"></i> " + message + "</div>")
}

// Fade message after n seconds
function errorFlashFade(message, fade) {
    $("#flashes").empty()
    $("#flashes").append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
        <i class=\"fa fa-exclamation-circle\"></i> " + message + "</div>")
    setTimeout(function(){ 
        $("#flashes").empty() 
    }, fade * 1000);
}
// Fade message after n seconds
function successFlashFade(message, fade) {  
    $("#flashes").empty()
    $("#flashes").append("<div style=\"text-align:center\" class=\"alert alert-success\">\
        <i class=\"fa fa-check-circle\"></i> " + message + "</div>")
    setTimeout(function(){ 
        $("#flashes").empty() 
    }, fade * 1000);

}

function modalError(message) {
    $("#modal\\.flashes").empty().append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
        <i class=\"fa fa-exclamation-circle\"></i> " + message + "</div>")
}

function query(endpoint, method, data, async) {
    return $.ajax({
        url: "/api" + endpoint,
        async: async,
        method: method,
        data: JSON.stringify(data),
        dataType: "json",
        contentType: "application/json",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + user.api_key);
        }
    })
}

function escapeHtml(text) {
    return $("<div/>").text(text).html()
}
window.escapeHtml = escapeHtml

// Локаль для календаря та форматування дат українською мовою.
moment.defineLocale("uk-custom", {
    months: ["січень", "лютий", "березень", "квітень", "травень", "червень", "липень", "серпень", "вересень", "жовтень", "листопад", "грудень"],
    monthsShort: ["січ", "лют", "бер", "квіт", "трав", "черв", "лип", "серп", "вер", "жовт", "лист", "груд"],
    weekdays: ["неділя", "понеділок", "вівторок", "середа", "четвер", "п’ятниця", "субота"],
    weekdaysShort: ["нд", "пн", "вт", "ср", "чт", "пт", "сб"],
    weekdaysMin: ["нд", "пн", "вт", "ср", "чт", "пт", "сб"],
    week: { dow: 1, doy: 4 },
    longDateFormat: {
        LT: "HH:mm", LTS: "HH:mm:ss", L: "DD.MM.YYYY", LL: "D MMMM YYYY",
        LLL: "D MMMM YYYY HH:mm", LLLL: "dddd, D MMMM YYYY HH:mm"
    },
    meridiem: function () { return "" },
    meridiemParse: /сут./i,
    isPM: function () { return false }
})
moment.locale("uk-custom")

// Українське відмінювання лічильників: 1 кампанія, 2 кампанії, 5 кампаній.
function pluralizeUk(value, one, few, many) {
    var number = Math.abs(Number(value)) || 0
    var mod100 = number % 100
    var mod10 = number % 10
    if (mod100 >= 11 && mod100 <= 14) return many
    if (mod10 === 1) return one
    if (mod10 >= 2 && mod10 <= 4) return few
    return many
}
function countLabelUk(value, one, few, many) {
    return value + " " + pluralizeUk(value, one, few, many)
}
window.pluralizeUk = pluralizeUk
window.countLabelUk = countLabelUk

var ukMonths = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"]
function formatDateUk(value, includeSeconds) {
    var date = moment(value)
    if (!date.isValid()) return "Не вказано"
    var result = date.format("DD") + " " + ukMonths[date.month()] + " " + date.format("YYYY HH:mm")
    return includeSeconds === false ? result : result + ":" + date.format("ss")
}
window.formatDateUk = formatDateUk
function formatDateUkNumeric(value) {
    var date = moment(value)
    return date.isValid() ? date.format("DD.MM.YYYY HH:mm:ss") : "Не вказано"
}
window.formatDateUkNumeric = formatDateUkNumeric

// Shared Ukrainian labels for every DataTables-powered list in the platform.
// Keeping this in the common application bundle prevents individual pages
// from falling back to the English defaults such as "Show entries".
if ($.fn.dataTable) {
    $.extend(true, $.fn.dataTable.defaults, {
        language: {
            lengthMenu: "Показати _MENU_ записів",
            search: "Пошук:",
            zeroRecords: "Записів не знайдено",
            info: "Показано _START_–_END_ із _TOTAL_ записів",
            infoEmpty: "Немає записів для відображення",
            infoFiltered: "(відфільтровано з _MAX_ записів)",
            emptyTable: "Таблиця порожня",
            loadingRecords: "Завантаження...",
            processing: "Обробка...",
            paginate: {
                first: "Перша",
                last: "Остання",
                next: "Далі",
                previous: "Назад"
            }
        }
    })
}

$(document).ready(function () {
    var currentPath = window.location.pathname.replace(/\/$/, "") || "/"
    $(".app-sidebar-nav a[data-nav-path]").each(function () {
        var link = $(this)
        var targetPath = link.data("nav-path")
        var isActive = targetPath === "/"
            ? currentPath === "/"
            : currentPath === targetPath || currentPath.indexOf(targetPath + "/") === 0
        link.closest("li").toggleClass("active", isActive)
    })
})

function unescapeHtml(html) {
    return $("<div/>").html(html).text()
}

/**
 * 
 * @param {string} string - The input string to capitalize
 * 
 */
var capitalize = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/*
Define our API Endpoints
*/
var api = {
    // campaigns contains the endpoints for /campaigns
    campaigns: {
        // get() - Queries the API for GET /campaigns
        get: function () {
            return query("/campaigns/", "GET", {}, false)
        },
        // post() - Posts a campaign to POST /campaigns
        post: function (data) {
            return query("/campaigns/", "POST", data, false)
        },
        // summary() - Queries the API for GET /campaigns/summary
        summary: function () {
            return query("/campaigns/summary", "GET", {}, false)
        }
    },
    scenarios: {
        get: function () {
            return query("/phishing_scenarios/", "GET", {}, false)
        },
        post: function (scenario) {
            return query("/phishing_scenarios/", "POST", scenario, false)
        }
    },
    scenarioId: {
        get: function (id) {
            return query("/phishing_scenarios/" + id, "GET", {}, false)
        },
        put: function (scenario) {
            return query("/phishing_scenarios/" + scenario.id, "PUT", scenario, false)
        },
        delete: function (id) {
            return query("/phishing_scenarios/" + id, "DELETE", {}, false)
        }
    },
    // campaignId contains the endpoints for /campaigns/:id
    campaignId: {
        // get() - Queries the API for GET /campaigns/:id
        get: function (id) {
            return query("/campaigns/" + id, "GET", {}, true)
        },
        // delete() - Deletes a campaign at DELETE /campaigns/:id
        delete: function (id) {
            return query("/campaigns/" + id, "DELETE", {}, false)
        },
        // results() - Queries the API for GET /campaigns/:id/results
        results: function (id) {
            return query("/campaigns/" + id + "/results", "GET", {}, true)
        },
        // complete() - Completes a campaign at POST /campaigns/:id/complete
        complete: function (id) {
            return query("/campaigns/" + id + "/complete", "GET", {}, true)
        },
        // summary() - Queries the API for GET /campaigns/summary
        summary: function (id) {
            return query("/campaigns/" + id + "/summary", "GET", {}, true)
        }
    },
    // groups contains the endpoints for /groups
    groups: {
        // get() - Queries the API for GET /groups
        get: function () {
            return query("/groups/", "GET", {}, false)
        },
        // post() - Posts a group to POST /groups
        post: function (group) {
            return query("/groups/", "POST", group, false)
        },
        // summary() - Queries the API for GET /groups/summary
        summary: function () {
            return query("/groups/summary", "GET", {}, true)
        }
    },
    // groupId contains the endpoints for /groups/:id
    groupId: {
        // get() - Queries the API for GET /groups/:id
        get: function (id) {
            return query("/groups/" + id, "GET", {}, false)
        },
        // put() - Puts a group to PUT /groups/:id
        put: function (group) {
            return query("/groups/" + group.id, "PUT", group, false)
        },
        // delete() - Deletes a group at DELETE /groups/:id
        delete: function (id) {
            return query("/groups/" + id, "DELETE", {}, false)
        }
    },
    // templates contains the endpoints for /templates
    templates: {
        // get() - Queries the API for GET /templates
        get: function () {
            return query("/templates/", "GET", {}, false)
        },
        // post() - Posts a template to POST /templates
        post: function (template) {
            return query("/templates/", "POST", template, false)
        }
    },
    // templateId contains the endpoints for /templates/:id
    templateId: {
        // get() - Queries the API for GET /templates/:id
        get: function (id) {
            return query("/templates/" + id, "GET", {}, false)
        },
        // put() - Puts a template to PUT /templates/:id
        put: function (template) {
            return query("/templates/" + template.id, "PUT", template, false)
        },
        // delete() - Deletes a template at DELETE /templates/:id
        delete: function (id) {
            return query("/templates/" + id, "DELETE", {}, false)
        }
    },
    // pages contains the endpoints for /pages
    pages: {
        // get() - Queries the API for GET /pages
        get: function () {
            return query("/pages/", "GET", {}, false)
        },
        // post() - Posts a page to POST /pages
        post: function (page) {
            return query("/pages/", "POST", page, false)
        }
    },
    // pageId contains the endpoints for /pages/:id
    pageId: {
        // get() - Queries the API for GET /pages/:id
        get: function (id) {
            return query("/pages/" + id, "GET", {}, false)
        },
        // put() - Puts a page to PUT /pages/:id
        put: function (page) {
            return query("/pages/" + page.id, "PUT", page, false)
        },
        // delete() - Deletes a page at DELETE /pages/:id
        delete: function (id) {
            return query("/pages/" + id, "DELETE", {}, false)
        }
    },
    // SMTP contains the endpoints for /smtp
    SMTP: {
        // get() - Queries the API for GET /smtp
        get: function () {
            return query("/smtp/", "GET", {}, false)
        },
        // post() - Posts a SMTP to POST /smtp
        post: function (smtp) {
            return query("/smtp/", "POST", smtp, false)
        }
    },
    // SMTPId contains the endpoints for /smtp/:id
    SMTPId: {
        // get() - Queries the API for GET /smtp/:id
        get: function (id) {
            return query("/smtp/" + id, "GET", {}, false)
        },
        // put() - Puts a SMTP to PUT /smtp/:id
        put: function (smtp) {
            return query("/smtp/" + smtp.id, "PUT", smtp, false)
        },
        // delete() - Deletes a SMTP at DELETE /smtp/:id
        delete: function (id) {
            return query("/smtp/" + id, "DELETE", {}, false)
        }
    },
    // IMAP containts the endpoints for /imap/
    IMAP: {
        get: function() {
            return query("/imap/", "GET", {}, !1)
        },
        post: function(e) {
            return query("/imap/", "POST", e, !1)
        },
        validate: function(e) {
            return query("/imap/validate", "POST", e, true)
        }
    },
    // users contains the endpoints for /users
    users: {
        // get() - Queries the API for GET /users
        get: function () {
            return query("/users/", "GET", {}, true)
        },
        // post() - Posts a user to POST /users
        post: function (user) {
            return query("/users/", "POST", user, true)
        }
    },
    // userId contains the endpoints for /users/:id
    userId: {
        // get() - Queries the API for GET /users/:id
        get: function (id) {
            return query("/users/" + id, "GET", {}, true)
        },
        // put() - Puts a user to PUT /users/:id
        put: function (user) {
            return query("/users/" + user.id, "PUT", user, true)
        },
        // delete() - Deletes a user at DELETE /users/:id
        delete: function (id) {
            return query("/users/" + id, "DELETE", {}, true)
        }
    },
    departments: {
        get: function (id) {
            return query("/departments/" + id, "GET", {}, true)
        }
    },
    userCampaigns: {
        get: function () {
            return query("/user_campaigns/", "GET", {}, true)
        }
    },
    webhooks: {
        get: function() {
            return query("/webhooks/", "GET", {}, false)
        },
        post: function(webhook) {
            return query("/webhooks/", "POST", webhook, false)
        },
    },
    webhookId: {
        get: function(id) {
            return query("/webhooks/" + id, "GET", {}, false)
        },
        put: function(webhook) {
            return query("/webhooks/" + webhook.id, "PUT", webhook, true)
        },
        delete: function(id) {
            return query("/webhooks/" + id, "DELETE", {}, false)
        },
        ping: function(id) {
            return query("/webhooks/" + id + "/validate", "POST", {}, true)
        },
    },
    // import handles all of the "import" functions in the api
    import_email: function (req) {
        return query("/import/email", "POST", req, false)
    },
    // clone_site handles importing a site by url
    clone_site: function (req) {
        return query("/import/site", "POST", req, false)
    },
    // send_test_email sends an email to the specified email address
    send_test_email: function (req) {
        return query("/util/send_test_email", "POST", req, true)
    },
    reset: function () {
        return query("/reset", "POST", {}, true)
    }
}
window.api = api

// Register our moment.js datatables listeners
$(document).ready(function () {
    // Setup nav highlighting
    var path = location.pathname;
    $('.nav-sidebar li').each(function () {
        var $this = $(this);
        // if the current path is like this link, make it active
        if ($this.find("a").attr('href') === path) {
            $this.addClass('active');
        }
    })
    $.fn.dataTable.moment('DD.MM.YYYY HH:mm:ss');
    // Setup tooltips
    $('[data-toggle="tooltip"]').tooltip()
});
