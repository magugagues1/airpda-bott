const mongoose = require('mongoose');

const commandQueueSchema = new mongoose.Schema({
  comando: { type: String, required: true },
  canalId: { type: String, required: true },
  adminId: { type: String, default: null },
  ejecutado: { type: Boolean, default: false },
  creadoEn: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CommandQueue', commandQueueSchema);