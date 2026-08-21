# Gophish Upgrade

Проєкт призначений для проведення контрольованих навчальних кампаній з
кібербезпеки в ізольованому середовищі. Використовуйте його лише щодо
отримувачів, систем і поштових доменів, для яких маєте належний дозвіл.

## Реалізовані можливості

- Формування фішингових сценаріїв із шаблону листа, сторінки переходу та
  профілю відправлення.
- Використання кількох сценаріїв у межах однієї кампанії та статистика за
  кожним із них.
- Облік доставки, відкриттів, переходів, введення даних, помилок і повідомлень
  про підозрілі листи (`Reported`).
- Детальний перегляд кампаній користувачів із групами, прев’ю листів і сторінок
  переходу, сценаріями та шкалою подій.
- Розмежування доступу за ролями й окремі робочі простори відділів.
- Локальне тестування поштового Reporting через Mailpit, SMTP, IMAPS і DNS.

## Ролі користувачів

| Роль | Можливості |
| --- | --- |
| Системний адміністратор | Керує користувачами, ролями та переглядає робочі простори всіх відділів у розділі **Users Campaigns**. |
| Керівник кампаній | Створює, редагує, запускає та завершує кампанії свого відділу. |
| Редактор | Працює зі спільними групами, шаблонами, сторінками, профілями відправлення та сценаріями свого керівника, але не запускає кампанії. |
| Спостерігач | Переглядає спільні матеріали, кампанії та результати свого відділу без можливості змін. Не має доступу до **Reporting Settings**. |

Редактор і спостерігач обов’язково прив’язуються до керівника кампаній. Дані
одного відділу не відкриваються користувачам іншого відділу.

## Запуск локального середовища

Потрібні Docker і Docker Compose.

```bash
docker compose up --build -d
```

Після запуску доступні такі сервіси:

| Сервіс | Адреса |
| --- | --- |
| Адміністративний інтерфейс Gophish | http://localhost:3333 |
| Сторінки навчальних кампаній | http://localhost:8080 |
| Mailpit — перегляд тестових листів | http://localhost:8025 |

Перевірка стану та журнали:

```bash
docker compose ps
docker compose logs --tail=100 gophish
```

Зупинення середовища без видалення даних:

```bash
docker compose stop
```

## Локальне тестування Reporting

У Compose налаштовано ізольований домен `training.test`, CoreDNS і поштовий
сервер. Він призначений лише для тестування та не приймає пошту з Інтернету.

Для керівника кампаній, редактора або системного адміністратора вкажіть у
**Account Settings → Reporting Settings**:

| Налаштування | Значення |
| --- | --- |
| Use IMAP | увімкнено |
| IMAP Host | `mail.training.test` |
| IMAP Port | `993` |
| Use TLS | увімкнено |
| Ignore Certificate Errors | увімкнено лише для локального самопідписаного сертифіката |
| Folder | `INBOX` |
| Polling frequency | `60` |

Локальна скринька для повідомлень — `reports@training.test`. Пароль не
зберігається в репозиторії. Додаткову тестову скриньку можна створити так:

```bash
docker compose exec mailserver setup email add user@training.test 'надійний-пароль'
```

Для ручної перевірки запустіть тестову кампанію через Mailpit, збережіть
оригінальний лист як `.eml`, надішліть його вкладенням до
`reports@training.test` і не відкривайте отримане повідомлення. Протягом
інтервалу опитування в результатах кампанії має з’явитися подія
`Email Reported` і збільшитися показник `Reported`.

## API та безпека доступу

API-ключ облікового запису використовується для автентифікації запитів до
`/api/`. Спостерігач може отримувати лише дані спільного робочого простору
свого відділу. Йому заборонені створення, редагування, видалення, запуск або
завершення кампаній, керування користувачами, вебхуками, Reporting і
системними розділами. Ці обмеження перевіряються на сервері, а не лише у
вебінтерфейсі.

Не передавайте API-ключі та паролі в листуванні або коді. У разі компрометації
ключ можна замінити в налаштуваннях облікового запису.

## Автоматичні тести

```bash
go test ./...
```

Тести охоплюють базову логіку, ролі, спільні простори відділів і заборонені
API-операції для спостерігача.

## Ліцензія

Gophish — Open-Source Phishing Framework

The MIT License (MIT)

Copyright (c) 2013 - 2020 Jordan Wright

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
