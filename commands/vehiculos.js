/**
 * VEHÍCULOS — Compra, venta, registro de vehículos
 * Slash: /vehiculo comprar | /vehiculo lista | /vehiculo vender | /vehiculo info | /vehiculo matricula
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer, formatMoney, rand, generarMatricula } = require('../utils/helpers');
const E = require('../utils/embeds');
const config = require('../config');
const { ICONS, BANNERS, addImage } = require('../utils/images');

// ─── Catálogo de vehículos ────────────────────────────────────────────────────
const VEHICULOS = {
  economy: [
    { nombre: 'Faggio', precio: 3000, emoji: '🛵', velocidad: 30, descripcion: 'Scooter urbano' },
    { nombre: 'Dinka Blista', precio: 12000, emoji: '🚗', velocidad: 60, descripcion: 'Compacto ciudad' },
    { nombre: 'Karin Futo', precio: 18000, emoji: '🚗', velocidad: 75, descripcion: 'Sedán deportivo' },
    { nombre: 'Benefactor Panto', precio: 20000, emoji: '🚙', velocidad: 65, descripcion: 'Mini SUV' },
  ],
  sport: [
    { nombre: 'Vapid Dominator', precio: 35000, emoji: '🏎️', velocidad: 120, descripcion: 'Muscle car americano' },
    { nombre: 'Bravado Gauntlet', precio: 45000, emoji: '🏎️', velocidad: 130, descripcion: 'Muscle car potente' },
    { nombre: 'Pfister Comet', precio: 100000, emoji: '🏎️', velocidad: 170, descripcion: 'Deportivo puro' },
    { nombre: 'Dewbauchee Massacro', precio: 150000, emoji: '🏎️', velocidad: 180, descripcion: 'GT de alta gama' },
  ],
  super: [
    { nombre: 'Pfister 811', precio: 500000, emoji: '🚀', velocidad: 230, descripcion: 'Hypercar eléctrico' },
    { nombre: 'Grotti Turismo', precio: 350000, emoji: '🚀', velocidad: 210, descripcion: 'Superdeportivo italiano' },
    { nombre: 'Truffade Adder', precio: 1000000, emoji: '🚀', velocidad: 250, descripcion: 'El más rápido de LS' },
  ],
  trabajo: [
    { nombre: 'Declasse Burrito', precio: 8000, emoji: '🚐', velocidad: 50, descripcion: 'Furgoneta de trabajo' },
    { nombre: 'Bravado Rumpo', precio: 12000, emoji: '🚐', velocidad: 55, descripcion: 'Camioneta de reparto' },
    { nombre: 'Jobuilt Hauler', precio: 25000, emoji: '🚛', velocidad: 40, descripcion: 'Camión de carga' },
    { nombre: 'Karin BeeJay XL', precio: 30000, emoji: '🚙', velocidad: 65, descripcion: 'SUV de trabajo' },
  ],
};

const TODAS = Object.values(VEHICULOS).flat();

const data = new SlashCommandBuilder()
  .setName('vehiculo')
  .setDescription('Sistema de vehículos')
  .addSubcommand(s => s.setName('tienda').setDescription('Ver vehículos disponibles')
    .addStringOption(o => o.setName('categoria').setDescription('Categoría').setRequired(false)
      .addChoices(
        { name: '🚗 Economía', value: 'economy' },
        { name: '🏎️ Deportivo', value: 'sport' },
        { name: '🚀 Super', value: 'super' },
        { name: '🚛 Trabajo', value: 'trabajo' },
      )))
  .addSubcommand(s => s.setName('comprar').setDescription('Comprar un vehículo')
    .addStringOption(o => o.setName('nombre').setDescription('Nombre del vehículo').setRequired(true).setMaxLength(60)))
  .addSubcommand(s => s.setName('lista').setDescription('Ver tus vehículos'))
  .addSubcommand(s => s.setName('vender').setDescription('Vender un vehículo')
    .addStringOption(o => o.setName('matricula').setDescription('Matrícula del vehículo').setRequired(true)))
  .addSubcommand(s => s.setName('info').setDescription('Info de un vehículo')
    .addStringOption(o => o.setName('matricula').setDescription('Matrícula del vehículo').setRequired(true)))
  .addSubcommand(s => s.setName('matricula').setDescription('Generar nueva matrícula para un vehículo')
    .addStringOption(o => o.setName('matricula').setDescription('Matrícula actual del vehículo').setRequired(true)));

async function execute(interaction, client) {
  const sub = interaction.options.getSubcommand();
  const player = await getPlayer(interaction.user.id, interaction.user.username);

  if (!player.personajeCreado && sub !== 'tienda') {
    return interaction.reply({ embeds: [E.warn('Sin personaje', 'Crea tu personaje con `/personaje crear`.')], ephemeral: true });
  }

  if (sub === 'tienda') {
    const cat = interaction.options.getString('categoria');
    const cats = cat ? [cat] : Object.keys(VEHICULOS);
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🚗 Concesionario de Los Santos')
      .setFooter({ text: 'Usa /vehiculo comprar [nombre] para adquirir' })
      .setTimestamp();
    addImage(embed, 'vehiculo');

    for (const c of cats) {
      const lista = VEHICULOS[c].map(v => `${v.emoji} **${v.nombre}** — ${formatMoney(v.precio)} | ${v.velocidad} km/h\n*${v.descripcion}*`).join('\n');
      embed.addFields({ name: `${c.charAt(0).toUpperCase() + c.slice(1)}`, value: lista, inline: false });
    }

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'comprar') {
    const nombre = interaction.options.getString('nombre').toLowerCase();
    const vehiculo = TODAS.find(v => v.nombre.toLowerCase() === nombre || v.nombre.toLowerCase().includes(nombre));
    if (!vehiculo) return interaction.reply({ embeds: [E.err('Vehículo no encontrado', `"${nombre}" no está en el catálogo. Usa \`/vehiculo tienda\`.`)], ephemeral: true });

    if (player.vehicles?.length >= 5) return interaction.reply({ embeds: [E.err('Límite', 'Máximo 5 vehículos por jugador.')], ephemeral: true });

    const fondos = player.bank + player.cash;
    if (fondos < vehiculo.precio) return interaction.reply({ embeds: [E.err('Sin fondos', `Necesitas ${formatMoney(vehiculo.precio)}. Tienes: ${formatMoney(fondos)}`)], ephemeral: true });

    // Pagar con banco primero, luego cash
    if (player.bank >= vehiculo.precio) {
      player.bank -= vehiculo.precio;
    } else {
      const resto = vehiculo.precio - player.bank;
      player.bank = 0;
      player.cash -= resto;
    }

    const matricula = generarMatricula();
    if (!player.vehicles) player.vehicles = [];
    player.vehicles.push({ modelo: vehiculo.nombre, matricula, color: 'Negro', estado: 100, compradoEn: new Date() });
    await player.save();

    // Registrar en el registro de vehículos del PDA (visible en el dashboard)
    try {
      const pdaApi = require('../utils/pdaApi');
      await pdaApi.registrarVehiculo({
        matricula,
        propietarioId:     interaction.user.id,
        propietarioNombre: player.getFullName(),
        marca:             vehiculo.nombre.split(' ')[0],
        modelo:            vehiculo.nombre,
        color:             'Negro',
        tipo:              Object.entries(VEHICULOS).find(([, list]) => list.some(v => v.nombre === vehiculo.nombre))?.[0] || 'economy',
        registradoPor:     'Sistema Bot',
      });
    } catch {}

    const compEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${vehiculo.emoji} Vehículo comprado`)
      .setDescription(`¡Adquiriste un **${vehiculo.nombre}**!`)
      .setThumbnail(ICONS.vehiculo)
      .addFields(
        { name: '🪪 Matrícula', value: matricula, inline: true },
        { name: '💰 Precio', value: formatMoney(vehiculo.precio), inline: true },
        { name: '⚡ Velocidad', value: `${vehiculo.velocidad} km/h`, inline: true },
      )
      .setTimestamp();
    addImage(compEmbed, 'vehiculo_comp');
    return interaction.reply({ embeds: [compEmbed] });
  }

  if (sub === 'lista') {
    const vehis = player.vehicles || [];
    if (!vehis.length) return interaction.reply({ embeds: [E.info('Sin vehículos', 'No tienes vehículos. Cómpralos con `/vehiculo tienda`.')] });

    const desc = vehis.map((v, i) => {
      const vInfo = TODAS.find(t => t.nombre === v.modelo);
      return `${vInfo?.emoji || '🚗'} **${v.modelo}** | Matrícula: \`${v.matricula}\` | Estado: ${v.estado}%`;
    }).join('\n');

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🚗 Tus vehículos')
        .setDescription(desc)
        .setTimestamp()],
    });
  }

  if (sub === 'vender') {
    const matricula = interaction.options.getString('matricula').toUpperCase();
    const idx = player.vehicles?.findIndex(v => v.matricula === matricula);
    if (idx === undefined || idx === -1) return interaction.reply({ embeds: [E.err('No encontrado', 'No tienes un vehículo con esa matrícula.')], ephemeral: true });

    const vehiculo = player.vehicles[idx];
    const vInfo = TODAS.find(v => v.nombre === vehiculo.modelo);
    const precioVenta = vInfo ? Math.floor(vInfo.precio * 0.55) : 5000;

    player.vehicles.splice(idx, 1);
    player.bank += precioVenta;
    await player.save();

    // Eliminar del registro PDA
    try {
      const pdaApi = require('../utils/pdaApi');
      await pdaApi.eliminarVehiculo(matricula);
    } catch {}

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('💰 Vehículo vendido')
        .setDescription(`Vendiste tu **${vehiculo.modelo}** (${matricula}) por **${formatMoney(precioVenta)}**`)
        .setTimestamp()],
    });
  }

  if (sub === 'info') {
    const matricula = interaction.options.getString('matricula').toUpperCase();
    const vehiculo = player.vehicles?.find(v => v.matricula === matricula);
    if (!vehiculo) return interaction.reply({ embeds: [E.err('No encontrado', 'No tienes ese vehículo.')], ephemeral: true });
    const vInfo = TODAS.find(v => v.nombre === vehiculo.modelo);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${vInfo?.emoji || '🚗'} ${vehiculo.modelo}`)
        .addFields(
          { name: '🪪 Matrícula', value: vehiculo.matricula, inline: true },
          { name: '🎨 Color', value: vehiculo.color || 'Por defecto', inline: true },
          { name: '🔧 Estado', value: `${vehiculo.estado || 100}%`, inline: true },
          { name: '⚡ Velocidad', value: vInfo ? `${vInfo.velocidad} km/h` : 'N/A', inline: true },
          { name: '📅 Comprado', value: vehiculo.compradoEn ? `<t:${Math.floor(vehiculo.compradoEn.getTime() / 1000)}:R>` : 'N/A', inline: true },
        )
        .setTimestamp()],
    });
  }

  if (sub === 'matricula') {
    const matriculaActual = interaction.options.getString('matricula').toUpperCase();
    const vehiculo = player.vehicles?.find(v => v.matricula === matriculaActual);
    if (!vehiculo) return interaction.reply({ embeds: [E.err('No encontrado', 'No tienes ese vehículo.')], ephemeral: true });
    if (player.bank < 500 && player.cash < 500) return interaction.reply({ embeds: [E.err('Sin fondos', 'Cambiar la matrícula cuesta $500.')], ephemeral: true });

    if (player.bank >= 500) player.bank -= 500;
    else player.cash -= 500;

    const nuevaMatricula = generarMatricula();
    const matriculaVieja = matriculaActual;
    vehiculo.matricula = nuevaMatricula;
    await player.save();

    // Actualizar matrícula en el registro PDA
    try {
      const pdaApi = require('../utils/pdaApi');
      await pdaApi.eliminarVehiculo(matriculaVieja);
      await pdaApi.registrarVehiculo({
        matricula:         nuevaMatricula,
        propietarioId:     interaction.user.id,
        propietarioNombre: player.getFullName(),
        marca:             vehiculo.modelo.split(' ')[0],
        modelo:            vehiculo.modelo,
        color:             vehiculo.color || 'Negro',
        registradoPor:     'Sistema Bot',
      });
    } catch {}

    return interaction.reply({ embeds: [E.ok('Matrícula cambiada', `Nueva matrícula: **${nuevaMatricula}** — $500 cobrados`)] });
  }
}

// ─── Prefix ────────────────────────────────────────────────────────────────────
const prefixCommands = [
  {
    name: 'misvehiculos',
    aliases: ['coches', 'vehiculos', 'carros'],
    description: 'Ver mis vehículos',
    async run(message) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('Sin personaje.');
      const vehis = player.vehicles || [];
      if (!vehis.length) return message.reply('No tienes vehículos. Cómpralos con `/vehiculo tienda`.');
      const desc = vehis.map(v => `🚗 **${v.modelo}** | \`${v.matricula}\``).join('\n');
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.primary).setTitle('🚗 Mis vehículos').setDescription(desc).setTimestamp()] });
    },
  },
];

module.exports = { data, execute, prefixCommands };
