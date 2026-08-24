package controllers

import (
	"html/template"
	"net/http"

	ctx "github.com/gophish/gophish/context"
	"github.com/gophish/gophish/models"
)

type trainingPageData struct {
	RecipientName string
	CampaignName  string
	Trigger       string
	Passed        bool
	Completed     bool
	RId           string
}

var trainingPage = template.Must(template.New("training").Parse(`<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Навчання з кібербезпеки</title>
<style>body{margin:0;background:#f3f6f8;color:#243447;font:16px Arial,sans-serif}.card{max-width:760px;margin:48px auto;padding:36px;background:#fff;border-radius:12px;box-shadow:0 8px 28px #1f35421f}h1{margin-top:0;color:#1f536d}h2{font-size:20px;color:#1f536d}li{margin:10px 0}.notice{padding:14px;border-radius:8px;background:#e7f4ed;margin:20px 0}.wrong{background:#fff3cd}.question{margin-top:28px;padding-top:20px;border-top:1px solid #dfe7eb}.btn{display:inline-block;margin-top:18px;padding:11px 22px;border:0;border-radius:6px;background:#247da0;color:#fff;font-size:16px;cursor:pointer}.muted{color:#5d6b75}</style></head>
<body><main class="card"><h1>Навчання з кібербезпеки</h1>
<p>Вітаємо, {{.RecipientName}}. Це була контрольована навчальна перевірка в межах кампанії «{{.CampaignName}}».</p><p class="muted">Зафіксована дія: {{.Trigger}}.</p>
{{if .Completed}}{{if .Passed}}<div class="notice"><strong>Тест пройдено правильно.</strong> Ви завершили навчальний модуль.</div>{{else}}<div class="notice wrong"><strong>Відповідь потребує уточнення.</strong> Перегляньте матеріал і спробуйте ще раз.</div>{{end}}{{end}}{{if not .Passed}}
<div class="notice">Не вводьте паролі та інші конфіденційні дані на сторінках, якщо ви не перевірили відправника й адресу сайту.</div>
<h2>На які ознаки потрібно звертати увагу</h2><ul><li>адреса відправника або домен відрізняється від очікуваного;</li><li>лист створює терміновість і вимагає негайної дії;</li><li>посилання веде на незнайомий або підозрілий домен;</li><li>вкладення чи форма запитують пароль, код або інші службові дані.</li></ul>
<section class="question"><h2>Перевірка знань</h2><p>Що потрібно зробити з підозрілим листом?</p><form method="post" action="/training?rid={{.RId}}"><label><input type="radio" name="answer" value="report" required> Повідомити про нього за встановленим каналом</label><br><label><input type="radio" name="answer" value="click"> Перейти за посиланням, щоб перевірити</label><br><label><input type="radio" name="answer" value="reply"> Відповісти та надіслати запитані дані</label><br><button class="btn" type="submit">Завершити навчання</button></form></section>{{end}}
</main></body></html>`))

// TrainingHandler serves the post-check educational module. It never stores
// the submitted answer or any credential values.
func (ps *PhishingServer) TrainingHandler(w http.ResponseWriter, r *http.Request) {
	r, err := setupContext(r)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if _, preview := ctx.Get(r, "result").(models.EmailRequest); preview {
		http.NotFound(w, r)
		return
	}
	rs := ctx.Get(r, "result").(models.Result)
	c := ctx.Get(r, "campaign").(models.Campaign)
	if !c.TrainingEnabled {
		http.NotFound(w, r)
		return
	}
	if r.Method == http.MethodGet {
		_ = rs.HandleTrainingViewed()
	} else if r.Method == http.MethodPost {
		if err := rs.HandleTrainingQuiz(r.FormValue("answer") == "report"); err != nil {
			http.Error(w, "не вдалося зберегти результат навчання", http.StatusInternalServerError)
			return
		}
	} else {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	trigger := "взаємодія з навчальною сторінкою"
	switch rs.Status {
	case models.EventDataSubmit:
		trigger = "введення даних у форму"
	case models.EventClicked:
		trigger = "перехід за посиланням"
	}
	data := trainingPageData{RecipientName: rs.FirstName, CampaignName: c.Name, Trigger: trigger, RId: rs.RId, Completed: r.Method == http.MethodPost, Passed: r.FormValue("answer") == "report"}
	if data.RecipientName == "" {
		data.RecipientName = "учаснику"
	}
	_ = trainingPage.Execute(w, data)
}
