const axios = require('axios');
const config = require('../config');

const COLOR_TIPO = {
  multa: 0xf59e0b,
  arresto: 0xef4444,
  aviso: 0x3b82f6,
  ban_temporal: 0x8b5cf6,
  ck: 0x000000,
};

const EMOJI_TIPO = {
  multa: '\uD83D\uDCB0',
  arresto: '\uD83D\uDE94',
  aviso: '\u26A0\uFE0F',
  ban_temporal: '\uD83D\uDEAB',
  ck: '\uD83D\uDC80',
};

async function notificarSancion(data) {
  const { tipo, ciudadanoNombre, ciudadanoPsnId, agente, cantidad, tiempoCarcel, motivo, articulos, fecha } = data;

  const fields = [
    { name: '\uD83D\uDC64 Ciudadano', value: ciudadanoNombre || 'Desconocido', inline: true },
    { name: '\uD83D\uDEE1\uFE0F ID PSN', value: ciudadanoPsnId || 'N/A', inline: true },
    { name: '\uD83D\uDC6E Agente', value: agente, inline: true },
    { name: '\uD83D\uDCB0 Multa', value: cantidad ? `$${cantidad.toLocaleString('es-ES')}` : '\u2014', inline: true },
    { name: '\u23F1\uFE0F C\u00e1rcel', value: tiempoCarcel ? `${tiempoCarcel} minutos` : '\u2014', inline: true },
    { name: '\uD83D\uDCC5 Fecha', value: fecha ? new Date(fecha).toLocaleString('es-ES') : new Date().toLocaleString('es-ES'), inline: true },
    { name: '\uD83D\uDCCB Motivo', value: motivo || 'Sin motivo especificado', inline: false },
  ];

  if (articulos?.length) {
    const lista = articulos.map(a => `\`${a.articulo}\` ${a.nombre}`).join('\n');
    fields.push({ name: '\u2696\uFE0F Art\u00edculos aplicados', value: lista.substring(0, 1000), inline: false });
  }

  const embed = {
    title: `${EMOJI_TIPO[tipo] || '\u2696\uFE0F'} Nueva Sanci\u00f3n \u2014 ${(tipo || '').toUpperCase()}`,
    color: COLOR_TIPO[tipo] || 0x64748b,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: 'AmericanRP \u2014 Sistema de Sanciones' },
  };

  const promises = [];

  if (config.pdaMultasWebhook) {
    promises.push(
      axios.post(config.pdaMultasWebhook, { embeds: [embed] }).catch(() => {}),
    );
  }

  if (config.pdaLogWebhook) {
    const logEmbed = {
      title: `\u2696\uFE0F [LOG] SANCION_CREATED`,
      description: `Sanci\u00f3n [${tipo}] aplicada a ${ciudadanoNombre}`,
      color: 0xf59e0b,
      fields: [
        { name: '\uD83D\uDC64 Agente', value: agente || 'Sistema', inline: true },
        { name: '\uD83D\uDD52 Hora', value: new Date().toLocaleString('es-ES'), inline: true },
        { name: '\uD83D\uDCE6 Datos', value: `\`\`\`json\n${JSON.stringify({ tipo, ciudadano: ciudadanoNombre, cantidad }, null, 2).substring(0, 900)}\n\`\`\``, inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'AmericanRP \u2014 PDA Log System' },
    };
    promises.push(
      axios.post(config.pdaLogWebhook, { embeds: [logEmbed] }).catch(() => {}),
    );
  }

  await Promise.allSettled(promises);
}

module.exports = { notificarSancion };
