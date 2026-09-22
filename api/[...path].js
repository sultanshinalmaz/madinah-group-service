'use strict';
/* ==========================================================================
   Точка входа Vercel. Всё, что начинается с /api/… (а также /webhook и /media/…
   по правилам из vercel.json), попадает сюда: одна функция вместо постоянно
   работающего сервера.

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
