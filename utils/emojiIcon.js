const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_DIR = path.join(__dirname, '..', 'cache', 'emoji');

function ensureCache() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getEmojiCodePoint(emoji) {
  if (!emoji) return null;
  const code = [];
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp > 0xffff) code.push(cp.toString(16));
    else if (cp > 32 && cp !== 0xfe0f && cp !== 0x200d) code.push(cp.toString(16));
  }
  return code.join('-');
}

async function downloadEmojiImage(emoji) {
  const cp = getEmojiCodePoint(emoji);
  if (!cp) return null;

  ensureCache();
  const filePath = path.join(CACHE_DIR, `${cp}.png`);

  if (fs.existsSync(filePath)) return filePath;

  // Intentar JoyPixels primero (más realistas), fallback a Twemoji
  const sources = [
    `https://cdn.jsdelivr.net/gh/joypixels/emoji-assets@latest/png/72/${cp}.png`,
    `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${cp}.png`,
  ];

  for (const url of sources) {
    const result = await download(url, filePath);
    if (result) return result;
  }

  return null;
}

function download(url, filePath) {
  return new Promise((resolve) => {
    https.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) { resolve(null); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          fs.writeFileSync(filePath, Buffer.concat(chunks));
          resolve(filePath);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null)).on('timeout', function() { this.destroy(); resolve(null); });
  });
}

module.exports = { downloadEmojiImage, getEmojiCodePoint };