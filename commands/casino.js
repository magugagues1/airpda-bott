/**
 * CASINO — Juegos de azar completos
 * Slash: /casino blackjack | /casino dados | /casino ruleta | /casino slots | /casino moneda
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer, formatCooldown, formatMoney, rand } = require('../utils/helpers');
const E = require('../utils/embeds');
const config = require('../config');
const { ICONS, BANNERS, addImage } = require('../utils/images');

const data = new SlashCommandBuilder()
  .setName('casino')
  .setDescription('Juegos de azar del Casino Diamond')
  .addSubcommand(s => s.setName('blackjack').setDescription('Jugar al blackjack contra el dealer')
    .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar (cash)').setRequired(true).setMinValue(50).setMaxValue(50000)))
  .addSubcommand(s => s.setName('dados').setDescription('Apostar en dados (1-6)')
    .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(50).setMaxValue(50000))
    .addIntegerOption(o => o.setName('numero').setDescription('Número al que apuestas (1-6)').setRequired(true).setMinValue(1).setMaxValue(6)))
  .addSubcommand(s => s.setName('ruleta').setDescription('Jugar a la ruleta')
    .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(50).setMaxValue(50000))
    .addStringOption(o => o.setName('tipo').setDescription('Tipo de apuesta').setRequired(true)
      .addChoices(
        { name: 'Rojo/Negro (x2)', value: 'color' },
        { name: 'Par/Impar (x2)', value: 'paridad' },
        { name: 'Número exacto (x35)', value: 'numero' },
        { name: 'Docena 1-12 (x3)', value: 'd1' },
        { name: 'Docena 13-24 (x3)', value: 'd2' },
        { name: 'Docena 25-36 (x3)', value: 'd3' },
      ))
    .addIntegerOption(o => o.setName('numero').setDescription('Número exacto (0-36) solo para apuesta "numero"').setRequired(false).setMinValue(0).setMaxValue(36)))
  .addSubcommand(s => s.setName('slots').setDescription('Tirar las tragaperras')
    .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(25).setMaxValue(10000)))
  .addSubcommand(s => s.setName('moneda').setDescription('Cara o cruz')
    .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(50).setMaxValue(100000))
    .addStringOption(o => o.setName('eleccion').setDescription('Cara o Cruz').setRequired(true)
      .addChoices({ name: 'Cara', value: 'cara' }, { name: 'Cruz', value: 'cruz' })));

async function execute(interaction, client) {
  const sub = interaction.options.getSubcommand();
  const player = await getPlayer(interaction.user.id, interaction.user.username);

  if (!player.personajeCreado) return interaction.reply({ embeds: [E.warn('Sin personaje', 'Crea tu personaje con `/personaje crear`.')], ephemeral: true });

  const lastCasino = player.getCooldown('casino');
  const remaining = lastCasino ? lastCasino.getTime() + config.cooldowns.casino - Date.now() : 0;
  if (remaining > 0) return interaction.reply({ embeds: [E.warn('Cooldown', `Espera **${formatCooldown(remaining)}** para volver al casino.`)], ephemeral: true });

  player.setCooldown('casino', new Date());

  // ── BLACKJACK ───────────────────────────────────────────────────────────────
  if (sub === 'blackjack') {
    const apuesta = interaction.options.getInteger('apuesta');
    if (player.cash < apuesta) return interaction.reply({ embeds: [E.err('Sin fondos', `Solo tienes ${formatMoney(player.cash)} en cash.`)], ephemeral: true });

    const cartas = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const cartaValor = c => ['10', 'J', 'Q', 'K'].includes(c) ? 10 : c === 'A' ? 11 : parseInt(c);
    const mano = () => {
      const hand = [cartas[rand(0, cartas.length - 1)], cartas[rand(0, cartas.length - 1)]];
      let v = hand.reduce((a, c) => a + cartaValor(c), 0);
      if (v > 21 && hand.includes('A')) v -= 10;
      return { hand, valor: v };
    };

    const jugador = mano();
    const dealer = mano();

    // Jugador saca carta si < 17
    while (jugador.valor < 17) {
      const carta = cartas[rand(0, cartas.length - 1)];
      jugador.hand.push(carta);
      jugador.valor += cartaValor(carta);
      if (jugador.valor > 21) {
        // Ases cuentan como 1
        if (jugador.hand.includes('A')) jugador.valor -= 10;
      }
    }

    // Dealer saca cartas mientras < 17
    while (dealer.valor < 17) {
      const carta = cartas[rand(0, cartas.length - 1)];
      dealer.hand.push(carta);
      dealer.valor += cartaValor(carta);
      if (dealer.valor > 21 && dealer.hand.includes('A')) dealer.valor -= 10;
    }

    let resultado, ganancias, color;
    const jugBJ = jugador.valor === 21 && jugador.hand.length === 2;
    const dealBJ = dealer.valor === 21 && dealer.hand.length === 2;

    if (jugador.valor > 21) {
      resultado = '💥 ¡Pasado de 21! Perdiste.';
      ganancias = -apuesta;
      color = config.colors.danger;
    } else if (dealBJ && !jugBJ) {
      resultado = '🎩 ¡Blackjack del dealer! Perdiste.';
      ganancias = -apuesta;
      color = config.colors.danger;
    } else if (jugBJ && !dealBJ) {
      resultado = '🃏 ¡BLACKJACK! Ganaste x1.5';
      ganancias = Math.floor(apuesta * 1.5);
      color = config.colors.success;
    } else if (dealer.valor > 21 || jugador.valor > dealer.valor) {
      resultado = '✅ ¡Ganaste!';
      ganancias = apuesta;
      color = config.colors.success;
    } else if (jugador.valor === dealer.valor) {
      resultado = '🤝 Empate. Recuperas tu apuesta.';
      ganancias = 0;
      color = config.colors.warning;
    } else {
      resultado = '❌ El dealer gana.';
      ganancias = -apuesta;
      color = config.colors.danger;
    }

    player.cash += ganancias;
    await player.save();

    const bjEmbed = new EmbedBuilder()
      .setColor(color).setTitle('🃏 Blackjack — Casino Diamond')
      .addFields(
        { name: `Tu mano (${jugador.valor})`, value: jugador.hand.join(' · '), inline: true },
        { name: `Dealer (${dealer.valor})`, value: dealer.hand.join(' · '), inline: true },
        { name: 'Resultado', value: resultado, inline: false },
        { name: ganancias >= 0 ? '💰 Ganaste' : '💸 Perdiste', value: formatMoney(Math.abs(ganancias)), inline: true },
        { name: '💵 Cash', value: formatMoney(player.cash), inline: true },
      ).setTimestamp();
    addImage(bjEmbed, 'casino');
    return interaction.reply({ embeds: [bjEmbed] });
  }

  // ── DADOS ───────────────────────────────────────────────────────────────────
  if (sub === 'dados') {
    const apuesta = interaction.options.getInteger('apuesta');
    const numero = interaction.options.getInteger('numero');
    if (player.cash < apuesta) return interaction.reply({ embeds: [E.err('Sin fondos', `Solo tienes ${formatMoney(player.cash)}.`)], ephemeral: true });

    const d1 = rand(1, 6);
    const d2 = rand(1, 6);
    const suma = d1 + d2;
    const apuestaCumplida = d1 === numero || d2 === numero;
    const ganancias = apuestaCumplida ? apuesta * 5 : -apuesta;
    player.cash += ganancias;
    await player.save();

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ganancias > 0 ? config.colors.success : config.colors.danger)
        .setTitle('🎲 Dados — Casino Diamond').setThumbnail(ICONS.casino)
        .setDescription(`Tiraste: **${d1}** y **${d2}** (suma: ${suma})\nApuestabas al **${numero}**`)
        .addFields(
          { name: 'Resultado', value: apuestaCumplida ? `✅ ¡Salió el ${numero}! x5` : `❌ No salió el ${numero}`, inline: false },
          { name: ganancias > 0 ? '💰 Ganaste' : '💸 Perdiste', value: formatMoney(Math.abs(ganancias)), inline: true },
          { name: '💵 Cash', value: formatMoney(player.cash), inline: true },
        )
        .setTimestamp()],
    });
  }

  // ── RULETA ──────────────────────────────────────────────────────────────────
  if (sub === 'ruleta') {
    const apuesta = interaction.options.getInteger('apuesta');
    const tipo = interaction.options.getString('tipo');
    const numero = interaction.options.getInteger('numero');
    if (player.cash < apuesta) return interaction.reply({ embeds: [E.err('Sin fondos', `Solo tienes ${formatMoney(player.cash)}.`)], ephemeral: true });
    if (tipo === 'numero' && numero === null) return interaction.reply({ embeds: [E.err('Falta número', 'Especifica el número (0-36) para la apuesta exacta.')], ephemeral: true });

    const resultado = rand(0, 36);
    const rojo = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    const esRojo = rojo.includes(resultado);
    const esPar = resultado !== 0 && resultado % 2 === 0;

    let gano = false, multiplicador = 0;
    if (tipo === 'color') { gano = esRojo; multiplicador = 2; }
    else if (tipo === 'paridad') { gano = esPar && resultado !== 0; multiplicador = 2; }
    else if (tipo === 'numero') { gano = resultado === numero; multiplicador = 35; }
    else if (tipo === 'd1') { gano = resultado >= 1 && resultado <= 12; multiplicador = 3; }
    else if (tipo === 'd2') { gano = resultado >= 13 && resultado <= 24; multiplicador = 3; }
    else if (tipo === 'd3') { gano = resultado >= 25 && resultado <= 36; multiplicador = 3; }

    const ganancias = gano ? apuesta * (multiplicador - 1) : -apuesta;
    player.cash += ganancias;
    await player.save();

    const colors = resultado === 0 ? '🟩' : esRojo ? '🔴' : '⚫';

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ganancias > 0 ? config.colors.success : config.colors.danger)
        .setTitle('🎡 Ruleta')
        .setDescription(`La bola cayó en: ${colors} **${resultado}**`)
        .addFields(
          { name: 'Resultado', value: gano ? `✅ ¡Ganaste! (x${multiplicador})` : '❌ Perdiste', inline: false },
          { name: ganancias > 0 ? '💰 Ganaste' : '💸 Perdiste', value: formatMoney(Math.abs(ganancias)), inline: true },
          { name: '💵 Cash', value: formatMoney(player.cash), inline: true },
        )
        .setTimestamp()],
    });
  }

  // ── SLOTS ───────────────────────────────────────────────────────────────────
  if (sub === 'slots') {
    const apuesta = interaction.options.getInteger('apuesta');
    if (player.cash < apuesta) return interaction.reply({ embeds: [E.err('Sin fondos', `Solo tienes ${formatMoney(player.cash)}.`)], ephemeral: true });

    const simbolos = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];
    const pesos = [30, 25, 20, 15, 10, 8, 5, 2]; // probabilidades relativas
    const total = pesos.reduce((a, b) => a + b, 0);

    const girar = () => {
      const r = rand(0, total - 1);
      let acum = 0;
      for (let i = 0; i < simbolos.length; i++) {
        acum += pesos[i];
        if (r < acum) return simbolos[i];
      }
      return simbolos[0];
    };

    const rueda = [girar(), girar(), girar()];
    const [a, b, c] = rueda;

    let multiplicador = 0;
    let mensaje = '';

    if (a === b && b === c) {
      if (a === '💎') { multiplicador = 50; mensaje = '💎 ¡JACKPOT DIAMANTE! x50'; }
      else if (a === '7️⃣') { multiplicador = 25; mensaje = '7️⃣ ¡TRIPLE SIETE! x25'; }
      else if (a === '⭐') { multiplicador = 15; mensaje = '⭐ ¡TRIPLE ESTRELLA! x15'; }
      else { multiplicador = 10; mensaje = '🎰 ¡TRIPLE! x10'; }
    } else if (a === b || b === c || a === c) {
      multiplicador = 2;
      mensaje = '✅ Par — x2';
    } else {
      multiplicador = 0;
      mensaje = '❌ Sin combinación';
    }

    const ganancias = multiplicador > 0 ? apuesta * (multiplicador - 1) : -apuesta;
    player.cash += ganancias;
    await player.save();

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(multiplicador > 0 ? config.colors.success : config.colors.danger)
        .setTitle('🎰 Tragaperras')
        .setDescription(`┃ ${rueda.join(' ┃ ')} ┃\n\n${mensaje}`)
        .addFields(
          { name: ganancias > 0 ? '💰 Ganaste' : '💸 Perdiste', value: formatMoney(Math.abs(ganancias)), inline: true },
          { name: '💵 Cash', value: formatMoney(player.cash), inline: true },
        )
        .setTimestamp()],
    });
  }

  // ── MONEDA ──────────────────────────────────────────────────────────────────
  if (sub === 'moneda') {
    const apuesta = interaction.options.getInteger('apuesta');
    const eleccion = interaction.options.getString('eleccion');
    if (player.cash < apuesta) return interaction.reply({ embeds: [E.err('Sin fondos', `Solo tienes ${formatMoney(player.cash)}.`)], ephemeral: true });

    const resultado = Math.random() > 0.5 ? 'cara' : 'cruz';
    const gano = resultado === eleccion;
    const ganancias = gano ? apuesta : -apuesta;
    player.cash += ganancias;
    await player.save();

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(gano ? config.colors.success : config.colors.danger)
        .setTitle('🪙 Cara o Cruz')
        .setDescription(`Resultado: **${resultado === 'cara' ? '🪙 Cara' : '✝️ Cruz'}**\nElegiste: **${eleccion}**`)
        .addFields(
          { name: 'Resultado', value: gano ? '✅ ¡Ganaste! x2' : '❌ Perdiste', inline: false },
          { name: ganancias > 0 ? '💰 Ganaste' : '💸 Perdiste', value: formatMoney(Math.abs(ganancias)), inline: true },
          { name: '💵 Cash', value: formatMoney(player.cash), inline: true },
        )
        .setTimestamp()],
    });
  }
}

module.exports = { data, execute };
