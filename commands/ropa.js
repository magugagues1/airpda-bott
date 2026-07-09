/**
 * ROPA — Comandos de vestimenta / accesorios RP
 * Slash: /ropa [prenda] [accion]   ← UN solo comando slash
 * Prefix: !gorra !mascara !gafas !camiseta !pantalones !zapatos !guantes !cinturon
 *
 * Nota: antes eran 8 comandos slash separados → ahora 1, para no superar el límite de 100.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer } = require('../utils/helpers');
const E = require('../utils/embeds');
const config = require('../config');

// ─── Catálogo de prendas ──────────────────────────────────────────────────────
const PRENDAS = {
  gorra:      { emoji: '🧢', nombre: 'Gorra' },
  mascara:    { emoji: '😷', nombre: 'Máscara' },
  gafas:      { emoji: '🕶️', nombre: 'Gafas' },
  camiseta:   { emoji: '👕', nombre: 'Camiseta' },
  pantalones: { emoji: '👖', nombre: 'Pantalones' },
  zapatos:    { emoji: '👟', nombre: 'Zapatos' },
  guantes:    { emoji: '🧤', nombre: 'Guantes' },
  cinturon:   { emoji: '🩱', nombre: 'Cinturón' },
};

// ─── UN slash command que agrupa todo ─────────────────────────────────────────
const data = [
  new SlashCommandBuilder()
    .setName('ropa')
    .setDescription('Ponerse o quitarse una prenda de ropa')
    .addStringOption(o =>
      o.setName('prenda')
        .setDescription('Prenda que quieres usar')
        .setRequired(true)
        .addChoices(
          { name: '🧢 Gorra',       value: 'gorra' },
          { name: '😷 Máscara',     value: 'mascara' },
          { name: '🕶️ Gafas',       value: 'gafas' },
          { name: '👕 Camiseta',    value: 'camiseta' },
          { name: '👖 Pantalones',  value: 'pantalones' },
          { name: '👟 Zapatos',     value: 'zapatos' },
          { name: '🧤 Guantes',     value: 'guantes' },
          { name: '🩱 Cinturón',    value: 'cinturon' },
        ),
    )
    .addStringOption(o =>
      o.setName('accion')
        .setDescription('¿Poner o quitar?')
        .setRequired(false)
        .addChoices(
          { name: 'Ponerse', value: 'poner' },
          { name: 'Quitarse', value: 'quitar' },
        ),
    ),
];

async function execute(interaction) {
  const prendaKey = interaction.commandName === 'ropa'
    ? interaction.options.getString('prenda')
    : interaction.commandName;          // compatibilidad si alguien usa el nombre viejo

  const prenda = PRENDAS[prendaKey];
  if (!prenda) return interaction.reply({ embeds: [E.err('Error', 'Prenda inválida.')], ephemeral: true });

  const player = await getPlayer(interaction.user.id, interaction.user.username);
  if (!player.personajeCreado) {
    return interaction.reply({ embeds: [E.err('Sin personaje', 'Necesitas un personaje para usar esta acción.')], ephemeral: true });
  }

  // Toggle automático si no se especifica acción
  const estadoKey    = `ropa_${prendaKey}`;
  const estadoActual = player.cooldowns?.get(estadoKey) || 'quitar';
  const accion       = interaction.options.getString('accion') || (estadoActual === 'poner' ? 'quitar' : 'poner');

  player.cooldowns.set(estadoKey, accion);
  await player.save();

  const verbo = accion === 'poner' ? 'se pone' : 'se quita';
  const embed = new EmbedBuilder()
    .setColor(config.colors.dark)
    .setDescription(`*${player.getFullName()} ${verbo} ${prenda.emoji} su **${prenda.nombre}**.*`)
    .setAuthor({ name: `ROPA | ${player.getFullName()}` })
    .setFooter({ text: 'AmericanRP RP' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

// ─── Prefix commands (siguen teniendo nombre individual) ─────────────────────
const prefixCommands = Object.entries(PRENDAS).map(([key, prenda]) => ({
  name: key,
  description: `!${key} [poner/quitar] — Interactuar con ${prenda.nombre}`,
  async run(message, args) {
    const player = await getPlayer(message.author.id, message.author.username);
    if (!player.personajeCreado) return message.reply('Sin personaje.');
    const accion = args[0]?.toLowerCase() === 'quitar' ? 'quitar' : 'poner';
    const verbo  = accion === 'poner' ? 'se pone' : 'se quita';
    await message.delete().catch(() => {});
    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.dark)
        .setDescription(`*${player.getFullName()} ${verbo} ${prenda.emoji} su **${prenda.nombre}**.*`)
        .setAuthor({ name: `ROPA | ${player.getFullName()}` })
        .setTimestamp()],
    });
  },
}));

module.exports = { data, execute, prefixCommands };
