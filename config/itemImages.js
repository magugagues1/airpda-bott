const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
let imageCache = null;

function scanAllImages() {
  if (imageCache) return imageCache;
  const result = {};
  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) scan(path.join(dir, e.name));
      else if (e.name.endsWith('.png') && e.name !== 'README.md') {
        result[e.name.toLowerCase()] = path.join(dir, e.name);
      }
    }
  }
  scan(IMAGES_DIR);
  imageCache = result;
  return result;
}

// Mapeo directo ID del item → nombre del archivo (scan encuentra la ruta)
const ID_MAP = {
  hamburguesa: 'sirloin_burger.png', pollo_asado: 'chicken_strips.png',
  pizza: 'pizza_ham.png', donut: 'donut.png',
  patatas: 'fries.png', pan: 'tosti.png', bocadillo: 'heartysandwich.png',
  hotdog: 'hotdog.png', taco: 'tortia.png', ensalada: 'chicken_caesar_wrap.png',
  sushi: 'shushi.png', fruta: 'fruit-box.png', steak: 'bbq-ribs.png',
  agua: 'water.png', refresco: 'sprunk.png', cafe: 'coffee-black.png',
  zumo: 'juice_orange.png', cerveza: 'heineken.png', vino: 'red_wine.png',
  energetica: 'monster.png', cocktail: 'cocktail.png',
  vendas: 'bandage.png', botiquin: 'medikit.png', kit_medico: 'advancedkit.png',
  morfina: 'painkillers.png', analgesico: 'nurofen.png',
  desfibrilador: 'defib.png', suero: 'eivbag.png', vitaminas: 'vitamins.png',
  chaleco: 'armour.png', linterna: 'weapon_flashlight.png',
  casco: 'helmet.png', mochila: 'backpack.png', guantes: 'gloves_black.png',
  cuerda: 'rope.png', navaja: 'weapon_knife.png', bate: 'weapon_bat.png',
  pistola_fogueo: 'weapon_pistol.png', pistola: 'weapon_pistol.png',
  pistola50: 'weapon_pistol50.png', smg: 'weapon_smg.png',
  rifle: 'weapon_assaultrifle.png', escopeta: 'weapon_pumpshotgun.png',
  sniper: 'weapon_sniperrifle.png', subfusil: 'weapon_smg.png',
  marihuana: 'weed_brick.png', cocaina: 'coke_brick.png',
  metanfetamina: 'meth_tray.png', heroina: 'dirtyneedle.png',
  lsd: 'lsdtab.png', extasis: 'oxy.png',
  ketamina: 'ketamine.png', fentanilo: 'fentanyl.png',
  dinero_sucio: 'black_money.png', dinero: 'money.png',
  dni: 'card_id.png', permiso_armas: 'gunlicense.png',
  pasaporte: 'passport.png', licencia_b: 'driverlicense.png',
  lockpick: 'lockpick.png', paracaidas: 'parachute.png',
  telefono: 'phone.png', radio: 'radio.png',
  movil_basico: 'phone.png', movil_medio: 'samsung.png',
  movil_premium: 'iphone.png', laptop: 'laptop.png',
  tablet: 'tablet.png', muni_9mm: 'ammo-9.png',
  muni_45: 'ammo-45.png', muni_rifle: 'ammo-rifle.png',
  muni_escopeta: 'ammo-shotgun.png', llave_coche: 'carkey.png',
  llave: 'key.png', silenciador: 'at_suppressor.png',
  mira_holo: 'at_scope_holo.png',
  arma: 'weapon_pistol.png', comida: 'crisps1.png',
  bebida: 'cola.png',
};

function getItemImage(item) {
  if (!item) return null;
  const all = scanAllImages();

  // 1. Buscar por ID en el mapa
  const id = item.id?.toLowerCase();
  if (id && ID_MAP[id]) {
    const targetName = ID_MAP[id].toLowerCase();
    if (all[targetName]) return all[targetName];
    // Búsqueda parcial
    for (const [k, v] of Object.entries(all)) {
      if (k.includes(targetName) || targetName.includes(k.replace('.png', ''))) return v;
    }
  }

  // 2. Buscar por nombre del item en el catálogo completo
  const searchName = (item.nombre || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (searchName) {
    for (const [k, v] of Object.entries(all)) {
      const cleanK = k.replace(/[^a-z0-9]/g, '');
      if (cleanK.includes(searchName) || searchName.includes(cleanK)) return v;
    }
  }

  // 3. Búsqueda por tipo
  if (item.tipo === 'arma') {
    if (all['weapon_pistol.png']) return all['weapon_pistol.png'];
    for (const [k, v] of Object.entries(all)) if (k.includes('pistol') && !k.includes('blueprint') && !k.includes('part') && !k.includes('ammo')) return v;
  }

  return null;
}

module.exports = { getItemImage };