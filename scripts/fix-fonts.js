const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
const regLine = `try { const cv = require('canvas'); cv.registerFont('${fontsDir.replace(/\\/g, '/')}/Inter-Regular.ttf', { family: 'UIFont' }); cv.registerFont('${fontsDir.replace(/\\/g, '/')}/Inter-Bold.ttf', { family: 'UIFont', weight: 'bold' }); } catch(e) { console.error('[Font]', e.message); }`;

function processFile(file) {
  let s = fs.readFileSync(file, 'utf8');
  const hasReg = s.includes('registerFont');
  
  // Replace font family
  s = s.replace(/(ctx\.font\s*=\s*['"][^'"]*?)sans-serif(['"])/g, '$1"UIFont"$2');
  
  // Find require('canvas') or getCanvas() location and add registerFont after
  if (!hasReg) {
    if (file.includes('evidenceCapture')) {
      // Insert after the getCanvas function's try block
      s = s.replace(
        `const { AttachmentBuilder } = require('discord.js');`,
        `const { AttachmentBuilder } = require('discord.js');\n\n// Register font\n${regLine}\n`
      );
    } else {
      s = s.replace(
        `const cv = require('canvas');`,
        `const cv = require('canvas');\n${regLine}`
      );
    }
  }
  
  fs.writeFileSync(file, s);
  console.log(`Updated ${file}`);
}

processFile(path.join(__dirname, '..', 'utils', 'evidenceCapture.js'));
processFile(path.join(__dirname, '..', 'utils', 'renderInventory.js'));
