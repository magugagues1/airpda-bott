const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { getSlotCenter, SLOTS } = require('./inventoryGrid');
const { downloadEmojiImage } = require('./emojiIcon');

async function renderInventoryImage(items) {
  try {
    const cv = require('canvas');
    const invBg = path.join(__dirname, '..', 'assets', 'inv.png');
    let canvas, ctx;

    if (fs.existsSync(invBg)) {
      const img = await cv.loadImage(invBg);
      canvas = cv.createCanvas(img.width, img.height);
      ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    } else {
      canvas = cv.createCanvas(1536, 1024);
      ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0d1428';
      ctx.fillRect(0, 0, 1536, 1024);
    }

    const maxItems = Math.min(items.length, SLOTS.length);

    for (let i = 0; i < maxItems; i++) {
      const item = items[i];
      const center = getSlotCenter(i);
      if (!center) continue;

      // Emoji icon (tamaño 140x140 dentro del slot 290x200)
      const emojiPath = await downloadEmojiImage(item.emoji || '📦');
      if (emojiPath) {
        try {
          const icon = await cv.loadImage(emojiPath);
          const iconSize = 130;
          const iconX = center.x - iconSize / 2;
          const iconY = center.y - iconSize / 2 - 8;
          ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
        } catch {}
      }

      // Nombre del item debajo del icono
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.nombre.length > 14 ? item.nombre.slice(0, 12) + '..' : item.nombre, center.x, center.y + 58);

      // Badge de cantidad (esquina superior derecha del slot)
      if (item.cantidad > 1) {
        const text = `x${item.cantidad}`;
        ctx.font = 'bold 22px Arial, sans-serif';

        // Círculo de fondo
        const metrics = ctx.measureText(text);
        const badgeW = metrics.width + 20;
        const badgeH = 30;
        const badgeX = center.x + 120;
        const badgeY = center.y - 88;

        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 15);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, badgeX + badgeW / 2, badgeY + badgeH / 2);
      }
    }

    return canvas.toBuffer();
  } catch (e) {
    console.error('[RenderInventory]', e.message);
    return null;
  }
}

module.exports = { renderInventoryImage };