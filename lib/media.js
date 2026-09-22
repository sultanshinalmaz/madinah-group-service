'use strict';
/* ==========================================================================
   Фото и видео приложения.

     • есть BLOB_READ_WRITE_TOKEN → Vercel Blob: файлы лежат в облаке,
       ссылка сразу постоянная (https://…public.blob.vercel-storage.com/media/…)
     • нет токена                 → папка bot/data/media, как было раньше,
       и ffmpeg, если он установлен (сжатие видео и обложки)

   Имена файлов одинаковые в обоих вариантах: <имя>.<расширение>, а уменьшенная
   копия фото — <имя>-m.<расширение>. Приложение само подставляет «-m» в карточках.
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { ROOT, cfg } = require('./env.js');

const BLOB_TOKEN = cfg('BLOB_READ_WRITE_TOKEN');
const kind = BLOB_TOKEN ? 'blob' : 'fs';

const TYPES = {
  webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/mp4'
};
const isVideo = ext => /^(mp4|mov|webm|m4v)$/.test(ext);

/* ---------------------------------------------------------- Vercel Blob */
const blobPath = (name, ext) => 'media/' + name + '.' + ext;
async function blobPut(name, ext, body) {
  const { put } = require('@vercel/blob');
  const r = await put(blobPath(name, ext), body, {
    access: 'public',
    token: BLOB_TOKEN,
    addRandomSuffix: false,          // имя должно остаться тем же: по нему строится копия «-m»
    allowOverwrite: true,
    contentType: TYPES[ext] || 'application/octet-stream',
    cacheControlMaxAge: 31536000
  });
  return r.url;
}
async function blobCopy(fromUrl, name, ext) {
  const { copy } = require('@vercel/blob');
  const r = await copy(fromUrl, blobPath(name, ext), {
    access: 'public', token: BLOB_TOKEN, addRandomSuffix: false, allowOverwrite: true, contentType: TYPES[ext] || 'application/octet-stream'
  });
  return r.url;
}

/* ----------------------------------------------------------- своя папка */
const DATA_DIR = path.resolve(ROOT, cfg('DATA_DIR', 'bot/data'));
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const localUrl = (name, ext) => '/media/' + name + '.' + ext;

let HAS_FFMPEG = false;
if (kind === 'fs') {
  try { fs.mkdirSync(MEDIA_DIR, { recursive: true }); } catch (e) {}
  execFile('ffmpeg', ['-version'], err => { HAS_FFMPEG = !err; });
}
function ff(args) {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', ['-y', '-loglevel', 'error'].concat(args), { timeout: 15 * 60000 }, err => err ? reject(err) : resolve());
  });
}
function fsPut(name, ext, body) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  fs.writeFileSync(path.join(MEDIA_DIR, name + '.' + ext), body);
  return localUrl(name, ext);
}

/* ------------------------------------------------------------- наружу */

/* файл как есть: из панели (фото уже ужато в браузере) или из бота */
async function put(name, ext, buf) {
  if (kind === 'blob') return blobPut(name, ext, buf);
  const url = fsPut(name, ext, buf);
  if (isVideo(ext) && HAS_FFMPEG) transcodeLater(name, ext);
  return url;
}

/* фото из Telegram: кладём оригинал и копию «-m» для карточек.
   С ffmpeg (свой сервер) — сжимаем в webp, без него — копия один в один. */
async function photo(name, buf) {
  if (kind === 'blob') {
    const url = await blobPut(name, 'jpg', buf);
    try { await blobCopy(url, name + '-m', 'jpg'); } catch (e) { await blobPut(name + '-m', 'jpg', buf); }
    return url;
  }
  if (HAS_FFMPEG) {
    const src = path.join(MEDIA_DIR, name + '-src.jpg');
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    fs.writeFileSync(src, buf);
    try {
      await ff(['-i', src, '-vf', "scale='if(gt(iw,ih),min(1600,iw),-2)':'if(gt(iw,ih),-2,min(1600,ih))'", '-c:v', 'libwebp', '-quality', '84', path.join(MEDIA_DIR, name + '.webp')]);
      await ff(['-i', src, '-vf', "scale='min(800,iw)':-2", '-c:v', 'libwebp', '-quality', '80', path.join(MEDIA_DIR, name + '-m.webp')]);
      fs.unlink(src, () => {});
      return localUrl(name, 'webp');
    } catch (e) { console.error('webp:', e.message); fs.unlink(src, () => {}); }
  }
  fsPut(name, 'jpg', buf);
  fsPut(name + '-m', 'jpg', buf);
  return localUrl(name, 'jpg');
}

/* видео из Telegram. На своём сервере ffmpeg сожмёт его и снимет обложку,
   на Vercel ffmpeg нет — кладём как есть, обложку подставит карточка (первое фото). */
async function video(name, buf) {
  if (kind === 'blob') return { src: await blobPut(name, 'mp4', buf), poster: '' };
  if (HAS_FFMPEG) {
    const src = path.join(MEDIA_DIR, name + '-src.mp4');
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    fs.writeFileSync(src, buf);
    const out = path.join(MEDIA_DIR, name + '.mp4');
    const poster = path.join(MEDIA_DIR, name + '-poster.webp');
    try {
      await ff(['-i', src, '-vf', "scale='min(720,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '96k', out]);
      await ff(['-ss', '1', '-i', out, '-frames:v', '1', '-vf', "scale='min(800,iw)':-2", '-c:v', 'libwebp', '-quality', '80', poster]);
      fs.unlink(src, () => {});
      return { src: localUrl(name, 'mp4'), poster: localUrl(name + '-poster', 'webp') };
    } catch (e) { console.error('видео:', e.message); fs.unlink(src, () => {}); }
  }
  fsPut(name, 'mp4', buf);
  return { src: localUrl(name, 'mp4'), poster: '' };
}

/* видео из панели на своём сервере: сжимаем в фоне и подменяем ссылку */
const pending = new Map();
function transcodeLater(name, ext) {
  const file = path.join(MEDIA_DIR, name + '.' + ext);
  const outName = name + '-web';
  ff(['-i', file, '-vf', "scale='min(720,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '96k', path.join(MEDIA_DIR, outName + '.mp4')])
    .then(() => {
      pending.set(localUrl(name, ext), localUrl(outName, 'mp4'));
      setTimeout(() => fs.unlink(file, () => {}), 10 * 60000);   // оригинал ещё может досматриваться
      console.log('видео сжато:', name + '.' + ext, '→', outName + '.mp4');
    })
    .catch(e => console.error('сжатие видео:', e.message));
}

/* адрес файла по имени — для старых ссылок вида /media/… */
function urlOf(fileName) {
  if (kind !== 'blob') return localUrl(fileName.replace(/\.[^.]+$/, ''), (fileName.match(/\.([^.]+)$/) || [])[1] || 'webp');
  const base = cfg('BLOB_BASE_URL');
  return base ? base.replace(/\/$/, '') + '/media/' + fileName : '';
}

module.exports = {
  kind,
  get hasFfmpeg() { return HAS_FFMPEG; },
  mediaDir: MEDIA_DIR,
  put, photo, video, urlOf, pending,
  types: TYPES,
  isVideo
};
