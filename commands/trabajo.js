/**
 * TRABAJO — Sistema de trabajos, minijuegos laborales
 * Slash: /trabajo lista | /trabajo info | /trabajo cambiar
 * Prefix: !trabajar, !pescar, !minar, !cazar, !repartir, !cultivar, !taxi
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer, getInventory, formatCooldown, formatMoney, rand } = require('../utils/helpers');
const E = require('../utils/embeds');
const config = require('../config');
const TRABAJOS = require('../data/trabajos');
const { ICONS, BANNERS, addImage } = require('../utils/images');

const data = new SlashCommandBuilder()
  .setName('trabajo')
  .setDescription('Sistema de trabajos')
  .addSubcommand(s => s.setName('lista').setDescription('Ver trabajos disponibles'))
  .addSubcommand(s => s.setName('info').setDescription('Info de tu trabajo actual'))
  .addSubcommand(s => s.setName('cambiar').setDescription('Cambiar de trabajo')
    .addStringOption(o => o.setName('trabajo').setDescription('Nuevo trabajo').setRequired(true)
      .addChoices(...Object.keys(TRABAJOS).map(k => ({ name: `${TRABAJOS[k].emoji} ${k.charAt(0).toUpperCase() + k.slice(1)}`, value: k })))));

async function execute(interaction, client) {
  const sub = interaction.options.getSubcommand();
  const player = await getPlayer(interaction.user.id, interaction.user.username);
  if (!player.personajeCreado) return interaction.reply({ embeds: [E.warn('Sin personaje', 'Crea tu personaje con `/personaje crear`.')], ephemeral: true });

  if (sub === 'lista') {
    const desc = Object.entries(TRABAJOS).map(([k, v]) => {
      const sal = `${formatMoney(v.salario[0])} - ${formatMoney(v.salario[1])}`;
      return `${v.emoji} **${k.charAt(0).toUpperCase() + k.slice(1)}** — ${sal}/hora\n*${v.descripcion}*`;
    }).join('\n\n');

    const tEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('💼 Trabajos disponibles')
      .setDescription(desc)
      .setFooter({ text: 'Usa /trabajo cambiar para cambiar de empleo' })
      .setTimestamp();
    addImage(tEmbed, 'trabajo');
    return interaction.reply({ embeds: [tEmbed] });
  }

  if (sub === 'info') {
    const tInfo = TRABAJOS[player.trabajo?.toLowerCase()];
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`💼 Tu trabajo: ${player.trabajo || 'Sin empleo'}`)
      .addFields(
        { name: '💰 Salario/hora', value: tInfo ? `${formatMoney(tInfo.salario[0])} - ${formatMoney(tInfo.salario[1])}` : '*N/A*', inline: true },
        { name: '📊 Trabajos realizados', value: `${player.trabajosRealizados}`, inline: true },
      )
      .setTimestamp();
    if (tInfo) embed.setDescription(tInfo.descripcion);
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'cambiar') {
    const nuevo = interaction.options.getString('trabajo');
    player.trabajo = nuevo;
    await player.save();
    const t = TRABAJOS[nuevo];
    return interaction.reply({ embeds: [E.ok('Trabajo cambiado', `${t.emoji} Ahora eres **${nuevo.charAt(0).toUpperCase() + nuevo.slice(1)}**.\nSalario: ${formatMoney(t.salario[0])} - ${formatMoney(t.salario[1])}/hora`)] });
  }
}

// ─── Mini-trabajos con prefix ─────────────────────────────────────────────────
function buildTrabajoPrefixCmd(nombre, aliases, cooldownKey, descripcion, handler) {
  return {
    name: nombre,
    aliases,
    description: descripcion,
    cooldown: config.cooldowns[cooldownKey] || config.cooldowns.trabajar,
    async run(message, args, client) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('Sin personaje. Usa `/personaje crear`.');
      const inv = await getInventory(message.author.id);

      const lastCd = player.getCooldown(cooldownKey);
      const cdMs = config.cooldowns[cooldownKey] || config.cooldowns.trabajar;
      const remaining = lastCd ? lastCd.getTime() + cdMs - Date.now() : 0;
      if (remaining > 0) return message.reply(`⏳ Debes esperar **${formatCooldown(remaining)}** para volver a ${nombre}.`);

      player.setCooldown(cooldownKey, new Date());
      const result = await handler(player, inv, message, args);
      await player.save();
      await inv.save();
      return message.reply(typeof result === 'string' ? result : { embeds: [result] });
    },
  };
}

const prefixCommands = [
  buildTrabajoPrefixCmd('trabajar', ['trabajo', 'laburo'], 'trabajar', 'Trabajar y ganar dinero', async (player, inv) => {
    const t = TRABAJOS[player.trabajo?.toLowerCase()];
    if (!t) return '❌ No tienes trabajo. Usa `/trabajo cambiar` para conseguir uno.';
    const ganancia = rand(t.salario[0], t.salario[1]);
    player.bank += ganancia;
    player.trabajosRealizados++;
    await player.addXP(rand(15, 35), player);
    return new EmbedBuilder()
      .setColor(config.colors.success)
      .setDescription(`${t.emoji} Trabajaste como **${player.trabajo}** y ganaste **${formatMoney(ganancia)}**`)
      .setTimestamp();
  }),

  buildTrabajoPrefixCmd('pescar', ['pesca', 'fishing'], 'pescar', 'Ir a pescar y obtener peces', async (player, inv) => {
    if (player.trabajo !== 'pescador') {
      // Otros pueden pescar pero ganan menos
    }
    const suerte = Math.random();
    const peces = [
      { nombre: 'Sardina', emoji: '🐟', valor: rand(50, 100) },
      { nombre: 'Atún', emoji: '🐠', valor: rand(150, 300) },
      { nombre: 'Salmón', emoji: '🐡', valor: rand(200, 400) },
      { nombre: 'Pez espada', emoji: '⚔️', valor: rand(400, 800) },
      { nombre: 'Tiburón', emoji: '🦈', valor: rand(1000, 2000) },
    ];
    if (suerte < 0.1) return '🎣 No tuviste suerte hoy... No picó nada.';
    const pez = peces[Math.floor(suerte * peces.length)];
    inv.addItem({ nombre: pez.nombre, tipo: 'pez', emoji: pez.emoji, precio: pez.valor, cantidad: rand(1, 3) });
    await player.addXP(rand(10, 25), player);
    return `🎣 Pescaste ${pez.emoji} **${pez.nombre}** (valor: ${formatMoney(pez.valor)} c/u). Está en tu inventario.`;
  }),

  buildTrabajoPrefixCmd('minar', ['mineria', 'mine'], 'minar', 'Extraer minerales valiosos', async (player, inv) => {
    const minerales = [
      { nombre: 'Piedra', emoji: '🪨', valor: rand(20, 50) },
      { nombre: 'Carbón', emoji: '⚫', valor: rand(50, 120) },
      { nombre: 'Hierro', emoji: '🔩', valor: rand(80, 180) },
      { nombre: 'Plata', emoji: '🥈', valor: rand(200, 500) },
      { nombre: 'Oro', emoji: '🥇', valor: rand(500, 1200) },
      { nombre: 'Diamante', emoji: '💎', valor: rand(2000, 5000) },
    ];
    const mineral = minerales[Math.floor(Math.random() * minerales.length * 0.8)];
    const cantidad = rand(1, 4);
    inv.addItem({ nombre: mineral.nombre, tipo: 'mineral', emoji: mineral.emoji, precio: mineral.valor, cantidad });
    await player.addXP(rand(15, 40), player);
    return `⛏️ Extrajiste **${cantidad}x ${mineral.emoji} ${mineral.nombre}** (valor: ${formatMoney(mineral.valor * cantidad)} total). ¡Están en tu inventario!`;
  }),

  buildTrabajoPrefixCmd('cazar', ['caza', 'hunt'], 'cazar', 'Ir de caza', async (player, inv) => {
    const animales = [
      { nombre: 'Conejo', emoji: '🐇', valor: rand(80, 150) },
      { nombre: 'Venado', emoji: '🦌', valor: rand(200, 400) },
      { nombre: 'Jabalí', emoji: '🐗', valor: rand(300, 600) },
      { nombre: 'Oso', emoji: '🐻', valor: rand(800, 1500) },
      { nombre: 'Puma', emoji: '🐱', valor: rand(1000, 2000) },
    ];
    if (Math.random() < 0.15) return '🌲 Esta vez no encontraste nada en el bosque...';
    const animal = animales[Math.floor(Math.random() * animales.length)];
    inv.addItem({ nombre: `Carne de ${animal.nombre}`, tipo: 'comida', emoji: animal.emoji, precio: animal.valor, cantidad: 1, efecto: { hambre: 50 } });
    await player.addXP(rand(20, 45), player);
    return `🏹 Cazaste un **${animal.emoji} ${animal.nombre}**. Tienes carne en el inventario.`;
  }),

  buildTrabajoPrefixCmd('repartir', ['reparto', 'delivery'], 'trabajar', 'Repartir paquetes', async (player, inv) => {
    const destinos = ['Vinewood', 'Sandy Shores', 'Paleto Bay', 'Puerto LS', 'Rockford Hills', 'Mirror Park'];
    const destino = destinos[rand(0, destinos.length - 1)];
    const ganancia = rand(120, 350);
    player.bank += ganancia;
    player.trabajosRealizados++;
    await player.addXP(rand(10, 20), player);
    return `📦 Entregaste el paquete en **${destino}** y ganaste **${formatMoney(ganancia)}**.`;
  }),

  buildTrabajoPrefixCmd('taxi', ['conducir', 'uber'], 'trabajar', 'Llevar pasajeros en taxi', async (player, inv) => {
    const pasajeros = ['un hombre de negocios', 'una turista', 'un estudiante', 'un anciano', 'una pareja'];
    const pasajero = pasajeros[rand(0, pasajeros.length - 1)];
    const ganancia = rand(150, 400);
    const propina = Math.random() > 0.5 ? rand(10, 80) : 0;
    player.cash += ganancia + propina;
    player.trabajosRealizados++;
    await player.addXP(rand(8, 18), player);
    const msg = propina > 0
      ? `🚕 Llevaste a **${pasajero}** al destino. Tarifa: **${formatMoney(ganancia)}** + propina: **${formatMoney(propina)}** 🎉`
      : `🚕 Llevaste a **${pasajero}** al destino. Ganaste **${formatMoney(ganancia)}**.`;
    return msg;
  }),

  // !chef — cocinar y vender comida
  buildTrabajoPrefixCmd('cocinar', ['chef', 'cook'], 'trabajar', 'Cocinar y preparar comida', async (player, inv) => {
    const recetas = [
      { nombre: 'Hamburguesa gourmet', emoji: '🍔', valor: rand(100, 200) },
      { nombre: 'Pasta italiana', emoji: '🍝', valor: rand(150, 250) },
      { nombre: 'Sushi premium', emoji: '🍣', valor: rand(200, 350) },
      { nombre: 'Steak', emoji: '🥩', valor: rand(250, 450) },
    ];
    const plato = recetas[rand(0, recetas.length - 1)];
    const cantidad = rand(2, 5);
    inv.addItem({ nombre: plato.nombre, tipo: 'comida', emoji: plato.emoji, precio: plato.valor, cantidad, efecto: { hambre: 50 } });
    await player.addXP(rand(12, 28), player);
    return `👨‍🍳 Cocinaste **${cantidad}x ${plato.emoji} ${plato.nombre}**. Están en tu inventario.`;
  }),
];

module.exports = { data, execute, prefixCommands };
