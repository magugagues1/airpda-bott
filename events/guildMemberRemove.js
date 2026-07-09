const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const GuildConfig = require('../database/models/GuildConfig');

module.exports = {
  name: 'guildMemberRemove',
  async execute(client, member) {
    const gc = await GuildConfig.findOne({ guildId: member.guild.id });
    if (!gc) return;

    // Despedida
    if (gc.despedida?.activo && gc.canales?.despedida) {
      const channel = member.guild.channels.cache.get(gc.canales.despedida);
      if (channel) {
        const msg = (gc.despedida.mensaje || '{user} ha abandonado el servidor.')
          .replace('{user}', member.user.tag)
          .replace('{server}', member.guild.name)
          .replace('{memberCount}', member.guild.memberCount.toString());

        const embed = new EmbedBuilder()
          .setColor(config.colors.danger)
          .setTitle('👋 Miembro salió')
          .setDescription(msg)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'AmericanRP' })
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // Log
    const logCh = gc.canales?.logs;
    if (logCh && gc.logs?.salidas) {
      const lch = member.guild.channels.cache.get(logCh);
      if (lch) {
        lch.send({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('📤 Miembro salió')
            .setDescription(`${member.user.tag} salió del servidor`)
            .addFields({ name: 'ID', value: member.id })
            .setTimestamp()],
        }).catch(() => {});
      }
    }
  },
};
