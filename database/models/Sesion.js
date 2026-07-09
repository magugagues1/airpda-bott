const mongoose = require('mongoose');

const sesionSchema = new mongoose.Schema({
  discordId:  { type: String, required: true },
  tipo:       { type: String, enum: ['taximetro', 'mecanico', 'trabajo'], required: true },
  activa:     { type: Boolean, default: true },
  iniciadaEn: { type: Date, default: Date.now },
  datos:      { type: mongoose.Schema.Types.Mixed, default: {} },
});

module.exports = mongoose.model('Sesion', sesionSchema);
