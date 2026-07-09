function formatDate(d) {
  if (!d) return '---';
  return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(open, close) {
  if (!open || !close) return '---';
  const ms = new Date(close) - new Date(open);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function buildMeta(ticket) {
  const staffMsgs = ticket.mensajes?.filter(m => m.esStaff).length || 0;
  const userMsgs = ticket.mensajes?.filter(m => !m.esStaff).length || 0;
  return {
    numero: ticket.numero,
    tipo: ticket.tipo || 'soporte',
    estado: ticket.estado,
    prioridad: ticket.prioridad || 'media',
    creadoPor: ticket.abiertoPor || ticket.username || ticket.userId,
    abierto: ticket.abiertaEn,
    cerrado: ticket.cerradoEn,
    cerradoPor: ticket.cerradoPor || '---',
    motivoCierre: ticket.motivoCierre || '---',
    asignado: ticket.asignadoNombre || '---',
    participantes: [...new Set([ticket.userId, ...(ticket.participantes || [])])],
    totalMsgs: ticket.mensajes?.length || 0,
    staffMsgs,
    userMsgs,
    duracion: formatDuration(ticket.abiertaEn, ticket.cerradoEn),
    asunto: ticket.asunto || 'Sin asunto',
  };
}

function generateMD(ticket) {
  const m = buildMeta(ticket);
  const tipoEmoji = { soporte: '🆘', reporte: '🚨', apelacion: '📜', sugerencia: '💡', rp: '🎭', whitelist: '📋' }[m.tipo] || '🎫';
  const prioridadLabel = { baja: '🟢 Baja', media: '🟡 Media', alta: '🟠 Alta', urgente: '🔴 Urgente' }[m.prioridad] || m.prioridad;

  let md = `# ${tipoEmoji} Ticket #${m.numero} — ${m.tipo.toUpperCase()}\n\n`;
  md += `## 📋 Información General\n\n`;
  md += `| Campo | Valor |\n|-------|-------|\n`;
  md += `| **Número** | #${m.numero} |\n`;
  md += `| **Tipo** | ${tipoEmoji} ${m.tipo} |\n`;
  md += `| **Estado** | ${m.estado} |\n`;
  md += `| **Prioridad** | ${prioridadLabel} |\n`;
  md += `| **Asunto** | ${m.asunto} |\n`;
  md += `| **Creado por** | ${m.creadoPor} |\n`;
  md += `| **Abierto** | ${formatDate(m.abierto)} |\n`;
  md += `| **Cerrado** | ${formatDate(m.cerrado)} |\n`;
  md += `| **Cerrado por** | ${m.cerradoPor} |\n`;
  md += `| **Motivo de cierre** | ${m.motivoCierre} |\n`;
  md += `| **Asignado a** | ${m.asignado} |\n`;
  md += `| **Duración** | ${m.duracion} |\n\n`;

  md += `## 👥 Participantes\n\n`;
  for (const p of m.participantes) {
    const creator = p === ticket.userId ? ' *(Creador)*' : '';
    const asignado = p === ticket.asignadoA ? ' *(Staff asignado)*' : '';
    md += `- <@${p}>${creator}${asignado}\n`;
  }
  md += '\n';

  md += `## 💬 Conversación (${m.totalMsgs} mensajes)\n\n`;
  if (ticket.mensajes && ticket.mensajes.length > 0) {
    for (const msg of ticket.mensajes) {
      const who = msg.esStaff ? '🛠️' : '👤';
      const fecha = formatDate(msg.fecha);
      md += `**[${fecha}]** ${who} **${msg.autor}**: ${msg.contenido}\n\n`;
    }
  } else {
    md += '*Sin mensajes guardados.*\n\n';
  }

  md += `## 📊 Resumen\n\n`;
  md += `- **Total mensajes:** ${m.totalMsgs}\n`;
  md += `- **Mensajes de staff:** ${m.staffMsgs}\n`;
  md += `- **Mensajes de usuario:** ${m.userMsgs}\n`;
  md += `- **Duración total:** ${m.duracion}\n`;
  md += `- **Participantes:** ${m.participantes.length}\n\n`;
  md += `---\n*Transcript generado automáticamente por AmericanRP Ticket System — ${formatDate(new Date())}*\n`;

  return md;
}

function generateHTML(ticket) {
  const m = buildMeta(ticket);
  const tipoEmoji = { soporte: '🆘', reporte: '🚨', apelacion: '📜', sugerencia: '💡', rp: '🎭', whitelist: '📋' }[m.tipo] || '🎫';
  const prioridadColor = { baja: '#64748b', media: '#3b82f6', alta: '#f59e0b', urgente: '#ef4444' }[m.prioridad] || '#64748b';
  const prioridadLabel = { baja: '🟢 Baja', media: '🟡 Media', alta: '🟠 Alta', urgente: '🔴 Urgente' }[m.prioridad] || m.prioridad;

  const msgHtml = (ticket.mensajes || []).map(msg => {
    const who = msg.esStaff ? '🛠️ Staff' : '👤 Usuario';
    const bg = msg.esStaff ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)';
    const border = msg.esStaff ? 'border-left:3px solid #3b82f6' : 'border-left:3px solid transparent';
    return `<div style="padding:10px 12px;margin-bottom:6px;border-radius:6px;background:${bg};${border}">
      <div style="font-size:11px;color:#94a3b8;margin-bottom:2px"><strong>${formatDate(msg.fecha)}</strong> — ${who} <strong>${msg.autor}</strong></div>
      <div style="font-size:13px;color:#e2e8f0;white-space:pre-wrap">${escapeHtml(msg.contenido)}</div>
    </div>`;
  }).join('\n') || '<div style="padding:20px;text-align:center;color:#475569">Sin mensajes guardados</div>';

  const participantesHtml = m.participantes.map(p => {
    const creator = p === ticket.userId ? '👑 Creador' : '';
    const staff = p === ticket.asignadoA ? '🎯 Asignado' : '';
    const roles = [creator, staff].filter(Boolean).join(' · ');
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#060910;border-radius:6px;margin-bottom:4px">
      <div style="width:28px;height:28px;border-radius:50%;background:#1a2a4a;display:flex;align-items:center;justify-content:center;font-size:12px;color:#64748b">👤</div>
      <div><div style="font-size:12px;color:#e2e8f0;font-weight:600">${p === ticket.userId ? m.creadoPor : p}</div>
      ${roles ? `<div style="font-size:10px;color:#64748b">${roles}</div>` : ''}</div>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Share+Tech+Mono&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#060910;color:#e2e8f0;font-family:'Rajdhani',sans-serif;padding:24px;max-width:800px;margin:0 auto}
  h1{font-size:22px;font-weight:700;margin-bottom:4px}
  .sub{color:#64748b;font-size:13px;margin-bottom:20px}
  .card{background:#0d1428;border:1px solid #1a2a4a;border-radius:10px;padding:16px;margin-bottom:16px}
  .card h2{font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{padding:6px 8px;border-bottom:1px solid #1a2a4a;color:#94a3b8}
  td:first-child{font-weight:600;color:#64748b;width:140px}
  .footer{text-align:center;font-size:11px;color:#475569;margin-top:24px;padding-top:16px;border-top:1px solid #1a2a4a}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}
</style></head><body>
  <h1>${tipoEmoji} Ticket #${m.numero} — ${m.tipo.toUpperCase()}</h1>
  <div class="sub">${m.asunto}</div>

  <div class="card"><h2>📋 Información General</h2>
  <table>
    <tr><td>Número</td><td><strong>#${m.numero}</strong></td></tr>
    <tr><td>Tipo</td><td>${tipoEmoji} ${m.tipo}</td></tr>
    <tr><td>Estado</td><td><span class="badge" style="background:${m.estado === 'cerrado' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)'};color:${m.estado === 'cerrado' ? '#22c55e' : '#f59e0b'}">${m.estado}</span></td></tr>
    <tr><td>Prioridad</td><td><span class="badge" style="background:${prioridadColor}15;color:${prioridadColor}">${prioridadLabel}</span></td></tr>
    <tr><td>Asunto</td><td>${m.asunto}</td></tr>
    <tr><td>Creado por</td><td>${m.creadoPor}</td></tr>
    <tr><td>Abierto</td><td>${formatDate(m.abierto)}</td></tr>
    <tr><td>Cerrado</td><td>${formatDate(m.cerrado)}</td></tr>
    <tr><td>Cerrado por</td><td>${m.cerradoPor}</td></tr>
    <tr><td>Motivo de cierre</td><td>${m.motivoCierre}</td></tr>
    <tr><td>Asignado a</td><td>${m.asignado}</td></tr>
    <tr><td>Duración</td><td>${m.duracion}</td></tr>
  </table></div>

  <div class="card"><h2>👥 Participantes (${m.participantes.length})</h2>
  ${participantesHtml}</div>

  <div class="card"><h2>💬 Conversación (${m.totalMsgs} mensajes)</h2>
  ${msgHtml}</div>

  <div class="card"><h2>📊 Resumen</h2>
  <table>
    <tr><td>Total mensajes</td><td>${m.totalMsgs}</td></tr>
    <tr><td>Mensajes de staff</td><td>${m.staffMsgs}</td></tr>
    <tr><td>Mensajes de usuario</td><td>${m.userMsgs}</td></tr>
    <tr><td>Duración total</td><td>${m.duracion}</td></tr>
    <tr><td>Participantes</td><td>${m.participantes.length}</td></tr>
  </table></div>

  <div class="footer">Transcript generado automáticamente por AmericanRP Ticket System<br>${formatDate(new Date())}</div>
</body></html>`;
}

function generateTXT(ticket) {
  const m = buildMeta(ticket);
  const prioLabel = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' }[m.prioridad] || m.prioridad;
  const sep = '='.repeat(60);
  const sub = '-'.repeat(40);

  let txt = `${sep}\n  TICKET #${m.numero} — ${m.tipo.toUpperCase()}\n${sep}\n\n`;
  txt += `INFORMACIÓN GENERAL\n${sub}\n`;
  txt += `Número:         #${m.numero}\n`;
  txt += `Tipo:           ${m.tipo}\n`;
  txt += `Estado:         ${m.estado}\n`;
  txt += `Prioridad:      ${prioLabel}\n`;
  txt += `Asunto:         ${m.asunto}\n`;
  txt += `Creado por:     ${m.creadoPor}\n`;
  txt += `Abierto:        ${formatDate(m.abierto)}\n`;
  txt += `Cerrado:        ${formatDate(m.cerrado)}\n`;
  txt += `Cerrado por:    ${m.cerradoPor}\n`;
  txt += `Motivo cierre:  ${m.motivoCierre}\n`;
  txt += `Asignado a:     ${m.asignado}\n`;
  txt += `Duración:       ${m.duracion}\n\n`;

  txt += `PARTICIPANTES\n${sub}\n`;
  for (const p of m.participantes) {
    const creator = p === ticket.userId ? ' (Creador)' : '';
    txt += `  - ${p}${creator}\n`;
  }
  txt += '\n';

  txt += `CONVERSACIÓN (${m.totalMsgs} mensajes)\n${sub}\n\n`;
  if (ticket.mensajes && ticket.mensajes.length > 0) {
    for (const msg of ticket.mensajes) {
      const who = msg.esStaff ? '[STAFF]' : '[USER] ';
      txt += `  [${formatDate(msg.fecha)}] ${who} ${msg.autor}: ${msg.contenido}\n\n`;
    }
  } else {
    txt += '  Sin mensajes guardados.\n\n';
  }

  txt += `RESUMEN\n${sub}\n`;
  txt += `  Total mensajes:       ${m.totalMsgs}\n`;
  txt += `  Mensajes de staff:    ${m.staffMsgs}\n`;
  txt += `  Mensajes de usuario:  ${m.userMsgs}\n`;
  txt += `  Duración total:       ${m.duracion}\n`;
  txt += `  Participantes:        ${m.participantes.length}\n\n`;
  txt += `${sep}\nTranscript generado automáticamente por AmericanRP Ticket System\n${formatDate(new Date())}\n${sep}\n`;

  return txt;
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { generateMD, generateHTML, generateTXT, formatDate, buildMeta };