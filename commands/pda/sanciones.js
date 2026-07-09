const { EmbedBuilder } = require('discord.js');
const pdaApi = require('../../utils/pdaApi');
const { getPlayer, formatMoney, requireBadge } = require('../../utils/helpers');
const E = require('../../utils/embeds');
const config = require('../../config');
const GuildConfig = require('../../database/models/GuildConfig');
const { formatSancion } = require('./helpers');

const BADGE_ROLES = [config.roles.policia, config.roles.sheriff];
const ERR_NOAUTH = 'Solo el personal policial o admins puede usar este comando PDA.';

async function multar(interaction, client) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply();

  const tipo         = interaction.options.getString('tipo');
  const motivo       = interaction.options.getString('motivo');
  const cantidad     = interaction.options.getInteger('cantidad') || 0;
  const tiempoCarcel = interaction.options.getInteger('carcel') || 0;
  const duracion     = interaction.options.getString('duracion') || null;
  const targetUser   = interaction.options.getUser('usuario');
  const idBuscar     = interaction.options.getString('id');

  if (!targetUser && !idBuscar) {
    return interaction.editReply({ embeds: [E.err('Parámetro requerido', 'Indica el **@usuario** de Discord o el **ID/DNI** del ciudadano.')] });
  }

  const agente = await getPlayer(interaction.user.id, interaction.user.username);
  const nombreAgente = agente.personajeCreado ? agente.getFullName() : interaction.user.tag;

  let ciudadano = null;
  if (targetUser)  ciudadano = await pdaApi.buscarPorDiscord(targetUser.id).catch(() => null);
  if (!ciudadano && idBuscar) {
    ciudadano = await pdaApi.buscarPorId(idBuscar).catch(() => null);
    if (!ciudadano) ciudadano = (await pdaApi.buscarUsuario(idBuscar).catch(() => []))?.[0] || null;
  }

  const discordIdCiudadano = targetUser?.id || ciudadano?.discordId || null;

  if (!ciudadano) {
    return interaction.editReply({
      embeds: [E.err('Ciudadano no encontrado',
        targetUser
          ? `**${targetUser.tag}** no tiene cuenta en la PDA. Pide que se registre en la web.`
          : `No se encontró ciudadano con ID/nombre "${idBuscar}".`,
      )],
      ephemeral: true,
    });
  }

  const sancion = await pdaApi.crearSancion({
    ciudadanoId: ciudadano._id.toString(),
    ciudadanoDiscordId: discordIdCiudadano,
    ciudadanoNombre: `${ciudadano.nombre} ${ciudadano.apellido}`,
    ciudadanoPsnId: ciudadano.psnId || null,
    tipo, motivo, descripcion: motivo,
    agente: nombreAgente, agenteDiscordId: interaction.user.id,
    cantidad: cantidad || undefined, tiempoCarcel: tiempoCarcel || undefined,
    duracion: duracion || undefined, activa: true,
  }).catch(() => null);

  if (!sancion) return interaction.editReply({ embeds: [E.err('Error de base de datos', 'No se pudo registrar la sanción.')] });

  // Crear Multa local pagable si es tipo multa
  if (tipo === 'multa' && cantidad > 0) {
    try {
      const Multa = require('../../database/models/Multa');
      const localMulta = await Multa.create({
        ciudadanoId: discordIdCiudadano,
        ciudadanoNombre: `${ciudadano.nombre} ${ciudadano.apellido}`,
        agente: interaction.user.id,
        agenteNombre: nombreAgente,
        motivo, cantidad, tiempoCarcel,
        guildId: interaction.guildId,
      });
      const { Sancion } = require('../../database/models/PdaModels');
      await Sancion.findByIdAndUpdate(sancion._id, { botMultaId: localMulta.multaId });
    } catch {}
  }

  // Notificar webhooks de la PDA
  try {
    const { notificarSancion } = require('../../utils/pdaWebhook');
    notificarSancion({
      tipo,
      ciudadanoNombre: `${ciudadano.nombre} ${ciudadano.apellido}`,
      ciudadanoPsnId:  ciudadano.psnId || null,
      agente:          nombreAgente,
      cantidad:        cantidad || undefined,
      tiempoCarcel:    tiempoCarcel || undefined,
      motivo,
    });
  } catch {}

  if (discordIdCiudadano) {
    const bp = await getPlayer(discordIdCiudadano, ciudadano.discordUsername || '').catch(() => null);
    if (bp?.personajeCreado) {
      if (tipo === 'multa') bp.multasRecibidas++;
      if (tipo === 'arresto') {
        bp.arrestos++;
        if (tiempoCarcel > 0) { bp.enCarcel = true; bp.tiempoCarcel = new Date(Date.now() + tiempoCarcel * 60 * 1000); }
      }
      await bp.save().catch(() => {});
    }
    const tipoEmoji = { multa: '📋', arresto: '🚔', aviso: '⚠️', ban_temporal: '⛔' };
    const tipoLabel = { multa: 'Multa', arresto: 'Arresto', aviso: 'Aviso', ban_temporal: 'Ban temporal' };
    try {
      const u = await client.users.fetch(discordIdCiudadano);
      let dmMsg = `${tipoEmoji[tipo] || '📋'} **${tipoLabel[tipo] || tipo}** registrado por **${nombreAgente}**\n📋 Motivo: ${motivo}`;
      if (tipo === 'multa' && cantidad) dmMsg += `\n💰 Importe: $${cantidad.toLocaleString('es-ES')}`;
      if (tipo === 'arresto' && tiempoCarcel) dmMsg += `\n⛓️ Tiempo: ${tiempoCarcel} min`;
      if (tipo === 'ban_temporal' && duracion) dmMsg += `\n⏱️ Duración: ${duracion}`;
      dmMsg += `\n\nUsa \`/pda mis-multas\` para ver tus sanciones.`;
      await u.send(dmMsg);
    } catch {}
  }

  const gc = await GuildConfig.findOne({ guildId: interaction.guildId }).catch(() => null);
  const logCh = gc?.canales?.modLogs ? interaction.guild.channels.cache.get(gc.canales.modLogs) : null;
  const coloresTipo = { multa: config.colors.warning, arresto: config.colors.danger, aviso: config.colors.info, ban_temporal: 0x7c3aed };
  if (logCh) {
    const logFields = [
      { name: 'Ciudadano', value: `${ciudadano.nombre} ${ciudadano.apellido}`, inline: true },
      { name: 'Agente',    value: `${interaction.user}`,                        inline: true },
      { name: 'Tipo',      value: tipo,                                         inline: true },
      { name: 'Motivo',    value: motivo,                                       inline: false },
    ];
    if (cantidad)     logFields.push({ name: 'Importe',  value: formatMoney(cantidad),    inline: true });
    if (tiempoCarcel) logFields.push({ name: 'Cárcel',   value: `${tiempoCarcel} min`,   inline: true });
    if (duracion)     logFields.push({ name: 'Duración', value: duracion,                 inline: true });
    logCh.send({
      embeds: [new EmbedBuilder()
        .setColor(coloresTipo[tipo] || config.colors.warning)
        .setTitle(`Sanción registrada en PDA — ${tipo.toUpperCase()}`)
        .addFields(...logFields)
        .setFooter({ text: `Sanción ID: ${sancion._id}` }).setTimestamp()],
    }).catch(() => {});
  }

  const resFields = [
    { name: '🎯 Ciudadano', value: `${ciudadano.nombre} ${ciudadano.apellido}`, inline: true },
    { name: '📁 Tipo',      value: tipo.replace('_', ' ').toUpperCase(),        inline: true },
    { name: '📋 Motivo',    value: motivo,                                      inline: false },
  ];
  if (cantidad)     resFields.push({ name: '💰 Importe',  value: formatMoney(cantidad), inline: true });
  if (tiempoCarcel) resFields.push({ name: '⛓️ Cárcel',  value: `${tiempoCarcel} min`, inline: true });
  if (duracion)     resFields.push({ name: '⏱️ Duración', value: duracion,              inline: true });

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(coloresTipo[tipo] || config.colors.warning)
      .setTitle(`Sanción emitida`)
      .setDescription(`Registrada en la PDA para **${ciudadano.nombre} ${ciudadano.apellido}**`)
      .addFields(...resFields)
      .setFooter({ text: `ID: ${sancion._id} · Visible en el dashboard` }).setTimestamp()],
  });
}

async function sanciones(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const targetUser   = interaction.options.getUser('usuario');
  const nombreBuscar = interaction.options.getString('nombre');
  if (!targetUser && !nombreBuscar) {
    return interaction.editReply({ embeds: [E.err('Parámetro requerido', 'Usa `/pda sanciones usuario:@alguien` o `/pda sanciones nombre:Juan García`.')] });
  }

  const sancionesArr = targetUser
    ? await pdaApi.getSancionesByDiscordId(targetUser.id).catch(() => [])
    : await pdaApi.getSanciones(nombreBuscar).catch(() => []);
  const titulo = targetUser ? `Sanciones de ${targetUser.tag}` : `Sanciones de ${nombreBuscar}`;

  if (!sancionesArr.length) return interaction.editReply({ embeds: [E.ok('Sin sanciones', '✅ No se encontraron sanciones activas.')] });

  const total = sancionesArr.reduce((a, s) => a + (s.cantidad || 0), 0);
  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle(`📋 ${titulo}`)
    .setFooter({ text: `${sancionesArr.length} sanciones · Deuda acumulada: $${total.toLocaleString('es-ES')}` })
    .setTimestamp();

  for (const s of sancionesArr.slice(0, 8)) embed.addFields(formatSancion(s));
  if (sancionesArr.length > 8) embed.addFields({ name: '...', value: `Y ${sancionesArr.length - 8} más.`, inline: false });

  return interaction.editReply({ embeds: [embed] });
}

async function misMultas(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const pdaUser = await pdaApi.buscarPorDiscord(interaction.user.id).catch(() => null);
  if (!pdaUser) {
    return interaction.editReply({ embeds: [E.warn('Sin cuenta PDA', `No tienes cuenta en la PDA.\nRegístrate en ${config.pdaFrontend || 'la web'} y usa \`/pda sync\`.`)] });
  }

  const sancionesArr = await pdaApi.getSancionesByDiscordId(interaction.user.id).catch(() => []);
  if (!sancionesArr.length) {
    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Sin multas pendientes')
        .setDescription(`**${pdaUser.nombre} ${pdaUser.apellido}**, no tienes sanciones activas.`)
        .setTimestamp()],
    });
  }

  const total  = sancionesArr.reduce((a, s) => a + (s.cantidad || 0), 0);
  const multas = sancionesArr.filter(s => s.tipo === 'multa').length;
  const arrestos = sancionesArr.filter(s => s.tipo === 'arresto').length;

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle(`📋 Tus sanciones — ${pdaUser.nombre} ${pdaUser.apellido}`)
    .addFields(
      { name: '📋 Multas',      value: `${multas}`,                              inline: true },
      { name: '🚔 Arrestos',    value: `${arrestos}`,                            inline: true },
      { name: '💰 Total deuda', value: `$${total.toLocaleString('es-ES')}`,      inline: true },
    )
    .setTimestamp();

  for (const s of sancionesArr.slice(0, 8)) embed.addFields(formatSancion(s));
  if (sancionesArr.length > 8) embed.addFields({ name: '...', value: `Y ${sancionesArr.length - 8} más.`, inline: false });
  embed.setFooter({ text: 'Las sanciones las emite el personal policial · Consulta el dashboard para más detalles' });

  return interaction.editReply({ embeds: [embed] });
}

module.exports = { multar, sanciones, misMultas };
