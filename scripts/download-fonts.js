const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'assets', 'fonts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const fonts = [
  { url: 'https://github.com/rsms/inter/raw/v4.0/docs/font-files/Inter-Regular.ttf', file: 'Inter-Regular.ttf' },
  { url: 'https://github.com/rsms/inter/raw/v4.0/docs/font-files/Inter-Bold.ttf', file: 'Inter-Bold.ttf' },
];

async function download(url, file) {
  const fp = path.join(dir, file);
  if (fs.existsSync(fp)) { console.log(`${file} already exists`); return; }
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, (r) => {
          const chunks = []; r.on('data', c => chunks.push(c));
          r.on('end', () => { fs.writeFileSync(fp, Buffer.concat(chunks)); console.log(`Downloaded ${file}`); resolve(); });
        });
      } else {
        const chunks = []; res.on('data', c => chunks.push(c));
        res.on('end', () => { fs.writeFileSync(fp, Buffer.concat(chunks)); console.log(`Downloaded ${file}`); resolve(); });
      }
    }).on('error', (e) => { console.error(`Failed ${file}: ${e.message}`); resolve(); });
  });
}

(async () => { for (const f of fonts) await download(f.url, f.file); })();