// Grid de 5 columnas x 4 filas
// Imagen: 1536x1024px, slots ~290x200px
const COLS = 5, ROWS = 4;
const SLOT_W = 290, SLOT_H = 200;
const OFFSET_X = 43, OFFSET_Y = 40;

function getSlotCenter(index) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: OFFSET_X + col * SLOT_W + SLOT_W / 2,
    y: OFFSET_Y + row * SLOT_H + SLOT_H / 2,
  };
}

function getSlotRect(index) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: OFFSET_X + col * SLOT_W,
    y: OFFSET_Y + row * SLOT_H,
    w: SLOT_W,
    h: SLOT_H,
  };
}

module.exports = { getSlotCenter, getSlotRect, COLS, ROWS, SLOT_W, SLOT_H };