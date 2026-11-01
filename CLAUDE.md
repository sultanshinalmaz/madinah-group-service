# Madinah Group — заметки проекта

## Стек
- **Язык:** JavaScript (Node.js 20+ на сервере, обычный JS в браузере), без TypeScript.
- **Фреймворк:** нет. Фронтенд — статический `index.html` + `assets/js/*.js` без сборки (глобалы `MR`, `Gallery`,
  `Services`, `Admin…`), тексты — `assets/js/data.js` и `assets/js/i18n.js`. Telegram Mini App.
- **Сервер:** `lib/app.js` (вся логика: API, бот на вебхуке, импорт из канала), точка входа Vercel — `api/index.js`
  (rewrite `/api/:path*` → `/api/index`), локально — `node bot/server.js --dev` (порт 8443, `.claude/launch.json`).
- **База:** Postgres (Neon, бесплатный тариф, таблица `docs`: key + jsonb) при `DATABASE_URL`, иначе JSON-файлы в `bot/data`.
  Медиа — Vercel Blob (`madinah-files`) или папка.
- **Хостинг:** Vercel, проект `madinah-group-service` (team almaz3, `prj_qJFrTQ2ebnVtEKDPQ5e06d9K62p0`), автодеплой из
  GitHub `sultanshinalmaz/madinah-group-service` (main). Адрес: https://madinah-group-service.vercel.app
- **Проверка:** `npm test` (tools/test-local.mjs + tools/test-vercel.cjs с pg-mem и заглушками Telegram/Blob),
  `/api/health` и `/api/health?telegram=1` на проде. Перед пушем — всегда `npm test` и `git fetch`.
- Этот файл на сайт не попадает: `.vercelignore` исключает `*.md`.

## Главное о проекте
- Заказчик — Абдуллах Рахимов (@RakhimovAbdullah, ID 593048264), второй админ — ID 8808659518 (зашит в коде).
  Бот @abdullah_mini_app_bot, канал @madinah_rent (бот — администратор, посты сами становятся карточками).
- Контакт сестёр — @MADINAHGRP. Комиссия в карточках из канала — «уточняйте у риелтора». Тариф Vercel — бесплатный.
- Команды бота для админов: /list, /refresh (дотянуть из канала медиа/обложки/районы; /refresh 416 — пост заново), /report.
- Переключатели на Vercel (Settings → Environment Variables, после смены — Redeploy):
  - `APP_PAUSE` — `admin` (баннер админам), `import` (посты канала в очередь), `users` (блок для всех); сейчас `off`.
  - `ADMIN_NOTICE` — `ayah` (аят 70:32 админам, с кнопкой «Продолжить»), `ayah-lock` (без кнопки), `off`;
    `ADMIN_NOTICE_FROM` — с какого момента (ISO с поясом).

## 2026-11-01 — аят для администраторов
- **Сделано:** по просьбе пользователя с 12:00 (Медина) 01.11.2026 админы канала при открытии мини-аппа видят
  карточку во весь экран: аят 70:32 по-арабски (Amiri), перевод «…которые сохраняют доверенное им и
  **соблюдают договоры**» (выделено), «Сура «аль-Маариж», аят 32», кнопка «Продолжить» — панель под ней работает.
  Клиенты карточку не видят. Сервер: `adminNotice()` в `lib/app.js`, `/api/me` отдаёт `notice` только админу;
  клиент: `showAyah()` в `assets/js/app.js`; стили `.ayah-*` в `assets/css/features.css`.
- **Включено:** `ADMIN_NOTICE=ayah`, `ADMIN_NOTICE_FROM=2026-11-01T12:00:00+03:00` (production).
- **Убрать:** `ADMIN_NOTICE=off` (удалять переменные инструменты Vercel не умеют) и перевыложить; или попросить Claude.
- **Подводные камни:** переменные Vercel применяются только к новой выкладке; `/api/health` показывает `notice`
  («показывается» / «ещё не время»).
- **Проверено:** `npm test` — 82 из 82 и 32 из 32; карточка снята в headless Chrome (подменён ответ `/api/me`).
- **Выкладка:** `dpl_2KiGvJrqs42PrYzQ8vEsaFHxvcXx`, коммит `cbde17c`, READY. На проде `/api/health` →
  `notice: "ayah с 2026-11-01T09:00:00.000Z — ещё не время"` (09:00 UTC = 12:00 Медина), проверено в 10:41.
