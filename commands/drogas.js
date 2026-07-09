/**
 * DROGAS — Sistema de narcotráfico completo
 * Prefix: !plantar, !cosechar, !plantaciones, !laboratorio, !distribuir, !venderdroga
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer, getInventory, formatCooldown, formatMoney, rand } = require('../utils/helpers');
const E = require('../utils/embeds');
const config = require('../config');
const DROGAS = require('../data/drogas');
const { ICONS, BANNERS, addImage } = require('../utils/images');
const DrugPlot = require('../database/models/DrugPlot');

// ─── Slash ────────────────────────────────────────────────────────────────────
const data = new SlashCommandBuilder()
  .setName('drogas')
  .setDescription('Sistema de narcotráfico')
  .addSubcommand(s => s.setName('tipos').setDescription('Ver tipos de drogas disponibles'))
  .addSubcommand(s => s.setName('plantaciones').setDescription('Ver tus plantaciones activas'))
  .addSubcommand(s => s.setName('estadisticas').setDescription('Ver tus stats del narcotráfico'));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const player = await getPlayer(interaction.user.id, interaction.user.username);

  if (sub === 'tipos') {
    const embed = new EmbedBuilder()
      .setColor(config.colors.purple)
      .setTitle('💊 Tipos de drogas')
      .setDescription('Planta con `!plantar [tipo]` en el canal correcto.')
      .setFooter({ text: 'Mayor riesgo = mayor valor pero más probabilidad de ser detectado' });
    addImage(embed, 'drogas');

    for (const [key, d] of Object.entries(DROGAS)) {
      const tiempo = Math.floor(d.tiempo / 60000);
      embed.addFields({
        name: `${d.nombre}`,
        value: `⏱️ Tiempo: ${tiempo} min\n💰 Valor: ${formatMoney(d.valorBase)}/unidad\n⚠️ Riesgo: ${Math.floor(d.riesgo * 100)}%\nComando: \`!plantar ${key}\``,
        inline: true,
      });
    }
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'plantaciones') {
    const plots = await DrugPlot.find({ plantadorId: interaction.user.id, fase: { $ne: 'podrido' } });
    if (!plots.length) return interaction.reply({ embeds: [E.info('Sin plantaciones', 'No tienes plantaciones activas.\nUsa `!plantar [tipo]` para comenzar.')] });

    const embed = new EmbedBuilder()
      .setColor(config.colors.purple)
      .setTitle('🌿 Tus plantaciones')
      .setTimestamp();

    for (const p of plots) {
      const cd = DROGAS[p.tipo];
      const now = Date.now();
      const icon = p.fase === 'listo' ? '✅' : p.fase === 'podrido' ? '💀' : '🌱';
      let estado;
      if (p.fase === 'creciendo') {
        const restante = p.listoEn.getTime() - now;
        estado = restante > 0 ? `Listo en ${formatCooldown(restante)}` : 'Lista para cosechar';
      } else if (p.fase === 'listo') {
        estado = '✅ ¡Lista para cosechar!';
      } else {
        estado = '💀 Podrida';
      }
      embed.addFields({ name: `${icon} ${cd?.nombre || p.tipo} (ID: ${p._id.toString().slice(-6)})`, value: estado, inline: true });
    }

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'estadisticas') {
    const plots = await DrugPlot.find({ plantadorId: interaction.user.id });
    const inv = await getInventory(interaction.user.id);
    const drugsInInv = inv.items.filter(i => i.tipo === 'droga');

    const embed = new EmbedBuilder()
      .setColor(config.colors.purple)
      .setTitle(`📊 Stats de narcotráfico de ${player.personajeCreado ? player.getFullName() : interaction.user.username}`)
      .addFields(
        { name: '🌿 Total plantaciones', value: `${plots.length}`, inline: true },
        { name: '✅ Cosechadas (activas listas)', value: `${plots.filter(p => p.fase === 'listo').length}`, inline: true },
        { name: '💊 Drogas en inventario', value: drugsInInv.map(i => `${i.nombre} x${i.cantidad}`).join(', ') || 'Ninguna', inline: false },
        { name: '💰 Dinero sucio acumulado', value: formatMoney(player.dineroSucio || 0), inline: true },
      )
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }
}

// ─── Prefix commands ───────────────────────────────────────────────────────────
const prefixCommands = [
  // !plantar [tipo]
  {
    name: 'plantar',
    aliases: ['plant', 'sembrar'],
    description: '!plantar [marihuana|cocaina|metanfetamina|heroina] — Plantar droga',
    cooldown: 5 * 60 * 1000, // 5 min entre plantaciones
    async run(message, args) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('Sin personaje. Usa `/personaje crear`.');

      const tipo = args[0]?.toLowerCase();
      if (!tipo || !DROGAS[tipo]) {
        return message.reply(`❌ Tipo inválido. Tipos: ${Object.keys(DROGAS).join(', ')}\nEjemplo: \`!plantar marihuana\``);
      }

      // Límite de plantaciones activas (máx 5)
      const activas = await DrugPlot.countDocuments({ plantadorId: message.author.id, fase: 'creciendo' });
      if (activas >= 5) return message.reply('❌ Ya tienes 5 plantaciones activas. Cosecha alguna primero.');

      const drugConfig = DROGAS[tipo];
      const now = Date.now();
      const listoEn = new Date(now + drugConfig.tiempo);
      const podridoEn = new Date(now + drugConfig.tiempo * 2);

      const plot = await DrugPlot.create({
        plantadorId: message.author.id,
        tipo,
        fase: 'creciendo',
        listoEn,
        podridoEn,
      });

      const tiempoMin = Math.floor(drugConfig.tiempo / 60000);
      const embed = new EmbedBuilder()
        .setColor(config.colors.purple)
        .setTitle('🌱 Plantación iniciada')
        .addFields(
          { name: 'Tipo', value: drugConfig.nombre, inline: true },
          { name: 'Lista en', value: `${tiempoMin} minutos`, inline: true },
          { name: 'Valor potencial', value: formatMoney(drugConfig.valorBase * rand(3, 8)), inline: true },
          { name: 'ID', value: plot._id.toString().slice(-6), inline: true },
        )
        .setFooter({ text: 'Te avisaré por DM cuando esté lista · !cosechar para recogerla' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    },
  },

  // !cosechar — Cosechar plantaciones listas
  {
    name: 'cosechar',
    aliases: ['harvest', 'recoger'],
    description: '!cosechar — Cosechar tus plantaciones listas',
    async run(message, args) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('Sin personaje.');

      const inv = await getInventory(message.author.id);
      const plots = await DrugPlot.find({ plantadorId: message.author.id, fase: 'listo' });

      if (!plots.length) {
        const creciendo = await DrugPlot.countDocuments({ plantadorId: message.author.id, fase: 'creciendo' });
        if (creciendo > 0) return message.reply(`⏳ Tienes **${creciendo}** plantaciones creciendo. Todavía no están listas.`);
        return message.reply('❌ No tienes plantaciones listas para cosechar.');
      }

      let totalDrogas = 0;
      let totalValor = 0;
      const detalles = [];

      for (const plot of plots) {
        const d = DROGAS[plot.tipo];
        // Riesgo de incautación policial
        if (Math.random() < d.riesgo) {
          await DrugPlot.deleteOne({ _id: plot._id });
          detalles.push(`❌ **${d.nombre}** — INCAUTADA por la policía`);
          player.arrestos++; // Registro
          continue;
        }
        const cantidad = rand(3, 8);
        inv.addItem({ nombre: d.nombre, tipo: 'droga', emoji: '💊', precio: d.valorBase, cantidad });
        totalDrogas += cantidad;
        totalValor += cantidad * d.valorBase;
        detalles.push(`✅ **${d.nombre}** x${cantidad} (+${formatMoney(cantidad * d.valorBase)})`);
        await DrugPlot.deleteOne({ _id: plot._id });
      }

      await inv.save();
      await player.save();
      await player.addXP(rand(30, 80), player);

      const embed = new EmbedBuilder()
        .setColor(config.colors.purple)
        .setTitle('🌿 Cosecha completada')
        .setDescription(detalles.join('\n'))
        .addFields(
          { name: '💊 Total cosechado', value: `${totalDrogas} unidades`, inline: true },
          { name: '💰 Valor total', value: formatMoney(totalValor), inline: true },
        )
        .setFooter({ text: 'Usa !venderdroga para vender' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    },
  },

  // !plantaciones — Ver plantaciones activas
  {
    name: 'plantaciones',
    aliases: ['misplantas', 'cultivos'],
    description: '!plantaciones — Ver tus plantaciones activas',
    async run(message) {
      const plots = await DrugPlot.find({ plantadorId: message.author.id, fase: { $ne: 'podrido' } });
      if (!plots.length) return message.reply('No tienes plantaciones activas.');

      const embed = new EmbedBuilder()
        .setColor(config.colors.purple)
        .setTitle('🌿 Tus plantaciones activas')
        .setTimestamp();

      for (const p of plots) {
        const d = DROGAS[p.tipo];
        const now = Date.now();
        let estado;
        if (p.fase === 'creciendo') {
          const restante = p.listoEn.getTime() - now;
          estado = restante > 0 ? `⏱️ Lista en ${formatCooldown(restante)}` : '✅ Lista para cosechar';
        } else {
          estado = '✅ Lista — usa `!cosechar`';
        }
        embed.addFields({ name: `🌱 ${d?.nombre || p.tipo}`, value: estado, inline: true });
      }

      return message.reply({ embeds: [embed] });
    },
  },

  // !venderdroga — Vender drogas del inventario
  {
    name: 'venderdroga',
    aliases: ['deal', 'trafico', 'vender-droga'],
    cooldown: config.cooldowns.trafico,
    description: '!venderdroga — Vender drogas al mercado negro',
    async run(message, args) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('Sin personaje.');

      const inv = await getInventory(message.author.id);
      const drogas = inv.items.filter(i => i.tipo === 'droga');

      if (!drogas.length) return message.reply('❌ No tienes drogas en el inventario.');

      // Vender todas las drogas
      let total = 0;
      const detalles = [];

      for (const item of drogas) {
        // Factor de precio variable (mercado negro)
        const factor = 0.7 + Math.random() * 0.6; // 70%-130% del precio base
        const precio = Math.floor(item.precio * factor * item.cantidad);
        total += precio;
        detalles.push(`💊 **${item.nombre}** x${item.cantidad} → ${formatMoney(precio)}`);
        inv.removeItem(item.nombre, item.cantidad);
      }

      player.dineroSucio += total;
      player.robosRealizados++;
      await inv.save();
      await player.save();
      await player.addXP(rand(50, 120), player);

      const embed = new EmbedBuilder()
        .setColor(config.colors.purple)
        .setTitle('💊 Trato cerrado')
        .setDescription(detalles.join('\n'))
        .addFields(
          { name: '💰 Total obtenido', value: formatMoney(total), inline: true },
          { name: '🧹 Tipo', value: 'Dinero sucio (blanquea con `/blanquear`)', inline: true },
        )
        .setFooter({ text: '⚠️ Actividad ilegal — alto riesgo' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    },
  },

  // !laboratorio [tipo] — Procesar drogas (mejora valor)
  {
    name: 'laboratorio',
    aliases: ['lab', 'procesar'],
    cooldown: 2 * 60 * 60 * 1000, // 2 horas
    description: '!laboratorio [tipo] — Procesar drogas en el laboratorio (mayor valor)',
    async run(message, args) {
      const player = await getPlayer(message.author.id, message.author.username);
      if (!player.personajeCreado) return message.reply('Sin personaje.');

      const inv = await getInventory(message.author.id);
      const tipo = args[0]?.toLowerCase();
      const drogas = tipo
        ? inv.items.filter(i => i.tipo === 'droga' && i.nombre.toLowerCase().includes(tipo))
        : inv.items.filter(i => i.tipo === 'droga');

      if (!drogas.length) return message.reply('❌ No tienes drogas para procesar.');

      // Requiere componentes químicos (o simplemente mejora el precio)
      let procesadas = 0;
      for (const item of drogas) {
        item.precio = Math.floor(item.precio * 1.5); // +50% valor al procesar
        item.nombre = `${item.nombre} (pura)`;
        procesadas += item.cantidad;
      }

      await inv.save();

      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.purple)
          .setTitle('🧪 Laboratorio completado')
          .setDescription(`Procesaste **${procesadas}** unidades de droga.\n+50% valor en el mercado negro.`)
          .setTimestamp()],
      });
    },
  },
];

module.exports = { data, execute, prefixCommands };
