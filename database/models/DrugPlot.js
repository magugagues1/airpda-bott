const mongoose = require('mongoose');

const drugPlotSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  guildId:   { type: String, required: true },
  tipo:      { type: String, enum: ['marihuana', 'cocaina', 'metanfetamina', 'heroina', 'lsd', 'extasis', 'ketamina', 'fentanilo'], required: true },
  fase:      { type: String, enum: ['creciendo', 'listo', 'podrido'], default: 'creciendo' },
  cantidad:  { type: Number, default: 1 },
  plantadoEn: { type: Date, default: Date.now },
  listoEn:   { type: Date, required: true },
  podridoEn: { type: Date },
  ultimoRiego: { type: Date, default: Date.now },
  riegosNecesarios: { type: Number, default: 3 },
  riegosRealizados: { type: Number, default: 0 },
  conPaneles: { type: Boolean, default: false },
  conLab:    { type: Boolean, default: false },
  conLuz:    { type: Boolean, default: false },
});

module.exports = mongoose.model('DrugPlot', drugPlotSchema);