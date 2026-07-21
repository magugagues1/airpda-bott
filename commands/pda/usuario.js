const { EmbedBuilder } = require('discord.js');
const pdaApi = require('../../utils/pdaApi');
const { requireBadge } = require('../../utils/helpers');
const E = require('../../utils/embeds');
const config = require('../../config');

const BADGE_ROLES = [config.roles.policia, config.roles.sheriff];
const ERR_NOAUTH = 'Solo el personal policial o admins puede usar este comando PDA.';

async function editarUsuario(interaction) {
  if (!requireBadge(interaction.member, BADGE_ROLES)) {
    return interaction.reply({ embeds: [E.err('Sin autorización', ERR_NOAUTH)], ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const id = interaction.options.getString('id');
  const ciudadano = await pdaApi.buscarPorId(id).catch(() => null);
  if (!ciudadano) {
    return interaction.editReply({ embeds: [E.warn('No encontrado', `No existe ciudadano con ID/DNI "${id}".`)] });
  }

  const cambios = {};
  const nombre = interaction.options.getString('nombre');
  const apellido = interaction.options.getString('apellido');
  const dniNumero = interaction.options.getString('dni');
  const idNumero = interaction.options.getString('id-numero');
  const psnId = interaction.options.getString('psn');
  const fechaNacimiento = interaction.options.getString('fecha-nacimiento');
  const foto = interaction.options.getString('foto');

  if (nombre !== null) cambios.nombre = nombre;
  if (apellido !== null) cambios.apellido = apellido;
  if (dniNumero !== null) cambios.dniNumero = dniNumero;
  if (idNumero !== null) cambios.idNumero = idNumero;
  if (psnId !== null) cambios.psnId = psnId;
  if (fechaNacimiento !== null) cambios.fechaNacimiento = fechaNacimiento;
  if (foto !== null) cambios.fotoPersonaje = foto;

  if (!Object.keys(cambios).length) {
    return interaction.editReply({ embeds: [E.warn('Sin cambios', 'No especificaste ningún campo para editar.')] });
  }

  const actualizado = await pdaApi.actualizarUsuario(ciudadano._id.toString(), cambios).catch(e => {
    console.error('[PDA] Error actualizando usuario:', e.message);
    return null;
  });

  if (!actualizado) {
    return interaction.editReply({ embeds: [E.err('Error', 'No se pudo actualizar el ciudadano. Intenta de nuevo.')] });
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅ Ciudadano actualizado')
    .setDescription(`**${ciudadano.nombre} ${ciudadano.apellido}** — datos modificados`)
    .addFields(
      { name: '🆔 MongoDB', value: `\`${ciudadano._id}\``, inline: false },
      ...Object.entries(cambios).map(([k, v]) => ({
        name: `📝 ${k}`,
        value: `~~${ciudadano[k] ?? 'N/A'}~~ → **${v}**`,
        inline: true,
      })),
    )
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

module.exports = { editarUsuario };