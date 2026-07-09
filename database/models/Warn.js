const mongoose = require('mongoose');

const warnSchema = new mongoose.Schema({
  guildId:  { type: String, required: true },
  userId:   { type: String, required: true },
  warns: [{
    id: { type: String, default: () => Math.random().toString(36).substr(2, 9) },
    razon: String,
    moderador: String,
    moderadorId: String,
    activo: { type: Boolean, default: true },
    fecha: { type: Date, default: Date.now },
  }],
});

module.exports = mongoose.model('Warn', warnSchema);
