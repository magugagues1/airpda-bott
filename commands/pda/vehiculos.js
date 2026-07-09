const { EmbedBuilder } = require('discord.js');
const pdaApi = require('../../utils/pdaApi');
const { getPlayer, requireBadge } = require('../../utils/helpers');
const E = require('../../utils/embeds');
const config = require('../../config');
const GuildConfig = require('../../database/models/GuildConfig');

const BADGE_ROLES = [config.roles.policia, config.roles.sheriff];
const ERR_NOAUTH = 'Solo el personal policial o admins puede usar este comando PDA.';

async function vehiculo(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const query = interaction.options.getString('query');
  const results = await pdaApi.buscarVehiculo(query).catch(() => null);

  if (!results?.length) return interaction.editReply({ embeds: [E.warn('Sin resultados', `No se encontraron vehículos con "${query}" en el registro.`)] });

  const embed = new EmbedBuilder().setColor(config.colors.info).setTitle(`🚗 Registro de vehículos — "${query}"`).setTimestamp();

  for (const v of results.slice(0, 6)) {
    const estado = v.robado ? '🚨 **ROBADO**' : '✅ Normal';
    embed.addFields({
      name: `🚗 ${v.marca || ''} ${v.modelo || 'N/A'} — ${v.matricula || 'N/A'}`,
      value: `👤 Propietario: **${v.propietarioNombre || 'N/A'}**\n🎨 Color: ${v.color || 'N/A'} · 📅 Año: ${v.año || 'N/A'}\n📁 Estado: ${estado}\n🔧 Registrado por: ${v.registradoPor || 'N/A'}`,
      inline: false,
    });
  }
  if (results.length > 6) embed.setFooter({ text: `Mostrando 6 de ${results.length}. Afina la búsqueda.` });

  return interaction.editReply({ embeds: [embed] });
}

async function arma(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const query = interaction.options.getString('query');
  const results = await pdaApi.buscarArma(query).catch(() => null);

  if (!results?.length) return interaction.editReply({ embeds: [E.warn('Sin resultados', `No se encontraron armas/licencias con "${query}" en el registro.`)] });

  const embed = new EmbedBuilder().setColor(config.colors.warning).setTitle(`🔫 Registro de armas — "${query}"`).setTimestamp();

  for (const a of results.slice(0, 6)) {
    const licenciaStr = a.licencia ? `✅ Licencia: \`${a.numeroLicencia || 'N/A'}\` · Vence: ${a.fechaVencimiento || 'N/A'}` : '❌ Sin licencia';
    embed.addFields({
      name: `🔫 ${a.tipo || 'Arma'} — ${a.modelo || 'N/A'}`,
      value: `👤 Propietario: **${a.propietarioNombre || 'N/A'}**\n🔢 Nº Serie: \`${a.numeroSerie || 'N/A'}\`\n${licenciaStr}`,
      inline: false,
    });
  }

  return interaction.editReply({ embeds: [embed] });
}

async function casa(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const query = interaction.options.getString('query');
  const results = await pdaApi.buscarCasa(query).catch(() => null);

  if (!results?.length) return interaction.editReply({ embeds: [E.warn('Sin resultados', `No se encontraron propiedades con "${query}" en el registro.`)] });

  const embed = new EmbedBuilder().setColor(config.colors.info).setTitle(`🏠 Registro de propiedades — "${query}"`).setTimestamp();

  for (const c of results.slice(0, 6)) {
    embed.addFields({
      name: `🏠 ${c.tipo || 'Propiedad'} — ${c.direccion || 'N/A'}`,
      value: `👤 Propietario: **${c.propietarioNombre || 'N/A'}**\n📍 Zona: ${c.zona || 'N/A'}\n📝 ${c.anotaciones || 'Sin notas'}\n🔧 Registrado por: ${c.registradoPor || 'N/A'}`,
      inline: false,
    });
  }
  if (results.length > 6) embed.setFooter({ text: `Mostrando 6 de ${results.length}. Afina la búsqueda.` });

  return interaction.editReply({ embeds: [embed] });
}

async function registrarCasa(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const direccion         = interaction.options.getString('direccion');
  const propietarioNombre = interaction.options.getString('propietario-nombre');
  const tipo              = interaction.options.getString('tipo') || 'casa';
  const zona              = interaction.options.getString('zona') || 'Sin especificar';
  const anotaciones       = interaction.options.getString('anotaciones') || '';
  const propietarioDiscord = interaction.options.getUser('propietario-discord');

  const agente = await getPlayer(interaction.user.id, interaction.user.username);
  const nombreAgente = agente.personajeCreado ? agente.getFullName() : interaction.user.tag;

  const casaResult = await pdaApi.registrarCasa({
    direccion, propietarioId: propietarioDiscord?.id || null, propietarioNombre, tipo, zona, anotaciones, registradoPor: nombreAgente,
  }).catch(() => null);

  if (!casaResult) return interaction.editReply({ embeds: [E.err('Error', 'No se pudo registrar la propiedad.')] });

  const gc = await GuildConfig.findOne({ guildId: interaction.guildId }).catch(() => null);
  const logCh = gc?.canales?.modLogs ? interaction.guild.channels.cache.get(gc.canales.modLogs) : null;
  if (logCh) {
    logCh.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.info).setTitle('🏠 Propiedad registrada en PDA')
        .addFields(
          { name: '🏠 Dirección', value: direccion, inline: true }, { name: '👤 Propietario', value: propietarioNombre, inline: true },
          { name: '📍 Zona', value: zona, inline: true }, { name: '👮 Registrado', value: nombreAgente, inline: true },
        ).setTimestamp()],
    }).catch(() => {});
  }

  return interaction.editReply({ embeds: [E.ok('Propiedad registrada', `**${tipo.toUpperCase()}** — \`${direccion}\`\nPropietario: **${propietarioNombre}** · Zona: ${zona}`)] });
}

async function registrarArma(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const propietarioNombre = interaction.options.getString('propietario-nombre');
  const tipo              = interaction.options.getString('tipo');
  const modelo            = interaction.options.getString('modelo') || 'Sin especificar';
  const serie             = interaction.options.getString('serie') || `SN-${Date.now()}`;
  const licencia          = interaction.options.getBoolean('licencia') ?? false;
  const numLicencia       = interaction.options.getString('num-licencia') || null;
  const propietarioDiscord = interaction.options.getUser('propietario-discord');

  const agente = await getPlayer(interaction.user.id, interaction.user.username);
  const nombreAgente = agente.personajeCreado ? agente.getFullName() : interaction.user.tag;

  const armaResult = await pdaApi.registrarArma({
    propietarioId: propietarioDiscord?.id || null, propietarioNombre, tipo, modelo,
    numeroSerie: serie, licencia, numeroLicencia: numLicencia, registradoPor: nombreAgente,
  }).catch(() => null);

  if (!armaResult) return interaction.editReply({ embeds: [E.err('Error', 'No se pudo registrar el arma.')] });

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.warning).setTitle('🔫 Arma registrada en la PDA')
      .addFields(
        { name: '🔫 Tipo/Modelo', value: `${tipo} — ${modelo}`, inline: true }, { name: '👤 Propietario', value: propietarioNombre, inline: true },
        { name: '🔢 Nº Serie', value: `\`${serie}\``, inline: true },
        { name: '📜 Licencia', value: licencia ? `✅ \`${numLicencia || 'N/A'}\`` : '❌ Sin licencia', inline: true },
      ).setFooter({ text: `Registrado por ${nombreAgente} · Visible en dashboard` }).setTimestamp()],
  });
}

module.exports = { vehiculo, arma, casa, registrarCasa, registrarArma };
