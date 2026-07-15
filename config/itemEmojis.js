const ITEM_EMOJIS = {
  bocadillo: '🥪', hamburguesa: '🍔', hotdog: '🌭', taco: '🌮',
  ensalada: '🥗', pizza: '🍕', pollo_asado: '🍗', sushi: '🍱',
  donut: '🍩', fruta: '🍎', steak: '🥩', pan: '🍞',
  agua: '💧', leche: '🥛', cafe: '☕', zumo: '🧃',
  refresco: '🥤', cerveza: '🍺', vino: '🍷', energetica: '⚡',
  cocktail: '🍹', vendas: '🩹', vitaminas: '💊', botiquin: '🧰',
  analgesico: '🔵', morfina: '💉', kit_medico: '🏥', suero: '🩺',
  desfibrilador: '⚡', guantes: '🧤', casco: '⛑️', chaleco_ligero: '🧥',
  chaleco: '🦺', maletin: '💼', mochila: '🎒', linterna: '🔦',
  cuerda: '🪢', gas_lacrimogeno: '💨', spray_pimienta: '🫧',
  navaja: '🔪', bate: '🏏', pistola_fogueo: '🔫', spray_defensa: '🛡️',
  movil_basico: '📱', movil_medio: '📳', movil_premium: '📲',
  walkie: '📻', radio_pro: '📡', auricular: '🎧', tablet: '📟',
  laptop: '💻', dni: '🪪', licencia_b: '🚗', licencia_a: '🏍️',
  licencia_c: '🚛', permiso_armas: '🔫', pasaporte: '📘',
  antecedentes: '📄', cert_medico: '🏥', registro_empresa: '🏢',
  licencia_bar: '🍺', contrato_alquiler: '🏠', cert_penales: '⚖️',
  gasolina: '⛽', neumatico: '🔄', kit_reparacion: '🔧',
  kit_pro: '🛠️', gato_hidraulico: '⚙️', pintura: '🎨',
  alarma: '🔒', semilla_marihuana: '🌱', semilla_lsd: '🌱',
  semilla_cocaina: '🌱', semilla_extasis: '🌱', semilla_meta: '🌱',
  semilla_ketamina: '🌱', semilla_heroina: '🌱', semilla_fentanilo: '🌱',
  panel_luz: '💡', reactor: '⚗️', condensador: '🌀',
  tubos: '🧪', quimicos: '🧬', silenciador: '🔇',
  pistola_ilegal: '🔫', subfusil: '🪖',
  // Tipos genéricos
  comida: '🍔', bebida: '🥤', medkit: '🩹', medicina: '💊',
  arma: '🔫', armadura: '🦺', equipo: '🧤', herramienta: '🔧',
  documento: '📄', radio: '📻', movil: '📱', contenedor: '🎒',
  droga: '💊', pieza_lab: '⚗️', arma_mod: '🔇', semilla: '🌱',
  robo: '💰', combustible: '⛽',
};

function resolveEmoji(item) {
  if (item.emoji) return item.emoji;
  if (item.id && ITEM_EMOJIS[item.id]) return ITEM_EMOJIS[item.id];
  if (item.tipo && ITEM_EMOJIS[item.tipo]) return ITEM_EMOJIS[item.tipo];
  return '📦';
}

module.exports = { resolveEmoji, ITEM_EMOJIS };