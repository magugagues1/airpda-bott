const mongoose = require('mongoose');

const multaSchema = new mongoose.Schema({
  multaId:      { type: String, unique: true },  // MLT-YYYY-NNNN
  ciudadanoId:  { type: String, required: true }, // Discord ID
  ciudadanoNombre: { type: String },
  agente:       { type: String, required: true }, // Discord ID
  agenteNombre: { type: String },
  motivo:       { type: String, required: true },
  cantidad:     { type: Number, required: true, min: 0 },
  tiempoCarcel: { type: Number, default: 0 },    // minutos
  articulos:    [{ tipo: String, descripcion: String }],
  pagada:       { type: Boolean, default: false },
  pagadaEn:     { type: Date, default: null },
  creadoEn:     { type: Date, default: Date.now },
  guildId:      { type: String },
});

// Auto-generate multaId
multaSchema.pre('save', async function(next) {
  if (!this.multaId) {
    const año = new Date().getFullYear();
    const count = await mongoose.model('Multa').countDocuments({
      multaId: { $regex: `^MLT-${año}-` }
    });
    this.multaId = `MLT-${año}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Multa', multaSchema);
