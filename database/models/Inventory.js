const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  nombre: String,
  emoji: { type: String, default: '📦' },
  cantidad: { type: Number, default: 1, min: 0 },
  tipo: String,
  descripcion: String,
  valor: Number,
  equipado: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  discordId: { type: String, unique: true, required: true },
  items: [itemSchema],
  capacidadMax: { type: Number, default: 20 },
  peso: { type: Number, default: 0 },
  pesoMax: { type: Number, default: 50 },
  updatedAt: { type: Date, default: Date.now },
});

inventorySchema.methods.addItem = function(itemData, cantidad = 1) {
  const existing = this.items.find(i => i.id === itemData.id);
  if (existing) {
    existing.cantidad += cantidad;
  } else {
    if (this.items.length >= this.capacidadMax) return false;
    this.items.push({ ...itemData, cantidad });
  }
  this.updatedAt = new Date();
  return true;
};

inventorySchema.methods.removeItem = function(itemId, cantidad = 1) {
  const idx = this.items.findIndex(i => i.id === itemId);
  if (idx === -1) return false;
  if (this.items[idx].cantidad < cantidad) return false;
  this.items[idx].cantidad -= cantidad;
  if (this.items[idx].cantidad <= 0) this.items.splice(idx, 1);
  this.updatedAt = new Date();
  return true;
};

inventorySchema.methods.hasItem = function(itemId, cantidad = 1) {
  const item = this.items.find(i => i.id === itemId);
  return item && item.cantidad >= cantidad;
};

inventorySchema.methods.getItem = function(itemId) {
  return this.items.find(i => i.id === itemId) || null;
};

inventorySchema.methods.countItems = function() {
  return this.items.reduce((t, i) => t + i.cantidad, 0);
};

module.exports = mongoose.model('BotInventory', inventorySchema);
