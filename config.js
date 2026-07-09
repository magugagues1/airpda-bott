require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_BOT_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  prefix: process.env.BOT_PREFIX || '!',
  mongoUri: process.env.MONGODB_URI,
  pdaBackend: process.env.PDA_BACKEND_URL,
  pdaFrontend: process.env.PDA_FRONTEND_URL,
  pdaMultasWebhook: process.env.PDA_MULTAS_WEBHOOK,
  pdaLogWebhook: process.env.PDA_LOG_WEBHOOK,

  // Roles del servidor Discord
  roles: {
    policia: process.env.DISCORD_POLICE_ROLE_ID,
    sheriff: process.env.DISCORD_SHERIFF_ROLE_ID,
    bombero: process.env.DISCORD_FIREFIGHTER_ROLE_ID,
  },

  // Colores
  colors: {
    primary: 0x3b82f6,
    success: 0x22c55e,
    danger: 0xef4444,
    warning: 0xf59e0b,
    info: 0x06b6d4,
    purple: 0x8b5cf6,
    dark: 0x0d1428,
    gold: 0xfbbf24,
    gang: 0xa78bfa,
  },

  // Economía RP
  economia: {
    salarioBase: 500,
    cashInicial: 2000,
    bankInicial: 5000,
    maxCash: 999999999,
    impuestoBanco: 0,          // % retención al retirar
    impuestoBlanqueo: 0.35,    // 35% de comisión blanqueo
  },

  // Cooldowns (en ms)
  cooldowns: {
    trabajar:     30 * 60 * 1000,    // 30 min
    cobrar:       60 * 60 * 1000,    // 1 hora
    robar:        20 * 60 * 1000,    // 20 min
    atracar:      45 * 60 * 1000,    // 45 min
    pescar:       15 * 60 * 1000,    // 15 min
    minar:        30 * 60 * 1000,    // 30 min
    cazar:        25 * 60 * 1000,    // 25 min
    trafico:      60 * 60 * 1000,    // 1 hora
    casino:        5 * 60 * 1000,    // 5 min
    hospital:     10 * 60 * 1000,    // 10 min
    crime:        30 * 60 * 1000,    // 30 min
    talar:        15 * 60 * 1000,    // 15 min
    picar:        20 * 60 * 1000,    // 20 min
    reparar:       5 * 60 * 1000,    // 5 min
  },

  // Auto-mod
  automod: {
    spamThreshold: 5,         // mensajes en spamWindow
    spamWindow: 5000,         // ms
    maxCaps: 0.7,             // 70% mayúsculas
    minCapsLength: 10,        // mínimo de caracteres para revisar caps
  },

};
