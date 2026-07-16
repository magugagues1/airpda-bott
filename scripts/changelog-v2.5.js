require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL = '1523699567135293621';

const embed = {
  color: 0x3b82f6,
  title: '📋 CHANGELOG — AmericanRP v2.5.0',
  description: `> *Últimas modificaciones — Julio 2026*\n\n` +
    `@everyone\n\n` +
    `═══════════════════════════════════════`,
  fields: [
    {
      name: '🚀 NUEVO SISTEMA DE DROGAS',
      value:
        '▸ **8 tipos de droga**: Marihuana, LSD, Cocaína, Éxtasis, Metanfetamina, Ketamina, Heroína, Fentanilo\n' +
        '▸ **Semillas** en el Mercado Negro (🏴 /tienda)\n' +
        '▸ **Sistema de riego**: cada planta necesita varios riegos o se pudre\n' +
        '▸ **Laboratorio**: monta tu lab con piezas (reactor, condensador, tubos, químicos)\n' +
        '▸ **Venta con pasos obligatorios**: vestimenta → vehículo → ubicación\n' +
        '▸ **Resultados aleatorios**: 60% éxito, 25% parcial, 15% 🚨 la policía recibe alerta automática\n' +
        '▸ **Requisito de nivel de banda**: drogas de alto nivel requieren banda nivel 3-5',
      inline: false,
    },
    {
      name: '🚨 NUEVO SISTEMA 911',
      value:
        '▸ **Operador automático**: el bot te hace preguntas una por una\n' +
        '▸ **Datos solicitados**: nombre, vestimenta, vehículo, armas, notas\n' +
        '▸ **Selección de zona**: Ciudad / Gran Señora / Norte (Paleto)\n' +
        '▸ **Mapa interactivo**: elige tu zona → escribe código postal → se marca con círculo rojo\n' +
        '▸ **Canvas**: el código postal se dibuja sobre el mapa automáticamente\n' +
        '▸ **Coordenadas**: +100 códigos postales calibrados en los 3 mapas\n' +
        '▸ **Botón cancelar** durante toda la llamada\n' +
        '▸ **Alertas con roles**: 🚔 policía, 🚑 médicos, 🚒 bomberos, 📟 todas las emergencias\n' +
        '▸ **Canal 911 dedicado** (solo lectura + alertas automáticas)',
      inline: false,
    },
    {
      name: '🏴 MERCADO NEGRO',
      value:
        '▸ **Nueva sección** en /tienda con 16 artículos ilegales\n' +
        '▸ **Semillas** de todas las drogas (nivel banda requerido)\n' +
        '▸ **Piezas de laboratorio**: reactor, condensador, tubos, químicos\n' +
        '▸ **Armas ilegales**: pistola sin serie, subfusil artesanal, silenciador\n' +
        '▸ **Paneles de luz UV**: aceleran crecimiento de plantas',
      inline: false,
    },
    {
      name: '🛡️ SISTEMA DE SEGURIDAD (ANTI-RAID)',
      value:
        '▸ **Anti-spam**: 5 msgs en 3s → timeout 5min + borrado de todos los mensajes\n' +
        '▸ **Anti-links**: enlaces no permitidos → eliminados + timeout\n' +
        '▸ **Anti-menciones**: +5 menciones → timeout\n' +
        '▸ **Anti-publicidad**: invites, malas palabras → timeout 10min\n' +
        '▸ **Anti-imagen**: 2+ imágenes → aviso, reincidencia → timeout\n' +
        '▸ **Anti-repetición**: @everyone spam, flood de caracteres, ASCII art, patrones\n' +
        '▸ **Anti-raid joins**: +10 uniones en 10s → modo raid automático\n' +
        '▸ **Evidencia en PNG**: captura del mensaje infractor\n' +
        '▸ **Logs** en canal de seguridad',
      inline: false,
    },
    {
      name: '🗺️ MAPAS DE CÓDIGOS POSTALES',
      value:
        '▸ **3 mapas**: Ciudad, Gran Señora, Norte (Paleto)\n' +
        '▸ **Comando !mapa** para probar códigos\n' +
        '▸ **Círculo rojo** en la posición exacta del código\n' +
        '▸ +100 coordenadas calibradas\n' +
        '▸ **Códigos numéricos** estilo 8082, 9012, 5123...\n' +
        '▸ **Sistema de retry** en 911: si el código no existe, da 3 intentos',
      inline: false,
    },
    {
      name: '🔇 CANALES PROHIBIDOS',
      value:
        '▸ 4 canales bloqueados para comandos\n' +
        '▸ 1ª vez: ⚠️ aviso\n' +
        '▸ 2ª vez: ⚠️ último aviso\n' +
        '▸ 3ª vez: 🔇 aislado 5 min automáticamente',
      inline: false,
    },
    {
      name: '🇪🇸 NACIONALIDAD',
      value:
        '▸ Nueva pregunta durante registro (web y bot)\n' +
        '▸ 25 países con banderas\n' +
        '▸ Se muestra en: perfil web, ficha Discord, !mirar, DNI',
      inline: false,
    },
    {
      name: '🔧 OTRAS MEJORAS',
      value:
        '▸ **Código Penal**: scroll horizontal en móvil, severidad visible\n' +
        '▸ **Status**: ID PSN en embed + configurable desde web y bot\n' +
        '▸ **Consola web**: ejecuta comandos prefix desde el staff panel\n' +
        '▸ **Rebranding**: AmericanPolSim → AmericanRP\n' +
        '▸ **Menu responsive** en móvil para staff panel\n' +
        '▸ **Logs de git** automáticos en canal de desarrollo\n' +
        '▸ **Bienvenidas** con canal dedicado + embed con botones\n' +
        '▸ **Webhook** en venta de drogas para alertas 911\n' +
        '▸ **Bugfix**: anti-imagen roto por typo (.lengt → .length)\n' +
        '▸ **Bugfix**: comandos desde consola web ahora ejecutan correctamente\n' +
        '▸ **Bugfix**: nacionalidad no se mostraba en PDA LSPD / perfil',
      inline: false,
    },
  ],
  timestamp: new Date().toISOString(),
  footer: { text: 'AmericanRP Bot v2.5.0 · Changelog automático' },
};

const payload = JSON.stringify({
  content: '@everyone',
  embeds: [embed],
  allowed_mentions: { parse: ['everyone'] },
});

const req = https.request({
  hostname: 'discord.com',
  path: `/api/v10/channels/${CHANNEL}/messages`,
  method: 'POST',
  headers: {
    'Authorization': `Bot ${TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('[Changelog]', res.statusCode, d.slice(0, 100));
  });
});
req.on('error', e => console.error(e));
req.write(payload);
req.end();