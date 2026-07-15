// Mapeo item ID → nombre de archivo en /images
const ITEM_IMAGES = {
  // Comida
  hamburguesa: 'burger.png', pollo_asado: 'burger_chicken.png',
  pizza: 'pizza_ham.png', donut: 'donut.png',
  patatas: 'fries.png', pan: 'trash_bread.png',
  // Bebidas
  agua: 'water.png', refresco: 'sprunk.png',
  // Farmacia
  vendas: 'bandage.png', botiquin: 'medikit.png', kit_medico: 'advancedkit.png',
  // Equipo
  chaleco: 'armour.png', linterna: 'WEAPON_FLASHLIGHT.png',
  granada_humo: 'WEAPON_SMOKEGRENADE.png',
  // Armas
  navaja: 'WEAPON_KNIFE.png', bate: 'WEAPON_BAT.png',
  pistola_fogueo: 'WEAPON_PISTOL.png', pistola: 'WEAPON_PISTOL.png',
  pistola50: 'WEAPON_PISTOL50.png', smg: 'WEAPON_SMG.png',
  rifle: 'WEAPON_ASSAULTRIFLE.png', escopeta: 'WEAPON_PUMPSHOTGUN.png',
  sniper: 'WEAPON_SNIPERRIFLE.png',
  pistola_ilegal: 'WEAPON_PISTOL50.png', subfusil: 'WEAPON_SMG.png',
  silenciador: 'at_suppressor.png', mira_holo: 'at_scope_holo.png',
  // Droga
  marihuana: 'weed.png', cocaina: 'cocaine.png',
  metanfetamina: 'meth.png',
  dinero_sucio: 'black_money.png', dinero: 'money.png',
  // Documentos
  dni: 'card_id.png', permiso_armas: 'card_bank.png',
  // Llaves
  llave_coche: 'carkey.png', llave: 'key.png',
  // Otros
  movil: 'phone.png', radio: 'radio.png',
  telefono: 'phone.png', movil_basico: 'phone.png',
  // Items de robo
  lockpick: 'lockpick.png', esposas: 'ziptie.png',
  bolsa_basura: 'garbage.png', bolsa_papel: 'paperbag.png',
  paracaidas: 'parachute.png',
  // Munición
  muni_9mm: 'ammo-9.png', muni_45: 'ammo-45.png',
  muni_rifle: 'ammo-rifle.png', muni_escopeta: 'ammo-shotgun.png',
  // Tipos genéricos
  arma: 'WEAPON_PISTOL.png',
};

function getItemImage(item) {
  if (item.id && ITEM_IMAGES[item.id]) return ITEM_IMAGES[item.id];
  const key = item.nombre?.toLowerCase().replace(/[^a-z0-9]/g, '_') || '';
  if (ITEM_IMAGES[key]) return ITEM_IMAGES[key];
  if (item.tipo === 'arma') return 'WEAPON_PISTOL.png';
  return null;
}

module.exports = { getItemImage, ITEM_IMAGES };