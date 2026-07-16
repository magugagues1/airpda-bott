const fs = require('fs');
const path = require('path');
const { getSlotCenter, SLOTS } = require('./inventoryGrid');
const { getItemImage } = require('../config/itemImages');

let _cv = undefined;
let _fontsRegistered = false;

function getCanvasLib() {
  if (_cv === undefined) {
    _cv = require('@napi-rs/canvas');
  }
  if (!_fontsRegistered) {
    _fontsRegistered = true;
    try {
      _cv.GlobalFonts.registerFromPath(path.join(__dirname, '..', 'assets', 'fonts', 'Inter-Regular.ttf'), 'UIFont');
      _cv.GlobalFonts.registerFromPath(path.join(__dirname, '..', 'assets', 'fonts', 'Inter-Bold.ttf'), 'UIFont');
    } catch (e) {
      console.error('[Font]', e.message);
    }
  }
  return _cv;
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

async function renderInventoryImage(items) {
  try {
    const cv = getCanvasLib();
    const invBg = path.join(__dirname, '..', 'assets', 'inv.png');
    let canvas, ctx;

    if (fs.existsSync(invBg)) {
      const img = await cv.loadImage(invBg);
      canvas = cv.createCanvas(img.width, img.height);
      ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    } else {
      console.error('[RenderInventory] Fondo no encontrado:', invBg);
      canvas = cv.createCanvas(1536, 1024);
      ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0d1428';
      ctx.fillRect(0, 0, 1536, 1024);
    }

    const maxItems = Math.min(items.length, SLOTS.length);
    const loadedImages = new Map();

    for (let i = 0; i < maxItems; i++) {
      try {
        const item = items[i];
        const center = getSlotCenter(i);
        if (!center) continue;

        let imgPath = null;
        try {
          imgPath = getItemImage(item);
        } catch (err) {
          console.error('[RenderInventory] getItemImage() falló para', item?.id, item?.nombre, '-', err.message);
        }

        if (!imgPath) {
          console.error('[RenderInventory] Sin imagen mapeada para:', item?.id, item?.nombre);
        } else if (!fs.existsSync(imgPath)) {
          console.error('[RenderInventory] Archivo no existe:', imgPath);
        }

        if (imgPath && fs.existsSync(imgPath)) {
          let icon = loadedImages.get(imgPath);
          if (!icon) {
            icon = await cv.loadImage(imgPath);
            loadedImages.set(imgPath, icon);
          }
          const maxW = 140, maxH = 120;
          let iw = icon.width, ih = icon.height;
          const scale = Math.min(maxW / iw, maxH / ih, 1);
          iw *= scale; ih *= scale;
          const ix = center.x - iw / 2;
          const iy = center.y - ih / 2 - 10;
          ctx.drawImage(icon, ix, iy, iw, ih);
        }

        // Nombre del item
        try {
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 16px "UIFont"';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const nombre = item?.nombre || '???';
          ctx.fillText(nombre.length > 12 ? nombre.slice(0, 10) + '..' : nombre, center.x, center.y + 60);
        } catch (nameErr) {
          console.error('[RenderInventory] Error dibujando nombre en slot', i, ':', nameErr.message);
        }

        // Badge de cantidad — fondo claro con texto oscuro
        if (item?.cantidad > 1) {
          try {
            const text = `x${item.cantidad}`;
            const badgeW = 50;
            const badgeH = 26;
            const badgeX = center.x + 110;
            const badgeY = center.y - 85;
            const r = 13;

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, r);
            ctx.fill();

            ctx.fillStyle = '#0d1428';
            ctx.font = 'bold 15px "UIFont"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, badgeX + badgeW / 2, badgeY + badgeH / 2);
          } catch (badgeErr) {
            console.error('[RenderInventory] Error dibujando badge en slot', i, ':', badgeErr.message);
          }
        }
      } catch (itemErr) {
        console.error('[RenderInventory] Error en slot', i, ':', itemErr.message);
      }
    }

    return canvas.toBuffer('image/png');
  } catch (e) {
    console.error('[RenderInventory]', e.message);
    return null;
  }
}

module.exports = { renderInventoryImage };