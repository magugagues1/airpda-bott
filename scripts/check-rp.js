const s = require('fs').readFileSync(`${__dirname}/../commands/rp.js`, 'utf8');
const cmds = ['911', 'mapa', 'limpiar'];
for (const c of cmds) {
  console.log(`${c}: ${s.includes(`checkRP(message, '${c}')`) ? 'HAS CHECK' : 'NO CHECK (OK)'}`);
}
