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
} = require('discord.js');
const { getPlayer, getInventory } = require('../utils/helpers');
const E = require('../utils/embeds');
const config = require('../config');
const { getPaisNombre } = require('../data/paises');
const GuildConfig = require('../database/models/GuildConfig');

async function getPersonaje(discordId, username) {
  const p = await getPlayer(discordId, username);
  if (!p.personajeCreado) return null;
  return p;
}

async function sendRpEmbed(message, embed, deleteOriginal = true) {
  if (deleteOriginal) await message.delete().catch(() => {});
  return message.channel.send({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
const prefixCommands = [

  // !me [accion] — Acción del personaje
  {
    name: 'me',
    description: '!me [acción] — Tu personaje realiza una acción',
    async run(message, args) {
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
      if (!args.length) return message.reply('Uso: `!ooc [texto]`');
      const embed = new EmbedBuilder()
        .setColor(0x6b7280)
        .setDescription(`(( ${args.join(' ')} ))`)
        .setAuthor({ name: `OOC | ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
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

  // ── !911 [descripción] — Llamada de emergencia interactiva ─────────────────
  {
    name: '911',
    aliases: ['emergencia', 'socorro'],
    description: '!911 [descripción] — Llamar a servicios de emergencia',
    async run(message, args) {
      if (!args.length) return message.reply('Uso: `!911 [descripción de la emergencia]`\nEj: `!911 Hay un tiroteo en el puerto de LS`');
      const player = await getPersonaje(message.author.id, message.author.username);
      if (!player) return message.reply('❌ Necesitas un personaje para llamar al 911. Usa `/personaje crear`.');

      const descripcion = args.join(' ');

      // Borrar mensaje original del usuario
      await message.delete().catch(() => {});

      const selEmbed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('🚨 LLAMADA AL 911')
        .setDescription(`**${player.getFullName()}** está llamando al servicio de emergencias.\n\n> *"${descripcion}"*\n\n**¿Qué servicio necesitas?**`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Tienes 30 segundos para seleccionar el servicio' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('e911_policia').setLabel('🚔 Policía').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('e911_medico').setLabel('🚑 Médico / EMS').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('e911_bomberos').setLabel('🚒 Bomberos').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('e911_cancelar').setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary),
      );

      const msg = await message.channel.send({ embeds: [selEmbed], components: [row] });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 30_000,
        max: 1,
      });

      collector.on('collect', async i => {
        if (i.customId === 'e911_cancelar') {
          await i.update({ embeds: [E.info('Llamada cancelada', 'Has colgado el teléfono.')], components: [] });
          setTimeout(() => msg.delete().catch(() => {}), 4000);
          return;
        }

        const tipo = i.customId.replace('e911_', '');
        const embed911 = E.emergencia911(player, tipo, descripcion);

        // ── Enviar al canal de emergencias/policía ──────────────────────────
        let enviado = false;
        try {
          const gc = await GuildConfig.findOne({ guildId: message.guild.id });
          // Prioridad: canal específico del tipo → emergencias → rp
          const canales = gc?.canales || {};
          const chId = (tipo === 'policia' ? canales.policia : tipo === 'medico' ? canales.medico : canales.bomberos)
                     || canales.emergencias
                     || canales.rp;

          if (chId) {
            const ch = message.guild.channels.cache.get(chId);
            if (ch) {
              const ping = tipo === 'policia' ? '🚨 **@here** — ' : '';
              await ch.send({ content: ping || undefined, embeds: [embed911] });
              enviado = true;
            }
          }
        } catch (err) {
          console.error('[911 channel]', err.message);
        }

        const confirmEmbed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('📞 Llamada enviada')
          .setDescription(
            enviado
              ? `✅ Tu llamada ha sido enviada a los servicios de emergencia.\n\n> *Espera a que los servicios lleguen a tu posición.*`
              : `⚠️ Llamada procesada pero no se encontró canal configurado.\n\n*Pide a un admin que configure \`/config canales emergencias\`.*`,
          )
          .setFooter({ text: 'AmericanRP · 911' });

        await i.update({ embeds: [confirmEmbed], components: [] });
        setTimeout(() => msg.delete().catch(() => {}), 6000);
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          msg.edit({ embeds: [E.warn('Tiempo agotado', 'La llamada al 911 expiró por inactividad.')], components: [] })
            .then(m => setTimeout(() => m.delete().catch(() => {}), 4000))
            .catch(() => {});
        }
      });
    },
  },

];

module.exports = { prefixCommands };
