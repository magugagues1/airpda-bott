const fs = require('fs');
const s = fs.readFileSync(`${__dirname}/../commands/rp.js`, 'utf8');
const lines = s.split(/\r?\n/);
let count = 0;

const rpCmds = ['do', 'entorno', 'susurro', 'grito', 'pensar', 'ooc', 'it', 'golpear', 'intentar', 'carta', 'anuncio', 'dado', 'descripcion', 'radio', 'morir', 'mirar', 'dni'];

for (let i = 0; i < lines.length; i++) {
  for (const cmd of rpCmds) {
    if (lines[i].trim() === `name: '${cmd}',`) {
      // Find the async run line
      let runLine = -1;
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('async run(')) { runLine = j; break; }
      }
      if (runLine === -1) { console.log('NO RUN:', cmd); continue; }
      // Find opening brace
      for (let j = runLine; j < Math.min(runLine + 5, lines.length); j++) {
        if (lines[j].includes('{')) {
          const braceLine = j;
          const indent = lines[braceLine].match(/^\s*/)[0] + '  ';
          if (lines[braceLine + 1]?.includes('checkRP')) {
            console.log('SKIP:', cmd);
            break;
          }
          const checkLine = `${indent}if (!checkRP(message, '${cmd}')) return;`;
          lines.splice(braceLine + 1, 0, checkLine);
          count++;
          console.log('ADDED:', cmd);
          break;
        }
      }
      break;
    }
  }
}

if (count > 0) {
  fs.writeFileSync(`${__dirname}/../commands/rp.js`, lines.join('\n'));
  console.log(`Added ${count} checks`);
} else {
  console.log('No changes needed');
}
