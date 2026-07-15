const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const ICONS_DIR = path.join(IMAGES_DIR, 'icons-main');

// Escanear todas las imágenes disponibles
let imageCache = null;
function scanAllImages() {
  if (imageCache) return imageCache;
  const result = {};

  function scan(dir, prefix = '') {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) scan(path.join(dir, entry.name), prefix + entry.name + '/');
      else if (entry.name.endsWith('.png') && !entry.name.startsWith('README')) {
        result[entry.name.toLowerCase()] = path.join(dir, entry.name);
        // También indexar por nombre sin extensión
        const name = path.parse(entry.name).name.toLowerCase();
        result[name] = path.join(dir, entry.name);
      }
    }
  }

  scan(IMAGES_DIR);
  scan(ICONS_DIR);
  imageCache = result;
  return result;
}

// Mapeo manual ID → nombre de imagen
const ID_MAP = {
  // Comida
  hamburguesa: 'sirloin_burger.png', pollo_asado: 'chicken_strips.png',
  pizza: 'pizza_ham.png', donut: 'donut.png',
  patatas: 'fries.png', pan: 'tosti.png', bocadillo: 'heartysandwich.png',
  hotdog: 'hotdog.png', taco: 'tortia.png', ensalada: 'salad/greek_veggie_wrap.png',
  sushi: 'shushi.png', fruta: 'fruit-box.png', steak: 'bbq-ribs.png',
  // Bebidas
  agua: 'water.png', refresco: 'sprunk.png', leche: 'drinks/mk-drinks/milk.png',
  cafe: 'drinks/hotdrinks/coffee-black.png', zumo: 'drinks/softdrinks/juice_orange.png',
  cerveza: 'drinks/alcoholic/heineken.png', vino: 'drinks/alcoholic/red_wine.png',
  energetica: 'drinks/energy/monster.png', cocktail: 'drinks/alcoholic/cocktail.png',
  // Farmacia
  vendas: 'bandage.png', botiquin: 'medikit.png', kit_medico: 'advancedkit.png',
  morfina: 'medical/medkits/painkillers.png', analgesico: 'medical/tablets/nurofen.png',
  desfibrilador: 'medical/equipment/defib.png', suero: 'medical/eivbag.png',
  vitaminas: 'medical/tablets/vitamins.png',
  // Equipo
  chaleco: 'armour.png', linterna: 'WEAPON_FLASHLIGHT.png',
  granada_humo: 'WEAPON_SMOKEGRENADE.png', casco: 'tools/helmet.png',
  mochila: 'tools/backpack.png', guantes: 'clothing/gloves_black.png',
  cuerda: 'tools/rope.png', gas_lacrimogeno: 'WEAPON_BZGAS.png',
  // Armas
  navaja: 'WEAPON_KNIFE.png', bate: 'WEAPON_BAT.png',
  pistola_fogueo: 'WEAPON_PISTOL.png', pistola: 'WEAPON_PISTOL.png',
  pistola50: 'WEAPON_PISTOL50.png', smg: 'WEAPON_SMG.png',
  rifle: 'WEAPON_ASSAULTRIFLE.png', escopeta: 'WEAPON_PUMPSHOTGUN.png',
  sniper: 'WEAPON_SNIPERRIFLE.png', pistola_ilegal: 'WEAPON_PISTOL50.png',
  subfusil: 'WEAPON_SMG.png', silenciador: 'at_suppressor.png',
  mira_holo: 'at_scope_holo.png',
  // Droga
  marihuana: 'icons-main/drugs/weed_brick.png', cocaina: 'icons-main/drugs/coke_brick.png',
  metanfetamina: 'icons-main/drugs/meth_tray.png', heroina: 'icons-main/drugs/dirtyneedle.png',
  lsd: 'icons-main/drugs/lsdtab.png', extasis: 'icons-main/drugs/oxy.png',
  ketamina: 'icons-main/drugs/chemicals/ketamine.png',
  fentanilo: 'icons-main/drugs/chemicals/fentanyl.png',
  dinero_sucio: 'black_money.png', dinero: 'money.png',
  // Documentos
  dni: 'card_id.png', permiso_armas: 'license/gunlicense.png',
  pasaporte: 'license/passport.png', licencia_b: 'license/driverlicense.png',
  // Items de robo/herramientas
  lockpick: 'lockpick.png', esposas: 'ziptie.png',
  paracaidas: 'parachute.png', telefono: 'phone.png',
  radio: 'radio.png', movil_basico: 'phone.png',
  movil_medio: 'tech/samsung.png', movil_premium: 'tech/iphone.png',
  laptop: 'tech/laptop.png', tablet: 'tech/tablet.png',
  // Munición
  muni_9mm: 'ammo-9.png', muni_45: 'ammo-45.png',
  muni_rifle: 'ammo-rifle.png', muni_escopeta: 'ammo-shotgun.png',
  // Especiales
  llave_coche: 'carkey.png', llave: 'key.png',
  basura: 'garbage.png', bolsa_papel: 'paperbag.png',
  // Tipos genéricos
  arma: 'WEAPON_PISTOL.png', comida: 'food/snacks/crisps1.png',
  bebida: 'drinks/softdrinks/cola.png',
};

function getItemImage(item) {
  // Buscar por ID
  if (item.id && ID_MAP[item.id]) {
    const p = ID_MAP[item.id];
    // Probar ruta absoluta primero
    const paths = [
      path.join(IMAGES_DIR, p),
      path.join(ICONS_DIR, p),
      path.join(IMAGES_DIR, 'icons-main', p.replace('icons-main/', '')),
    ];
    for (const fp of paths) {
      if (fs.existsSync(fp)) return fp;
    }
  }

  // Búsqueda por nombre en el catálogo completo
  const all = scanAllImages();
  const searchName = (item.nombre || item.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const searchId = (item.id || '').toLowerCase();

  if (searchId && all[searchId + '.png']) return all[searchId + '.png'];
  if (searchId && all[searchId]) return all[searchId];

  // Búsqueda parcial
  for (const [key, filePath] of Object.entries(all)) {
    const cleanKey = key.replace(/[^a-z0-9]/g, '');
    if (searchId && (cleanKey.includes(searchId) || searchId.includes(cleanKey))) return filePath;
    if (searchName && (cleanKey.includes(searchName) || searchName.includes(cleanKey))) return filePath;
  }

  return null;
}

module.exports = { getItemImage };