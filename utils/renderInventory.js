const { AttachmentBuilder } = require('discord.js');

async function renderInventoryImage(items) {
  try {
    const cv = require('canvas');
    const size = Math.min(items.length * 40 + 60, 800);
    const canvas = cv.createCanvas(400, Math.max(size, 100));
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0d1428';
    ctx.fillRect(0, 0, 400, Math.max(size, 100));

    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('🎒 INVENTARIO', 15, 30);

    ctx.strokeStyle = '#1a2a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, 40);
    ctx.lineTo(385, 40);
    ctx.stroke();

    let y = 55;
    for (const item of items.slice(0, 30)) {
      const emoji = item.emoji || '📦';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '13px Arial, sans-serif';
      ctx.fillText(`${emoji} ${item.nombre}`, 20, y);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Arial, sans-serif';
      ctx.fillText(`x${item.cantidad}`, 340, y);
      y += 28;
    }

    if (items.length > 30) {
      ctx.fillStyle = '#475569';
      ctx.font = '11px Arial, sans-serif';
      ctx.fillText(`... y ${items.length - 30} items más`, 20, y + 5);
    }

    return canvas.toBuffer();
  } catch {
    return null;
  }
}

module.exports = { renderInventoryImage };