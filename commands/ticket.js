'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
  ticketAddUser, ticketRemoveUser, ticketRename,
  ticketClose, ticketTranscript, sendTicketPanel,
} = require('../systems/tickets/ticketSystem');

const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Sistema de tickets')
  .addSubcommand(s => s.setName('panel').setDescription('Enviar panel de tickets al canal actual'))
  .addSubcommand(s => s.setName('add').setDescription('Añadir usuario al ticket')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario a añadir').setRequired(true)))
  .addSubcommand(s => s.setName('remove').setDescription('Quitar usuario del ticket')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario a quitar').setRequired(true)))
  .addSubcommand(s => s.setName('rename').setDescription('Renombrar el ticket')
    .addStringOption(o => o.setName('nombre').setDescription('Nuevo nombre').setRequired(true).setMaxLength(90)))
  .addSubcommand(s => s.setName('close').setDescription('Cerrar el ticket actual')
    .addStringOption(o => o.setName('motivo').setDescription('Motivo del cierre').setRequired(false).setMaxLength(300)))
  .addSubcommand(s => s.setName('transcript').setDescription('Generar transcripción del ticket actual'));

async function execute(interaction, client) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'panel') {
    const GuildConfig = require('../database/models/GuildConfig');
    const gc = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!gc) return interaction.reply({ content: '❌ Configuración no encontrada.', ephemeral: true });
    const channel = interaction.channel;
    const msgId = await sendTicketPanel(channel, gc);
    gc.tickets.mensajePanelId = msgId;
    gc.tickets.panelChannelId = channel.id;
    await gc.save();
    return interaction.reply({ content: `✅ Panel de tickets enviado en ${channel}.`, ephemeral: true });
  }

  if (sub === 'add') return ticketAddUser(interaction);
  if (sub === 'remove') return ticketRemoveUser(interaction);
  if (sub === 'rename') return ticketRename(interaction);
  if (sub === 'close') return ticketClose(interaction, client);
  if (sub === 'transcript') return ticketTranscript(interaction, client);
}

module.exports = { data, execute };