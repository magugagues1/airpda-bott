const { EmbedBuilder } = require('discord.js');
const pdaApi = require('../../utils/pdaApi');
const { getPlayer, requireBadge } = require('../../utils/helpers');
const E = require('../../utils/embeds');
const config = require('../../config');
const GuildConfig = require('../../database/models/GuildConfig');

const BADGE_ROLES = [config.roles.policia, config.roles.sheriff];
const ERR_NOAUTH = 'Solo el personal policial o admins puede usar este comando PDA.';
const DEFCON_LABELS = { 5: '🟢 Normalidad', 4: '🟡 Alerta Baja', 3: '🟠 Alerta Media', 2: '🔴 Alerta Alta', 1: '🆘 Emergencia Máxima' };
const DEFCON_COLORS = { 5: config.colors.success, 4: 0x84cc16, 3: config.colors.warning, 2: 0xf97316, 1: config.colors.danger };

async function operativos(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });

  const ops = await pdaApi.getOperativos().catch(() => []);
  if (!ops.length) return interaction.editReply({ embeds: [E.info('Sin operativos', 'No hay operativos activos ni en planificación.')] });

  const embed = new EmbedBuilder().setColor(config.colors.primary).setTitle('🎯 Operativos activos').setTimestamp();
  for (const op of ops.slice(0, 6)) {
    embed.addFields({
      name: `${op.estado === 'activo' ? '🟢' : '🟡'} ${op.nombre || 'Sin nombre'}`,
      value: `📍 Zona: ${op.zona || 'N/A'} · 🎯 Prioridad: **${op.prioridad || 'media'}**\n📁 Estado: ${op.estado}\n👮 Agentes: ${(op.agentesAsignados || []).length}\n📅 ${new Date(op.fecha).toLocaleDateString('es-ES')}`,
      inline: false,
    });
  }
  return interaction.editReply({ embeds: [embed] });
}

async function investigaciones(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });

  const investigs = await pdaApi.getInvestigaciones().catch(() => []);
  if (!investigs.length) return interaction.editReply({ embeds: [E.info('Sin investigaciones', 'No hay investigaciones abiertas.')] });

  const embed = new EmbedBuilder().setColor(config.colors.purple).setTitle('🔍 Investigaciones abiertas').setTimestamp();
  const clasifEmoji = { 'alto secreto': '🔴', 'secreto': '🟠', 'confidencial': '🟡' };
  for (const inv of investigs.slice(0, 6)) {
    embed.addFields({
      name: `${clasifEmoji[inv.clasificacion] || '⚪'} ${inv.titulo || 'Sin título'}`,
      value: `🔒 ${inv.clasificacion || 'N/A'} · 📁 ${inv.estado || 'N/A'}\n👤 Sospechosos: ${(inv.sospechosos || []).join(', ') || 'Ninguno'}\n📅 ${new Date(inv.fecha).toLocaleDateString('es-ES')}`,
      inline: false,
    });
  }
  return interaction.editReply({ embeds: [embed] });
}

async function ck(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const motivo   = interaction.options.getString('motivo');
  const historia = interaction.options.getString('historia');
  const player = await getPlayer(interaction.user.id, interaction.user.username);

  if (!player.personajeCreado) return interaction.editReply({ embeds: [E.warn('Sin personaje', 'Necesitas tener un personaje para solicitar un CK.')] });

  const existentes = await pdaApi.getCKByDiscord(interaction.user.id).catch(() => []);
  if (existentes.some(c => c.estado === 'pendiente')) return interaction.editReply({ embeds: [E.warn('CK pendiente', 'Ya tienes una solicitud de CK pendiente de revisión.')] });

  const ckResult = await pdaApi.crearCK({ solicitanteId: interaction.user.id, solicitanteNombre: player.getFullName(), motivo, historia, estado: 'pendiente' }).catch(() => null);
  if (!ckResult) return interaction.editReply({ embeds: [E.err('Error', 'No se pudo registrar la solicitud de CK.')] });

  const gc = await GuildConfig.findOne({ guildId: interaction.guildId }).catch(() => null);
  const adminCh = gc?.canales?.admin ? interaction.guild.channels.cache.get(gc.canales.admin) : null;
  if (adminCh) {
    adminCh.send({
      embeds: [new EmbedBuilder()
        .setColor(0x000000).setTitle('💀 Nueva solicitud de CK')
        .addFields(
          { name: '👤 Personaje', value: player.getFullName(), inline: true }, { name: '🆔 Discord', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📋 Motivo', value: motivo, inline: false }, { name: '📖 Historia', value: historia.slice(0, 500), inline: false },
        ).setFooter({ text: 'Revisa y aprueba/rechaza en el dashboard PDA' }).setTimestamp()],
    }).catch(() => {});
  }

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(0x000000).setTitle('💀 Solicitud de CK enviada')
      .setDescription(`Tu solicitud de **Character Kill** para **${player.getFullName()}** ha sido enviada a los administradores.`)
      .addFields({ name: '📋 Motivo', value: motivo, inline: false }, { name: '📁 Estado', value: 'Pendiente de revisión', inline: true })
      .setFooter({ text: 'Los admins revisarán tu solicitud en el dashboard' }).setTimestamp()],
  });
}

async function sync(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const pdaUser = await pdaApi.buscarPorDiscord(interaction.user.id).catch(() => null);
  if (!pdaUser) return interaction.editReply({ embeds: [E.warn('Sin cuenta PDA', `No tienes cuenta en la PDA.\nRegístrate en: **${config.pdaFrontend || 'la web'}**`)] });

  try {
    const Player = require('../../database/models/Player');
    const bp = await Player.findOne({ discordId: interaction.user.id });
    if (bp) {
      if (pdaUser.nombre) bp.nombre = pdaUser.nombre;
      if (pdaUser.apellido) bp.apellido = pdaUser.apellido;
      if (pdaUser.nombre && pdaUser.apellido) bp.personajeCreado = true;
      bp.buscado = !!pdaUser.esBuscado;
      bp.peligroso = !!pdaUser.esPeligroso;
      const depToJob = { LSPD: 'policía', LSCSD: 'sheriff', LSCFD: 'bombero' };
      if (pdaUser.departamento && depToJob[pdaUser.departamento]) bp.trabajo = depToJob[pdaUser.departamento];
      await bp.save();
    }
  } catch {}

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.success).setTitle('🔗 Perfil sincronizado con la PDA')
      .addFields(
        { name: '👤 Nombre', value: `${pdaUser.nombre || '?'} ${pdaUser.apellido || '?'}`, inline: true },
        { name: '🪪 ID', value: pdaUser.idNumero || 'Sin ID generado', inline: true },
        { name: '🏅 Rango', value: pdaUser.rango || 'Ciudadano', inline: true },
        { name: '🏢 Departamento', value: pdaUser.departamento || 'N/A', inline: true },
        { name: '👮 Policía', value: pdaUser.isPolice ? '✅' : '❌', inline: true },
        { name: '🔥 Bombero', value: pdaUser.isFirefighter ? '✅' : '❌', inline: true },
        { name: '🚨 Buscado', value: pdaUser.esBuscado ? '**SÍ**' : 'No', inline: true },
        { name: '⚠️ Peligroso', value: pdaUser.esPeligroso ? '**SÍ**' : 'No', inline: true },
      ).setFooter({ text: 'Usa /pda mis-multas para ver tus sanciones activas' }).setTimestamp()],
  });
}

async function stats(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });

  const statsData = await pdaApi.getStats().catch(() => null);
  if (!statsData) return interaction.editReply({ embeds: [E.err('Error', 'No se pudieron obtener estadísticas.')] });

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.primary).setTitle('📊 Estadísticas PDA — Sanciones activas')
      .addFields(
        { name: '📋 Total', value: `${statsData.total}`, inline: true },
        { name: '💸 Multas', value: `${statsData.multas}`, inline: true },
        { name: '🚔 Arrestos', value: `${statsData.arrestos}`, inline: true },
      ).setTimestamp()],
  });
}

async function rango(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });

  const id = interaction.options.getString('id');
  const rangoVal = interaction.options.getString('rango');
  const departamento = interaction.options.getString('departamento');
  const agente = await getPlayer(interaction.user.id, interaction.user.username);
  const nombreAgente = agente.personajeCreado ? agente.getFullName() : interaction.user.tag;

  const resultado = await pdaApi.asignarRango(id, rangoVal, departamento, nombreAgente).catch(() => null);
  if (!resultado) return interaction.editReply({ embeds: [E.err('Error', 'No se pudo asignar el rango. Verifica el ID MongoDB (usa `/pda buscar`).')] });

  const gc = await GuildConfig.findOne({ guildId: interaction.guildId }).catch(() => null);
  const logCh = gc?.canales?.modLogs ? interaction.guild.channels.cache.get(gc.canales.modLogs) : null;
  if (logCh) {
    logCh.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success).setTitle('🏅 Rango asignado en PDA')
        .addFields(
          { name: '👤 Agente', value: `${resultado.nombre} ${resultado.apellido}`, inline: true },
          { name: '🏛️ Departamento', value: departamento, inline: true }, { name: '🏅 Nuevo rango', value: rangoVal, inline: true },
          { name: '✍️ Asignado por', value: nombreAgente, inline: true },
        ).setTimestamp()],
    }).catch(() => {});
  }

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.success).setTitle('🏅 Rango asignado')
      .setDescription(`**${resultado.nombre} ${resultado.apellido}** ahora tiene rango **${rangoVal}** en **${departamento}** (visible en el dashboard).`)
      .setTimestamp()],
  });
}

async function defcon(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });

  const nivel = interaction.options.getInteger('nivel');

  if (!nivel) {
    const actual = await pdaApi.getDefcon().catch(() => 5);
    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(DEFCON_COLORS[actual] || config.colors.success)
        .setTitle('🚨 Nivel DEFCON actual')
        .setDescription(`**DEFCON ${actual} — ${DEFCON_LABELS[actual] || 'N/A'}**`)
        .setFooter({ text: 'Usa /pda defcon nivel:[1-5] para cambiar · Solo alto rango' }).setTimestamp()],
    });
  }

  const agente = await getPlayer(interaction.user.id, interaction.user.username);
  const nombreAgente = agente.personajeCreado ? agente.getFullName() : interaction.user.tag;
  await pdaApi.setDefcon(nivel).catch(() => null);

  const gc = await GuildConfig.findOne({ guildId: interaction.guildId }).catch(() => null);
  const poliCh = gc?.canales?.policia ? interaction.guild.channels.cache.get(gc.canales.policia) : null;
  if (poliCh) {
    poliCh.send({
      content: nivel <= 2 ? '@everyone' : null,
      embeds: [new EmbedBuilder()
        .setColor(DEFCON_COLORS[nivel]).setTitle(`🚨 DEFCON ${nivel} — ${DEFCON_LABELS[nivel]}`)
        .setDescription(nivel <= 2 ? '⚠️ **ALERTA DE MÁXIMA SEGURIDAD** — Todo el personal a sus posiciones.' : `Nivel de alerta actualizado por ${nombreAgente}.`)
        .addFields({ name: '📊 Nivel', value: `DEFCON ${nivel}`, inline: true }, { name: '📋 Estado', value: DEFCON_LABELS[nivel], inline: true }, { name: '✍️ Activado por', value: nombreAgente, inline: true })
        .setTimestamp()],
    }).catch(() => {});
  }

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(DEFCON_COLORS[nivel]).setTitle(`✅ DEFCON actualizado a ${nivel}`)
      .setDescription(`**${DEFCON_LABELS[nivel]}** — Todos los usuarios de la PDA han sido notificados.`).setTimestamp()],
  });
}

async function ckAdmin(interaction, client) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });

  const accion = interaction.options.getString('accion');
  const ckId   = interaction.options.getString('ck-id');
  const codigo = interaction.options.getString('codigo');
  const notas  = interaction.options.getString('notas') || '';
  const CK_ADMIN_CODE = process.env.CK_ADMIN_CODE || 'AIRP-CK-2025';

  if (accion === 'ver') {
    const pendientes = await pdaApi.getCKPendientes().catch(() => []);
    if (!pendientes.length) return interaction.editReply({ embeds: [E.ok('Sin CKs pendientes', 'No hay solicitudes de Character Kill pendientes.')] });

    const embed = new EmbedBuilder().setColor(0x000000).setTitle(`💀 CKs pendientes — ${pendientes.length}`).setTimestamp();
    for (const ck of pendientes.slice(0, 5)) {
      embed.addFields({ name: `💀 ${ck.solicitanteNombre || 'N/A'}`, value: `📋 **Motivo:** ${ck.motivo?.slice(0, 100) || 'N/A'}\n📅 ${new Date(ck.fecha).toLocaleDateString('es-ES')}\n🆔 ID: \`${ck._id}\``, inline: false });
    }
    embed.setFooter({ text: 'Usa /pda ck-admin accion:aprobar/rechazar ck-id:[ID] codigo:[CÓDIGO]' });
    return interaction.editReply({ embeds: [embed] });
  }

  if (!ckId) return interaction.editReply({ embeds: [E.err('Falta ID', 'Indica el ID del CK con el parámetro `ck-id`.')] });
  if (!codigo || codigo !== CK_ADMIN_CODE) return interaction.editReply({ embeds: [E.err('Código incorrecto', 'El código admin es inválido. Consulta al administrador.')] });

  const agente = await getPlayer(interaction.user.id, interaction.user.username);
  const nombreAgente = agente.personajeCreado ? agente.getFullName() : interaction.user.tag;

  if (accion === 'aprobar') {
    const ck = await pdaApi.aprobarCK(ckId, nombreAgente, notas).catch(() => null);
    if (!ck) return interaction.editReply({ embeds: [E.err('Error', 'No se encontró ese CK o no se pudo actualizar.')] });

    if (ck.solicitanteId) {
      const Player = require('../../database/models/Player');
      const bp = await Player.findOne({ discordId: ck.solicitanteId }).catch(() => null);
      if (bp) {
        bp.personajeCreado = false; bp.nombre = null; bp.apellido = null; bp.edad = null; bp.genero = null; bp.bio = null; bp.origen = null;
        bp.cash = 0; bp.bank = 0; bp.bankAhorros = 0; bp.dineroSucio = 0;
        bp.nivel = 1; bp.xp = 0; bp.xpSiguienteNivel = 100; bp.trabajo = 'desempleado';
        bp.salud = 100; bp.hambre = 100; bp.sed = 100; bp.energia = 100;
        bp.arrestos = 0; bp.multasRecibidas = 0; bp.robosRealizados = 0;
        bp.muertesRP = 0; bp.killsRP = 0; bp.drogasVendidas = 0; bp.trabajosRealizados = 0;
        bp.vehicles = []; bp.vehiculos = [];
        bp.gangId = null; bp.gangRango = null;
        bp.esposado = false; bp.esposadoPor = null;
        bp.buscado = false; bp.peligroso = false;
        bp.enCarcel = false; bp.enHospital = false; bp.muerto = false;
        bp.pinBanco = null; bp.pinBancoAhorros = null;
        bp.proteccion = false; bp.efectoDroga = null; bp.adminOn = false;
        bp.cooldowns = new Map();
        await bp.save().catch(() => {});
      }
      try {
        const u = await client.users.fetch(ck.solicitanteId);
        await u.send(`💀 **Tu solicitud de Character Kill ha sido APROBADA.**\n\nTu personaje **${ck.solicitanteNombre}** ha llegado al final de su historia.\n${notas ? `📝 Nota del staff: *${notas}*\n` : ''}\nYa puedes crear un nuevo personaje con \`/personaje crear\`.`);
      } catch {}
    }
    return interaction.editReply({ embeds: [E.ok('CK Aprobado', `El CK de **${ck.solicitanteNombre}** ha sido aprobado. El personaje ha sido reseteado.`)] });
  }

  if (accion === 'rechazar') {
    const ck = await pdaApi.rechazarCK(ckId, nombreAgente, notas).catch(() => null);
    if (!ck) return interaction.editReply({ embeds: [E.err('Error', 'No se encontró ese CK o no se pudo actualizar.')] });
    if (ck.solicitanteId) {
      try { const u = await client.users.fetch(ck.solicitanteId); await u.send(`❌ **Tu solicitud de Character Kill ha sido RECHAZADA.**\n\n${notas ? `📝 Motivo del staff: *${notas}*\n` : ''}\nPuedes volver a solicitarlo más adelante si crees que se cumplen las condiciones.`); } catch {}
    }
    return interaction.editReply({ embeds: [E.ok('CK Rechazado', `La solicitud de CK de **${ck.solicitanteNombre}** ha sido rechazada.`)] });
  }
}

module.exports = { operativos, investigaciones, ck, sync, stats, rango, defcon, ckAdmin };
