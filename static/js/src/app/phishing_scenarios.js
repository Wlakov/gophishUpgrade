var scenarios = []

function optionsFor(items) {
    return $.map(items, function (item) {
        return { id: item.id, text: item.name }
    })
}

function loadOptions(scenario) {
    api.templates.get().success(function (templates) {
        $("#template").empty().select2({ placeholder: "Оберіть шаблон листа", data: optionsFor(templates) })
        if (scenario) {
            $("#template").val(scenario.template_id).trigger("change")
        }
    })
    api.pages.get().success(function (pages) {
        $("#page").empty().select2({ placeholder: "Оберіть цільову сторінку", data: optionsFor(pages) })
        if (scenario) {
            $("#page").val(scenario.page_id).trigger("change")
        }
    })
    api.SMTP.get().success(function (profiles) {
        $("#profile").empty().select2({ placeholder: "Оберіть профіль відправлення", data: optionsFor(profiles) })
        if (scenario) {
            $("#profile").val(scenario.smtp_id).trigger("change")
        }
    })
}

function dismiss() {
    $("#modal\\.flashes").empty()
    $("#name").val("")
    $("#template, #page, #profile").val("").trigger("change")
}

function save(idx) {
    var scenario = {
        name: $("#name").val(),
        template_id: parseInt($("#template").val(), 10),
        page_id: parseInt($("#page").val(), 10),
        smtp_id: parseInt($("#profile").val(), 10)
    }
    var request = idx === -1 ? api.scenarios.post(scenario) : api.scenarioId.put($.extend(scenario, { id: scenarios[idx].id }))
    request.success(function () {
        successFlash(idx === -1 ? "Сценарій успішно створено!" : "Сценарій успішно оновлено!")
        $("#modal").modal("hide")
        load()
    }).error(function (data) {
        modalError(data.responseJSON.message)
    })
}

function edit(idx) {
    var scenario = idx === -1 ? null : scenarios[idx]
    dismiss()
    $("#modalLabel").text(idx === -1 ? "Новий фішинговий сценарій" : "Редагування фішингового сценарію")
    loadOptions(scenario)
    if (scenario) {
        $("#name").val(scenario.name)
    }
    $("#modalSubmit").unbind("click").click(function () { save(idx) })
}

function deleteScenario(idx) {
    Swal.fire({
        title: "Are you sure?",
        text: "Сценарій буде видалено. Цю дію неможливо скасувати!",
        type: "warning",
        showCancelButton: true,
        confirmButtonText: "Видалити " + scenarios[idx].name,
        confirmButtonColor: "#428bca",
        reverseButtons: true
    }).then(function (result) {
        if (!result.value) return
        api.scenarioId.delete(scenarios[idx].id).success(function () {
            successFlash("Сценарій успішно видалено!")
            load()
        }).error(function (data) {
            errorFlash(data.responseJSON.message)
        })
    })
}

function load() {
    $("#scenariosTable, #emptyMessage").hide()
    $("#loading").show()
    api.scenarios.get().success(function (data) {
        scenarios = data
        $("#loading").hide()
        if (scenarios.length === 0) {
            $("#emptyMessage").show()
            return
        }
        var table = $("#scenariosTable").DataTable({ destroy: true, columnDefs: [{ orderable: false, targets: "no-sort" }] })
        var rows = $.map(scenarios, function (scenario, idx) {
            return [[
                escapeHtml(scenario.name),
                escapeHtml(scenario.template.name),
                escapeHtml(scenario.page.name),
                escapeHtml(scenario.smtp.name),
                moment(scenario.modified_date).format("MMMM Do YYYY, h:mm:ss a"),
                user.can_modify_objects ? "<div class='pull-right'><span data-toggle='modal' data-backdrop='static' data-target='#modal'><button class='btn btn-primary' onclick='edit(" + idx + ")'><i class='fa fa-pencil'></i></button></span> <button class='btn btn-danger' onclick='deleteScenario(" + idx + ")'><i class='fa fa-trash-o'></i></button></div>" : ""
            ]]
        })
        table.clear().rows.add(rows).draw()
        $("#scenariosTable").show()
    }).error(function () {
        $("#loading").hide()
        errorFlash("Помилка завантаження фішингових сценаріїв")
    })
}

$(document).ready(load)
