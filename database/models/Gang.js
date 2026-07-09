const mongoose = require('mongoose');

const miembroSchema = new mongoose.Schema({
  discordId: String,
  nombre: String,
  rango: { type: String, default: 'Recluta' },
  fechaUnion: { type: Date, default: Date.now },
  muertes: { type: Number, default: 0 },
  kills: { type: Number, default: 0 },
  contribucion: { type: Number, default: 0 },
}, { _id: false });

const territorioSchema = new mongoose.Schema({
  nombre: String,
  zona: String,
  conquistadoEn: { type: Date, default: Date.now },
}, { _id: false });

const gangSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  tag:    { type: String, required: true, unique: true, maxlength: 5, uppercase: true },
  descripcion: { type: String, default: '' },
  lider: { type: String, required: true },     // discordId
  color: { type: Number, default: 0xa78bfa },  // color hex para embeds
  emoji: { type: String, default: '⚔️' },

  miembros: [miembroSchema],
  territorios: [territorioSchema],

  dinero: { type: Number, default: 0 },
  reputacion: { type: Number, default: 0 },
  nivel: { type: Number, default: 1 },

  // War system
  enGuerra: { type: Boolean, default: false },
  guerraContra: { type: String, default: null },  // gang id
  guerraKills: { type: Number, default: 0 },
  guerraExpira: { type: Date, default: null },

  // Estadísticas
  guerrasGanadas: { type: Number, default: 0 },
  guerrasPerdidas: { type: Number, default: 0 },
  totalKills: { type: Number, default: 0 },
  totalMuertes: { type: Number, default: 0 },

  invitaciones: [String],  // discordIds invitados pendientes
  creadoEn: { type: Date, default: Date.now },
});

gangSchema.methods.getMiembro = function(discordId) {
  return this.miembros.find(m => m.discordId === discordId) || null;
};

gangSchema.methods.isMiembro = function(discordId) {
  return this.miembros.some(m => m.discordId === discordId);
};

gangSchema.methods.isLider = function(discordId) {
  return this.lider === discordId;
};

gangSchema.methods.getRango = function(discordId) {
  if (this.lider === discordId) return 'Líder';
  const m = this.getMiembro(discordId);
  return m ? m.rango : null;
};

module.exports = mongoose.model('Gang', gangSchema);
