// Grid de 5 columnas x 4 filas
// Imagen: 1536x1024px, slots ~290x200px
// Centros exactos medidos sobre la imagen:
const SLOTS = [
  // Fila 1 (y=278)
  { x: 181, y: 278 }, { x: 470, y: 278 }, { x: 760, y: 278 }, { x: 1051, y: 278 }, { x: 1341, y: 278 },
  // Fila 2 (y=480)
  { x: 181, y: 480 }, { x: 470, y: 480 }, { x: 760, y: 480 }, { x: 1051, y: 480 }, { x: 1341, y: 480 },
  // Fila 3 (y=681)
  { x: 181, y: 681 }, { x: 470, y: 681 }, { x: 760, y: 681 }, { x: 1051, y: 681 }, { x: 1341, y: 681 },
  // Fila 4 (y=878)
  { x: 181, y: 878 }, { x: 470, y: 878 }, { x: 760, y: 878 }, { x: 1051, y: 878 }, { x: 1341, y: 878 },
];

function getSlotCenter(index) {
  if (index < 0 || index >= SLOTS.length) return null;
  return SLOTS[index];
}

function getSlotRect(index) {
  if (index < 0 || index >= SLOTS.length) return null;
  const c = SLOTS[index];
  return { x: c.x - 145, y: c.y - 100, w: 290, h: 200 };
}

module.exports = { getSlotCenter, getSlotRect, SLOTS };