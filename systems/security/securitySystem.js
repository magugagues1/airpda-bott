'use strict';

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../database/models/GuildConfig');
const { captureEvidence } = require('../../utils/evidenceCapture');

const CFG = {
  SPAM_MSG_LIMIT:    5,
  SPAM_INTERVAL_MS:  3000,
  RAID_JOIN_LIMIT:   10,
  RAID_JOIN_WINDOW:  10000,
  TIMEOUT_SPAM:      5 * 60_000,
  TIMEOUT_LINK:      5 * 60_000,
  TIMEOUT_MENTION:   5 * 60_000,
  TIMEOUT_AD:       60 * 60_000,
  BAD_WORDS: ['pornografi', 'pornograph', 'onlyfans', 'hijo de puta', 'hijoputa', 'subnormal', 'mongolo', 'retrasado'],
  LOG_CHANNEL_ID: '1523771792907436125',
};

const spamTracker = new Map();
const raidJoinMap = new Map();
const imageTracker = new Map(); // userId → {date, count, warned}

function isStaff(member, config) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  const wlRoles = config?.security?.whitelistRoles ?? [];
  return wlRoles.some(id => member.roles.cache.has(id));
}

async function secLog(guild, embed, evidenceFile = null) {
  try {
    const config = await GuildConfig.findOne({ guildId: guild.id }).lean();
    const sec = config?.security || {};
    const chId = sec.logChannelId || CFG.LOG_CHANNEL_ID;
    if (!chId) return;
    const ch = await guild.channels.fetch(chId).catch(() => null);
    if (!ch) return;
    const files = evidenceFile ? [evidenceFile] : [];
    const embeds = [embed];
    if (evidenceFile) {
      embeds.push(new EmbedBuilder().setColor(0xef4444).setTitle('📸 Evidencia').setImage('attachment://evidencia.png').setFooter({ text: 'Generado automáticamente' }));
    }
    await ch.send({ embeds, files }).catch(() => {});
  } catch {}
}

function makeEmbed(title, desc, color = 0xef4444) {
  return new EmbedBuilder().setColor(color).setTitle(`🛡️ ${title}`).setDescription(desc).setTimestamp();
}

async function deleteUserMessages(channel, userId) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const toDelete = messages.filter(m => m.author.id === userId && (Date.now() - m.createdTimestamp) < 1209600000);
    if (toDelete.size > 1) {
      await channel.bulkDelete(toDelete, true).catch(() => toDelete.forEach(m => m.delete().catch(() => {})));
    } else if (toDelete.size === 1) {
      await toDelete.first().delete().catch(() => {});
    }
  } catch {}
}

async function muteUser(member, durationMs, reason) {
  try {
    if (!member || member.permissions.has(PermissionFlagsBits.Administrator)) return false;
    await member.timeout(durationMs, reason);
    return true;
  } catch { return false; }
}

// ─── Anti-Spam ────────────────────────────────────────────────────────────
async function handleAntiSpam(message, sec) {
  if (sec.antiSpam === false) return false;
  const key = `${message.author.id}_${message.guild.id}`;
  const now = Date.now();
  const entries = (spamTracker.get(key) ?? []).filter(e => now - e.ts < CFG.SPAM_INTERVAL_MS);
  entries.push({ ts: now });
  spamTracker.set(key, entries);
  if (entries.lengthh < CFG.SPAM_MSG_LIMIT) return false;
  spamTracker.delete(key);
  const evidence = await captureEvidence(message, 'Spam masivo').catch(() => null);
  await deleteUserMessages(message.channel, message.author.id);
  await muteUser(message.member, CFG.TIMEOUT_SPAM, 'Anti-Spam');
  const embed = makeEmbed('Spam detectado', `<@${message.author.id}> silenciado **5 min** por spam.`);
  await message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
  await secLog(message.guild, embed, evidence);
  return true;
}

// ─── Anti-Links ───────────────────────────────────────────────────────────
async function handleAntiLinks(message, sec) {
  if (sec.antiLinks === false) return false;
  const content = message.content || '';
  const urlRegex = /(?:https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/)\S+/gi;
  if (!urlRegex.test(content)) return false;
  const wl = [...(sec.linkWhitelist ?? [])];
  const links = content.match(urlRegex) ?? [];
  const hasBlocked = links.some(l => !wl.some(w => l.toLowerCase().includes(w)));
  if (!hasBlocked) return false;
  const evidence = await captureEvidence(message, 'Enlace no permitido').catch(() => null);
  await deleteUserMessages(message.channel, message.author.id);
  await muteUser(message.member, CFG.TIMEOUT_LINK, 'Anti-Links');
  const embed = makeEmbed('Enlace bloqueado', `<@${message.author.id}> silenciado **5 min** por enlace no permitido.`);
  await message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
  await secLog(message.guild, embed, evidence);
  return true;
}

async function handleAntiMentions(message, sec) {
  if (sec.antiMentions === false) return false;
  const mentions = message.mentions.users.size + message.mentions.roles.size;
  if (mentions < 5) return false;
  const evidence = await captureEvidence(message, 'Menciones masivas').catch(() => null);
  await deleteUserMessages(message.channel, message.author.id);
  await muteUser(message.member, CFG.TIMEOUT_MENTION, 'Anti-Menciones');
  const embed = makeEmbed('Menciones masivas', `<@${message.author.id}> silenciado **5 min** por ${mentions} menciones.`);
  await message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
  await secLog(message.guild, embed, evidence);
  return true;
}

// ─── Anti-Insultos (solo palabras malsonantes, sin publicidad) ────────────
async function handleAntiInsult(message, sec) {
  if (sec.antiLinks === false) return false;
  const content = (message.content || '').toLowerCase();
  const hasBadWord = CFG.BAD_WORDS.some(w => content.includes(w));
  if (!hasBadWord) return false;

  const evidence = await captureEvidence(message, 'Lenguaje inapropiado').catch(() => null);
  await message.delete().catch(() => {});
  const embed = makeEmbed('🤬 Lenguaje inapropiado', `<@${message.author.id}> evita ese lenguaje.`, 0xf59e0b);
  await message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 6000));
  await secLog(message.guild, embed, evidence);
  return true;
}

// ─── Anti-Raid de joins ───────────────────────────────────────────────────
async function checkRaid(guild) {
  const config = await GuildConfig.findOne({ guildId: guild.id }).lean();
  if (!config) return false;
  const sec = config.security || {};
  if (sec.antiRaid === false) return false;
  if (sec.raidMode) return true;
  const key = guild.id;
  const now = Date.now();
  const joins = (raidJoinMap.get(key) ?? []).filter(t => now - t < CFG.RAID_JOIN_WINDOW);
  joins.push(now);
  raidJoinMap.set(key, joins);
  if (joins.length >= CFG.RAID_JOIN_LIMIT) {
    await GuildConfig.updateOne({ guildId: guild.id }, { 'security.raidMode': true });
    const embed = makeEmbed('🚨 RAID DE JOINS', `**${joins.length} uniones** en <10s. Servidor en modo raid.`, 0xef4444);
    const ch = await guild.channels.fetch(sec.logChannelId || CFG.LOG_CHANNEL_ID).catch(() => null);
    if (ch) await ch.send({ content: '@everyone', embeds: [embed] }).catch(() => {});
    return true;
  }
  return false;
}

// ─── Anti-Imagen Spam ────────────────────────────────────────────────────
async function handleAntiImageSpam(message, sec) {
  if (sec.antiSpam === false) return false;
  if (!message.attachments.size && !message.embeds.some(e => e.image || e.thumbnail)) return false;

  const userId = message.author.id;
  const today = new Date().toDateString();
  const entry = imageTracker.get(userId) || { date: today, count: 0, warned: false };

  // Reset si es otro día
  if (entry.date !== today) {
    imageTracker.set(userId, { date: today, count: 0, warned: false });
  }

  const totalImages = message.attachments.size + message.embeds.filter(e => e.image || e.thumbnail).length;
  if (totalImages < 2) {
    imageTracker.set(userId, entry);
    return false;
  }

  // Envió 2+ imágenes → contar como infracción
  entry.count += 1;
  imageTracker.set(userId, entry);

  if (entry.count === 1) {
    // Primera infracción: eliminar + advertir
    entry.warned = true;
    imageTracker.set(userId, entry);
    await deleteUserMessages(message.channel, userId);
    const warnEmbed = makeEmbed('📸 Imágenes múltiples', `<@${userId}> no envíes **más de 1 imagen** seguida. Próxima vez serás silenciado 5 min.`, 0xf59e0b);
    await message.channel.send({ embeds: [warnEmbed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
    const ev = await captureEvidence(message, 'Múltiples imágenes (1er aviso)').catch(() => null);
    await secLog(message.guild, warnEmbed, ev);
    return true;
  }

  if (entry.count >= 2) {
    // Segunda infracción el mismo día: timeout 5min
    imageTracker.delete(userId);
    const evidence = await captureEvidence(message, 'Múltiples imágenes (2º aviso)').catch(() => null);
    await deleteUserMessages(message.channel, userId);
    await muteUser(message.member, 5 * 60_000, 'Anti-Imagen: múltiples imágenes (2º aviso)');
    const muteEmbed = makeEmbed('🔇 Silenciado por imágenes', `<@${userId}> silenciado **5 min** por enviar múltiples imágenes repetidamente.`);
    await message.channel.send({ embeds: [muteEmbed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
    await secLog(message.guild, muteEmbed, evidence);
    return true;
  }

  imageTracker.set(userId, entry);
  return false;
}

// ─── Anti-Repetición / Flood de caracteres ──────────────────────────────
async function handleAntiRepeat(message, sec) {
  if (sec.antiSpam === false) return false;
  const content = message.content || '';
  if (content.length < 50) return false;

  // Detectar @everyone/@here repetido muchas veces
  const everyoneCount = (content.match(/@everyone|@here/gi) || []).length;
  if (everyoneCount >= 5) {
    const ev = await captureEvidence(message, '@everyone repetido').catch(() => null);
    await deleteUserMessages(message.channel, message.author.id);
    await muteUser(message.member, 60 * 60_000, 'Anti-@everyone: spam de menciones');
    const embed = makeEmbed('🔇 @everyone masivo', `<@${message.author.id}> silenciado **1 hora** por spam de @everyone (${everyoneCount}x).`, 0xef4444);
    await message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
    await secLog(message.guild, embed, ev);
    return true;
  }

  // Detectar flood de caracteres repetidos O contenido no estándar (ASCII art, braille, etc.)
  const letters = content.replace(/[\s\n\r]/g, '');
  if (letters.length < 30) return false;
  const uniqueChars = new Set(letters).size;
  const ratio = letters.length > 0 ? uniqueChars / letters.length : 1;

  // Flood de mismo carácter (ratio muy bajo)
  if (letters.length >= 50 && ratio < 0.08) {
    const ev = await captureEvidence(message, 'Flood de caracteres').catch(() => null);
    await deleteUserMessages(message.channel, message.author.id);
    await muteUser(message.member, CFG.TIMEOUT_SPAM, 'Anti-Flood: caracteres repetidos');
    const embed = makeEmbed('🚫 Flood detectado', `<@${message.author.id}> silenciado **5 min** por flooding (${letters.length} chars, ${uniqueChars} únicos).`, 0xf59e0b);
    await message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
    await secLog(message.guild, embed, ev);
    return true;
  }

  // Detectar caracteres no estándar (Unicode blocks como braille, dingbats, etc.)
  const nonStandard = [...letters].filter(c => c.charCodeAt(0) > 0x2000).length;
  if (letters.length >= 50 && nonStandard / letters.length > 0.5) {
    const ev = await captureEvidence(message, 'Caracteres no estándar').catch(() => null);
    await deleteUserMessages(message.channel, message.author.id);
    await muteUser(message.member, 10 * 60_000, 'Anti-Flood: caracteres Unicode no estándar');
    const embed = makeEmbed('🚫 Contenido no estándar', `<@${message.author.id}> silenciado **10 min** por caracteres no estándar (${nonStandard}/${letters.length}).`, 0xf59e0b);
    await message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
    await secLog(message.guild, embed, ev);
    return true;
  }

  // Detectar subcadena repetida 8+ veces (mismo texto copiado)
  for (let len = 2; len <= 10; len++) {
    for (let i = 0; i <= content.length - len * 8; i++) {
      const sub = content.substring(i, i + len);
      if (!sub.trim()) continue;
      const count = content.split(sub).length - 1;
      if (count >= 8 && sub.length * count >= content.length * 0.6) {
        const ev = await captureEvidence(message, `Patrón repetido: "${sub.slice(0, 20)}" x${count}`).catch(() => null);
        await deleteUserMessages(message.channel, message.author.id);
        await muteUser(message.member, CFG.TIMEOUT_SPAM, 'Anti-Flood: patrón repetido');
        const embed = makeEmbed('🚫 Patrón repetido', `<@${message.author.id}> silenciado **5 min** por repetir "${sub.slice(0, 20)}" ${count} veces.`, 0xf59e0b);
        await message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
        await secLog(message.guild, embed, ev);
        return true;
      }
    }
  }

  return false;
}

// ─── Entrada principal ────────────────────────────────────────────────────
async function handleSecurity(message) {
  if (!message.guild || message.author.bot) return;

  const config = await GuildConfig.findOne({ guildId: message.guild.id }).lean();
  if (!config) return;
  const sec = config.security || {};
  if (sec.activo === false) return;

  if (isStaff(message.member, config)) return;

  if (await handleAntiInsult(message, sec)) { console.log('[Security] antiInsult triggered:', message.author.tag, message.content?.slice(0,50)); return; }
  if (await handleAntiRepeat(message, sec)) { console.log('[Security] antiRepeat triggered:', message.author.tag, message.content?.slice(0,50)); return; }
  if (await handleAntiRepeat(message, sec)) { console.log('[Security] antiRepeat triggered:', message.author.tag, message.content?.slice(0,50)); return; }
  if (await handleAntiLinks(message, sec)) { console.log('[Security] antiLinks triggered:', message.author.tag, message.content?.slice(0,50)); return; }
  if (await handleAntiMentions(message, sec)) { console.log('[Security] antiMentions triggered:', message.author.tag); return; }
  if (await handleAntiImageSpam(message, sec)) { console.log('[Security] antiImage triggered:', message.author.tag); return; }
  if (await handleAntiSpam(message, sec)) { console.log('[Security] antiSpam triggered:', message.author.tag); return; }
}

module.exports = { handleSecurity, checkRaid, isStaff };