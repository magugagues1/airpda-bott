/**
 * RP — Comandos de roleplay en canal (prefix)
 * !me !do !entorno !susurro !grito !pensar !ooc !it !golpear !intentar !carta
 * !anuncio !radio !morir !dado !descripcion !limpiar !mirar
 * !911 — llamada interactiva con botones + auto-envío al canal de emergencias
 */
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const { getPlayer, getInventory } = require('../utils/helpers');
const E = require('../utils/embeds');
const config = require('../config');
const { getPaisNombre } = require('../data/paises');
const GuildConfig = require('../database/models/GuildConfig');
const path = require('path');

const MAPA_DIR = path.join(__dirname, '..', 'assets');

async function getPersonaje(discordId, username) {
  const p = await getPlayer(discordId, username);
  if (!p.personajeCreado) return null;
  return p;
}

let _cv = undefined;
let _fontsRegistered = false;
function getCanvasLib() {
  if (_cv === undefined) _cv = require('@napi-rs/canvas');
  if (!_fontsRegistered) {
    _fontsRegistered = true;
    try {
      const path = require('path');
      _cv.GlobalFonts.registerFromPath(path.join(__dirname, '..', 'assets', 'fonts', 'Inter-Regular.ttf'), 'UIFont');
      _cv.GlobalFonts.registerFromPath(path.join(__dirname, '..', 'assets', 'fonts', 'Inter-Bold.ttf'), 'UIFont');
    } catch (e) {
      console.error('[Font]', e.message);
    }
  }
  return _cv;
}

async function sendRpEmbed(message, embed, deleteOriginal = true) {
  if (deleteOriginal) await message.delete().catch(() => {});
  return message.channel.send({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
const RP_CATEGORIES = ['1441818965218431035', '1441818964933214358', '1481323333445357789', '1441818965444792408'];
const RP_ALLOWED_CHANNELS = ['1441818964748537989'];
const RP_STAFF_ROLE = '1441818963133731016';
const FORBIDDEN_CHANNELS = ['1441818965218431029', '1500230610071982090', '1441818964748537990', '1441818964748537988'];

function canRP(message) {
  if (message.author.permissions?.has('ManageMessages')) return true;
  if (message.member?.roles.cache.has(RP_STAFF_ROLE)) return true;
  if (FORBIDDEN_CHANNELS.includes(message.channelId)) return false;
  if (RP_ALLOWED_CHANNELS.includes(message.channelId)) return true;
  if (!message.channel?.parentId) return false;
  return RP_CATEGORIES.includes(message.channel.parentId);
}

function checkRP(message, cmdName) {
  if (!canRP(message)) {
    message.reply(`❌ Los comandos RP solo pueden usarse en canales de roleplay.`);
    return false;
  }
  return true;
}

// ─── Vitalidad ────────────────────────────────────────────────────────────────
async function checkVitals(message) {
  try {
    const { getPlayer } = require('../utils/helpers');
    const p = await getPlayer(message.author.id, message.author.username);
    if (!p.personajeCreado) return true;
    if (Math.floor(p.hambre) <= 5) {
      message.reply('🍔 **Tienes hambre.** Necesitas comer antes de hacer acciones. Usa `!usar comida`.');
      return false;
    }
    if (Math.floor(p.sed) <= 5) {
      message.reply('💧 **Tienes sed.** Necesitas beber antes de hacer acciones. Usa `!usar agua`.');
      return false;
    }
    return true;
  } catch { return true; }
}

async function drainVitals(message, costoHambre = 0.5, costoSed = 0.5) {
  try {
    const { getPlayer } = require('../utils/helpers');
    const p = await getPlayer(message.author.id, message.author.username);
    if (!p.personajeCreado) return;
    // Solo drenar si pasaron al menos 10s desde el último drenaje
    const last = p.getCooldown('vital_drain');
    if (last && Date.now() - last.getTime() < 10000) return;
    p.setCooldown('vital_drain', new Date());
    p.hambre = Math.max(0, (p.hambre || 100) - costoHambre);
    p.sed = Math.max(0, (p.sed || 100) - costoSed);
    await p.save();
  } catch {}
}

const prefixCommands = [

  // !me [accion] — Acción del personaje
  {
    name: 'me',
    description: '!me [acción] — Tu personaje realiza una acción',
    async run(message, args) {
      if (!checkRP(message, 'me') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!me [acción]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje. Usa `/personaje crear`.');
      const texto = args.join(' ');
      const avatarUrl = message.author.displayAvatarURL({ dynamic: true });
      const embed = E.meEmbed(player, texto, avatarUrl);
      await sendRpEmbed(message, embed);
    },
  },

  // !do [descripción] — Describir la escena o situación
  {
    name: 'do',
    aliases: ['descripcion'],
    description: '!do [descripción] — Describe algo en la escena',
    async run(message, args) {
      if (!checkRP(message, 'do') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!do [descripción]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const texto = args.join(' ');
      const avatarUrl = message.author.displayAvatarURL({ dynamic: true });
      const embed = E.doEmbed(player, texto, avatarUrl);
      await sendRpEmbed(message, embed);
    },
  },

  // !entorno [descripción] — Narrar el ambiente
  {
    name: 'entorno',
    aliases: ['env', 'ambiente'],
    description: '!entorno [descripción] — Describe el entorno',
    async run(message, args) {
      if (!checkRP(message, 'entorno') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!entorno [descripción]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const texto = args.join(' ');
      const embed = new EmbedBuilder()
        .setColor(0x475569)
        .setDescription(`🌍 *${texto}*`)
        .setAuthor({ name: `▸ ${player.getFullName()}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: 'Entorno  ·  AmericanRP RP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !susurro [texto]
  {
    name: 'susurro',
    aliases: ['s', 'susurrar', 'bajo'],
    description: '!susurro [texto] — Tu personaje susurra',
    async run(message, args) {
      if (!checkRP(message, 'susurro') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!susurro [texto]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const embed = new EmbedBuilder()
        .setColor(0x94a3b8)
        .setDescription(`🔇 *"${args.join(' ')}"*`)
        .setAuthor({ name: `▸ ${player.getFullName()}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: 'Susurro  ·  AmericanRP RP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !grito [texto]
  {
    name: 'grito',
    aliases: ['g', 'gritar'],
    description: '!grito [texto] — Tu personaje grita',
    async run(message, args) {
      if (!checkRP(message, 'grito') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!grito [texto]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setDescription(`📢 **"${args.join(' ').toUpperCase()}"**`)
        .setAuthor({ name: `▸ ${player.getFullName()}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: 'Grito  ·  AmericanRP RP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !pensar [texto]
  {
    name: 'pensar',
    aliases: ['pienso', 'mente'],
    description: '!pensar [texto] — Pensamientos internos',
    async run(message, args) {
      if (!checkRP(message, 'pensar') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!pensar [texto]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setDescription(`💭 *${args.join(' ')}*`)
        .setAuthor({ name: `▸ ${player.getFullName()}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: 'Pensamiento  ·  AmericanRP RP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !ooc [texto] — Fuera de personaje
  {
    name: 'ooc',
    aliases: ['fuera', 'ic'],
    description: '!ooc [texto] — Hablar fuera de personaje',
    async run(message, args) {
      if (!checkRP(message, 'ooc') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!ooc [texto]`');
      const embed = new EmbedBuilder()
        .setColor(0x6b7280)
        .setAuthor({ name: `💬 OOC · ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setDescription(`**((** ${args.join(' ')} **))**`)
        .setFooter({ text: 'Fuera de personaje  ·  AmericanRP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !it [narración] — Narrador
  {
    name: 'it',
    aliases: ['narrador', 'narrar'],
    description: '!it [texto] — Narración en tercera persona',
    async run(message, args) {
      if (!checkRP(message, 'it') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!it [texto]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      const nombre = player ? player.getFullName() : message.author.username;
      const embed = new EmbedBuilder()
        .setColor(0x1d4ed8)
        .setDescription(`📖 ${args.join(' ')}`)
        .setAuthor({ name: `▸ ${nombre}` })
        .setFooter({ text: 'Narrador  ·  AmericanRP RP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !golpear [@usuario] [descripción]
  {
    name: 'golpear',
    aliases: ['atacar', 'pegar'],
    description: '!golpear @usuario [descripción] — Acción de combate RP',
    async run(message, args) {
      if (!checkRP(message, 'golpear') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      const target = message.mentions.users.first();
      if (!target) return message.reply('Uso: `!golpear @usuario [descripción]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      const targetPlayer = await getPlayer(target.id, target.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const desc = args.filter(a => !a.startsWith('<@')).join(' ') || 'intenta golpear';
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setDescription(`⚔️ **${player.getFullName()}** ${desc} a **${targetPlayer.personajeCreado ? targetPlayer.getFullName() : target.username}**`)
        .setAuthor({ name: `▸ ${player.getFullName()}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: 'Combate  ·  AmericanRP RP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !intentar [acción] — Tirada de dados
  {
    name: 'intentar',
    aliases: ['intento', 'tirada', 'dado'],
    description: '!intentar [acción] — Tirada de dados (1-100)',
    async run(message, args) {
      if (!checkRP(message, 'intentar') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!intentar [acción]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const accion = args.join(' ');
      const roll = Math.floor(Math.random() * 100) + 1;
      const resultado = roll >= 75 ? '✅ **ÉXITO**' : roll >= 40 ? '⚠️ **ÉXITO PARCIAL**' : '❌ **FALLO**';
      const color = roll >= 75 ? config.colors.success : roll >= 40 ? config.colors.warning : config.colors.danger;
      const embed = new EmbedBuilder()
        .setColor(color)
        .setDescription(`🎲 **${player.getFullName()}** intenta: *${accion}*\n\n**Tirada:** ${roll}/100 → ${resultado}`)
        .setAuthor({ name: `▸ ${player.getFullName()}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: 'Dados  ·  AmericanRP RP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !carta [texto]
  {
    name: 'carta',
    aliases: ['nota', 'escribir'],
    description: '!carta [texto] — Escribir una nota o carta RP',
    async run(message, args) {
      if (!checkRP(message, 'carta') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!carta [texto]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const embed = new EmbedBuilder()
        .setColor(0xfef3c7)
        .setTitle('📜 Nota / Carta')
        .setDescription(`*${args.join(' ')}*`)
        .setAuthor({ name: player.getFullName() })
        .setFooter({ text: 'AmericanRP RP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !anuncio [texto] — Anuncio público
  {
    name: 'anuncio',
    aliases: ['mic'],
    description: '!anuncio [texto] — Anuncio público RP',
    async run(message, args) {
      if (!checkRP(message, 'anuncio') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!anuncio [texto]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const embed = new EmbedBuilder()
        .setColor(0xfbbf24)
        .setDescription(`📣 **[ANUNCIO PÚBLICO]** ${args.join(' ')}`)
        .setAuthor({ name: player.getFullName(), iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: 'Anuncio  ·  AmericanRP RP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !dado [max]
  {
    name: 'dado',
    aliases: ['roll', 'dice', 'd'],
    description: '!dado [max=100] — Tirar dado',
    async run(message, args) {
      if (!checkRP(message, 'dado') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      const max = parseInt(args[0]) || 100;
      if (max < 2 || max > 10000) return message.reply('El máximo debe estar entre 2 y 10000.');
      const roll = Math.floor(Math.random() * max) + 1;
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setDescription(`🎲 ${message.author} tiró un **d${max}** → **${roll}**`)
        .setTimestamp();
      await sendRpEmbed(message, embed, false);
    },
  },

  // !descripcion [texto]
  {
    name: 'descripcion',
    aliases: ['desc', 'apariencia'],
    description: '!descripcion [texto] — Describir apariencia del personaje',
    async run(message, args) {
      if (!checkRP(message, 'descripcion') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!descripcion [texto]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const embed = new EmbedBuilder()
        .setColor(config.colors.purple)
        .setTitle(`👤 Descripción de ${player.getFullName()}`)
        .setDescription(args.join(' '))
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp();
      await sendRpEmbed(message, embed, false);
    },
  },

  // !radio [texto] — Comunicación por radio
  {
    name: 'radio',
    aliases: ['frecuencia'],
    description: '!radio [texto] — Comunicación por radio',
    async run(message, args) {
      if (!checkRP(message, 'radio') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      if (!args.length) return message.reply('Uso: `!radio [texto]`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const embed = new EmbedBuilder()
        .setColor(0x06b6d4)
        .setDescription(`📻 **[RADIO]** *"${args.join(' ')}"*`)
        .setAuthor({ name: `▸ ${player.getFullName()}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: 'Radio  ·  AmericanRP RP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !morir — Muerte de personaje
  {
    name: 'morir',
    aliases: ['muerte', 'ck', 'caer'],
    description: '!morir — Tu personaje cae/muere en RP',
    async run(message, args) {
      if (!checkRP(message, 'morir') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('Necesitas un personaje.');
      const embed = new EmbedBuilder()
        .setColor(0x111827)
        .setDescription(`💀 **${player.getFullName()}** ha caído...`)
        .setAuthor({ name: `▸ ${player.getFullName()}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: 'AmericanRP RP' })
        .setTimestamp();
      await sendRpEmbed(message, embed);
    },
  },

  // !mirar [@usuario] — Ver ficha / DNI de otro personaje
  {
    name: 'mirar',
    aliases: ['ver', 'identificar', 'ficha'],
    description: '!mirar [@usuario] — Ver la ficha pública de un personaje',
    async run(message, args) {
      if (!checkRP(message, 'mirar') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      const target = message.mentions.users.first() || message.author;
      const player = await getPlayer(target.id, target.username);
      if (!player.personajeCreado) return message.reply('❌ Esa persona no tiene personaje registrado.');
      const dni = E.getDNI(target.id);
      const embed = new EmbedBuilder()
        .setColor(0x1e3a5f)
        .setTitle(`🪪 Identificación — ${player.getFullName()}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '👤 Nombre completo', value: player.getFullName(), inline: true },
          { name: '🪪 DNI', value: `\`${dni}\``, inline: true },
          { name: '🎂 Edad', value: `${player.edad} años`, inline: true },
          { name: '🌍 Nacionalidad', value: getPaisNombre(player.nacionalidad), inline: true },
          { name: '💼 Trabajo', value: player.trabajo || 'Desempleado', inline: true },
          { name: '❤️ Estado', value: player.muerto ? '💀 Muerto' : player.enHospital ? '🏥 Hospital' : player.buscado ? '🚨 Buscado' : '✅ Normal', inline: true },
          { name: '📋 Descripción', value: player.descripcion || player.bio || '_Sin descripción registrada_', inline: false },
        )
        .setFooter({ text: 'AmericanRP  ·  Identificación RP' })
        .setTimestamp();
      if (player.buscado) embed.addFields({ name: '🚨 Alerta policial', value: '⚠️ **ESTE INDIVIDUO TIENE ORDEN DE ARRESTO**', inline: false });
      await sendRpEmbed(message, embed, false);
    },
  },

  // !dni — Ver tu DNI / tarjeta de identidad
  {
    name: 'dni',
    aliases: ['id', 'identidad'],
    description: '!dni — Ver tu tarjeta de identidad (DNI)',
    async run(message) {
      if (!checkRP(message, 'dni') || !(await checkVitals(message))) return;
      await drainVitals(message, 1, 1);
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('❌ No tienes personaje. Usa `/personaje crear`.');
      const dni = E.getDNI(message.author.id);
      const embed = new EmbedBuilder()
        .setColor(0x1e3a5f)
        .setTitle('🪪 Tarjeta de Identidad')
        .setDescription(`\`\`\`\nESTADO DE LOS SANTOS\nDEPARTMENT OF JUSTICE\nIDENTIFICATION CARD\n\`\`\``)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '👤 Nombre', value: player.getFullName(), inline: true },
          { name: '🪪 DNI', value: `\`${dni}\``, inline: true },
          { name: '🎂 Edad', value: `${player.edad} años`, inline: true },
          { name: '🌍 Nacionalidad', value: getPaisNombre(player.nacionalidad), inline: true },
          { name: '📅 Nacimiento', value: player.origen || 'Los Santos', inline: true },
          { name: '💼 Trabajo', value: player.trabajo || 'Desempleado', inline: true },
        )
        .setFooter({ text: `AmericanRP  ·  ID: ${dni}` })
        .setTimestamp();
      if (player.buscado) embed.addFields({ name: '🚨 Alerta', value: '⚠️ **BUSCADO POR LA POLICÍA**', inline: false });
      await message.channel.send({ embeds: [embed] });
    },
  },

  // !limpiar [n] — Borrar mensajes (mods)
  {
    name: 'limpiar',
    aliases: ['purge', 'prune', 'clear'],
    description: '!limpiar [n] — Borrar últimos n mensajes (mod)',
    async run(message, args) {
      if (!message.member.permissions.has('ManageMessages')) return message.reply('❌ No tienes permisos.');
      const n = Math.min(parseInt(args[0]) || 10, 100);
      const deleted = await message.channel.bulkDelete(n + 1, true);
      message.channel.send(`🗑️ Eliminados ${deleted.size - 1} mensajes.`)
        .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
    },
  },

  // ── !911 — Llamada de emergencia con operador ───────────────────────────
  {
    name: '911',
    aliases: ['emergencia', 'socorro'],
    description: '!911 — Llamar al 911 (operador automático)',
    async run(message, args, client) {
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('❌ Necesitas un personaje. Usa `/personaje crear`.');

      const preguntas = [
        { q: '**¿Cuál es tu nombre completo?**', key: 'nombreCompleto', desc: 'Proporciona tu nombre y apellido para el registro.' },
        { q: '**¿Qué vestimenta llevas puesta?**', key: 'vestimenta', desc: 'Describe tu ropa, colores y accesorios visibles.' },
        { q: '**¿Usas algún vehículo?**', key: 'vehiculo', desc: 'Marca, modelo, color y matrícula. Responde "ninguno" si no.' },
        { q: '**¿Llevas armas encima?**', key: 'armas', desc: 'Enumera qué armas llevas. Responde "ninguna" si no.' },
        { q: '**Describe la emergencia con detalles.**', key: 'notas', desc: 'Explica qué está pasando, cuántos implicados, etc.' },
      ];
      const respuestas = {};
      let msg = await message.channel.send({ embeds: [new EmbedBuilder().setColor(0x1e3a5f).setTitle('📞 Llamada al 911').setDescription('Conectando con la central de emergencias...').setTimestamp()] });
      await message.delete().catch(() => {});

      const filter = m => m.author.id === message.author.id;
      const cancelBtn = new ButtonBuilder().setCustomId('cancel_911').setLabel('❌ Cancelar llamada').setStyle(ButtonStyle.Danger);
      const rowCancel = new ActionRowBuilder().addComponents(cancelBtn);

      for (let i = 0; i < preguntas.length; i++) {
        const stepEmbed = new EmbedBuilder()
          .setColor(0x1e3a5f)
          .setTitle(`📞 Operador 911 — Paso ${i + 1}/${preguntas.length}`)
          .setDescription(
            `> ${preguntas[i].q}\n\n` +
            `*${preguntas[i].desc}*\n\n` +
            `📝 *Escribe tu respuesta en el chat o presiona el botón para cancelar.*`
          )
          .setFooter({ text: `⏱️ 60s para responder · ${i + 1}/${preguntas.length}` })
          .setTimestamp();

        await msg.edit({ embeds: [stepEmbed], components: [rowCancel] });

        try {
          const result = await Promise.race([
            message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).then(c => ({ type: 'msg', data: c.first() })),
            msg.awaitMessageComponent({ filter: i => i.user.id === message.author.id && i.customId === 'cancel_911', time: 60000 }).then(() => ({ type: 'cancel' })),
          ]);

          if (result.type === 'cancel') {
            await msg.edit({ embeds: [E.warn('Llamada cancelada', 'Has colgado tú mismo la llamada.')], components: [] });
            setTimeout(() => msg.delete().catch(() => {}), 5000);
            return;
          }

          const r = result.data;
          respuestas[preguntas[i].key] = r.content;
          await r.delete().catch(() => {});
        } catch {
          await msg.edit({ embeds: [E.err('⏱️ Tiempo agotado', 'La llamada al 911 ha expirado por inactividad.')], components: [] });
          setTimeout(() => msg.delete().catch(() => {}), 5000);
          return;
        }
      }

      // ─── Resumen de datos ────────────────────────────────────────────────
      const resumenEmbed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('✅ Datos registrados')
        .setDescription('Tus datos han sido registrados. Ahora selecciona la zona.')
        .addFields(
          Object.entries(respuestas).map(([k, v]) => ({ name: { nombreCompleto: '👤 Nombre', vestimenta: '👕 Vestimenta', vehiculo: '🚗 Vehículo', armas: '🔫 Armas', notas: '📝 Notas' }[k] || k, value: v || '—', inline: true }))
        )
        .setTimestamp();
      await msg.edit({ embeds: [resumenEmbed], components: [] });
      await new Promise(r => setTimeout(r, 1500));

      // ─── Selección de zona ──────────────────────────────────────────────
      const zoneEmbed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('📍 Selecciona tu zona')
        .setDescription('Elige la zona donde te encuentras para ver el mapa de códigos postales.')
        .setFooter({ text: 'Selecciona una zona con los botones · 30s' })
        .setTimestamp();

      const zoneRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('zona_ciudad').setLabel('🏙️ Ciudad').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('zona_gran_senora').setLabel('🌾 Gran Señora').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('zona_norte').setLabel('🏔️ Norte (Paleto)').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cancel_911_zona').setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger),
      );

      await msg.edit({ embeds: [zoneEmbed], components: [zoneRow] });

      let zona;
      try {
        const zonaInt = await msg.awaitMessageComponent({ filter: i => i.user.id === message.author.id, time: 30000 });
        if (zonaInt.customId === 'cancel_911_zona') {
          await msg.edit({ embeds: [E.warn('Llamada cancelada', 'Has cancelado la llamada voluntariamente.')], components: [] });
          setTimeout(() => msg.delete().catch(() => {}), 5000);
          return;
        }
        zona = zonaInt.customId.replace('zona_', '');
        await zonaInt.deferUpdate();
      } catch {
        await msg.edit({ embeds: [E.err('⏱️ Tiempo agotado', 'No seleccionaste zona a tiempo. Llamada cancelada.')], components: [] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        return;
      }

      const zonaNombre = { ciudad: '🏙️ Ciudad', gran_senora: '🌾 Gran Señora', norte: '🏔️ Norte (Paleto)' }[zona] || zona;
      const mapaFile = { ciudad: path.join(MAPA_DIR, 'mapa_ciudad.png'), gran_senora: path.join(MAPA_DIR, 'mapa_gran_señora.png'), norte: path.join(MAPA_DIR, 'mapa_norte.png') }[zona] || null;

      // ─── Pedir código postal ────────────────────────────────────────────
      const mapaEmbed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle(`📍 ${zonaNombre} — Mapa`)
        .setDescription('Indica el **código postal** numérico de tu ubicación.\n*Ej: 8082, 9012, 5123*')
        .setImage('attachment://mapa.png')
        .setFooter({ text: 'Escribe el código en el chat · 30s' })
        .setTimestamp();

      let mapaAttachment = mapaFile ? new AttachmentBuilder(mapaFile, { name: 'mapa.png' }) : null;
      await msg.edit({ embeds: [mapaEmbed], components: [], files: mapaAttachment ? [mapaAttachment] : [] });

      let codigoPostal = 'No especificado';
      const { getCoord } = require('../data/codigos_postales');
      for (let intentos = 0; intentos < 3; intentos++) {
        try {
          const cpCollected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
          codigoPostal = cpCollected.first().content;
          await cpCollected.first().delete().catch(() => {});
          const existe = getCoord(zona, codigoPostal);
          if (existe || intentos >= 2) break;
          await msg.edit({ embeds: [new EmbedBuilder().setColor(0xf59e0b).setTitle('📍 Código inválido').setDescription(`El código **${codigoPostal}** no existe en ${zonaNombre}.\n\nIntenta de nuevo o escribe "cancelar" para omitir.`).setImage('attachment://mapa.png').setTimestamp()], files: mapaAttachment ? [mapaAttachment] : [] });
        } catch {
          codigoPostal = 'No especificado';
          break;
        }
      }

      // Marcar código postal en el mapa usando Canvas
      if (codigoPostal !== 'No especificado' && mapaFile) {
        try {
          const cv = getCanvasLib();
          const img = await cv.loadImage(mapaFile);
          const c = cv.createCanvas(img.width, img.height);
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const coord = getCoord(zona, codigoPostal);
          if (coord) {
            const [x, y] = coord;
            ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,0,0,0.25)'; ctx.fill();
            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 4; ctx.stroke();
            ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#ff0000'; ctx.fill();
            ctx.font = 'bold 16px UIFont';
            ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
            ctx.fillText(codigoPostal, x, y + 40);
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(10, c.height - 60, c.width - 20, 42);
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 28px UIFont';
            ctx.textAlign = 'center';
            ctx.fillText(`CP: ${codigoPostal}`, c.width / 2, c.height - 28);
          }

          mapaAttachment = new AttachmentBuilder(c.toBuffer('image/png'), { name: 'mapa.png' });
        } catch (e) {
          console.error('[911 Canvas]', e.message);
        }
      }

      // ─── Selección de servicio ──────────────────────────────────────────
      const servEmbed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('🚨 ¿Qué servicio necesitas?')
        .setDescription('Selecciona el tipo de emergencia.')
        .setTimestamp();

      const servRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('serv_policia').setLabel('🚔 Policía').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('serv_medico').setLabel('🚑 Médico / EMS').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('serv_bomberos').setLabel('🚒 Bomberos').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('serv_todas').setLabel('📟 Todas las Emergencias').setStyle(ButtonStyle.Secondary),
      );

      await msg.edit({ embeds: [servEmbed], components: [servRow], files: [] });

      let servicio = 'policia';
      try {
        const servInt = await msg.awaitMessageComponent({ filter: i => i.user.id === message.author.id, time: 30000 });
        servicio = servInt.customId.replace('serv_', '');
        await servInt.deferUpdate();
      } catch {}

      // ─── Enviar alerta ──────────────────────────────────────────────────
      const servNombre = { policia: '🚔 Policía', medico: '🚑 Médico / EMS', bomberos: '🚒 Bomberos', todas: '📟 Todas las Emergencias' }[servicio] || servicio;
      const servRoles = { policia: '<@&1441818963125473436>', medico: '<@&1524872434417926327>', bomberos: '<@&1481316335496724551>', todas: '<@&1441818963125473436> <@&1524872434417926327> <@&1481316335496724551>' }[servicio] || '';

      const alertEmbed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle(`🚨 LLAMADA AL 911 — ${servNombre}`)
        .setDescription(
          `**👤 Nombre:** ${respuestas.nombreCompleto}\n` +
          `**👕 Vestimenta:** ${respuestas.vestimenta}\n` +
          `**🚗 Vehículo:** ${respuestas.vehiculo}\n` +
          `**🔫 Armas:** ${respuestas.armas}\n` +
          `**📝 Notas:** ${respuestas.notas}\n\n` +
          `**📍 Zona:** ${zonaNombre}\n` +
          `**📍 Código postal:** \`${codigoPostal}\``
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setImage(mapaAttachment ? 'attachment://mapa.png' : null)
        .setTimestamp()
        .setFooter({ text: 'AmericanRP · 911' });

      const alertaMapa = mapaAttachment || (mapaFile ? new AttachmentBuilder(mapaFile, { name: 'mapa.png' }) : null);

      let enviado = false;
      try {
        const ch = await message.guild.channels.fetch('1441818965218431029').catch(() => null);
        if (ch) {
          await ch.send({ content: servRoles || '🚨 **@here**', embeds: [alertEmbed], files: alertaMapa ? [alertaMapa] : [] });
          enviado = true;
        }
      } catch (err) {
        console.error('[911]', err.message);
      }

      // ─── Confirmación ──────────────────────────────────────────────────
      const confirmEmbed = new EmbedBuilder()
        .setColor(enviado ? 0x22c55e : 0xf59e0b)
        .setTitle(enviado ? '✅ Llamada enviada' : '⚠️ Sin canal configurado')
        .setDescription(
          enviado
            ? `Tu llamada al **${servNombre}** ha sido enviada.\nLos servicios de emergencia están en camino.`
            : 'La llamada se procesó pero no hay canal de emergencias configurado. Contacta a un admin.'
        )
        .addFields(
          { name: '📍 Zona', value: zonaNombre, inline: true },
          { name: '📍 Código Postal', value: `\`${codigoPostal}\``, inline: true },
        )
        .setTimestamp();

      await msg.edit({ embeds: [confirmEmbed], components: [], files: [] });
      setTimeout(() => msg.delete().catch(() => {}), 15000);
    },
  },

  // ── !mapa [zona] [código] — Probar marcado de mapa ──────────────────────
  {
    name: 'mapa',
    aliases: ['map', 'mapa-coord'],
    description: '!mapa [ciudad|gran_señora|norte] [código] — Ver mapa con círculo en código postal',
    async run(message, args) {
      if (args.length < 2) return message.reply('Uso: `!mapa [zona] [código]`\nEj: `!mapa ciudad 8202`\n\nPara ajustar coordenadas: `!mapa-coord [zona] [código] [x] [y]`');
      if (args[0] === '-coord') {
        if (args.length < 4) return message.reply('Uso: `!mapa-coord [zona] [código] [x] [y]`');
        return message.reply('Edita manualmente `data/codigos_postales.js` con las coordenadas que veas en el mapa.');
      }
      const zona = args[0].toLowerCase();
      const codigo = args[1];
      const mapas = { ciudad: path.join(MAPA_DIR, 'mapa_ciudad.png'), gran_senora: path.join(MAPA_DIR, 'mapa_gran_señora.png'), norte: path.join(MAPA_DIR, 'mapa_norte.png') };
      const nombres = { ciudad: '🏙️ Ciudad', gran_senora: '🌾 Gran Señora', norte: '🏔️ Norte (Paleto)' };
      const mapaFile = mapas[zona];
      if (!mapaFile) return message.reply('❌ Zona inválida. Usa: ciudad, gran_senora o norte.');

      try {
        const cv = getCanvasLib();
        const { getCoord } = require('../data/codigos_postales');
        const img = await cv.loadImage(mapaFile);
        const c = cv.createCanvas(img.width, img.height);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const coord = getCoord(zona, codigo);
        if (coord) {
          const [x, y] = coord;
          ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,0,0,0.25)'; ctx.fill();
          ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 4; ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#ff0000'; ctx.fill();
          ctx.font = 'bold 16px UIFont';
          ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
          ctx.fillText(codigo, x, y + 40);
        } else {
          return message.reply(`❌ El código **${codigo}** no existe en la zona **${nombres[zona] || zona}**.\nUsa \`!mapa ${zona} 8082\` para probar uno que sí existe.`);
        }

        const { AttachmentBuilder } = require('discord.js');
        const attach = new AttachmentBuilder(c.toBuffer('image/png'), { name: 'mapa.png' });
        const embed = new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle(`📍 ${nombres[zona] || zona} — CP: ${codigo}`)
          .setImage('attachment://mapa.png')
          .setTimestamp();
        return message.channel.send({ embeds: [embed], files: [attach] });
      } catch (e) {
        return message.reply(`❌ Error al generar mapa: ${e.message}`);
      }
    },
  },

];

module.exports = { prefixCommands };
