/**
 * IMÁGENES — AmericanRP RP
 * ─────────────────────────────────────────────────────────────────────────────
 * CDN: OpenMoji 14.0 via jsDelivr (open source, estilo flat-cartoon, 618×618px)
 * URL base: https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@14.0/color/618x618/
 *
 * Para cambiar cualquier imagen:
 *   1. Sube tu imagen a un canal de Discord
 *   2. Clic derecho → Copiar enlace
 *   3. Reemplaza la URL de la clave correspondiente
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BASE = 'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@14.0/color/618x618/';
const om = code => `${BASE}${code}.png`;

const IMG = {

  // ═══════════════════════════════════════════════════════
  //  COMANDOS RP
  // ═══════════════════════════════════════════════════════

  me:           om('1F3AD'),  // 🎭 Máscara de teatro — !me (acción)
  do:           om('1F4CB'),  // 📋 Portapapeles     — !do (descripción)
  entorno:      om('1F30D'),  // 🌍 Globo terráqueo  — !entorno
  susurro:      om('1F92B'),  // 🤫 Shh / silencio   — !susurro
  grito:        om('1F4E2'),  // 📢 Altavoz          — !grito
  carta:        om('1F4DC'),  // 📜 Pergamino        — !carta / !nota
  intentar:     om('1F3B2'),  // 🎲 Dados            — !intentar
  mirar:        om('1F50D'),  // 🔍 Lupa             — !mirar / identificar
  morir:        om('1F480'),  // 💀 Calavera         — !morir / CK

  // ═══════════════════════════════════════════════════════
  //  EMERGENCIAS / 911
  // ═══════════════════════════════════════════════════════

  emergencia:   om('1F6A8'),  // 🚨 Sirena           — 911 genérico
  em_policia:   om('1F694'),  // 🚔 Coche policía    — 911 Policía
  em_medico:    om('1F691'),  // 🚑 Ambulancia       — 911 EMS
  em_bomberos:  om('1F692'),  // 🚒 Camión bomberos  — 911 Bomberos

  // ═══════════════════════════════════════════════════════
  //  ECONOMÍA / BANCO
  // ═══════════════════════════════════════════════════════

  banco:        om('1F3E6'),  // 🏦 Banco            — billetera / banco
  depositar:    om('1F4E5'),  // 📥 Bandeja entrada  — depositar
  retirar:      om('1F4B5'),  // 💵 Billete          — retirar
  transferir:   om('1F4B8'),  // 💸 Dinero volando   — transferir
  cobrar:       om('1F4B0'),  // 💰 Saco de dinero   — cobrar salario
  blanquear:    om('1F9F9'),  // 🧹 Escoba          — blanquear
  top:          om('1F3C6'),  // 🏆 Trofeo           — top ranking

  // ═══════════════════════════════════════════════════════
  //  POLICÍA / SISTEMA POLICIAL
  // ═══════════════════════════════════════════════════════

  policia:      om('1F694'),  // 🚔 Coche policía    — policía general
  esposar:      om('1F46E'),  // 👮 Policía          — esposar / esposas
  multar:       om('1F9FE'),  // 🧾 Recibo           — multa emitida
  multas:       om('1F4CB'),  // 📋 Portapapeles     — listado multas
  cachear:      om('1F50D'),  // 🔍 Lupa             — cachear
  escoltar:     om('1F6B6'),  // 🚶 Persona andando  — escoltar
  placa:        om('1F3C5'),  // 🏅 Medalla          — placa policial
  poli_dispo:   om('1F4FB'),  // 📻 Radio            — disponibilidad
  buscado:      om('1F4DC'),  // 📜 Cartel buscado   — lista buscados
  auxilio:      om('1FA79'),  // 🩹 Tirita           — auxilio médico

  // ═══════════════════════════════════════════════════════
  //  MÉDICO / HOSPITAL
  // ═══════════════════════════════════════════════════════

  hospital:     om('1F3E5'),  // 🏥 Hospital         — atención médica
  curar:        om('1F489'),  // 💉 Jeringuilla      — curar jugador
  revivir:      om('1F49A'),  // 💚 Corazón verde    — revivir jugador
  estado_med:   om('1FAC0'),  // 🫀 Corazón anat.    — estado médico

  // ═══════════════════════════════════════════════════════
  //  CRIMINAL
  // ═══════════════════════════════════════════════════════

  robar:        om('1F52B'),  // 🔫 Pistola          — robar jugador
  hackear:      om('1F4BB'),  // 💻 Portátil         — hackear sistema
  carterista:   om('1F45B'),  // 👛 Monedero         — carterista
  escapar:      om('1F3C3'),  // 🏃 Corriendo        — escapar policía
  secuestrar:   om('1F464'),  // 👤 Silueta          — secuestro

  // ═══════════════════════════════════════════════════════
  //  ATRACOS — Establecimientos
  // ═══════════════════════════════════════════════════════

  licoreria:    om('1F37E'),  // 🍾 Champán          — licorería
  peluqueria:   om('2702'),   // ✂️ Tijeras          — peluquería
  tatuajes:     om('1F58A'),  // 🖊️ Bolígrafo        — estudio tatuajes
  casa:         om('1F3E0'),  // 🏠 Casa             — robo de casa
  importacion:  om('1F697'),  // 🚗 Coche            — importación
  badulaque:    om('1F3EA'),  // 🏪 Tienda           — badulaque / LTD
  ropa:         om('1F455'),  // 👕 Camiseta         — tienda de ropa
  desguace:     om('1F527'),  // 🔧 Llave inglesa    — desguace
  electronica:  om('1F4F1'),  // 📱 Móvil            — tienda electrónica
  pawnshop:     om('1F3F7'),  // 🏷️ Etiqueta         — pawnshop
  farmacia:     om('1F48A'),  // 💊 Pastilla         — farmacia / ammu
  yate:         om('1F6E5'),  // 🛥️ Lancha           — yate
  joyeria:      om('1F48E'),  // 💎 Diamante         — joyería

  // ═══════════════════════════════════════════════════════
  //  INVENTARIO / TIENDA
  // ═══════════════════════════════════════════════════════

  inventario:   om('1F392'),  // 🎒 Mochila          — inventario
  tienda:       om('1F3EA'),  // 🏪 Tienda           — marketplace
  comprar:      om('1F6D2'),  // 🛒 Carrito          — comprar item
  vender:       om('1F4B1'),  // 💱 Divisa           — vender item
  usar_comida:  om('1F374'),  // 🍴 Tenedor/cuchillo — comer
  usar_bebida:  om('1F964'),  // 🥤 Vaso             — beber
  usar_medkit:  om('1FA79'),  // 🩹 Tirita           — usar kit médico

  // ═══════════════════════════════════════════════════════
  //  MÓVIL
  // ═══════════════════════════════════════════════════════

  movil:        om('1F4F1'),  // 📱 Móvil            — pantalla principal
  movil_banco:  om('1F3E6'),  // 🏦 Banco            — app banco
  movil_mapa:   om('1F5FA'),  // 🗺️ Mapa             — app mapa
  movil_tienda: om('1F6CD'),  // 🛍️ Bolsas           — app tienda
  movil_multas: om('1F694'),  // 🚔 Policía          — app multas
  movil_vitales:om('1F493'),  // 💓 Latido           — app vitales

  // ═══════════════════════════════════════════════════════
  //  TRABAJO
  // ═══════════════════════════════════════════════════════

  trabajo:      om('1F4BC'),  // 💼 Maletín          — trabajo general
  pescar:       om('1F3A3'),  // 🎣 Pescar           — pescador
  minar:        om('26CF'),   // ⛏️ Pico             — minero
  talar:        om('1FA93'),  // 🪓 Hacha            — leñador
  cazar:        om('1F98C'),  // 🦌 Ciervo           — cazador
  taxi:         om('1F695'),  // 🚕 Taxi             — taxista
  repartir:     om('1F4E6'),  // 📦 Paquete          — mensajero
  mecanico:     om('1F527'),  // 🔧 Llave            — mecánico

  // ═══════════════════════════════════════════════════════
  //  PERSONAJE
  // ═══════════════════════════════════════════════════════

  personaje:    om('1F464'),  // 👤 Silueta          — crear personaje
  perfil:       om('1FAAA'),  // 🪪 DNI              — perfil / ficha
  estadisticas: om('1F4CA'),  // 📊 Gráfica          — estadísticas

  // ═══════════════════════════════════════════════════════
  //  BANDA / GANG
  // ═══════════════════════════════════════════════════════

  banda:        om('1F465'),  // 👥 Grupo            — banda general
  banda_crear:  om('1F465'),  // 👥 Grupo            — crear banda
  banda_banco:  om('1F3E6'),  // 🏦 Banco            — banco de banda
  banda_guerra: om('2694'),   // ⚔️ Espadas          — declarar guerra

  // ═══════════════════════════════════════════════════════
  //  CASINO
  // ═══════════════════════════════════════════════════════

  casino:       om('1F3B0'),  // 🎰 Tragaperras      — casino general
  blackjack:    om('1F0CF'),  // 🃏 Comodín          — blackjack
  ruleta:       om('1F3B2'),  // 🎲 Dado             — ruleta
  slots:        om('1F3B0'),  // 🎰 Tragaperras      — slots
  dados:        om('1F3B2'),  // 🎲 Dado             — dados

  // ═══════════════════════════════════════════════════════
  //  DROGAS
  // ═══════════════════════════════════════════════════════

  drogas:       om('1F48A'),  // 💊 Pastilla         — drogas general
  plantar:      om('1F331'),  // 🌱 Plántula         — plantar
  cosechar:     om('1F33E'),  // 🌾 Trigo            — cosechar
  distribuir:   om('1F69A'),  // 🚚 Camión          — distribuir

  // ═══════════════════════════════════════════════════════
  //  VEHÍCULOS
  // ═══════════════════════════════════════════════════════

  vehiculo:     om('1F697'),  // 🚗 Coche            — catálogo
  vehiculo_comp:om('1F697'),  // 🚗 Coche            — comprar
  vehiculo_list:om('1F697'),  // 🚗 Coche            — lista
  garaje:       om('1F3E0'),  // 🏠 Casa/garaje      — garaje

  // ═══════════════════════════════════════════════════════
  //  MINIJUEGO ATRACO — Fases
  // ═══════════════════════════════════════════════════════

  robo_prep:    om('1F52B'),  // 🔫 Pistola          — preparación
  robo_fase1:   om('26A1'),   // ⚡ Rayo             — fase 1 entrar
  robo_fase2:   om('1F4B0'),  // 💰 Dinero           — fase 2 botín
  robo_fase3:   om('1F3C3'),  // 🏃 Correr           — fase 3 huir
  robo_exito:   om('2705'),   // ✅ Check verde      — atraco exitoso
  robo_fallo:   om('274C'),   // ❌ Cruz roja        — atraco fallido
  alerta_poli:  om('1F6A8'),  // 🚨 Sirena           — alerta policial

};

// ─────────────────────────────────────────────────────────────────────────────
// ICONOS PEQUEÑOS (thumbnails 72×72) — Twemoji, siempre funcionan
// ─────────────────────────────────────────────────────────────────────────────
const TW = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/';
const tw = code => `${TW}${code}.png`;

const ICONS = {
  banco:       tw('1f3e6'),
  dinero:      tw('1f4b5'),
  cobrar:      tw('1f4b0'),
  blanquear:   tw('1f9f9'),
  transferir:  tw('1f4b8'),
  policia:     tw('1f694'),
  sirena:      tw('1f6a8'),
  esposar:     tw('1f46e'),
  multa:       tw('1f9fe'),
  ambulancia:  tw('1f691'),
  hospital:    tw('1f3e5'),
  curar:       tw('1f489'),
  revivir:     tw('1f49a'),
  robar:       tw('1f52b'),
  atracar:     tw('1f6a8'),
  hackear:     tw('1f4bb'),
  carterista:  tw('1f45b'),
  buscado:     tw('1f4dc'),
  escapar:     tw('1f3c3'),
  inventario:  tw('1f392'),
  tienda:      tw('1f3ea'),
  comprar:     tw('1f6d2'),
  trabajo:     tw('1f4bc'),
  pescar:      tw('1f3a3'),
  minar:       tw('26cf'),
  talar:       tw('1fa93'),
  taxi:        tw('1f695'),
  personaje:   tw('1f464'),
  movil:       tw('1f4f1'),
  banda:       tw('1f465'),
  casino:      tw('1f3b0'),
  drogas:      tw('1f48a'),
  vehiculo:    tw('1f697'),
  top:         tw('1f3c6'),
  emergencia:  tw('1f198'),
  rp_me:       tw('1f3ad'),
  rp_do:       tw('1f4cb'),
  rp_911:      tw('1f4de'),
  bomberos:    tw('1f692'),
  mirar:       tw('1f50d'),
  vender:      tw('1f4b1'),
  nivel:       tw('2b50'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function addImage(embed, key) {
  const url = IMG[key];
  if (url) embed.setThumbnail(url);
  return embed;
}

function addThumb(embed, key) {
  const url = IMG[key];
  if (url) embed.setThumbnail(url);
  return embed;
}

// Retrocompatibilidad
const BANNERS = IMG;

module.exports = { IMG, ICONS, BANNERS, addImage, addThumb };
