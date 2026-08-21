'use strict';
require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const { connectDB } = require('../database/connection');
const GuildConfig = require('../database/models/GuildConfig');
const Ticket = require('../database/models/Ticket');

const TICKET_VIEWER_ROLE_ID = '1441818963133731017';

async function main() {
  await connectDB();
  console.log('✅ DB conectada');

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  await client.login(process.env.DISCORD_BOT_TOKEN);
  console.log('✅ Discord logueado como', client.user.tag);

  // Esperar a que cachee guilds
  await new Promise(r => setTimeout(r, 2000));

  for (const [guildId, guild] of client.guilds.cache) {
    console.log(`\n── Guild: ${guild.name} (${guildId}) ──`);
    try { await guild.roles.fetch(); } catch {}
    try { await guild.channels.fetch(); } catch {}

    // 1. Asegurar rol en GuildConfig
    const cfg = await GuildConfig.findOne({ guildId });
    if (cfg) {
      if (!cfg.tickets) cfg.tickets = {};
      if (!Array.isArray(cfg.tickets.staffRoles)) cfg.tickets.staffRoles = [];
      if (!cfg.tickets.staffRoles.includes(TICKET_VIEWER_ROLE_ID)) {
        cfg.tickets.staffRoles.push(TICKET_VIEWER_ROLE_ID);
        await cfg.save();
        console.log(`  [config] Rol ${TICKET_VIEWER_ROLE_ID} añadido a staffRoles`);
      } else {
        console.log(`  [config] Rol ya estaba en staffRoles`);
      }
    } else {
      console.log(`  [config] No existe GuildConfig para ${guildId}`);
    }

    if (!guild.roles.cache.has(TICKET_VIEWER_ROLE_ID)) {
      console.log(`  [warn] Rol ${TICKET_VIEWER_ROLE_ID} NO existe en este guild — saltando fix de canales`);
      continue;
    }

    const openTickets = await Ticket.find({ guildId, status: 'open' });
    console.log(`  [tickets] ${openTickets.length} ticket(s) abiertos encontrados`);
    for (const t of openTickets) {
      const ch = await guild.channels.fetch(t.channelId).catch(() => null);
      if (!ch) {
        console.log(`    - ${t.ticketId} | canal ${t.channelId} no encontrado (borrado?)`);
        continue;
      }
      const ow = ch.permissionOverwrites.cache.get(TICKET_VIEWER_ROLE_ID);
      const hasView = ow && ow.allow.has(PermissionFlagsBits.ViewChannel);
      if (hasView) {
        console.log(`    - ${t.ticketId} | #${ch.name} ya tiene permiso`);
        continue;
      }
      await ch.permissionOverwrites.edit(TICKET_VIEWER_ROLE_ID, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageMessages: true,
        AttachFiles: true,
      });
      console.log(`    + ${t.ticketId} | #${ch.name} permiso AÑADIDO`);
    }
  }

  console.log('\n✅ Hecho. Saliendo...');
  await client.destroy();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
