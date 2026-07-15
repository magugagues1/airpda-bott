const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getPlayer, getInventory, formatMoney } = require('../utils/helpers');
const E = require('../utils/embeds');
const config = require('../config');
const Storage = require('../database/models/Storage');
const Inventory = require('../database/models/Inventory');

const TIPOS = {
  mochila: { nombre: 'Mochila', capacidad: 10, emoji: '🎒' },
  casa: { nombre: 'Casa', capacidad: 50, emoji: '🏠' },
  coche: { nombre: 'Coche', capacidad: 20, emoji: '🚗' },
  guardarropa: { nombre: 'Guardarropa', capacidad: 30, emoji: '👕' },
};

async function getOrCreateStorage(discordId, tipo = 'mochila') {
  let st = await Storage.findOne({ discordId, tipo });
  if (!st) {
    const info = TIPOS[tipo] || TIPOS.mochila;
    st = await Storage.create({ discordId, tipo, nombre: info.nombre, capacidad: info.capacidad });
  }
  return st;
}

// ─── Prefix Commands ─────────────────────────────────────────────────────────
const prefixCommands = [
  {
    name: 'guardar',
    aliases: ['store', 'almacenar'],
    description: '!guardar [item] [cantidad] — Guardar items en tu almacén',
    async run(message, args) {
      if (!args.length) return message.reply('Uso: `!guardar [item] [cantidad]`\nEj: `!guardar comida 5`\n\nPara ver tu almacén: `!guardarropa`');
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('❌ Sin personaje.');
      const inv = await getInventory(message.author.id);

      // Determinar tipo de almacén según items equipados
      let tipo = 'mochila';
      if (inv.items.some(i => i.id === 'mochila' && i.equipado)) tipo = 'mochila';
      if (inv.items.some(i => i.id === 'maletin' && i.equipado)) tipo = 'mochila';

      const storage = await getOrCreateStorage(message.author.id, tipo);
      const info = TIPOS[tipo] || TIPOS.mochila;

      const nombre = args.slice(0, -1).join(' ') || args.join(' ');
      const cantidad = parseInt(args[args.length - 1]) || 1;

      // Buscar item en inventario
      const invItem = inv.items.find(i => i.nombre.toLowerCase().includes(nombre.toLowerCase()) || i.id === nombre);
      if (!invItem) return message.reply(`❌ No tienes "${nombre}" en el inventario.`);
      if (invItem.cantidad < cantidad) return message.reply(`❌ Solo tienes ${invItem.cantidad}x ${invItem.nombre}.`);

      // Verificar espacio
      const ocupado = storage.items.reduce((s, i) => s + i.cantidad, 0);
      if (ocupado + cantidad > storage.capacidad) return message.reply(`❌ Almacén lleno (${ocupado}/${storage.capacidad}).`);

      inv.removeItem(invItem.id, cantidad);
      const existente = storage.items.find(i => i.id === invItem.id);
      if (existente) existente.cantidad += cantidad;
      else storage.items.push({ id: invItem.id, nombre: invItem.nombre, cantidad, emoji: invItem.emoji || '📦', tipo: invItem.tipo, precio: invItem.precio || 0, metadata: {} });

      await inv.save();
      await storage.save();
      return message.reply(`📦 Guardaste **${cantidad}x ${invItem.nombre}** en tu ${info.nombre}. (${ocupado + cantidad}/${storage.capacidad})`);
    },
  },
  {
    name: 'sacar',
    aliases: ['retirar', 'take'],
    description: '!sacar [item] [cantidad] — Sacar items de tu almacén',
    async run(message, args) {
      if (!args.length) return message.reply('Uso: `!sacar [item] [cantidad]`\nEj: `!sacar comida 5`');
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('❌ Sin personaje.');
      const inv = await getInventory(message.author.id);
      const storage = await getOrCreateStorage(message.author.id);

      const nombre = args.slice(0, -1).join(' ') || args.join(' ');
      const cantidad = parseInt(args[args.length - 1]) || 1;

      const stItem = storage.items.find(i => i.nombre.toLowerCase().includes(nombre.toLowerCase()) || i.id === nombre);
      if (!stItem) return message.reply(`❌ No tienes "${nombre}" en el almacén.`);
      if (stItem.cantidad < cantidad) return message.reply(`❌ Solo tienes ${stItem.cantidad}x ${stItem.nombre} guardados.`);

      if (inv.items.length >= inv.capacidadMax && !inv.items.find(i => i.id === stItem.id)) {
        return message.reply(`❌ Inventario lleno (${inv.items.length}/${inv.capacidadMax}).`);
      }

      stItem.cantidad -= cantidad;
      if (stItem.cantidad <= 0) storage.items.pull(stItem._id);
      inv.addItem({ id: stItem.id, nombre: stItem.nombre, emoji: stItem.emoji || '📦', tipo: stItem.tipo, precio: stItem.precio || 0 }, cantidad);

      await inv.save();
      await storage.save();
      return message.reply(`📦 Sacaste **${cantidad}x ${stItem.nombre}** del almacén.`);
    },
  },
  {
    name: 'guardarropa',
    aliases: ['almacen', 'storage', 'inventario-casa'],
    description: '!guardarropa — Ver tu almacén',
    async run(message) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('❌ Sin personaje.');
      const inv = await getInventory(message.author.id);

      // Buscar todos los almacenes del jugador
      let tipos = ['mochila'];
      if (inv.items.some(i => i.id === 'mochila' && i.equipado)) tipos.push('mochila');
      const almacenes = await Storage.find({ discordId: message.author.id });

      if (!almacenes.length) {
        const embed = new EmbedBuilder().setColor(config.colors.primary).setTitle('🎒 Almacén vacío')
          .setDescription('No tienes nada guardado.\nUsa `!guardar [item] [cantidad]` para guardar cosas.')
          .addFields({ name: '📦 Capacidad', value: 'Mochila: 10 slots · Casa: 50 · Coche: 20', inline: false })
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      const fields = await Promise.all(almacenes.map(async st => {
        const info = TIPOS[st.tipo] || { nombre: st.tipo, emoji: '📦' };
        const items = st.items.length
          ? st.items.map(i => `${i.emoji || '📦'} **${i.nombre}** x${i.cantidad}`).join('\n')
          : '*Vacío*';
        const ocupado = st.items.reduce((s, i) => s + i.cantidad, 0);
        return { name: `${info.emoji} ${info.nombre} (${ocupado}/${st.capacidad})`, value: items, inline: false };
      }));

      const embed = new EmbedBuilder().setColor(config.colors.primary).setTitle('🎒 Tus Almacenes')
        .addFields(...fields).setFooter({ text: 'Usa !guardar [item] / !sacar [item]' }).setTimestamp();
      return message.reply({ embeds: [embed] });
    },
  },
];

module.exports = { prefixCommands };