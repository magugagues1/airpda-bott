const mongoose = require('mongoose');
const config = require('../config');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(config.mongoUri);
    isConnected = true;
    console.log('✅ MongoDB conectado correctamente');
  } catch (err) {
    console.error('❌ Error conectando MongoDB:', err.message);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB desconectado, reintentando...');
  isConnected = false;
  setTimeout(connectDB, 5000);
});

module.exports = { connectDB };
