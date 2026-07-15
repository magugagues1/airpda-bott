const fs = require('fs');
let s = fs.readFileSync(`${__dirname}/../commands/rp.js`, 'utf8');

const cmds = ['me','do','entorno','susurro','grito','pensar','ooc','it','golpear','intentar','carta','anuncio','dado','descripcion','radio','morir','mirar','dni'];

for (const cmd of cmds) {
  const pattern = `if (!checkRP(message, '${cmd}')) return;`;
  const replacement = `if (!checkRP(message, '${cmd}') || !(await checkVitals(message))) return;\n      await drainVitals(message, 2, 2);`;
  const idx = s.indexOf(pattern);
  if (idx === -1) { console.log('NOT FOUND:', cmd); continue; }
  s = s.replace(pattern, replacement);
  console.log('UPDATED:', cmd);
}

fs.writeFileSync(`${__dirname}/../commands/rp.js`, s);
console.log('DONE');
