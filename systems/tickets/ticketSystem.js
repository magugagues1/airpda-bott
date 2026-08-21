'use strict';

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ChannelType, PermissionFlagsBits,
  ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, MessageFlags,
} = require('discord.js');
const GuildConfig = require('../../database/models/GuildConfig');
const Ticket      = require('../../database/models/Ticket');
const E = require('../../utils/embeds');
const { sendLog, logEmbed, sendTranscript, sendRecord } = require('../../utils/logger');
const config = require('../../config');

const COLORS = {
  PRIMARY:  config.colors.primary,
  DARK:     0x1A1A1A,
  SUCCESS:  config.colors.success,
  DANGER:   config.colors.danger,
  WARNING:  config.colors.warning,
  INFO:     config.colors.info,
  MUTED:    0x95A5A6,
};

// Rol que SIEMPRE puede ver todos los tickets (sin importar config)
const TICKET_VIEWER_ROLE_ID = '1441818963133731017';

const TICKET_CATEGORIES = {
  soporte:    { label: 'Soporte',    emoji: '🔧', color: 0x3498DB },
  reporte:    { label: 'Reporte',    emoji: '🚨', color: 0xFF4444 },
  apelacion:  { label: 'Apelación',  emoji: '⚖️', color: 0xF39C12 },
  sugerencia: { label: 'Sugerencia', emoji: '💡', color: 0x2ECC71 },
  rp:         { label: 'Duda RP',    emoji: '🎭', color: 0x9B59B6 },
  whitelist:  { label: 'Whitelist',  emoji: '📝', color: 0x2ECC71 },
};

const TICKET_COOLDOWN = 30000;
const TICKET_MAX_PER_USER = 2;

// ─── Wrappers para compatibilidad con E ───────────────────────────────────────
function errorEmbed(text) { return E.err('Error', text); }
function successEmbed(text, title) { return E.ok(title || 'Éxito', text); }
function baseEmbed(color) { return new EmbedBuilder().setColor(color || COLORS.PRIMARY).setTimestamp(); }

// ─── Cooldown en memoria ───────────────────────────────────────────────────────
const ticketCooldowns = new Map();

// ─── Generar ID único de ticket ───────────────────────────────────────────────
function generateTicketId(prefix = 'BN') {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

// ─── Descripciones de categoría ───────────────────────────────────────────────
function getCategoryDescription(key) {
  const descs = {
    soporte:   'Problemas técnicos o ayuda general',
    compras:   'Donaciones, VIP, rangos y compras',
    reporte:   'Reportar a un jugador infractor',
    apelacion: 'Apelar una sanción recibida',
    staff:     'Contacto directo con el equipo',
    whitelist: 'Solicitud de acceso al servidor',
  };
  return descs[key] ?? 'Abrir ticket';
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL
// ════════════════════════════════════════════════════════════════════════════════
async function sendTicketPanel(channel, config) {
  const e = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('🎫 Sistema de Tickets')
    .setDescription(
      '**¿Necesitas ayuda?** Selecciona el tipo de ticket en el menú de abajo.\n\n' +
      Object.entries(TICKET_CATEGORIES).map(([k, v]) =>
        `${v.emoji} **${v.label}** — ${getCategoryDescription(k)}`
      ).join('\n') +
      '\n\n> ⚠️ Abre tickets **solo si realmente los necesitas**. El abuso del sistema puede conllevar sanciones.'
    )
    .setThumbnail(channel.guild.iconURL({ dynamic: true }))
    .setFooter({ text: 'Sistema de Tickets' })
    .setTimestamp();

  const select = new StringSelectMenuBuilder()
    .setCustomId('ticket_category_select')
    .setPlaceholder('📋 Selecciona el tipo de ticket...')
    .addOptions(
      Object.entries(TICKET_CATEGORIES).map(([value, cat]) => ({
        label: cat.label,
        value,
        emoji: cat.emoji,
        description: getCategoryDescription(value),
      }))
    );

  const row = new ActionRowBuilder().addComponents(select);
  const msg = await channel.send({ embeds: [e], components: [row] });
  return msg.id;
}

// ════════════════════════════════════════════════════════════════════════════════
// CREAR TICKET — enruta al canal de categoría correcto
// ════════════════════════════════════════════════════════════════════════════════
async function handleTicketCreate(interaction, client) {
  const category = interaction.values[0];
  const guild    = interaction.guild;
  const user     = interaction.user;

  if (category === 'whitelist') return openWhitelistModal(interaction);

  // Cooldown
  const cooldownKey = `${user.id}-${guild.id}`;
  const lastUsed    = ticketCooldowns.get(cooldownKey);
  if (lastUsed && Date.now() - lastUsed < TICKET_COOLDOWN) {
    const remaining = Math.ceil((TICKET_COOLDOWN - (Date.now() - lastUsed)) / 1000);
    return interaction.reply({
      embeds: [errorEmbed(`Debes esperar **${remaining}s** antes de abrir otro ticket.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config = await GuildConfig.findOne({ guildId: guild.id });
  if (!config) {
    return interaction.editReply({ embeds: [errorEmbed('El bot no está configurado en este servidor.')] });
  }

  // Límite de tickets abiertos
  const openTickets = await Ticket.countDocuments({ userId: user.id, guildId: guild.id, status: 'open' });
  if (openTickets >= TICKET_MAX_PER_USER) {
    return interaction.editReply({
      embeds: [errorEmbed(`Ya tienes **${openTickets}** ticket(s) abierto(s). Ciérralos antes de abrir uno nuevo.`)],
    });
  }

  ticketCooldowns.set(cooldownKey, Date.now());

  const ticketId = generateTicketId();
  const catInfo  = TICKET_CATEGORIES[category];

  // ── Resolver/crear categoría para este tipo de ticket ─────────────────────
  const CATEGORY_NAMES = {
    soporte:   'Soporte',
    compras:   'Compras',
    reporte:   'Reportes',
    apelacion: 'Apelaciones',
    staff:     'Staff',
    whitelist: 'Whitelist',
  };

  let parentId = null;
  const categoryName = CATEGORY_NAMES[category] || 'Tickets';

  // Buscar categoría existente por nombre
  let cat = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === categoryName
  );

  // Si no existe, crearla
  if (!cat) {
    cat = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
      reason: `Categoría automática para tickets de ${category}`,
    });
    // Mover al inicio (posición 0) para que quede arriba
    try { await cat.setPosition(0); } catch {}
  }

  parentId = cat.id;

  // ── Crear canal ─────────────────────────────────────────────────────────────
  const channelName = `${catInfo.emoji}・${category}-${user.username}`
    .toLowerCase().replace(/\s+/g, '-').substring(0, 100);

  // Filtrar roles de staff válidos + SIEMPRE incluir el rol 1441818963133731017
  // Ese rol podrá ver TODOS los tickets aunque no esté en config.tickets.staffRoles
  const allStaffRoles = [...new Set([...(config.tickets?.staffRoles ?? []), TICKET_VIEWER_ROLE_ID])];
  const validStaffRoles = allStaffRoles.filter(id => {
    // El rol viewer siempre se intenta incluir; si no está en caché intentamos fetchearlo después
    if (id === TICKET_VIEWER_ROLE_ID) return true;
    return guild.roles.cache.has(id);
  });
  // Si el rol viewer no está en caché, intentar fetchearlo para validar que existe
  if (!guild.roles.cache.has(TICKET_VIEWER_ROLE_ID)) {
    try { await guild.roles.fetch(TICKET_VIEWER_ROLE_ID); } catch {}
  }
  // Si tras el fetch sigue sin existir, lo filtramos para no romper la creación del canal
  const finalStaffRoles = validStaffRoles.filter(id => id !== TICKET_VIEWER_ROLE_ID || guild.roles.cache.has(id));

  // Persistir el rol en la config si no estaba (para que aparezca en futuros listados)
  if (! (config.tickets?.staffRoles ?? []).includes(TICKET_VIEWER_ROLE_ID)) {
    try {
      const cfg = await GuildConfig.findOne({ guildId: guild.id });
      if (cfg && !cfg.tickets.staffRoles.includes(TICKET_VIEWER_ROLE_ID)) {
        cfg.tickets.staffRoles.push(TICKET_VIEWER_ROLE_ID);
        await cfg.save();
      }
    } catch {}
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId,
    topic: `Ticket ${ticketId} | Usuario: ${user.tag} | Categoría: ${catInfo.label}`,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      ...finalStaffRoles.map(roleId => ({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.AttachFiles,
        ],
      })),
      ...(guild.members.me ? [{
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      }] : []),
    ],
    reason: `Ticket ${ticketId} abierto por ${user.tag}`,
  });

  // Si la categoría tiene posición 0, mover el canal al principio
  try { await channel.setPosition(0); } catch {}

  // Guardar en BD
  await Ticket.create({
    ticketId,
    guildId:   guild.id,
    channelId: channel.id,
    userId:    user.id,
    category,
    status:    'open',
    messages:  0,
  });

  // Mención: siempre incluye el rol viewer + todos los staffRoles (deduplicado)
  const mentionRoles = [...new Set([...(config.tickets?.staffRoles ?? []), TICKET_VIEWER_ROLE_ID])];
  const staffMention = mentionRoles.map(r => `<@&${r}>`).join(' ') || `<@&${TICKET_VIEWER_ROLE_ID}>`;

  const ticketEmbed = new EmbedBuilder()
    .setColor(catInfo.color)
    .setTitle(`${catInfo.emoji} Ticket — ${catInfo.label}`)
    .setDescription(
      `Hola <@${user.id}>, bienvenido a tu ticket de **${catInfo.label}**.\n` +
      `Un miembro del staff te atenderá en breve.\n\n` +
      `> 📌 **Describe tu problema con el máximo detalle posible.**\n` +
      `> 📎 Puedes adjuntar capturas de pantalla si es necesario.\n` +
      `> 🚫 No añadas a nadie al ticket sin permiso del staff.`
    )
    .addFields(
      { name: '🆔 ID del Ticket',  value: `\`${ticketId}\``,                            inline: true },
      { name: '📂 Categoría',       value: catInfo.label,                                 inline: true },
      { name: '👤 Usuario',         value: `<@${user.id}>`,                               inline: true },
      { name: '🕐 Abierto el',      value: `<t:${Math.floor(Date.now() / 1000)}:F>`,      inline: true },
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'American Island • Sistema de Tickets v2' })
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_close_${channel.id}`)
      .setLabel('Cerrar')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
    new ButtonBuilder()
      .setCustomId(`ticket_claim_${channel.id}`)
      .setLabel('Reclamar')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👋'),
    new ButtonBuilder()
      .setCustomId(`ticket_transcript_${channel.id}`)
      .setLabel('Transcripción')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📋'),
  );

  await channel.send({
    content: `<@${user.id}> ${staffMention}`,
    embeds: [ticketEmbed],
    components: [buttons],
  });

  await interaction.editReply({
    embeds: [successEmbed(`Tu ticket ha sido creado: <#${channel.id}>`, `${catInfo.emoji} Ticket creado`)],
  });

  await sendLog(guild, 'tickets', logEmbed(`${'🎫' || '🎫'} Ticket abierto`, COLORS.INFO, [
    { name: 'ID',        value: ticketId,                   inline: true },
    { name: 'Categoría', value: catInfo.label,              inline: true },
    { name: 'Usuario',   value: `${user.tag} (${user.id})`, inline: true },
    { name: 'Canal',     value: `<#${channel.id}>`,          inline: true },
  ]));
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTER DE BOTONES
// ════════════════════════════════════════════════════════════════════════════════
async function handleTicketButton(interaction, client) {
  const id = interaction.customId;
  if (id.startsWith('ticket_close_'))         return closeTicket(interaction, id.replace('ticket_close_', ''), client);
  if (id.startsWith('ticket_claim_'))         return claimTicket(interaction);
  if (id.startsWith('ticket_transcript_'))    return ticketTranscript(interaction, client);
  if (id.startsWith('ticket_confirm_close_')) return confirmCloseTicket(interaction, id.replace('ticket_confirm_close_', ''), client);
  if (id.startsWith('ticket_cancel_close_'))  return cancelCloseTicket(interaction);
}

// ════════════════════════════════════════════════════════════════════════════════
// CERRAR TICKET
// ════════════════════════════════════════════════════════════════════════════════
async function closeTicket(interaction, channelId, client) {
  const ticket = await Ticket.findOne({ channelId, status: 'open' });
  if (!ticket) {
    return interaction.reply({ embeds: [errorEmbed('Este ticket no existe o ya está cerrado.')], flags: MessageFlags.Ephemeral });
  }

  const confirmEmbed = new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle('⚠️ ¿Cerrar este ticket?')
    .setDescription(
      '¿Estás seguro de que quieres cerrar este ticket?\n' +
      'Se generará una transcripción completa antes de eliminarlo.'
    );

  const confirmButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_confirm_close_${channelId}`)
      .setLabel('Sí, cerrar')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
    new ButtonBuilder()
      .setCustomId(`ticket_cancel_close_${channelId}`)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✖️'),
  );

  await interaction.reply({ embeds: [confirmEmbed], components: [confirmButtons], flags: MessageFlags.Ephemeral });
}

async function confirmCloseTicket(interaction, channelId, client) {
  await interaction.deferUpdate();

  const ticket = await Ticket.findOne({ channelId, status: 'open' });
  if (!ticket) {
    return interaction.editReply({ embeds: [errorEmbed('Ticket no encontrado.')], components: [] });
  }

  const config = await GuildConfig.findOne({ guildId: interaction.guild.id });

  // ── Recopilar datos enriquecidos para la transcripción ──────────────────────
  const closedBy   = interaction.user;
  const claimedBy  = ticket.claimedBy
    ? await interaction.guild.members.fetch(ticket.claimedBy).catch(() => null)
    : null;
  const openedBy   = await interaction.guild.members.fetch(ticket.userId).catch(() => null);

  // Permisos del canal → lista de usuarios involucrados
  const involvedIds = new Set();
  involvedIds.add(ticket.userId);
  if (ticket.claimedBy) involvedIds.add(ticket.claimedBy);
  involvedIds.add(closedBy.id);

  // Recoger todos los mensajes del canal para el transcript
  const rawMessages = await fetchAllMessages(interaction.channel);

  // Registrar en involvedIds a quien habló
  for (const m of rawMessages) {
    if (!m.author.bot) involvedIds.add(m.author.id);
  }

  const involvedMentions = [...involvedIds].map(id => `<@${id}>`).join(', ');

  // ── Generar los 4 formatos ──────────────────────────────────────────────────
  const transcriptData = buildTranscriptData(ticket, rawMessages, {
    closedBy,
    claimedBy,
    openedBy,
    guild: interaction.guild,
    channel: interaction.channel,
  });

  const files = buildTranscriptFiles(transcriptData);

  // ── Embed de transcripción para el canal de logs ────────────────────────────
  const trEmbed = buildTranscriptEmbed(ticket, transcriptData.meta, {
    closedBy,
    claimedBy,
    openedBy,
    involvedMentions,
    messageCount: rawMessages.length,
  });

  // ── Enviar a canal de transcripciones ─────────────────────────────────────
  await sendTranscript(interaction.guild, trEmbed, files);

  // ── Enviar registro a canal de records ────────────────────────────────────
  const recEmbed = new EmbedBuilder()
    .setColor(COLORS.DANGER)
    .setTitle(`🔒 Ticket Cerrado — #${ticket.ticketId}`)
    .setDescription(
      `**Categoría:** ${TICKET_CATEGORIES[ticket.category]?.label ?? ticket.category}\n` +
      `**Abierto por:** ${openedBy ? openedBy.user.tag : `<@${ticket.userId}>`}\n` +
      `**Cerrado por:** ${closedBy.tag}\n` +
      `**Motivo:** ${ticket.closeReason || 'No especificado'}\n` +
      `**Mensajes:** ${rawMessages.length}`
    )
    .setFooter({ text: ticket.ticketId })
    .setTimestamp();
  await sendRecord(interaction.guild, recEmbed);

  // ── DM al usuario ──────────────────────────────────────────────────────────
  try {
    if (openedBy) {
      const dmEmbed = new EmbedBuilder()
        .setColor(COLORS.MUTED)
        .setTitle('🔒 Tu ticket ha sido cerrado')
        .setDescription(
          `**Servidor:** ${interaction.guild.name}\n` +
          `**Ticket ID:** \`${ticket.ticketId}\`\n` +
          `**Categoría:** ${TICKET_CATEGORIES[ticket.category]?.label ?? ticket.category}\n` +
          `**Admin que atendió:** ${claimedBy?.user?.tag ?? 'Sin reclamar'}\n` +
          `**Cerrado por:** ${closedBy.tag}\n\n` +
          `Adjunto encontrarás la transcripción completa de tu ticket.`
        )
        .setFooter({ text: 'American Island • Sistema de Tickets' })
        .setTimestamp();
      await openedBy.send({ embeds: [dmEmbed], files }).catch(() => {});
    }
  } catch {}

  // ── Actualizar BD ──────────────────────────────────────────────────────────
  await Ticket.updateOne(
    { channelId },
    { status: 'closed', closedBy: closedBy.id, closedAt: new Date() }
  );

  const closeEmbed = new EmbedBuilder()
    .setColor(COLORS.DANGER)
    .setTitle('🔒 Ticket cerrado')
    .setDescription(
      `Ticket cerrado por <@${closedBy.id}>.\n` +
      `El canal se eliminará en **5 segundos**.`
    );

  await interaction.channel.send({ embeds: [closeEmbed] });

  await sendLog(interaction.guild, 'tickets', logEmbed(`🔒 Ticket cerrado`, COLORS.DANGER, [
    { name: 'ID',          value: ticket.ticketId,        inline: true },
    { name: 'Cerrado por', value: closedBy.tag,            inline: true },
    { name: 'Usuario',     value: `<@${ticket.userId}>`,   inline: true },
    { name: 'Admin',       value: claimedBy?.user?.tag ?? 'Sin reclamar', inline: true },
    { name: 'Mensajes',    value: String(rawMessages.length), inline: true },
  ]));

  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

async function cancelCloseTicket(interaction) {
  await interaction.update({
    embeds: [successEmbed('Cierre cancelado. El ticket sigue abierto.')],
    components: [],
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// RECLAMAR TICKET
// ════════════════════════════════════════════════════════════════════════════════
async function claimTicket(interaction) {
  const ticket = await Ticket.findOne({ channelId: interaction.channelId });
  if (!ticket) return interaction.reply({ embeds: [errorEmbed('Ticket no encontrado.')], flags: MessageFlags.Ephemeral });

  if (ticket.claimedBy) {
    return interaction.reply({
      embeds: [errorEmbed(`Este ticket ya ha sido reclamado por <@${ticket.claimedBy}>.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  await Ticket.updateOne({ channelId: interaction.channelId }, { claimedBy: interaction.user.id });

  const e = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('👋 Ticket reclamado')
    .setDescription(`<@${interaction.user.id}> está atendiendo este ticket.\nPor favor, sé paciente.`)
    .setTimestamp();

  await interaction.reply({ embeds: [e] });
}

// ════════════════════════════════════════════════════════════════════════════════
// SUBCOMANDOS: /ticket add | remove | rename | close | transcript
// ════════════════════════════════════════════════════════════════════════════════

// /ticket add @usuario
async function ticketAddUser(interaction) {
  const ticket = await Ticket.findOne({ channelId: interaction.channelId, status: 'open' });
  if (!ticket) {
    return interaction.reply({ embeds: [errorEmbed('Este canal no es un ticket abierto.')], flags: MessageFlags.Ephemeral });
  }

  const target = interaction.options.getUser('usuario');
  if (!target) {
    return interaction.reply({ embeds: [errorEmbed('Debes mencionar un usuario.')], flags: MessageFlags.Ephemeral });
  }

  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    return interaction.reply({ embeds: [errorEmbed('No se encontró ese usuario en el servidor.')], flags: MessageFlags.Ephemeral });
  }

  await interaction.channel.permissionOverwrites.edit(member, {
    ViewChannel:        true,
    SendMessages:       true,
    ReadMessageHistory: true,
    AttachFiles:        true,
  });

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('➕ Usuario añadido')
        .setDescription(`<@${member.id}> ha sido añadido al ticket.`)
        .setTimestamp(),
    ],
  });
}

// /ticket remove @usuario
async function ticketRemoveUser(interaction) {
  const ticket = await Ticket.findOne({ channelId: interaction.channelId, status: 'open' });
  if (!ticket) {
    return interaction.reply({ embeds: [errorEmbed('Este canal no es un ticket abierto.')], flags: MessageFlags.Ephemeral });
  }

  const target = interaction.options.getUser('usuario');
  if (!target) {
    return interaction.reply({ embeds: [errorEmbed('Debes mencionar un usuario.')], flags: MessageFlags.Ephemeral });
  }

  // No se puede eliminar al creador del ticket
  if (target.id === ticket.userId) {
    return interaction.reply({ embeds: [errorEmbed('No puedes eliminar al creador del ticket.')], flags: MessageFlags.Ephemeral });
  }

  await interaction.channel.permissionOverwrites.delete(target.id).catch(() => {});

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle('➖ Usuario eliminado')
        .setDescription(`<@${target.id}> ha sido eliminado del ticket.`)
        .setTimestamp(),
    ],
  });
}

// /ticket rename <nombre>
async function ticketRename(interaction) {
  const ticket = await Ticket.findOne({ channelId: interaction.channelId, status: 'open' });
  if (!ticket) {
    return interaction.reply({ embeds: [errorEmbed('Este canal no es un ticket abierto.')], flags: MessageFlags.Ephemeral });
  }

  const newName = interaction.options.getString('nombre');
  if (!newName || newName.length < 2 || newName.length > 90) {
    return interaction.reply({ embeds: [errorEmbed('El nombre debe tener entre 2 y 90 caracteres.')], flags: MessageFlags.Ephemeral });
  }

  const catInfo = TICKET_CATEGORIES[ticket.category];
  const sanitized = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  const finalName = `${catInfo?.emoji ?? '🎫'}・${sanitized}`.substring(0, 100);

  await interaction.channel.setName(finalName, `Ticket renombrado por ${interaction.user.tag}`);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('✏️ Ticket renombrado')
        .setDescription(`El canal ha sido renombrado a **${finalName}**.`)
        .setTimestamp(),
    ],
  });
}

// /ticket close [motivo]
async function ticketClose(interaction, client) {
  const ticket = await Ticket.findOne({ channelId: interaction.channelId, status: 'open' });
  if (!ticket) {
    return interaction.reply({ embeds: [errorEmbed('Este canal no es un ticket abierto.')], flags: MessageFlags.Ephemeral });
  }

  const motivo = interaction.options.getString('motivo') ?? 'Sin motivo especificado';

  const confirmEmbed = new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle('⚠️ ¿Cerrar este ticket?')
    .setDescription(
      `**Motivo:** ${motivo}\n\n` +
      'Se generará una transcripción completa antes de eliminar el canal.'
    );

  const confirmButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_confirm_close_${interaction.channelId}`)
      .setLabel('Sí, cerrar')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
    new ButtonBuilder()
      .setCustomId(`ticket_cancel_close_${interaction.channelId}`)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✖️'),
  );

  // Guardar el motivo en BD para usarlo en la transcripción
  await Ticket.updateOne({ channelId: interaction.channelId }, { closeReason: motivo });

  await interaction.reply({ embeds: [confirmEmbed], components: [confirmButtons] });
}

// /ticket transcript
async function ticketTranscript(interaction, client) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const ticket = await Ticket.findOne({ channelId: interaction.channelId });
  if (!ticket) {
    return interaction.editReply({ embeds: [errorEmbed('Ticket no encontrado.')] });
  }

  const rawMessages = await fetchAllMessages(interaction.channel);
  const claimedBy   = ticket.claimedBy
    ? await interaction.guild.members.fetch(ticket.claimedBy).catch(() => null)
    : null;
  const openedBy    = await interaction.guild.members.fetch(ticket.userId).catch(() => null);

  const involvedIds = new Set();
  involvedIds.add(ticket.userId);
  if (ticket.claimedBy) involvedIds.add(ticket.claimedBy);
  involvedIds.add(interaction.user.id);
  for (const m of rawMessages) { if (!m.author.bot) involvedIds.add(m.author.id); }

  const involvedMentions = [...involvedIds].map(id => `<@${id}>`).join(', ');

  const transcriptData = buildTranscriptData(ticket, rawMessages, {
    closedBy:  interaction.user,
    claimedBy,
    openedBy,
    guild:     interaction.guild,
    channel:   interaction.channel,
  });

  const files    = buildTranscriptFiles(transcriptData);
  const trEmbed  = buildTranscriptEmbed(ticket, transcriptData.meta, {
    closedBy:       interaction.user,
    claimedBy,
    openedBy,
    involvedMentions,
    messageCount:   rawMessages.length,
    isManual:       true,
  });

  await sendTranscript(interaction.guild, trEmbed, files);

  await interaction.editReply({
    content: '📋 Transcripción generada y enviada al canal de logs.',
    files,
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS DE TRANSCRIPCIÓN
// ════════════════════════════════════════════════════════════════════════════════

// Recoger todos los mensajes (supera el límite de 100)
async function fetchAllMessages(channel) {
  const all = [];
  let lastId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;

    all.push(...batch.values());
    lastId = batch.last().id;

    if (batch.size < 100) break;
  }

  return all.reverse(); // orden cronológico
}

// Construir objeto de datos enriquecido
function buildTranscriptData(ticket, messages, { closedBy, claimedBy, openedBy, guild, channel }) {
  const catInfo   = TICKET_CATEGORIES[ticket.category] ?? { label: ticket.category, emoji: '🎫' };
  const now       = new Date();

  const meta = {
    ticketId:    ticket.ticketId,
    category:    catInfo.label,
    categoryKey: ticket.category,
    categoryEmoji: catInfo.emoji,
    guildName:   guild.name,
    guildId:     guild.id,
    channelName: channel.name,
    channelId:   channel.id,
    openedBy:    openedBy ? `${openedBy.user.tag} (${openedBy.id})` : `ID: ${ticket.userId}`,
    openedById:  ticket.userId,
    claimedBy:   claimedBy ? `${claimedBy.user.tag} (${claimedBy.id})` : 'Sin reclamar',
    claimedById: ticket.claimedBy ?? null,
    closedBy:    `${closedBy.tag} (${closedBy.id})`,
    closedById:  closedBy.id,
    closeReason: ticket.closeReason ?? 'Sin motivo especificado',
    openedAt:    ticket.createdAt ? new Date(ticket.createdAt).toISOString() : 'Desconocido',
    closedAt:    now.toISOString(),
    messageCount: messages.length,
    generatedAt: now.toISOString(),
  };

  const lines = messages.map(m => ({
    timestamp: new Date(m.createdTimestamp).toISOString(),
    author:    m.author.tag,
    authorId:  m.author.id,
    isBot:     m.author.bot,
    content:   m.content || null,
    embeds:    m.embeds.length,
    attachments: [...m.attachments.values()].map(a => a.url),
  }));

  return { meta, lines };
}

// ── Formato TXT (mejorado) ─────────────────────────────────────────────────────
function buildTxt({ meta, lines }) {
  const now = new Date(meta.generatedAt);
  const dateStr = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const header = [
    '╔══════════════════════════════════════════════════════════════════╗',
    '║          TRANSCRIPCIÓN DE TICKET — American Island               ║',
    '║          FURIA NETWORK — GTA V Roleplay                         ║',
    '╚══════════════════════════════════════════════════════════════════╝',
    '',
    '╔══════════════════════════════════════════════════════════════════╗',
    '║  INFORMACIÓN DEL TICKET                                        ║',
    '╚══════════════════════════════════════════════════════════════════╝',
    '',
    `  🆔 Ticket ID    : ${meta.ticketId}`,
    `  📂 Categoría    : ${meta.categoryEmoji} ${meta.category}`,
    `  🏷️  Etiqueta     : ${meta.categoryKey || 'General'}`,
    '',
    '╔══════════════════════════════════════════════════════════════════╗',
    '║  INFORMACIÓN DEL SERVIDOR                                      ║',
    '╚══════════════════════════════════════════════════════════════════╝',
    '',
    `  🌐 Servidor     : ${meta.guildName}`,
    `  🆔 Guild ID     : ${meta.guildId}`,
    `  💬 Canal        : #${meta.channelName}`,
    `  🆔 Canal ID     : ${meta.channelId}`,
    '',
    '╔══════════════════════════════════════════════════════════════════╗',
    '║  PARTICIPANTES                                                 ║',
    '╚══════════════════════════════════════════════════════════════════╝',
    '',
    `  👤 Abierto por  : ${meta.openedBy}`,
    `  🛡️  Staff/Admin : ${meta.claimedBy}`,
    `  🔒 Cerrado por  : ${meta.closedBy}`,
    '',
    '╔══════════════════════════════════════════════════════════════════╗',
    '║  TEMPORALIZACIÓN                                               ║',
    '╚══════════════════════════════════════════════════════════════════╝',
    '',
    `  📅 Abierto el   : ${meta.openedAt}`,
    `  📅 Cerrado el   : ${meta.closedAt}`,
    `  ⏱️  Duración     : ${calcDuration(meta.openedAt, meta.closedAt)}`,
    `  💬 Total msgs   : ${meta.messageCount}`,
    `  📝 Motivo cierre: ${meta.closeReason}`,
    '',
    '╔══════════════════════════════════════════════════════════════════╗',
    '║  TRANSCRIPCIÓN DE MENSAJES                                     ║',
    '╚══════════════════════════════════════════════════════════════════╝',
    '',
    `  Fecha generación: ${dateStr}`,
    `  (${meta.messageCount} mensajes en total)`,
    '',
    '─'.repeat(70),
    '',
  ].join('\n');

  let msgNumber = 0;
  const body = lines.map(l => {
    msgNumber++;
    const ts = new Date(l.timestamp);
    const timeStr = ts.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
      ' ' + ts.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const authorTag = l.isBot ? `${l.author} [BOT]` : l.author;
    let msg = '';
    msg += `  ┌─ [#${msgNumber}] ${timeStr}`;
    msg += `\n  ├─ 👤 ${authorTag}`;
    if (l.content) {
      const cleanContent = l.content.replace(/\n/g, '\n  │  ');
      msg += `\n  │  ${cleanContent}`;
    } else {
      msg += `\n  │  *[sin texto]*`;
    }
    if (l.embeds > 0) {
      msg += `\n  │  [📦 ${l.embeds} embed(s) incrustado(s)]`;
    }
    if (l.attachments.length) {
      msg += '\n' + l.attachments.map(u => `  │  📎 ${u}`).join('\n');
    }
    msg += '\n  └─';
    msg += '\n';
    return msg;
  }).join('\n');

  const footer = [
    '',
    '─'.repeat(70),
    '',
    '╔══════════════════════════════════════════════════════════════════╗',
    '║  FIN DE LA TRANSCRIPCIÓN                                       ║',
    '╚══════════════════════════════════════════════════════════════════╝',
    '',
    `  📄 ${meta.messageCount} mensajes · ${lines.filter(l => l.attachments.length).length} archivos adjuntos`,
    `  🤖 ${lines.filter(l => l.isBot).length} mensajes del bot`,
    `  👥 ${new Set(lines.map(l => l.author)).size} participantes distintos`,
    '',
    '─'.repeat(70),
    '',
    '  American Island Roleplay',
    '  Sistema de Tickets v2',
    `  Generado el ${dateStr}`,
    `  ID de ticket: ${meta.ticketId}`,
    '',
    '  🌐 https://airpda.xyz',
    '',
  ].join('\n');

  return header + body + footer;
}

function calcDuration(startISO, endISO) {
  try {
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();
    if (isNaN(start) || isNaN(end)) return 'Desconocida';
    const diff = end - start;
    if (diff < 0) return 'Desconocida';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
  } catch { return 'Desconocida'; }
}

// ── Formato HTML ──────────────────────────────────────────────────────────────
function buildHtml({ meta, lines }) {
  const rows = lines.map(l => {
    const attLinks = l.attachments.length
      ? `<div class="attachments">${l.attachments.map(u => `<a href="${u}" target="_blank">📎 Adjunto</a>`).join(' ')}</div>`
      : '';
    const embTxt   = l.embeds > 0 ? `<span class="embed-note">[${l.embeds} embed(s)]</span>` : '';
    const content  = l.content
      ? `<span class="msg-content">${escHtml(l.content)}</span>`
      : `<span class="msg-empty">[sin texto]</span>`;

    return `
    <div class="message${l.isBot ? ' bot' : ''}">
      <span class="timestamp">${l.timestamp}</span>
      <span class="author${l.isBot ? ' bot-tag' : ''}">${escHtml(l.author)}</span>
      <span class="separator">→</span>
      ${content}${embTxt}${attLinks}
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcripción ${meta.ticketId} — American Island</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',sans-serif;background:#0f0f13;color:#dcddde;padding:20px}
    .header{background:#1e1e2e;border:1px solid #D4AF37;border-radius:10px;padding:20px;margin-bottom:20px}
    .header h1{color:#D4AF37;font-size:1.4em;margin-bottom:12px}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .meta-item{background:#16161f;padding:8px 12px;border-radius:6px;font-size:.88em}
    .meta-item strong{color:#D4AF37;display:block;margin-bottom:2px}
    .messages{background:#1e1e2e;border-radius:10px;padding:16px;border:1px solid #2f2f3e}
    .message{padding:6px 10px;border-bottom:1px solid #2a2a3a;font-size:.85em;line-height:1.5}
    .message:last-child{border-bottom:none}
    .message.bot{opacity:.75;background:#16161f}
    .timestamp{color:#72767d;font-size:.78em;margin-right:8px}
    .author{color:#D4AF37;font-weight:600;margin-right:4px}
    .author.bot-tag::after{content:' [BOT]';color:#5865f2;font-size:.75em}
    .separator{color:#4f545c;margin:0 6px}
    .msg-content{color:#dcddde}
    .msg-empty{color:#4f545c;font-style:italic}
    .embed-note{color:#5865f2;font-size:.8em;margin-left:4px}
    .attachments{margin-top:4px}
    .attachments a{color:#00b0f4;font-size:.82em;margin-right:8px;text-decoration:none}
    .footer{text-align:center;margin-top:16px;color:#4f545c;font-size:.8em}
  </style>
</head>
<body>
  <div class="header">
    <h1>🎫 Transcripción — ${escHtml(meta.ticketId)}</h1>
    <div class="meta-grid">
      <div class="meta-item"><strong>Ticket ID</strong>${escHtml(meta.ticketId)}</div>
      <div class="meta-item"><strong>Categoría</strong>${meta.categoryEmoji} ${escHtml(meta.category)}</div>
      <div class="meta-item"><strong>Servidor</strong>${escHtml(meta.guildName)}</div>
      <div class="meta-item"><strong>Canal</strong>#${escHtml(meta.channelName)}</div>
      <div class="meta-item"><strong>Abierto por</strong>${escHtml(meta.openedBy)}</div>
      <div class="meta-item"><strong>Admin / Staff</strong>${escHtml(meta.claimedBy)}</div>
      <div class="meta-item"><strong>Cerrado por</strong>${escHtml(meta.closedBy)}</div>
      <div class="meta-item"><strong>Motivo</strong>${escHtml(meta.closeReason)}</div>
      <div class="meta-item"><strong>Abierto el</strong>${meta.openedAt}</div>
      <div class="meta-item"><strong>Cerrado el</strong>${meta.closedAt}</div>
      <div class="meta-item"><strong>Mensajes</strong>${meta.messageCount}</div>
      <div class="meta-item"><strong>Generado</strong>${meta.generatedAt}</div>
    </div>
  </div>
  <div class="messages">
${rows}
  </div>
  <div class="footer">American Island • Sistema de Tickets v2 — generado el ${meta.generatedAt}</div>
</body>
</html>`;
}

// ── Formato Markdown ──────────────────────────────────────────────────────────
function buildMd({ meta, lines }) {
  const header = [
    `# 🎫 Transcripción — ${meta.ticketId}`,
    '',
    '## Información del Ticket',
    '',
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| **Ticket ID** | \`${meta.ticketId}\` |`,
    `| **Categoría** | ${meta.categoryEmoji} ${meta.category} |`,
    `| **Servidor** | ${meta.guildName} |`,
    `| **Canal** | #${meta.channelName} |`,
    `| **Abierto por** | ${meta.openedBy} |`,
    `| **Admin / Staff** | ${meta.claimedBy} |`,
    `| **Cerrado por** | ${meta.closedBy} |`,
    `| **Motivo de cierre** | ${meta.closeReason} |`,
    `| **Abierto el** | ${meta.openedAt} |`,
    `| **Cerrado el** | ${meta.closedAt} |`,
    `| **Total mensajes** | ${meta.messageCount} |`,
    '',
    '---',
    '',
    '## Mensajes',
    '',
  ].join('\n');

  const body = lines.map(l => {
    let line = `**[${l.timestamp}]** \`${l.author}\`${l.isBot ? ' *(BOT)*' : ''}: `;
    if (l.content)             line += l.content;
    if (l.embeds > 0)          line += ` *(${l.embeds} embed(s))*`;
    if (l.attachments.length)  line += '\n' + l.attachments.map(u => `  - [📎 Adjunto](${u})`).join('\n');
    if (!l.content && !l.embeds && !l.attachments.length) line += '*[sin contenido]*';
    return line;
  }).join('\n\n');

  const footer = [
    '',
    '---',
    '',
    `*American Island • Sistema de Tickets v2 — Generado el ${meta.generatedAt}*`,
  ].join('\n');

  return header + body + footer;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Genera los 3 adjuntos (txt, html, md)
function buildTranscriptFiles(transcriptData) {
  const { meta } = transcriptData;
  const base     = `transcript-${meta.ticketId}`;

  return [
    new AttachmentBuilder(Buffer.from(buildTxt(transcriptData),  'utf-8'), { name: `${base}.txt`  }),
    new AttachmentBuilder(Buffer.from(buildHtml(transcriptData), 'utf-8'), { name: `${base}.html` }),
    new AttachmentBuilder(Buffer.from(buildMd(transcriptData),   'utf-8'), { name: `${base}.md`   }),
  ];
}

// Embed para el canal de transcripciones
function buildTranscriptEmbed(ticket, meta, { closedBy, claimedBy, openedBy, involvedMentions, messageCount, isManual = false }) {
  const catInfo = TICKET_CATEGORIES[ticket.category] ?? { label: ticket.category, emoji: '🎫', color: COLORS.MUTED };

  return new EmbedBuilder()
    .setColor(catInfo.color ?? COLORS.MUTED)
    .setTitle(`📋 Transcripción — ${ticket.ticketId}`)
    .setDescription(isManual ? '> Transcripción generada manualmente.' : '> Generada automáticamente al cerrar el ticket.')
    .addFields(
      { name: '🆔 Ticket ID',       value: `\`${ticket.ticketId}\``,                              inline: true },
      { name: '📂 Categoría',        value: `${catInfo.emoji} ${catInfo.label}`,                   inline: true },
      { name: '💬 Mensajes',         value: String(messageCount),                                  inline: true },
      { name: '👤 Abierto por',      value: openedBy ? `<@${openedBy.id}>` : `<@${ticket.userId}>`, inline: true },
      { name: '🛡️ Admin / Staff',   value: claimedBy ? `<@${claimedBy.id}>` : 'Sin reclamar',    inline: true },
      { name: '🔒 Cerrado por',      value: `<@${closedBy.id}>`,                                   inline: true },
      { name: '📝 Motivo',           value: ticket.closeReason ?? 'Sin motivo especificado',       inline: false },
      { name: '👥 Involucrados',     value: involvedMentions || 'N/A',                             inline: false },
      { name: '📅 Cerrado el',       value: `<t:${Math.floor(Date.now() / 1000)}:F>`,              inline: true },
    )
    .setFooter({ text: 'American Island • Sistema de Tickets v2 — adjuntos: .txt .html .md' })
    .setTimestamp();
}

// ════════════════════════════════════════════════════════════════════════════════
// MODAL DE WHITELIST
// ════════════════════════════════════════════════════════════════════════════════
async function openWhitelistModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('whitelist_form')
    .setTitle('Solicitud de Whitelist — American Island');

  const fields = [
    new TextInputBuilder()
      .setCustomId('wl_name')
      .setLabel('Nombre y apellido del personaje')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ej: Juan García')
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId('wl_age')
      .setLabel('Edad real (mínimo 16 años)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ej: 20')
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId('wl_backstory')
      .setLabel('Backstory del personaje (mín. 150 palabras)')
      .setStyle(TextInputStyle.Paragraph)
      .setMinLength(150)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId('wl_rules')
      .setLabel('¿Has leído y aceptas las normas? (Sí/No)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Sí / No')
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId('wl_experience')
      .setLabel('Experiencia previa en GTA RP (opcional)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false),
  ];

  fields.forEach(f => modal.addComponents(new ActionRowBuilder().addComponents(f)));
  await interaction.showModal(modal);
}

// ════════════════════════════════════════════════════════════════════════════════
// MODAL: AÑADIR USUARIO (botón legacy)
// ════════════════════════════════════════════════════════════════════════════════
async function handleAddUserModal(interaction) {
  const userId = interaction.fields.getTextInputValue('add_user_id').trim();
  const member = await interaction.guild.members.fetch(userId).catch(() => null);

  if (!member) {
    return interaction.reply({ embeds: [errorEmbed(`No se encontró un usuario con ID \`${userId}\`.`)], flags: MessageFlags.Ephemeral });
  }

  await interaction.channel.permissionOverwrites.edit(member, {
    ViewChannel:        true,
    SendMessages:       true,
    ReadMessageHistory: true,
    AttachFiles:        true,
  });

  await interaction.reply({
    embeds: [successEmbed(`<@${member.id}> ha sido añadido al ticket.`)],
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// CONTADOR DE MENSAJES
// ════════════════════════════════════════════════════════════════════════════════
async function trackTicketMessage(message) {
  if (message.author.bot) return;
  const ticket = await Ticket.findOne({ channelId: message.channelId, status: 'open' });
  if (ticket) {
    await Ticket.updateOne({ channelId: message.channelId }, { $inc: { messages: 1 } });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL DE WHITELIST (canal dedicado)
// ════════════════════════════════════════════════════════════════════════════════
function whitelistPanelMessage(guild) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('📋 Solicitud de Whitelist — ' + guild.name)
    .setDescription(
      '**¿Quieres unirte al roleplay?**\n\n' +
      'Para acceder al servidor necesitas pasar la whitelist. ' +
      'Lee la normativa antes de postularte y rellena el formulario con toda la información posible.\n\n' +
      '**📌 Requisitos:**\n' +
      '> ◆ Tener mínimo **16 años** de edad real.\n' +
      '> ◆ Haber leído y aceptado la **normativa del servidor**.\n' +
      '> ◆ Tener un backstory de personaje de al menos **150 palabras**.\n' +
      '> ◆ Tener nociones básicas de **roleplay**.\n\n' +
      '> ⚠️ Las solicitudes falsas o incompletas serán denegadas directamente.'
    )
    .addFields(
      { name: '🌐 Web', value: 'https://brooklynnights.es', inline: true },
      { name: '📜 Normativa', value: 'https://brooklynnights.es/normativa', inline: true },
      { name: '🎮 Controles', value: 'https://brooklynnights.es/controles', inline: true },
    )
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setFooter({ text: `${guild.name} • Whitelist RP`, iconURL: guild.iconURL({ dynamic: true }) })
    .setTimestamp();

  const bannerUrl = guild.bannerURL({ size: 1024 });
  if (bannerUrl) embed.setImage(bannerUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('wl_apply')
      .setLabel('📝 Postularme a la Whitelist')
      .setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row] };
}

// ════════════════════════════════════════════════════════════════════════════════
// FIX PARA TICKETS YA ABIERTOS — añadir permiso al rol viewer
// ════════════════════════════════════════════════════════════════════════════════
async function fixExistingTicketsPermissions(client) {
  const { PermissionFlagsBits } = require('discord.js');
  const results = [];
  const guilds = client.guilds.cache.values();
  for (const guild of guilds) {
    try {
      // Asegurar que el rol esté en GuildConfig
      const cfg = await GuildConfig.findOne({ guildId: guild.id });
      if (cfg && !cfg.tickets.staffRoles.includes(TICKET_VIEWER_ROLE_ID)) {
        cfg.tickets.staffRoles.push(TICKET_VIEWER_ROLE_ID);
        await cfg.save();
        results.push(`[config] Rol ${TICKET_VIEWER_ROLE_ID} añadido a GuildConfig de ${guild.name}`);
      }
      if (!guild.roles.cache.has(TICKET_VIEWER_ROLE_ID)) {
        try { await guild.roles.fetch(TICKET_VIEWER_ROLE_ID); } catch {}
      }
      if (!guild.roles.cache.has(TICKET_VIEWER_ROLE_ID)) {
        results.push(`[skip] Rol ${TICKET_VIEWER_ROLE_ID} no existe en ${guild.name}`);
        continue;
      }
      const openTickets = await Ticket.find({ guildId: guild.id, status: 'open' });
      for (const t of openTickets) {
        const ch = await guild.channels.fetch(t.channelId).catch(() => null);
        if (!ch) continue;
        const perms = ch.permissionOverwrites.cache.get(TICKET_VIEWER_ROLE_ID);
        if (!perms || !perms.allow.has(PermissionFlagsBits.ViewChannel)) {
          await ch.permissionOverwrites.edit(TICKET_VIEWER_ROLE_ID, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            AttachFiles: true,
          }).catch(e => results.push(`[error] ${t.channelId}: ${e.message}`));
          results.push(`[fix] Permiso añadido a #${ch.name} (${t.channelId})`);
        }
      }
    } catch (e) {
      results.push(`[error guild ${guild.id}] ${e.message}`);
    }
  }
  return results;
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════
module.exports = {
  sendTicketPanel,
  whitelistPanelMessage,
  handleTicketCreate,
  handleTicketButton,
  handleAddUserModal,
  generateTranscript: ticketTranscript,
  buildTranscript: buildTranscriptFiles,
  openWhitelistModal,
  trackTicketMessage,
  closeTicket,
  // Subcomandos exportados para el comando /ticket
  ticketAddUser,
  ticketRemoveUser,
  ticketRename,
  ticketClose,
  ticketTranscript,
  fixExistingTicketsPermissions,
  TICKET_VIEWER_ROLE_ID,
};