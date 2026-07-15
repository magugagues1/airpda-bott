const { AttachmentBuilder } = require('discord.js');
const { getSlotCenter } = require('./inventoryGrid');
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

    for (let i = 0; i < Math.min(items.length, 20); i++) {
      const item = items[i];
      const center = getSlotCenter(i);

      const emojiPath = await downloadEmojiImage(item.emoji || '📦');
      if (emojiPath) {
        try {
          const icon = await cv.loadImage(emojiPath);
          const size = 64;
          ctx.drawImage(icon, center.x - size / 2, center.y - size / 2 - 10, size, size);
        } catch {}
      }

      if (item.cantidad > 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        const badgeX = center.x + 20, badgeY = center.y - 30;
        ctx.beginPath(); ctx.arc(badgeX, badgeY, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`x${item.cantidad}`, badgeX, badgeY);
      }
    }

    return canvas.toBuffer();
  } catch (e) {
    console.error('[RenderInventory]', e.message);
    return null;
  }
}

const fs = require('fs');
const path = require('path');

module.exports = { renderInventoryImage };