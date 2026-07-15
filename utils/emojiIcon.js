const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_DIR = path.join(__dirname, '..', 'cache', 'emoji');
const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72';

function ensureCache() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getEmojiCodePoint(emoji) {
  if (!emoji) return null;
  const code = [];
  for (const char of emoji) {
    if (char.codePointAt(0) > 0xffff) code.push(char.codePointAt(0).toString(16));
    else if (char.charCodeAt(0) > 32) code.push(char.charCodeAt(0).toString(16));
  }
  return code.join('-');
}

async function downloadEmojiImage(emoji) {
  const cp = getEmojiCodePoint(emoji);
  if (!cp) return null;

  ensureCache();
  const filePath = path.join(CACHE_DIR, `${cp}.png`);

  if (fs.existsSync(filePath)) return filePath;

  const url = `${TWEMOJI_BASE}/${cp}.png`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) { resolve(null); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        fs.writeFileSync(filePath, Buffer.concat(chunks));
        resolve(filePath);
      });
    }).on('error', () => resolve(null));
  });
}

module.exports = { downloadEmojiImage, getEmojiCodePoint };