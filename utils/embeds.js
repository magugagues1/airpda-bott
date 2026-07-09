const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { IMG, ICONS, addImage, addThumb } = require('./images');
const { getPaisNombre } = require('../data/paises');

// ── DNI determinístico por discordId ──────────────────────────────────────────
function getDNI(discordId) {
  const n = parseInt(discordId.slice(-7)) % 99999;
  const numPart = String(n).padStart(5, '0');
  const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const letra = letras[parseInt(discordId.slice(-4)) % letras.length];
  return `LS-${numPart}-${letra}`;
}

// ── Barra de vida ─────────────────────────────────────────────────────────────
function barraVida(valor, max = 100, longitud = 10) {
  const v = Math.min(Math.max(valor, 0), max);
  const llenos = Math.round((v / max) * longitud);
  const vacios = longitud - llenos;
  const color = v > 60 ? '🟩' : v > 30 ? '🟨' : '🟥';
  return color.repeat(llenos) + '⬛'.repeat(vacios);
}

// Alias de retrocompatibilidad — mantener por si algún archivo usa BANNERS
const BANNERS = IMG;

// ─────────────────────────────────────────────────────────────────────────────
const E = {
  getDNI,
  IMG,

  // ── Básicos ───────────────────────────────────────────────────────────────
  base: (color = config.colors.primary) => new EmbedBuilder().setColor(color).setTimestamp(),

  ok: (titulo, desc) => new EmbedBuilder()
    .setColor(config.colors.success).setTitle(`✅ ${titulo}`).setDescription(desc).setTimestamp(),

  err: (titulo, desc) => new EmbedBuilder()
    .setColor(config.colors.danger).setTitle(`❌ ${titulo}`).setDescription(desc).setTimestamp(),

  warn: (titulo, desc) => new EmbedBuilder()
    .setColor(config.colors.warning).setTitle(`⚠️ ${titulo}`).setDescription(desc).setTimestamp(),

  info: (titulo, desc) => new EmbedBuilder()
    .setColor(config.colors.info).setTitle(`ℹ️ ${titulo}`).setDescription(desc).setTimestamp(),

  // ── RP: !me — Acción del personaje ───────────────────────────────────────
  meEmbed: (player, texto, avatarUrl = null) => {
    const em = new EmbedBuilder()
      .setColor(0x1e1e2e)
      .setDescription(`> 🎭 *${texto}*`)
      .setAuthor({ name: `▸ ${player.getFullName()}`, iconURL: avatarUrl || undefined })
      .setThumbnail(avatarUrl || ICONS.rp_me)
      .setFooter({ text: 'Acción  ·  AmericanRP RP' })
      .setTimestamp();
    addImage(em, 'me');
    return em;
  },

  // ── RP: !do — Descripción de escena ──────────────────────────────────────
  doEmbed: (player, texto, avatarUrl = null) => {
    const em = new EmbedBuilder()
      .setColor(0x1e3a5f)
      .setDescription(`> 📋 *${texto}*`)
      .setAuthor({ name: `▸ ${player.getFullName()}`, iconURL: avatarUrl || undefined })
      .setThumbnail(avatarUrl || ICONS.rp_do)
      .setFooter({ text: 'Descripción  ·  AmericanRP RP' })
      .setTimestamp();
    addImage(em, 'do');
    return em;
  },

  // ── RP: !911 — Llamada de emergencia completa ─────────────────────────────
  emergencia911: (player, tipo, descripcion) => {
    const tipos = {
      policia:  { emoji: '🚔', nombre: 'POLICÍA  —  LSPD', color: 0x003f9f },
      medico:   { emoji: '🚑', nombre: 'SERVICIOS MÉDICOS  —  EMS', color: 0x22c55e },
      bomberos: { emoji: '🚒', nombre: 'BOMBEROS  —  LSFD', color: 0xcc2200 },
    };
    const t = tipos[tipo] || tipos.policia;
    const dni = getDNI(player.discordId);

    const estadoStr = player.muerto
      ? '💀 Muerto'
      : player.enHospital
        ? '🏥 Hospitalizado'
        : `${Math.floor(player.salud)}% salud`;

    const thumbIcon = tipo === 'policia' ? ICONS.policia : tipo === 'medico' ? ICONS.ambulancia : ICONS.bomberos;
    const bannerKey = tipo === 'policia' ? 'em_policia' : tipo === 'medico' ? 'em_medico' : 'em_bomberos';

    const em = new EmbedBuilder()
      .setColor(t.color)
      .setTitle(`${t.emoji}  LLAMADA AL 911  —  ${t.nombre}`)
      .setDescription(`\`\`\`\n${descripcion}\n\`\`\``)
      .setThumbnail(thumbIcon)
      .addFields(
        { name: '👤 Nombre',   value: `**${player.getFullName()}**`,  inline: true },
        { name: '🪪 DNI / ID', value: `\`${dni}\``,                   inline: true },
        { name: '💼 Trabajo',  value: player.trabajo || 'Desempleado', inline: true },
        { name: '❤️ Estado',   value: estadoStr,                       inline: true },
        { name: '📍 Ubicación', value: '_Indicada en el canal de RP_', inline: true },
      )
      .setFooter({ text: `AmericanRP · Sistema 911  •  ${new Date().toLocaleString('es-ES', { timeStyle: 'short', dateStyle: 'short' })}` })
      .setTimestamp();

    addImage(em, bannerKey);
    return em;
  },

  // ── Perfil de jugador ─────────────────────────────────────────────────────
  perfil: (player, user) => {
    const salud = barraVida(player.salud);
    const hambre = barraVida(player.hambre);
    const sed = barraVida(player.sed);
    const em = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`👤 Ficha de ${player.getFullName()}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '📋 Datos personales', value:
          `**Nombre:** ${player.getFullName()}\n**DNI:** \`${getDNI(user.id)}\`\n**Edad:** ${player.edad} años\n**Género:** ${player.genero === 'M' ? 'Masculino' : player.genero === 'F' ? 'Femenino' : 'No binario'}\n**Origen:** ${player.origen || 'Los Santos'}\n**Nacionalidad:** ${getPaisNombre(player.nacionalidad)}\n**Trabajo:** ${player.trabajo}`,
          inline: true },
        { name: '💰 Economía', value:
          `**Cash:** $${player.cash.toLocaleString()}\n**Banco:** $${player.bank.toLocaleString()}\n**Sucio:** $${player.dineroSucio.toLocaleString()}`,
          inline: true },
        { name: '❤️ Vitales', value:
          `**Salud:** ${salud} ${Math.floor(player.salud)}%\n**Hambre:** ${hambre} ${Math.floor(player.hambre)}%\n**Sed:** ${sed} ${Math.floor(player.sed)}%`,
          inline: false },
        { name: '⭐ Progreso', value:
          `**Nivel:** ${player.nivel}\n**XP:** ${player.xp}/${player.xpSiguienteNivel}\n**Trabajos:** ${player.trabajosRealizados}`,
          inline: true },
        { name: '🏴‍☠️ Criminal', value:
          `**Arrestos:** ${player.arrestos}\n**Multas:** ${player.multasRecibidas}\n**Robos:** ${player.robosRealizados}`,
          inline: true },
      )
      .setFooter({ text: `Registrado: ${player.creadoEn.toLocaleDateString('es-ES')}` })
      .setTimestamp();
    if (player.gangId) em.addFields({ name: '👥 Banda', value: `Rango: ${player.gangRango || 'Miembro'}`, inline: true });
    if (player.buscado) em.addFields({ name: '🚨 Estado', value: '⚠️ **BUSCADO POR LA POLICÍA**', inline: false });
    return em;
  },

  // ── Billetera / Banco ─────────────────────────────────────────────────────
  billetera: (player) => {
    const tieneAhorros = player.bankAhorros > 0 || !!player.pinBancoAhorros;
    const patrimonio   = player.cash + player.bank + (player.bankAhorros || 0);

    const fields = [
      { name: '💵 Cash en mano',     value: `$${player.cash.toLocaleString()}`,        inline: true },
      { name: '🏦 Cuenta corriente', value: `$${player.bank.toLocaleString()}`,        inline: true },
      { name: '🧹 Dinero sucio',     value: `$${player.dineroSucio.toLocaleString()}`, inline: true },
    ];

    if (tieneAhorros) {
      fields.push({ name: '💰 Cuenta de ahorros', value: `$${(player.bankAhorros || 0).toLocaleString()}`, inline: true });
      fields.push({ name: '​', value: '​', inline: true }); // padding
      fields.push({ name: '​', value: '​', inline: true }); // padding
    }

    fields.push({ name: '💎 Patrimonio total', value: `**$${patrimonio.toLocaleString()}**`, inline: false });

    const em = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle('🏦  LS National Bank')
      .setDescription(`> Estado de cuenta  —  **${player.nombre ? player.getFullName() : 'Sin personaje'}**`)
      .setThumbnail(ICONS.banco)
      .addFields(...fields)
      .setFooter({ text: `DNI Titular: ${getDNI(player.discordId)}  ·  AmericanRP  ·  Economía` })
      .setTimestamp();
    addImage(em, 'banco');
    return em;
  },

  // ── Inventario ────────────────────────────────────────────────────────────
  inventario: (inv, nombre) => {
    const items = inv.items.length === 0
      ? '*Inventario vacío*'
      : inv.items.map(i => `${i.emoji || '📦'} **${i.nombre}** x${i.cantidad}${i.equipado ? ' _(equipado)_' : ''}`).join('\n');
    return new EmbedBuilder()
      .setColor(config.colors.purple)
      .setTitle(`🎒 Inventario de ${nombre}`)
      .setDescription(items)
      .addFields({ name: 'Capacidad', value: `${inv.countItems()}/${inv.capacidadMax} slots`, inline: true })
      .setTimestamp();
  },

  // ── Legacy rp (compatibilidad) ────────────────────────────────────────────
  rp: (accion, autor, texto, footer = '') => new EmbedBuilder()
    .setColor(config.colors.dark)
    .setDescription(`*${texto}*`)
    .setAuthor({ name: `${accion} | ${autor}` })
    .setFooter({ text: footer || 'AmericanRP RP' })
    .setTimestamp(),
};

E.barraVida = barraVida;
module.exports = E;
