const mongoose = require('mongoose');

const storageSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  tipo: { type: String, enum: ['mochila', 'casa', 'coche', 'guardarropa'], default: 'mochila' },
  nombre: { type: String, default: 'Almacenamiento' },
  capacidad: { type: Number, default: 10 },
  items: [{
    id: String, nombre: String, cantidad: { type: Number, default: 1 },
    emoji: { type: String, default: '📦' }, tipo: String, precio: Number,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  }],
}, { timestamps: true });

storageSchema.index({ discordId: 1, tipo: 1 });

module.exports = mongoose.model('Storage', storageSchema);