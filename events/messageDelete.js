const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const GuildConfig = require('../database/models/GuildConfig');

module.exports = {
  name: 'messageDelete',
  async execute(client, message) {
    if (!message.guild || message.author?.bot) return;
    const gc = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!gc?.logs?.mensajes || !gc.canales?.logs) return;

    const ch = message.guild.channels.cache.get(gc.canales.logs);
    if (!ch) return;

    ch.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('🗑️ Mensaje eliminado')
        .addFields(
          { name: 'Autor', value: message.author ? `${message.author.tag} (<@${message.author.id}>)` : '*desconocido*', inline: true },
          { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Contenido', value: message.content?.slice(0, 1024) || '*sin contenido*', inline: false },
        )
        .setTimestamp()],
    }).catch(() => {});
  },
};
