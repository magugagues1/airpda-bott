const ITEM_EMOJIS = {
  comida: '🍔', bebida: '🥤', medkit: '🩹', medicina: '💊',
  arma: '🔫', armadura: '🦺', equipo: '🧤', herramienta: '🔧',
  documento: '📄', radio: '📻', movil: '📱', contenedor: '🎒',
  droga: '💊', pieza_lab: '⚗️', arma_mod: '🔇', semilla: '🌱',
  robo: '💰', combustible: '⛽',
};

function resolveEmoji(item) {
  if (item.emoji) return item.emoji;
  return ITEM_EMOJIS[item.tipo] || '📦';
}

module.exports = { resolveEmoji, ITEM_EMOJIS };