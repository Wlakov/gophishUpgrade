// labels is a map of campaign statuses to
// CSS classes
var labels = {
    "In progress": "label-primary",
    "Queued": "label-info",
    "Completed": "label-success",
    "Emails Sent": "label-success",
    "Error": "label-danger"
}

var campaigns = []
var campaign = {}

// Launch attempts to POST to /campaigns/
function launch() {
    Swal.fire({
        title: "Ви впевнені?",
        text: "Кампанію буде заплановано до запуску.",
        type: "question",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Запустити",
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        showLoaderOnConfirm: true,
        preConfirm: function () {
            return new Promise(function (resolve, reject) {
                groups = []
                $("#users").select2("data").forEach(function (group) {
                    groups.push({
                        name: group.text
                    });
                })
                // Validate our fields
                var send_by_date = $("#send_by_date").val()
                if (send_by_date != "") {
                    send_by_date = moment(send_by_date, "DD.MM.YYYY HH:mm").utc().format()
                }
                var scenarios = []
                $("#scenarios").select2("data").forEach(function (scenario) {
                    scenarios.push({ id: parseInt(scenario.id, 10) })
                })
                if (scenarios.length === 0) {
                    modalError("Оберіть щонайменше один фішинговий сценарій")
                    reject("Фішингові сценарії не обрано")
                    return
                }
                campaign = {
                    name: $("#name").val(),
                    url: $("#url").val(),
                    scenarios: scenarios,
                    launch_date: moment($("#launch_date").val(), "DD.MM.YYYY HH:mm").utc().format(),
                    send_by_date: send_by_date || null,
                    groups: groups,
                    training_enabled: $("#training_enabled").prop("checked"),
                }
                // Submit the campaign
                api.campaigns.post(campaign)
                    .success(function (data) {
                        resolve()
                        campaign = data
                    })
                    .error(function (data) {
                        $("#modal\\.flashes").empty().append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
            <i class=\"fa fa-exclamation-circle\"></i> " + data.responseJSON.message + "</div>")
                        Swal.close()
                    })
            })
        }
    }).then(function (result) {
        if (result.value){
            Swal.fire(
                    'Кампанію заплановано!',
                    'Кампанію заплановано до запуску.',
                'success'
            );
        }
        $('button:contains("OK")').on('click', function () {
            window.location = "/campaigns/" + campaign.id.toString()
        })
    })
}

// Attempts to send a test email by POSTing to /campaigns/
function sendTestEmail() {
    var test_email_request = {
        template: {
            name: $("#template").select2("data")[0].text
        },
        first_name: $("input[name=to_first_name]").val(),
        last_name: $("input[name=to_last_name]").val(),
        email: $("input[name=to_email]").val(),
        position: $("input[name=to_position]").val(),
        url: $("#url").val(),
        page: {
            name: $("#page").select2("data")[0].text
        },
        smtp: {
            name: $("#profile").select2("data")[0].text
        }
    }
    btnHtml = $("#sendTestModalSubmit").html()
    $("#sendTestModalSubmit").html('<i class="fa fa-spinner fa-spin"></i> Надсилання')
    // Send the test email
    api.send_test_email(test_email_request)
        .success(function (data) {
            $("#sendTestEmailModal\\.flashes").empty().append("<div style=\"text-align:center\" class=\"alert alert-success\">\
	            <i class=\"fa fa-check-circle\"></i> Лист надіслано!</div>")
            $("#sendTestModalSubmit").html(btnHtml)
        })
        .error(function (data) {
            $("#sendTestEmailModal\\.flashes").empty().append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
            <i class=\"fa fa-exclamation-circle\"></i> " + data.responseJSON.message + "</div>")
            $("#sendTestModalSubmit").html(btnHtml)
        })
}

function dismiss() {
    $("#modal\\.flashes").empty();
    $("#name").val("");
    $("#scenarios").val("").change();
    $("#url").val("");
    $("#users").val("").change();
    $("#training_enabled").prop("checked", false);
    $("#modal").modal('hide');
}

function deleteCampaign(idx) {
    Swal.fire({
        title: "Ви впевнені?",
        text: "Кампанію буде видалено. Цю дію неможливо скасувати!",
        type: "warning",
        animation: false,
        showCancelButton: true,
        confirmButtonText: "Видалити " + campaigns[idx].name,
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        preConfirm: function () {
            return new Promise(function (resolve, reject) {
                api.campaignId.delete(campaigns[idx].id)
                    .success(function (msg) {
                        resolve()
                    })
                    .error(function (data) {
                        reject(data.responseJSON.message)
                    })
            })
        }
    }).then(function (result) {
        if (result.value){
            Swal.fire(
                    'Кампанію видалено!',
                    'Кампанію успішно видалено.',
                'success'
            );
        }
        $('button:contains("OK")').on('click', function () {
            location.reload()
        })
    })
}

function setupOptions() {
    api.groups.summary()
        .success(function (summaries) {
            groups = summaries.groups
            if (groups.length == 0) {
                modalError("Груп не знайдено!")
                return false;
            } else {
                var group_s2 = $.map(groups, function (obj) {
                    obj.text = obj.name
                    obj.title = obj.num_targets + " targets"
                    return obj
                });
                console.log(group_s2)
                $("#users.form-control").select2({
                    placeholder: "Оберіть групи",
                    data: group_s2,
                });
            }
        });
    api.scenarios.get()
        .success(function (scenarios) {
            if (scenarios.length === 0) {
                modalError("Фішингових сценаріїв не знайдено. Спочатку створіть сценарій.")
                return false
            }
            var scenarioOptions = $.map(scenarios, function (scenario) {
                return {
                    id: scenario.id,
                    text: scenario.name,
                    title: scenario.template.name + " / " + scenario.page.name + " / " + scenario.smtp.name
                }
            })
            $("#scenarios").select2({
                    placeholder: "Оберіть один або кілька фішингових сценаріїв",
                data: scenarioOptions
            })
        });
}

function edit(campaign) {
    setupOptions();
}

function copy(idx) {
    setupOptions();
    // Set our initial values
    api.campaignId.get(campaigns[idx].id)
        .success(function (campaign) {
            $("#name").val("Копія " + campaign.name)
            var scenarioIds = $.map(campaign.scenarios || [], function (scenario) {
                return scenario.id.toString()
            })
            $("#scenarios").val(scenarioIds).trigger("change")
            $("#url").val(campaign.url)
            $("#training_enabled").prop("checked", campaign.training_enabled === true)
        })
        .error(function (data) {
            $("#modal\\.flashes").empty().append("<div style=\"text-align:center\" class=\"alert alert-danger\">\
            <i class=\"fa fa-exclamation-circle\"></i> " + data.responseJSON.message + "</div>")
        })
}

$(document).ready(function () {
    $("#launch_date").datetimepicker({
        "widgetPositioning": {
            // Place the calendar above the field when there is not enough
            // room below it inside the campaign dialog.
            "vertical": "auto",
            "horizontal": "auto"
        },
        "showTodayButton": true,
        "defaultDate": moment(),
        "format": "DD.MM.YYYY HH:mm"
    })
    $("#send_by_date").datetimepicker({
        "widgetPositioning": {
            "vertical": "auto",
            "horizontal": "auto"
        },
        "showTodayButton": true,
        "useCurrent": false,
        "format": "DD.MM.YYYY HH:mm"
    })
    // Setup multiple modals
    // Code based on http://miles-by-motorcycle.com/static/bootstrap-modal/index.html
    $('.modal').on('hidden.bs.modal', function (event) {
        $(this).removeClass('fv-modal-stack');
        $('body').data('fv_open_modals', $('body').data('fv_open_modals') - 1);
    });
    $('.modal').on('shown.bs.modal', function (event) {
        // Keep track of the number of open modals
        if (typeof ($('body').data('fv_open_modals')) == 'undefined') {
            $('body').data('fv_open_modals', 0);
        }
        // if the z-index of this modal has been set, ignore.
        if ($(this).hasClass('fv-modal-stack')) {
            return;
        }
        $(this).addClass('fv-modal-stack');
        // Increment the number of open modals
        $('body').data('fv_open_modals', $('body').data('fv_open_modals') + 1);
        // Setup the appropriate z-index
        $(this).css('z-index', 1040 + (10 * $('body').data('fv_open_modals')));
        $('.modal-backdrop').not('.fv-modal-stack').css('z-index', 1039 + (10 * $('body').data('fv_open_modals')));
        $('.modal-backdrop').not('fv-modal-stack').addClass('fv-modal-stack');
    });
    // Scrollbar fix - https://stackoverflow.com/questions/19305821/multiple-modals-overlay
    $(document).on('hidden.bs.modal', '.modal', function () {
        $('.modal:visible').length && $(document.body).addClass('modal-open');
    });
    $('#modal').on('hidden.bs.modal', function (event) {
        dismiss()
    });
    api.campaigns.summary()
        .success(function (data) {
            campaigns = data.campaigns
            $("#loading").hide()
            if (campaigns.length > 0) {
                $("#campaignTable").show()
                $("#campaignTableArchive").show()

                activeCampaignsTable = $("#campaignTable").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: [
                        [1, "desc"]
                    ]
                });
                archivedCampaignsTable = $("#campaignTableArchive").DataTable({
                    columnDefs: [{
                        orderable: false,
                        targets: "no-sort"
                    }],
                    order: [
                        [1, "desc"]
                    ]
                });
                rows = {
                    'active': [],
                    'archived': []
                }
                $.each(campaigns, function (i, campaign) {
                    label = labels[campaign.status] || "label-default";

                    //section for tooltips on the status of a campaign to show some quick stats
                    var launchDate;
                    if (moment(campaign.launch_date).isAfter(moment())) {
                        launchDate = "Заплановано на: " + moment(campaign.launch_date).format('DD.MM.YYYY HH:mm:ss')
                        var quickStats = launchDate + "<br><br>" + countLabelUk(campaign.stats.total, "отримувач", "отримувачі", "отримувачів")
                    } else {
                        launchDate = "Дата запуску: " + moment(campaign.launch_date).format('DD.MM.YYYY HH:mm:ss')
                        var quickStats = launchDate + "<br><br>" + countLabelUk(campaign.stats.total, "отримувач", "отримувачі", "отримувачів") + "<br><br>" + countLabelUk(campaign.stats.opened, "відкритий лист", "відкриті листи", "відкритих листів") + "<br><br>" + countLabelUk(campaign.stats.clicked, "перехід", "переходи", "переходів") + "<br><br>" + countLabelUk(campaign.stats.submitted_data, "введення даних", "введення даних", "введень даних") + "<br><br>" + countLabelUk(campaign.stats.error, "помилка", "помилки", "помилок") + "<br><br>" + countLabelUk(campaign.stats.email_reported, "повідомлення", "повідомлення", "повідомлень")
                    }

                    var actions = "<div class='pull-right'><a class='btn btn-primary' href='/campaigns/" + campaign.id + "' data-toggle='tooltip' data-placement='left' title='Переглянути результати'>\
                    <i class='fa fa-bar-chart'></i>\
                    </a>"
                    if (user.can_manage_campaigns) {
                        actions += "<span data-toggle='modal' data-backdrop='static' data-target='#modal'><button class='btn btn-primary' data-toggle='tooltip' data-placement='left' title='Копіювати кампанію' onclick='copy(" + i + ")'>\
                    <i class='fa fa-copy'></i>\
                    </button></span>\
                    <button class='btn btn-danger' onclick='deleteCampaign(" + i + ")' data-toggle='tooltip' data-placement='left' title='Видалити кампанію'>\
                    <i class='fa fa-trash-o'></i>\
                    </button>"
                    }
                    actions += "</div>"
                    var row = [
                        escapeHtml(campaign.name),
                        formatDateUkNumeric(campaign.created_date),
                        "<span class=\"label " + label + "\" data-toggle=\"tooltip\" data-placement=\"right\" data-html=\"true\" title=\"" + quickStats + "\">" + campaign.status + "</span>",
                        actions
                    ]
                    if (campaign.status == 'Completed') {
                        rows['archived'].push(row)
                    } else {
                        rows['active'].push(row)
                    }
                })
                activeCampaignsTable.rows.add(rows['active']).draw()
                archivedCampaignsTable.rows.add(rows['archived']).draw()
                $('[data-toggle="tooltip"]').tooltip()
            } else {
                $("#emptyMessage").show()
            }
        })
        .error(function () {
            $("#loading").hide()
            errorFlash("Помилка завантаження кампаній")
        })
    // Select2 Defaults
    $.fn.select2.defaults.set("width", "100%");
    $.fn.select2.defaults.set("dropdownParent", $("#modal_body"));
    $.fn.select2.defaults.set("theme", "bootstrap");
    $.fn.select2.defaults.set("sorter", function (data) {
        return data.sort(function (a, b) {
            if (a.text.toLowerCase() > b.text.toLowerCase()) {
                return 1;
            }
            if (a.text.toLowerCase() < b.text.toLowerCase()) {
                return -1;
            }
            return 0;
        });
    })
})
