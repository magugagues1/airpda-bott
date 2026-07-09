/**
 * ROBOS — Sistema completo de atracos con minijuegos
 * Slash: /atracar /secuestrar /robos
 * Prefix: !atracar !secuestrar !robos
 *
 * Niveles según reglamento:
 *  EXPRESS  → Licorerías, Peluquerías, Tatuajes, Casas, Desguace, Importación
 *  MEDIANOS → Badulaque/LTD, Tiendas Ropa, Desguace (establecimiento)
 *  MAYORES  → Electrónica, Pawnshop, Farmacia/Ammu, Yate, Joyería
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
} = require('discord.js');
const { getPlayer, getInventory, formatCooldown, formatMoney, rand } = require('../utils/helpers');
const E = require('../utils/embeds');
const config = require('../config');
const { ICONS, BANNERS, addImage } = require('../utils/images');
const GuildConfig = require('../database/models/GuildConfig');

// ─── Catálogo de robos ────────────────────────────────────────────────────────
const ROBOS = {
  // ── EXPRESS ─────────────────────────────────────────────────────────────────
  licoreria: {
    nombre: 'Licorería',
    nivel: 'express',
    emoji: '🍾',
    imagen: 'https://i.imgur.com/RFJxAM2.png',
    rewardMin: 500,  rewardMax: 1500,
    failChance: 0.20,
    cooldown: 20 * 60 * 1000,
    minPolicia: 1, maxPolicia: 2,
    maxAtracadores: 1,
    armas: 'Solo armas blancas',
    descripcion: 'Una rápida licorería. Botín en efectivo y bebidas.',
    items: [{ id: 'alcohol', nombre: 'Botella de alcohol', emoji: '🍾', cantidad: [1, 3] }],
  },
  peluqueria: {
    nombre: 'Peluquería',
    nivel: 'express',
    emoji: '✂️',
    imagen: 'https://i.imgur.com/lBVkuoh.png',
    rewardMin: 300,  rewardMax: 800,
    failChance: 0.18,
    cooldown: 15 * 60 * 1000,
    minPolicia: 1, maxPolicia: 2,
    maxAtracadores: 1,
    armas: 'Solo armas blancas',
    descripcion: 'La peluquería del barrio. No esperes mucho.',
    items: [],
  },
  tatuajes: {
    nombre: 'Estudio de Tatuajes',
    nivel: 'express',
    emoji: '🖊️',
    imagen: 'https://i.imgur.com/5u7Xw3f.png',
    rewardMin: 400,  rewardMax: 1000,
    failChance: 0.20,
    cooldown: 20 * 60 * 1000,
    minPolicia: 1, maxPolicia: 2,
    maxAtracadores: 1,
    armas: 'Solo armas blancas',
    descripcion: 'El dinero de la caja y algo de equipo.',
    items: [{ id: 'tinta', nombre: 'Tinta de tatuaje', emoji: '🖊️', cantidad: [1, 2] }],
  },
  casa: {
    nombre: 'Robo de Casa',
    nivel: 'express',
    emoji: '🏠',
    imagen: 'https://i.imgur.com/Qcn3Hap.png',
    rewardMin: 200,  rewardMax: 600,
    failChance: 0.22,
    cooldown: 25 * 60 * 1000,
    minPolicia: 1, maxPolicia: 2,
    maxAtracadores: 1,
    armas: 'Solo armas blancas',
    descripcion: 'Entrar sigilosamente a robar una casa. Cuidado con la familia.',
    items: [
      { id: 'electronico', nombre: 'Electrónico robado', emoji: '📱', cantidad: [1, 2] },
      { id: 'joya_barata', nombre: 'Joya barata', emoji: '💍', cantidad: [0, 1] },
    ],
  },
  importacion: {
    nombre: 'Coche de Importación',
    nivel: 'express',
    emoji: '🚗',
    imagen: 'https://i.imgur.com/Whe9KSJ.png',
    rewardMin: 1200,  rewardMax: 4000,
    failChance: 0.30,
    cooldown: 30 * 60 * 1000,
    minPolicia: 2, maxPolicia: 4,
    maxAtracadores: 2,
    armas: 'Pistola permitida',
    descripcion: 'Robar un coche de alta gama para llevarlo al desguace.',
    items: [{ id: 'piezas_lujo', nombre: 'Piezas de lujo', emoji: '⚙️', cantidad: [1, 3] }],
  },

  // ── MEDIANOS ─────────────────────────────────────────────────────────────────
  badulaque: {
    nombre: 'Badulaque / LTD',
    nivel: 'mediano',
    emoji: '🏪',
    imagen: 'https://i.imgur.com/7KmxUiY.png',
    rewardMin: 800,  rewardMax: 2000,
    failChance: 0.28,
    cooldown: 35 * 60 * 1000,
    minPolicia: 1, maxPolicia: 4,
    maxAtracadores: 2,
    armas: 'Solo armas blancas',
    descripcion: 'La tienda de la esquina. Más botín que una licorería.',
    items: [{ id: 'comida', nombre: 'Comida robada', emoji: '🥫', cantidad: [2, 5] }],
  },
  ropa: {
    nombre: 'Tienda de Ropa',
    nivel: 'mediano',
    emoji: '👕',
    imagen: 'https://i.imgur.com/9u3qBkg.png',
    rewardMin: 600,  rewardMax: 1500,
    failChance: 0.26,
    cooldown: 30 * 60 * 1000,
    minPolicia: 1, maxPolicia: 4,
    maxAtracadores: 2,
    armas: 'Solo armas blancas',
    descripcion: 'Ropa de marca y algo de caja.',
    items: [{ id: 'ropa_robada', nombre: 'Ropa robada', emoji: '👕', cantidad: [2, 6] }],
  },
  desguace: {
    nombre: 'Desguace (Establecimiento)',
    nivel: 'mediano',
    emoji: '🔧',
    imagen: 'https://i.imgur.com/6nCN9Ux.png',
    rewardMin: 1000,  rewardMax: 2500,
    failChance: 0.30,
    cooldown: 40 * 60 * 1000,
    minPolicia: 1, maxPolicia: 4,
    maxAtracadores: 2,
    armas: 'Solo armas blancas',
    rehenes: 1,
    descripcion: 'El almacén de piezas. Requiere 1 rehén NPC.',
    items: [{ id: 'piezas_coche', nombre: 'Piezas de coche', emoji: '⚙️', cantidad: [3, 8] }],
  },

  // ── MAYORES (Solo Bandas Oficiales) ─────────────────────────────────────────
  electronica: {
    nombre: 'Tienda de Electrónica',
    nivel: 'mayor',
    emoji: '📱',
    imagen: 'https://i.imgur.com/kDxLtgf.png',
    rewardMin: 3000,  rewardMax: 8000,
    failChance: 0.40,
    cooldown: 60 * 60 * 1000,
    minPolicia: 2, maxPolicia: 6,
    maxAtracadores: 3,
    armas: 'Pistola permitida',
    bandaOficial: true,
    descripcion: 'Dispositivos electrónicos y dinero en caja.',
    items: [
      { id: 'laptop', nombre: 'Laptop robada', emoji: '💻', cantidad: [1, 3] },
      { id: 'movil_gama', nombre: 'Móvil gama alta', emoji: '📱', cantidad: [2, 5] },
    ],
  },
  pawnshop: {
    nombre: 'Pawnshop',
    nivel: 'mayor',
    emoji: '🏷️',
    imagen: 'https://i.imgur.com/3U9wBG1.png',
    rewardMin: 2500,  rewardMax: 6000,
    failChance: 0.38,
    cooldown: 60 * 60 * 1000,
    minPolicia: 2, maxPolicia: 6,
    maxAtracadores: 3,
    armas: 'Pistola permitida',
    bandaOficial: true,
    descripcion: 'Casa de empeños. Joyas y efectivo.',
    items: [
      { id: 'joya', nombre: 'Joya empeñada', emoji: '💍', cantidad: [1, 4] },
      { id: 'reloj_lujo', nombre: 'Reloj de lujo', emoji: '⌚', cantidad: [0, 2] },
    ],
  },
  farmacia: {
    nombre: 'Farmacia / Ammu-Nation',
    nivel: 'mayor',
    emoji: '💊',
    imagen: 'https://i.imgur.com/cW2vdDV.png',
    rewardMin: 4000,  rewardMax: 10000,
    failChance: 0.42,
    cooldown: 75 * 60 * 1000,
    minPolicia: 4, maxPolicia: 6,
    maxAtracadores: 4,
    armas: 'Pistola permitida',
    bandaOficial: true,
    descripcion: 'Medicamentos y armas. Gran riesgo, gran recompensa.',
    items: [
      { id: 'medicamento', nombre: 'Medicamentos robados', emoji: '💊', cantidad: [5, 15] },
      { id: 'municion', nombre: 'Munición robada', emoji: '🔫', cantidad: [2, 6] },
    ],
  },
  yate: {
    nombre: 'Yate',
    nivel: 'mayor',
    emoji: '🛥️',
    imagen: 'https://i.imgur.com/VNmD8Z5.png',
    rewardMin: 8000,  rewardMax: 20000,
    failChance: 0.45,
    cooldown: 90 * 60 * 1000,
    minPolicia: 5, maxPolicia: 6,
    maxAtracadores: 8,
    armas: 'Pistola permitida',
    bandaOficial: true,
    descripcion: 'Un yate de lujo anclado en el puerto. Mucho dinero en juego.',
    items: [
      { id: 'joya_lujo', nombre: 'Joya de lujo', emoji: '💎', cantidad: [2, 5] },
      { id: 'alcohol_lujo', nombre: 'Champán de lujo', emoji: '🍾', cantidad: [3, 8] },
    ],
  },
  joyeria: {
    nombre: 'Joyería',
    nivel: 'mayor',
    emoji: '💎',
    imagen: 'https://i.imgur.com/2oNRFqJ.png',
    rewardMin: 15000,  rewardMax: 40000,
    failChance: 0.50,
    cooldown: 120 * 60 * 1000,
    minPolicia: 6, maxPolicia: 7,
    maxAtracadores: 5,
    armas: 'Pistola, Escopeta, SMG',
    bandaOficial: true,
    inicia2Tiros: true,
    descripcion: 'La joyería más grande de Los Santos. Rol a muerte. Se inicia con 2 tiros al aire.',
    items: [
      { id: 'diamante', nombre: 'Diamante', emoji: '💎', cantidad: [1, 4] },
      { id: 'collar_lujo', nombre: 'Collar de lujo', emoji: '📿', cantidad: [2, 6] },
      { id: 'anillo_oro', nombre: 'Anillo de oro', emoji: '💍', cantidad: [3, 8] },
    ],
  },
};

// ─── Minijuego de atraco ──────────────────────────────────────────────────────

async function ejecutarMinijuego(interaction, player, robo, inv) {
  const fases = robo.nivel === 'mayor' ? 3 : robo.nivel === 'mediano' ? 2 : 1;

  // Fase 1 — Preparación
  const prepEmbed = new EmbedBuilder()
    .setColor(0x1a1a2e)
    .setTitle(`${robo.emoji} Atraco — ${robo.nombre}`)
    .setDescription(
      `**Nivel:** ${robo.nivel.toUpperCase()}\n` +
      `**Policía necesaria:** ${robo.minPolicia}-${robo.maxPolicia} unidades\n` +
      `**Atracadores máx:** ${robo.maxAtracadores}\n` +
      `**Armas:** ${robo.armas}\n\n` +
      `> ${robo.descripcion}\n\n` +
      `💰 **Botín estimado:** ${formatMoney(robo.rewardMin)} — ${formatMoney(robo.rewardMax)} (dinero sucio)\n` +
      `⚠️ **Riesgo de fallo:** ${Math.round(robo.failChance * 100)}%\n` +
      (robo.inicia2Tiros ? '\n🔫 **Este robo se inicia con 2 disparos al aire.**\n' : '') +
      (robo.bandaOficial ? '\n👥 **Solo Bandas Oficiales.**\n' : ''),
    )
    .setThumbnail(robo.imagen)
    .setFooter({ text: 'Tienes 30 segundos para confirmar' })
    .setTimestamp();

  const rowPrep = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rob_iniciar').setLabel('🔫 Iniciar atraco').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('rob_cancelar').setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary),
  );

  const msg = await interaction.editReply({ embeds: [prepEmbed], components: [rowPrep] });

  let confirmacion;
  try {
    confirmacion = await msg.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id && ['rob_iniciar', 'rob_cancelar'].includes(i.customId),
      time: 30_000,
      componentType: ComponentType.Button,
    });
  } catch {
    await interaction.editReply({ embeds: [E.warn('Tiempo agotado', 'No confirmaste el atraco a tiempo.')], components: [] });
    return;
  }

  if (confirmacion.customId === 'rob_cancelar') {
    await confirmacion.update({ embeds: [E.info('Cancelado', 'Atraco cancelado.')], components: [] });
    return;
  }

  // Fase 2 — Minijuego de ejecución
  for (let fase = 1; fase <= fases; fase++) {
    const pasoEmbed = new EmbedBuilder()
      .setColor(0xff4444)
      .setTitle(`🔫 ATRACO EN CURSO — Fase ${fase}/${fases}`)
      .setDescription(
        fase === 1
          ? `⚡ **Entra y amenaza al personal.**\nHaz clic en el botón correcto en los próximos **15 segundos**.`
          : fase === 2
          ? `💰 **Recoge el botín.**\nSigue con la secuencia correcta.`
          : `🚗 **¡Huye! La policía está en camino.**\nÚltima oportunidad.`,
      )
      .setFooter({ text: `Fase ${fase} de ${fases} — 15 segundos` })
      .setTimestamp();

    // Generar 4 botones con uno correcto
    const botones = ['🔴', '🟡', '🟢', '🔵'].sort(() => Math.random() - 0.5);
    const correcto = botones[rand(0, 3)];
    const rowFase = new ActionRowBuilder().addComponents(
      botones.map(b =>
        new ButtonBuilder()
          .setCustomId(`rob_fase_${b}`)
          .setLabel(b)
          .setStyle(ButtonStyle.Primary),
      ),
    );

    let faseMsg;
    if (fase === 1) {
      faseMsg = await confirmacion.update({ embeds: [pasoEmbed], components: [rowFase], fetchReply: true });
    } else {
      faseMsg = await interaction.editReply({ embeds: [pasoEmbed], components: [rowFase] });
    }

    let respuesta;
    try {
      respuesta = await faseMsg.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith('rob_fase_'),
        time: 15_000,
        componentType: ComponentType.Button,
      });
    } catch {
      // Tiempo agotado = fallo
      await interaction.editReply({ embeds: [falloEmbed(robo, player, 'tiempo')], components: [] });
      await aplicarFallo(player, robo);
      return;
    }

    const elegido = respuesta.customId.replace('rob_fase_', '');
    if (elegido !== correcto) {
      await respuesta.update({ embeds: [falloEmbed(robo, player, 'botón')], components: [] });
      await aplicarFallo(player, robo);
      return;
    }

    if (fase < fases) {
      await respuesta.update({ embeds: [new EmbedBuilder().setColor(0x00ff88).setTitle(`✅ Fase ${fase} superada — Continúa...`).setTimestamp()], components: [] });
      await new Promise(r => setTimeout(r, 2000));
    } else {
      await respuesta.deferUpdate();
    }
  }

  // Comprobar fallo aleatorio final
  if (Math.random() < robo.failChance * 0.5) {
    await interaction.editReply({ embeds: [falloEmbed(robo, player, 'policía')], components: [] });
    await aplicarFallo(player, robo);
    return;
  }

  // ─── Éxito ────────────────────────────────────────────────────────────────
  const botín = rand(robo.rewardMin, robo.rewardMax);
  player.dineroSucio += botín;
  player.robosRealizados++;
  player.setCooldown(`rob_${robo.nombre}`, new Date());
  player.addXP(rand(30, 100));
  await player.save();

  // Items de botín
  const itemsGanados = [];
  for (const itemDef of robo.items) {
    const cant = rand(itemDef.cantidad[0], itemDef.cantidad[1]);
    if (cant > 0) {
      const added = inv.addItem({ id: itemDef.id, nombre: itemDef.nombre, emoji: itemDef.emoji, tipo: 'robo', valor: 100 }, cant);
      if (added) itemsGanados.push(`${itemDef.emoji} **${itemDef.nombre}** x${cant}`);
    }
  }
  await inv.save();

  const exitoEmbed = new EmbedBuilder()
    .setColor(0x00ff88)
    .setTitle(`✅ ATRACO EXITOSO — ${robo.emoji} ${robo.nombre}`)
    .setDescription(`¡Escapaste con el botín! La policía no llegó a tiempo.`)
    .setThumbnail(robo.imagen)
    .addFields(
      { name: '💊 Dinero sucio ganado', value: `**${formatMoney(botín)}**`, inline: true },
      { name: '🧹 Total dinero sucio', value: formatMoney(player.dineroSucio), inline: true },
      itemsGanados.length
        ? { name: '🎒 Items robados', value: itemsGanados.join('\n'), inline: false }
        : { name: '​', value: '​', inline: false },
    )
    .setFooter({ text: '💡 Blanquea el dinero sucio con /blanquear' })
    .setTimestamp();

  await interaction.editReply({ embeds: [exitoEmbed], components: [] });

  // ── Alerta automática al canal de policía ──────────────────────────────────
  try {
    const gc = await GuildConfig.findOne({ guildId: interaction.guildId });
    const canales = gc?.canales || {};
    // Prioridad: canal robos → policía → modLogs
    const alertChId = canales.robos || canales.policia || canales.modLogs;
    if (alertChId) {
      const ch = await interaction.guild.channels.fetch(alertChId).catch(() => null);
      if (ch) {
        const dni = require('../utils/embeds').getDNI(interaction.user.id);
        const alertEmbed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle(`🚨 ALERTA POLICIAL — ATRACO ACTIVO`)
          .setDescription(
            `Se ha registrado un atraco en **${robo.emoji} ${robo.nombre}**.\n` +
            `El perpetrador ha escapado con el botín.`,
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🏴‍☠️ Perpetrador',  value: `<@${interaction.user.id}> — **${player.getFullName()}**`, inline: true },
            { name: '🪪 DNI',           value: `\`${dni}\``,                                               inline: true },
            { name: '💼 Trabajo',       value: player.trabajo || 'Desempleado',                           inline: true },
            { name: '📍 Establecimiento', value: `${robo.emoji} ${robo.nombre} (Nivel: ${robo.nivel.toUpperCase()})`, inline: true },
            { name: '💊 Botín estimado', value: `**${formatMoney(botín)}** en dinero sucio`,               inline: true },
            { name: '⚠️ Armas',         value: robo.armas,                                                inline: true },
            { name: '📊 Historial',     value: `Arrestos: ${player.arrestos} · Robos: ${player.robosRealizados}`, inline: false },
          )
          .setFooter({ text: `AmericanRP  ·  Sistema de Robos  •  ${new Date().toLocaleTimeString('es-ES')}` })
          .setTimestamp();

        if (robo.imagen) alertEmbed.setThumbnail(robo.imagen);

        await ch.send({ content: '🚨 @here', embeds: [alertEmbed] }).catch(() =>
          ch.send({ embeds: [alertEmbed] }),
        );
      }
    }
  } catch (e) {
    console.error('[Robos alert]', e.message);
  }
}

function falloEmbed(robo, player, motivo) {
  const motivos = {
    tiempo: '⏰ No actuaste a tiempo. ¡La policía te atrapó!',
    botón: '🚨 Pulsaste el botón equivocado. ¡Alarma disparada!',
    policía: '🚔 La policía llegó demasiado rápido. No pudiste escapar.',
  };
  const em = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle(`❌ ATRACO FALLIDO — ${robo.emoji} ${robo.nombre}`)
    .setThumbnail(ICONS.policia)
    .setDescription(motivos[motivo] || 'El atraco falló.')
    .addFields(
      { name: '📉 Consecuencias', value: 'Pierdes salud y quedas expuesto a la policía.', inline: false },
    )
    .setFooter({ text: `Cooldown activo: ${formatCooldown(robo.cooldown)}` })
    .setTimestamp();
  if (robo.imagen) em.setImage(robo.imagen);
  return em;
}

async function aplicarFallo(player, robo) {
  const daño = rand(15, 40);
  player.salud = Math.max(0, player.salud - daño);
  player.arrestos++;
  player.setCooldown(`rob_${robo.nombre}`, new Date());
  if (player.salud <= 0) {
    player.muerto = true;
    player.enHospital = true;
    player.tiempoHospital = new Date(Date.now() + 5 * 60 * 1000);
  }
  await player.save();
}

// ─── Slash commands ───────────────────────────────────────────────────────────
const data = [
  new SlashCommandBuilder()
    .setName('atracar')
    .setDescription('Atracar un establecimiento con minijuego interactivo')
    .addStringOption(o =>
      o.setName('lugar')
        .setDescription('¿Dónde vas a atracar?')
        .setRequired(true)
        .addChoices(
          { name: '🍾 Licorería (Express)', value: 'licoreria' },
          { name: '✂️ Peluquería (Express)', value: 'peluqueria' },
          { name: '🖊️ Tatuajes (Express)', value: 'tatuajes' },
          { name: '🏠 Casa (Express)', value: 'casa' },
          { name: '🚗 Coche de Importación (Express)', value: 'importacion' },
          { name: '🏪 Badulaque/LTD (Mediano)', value: 'badulaque' },
          { name: '👕 Tienda de Ropa (Mediano)', value: 'ropa' },
          { name: '🔧 Desguace (Mediano)', value: 'desguace' },
          { name: '📱 Tienda Electrónica (Mayor)', value: 'electronica' },
          { name: '🏷️ Pawnshop (Mayor)', value: 'pawnshop' },
          { name: '💊 Farmacia/Ammu-Nation (Mayor)', value: 'farmacia' },
          { name: '🛥️ Yate (Mayor)', value: 'yate' },
          { name: '💎 Joyería (Mayor)', value: 'joyeria' },
        ),
    ),

  new SlashCommandBuilder()
    .setName('robos')
    .setDescription('Ver disponibilidad de robos y lista de establecimientos'),

  new SlashCommandBuilder()
    .setName('secuestrar')
    .setDescription('Secuestrar a un usuario (apuntarle a la cabeza)')
    .addUserOption(o => o.setName('victima').setDescription('Usuario a secuestrar').setRequired(true))
    .addStringOption(o => o.setName('metodo').setDescription('Método de secuestro').setRequired(false)
      .addChoices(
        { name: '🎯 Por la espalda apuntando a la cabeza', value: 'espalda' },
        { name: '🚗 Metido en un coche', value: 'coche' },
        { name: '👊 Inconsciente', value: 'inconsciente' },
      )),
];

async function execute(interaction, client) {
  const cmd = interaction.commandName;

  if (cmd === 'robos') {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🏴‍☠️ Sistema de Robos — AmericanRP')
      .setThumbnail(ICONS.atracar)
      .setDescription('Lista de todos los robos disponibles y sus requisitos.')
      .addFields(
        {
          name: '⚡ EXPRESS — Sin aviso policial',
          value: Object.entries(ROBOS)
            .filter(([, r]) => r.nivel === 'express')
            .map(([k, r]) => `${r.emoji} **${r.nombre}** · Botín: ${formatMoney(r.rewardMin)}-${formatMoney(r.rewardMax)} · Policía: ${r.minPolicia}-${r.maxPolicia}`)
            .join('\n'),
        },
        {
          name: '⚠️ MEDIANOS — Usar /robos para verificar',
          value: Object.entries(ROBOS)
            .filter(([, r]) => r.nivel === 'mediano')
            .map(([k, r]) => `${r.emoji} **${r.nombre}** · Botín: ${formatMoney(r.rewardMin)}-${formatMoney(r.rewardMax)} · Policía: ${r.minPolicia}-${r.maxPolicia}`)
            .join('\n'),
        },
        {
          name: '🔥 MAYORES — Solo Bandas Oficiales + Esperar policía',
          value: Object.entries(ROBOS)
            .filter(([, r]) => r.nivel === 'mayor')
            .map(([k, r]) => `${r.emoji} **${r.nombre}** · Botín: ${formatMoney(r.rewardMin)}-${formatMoney(r.rewardMax)} · Policía: ${r.minPolicia}-${r.maxPolicia}`)
            .join('\n'),
        },
      )
      .setFooter({ text: 'Usa /atracar [lugar] para iniciar un robo' })
      .setTimestamp();
    addImage(embed, 'robar');

    return interaction.reply({ embeds: [embed], ephemeral: false });
  }

  if (cmd === 'secuestrar') {
    const victima = interaction.options.getUser('victima');
    const metodo = interaction.options.getString('metodo') || 'espalda';
    const player = await getPlayer(interaction.user.id, interaction.user.username);
    if (!player.personajeCreado) return interaction.reply({ embeds: [E.err('Sin personaje', 'Necesitas un personaje para secuestrar.')], ephemeral: true });

    const targetPlayer = await getPlayer(victima.id, victima.username);
    if (!targetPlayer.personajeCreado) return interaction.reply({ embeds: [E.err('Sin personaje', 'Esa persona no tiene personaje.')], ephemeral: true });

    const metodos = {
      espalda: `**${player.getFullName()}** agarra a **${targetPlayer.getFullName()}** por la espalda y le apunta a la cabeza con un arma. *"No te muevas o disparo."*`,
      coche: `**${player.getFullName()}** fuerza a **${targetPlayer.getFullName()}** a subir a un vehículo a punta de pistola.`,
      inconsciente: `**${player.getFullName()}** deja inconsciente a **${targetPlayer.getFullName()}** y lo secuestra.`,
    };

    const embed = new EmbedBuilder()
      .setColor(0x1a0000)
      .setTitle('🚨 SECUESTRO')
      .setDescription(metodos[metodo])
      .addFields(
        { name: '👤 Secuestrador', value: `<@${interaction.user.id}> — ${player.getFullName()}`, inline: true },
        { name: '🎯 Víctima', value: `<@${victima.id}> — ${targetPlayer.getFullName()}`, inline: true },
      )
      .setFooter({ text: 'AmericanRP RP · Secuestro activo' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Notificar a la víctima por DM
    try {
      await victima.send({
        embeds: [new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('🚨 Has sido secuestrado')
          .setDescription(`**${player.getFullName()}** te ha secuestrado en el servidor.\n\nMétodo: **${metodos[metodo].split('**')[4] || metodo}**\n\n*Coopera con el rol.*`)
          .setTimestamp()],
      });
    } catch {}
    return;
  }

  // cmd === 'atracar'
  const lugarKey = interaction.options.getString('lugar');
  const robo = ROBOS[lugarKey];
  if (!robo) return interaction.reply({ embeds: [E.err('Error', 'Lugar inválido.')], ephemeral: true });

  await interaction.deferReply();

  const player = await getPlayer(interaction.user.id, interaction.user.username);
  if (!player.personajeCreado) return interaction.editReply({ embeds: [E.err('Sin personaje', 'Necesitas un personaje.')] });
  if (player.muerto || player.enHospital) return interaction.editReply({ embeds: [E.err('No disponible', 'No puedes atracar estando herido o en el hospital.')] });
  if (player.enCarcel) return interaction.editReply({ embeds: [E.err('En cárcel', 'No puedes atracar desde la cárcel.')] });

  // Cooldown check
  const lastRob = player.getCooldown(`rob_${robo.nombre}`);
  if (lastRob) {
    const remaining = lastRob.getTime() + robo.cooldown - Date.now();
    if (remaining > 0) {
      return interaction.editReply({ embeds: [E.warn('Cooldown', `Debes esperar **${formatCooldown(remaining)}** para atracar ${robo.nombre} de nuevo.`)] });
    }
  }

  const inv = await getInventory(interaction.user.id);
  await ejecutarMinijuego(interaction, player, robo, inv);
}

// ─── Prefix commands ──────────────────────────────────────────────────────────
const prefixCommands = [
  {
    name: 'atracar',
    aliases: ['rob', 'heist'],
    description: '!atracar [lugar] — Atracar un establecimiento',
    async run(message, args) {
      if (!args[0]) {
        const lista = Object.entries(ROBOS).map(([k, r]) => `\`!atracar ${k}\` — ${r.emoji} ${r.nombre}`).join('\n');
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.colors.primary).setTitle('🏴‍☠️ Lugares disponibles').setDescription(lista).setTimestamp()] });
      }
      const robo = ROBOS[args[0].toLowerCase()];
      if (!robo) return message.reply('❌ Lugar inválido. Usa `!atracar` para ver la lista.');

      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('Sin personaje.');
      if (player.muerto || player.enHospital) return message.reply('❌ No puedes atracar estando herido.');
      if (player.enCarcel) return message.reply('❌ Estás en la cárcel.');

      const lastRob = player.getCooldown(`rob_${robo.nombre}`);
      if (lastRob) {
        const remaining = lastRob.getTime() + robo.cooldown - Date.now();
        if (remaining > 0) return message.reply(`⏳ Espera **${formatCooldown(remaining)}** para volver a atracar ${robo.nombre}.`);
      }

      // Versión simplificada para prefix (sin minijuego interactivo)
      player.setCooldown(`rob_${robo.nombre}`, new Date());

      const exito = Math.random() > robo.failChance;
      if (!exito) {
        const daño = rand(15, 35);
        player.salud = Math.max(0, player.salud - daño);
        player.arrestos++;
        await player.save();
        return message.reply({ embeds: [falloEmbed(robo, player, 'policía')] });
      }

      const botín = rand(robo.rewardMin, robo.rewardMax);
      player.dineroSucio += botín;
      player.robosRealizados++;
      player.addXP(rand(30, 80));
      await player.save();

      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x00ff88)
          .setTitle(`✅ Atraco exitoso — ${robo.emoji} ${robo.nombre}`)
          .setDescription(`Escapaste con **${formatMoney(botín)}** en dinero sucio.`)
          .setTimestamp()],
      });
    },
  },
  {
    name: 'robos',
    aliases: ['listrobos'],
    description: '!robos — Ver lista de robos disponibles',
    async run(message) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🏴‍☠️ Robos Disponibles')
        .setDescription('Usa `!atracar [lugar]` o `/atracar [lugar]`')
        .addFields(
          { name: '⚡ Express', value: Object.values(ROBOS).filter(r => r.nivel === 'express').map(r => `${r.emoji} ${r.nombre}`).join(', ') },
          { name: '⚠️ Medianos', value: Object.values(ROBOS).filter(r => r.nivel === 'mediano').map(r => `${r.emoji} ${r.nombre}`).join(', ') },
          { name: '🔥 Mayores', value: Object.values(ROBOS).filter(r => r.nivel === 'mayor').map(r => `${r.emoji} ${r.nombre}`).join(', ') },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    },
  },
];

module.exports = { data, execute, prefixCommands };
