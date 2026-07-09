const { EmbedBuilder } = require('discord.js');
const pdaApi = require('../../utils/pdaApi');
const { getPlayer, requireBadge } = require('../../utils/helpers');
const E = require('../../utils/embeds');
const config = require('../../config');
const GuildConfig = require('../../database/models/GuildConfig');

const BADGE_ROLES = [config.roles.policia, config.roles.sheriff];
const ERR_NOAUTH = 'Solo el personal policial o admins puede usar este comando PDA.';

async function informes(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const informesArr = await pdaApi.getInformes().catch(() => []);
  if (!informesArr.length) return interaction.editReply({ embeds: [E.info('Sin informes', 'No hay informes registrados.')] });

  const embed = new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle('📋 Últimos informes policiales')
    .setTimestamp();

  for (const inf of informesArr.slice(0, 8)) {
    embed.addFields({
      name: `#${inf.numeroInforme || 'N/A'} — ${inf.titulo || 'Sin título'}`,
      value: `👮 ${inf.agentePrincipal || 'N/A'} · 📍 ${inf.lugar || 'N/A'} · 📁 ${inf.estado || 'N/A'}\n📅 ${new Date(inf.fecha).toLocaleDateString('es-ES')}`,
      inline: false,
    });
  }
  if (informesArr.length > 8) embed.setFooter({ text: `Mostrando 8 de ${informesArr.length} informes. Consulta el dashboard para ver todos.` });

  return interaction.editReply({ embeds: [embed] });
}

async function crearInforme(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const titulo      = interaction.options.getString('titulo');
  const descripcion = interaction.options.getString('descripcion');
  const lugar       = interaction.options.getString('lugar') || 'Sin especificar';
  const civilesStr  = interaction.options.getString('civiles') || '';
  const civiles     = civilesStr ? civilesStr.split(',').map(c => c.trim()).filter(Boolean) : [];

  const agente = await getPlayer(interaction.user.id, interaction.user.username);
  const nombreAgente = agente.personajeCreado ? agente.getFullName() : interaction.user.tag;

  const informe = await pdaApi.crearInforme({
    titulo, descripcion, lugar,
    civilesImplicados: civiles,
    agentePrincipal: nombreAgente, agentesImplicados: [nombreAgente],
    estado: 'abierto', creadoPor: interaction.user.id,
  }).catch(() => null);

  if (!informe) return interaction.editReply({ embeds: [E.err('Error', 'No se pudo crear el informe.')] });

  const gc = await GuildConfig.findOne({ guildId: interaction.guildId }).catch(() => null);
  const logCh = gc?.canales?.modLogs ? interaction.guild.channels.cache.get(gc.canales.modLogs) : null;
  if (logCh) {
    logCh.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.info).setTitle('📋 Nuevo informe policial creado')
        .addFields(
          { name: '📋 Nº', value: informe.numeroInforme || 'N/A', inline: true },
          { name: '📌 Título', value: titulo, inline: true }, { name: '👮 Agente', value: nombreAgente, inline: true },
          { name: '📍 Lugar', value: lugar, inline: true }, { name: '👥 Civiles', value: civiles.join(', ') || 'Ninguno', inline: false },
          { name: '📄 Descripción', value: descripcion.slice(0, 200), inline: false },
        ).setTimestamp()],
    }).catch(() => {});
  }

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.success).setTitle('📋 Informe creado')
      .setDescription(`El informe **${informe.numeroInforme}** ha sido registrado en el dashboard.`)
      .addFields(
        { name: '📌 Título', value: titulo, inline: true }, { name: '📍 Lugar', value: lugar, inline: true },
        { name: '👮 Agente', value: nombreAgente, inline: true },
        civiles.length ? { name: '👥 Civiles', value: civiles.join(', '), inline: false } : { name: '​', value: '​', inline: true },
      )
      .setFooter({ text: `ID Informe: ${informe.numeroInforme} · Visible en el dashboard` }).setTimestamp()],
  });
}

async function denuncias(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const denunciasArr = await pdaApi.getDenuncias().catch(() => []);
  if (!denunciasArr.length) return interaction.editReply({ embeds: [E.info('Sin denuncias', 'No hay denuncias registradas.')] });

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning).setTitle('📋 Últimas denuncias').setTimestamp();

  for (const d of denunciasArr.slice(0, 8)) {
    embed.addFields({
      name: `#${d.numeroDenuncia || 'N/A'} — ${d.motivo?.slice(0, 50) || 'Sin motivo'}`,
      value: `👤 Denunciante: ${d.denunciante || 'N/A'} | 🔍 Denunciado: ${d.denunciado || 'N/A'}\n📁 Estado: ${d.estado || 'N/A'} · 📅 ${new Date(d.fecha).toLocaleDateString('es-ES')}`,
      inline: false,
    });
  }

  return interaction.editReply({ embeds: [embed] });
}

async function crearDenuncia(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const denunciado  = interaction.options.getString('denunciado');
  const motivo      = interaction.options.getString('motivo');
  const descripcion = interaction.options.getString('descripcion');

  const player = await getPlayer(interaction.user.id, interaction.user.username);
  const nombreDenunciante = player.personajeCreado ? player.getFullName() : interaction.user.tag;

  const denuncia = await pdaApi.crearDenuncia({
    denunciante: nombreDenunciante, denunciado, motivo, descripcion, estado: 'pendiente',
  }).catch(() => null);

  if (!denuncia) return interaction.editReply({ embeds: [E.err('Error', 'No se pudo registrar la denuncia.')] });

  const gc = await GuildConfig.findOne({ guildId: interaction.guildId }).catch(() => null);
  const poliCh = gc?.canales?.policia ? interaction.guild.channels.cache.get(gc.canales.policia) : null;
  if (poliCh) {
    poliCh.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.warning).setTitle(`⚠️ Nueva denuncia — ${denuncia.numeroDenuncia}`)
        .addFields(
          { name: '👤 Denunciante', value: nombreDenunciante, inline: true },
          { name: '🔍 Denunciado', value: denunciado, inline: true },
          { name: '📋 Motivo', value: motivo, inline: false },
          { name: '📄 Descripción', value: descripcion.slice(0, 300), inline: false },
        ).setFooter({ text: 'Tramita esta denuncia en el dashboard PDA' }).setTimestamp()],
    }).catch(() => {});
  }

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.success).setTitle('✅ Denuncia registrada')
      .setDescription(`Tu denuncia **${denuncia.numeroDenuncia}** ha sido registrada y será revisada por el personal policial.`)
      .addFields({ name: '🔍 Denunciado', value: denunciado, inline: true }, { name: '📋 Motivo', value: motivo, inline: true })
      .setFooter({ text: 'El personal policial revisará tu denuncia en el dashboard' }).setTimestamp()],
  });
}

module.exports = { informes, crearInforme, denuncias, crearDenuncia };
