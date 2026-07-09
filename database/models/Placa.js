const mongoose = require('mongoose');

const placaSchema = new mongoose.Schema({
  discordId:    { type: String, unique: true, required: true },
  nombre:       { type: String, required: true },
  departamento: { type: String, enum: ['LSPD', 'LSCSD', 'LSCFD', 'IAA', 'FIB'], required: true },
  rango:        { type: String, required: true },
  numeroPlaca:  { type: String, required: true },
  activa:       { type: Boolean, default: true },
  creadoPor:    { type: String },   // Discord ID del admin que la creó
  creadoEn:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('Placa', placaSchema);
