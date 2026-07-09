const { execSync } = require('child_process');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = '1523771792907436125';

function run(cmd) {
  return execSync(cmd, { cwd: require('path').join(__dirname, '..'), encoding: 'utf-8' }).trim();
}

async function send() {
  try {
    const hash = run('git log --format="%H" -1');
    const message = run('git log --format="%s" -1');
    const author = run('git log --format="%an" -1');
    const date = run('git log --format="%ad" --date=iso -1');
    const files = run('git diff --name-only HEAD~1 HEAD').split('\n').filter(Boolean);
    const stats = run('git diff --stat HEAD~1 HEAD').split('\n').filter(Boolean).pop() || '';
    const repoUrl = 'https://github.com/maruu00/airpda-bot';

    const embed = {
      title: `📦 ${message}`,
      color: 0x3b82f6,
      fields: [
        { name: '👤 Autor', value: author, inline: true },
        { name: '🔗 Commit', value: `\`${hash.slice(0, 7)}\``, inline: true },
        { name: '📅 Fecha', value: date, inline: true },
        { name: '📁 Archivos modificados', value: files.length > 0 ? files.map(f => `\`${f}\``).join('\n').slice(0, 1000) : '*Ninguno*', inline: false },
        { name: '📊 Estadísticas', value: stats || '—', inline: false },
        { name: '🔗 GitHub', value: `${repoUrl}/commit/${hash}`, inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Git · AmericanRP Bot' },
    };

    const payload = JSON.stringify({
      content: `📦 **Nuevo commit:** ${message}`,
      embeds: [embed],
    });

    const https = require('https');
    const resp = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'discord.com',
        path: `/api/v10/channels/${CHANNEL_ID}/messages`,
        method: 'POST',
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(d));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    console.log('[GitLog] Enviado:', resp.slice(0, 100));
  } catch (e) {
    console.error('[GitLog]', e.message);
  }
}

send().then(() => process.exit(0));