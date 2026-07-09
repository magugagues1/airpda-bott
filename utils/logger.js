const { EmbedBuilder } = require('discord.js');

const CHANNEL_LOGS = '1510107636157386853';
const CHANNEL_TRANSCRIPT = '1480329534485172426';
const CHANNEL_RECORDS = '1480329605100470395';

function logEmbed(title, color, fields = []) {
  const e = new EmbedBuilder()
    .setColor(color || 0x3498DB)
    .setTitle(title)
    .setTimestamp();
  for (const f of fields) {
    if (f.name && f.value) e.addFields({ name: f.name, value: String(f.value), inline: f.inline || false });
  }
  return e;
}

async function sendLog(guild, type, embed) {
  try {
    const channelId = CHANNEL_LOGS;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (channel) await channel.send({ embeds: [embed] });
  } catch {}
}

async function sendTranscript(guild, embed, files) {
  try {
    const channel = await guild.channels.fetch(CHANNEL_TRANSCRIPT).catch(() => null);
    if (channel) await channel.send({ embeds: [embed], files });
  } catch {}
}

async function sendRecord(guild, embed) {
  try {
    const channel = await guild.channels.fetch(CHANNEL_RECORDS).catch(() => null);
    if (channel) await channel.send({ embeds: [embed] });
  } catch {}
}

module.exports = { sendLog, logEmbed, sendTranscript, sendRecord };