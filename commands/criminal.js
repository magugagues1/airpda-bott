/**
 * CRIMINAL — Robos, atracos, hackeos, escapes
 * Prefix: !robar, !hackear, !escapar, !buscar, !carterista
 */
const { EmbedBuilder } = require('discord.js');
const { getPlayer, getInventory, formatCooldown, formatMoney, rand, dañarJugador } = require('../utils/helpers');
const E = require('../utils/embeds');
const config = require('../config');
const { ICONS, BANNERS, addImage } = require('../utils/images');

// ─── Helper para cooldown ─────────────────────────────────────────────────────
async function checkCooldown(player, key, ms, message) {
  const last = player.getCooldown(key);
  const remaining = last ? last.getTime() + ms - Date.now() : 0;
  if (remaining > 0) {
    await message.reply(`⏳ Debes esperar **${formatCooldown(remaining)}** para usar este comando.`);
    return false;
  }
  return true;
}

// ─── Prefix commands ───────────────────────────────────────────────────────────
const prefixCommands = [
  // !robar [@usuario] — Robar dinero/items a un jugador
  {
    name: 'robar',
    aliases: ['rob', 'asaltar'],
    cooldown: config.cooldowns.robar,
    description: '!robar @usuario — Robar a un jugador',
    async run(message, args) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('Sin personaje.');
      if (player.muerto || player.enHospital) return message.reply('❌ No puedes robar estando herido o en el hospital.');

      if (!(await checkCooldown(player, 'robar', config.cooldowns.robar, message))) return;

      const target = message.mentions.users.first();
      if (!target) return message.reply('❌ Menciona a un usuario. `!robar @usuario`');
      if (target.id === message.author.id) return message.reply('❌ No puedes robarte a ti mismo.');

      const targetPlayer = await getPlayer(target.id, target.username);
      if (!targetPlayer.personajeCreado) return message.reply('❌ Ese jugador no tiene personaje.');
      if (targetPlayer.enHospital) return message.reply('❌ No puedes robar a alguien en el hospital.');

      player.setCooldown('robar', new Date());

      // Tirada de éxito (50% + bonus por nivel)
      const exito = Math.random() < (0.4 + player.nivel * 0.01);

      if (!exito) {
        // Fallo: pierdes salud y dinero
        const multa = rand(100, 500);
        player.cash = Math.max(0, player.cash - multa);
        await dañarJugador(player, rand(10, 30));
        player.robosRealizados++;
        await player.save();

        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ Robo fallido')
            .setDescription(`Intentaste robar a **${targetPlayer.getFullName()}** pero te pillaron.\n\nPierdes **${formatMoney(multa)}** en comisarías y recibes daño.`)
            .setThumbnail(ICONS.policia)
            .setTimestamp()],
        });
      }

      // Éxito: robar entre 10-40% del cash objetivo
      const robado = Math.floor(targetPlayer.cash * (0.1 + Math.random() * 0.3));
      if (robado < 50) return message.reply(`💸 ${targetPlayer.getFullName()} no tiene suficiente dinero para robar.`);

      targetPlayer.cash -= robado;
      player.cash += robado;
      player.robosRealizados++;
      await player.save();
      await targetPlayer.save();
      await player.addXP(rand(20, 50), player);

      // Notificar víctima
      try {
        const u = await message.client.users.fetch(target.id);
        await u.send(`🚨 **${player.getFullName()}** te robó **${formatMoney(robado)}** en efectivo!`);
      } catch {}

      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle('✅ Robo exitoso')
          .setDescription(`Robaste **${formatMoney(robado)}** a **${targetPlayer.getFullName()}**`)
          .setThumbnail(ICONS.robar)
          .addFields({ name: '💵 Tu cash', value: formatMoney(player.cash), inline: true })
          .setTimestamp()],
      });
    },
  },

  // !hackear [atm|empresa|gobierno] — Hackear sistemas
  {
    name: 'hackear',
    aliases: ['hack', 'ciberataque'],
    cooldown: 45 * 60 * 1000,
    description: '!hackear [atm|empresa|gobierno] — Hackear sistemas',
    async run(message, args) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('Sin personaje.');
      if (!(await checkCooldown(player, 'hackear', 45 * 60 * 1000, message))) return;

      const targets = {
        atm: { nombre: 'Cajero ATM', min: 300, max: 800, dificultad: 0.3 },
        empresa: { nombre: 'Red empresarial', min: 1000, max: 5000, dificultad: 0.5 },
        gobierno: { nombre: 'Servidor gubernamental', min: 5000, max: 20000, dificultad: 0.7 },
      };

      const t = targets[args[0]?.toLowerCase()];
      if (!t) return message.reply(`❌ Objetivo inválido. Opciones: \`atm\`, \`empresa\`, \`gobierno\``);

      player.setCooldown('hackear', new Date());

      // Minijuego de hackeo (simple probabilidad)
      const pasos = 3;
      let exitos = 0;
      for (let i = 0; i < pasos; i++) {
        if (Math.random() > t.dificultad) exitos++;
      }

      if (exitos < 2) {
        const multa = rand(200, 1000);
        player.cash = Math.max(0, player.cash - multa);
        player.arrestos++;
        await player.save();
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('❌ Hackeo fallido')
            .setDescription(`Fuiste rastreado. Multa de **${formatMoney(multa)}** y alerta policial.`)
            .setThumbnail(ICONS.policia)
            .setTimestamp()],
        });
      }

      const ganancias = rand(t.min, t.max);
      player.dineroSucio += ganancias;
      player.robosRealizados++;
      await player.save();
      await player.addXP(rand(30, 80), player);

      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('💻 Hackeo exitoso')
          .setDescription(`Accediste a **${t.nombre}** y extrajiste **${formatMoney(ganancias)}** en dinero digital.`)
          .setThumbnail(ICONS.hackear)
          .addFields({ name: '💊 Dinero sucio total', value: formatMoney(player.dineroSucio), inline: true })
          .setTimestamp()],
      });
    },
  },

  // !carterista — Robar carteras de transeúntes
  {
    name: 'carterista',
    aliases: ['cartera', 'pickpocket'],
    cooldown: 15 * 60 * 1000,
    description: '!carterista — Robar carteras de transeúntes',
    async run(message, args) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('Sin personaje.');
      if (!(await checkCooldown(player, 'carterista', 15 * 60 * 1000, message))) return;

      player.setCooldown('carterista', new Date());
      const exito = Math.random() > 0.35;

      if (!exito) {
        await dañarJugador(player, rand(5, 15));
        await player.save();
        return message.reply('❌ Te pillaron. Golpe de los guardias: -15 salud.');
      }

      const ganancia = rand(50, 500);
      const inv = await getInventory(message.author.id);
      // Chance de item aleatorio
      const items = [
        { nombre: 'Teléfono robado', tipo: 'objeto', emoji: '📱', precio: 200, cantidad: 1 },
        { nombre: 'Cartera', tipo: 'objeto', emoji: '👛', precio: 150, cantidad: 1 },
        { nombre: 'Llaves de coche', tipo: 'objeto', emoji: '🔑', precio: 300, cantidad: 1 },
      ];

      player.cash += ganancia;
      player.robosRealizados++;
      let extra = '';

      if (Math.random() > 0.5) {
        const item = items[rand(0, items.length - 1)];
        inv.addItem(item);
        extra = `\nAdemás encontraste: ${item.emoji} **${item.nombre}**`;
        await inv.save();
      }

      await player.save();
      await player.addXP(rand(5, 15), player);

      return message.reply(`👏 Robaste una cartera con **${formatMoney(ganancia)}** cash.${extra}`);
    },
  },

  // !buscado — Ver lista de buscados
  {
    name: 'buscado',
    aliases: ['wanted', 'buscados'],
    description: '!buscado — Ver jugadores con orden de arresto',
    async run(message) {
      const Player = require('../database/models/Player');
      const buscados = await Player.find({ buscado: true, personajeCreado: true }).limit(10);
      if (!buscados.length) return message.reply('✅ No hay fugitivos activos en Los Santos.');

      const embed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('🚨 Lista de buscados')
        .setThumbnail(ICONS.buscado)
        .setDescription(buscados.map((p, i) => `**${i + 1}.** ${p.getFullName()} — <@${p.discordId}>`).join('\n'))
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    },
  },

  // !escapar — Intentar escapar de la policía (cuando estás buscado)
  {
    name: 'escapar',
    aliases: ['huir', 'run', 'flee'],
    cooldown: 30 * 60 * 1000,
    description: '!escapar — Intentar huir de la policía (si estás buscado)',
    async run(message) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('Sin personaje.');
      if (!player.buscado) return message.reply('No estás en la lista de buscados.');
      if (!(await checkCooldown(player, 'escapar', 30 * 60 * 1000, message))) return;

      player.setCooldown('escapar', new Date());
      const exito = Math.random() > 0.4;

      if (exito) {
        player.buscado = false;
        await player.save();
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.success)
            .setDescription('🏃 ¡Escapaste de la policía! Ya no estás en la lista de buscados.')
            .setTimestamp()],
        });
      } else {
        await dañarJugador(player, rand(20, 40));
        await player.save();
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.danger)
            .setDescription('❌ No pudiste escapar. La policía te atrapó y recibes daño.')
            .setTimestamp()],
        });
      }
    },
  },
];

module.exports = { prefixCommands };
