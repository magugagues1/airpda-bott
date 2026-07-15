/**
 * INVENTARIO — Gestión de items
 * Slash: /inventario /equipar /desequipar /usar /tirar /dar
 * Prefix: !inv, !usar, !equipar, !tirar
 */
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getPlayer, getInventory, formatMoney } = require('../utils/helpers');
const { renderInventoryImage } = require('../utils/renderInventory');
const { resolveEmoji } = require('../config/itemEmojis');
const E = require('../utils/embeds');
const config = require('../config');

const data = [
  new SlashCommandBuilder()
    .setName('inventario')
    .setDescription('Ver tu inventario')
    .addUserOption(o => o.setName('usuario').setDescription('Ver inventario de otro jugador (admins)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('equipar')
    .setDescription('Equipar un item del inventario')
    .addStringOption(o => o.setName('item').setDescription('Nombre del item').setRequired(true).setMaxLength(64)),

  new SlashCommandBuilder()
    .setName('desequipar')
    .setDescription('Desequipar un item')
    .addStringOption(o => o.setName('item').setDescription('Nombre del item').setRequired(true).setMaxLength(64)),

  new SlashCommandBuilder()
    .setName('usar')
    .setDescription('Usar un item del inventario')
    .addStringOption(o => o.setName('item').setDescription('Nombre del item').setRequired(true).setMaxLength(64)),

  new SlashCommandBuilder()
    .setName('tirar')
    .setDescription('Tirar un item del inventario')
    .addStringOption(o => o.setName('item').setDescription('Nombre del item').setRequired(true).setMaxLength(64))
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a tirar').setRequired(false).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('dar')
    .setDescription('Dar un item a otro jugador')
    .addUserOption(o => o.setName('usuario').setDescription('A quién dar el item').setRequired(true))
    .addStringOption(o => o.setName('item').setDescription('Nombre del item').setRequired(true).setMaxLength(64))
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad').setRequired(false).setMinValue(1)),
];

/**
 * Genera el adjunto de imagen del inventario (mochila + iconos de items).
 * Devuelve { attachment, url } listos para meter en un embed:
 *   .setImage(url) y luego reply({ embeds, files: [attachment] })
 */
async function buildInventoryAttachment(inv) {
  const itemsParaRender = inv.items.map(i => ({
    nombre: i.nombre,
    emoji: resolveEmoji(i),
    cantidad: i.cantidad,
  }));
  const buffer = await renderInventoryImage(itemsParaRender);
  const attachment = new AttachmentBuilder(buffer, { name: 'inventario.png' });
  return { attachment, url: 'attachment://inventario.png' };
}

async function execute(interaction, client) {
  const cmd = interaction.commandName;

  if (cmd === 'inventario') {
    const target = interaction.options.getUser('usuario');
    // Solo admin puede ver inventario ajeno
    if (target && target.id !== interaction.user.id) {
      if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ embeds: [E.err('Sin permiso', 'Solo los admins pueden ver el inventario de otros.')], ephemeral: true });
      }
    }
    const uid = target?.id || interaction.user.id;
    const nombre = target?.username || interaction.user.username;
    const inv = await getInventory(uid);

    const { attachment, url } = await buildInventoryAttachment(inv);
    const embed = E.inventario(inv, nombre).setImage(url);

    return interaction.reply({ embeds: [embed], files: [attachment] });
  }

  if (cmd === 'equipar') {
    const inv = await getInventory(interaction.user.id);
    const nombre = interaction.options.getString('item').toLowerCase();
    const item = inv.items.find(i => i.nombre.toLowerCase() === nombre);
    if (!item) return interaction.reply({ embeds: [E.err('Item no encontrado', `No tienes "${nombre}" en el inventario.`)], ephemeral: true });
    if (!item.equipable) return interaction.reply({ embeds: [E.warn('No equipable', `**${item.nombre}** no es un item equipable.`)], ephemeral: true });
    item.equipado = true;
    await inv.save();
    return interaction.reply({ embeds: [E.ok('Equipado', `${item.emoji || '📦'} **${item.nombre}** equipado.`)] });
  }

  if (cmd === 'desequipar') {
    const inv = await getInventory(interaction.user.id);
    const nombre = interaction.options.getString('item').toLowerCase();
    const item = inv.items.find(i => i.nombre.toLowerCase() === nombre);
    if (!item) return interaction.reply({ embeds: [E.err('Item no encontrado', `No tienes "${nombre}" en el inventario.`)], ephemeral: true });
    item.equipado = false;
    await inv.save();
    return interaction.reply({ embeds: [E.ok('Desequipado', `${item.emoji || '📦'} **${item.nombre}** desequipado.`)] });
  }

  if (cmd === 'usar') {
    const inv    = await getInventory(interaction.user.id);
    const player = await getPlayer(interaction.user.id, interaction.user.username);
    if (!player.personajeCreado) return interaction.reply({ embeds: [E.warn('Sin personaje', 'Crea tu personaje primero.')], ephemeral: true });

    const query = interaction.options.getString('item').toLowerCase();
    const item  = inv.items.find(i =>
      i.id === query ||
      i.nombre?.toLowerCase() === query ||
      i.nombre?.toLowerCase().includes(query),
    );
    if (!item) return interaction.reply({ embeds: [E.err('Item no encontrado', `No tienes "${query}" en el inventario.\nUsa \`/inventario\` para ver tus items.`)], ephemeral: true });

    const tiposConsumibles = ['comida', 'bebida', 'medkit', 'medicina'];
    if (!tiposConsumibles.includes(item.tipo)) {
      return interaction.reply({ embeds: [E.warn('No consumible', `**${item.nombre}** no es consumible aquí.\nEquipables: usa \`/equipar ${item.nombre}\`.`)], ephemeral: true });
    }

    function barra(v, len = 10) {
      const n = Math.round(Math.min(Math.max(v, 0), 100) / 10);
      const col = v > 60 ? '🟩' : v > 30 ? '🟨' : '🟥';
      return col.repeat(n) + '⬛'.repeat(len - n);
    }

    const efecto = item.efecto || {};
    const antes  = { salud: player.salud, hambre: player.hambre, sed: player.sed };
    const cambios = [];
    let color = config.colors.success;

    if (efecto.salud)  { player.salud  = Math.min(100, player.salud  + efecto.salud);  cambios.push(`❤️ Salud: +${efecto.salud}`);  }
    if (efecto.hambre) { player.hambre = Math.min(100, player.hambre + efecto.hambre); cambios.push(`🍔 Hambre: +${efecto.hambre}`); }
    if (efecto.sed)    { player.sed    = Math.min(100, player.sed    + efecto.sed);    cambios.push(`💧 Sed: +${efecto.sed}`);     }
    if (efecto.revivir && player.muerto) {
      player.muerto = false; player.enHospital = false; player.tiempoHospital = null;
      cambios.push('💀→🟢 ¡REVIVIDO!');
    }
    if (item.tipo === 'droga') {
      cambios.push(`*${player.getFullName()} consume ${item.nombre}...*`);
      color = config.colors.purple;
    }
    if (!cambios.length) return interaction.reply({ embeds: [E.warn('Sin efecto', 'Este item no tiene efectos aplicables.')], ephemeral: true });

    const itemId = item.id || item.nombre;
    inv.removeItem(itemId, 1);
    await inv.save();
    await player.save();

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(color)
        .setTitle(`${item.emoji || '✅'} Usaste: ${item.nombre}`)
        .setDescription(cambios.map(c => `> ${c}`).join('\n'))
        .addFields(
          { name: '❤️ Salud',  value: `${barra(antes.salud)} → ${barra(player.salud)} **${Math.floor(player.salud)}%**`,  inline: false },
          { name: '🍔 Hambre', value: `${barra(antes.hambre)} → ${barra(player.hambre)} **${Math.floor(player.hambre)}%**`, inline: false },
          { name: '💧 Sed',    value: `${barra(antes.sed)} → ${barra(player.sed)} **${Math.floor(player.sed)}%**`,         inline: false },
        )
        .setFooter({ text: `Inventario: ${inv.countItems()}/${inv.capacidadMax} slots` })
        .setTimestamp()],
    });
  }

  if (cmd === 'tirar') {
    const inv = await getInventory(interaction.user.id);
    const nombre = interaction.options.getString('item').toLowerCase();
    const cantidad = interaction.options.getInteger('cantidad') || 1;
    const item = inv.items.find(i => i.nombre.toLowerCase() === nombre);
    if (!item) return interaction.reply({ embeds: [E.err('Item no encontrado', `No tienes "${nombre}".`)], ephemeral: true });
    if (cantidad > item.cantidad) return interaction.reply({ embeds: [E.err('Cantidad insuficiente', `Solo tienes ${item.cantidad}x ${item.nombre}.`)], ephemeral: true });
    inv.removeItem(item.nombre, cantidad);
    await inv.save();
    return interaction.reply({ embeds: [E.ok('Item tirado', `🗑️ Tiraste **${cantidad}x ${item.nombre}** al suelo.`)] });
  }

  if (cmd === 'dar') {
    const inv = await getInventory(interaction.user.id);
    const target = interaction.options.getUser('usuario');
    const nombre = interaction.options.getString('item').toLowerCase();
    const cantidad = interaction.options.getInteger('cantidad') || 1;

    const item = inv.items.find(i => i.nombre.toLowerCase() === nombre);
    if (!item) return interaction.reply({ embeds: [E.err('Item no encontrado', `No tienes "${nombre}".`)], ephemeral: true });
    if (cantidad > item.cantidad) return interaction.reply({ embeds: [E.err('Cantidad insuficiente', `Solo tienes ${item.cantidad}x.`)], ephemeral: true });

    const targetInv = await getInventory(target.id);
    if (targetInv.countItems() >= targetInv.capacidadMax) return interaction.reply({ embeds: [E.err('Inventario lleno', 'El inventario del otro jugador está lleno.')], ephemeral: true });

    inv.removeItem(item.nombre, cantidad);
    targetInv.addItem({ nombre: item.nombre, tipo: item.tipo, emoji: item.emoji, cantidad, equipable: item.equipable, precio: item.precio, efecto: item.efecto });
    await inv.save();
    await targetInv.save();

    const player = await getPlayer(interaction.user.id, interaction.user.username);
    const targetPlayer = await getPlayer(target.id, target.username);
    const nombreP = player.personajeCreado ? player.getFullName() : interaction.user.username;
    const nombreT = targetPlayer.personajeCreado ? targetPlayer.getFullName() : target.username;

    return interaction.reply({ embeds: [E.ok('Item transferido', `${item.emoji || '📦'} **${nombreP}** le dio **${cantidad}x ${item.nombre}** a **${nombreT}**`)] });
  }
}

// ─── Prefix ────────────────────────────────────────────────────────────────────

async function consumirItem(message, query, tipoFiltro = null) {
  const player = await getPlayer(message.author.id, message.author.username);
  if (!player.personajeCreado) return message.reply('❌ Sin personaje. Usa `/personaje crear`.');
  const inv = await getInventory(message.author.id);

  let item;
  if (query) {
    const q = query.toLowerCase();
    item = inv.items.find(i =>
      i.id === q ||
      (i.nombre && i.nombre.toLowerCase() === q) ||
      (i.nombre && i.nombre.toLowerCase().includes(q)),
    );
  } else if (tipoFiltro) {
    item = inv.items.find(i => i.tipo === tipoFiltro || (tipoFiltro === 'bebida' && i.tipo === 'bebida') || (tipoFiltro === 'comida' && i.tipo === 'comida'));
  }

  if (!item) {
    const tipoMsg = tipoFiltro === 'bebida'
      ? 'No tienes bebidas en el inventario. Compra en `/tienda`.'
      : tipoFiltro === 'comida'
        ? 'No tienes comida en el inventario. Compra en `/tienda`.'
        : `No tienes "${query}" en el inventario.`;
    return message.reply({ embeds: [E.err('Sin item', tipoMsg)] });
  }

  const tiposConsumibles = ['comida', 'bebida', 'medkit', 'medicina'];
  if (!tiposConsumibles.includes(item.tipo)) {
    return message.reply({ embeds: [E.warn('No consumible', `**${item.nombre}** no se puede usar así. Usa \`/equipar\` si es equipable.`)] });
  }

  function barra(v, len = 10) {
    const n = Math.round(Math.min(Math.max(v, 0), 100) / 10);
    const col = v > 60 ? '🟩' : v > 30 ? '🟨' : '🟥';
    return col.repeat(n) + '⬛'.repeat(len - n);
  }

  const efecto = item.efecto || {};
  const antes = { salud: player.salud, hambre: player.hambre, sed: player.sed };
  const cambios = [];

  if (efecto.salud)  { player.salud  = Math.min(100, player.salud  + efecto.salud);  cambios.push(`❤️ Salud: **+${efecto.salud}**`); }
  if (efecto.hambre) { player.hambre = Math.min(100, player.hambre + efecto.hambre); cambios.push(`🍔 Hambre: **+${efecto.hambre}**`); }
  if (efecto.sed)    { player.sed    = Math.min(100, player.sed    + efecto.sed);    cambios.push(`💧 Sed: **+${efecto.sed}**`); }
  if (efecto.revivir && player.muerto) {
    player.muerto = false; player.enHospital = false; player.tiempoHospital = null;
    cambios.push('💀→🟢 **¡REVIVIDO!**');
  }

  if (!cambios.length) return message.reply({ embeds: [E.warn('Sin efecto', 'Este item no tiene efectos aplicables en este momento.')] });

  inv.removeItem(item.id || item.nombre, 1);
  await inv.save();
  await player.save();

  const accionStr = item.tipo === 'bebida' ? 'bebe' : item.tipo === 'comida' ? 'come' : 'usa';

  return message.reply({
    embeds: [new EmbedBuilder()
      .setColor(item.tipo === 'bebida' ? 0x06b6d4 : item.tipo === 'comida' ? 0xf59e0b : config.colors.success)
      .setTitle(`${item.emoji || '✅'} ${player.getFullName()} ${accionStr} ${item.nombre}`)
      .setDescription(cambios.join('\n'))
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '❤️ Salud',  value: `${barra(antes.salud)} → ${barra(player.salud)} **${Math.floor(player.salud)}%**`,  inline: false },
        { name: '🍔 Hambre', value: `${barra(antes.hambre)} → ${barra(player.hambre)} **${Math.floor(player.hambre)}%**`, inline: false },
        { name: '💧 Sed',    value: `${barra(antes.sed)} → ${barra(player.sed)} **${Math.floor(player.sed)}%**`,         inline: false },
      )
      .setFooter({ text: `Inventario: ${inv.countItems()}/${inv.capacidadMax} slots  ·  AmericanRP` })
      .setTimestamp()],
  });
}

const prefixCommands = [
  {
    name: 'inv',
    aliases: ['inventario', 'items', 'mochila'],
    description: 'Ver tu inventario',
    async run(message, args) {
      const target = message.mentions.users.first() || message.author;
      const inv = await getInventory(target.id);

      const { attachment, url } = await buildInventoryAttachment(inv);
      const embed = E.inventario(inv, target.username).setImage(url);

      return message.reply({ embeds: [embed], files: [attachment] });
    },
  },

  {
    name: 'usar',
    aliases: ['use', 'consumir'],
    description: '!usar [item] — Usar un item del inventario',
    async run(message, args) {
      if (!args.length) return message.reply('Uso: `!usar [nombre del item]`\nEj: `!usar botiquín`');
      return consumirItem(message, args.join(' '));
    },
  },

  {
    name: 'beber',
    aliases: ['drink', 'tomar'],
    description: '!beber [item?] — Beber algo del inventario',
    async run(message, args) {
      const query = args.join(' ') || null;
      return consumirItem(message, query, 'bebida');
    },
  },

  {
    name: 'comer',
    aliases: ['eat', 'alimentar'],
    description: '!comer [item?] — Comer algo del inventario',
    async run(message, args) {
      const query = args.join(' ') || null;
      return consumirItem(message, query, 'comida');
    },
  },
];

module.exports = { data, execute, prefixCommands };