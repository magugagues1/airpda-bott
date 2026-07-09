'use strict';

const { Schema, model } = require('mongoose');

const ticketSchema = new Schema({
  ticketId:    { type: String, required: true, unique: true },
  guildId:     { type: String, required: true },
  channelId:   { type: String, required: true },
  userId:      { type: String, required: true },
  category:    { type: String, required: true },
  subject:     { type: String, default: null },
  priority:    { type: String, enum: ['baja', 'media', 'alta', 'urgente'], default: 'media' },
  status:      { type: String, enum: ['open', 'closed', 'archived'], default: 'open' },
  claimedBy:   { type: String, default: null },
  closedBy:    { type: String, default: null },
  closedAt:    { type: Date, default: null },
  closeReason: { type: String, default: null },
  transcriptUrl:{ type: String, default: null },
  messages:    { type: Number, default: 0 },
  reopened:    { type: Boolean, default: false },
}, { timestamps: true });

module.exports = model('Ticket', ticketSchema);