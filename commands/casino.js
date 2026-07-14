const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPlayer, formatMoney } = require('../utils/helpers');
const E = require('../utils/embeds');
const config = require('../config');
const Player = require('../database/models/Player');

const MIN_BET = 50;
const MAX_BET = 100000;
const DAILY_BONUS = 500;

const data = new SlashCommandBuilder()
  .setName('casino')
  .setDescription('Juegos de casino')
  .addSubcommand(s => s.setName('blackjack').setDescription('Jugar al blackjack contra la casa')
    .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(MIN_BET).setMaxValue(MAX_BET)))
  .addSubcommand(s => s.setName('slots').setDescription('Máquina tragaperras')
    .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(25).setMaxValue(MAX_BET)))
  .addSubcommand(s => s.setName('dados').setDescription('Apostar a un número del 1 al 6')
    .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad').setRequired(true).setMinValue(MIN_BET).setMaxValue(MAX_BET))
    .addIntegerOption(o => o.setName('numero').setDescription('Número (1-6)').setRequired(true).setMinValue(1).setMaxValue(6)))
  .addSubcommand(s => s.setName('ruleta').setDescription('Ruleta americana')
    .addStringOption(o => o.setName('tipo').setDescription('Tipo de apuesta').setRequired(true)
      .addChoices({ name: 'Rojo (x2)', value: 'rojo' }, { name: 'Negro (x2)', value: 'negro' }, { name: 'Par (x2)', value: 'par' }, { name: 'Impar (x2)', value: 'impar' }))
    .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad').setRequired(true).setMinValue(MIN_BET).setMaxValue(MAX_BET)))
  .addSubcommand(s => s.setName('moneda').setDescription('Cara o cruz')
    .addStringOption(o => o.setName('lado').setDescription('Cara o cruz').setRequired(true).addChoices({ name: 'Cara', value: 'cara' }, { name: 'Cruz', value: 'cruz' }))
    .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad').setRequired(true).setMinValue(MIN_BET).setMaxValue(MAX_BET)))
  .addSubcommand(s => s.setName('daily').setDescription('Reclamar tu bono diario'))
  .addSubcommand(s => s.setName('top').setDescription('Ranking de ganadores del casino'));

async function execute(interaction, client) {
  const player = await getPlayer(interaction.user.id, interaction.user.username);
  if (!player.personajeCreado) return interaction.reply({ embeds: [E.warn('Sin personaje', 'Crea un personaje primero.')], ephemeral: true });

  const sub = interaction.options.getSubcommand();

  if (sub === 'daily') {
    const lastDaily = player.getCooldown('casino_daily');
    if (lastDaily && Date.now() - lastDaily.getTime() < 86400000) {
      const remaining = 86400000 - (Date.now() - lastDaily.getTime());
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      return interaction.reply({ embeds: [E.warn('Ya reclamaste', `Vuelve en **${h}h ${m}m** para tu próximo bono.`)], ephemeral: true });
    }
    player.setCooldown('casino_daily', new Date());
    player.cash += DAILY_BONUS;
    player.totalGanado = (player.totalGanado || 0) + DAILY_BONUS;
    await player.save();
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xfbbf24).setTitle('🎁 Bono diario').setDescription(`Has recibido **$${DAILY_BONUS.toLocaleString()}** en efectivo.\n\n💰 **Saldo actual:** ${formatMoney(player.cash)}`).setTimestamp()] });
  }

  if (sub === 'top') {
    const top = await Player.find({ personajeCreado: true }).sort({ totalGanado: -1 }).limit(10).lean();
    const list = top.map((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▫️';
      const name = p.nombre && p.apellido ? `${p.nombre} ${p.apellido}` : p.discordUsername || p.discordId;
      return `${medal} **${name}** — $${(p.totalGanado || 0).toLocaleString()}`;
    }).join('\n');
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xfbbf24).setTitle('🏆 Ranking del Casino').setDescription(list || '*Sin datos*').setFooter({ text: 'Basado en ganancias totales' }).setTimestamp()],
    });
  }

  const apuesta = interaction.options.getInteger('apuesta');
  if (player.cash < apuesta) return interaction.reply({ embeds: [E.err('Fondos insuficientes', `Necesitas **${formatMoney(apuesta)}** en efectivo. Tienes: ${formatMoney(player.cash)}`)], ephemeral: true });

  const cooldownKey = 'casino_global';
  const lastGame = player.getCooldown(cooldownKey);
  if (lastGame && Date.now() - lastGame.getTime() < 5000) {
    return interaction.reply({ embeds: [E.warn('Cooldown', 'Espera **5 segundos** entre juegos.')], ephemeral: true });
  }
  player.setCooldown(cooldownKey, new Date());

  let embed, ganancias = 0, resultado;

  if (sub === 'moneda') {
    const lado = interaction.options.getString('lado');
    const cara = Math.random() < 0.5;
    const ganaste = (lado === 'cara' && cara) || (lado === 'cruz' && !cara);
    ganancias = ganaste ? apuesta : -apuesta;
    resultado = cara ? '🪙 Cara' : '🪙 Cruz';
    embed = new EmbedBuilder()
      .setColor(ganaste ? 0x22c55e : 0xef4444)
      .setTitle(`🪙 ${resultado}`)
      .setDescription(`Has ${ganaste ? 'ganado' : 'perdido'} **$${apuesta.toLocaleString()}**`)
      .setTimestamp();
  }

  if (sub === 'dados') {
    const numero = interaction.options.getInteger('numero');
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const ganaste = d1 === numero || d2 === numero;
    ganancias = ganaste ? apuesta * 5 : -apuesta;
    embed = new EmbedBuilder()
      .setColor(ganaste ? 0x22c55e : 0xef4444)
      .setTitle(`🎲 Dados: ${d1} + ${d2}`)
      .setDescription(
        `**Tu número:** ${numero}\n` +
        `**Dados:** 🎲 ${d1} 🎲 ${d2}\n` +
        `${ganaste ? `✅ ¡Coincidió! Ganaste **$${(apuesta * 5).toLocaleString()}** (x5)` : `❌ Ningún dado cayó en ${numero}. Pierdes **$${apuesta.toLocaleString()}**.`}`
      )
      .setTimestamp();
  }

  if (sub === 'slots') {
    const s = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '⭐', '7️⃣'];
    const pesos = [25, 20, 15, 15, 10, 7, 5, 3];
    const totalPeso = pesos.reduce((a, b) => a + b, 0);
    const r = () => { const r = Math.random() * totalPeso; let a = 0; for (let i = 0; i < s.length; i++) { a += pesos[i]; if (r <= a) return s[i]; } return s[0]; };
    const r1 = r(), r2 = r(), r3 = r();
    const iguales = r1 === r2 && r2 === r3;
    const par = !iguales && (r1 === r2 || r2 === r3 || r1 === r3);
    const multiplicador = iguales ? (r1 === '7️⃣' ? 25 : r1 === '💎' ? 50 : r1 === '⭐' ? 15 : 10) : par ? 2 : 0;
    ganancias = multiplicador > 0 ? apuesta * multiplicador : -apuesta;
    const jackpot = iguales && r1 === '💎';

    embed = new EmbedBuilder()
      .setColor(multiplicador > 0 ? 0x22c55e : 0xef4444)
      .setTitle(jackpot ? '💎💰💎 ¡JACKPOT! 💎💰💎' : multiplicador > 1 ? '🎰 ¡Ganaste!' : '🎰 Tragaperras')
      .setDescription(
        `\`\`\`diff\n${r1}  ${r2}  ${r3}\n\`\`\`` +
        `${iguales ? `✅ **${r1} ${r1} ${r1}** — ${multiplicador}x = **$${(apuesta * multiplicador).toLocaleString()}**` : par ? `⚠️ Par — **x2 = $${(apuesta * 2).toLocaleString()}**` : `❌ Sin aciertos. Pierdes **$${apuesta.toLocaleString()}**`}`
      )
      .setFooter({ text: `Apuesta: $${apuesta.toLocaleString()}` })
      .setTimestamp();
  }

  if (sub === 'ruleta') {
    const tipo = interaction.options.getString('tipo');
    const num = Math.floor(Math.random() * 37);
    const color = num === 0 ? 'verde' : num % 2 === 0 ? 'negro' : 'rojo';
    const esPar = num > 0 && num % 2 === 0;
    const esImpar = num > 0 && num % 2 !== 0;
    let ganaste = false;
    if (tipo === 'rojo' && color === 'rojo') ganaste = true;
    if (tipo === 'negro' && color === 'negro') ganaste = true;
    if (tipo === 'par' && esPar) ganaste = true;
    if (tipo === 'impar' && esImpar) ganaste = true;
    ganancias = ganaste ? apuesta : -apuesta;
    const emojiNum = num === 0 ? '🟢' : color === 'rojo' ? '🔴' : '⚫';
    embed = new EmbedBuilder()
      .setColor(ganaste ? 0x22c55e : 0xef4444)
      .setTitle(`🎰 Ruleta — ${emojiNum} ${num} ${color.toUpperCase()}`)
      .setDescription(
        `**Apuesta:** ${tipo}\n` +
        `**Resultado:** ${emojiNum} ${num} (${color})\n` +
        `${ganaste ? `✅ Ganaste **$${apuesta.toLocaleString()}**` : `❌ Pierdes **$${apuesta.toLocaleString()}**`}`
      )
      .setTimestamp();
  }

  if (sub === 'blackjack') {
    await interaction.deferReply();
    const palos = ['♠', '♥', '♦', '♣'];
    const valores = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const puntuar = (mano) => { let v = 0, aces = 0; for (const c of mano) { if (c === 'A') { aces++; v += 11; } else if (['J', 'Q', 'K'].includes(c)) v += 10; else v += parseInt(c); } while (v > 21 && aces > 0) { v -= 10; aces--; } return v; };
    const carta = () => `${valores[Math.floor(Math.random() * valores.length)]}${palos[Math.floor(Math.random() * palos.length)]}`;
    const mostrar = (mano) => mano.map(c => `\`${c}\``).join(' ');

    let jugador = [carta(), carta()];
    let dealer = [carta(), carta()];
    let turno = 'jugador';

    const render = (ocultarDealer = true) => {
      const jVal = puntuar(jugador);
      const dVal = ocultarDealer ? puntuar([dealer[0]]) : puntuar(dealer);
      return new EmbedBuilder()
        .setColor(0x1a1a2e)
        .setTitle('🃏 Blackjack')
        .addFields(
          { name: `🧑 Tu mano (${jVal})`, value: mostrar(jugador), inline: false },
          { name: `🏠 Dealer (${ocultarDealer ? '?' : dVal})`, value: ocultarDealer ? `\`${dealer[0]}\` \`?\`` : mostrar(dealer), inline: false },
        )
        .setFooter({ text: `Apuesta: $${apuesta.toLocaleString()}` })
        .setTimestamp();
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bj_pedir').setLabel('📥 Pedir').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('bj_plantar').setLabel('✋ Plantarse').setStyle(ButtonStyle.Success),
    );

    const msg = await interaction.editReply({ embeds: [render()], components: [row] });

    while (turno === 'jugador') {
      try {
        const click = await msg.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 30000 });
        await click.deferUpdate();
        if (click.customId === 'bj_pedir') {
          jugador.push(carta());
          if (puntuar(jugador) > 21) {
            ganancias = -apuesta;
            embed = new EmbedBuilder().setColor(0xef4444).setTitle('🃏 Blackjack — ¡Te pasaste!').setDescription(`**${puntuar(jugador)}** puntos. ${mostrar(jugador)}\n\nPierdes **$${apuesta.toLocaleString()}**`).setTimestamp();
            turno = 'fin';
            break;
          }
          await msg.edit({ embeds: [render()], components: [row] });
        } else if (click.customId === 'bj_plantar') {
          turno = 'dealer';
        }
      } catch {
        ganancias = -apuesta;
        embed = new EmbedBuilder().setColor(0x64748b).setTitle('🃏 Blackjack — Tiempo agotado').setDescription(`Pierdes **$${apuesta.toLocaleString()}** por inactividad.`).setTimestamp();
        turno = 'fin';
      }
    }

    while (turno === 'dealer') {
      if (puntuar(dealer) < 17) dealer.push(carta());
      else turno = 'fin';
    }

    if (turno === 'fin' && !embed) {
      const jVal = puntuar(jugador);
      const dVal = puntuar(dealer);
      if (dVal > 21 || jVal > dVal) { ganancias = apuesta; embed = new EmbedBuilder().setColor(0x22c55e).setTitle('🃏 Blackjack — ¡Ganaste!').setDescription(`🧑 **${jVal}** vs 🏠 **${dVal}**\n\nGanas **$${apuesta.toLocaleString()}**`).setTimestamp(); }
      else if (jVal === dVal) { ganancias = 0; embed = new EmbedBuilder().setColor(0x64748b).setTitle('🃏 Blackjack — Empate').setDescription(`🧑 **${jVal}** vs 🏠 **${dVal}**\n\nRecuperas tu apuesta.`).setTimestamp(); }
      else { ganancias = -apuesta; embed = new EmbedBuilder().setColor(0xef4444).setTitle('🃏 Blackjack — Perdiste').setDescription(`🧑 **${jVal}** vs 🏠 **${dVal}**\n\nPierdes **$${apuesta.toLocaleString()}**`).setTimestamp(); }
    }

    if (embed) await msg.edit({ embeds: [embed], components: [] });
    player.cash += ganancias;
    if (ganancias > 0) player.totalGanado = (player.totalGanado || 0) + ganancias;
    await player.save();
    return;
  }

  player.cash += ganancias;
  if (ganancias > 0) player.totalGanado = (player.totalGanado || 0) + ganancias;
  await player.save();
  return interaction.reply({ embeds: [embed] });
}

const prefixCommands = [
  {
    name: 'blackjack',
    aliases: ['bj', '21'],
    description: '!blackjack [apuesta] — Jugar blackjack',
    async run(message, args) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('❌ Crea un personaje primero.');
      const apuesta = parseInt(args[0]);
      if (!apuesta || apuesta < MIN_BET || apuesta > MAX_BET) return message.reply(`Apuesta entre $${MIN_BET} y $${MAX_BET}.`);
      if (player.cash < apuesta) return message.reply('❌ No tienes suficiente efectivo.');
      const palos = ['♠', '♥', '♦', '♣']; const valores = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const p = (m) => { let v = 0, a = 0; for (const c of m) { if (c === 'A') { a++; v += 11; } else if (['J','Q','K'].includes(c)) v += 10; else v += parseInt(c); } while (v > 21 && a > 0) { v -= 10; a--; } return v; };
      const c = () => `${valores[Math.floor(Math.random()*valores.length)]}${palos[Math.floor(Math.random()*palos.length)]}`;
      let j = [c(), c()], d = [c(), c()];
      player.cash -= apuesta; await player.save();
      while (p(d) < 17) d.push(c());
      const jv = p(j), dv = p(d);
      let g = dv > 21 || jv > dv ? apuesta : jv === dv ? 0 : -apuesta;
      if (g > 0) player.totalGanado = (player.totalGanado || 0) + g;
      player.cash += apuesta + g; await player.save();
      const r = g > 0 ? '✅ Ganaste' : g === 0 ? '🔄 Empate' : '❌ Perdiste';
      message.reply(`🃏 **Blackjack** — ${r}\n🧑 ${j.join(' ')} (${jv})\n🏠 ${d.join(' ')} (${dv})\n💰 ${g > 0 ? `+$${g.toLocaleString()}` : g === 0 ? '$0' : `-$${Math.abs(g).toLocaleString()}`}`);
    },
  },
  {
    name: 'slots',
    aliases: ['slot', 'tragaperras'],
    description: '!slots [apuesta] — Máquina tragaperras',
    async run(message, args) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('❌ Sin personaje.');
      const apuesta = parseInt(args[0]);
      if (!apuesta || apuesta < 25 || apuesta > MAX_BET) return message.reply(`Apuesta entre $25 y $${MAX_BET}.`);
      if (player.cash < apuesta) return message.reply('❌ No tienes efectivo.');
      const s = ['🍒','🍋','🍊','🍇','🔔','💎','⭐','7️⃣']; const p = [25,20,15,15,10,7,5,3]; const tp = p.reduce((a,b)=>a+b,0);
      const r = () => { const r = Math.random()*tp; let a=0; for(let i=0;i<s.length;i++){a+=p[i];if(r<=a)return s[i];} return s[0]; };
      const r1=r(),r2=r(),r3=r();
      const eq = r1===r2&&r2===r3; const par = !eq&&(r1===r2||r2===r3||r1===r3);
      const mult = eq ? (r1==='7️⃣'?25:r1==='💎'?50:r1==='⭐'?15:10) : par ? 2 : 0;
      const g = mult > 0 ? apuesta*mult : -apuesta;
      player.cash += g; if(g>0) player.totalGanado = (player.totalGanado||0)+g; await player.save();
      message.reply(`🎰 ${r1} ${r2} ${r3}\n${eq?`✅ ${mult}x = $${(apuesta*mult).toLocaleString()}`:par?`⚠️ Par x2 = $${(apuesta*2).toLocaleString()}`:`❌ Pierdes $${apuesta.toLocaleString()}`}`);
    },
  },
  {
    name: 'dados',
    aliases: ['dice', 'dado'],
    description: '!dados [apuesta] [número 1-6] — Apostar a los dados',
    async run(message, args) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('❌ Sin personaje.');
      const apuesta = parseInt(args[0]); const numero = parseInt(args[1]);
      if (!apuesta || apuesta < MIN_BET) return message.reply(`Apuesta mínima $${MIN_BET}.`);
      if (!numero || numero < 1 || numero > 6) return message.reply('Número del 1 al 6.');
      if (player.cash < apuesta) return message.reply('❌ No tienes efectivo.');
      const d1 = Math.floor(Math.random()*6)+1, d2 = Math.floor(Math.random()*6)+1;
      const g = d1 === numero || d2 === numero ? apuesta*5 : -apuesta;
      player.cash += g; if(g>0) player.totalGanado = (player.totalGanado||0)+g; await player.save();
      const r = g > 0 ? `✅ ¡Coincidió! x5 = +$${(apuesta*5).toLocaleString()}` : `❌ Pierdes $${apuesta.toLocaleString()}`;
      message.reply(`🎲 Dados: ${d1} ${d2}\n🎯 Número: ${numero}\n${r}`);
    },
  },
  {
    name: 'ruleta',
    aliases: ['roulette'],
    description: '!ruleta [rojo/negro/par/impar] [apuesta]',
    async run(message, args) {
      if (!args[0] || !args[1]) return message.reply('Uso: `!ruleta [rojo/negro/par/impar] [apuesta]`');
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('❌ Sin personaje.');
      const tipo = args[0].toLowerCase();
      if (!['rojo','negro','par','impar'].includes(tipo)) return message.reply('Tipos: rojo, negro, par, impar');
      const apuesta = parseInt(args[1]);
      if (!apuesta || apuesta < MIN_BET) return message.reply(`Apuesta mínima $${MIN_BET}.`);
      if (player.cash < apuesta) return message.reply('❌ No tienes efectivo.');
      const num = Math.floor(Math.random()*37); const color = num===0?'verde':num%2===0?'negro':'rojo';
      const gana = (tipo==='rojo'&&color==='rojo')||(tipo==='negro'&&color==='negro')||(tipo==='par'&&num>0&&num%2===0)||(tipo==='impar'&&num%2!==0);
      const g = gana ? apuesta : -apuesta;
      player.cash += g; if(g>0) player.totalGanado = (player.totalGanado||0)+g; await player.save();
      const em = num===0?'🟢':color==='rojo'?'🔴':'⚫';
      message.reply(`${em} ${num} ${color.toUpperCase()}\n${gana?`✅ +$${apuesta.toLocaleString()}`:`❌ -$${apuesta.toLocaleString()}`}`);
    },
  },
  {
    name: 'moneda',
    aliases: ['coinflip', 'cf'],
    description: '!moneda [cara/cruz] [apuesta]',
    async run(message, args) {
      if (!args[0] || !args[1]) return message.reply('Uso: `!moneda [cara/cruz] [apuesta]`');
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('❌ Sin personaje.');
      const lado = args[0].toLowerCase();
      if (!['cara','cruz'].includes(lado)) return message.reply('Elige cara o cruz.');
      const apuesta = parseInt(args[1]);
      if (!apuesta || apuesta < MIN_BET) return message.reply(`Apuesta mínima $${MIN_BET}.`);
      if (player.cash < apuesta) return message.reply('❌ No tienes efectivo.');
      const cara = Math.random()<0.5;
      const g = (lado==='cara'&&cara)||(lado==='cruz'&&!cara) ? apuesta : -apuesta;
      player.cash += g; if(g>0) player.totalGanado = (player.totalGanado||0)+g; await player.save();
      message.reply(`🪙 ${cara?'CARA':'CRUZ'}\n${g>0?`✅ +$${apuesta.toLocaleString()}`:`❌ -$${apuesta.toLocaleString()}`}`);
    },
  },
  {
    name: 'bonodiario',
    aliases: ['daily', 'dailymoney'],
    description: '!dailymoney — Reclamar tu bono diario de $500',
    async run(message) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('❌ Sin personaje.');
      const last = player.getCooldown('casino_daily');
      if (last && Date.now() - last.getTime() < 86400000) {
        const r = 86400000 - (Date.now() - last.getTime());
        return message.reply(`⏳ Vuelve en **${Math.floor(r/3600000)}h ${Math.floor((r%3600000)/60000)}m**.`);
      }
      player.setCooldown('casino_daily', new Date());
      player.cash += DAILY_BONUS;
      player.totalGanado = (player.totalGanado || 0) + DAILY_BONUS;
      await player.save();
      message.reply(`🎁 Bono diario: **$${DAILY_BONUS}** añadidos a tu efectivo.`);
    },
  },
];

module.exports = { data, execute, prefixCommands };