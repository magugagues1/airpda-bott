const { EmbedBuilder } = require('discord.js');
const pdaApi = require('../../utils/pdaApi');
const { requireBadge } = require('../../utils/helpers');
const E = require('../../utils/embeds');
const config = require('../../config');

const BADGE_ROLES = [config.roles.policia, config.roles.sheriff];
const ERR_NOAUTH = 'Solo el personal policial o admins puede usar este comando PDA.';

async function buscar(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const query   = interaction.options.getString('query');
  const results = await pdaApi.buscarUsuario(query).catch(() => null);

  if (!results?.length) {
    return interaction.editReply({ embeds: [E.warn('Sin resultados', `No se encontraron ciudadanos con "${query}".`)] });
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle(`🔍 Búsqueda: "${query}" — ${results.length} resultado(s)`)
    .setTimestamp();

  for (const u of results.slice(0, 5)) {
    const estado = u.esBuscado ? '🚨 **BUSCADO**' : u.esPeligroso ? '⚠️ **PELIGROSO**' : '✅ Normal';
    embed.addFields({
      name: `${u.nombre} ${u.apellido} — ID: ${u.idNumero || 'N/A'}`,
      value: `🪪 DNI: ${u.dniNumero || 'N/A'} | 🎂 DOB: ${u.fechaNacimiento || 'N/A'}\n📁 Estado: ${estado}\n🏅 Rango: ${u.rango || 'Ciudadano'}\n🆔 MongoDB: \`${u._id}\``,
      inline: false,
    });
  }
  if (results.length > 5) embed.setFooter({ text: `Mostrando 5 de ${results.length} resultados. Afina la búsqueda.` });

  return interaction.editReply({ embeds: [embed] });
}

async function id(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const numero     = interaction.options.getString('numero');
  const ciudadano  = await pdaApi.buscarPorId(numero).catch(() => null);
  if (!ciudadano) return interaction.editReply({ embeds: [E.warn('No encontrado', `No existe ciudadano con ID/DNI "${numero}".`)] });

  const sanciones  = await pdaApi.getSancionesByCiudadanoId(ciudadano._id.toString()).catch(() => []);
  const vehiculos  = await pdaApi.buscarVehiculo(ciudadano._id?.toString() || ciudadano.discordId || '').catch(() => []);

  const embed = new EmbedBuilder()
    .setColor(ciudadano.esBuscado ? config.colors.danger : ciudadano.esPeligroso ? config.colors.warning : config.colors.info)
    .setTitle(`🪪 Ficha — ${ciudadano.nombre} ${ciudadano.apellido}`)
    .setThumbnail(ciudadano.fotoPersonaje || null)
    .addFields(
      { name: '🪪 ID',               value: ciudadano.idNumero || 'N/A',          inline: true },
      { name: '📋 DNI',              value: ciudadano.dniNumero || 'N/A',         inline: true },
      { name: '🎂 Nacimiento',       value: ciudadano.fechaNacimiento || 'N/A',   inline: true },
      { name: '🚨 Buscado',          value: ciudadano.esBuscado ? '**SÍ** 🚨' : 'No',    inline: true },
      { name: '⚠️ Peligroso',        value: ciudadano.esPeligroso ? '**SÍ** ⚠️' : 'No',  inline: true },
      { name: '📄 Sanciones',        value: `${sanciones.length} activa(s)`,      inline: true },
      { name: '🚗 Vehículos reg.',   value: `${vehiculos.length}`,                inline: true },
      { name: '🏅 Rango',            value: ciudadano.rango || 'Ciudadano',       inline: true },
      { name: '🏢 Departamento',     value: ciudadano.departamento || 'N/A',      inline: true },
    )
    .setTimestamp();

  if (ciudadano.notasPolicia?.length) {
    const notas = ciudadano.notasPolicia.slice(-3).map(n => `• *${n.texto}* — ${n.autor}`).join('\n');
    embed.addFields({ name: '📝 Últimas notas policiales', value: notas, inline: false });
  }

  return interaction.editReply({ embeds: [embed] });
}

module.exports = { buscar, id };
