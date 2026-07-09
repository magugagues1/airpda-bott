const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const GuildConfig = require('../database/models/GuildConfig');
const { handleSecurity } = require('../systems/security/securitySystem');

// Cache de guild configs
const configCache = new Map();
async function getGuildConfig(guildId) {
  if (configCache.has(guildId)) return configCache.get(guildId);
  let gc = await GuildConfig.findOne({ guildId });
  if (!gc) gc = await GuildConfig.create({ guildId });
  configCache.set(guildId, gc);
  setTimeout(() => configCache.delete(guildId), 60000); // 1 min TTL
  return gc;
}

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    // ─── Sistema de Seguridad ─────────────────────────────────────────────
    await handleSecurity(message);

    const gc = await getGuildConfig(message.guild.id).catch(() => null);
    const prefix = gc?.prefix || config.prefix;

    // ─── Prefix Commands ───────────────────────────────────────────────────
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const cmd = client.prefixCmds.get(cmdName);
    if (!cmd) return;

    try {
      await cmd.run(message, args, client);
    } catch (err) {
      console.error(`[Prefix/${cmd.name}]`, err);
      message.reply('❌ Ocurrió un error al ejecutar el comando.').catch(() => {});
    }
  },
};
