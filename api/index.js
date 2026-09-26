'use strict';
/* ==========================================================================
   Точка входа Vercel. Правило в vercel.json отправляет сюда ВСЕ адреса /api/…
   (а также /webhook и /media/…): одна функция вместо постоянно работающего сервера.

   Раньше файл назывался api/[...path].js — но на Vercel без фреймворка такой файл
   ловит только адреса из одной части (/api/health), а /api/admin/… отдавал 404,
   и админ-панель не работала. Поэтому теперь явное правило перезаписи.

   Сама логика — в lib/app.js, он же решает, куда писать данные и файлы.
   ========================================================================== */

const app = require('../lib/app.js');

module.exports = async function handler(req, res) {
  try {
    await app.handle(req, res);
  } catch (e) {
    console.error('функция:', e);
    try {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Ошибка сервера' }));
    } catch (e2) {}
  }
};
