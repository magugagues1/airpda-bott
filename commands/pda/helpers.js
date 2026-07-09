function formatSancion(s) {
  const fecha  = s.fecha ? new Date(s.fecha).toLocaleDateString('es-ES') : 'N/A';
  const tipo   = (s.tipo || 'SANCIÓN').toUpperCase();
  const dinero = s.cantidad   ? `\n💰 **Importe:** $${Number(s.cantidad).toLocaleString('es-ES')}` : '';
  const carcel = s.tiempoCarcel > 0 ? `\n⛓️ **Cárcel:** ${s.tiempoCarcel} min` : '';
  return {
    name: `${tipo} — ${fecha}`,
    value: `**Motivo:** ${s.motivo || 'Sin especificar'}\n**Agente:** ${s.agente || 'Sistema'}${dinero}${carcel}`,
    inline: false,
  };
}

module.exports = { formatSancion };
