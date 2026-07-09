const mongoose = require('mongoose');

const logEntrySchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  field: String,
  oldValue: Number,
  newValue: Number,
  changedBy: String,
  origen: { type: String, enum: ['discord', 'web'], default: 'discord' },
}, { _id: false });

const historialEntrySchema = new mongoose.Schema({
  fecha: Date,
  jugadores: Number,
  lspd: Number,
  lscsd: Number,
  lscfd: Number,
  mecanicos: Number,
  staffIc: Number,
}, { _id: false });

const serverStatusSchema = new mongoose.Schema({
  key: { type: String, default: 'current', unique: true },
  isOnline: { type: Boolean, default: false },
  channelId: String,
  messageId: String,
  iniciadorId: String,
  iniciadorNombre: String,
  psnId: { type: String, default: null },
  jugadores: { type: Number, default: 0 },
  maxJugadores: { type: Number, default: 30 },
  lspd: { type: Number, default: 0 },
  lscsd: { type: Number, default: 0 },
  lscfd: { type: Number, default: 0 },
  mecanicos: { type: Number, default: 0 },
  staffIc: { type: Number, default: 0 },
  picoMaximo: { type: Number, default: 0 },
  picoFecha: Date,
  abiertoEn: Date,
  cerradoEn: Date,
  historial: [historialEntrySchema],
  logs: [logEntrySchema],
}, { timestamps: true });

module.exports = mongoose.models.ServerStatus || mongoose.model('ServerStatus', serverStatusSchema);