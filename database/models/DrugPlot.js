const mongoose = require('mongoose');

const drugPlotSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  guildId:   { type: String, required: true },
  tipo:      { type: String, enum: ['marihuana', 'cocaina', 'metanfetamina', 'heroina'], required: true },
  fase:      { type: String, enum: ['creciendo', 'listo', 'podrido'], default: 'creciendo' },
  cantidad:  { type: Number, default: 1 },  // nº de plantas
  plantadoEn: { type: Date, default: Date.now },
  listoEn:   { type: Date, required: true },
  podridoEn: { type: Date },               // 2h después de listo
  procesada: { type: Boolean, default: false },
  // si tiene equipo de lab
  conLab:    { type: Boolean, default: false },
});

module.exports = mongoose.model('DrugPlot', drugPlotSchema);
