const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { getSlotCenter, SLOTS } = require('./inventoryGrid');
const { getItemImage } = require('../config/itemImages');

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
    const loadedImages = new Map();

    for (let i = 0; i < maxItems; i++) {
      const item = items[i];
      const center = getSlotCenter(i);
      if (!center) continue;

      let imgPath = getItemImage(item);
      if (!imgPath) console.error('[RenderInventory] No image for:', item.id, item.nombre);

      if (imgPath && fs.existsSync(imgPath)) {
        try {
          let icon = loadedImages.get(imgPath);
          if (!icon) {
            icon = await cv.loadImage(imgPath);
            loadedImages.set(imgPath, icon);
          }
          // Calcular tamaño manteniendo aspect ratio (máx 140x120)
          const maxW = 140, maxH = 120;
          let iw = icon.width, ih = icon.height;
          const scale = Math.min(maxW / iw, maxH / ih, 1);
          iw *= scale; ih *= scale;
          const ix = center.x - iw / 2;
          const iy = center.y - ih / 2 - 10;
          ctx.drawImage(icon, ix, iy, iw, ih);
        } catch {}
      }

      // Nombre del item
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.nombre.length > 12 ? item.nombre.slice(0, 10) + '..' : item.nombre, center.x, center.y + 60);

      // Badge de cantidad
      if (item.cantidad > 1) {
        const text = `x${item.cantidad}`;
        ctx.font = 'bold 16px sans-serif';
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
        ctx.font = 'bold 14px sans-serif';
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