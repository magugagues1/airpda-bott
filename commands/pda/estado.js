const { EmbedBuilder } = require('discord.js');
const pdaApi = require('../../utils/pdaApi');
const { getPlayer, requireBadge } = require('../../utils/helpers');
const E = require('../../utils/embeds');
const config = require('../../config');

const BADGE_ROLES = [config.roles.policia, config.roles.sheriff];
const ERR_NOAUTH = 'Solo el personal policial o admins puede usar este comando PDA.';

async function buscado(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });

  const id     = interaction.options.getString('id');
  const estado = interaction.options.getBoolean('estado');
  const result = await pdaApi.marcarBuscado(id, estado).catch(() => null);

  if (!result) return interaction.editReply({ embeds: [E.err('Error', 'No se pudo actualizar. Verifica el ID MongoDB (usa `/pda buscar` o `/pda id`).')] });

  if (result.discordId) {
    const bp = await getPlayer(result.discordId, '').catch(() => null);
    if (bp) { bp.buscado = estado; await bp.save().catch(() => {}); }
  }

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(estado ? config.colors.danger : config.colors.success)
      .setDescription(`🚨 **${result.nombre} ${result.apellido}** marcado como ${estado ? '**BUSCADO**' : '**LIBRE**'} en la PDA y el bot.`).setTimestamp()],
  });
}

async function peligroso(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });

  const id     = interaction.options.getString('id');
  const estado = interaction.options.getBoolean('estado');
  const result = await pdaApi.marcarPeligroso(id, estado).catch(() => null);

  if (!result) return interaction.editReply({ embeds: [E.err('Error', 'No se pudo actualizar. Verifica el ID MongoDB (usa `/pda buscar` o `/pda id`).')] });

  if (result.discordId) {
    const bp = await getPlayer(result.discordId, '').catch(() => null);
    if (bp) { bp.peligroso = estado; await bp.save().catch(() => {}); }
  }

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(estado ? config.colors.warning : config.colors.success)
      .setDescription(`⚠️ **${result.nombre} ${result.apellido}** marcado como ${estado ? '**PELIGROSO**' : '**SIN RIESGO**'} en la PDA y el bot.`).setTimestamp()],
  });
}

async function nota(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  await interaction.deferReply({ ephemeral: true });

  const id    = interaction.options.getString('id');
  const texto = interaction.options.getString('texto');
  const agente = await getPlayer(interaction.user.id, interaction.user.username);
  const nombreAgente = agente.personajeCreado ? agente.getFullName() : interaction.user.tag;

  const ciudadano = await pdaApi.agregarNota(id, texto, nombreAgente).catch(() => null);
  if (!ciudadano) return interaction.editReply({ embeds: [E.err('No encontrado', 'No se encontró el ciudadano con ese ID MongoDB.')] });

  return interaction.editReply({ embeds: [E.ok('Nota añadida', `Nota policial añadida a **${ciudadano.nombre} ${ciudadano.apellido}**:\n*${texto}*`)] });
}

module.exports = { buscado, peligroso, nota };
