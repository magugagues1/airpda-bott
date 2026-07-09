const fs = require('fs');
const path = require('path');

function loadCommands(client) {
  const cmdsPath = path.join(__dirname, '..', 'commands');
  const files = fs.readdirSync(cmdsPath).filter(f => f.endsWith('.js'));

  let slash = 0, prefix = 0;

  for (const file of files) {
    try {
      const mod = require(path.join(cmdsPath, file));

      // ── Slash commands ──────────────────────────────────────────────────────
      if (mod.data && mod.execute) {
        // mod.data puede ser un array de SlashCommandBuilders o uno solo
        const dataArr = Array.isArray(mod.data) ? mod.data : [mod.data];
        for (const cmdData of dataArr) {
          client.commands.set(cmdData.name, { data: cmdData, execute: mod.execute });
          slash++;
        }
      }

      // ── Prefix commands ─────────────────────────────────────────────────────
      if (mod.prefixCommands && Array.isArray(mod.prefixCommands)) {
        for (const cmd of mod.prefixCommands) {
          client.prefixCmds.set(cmd.name, cmd);
          if (cmd.aliases) cmd.aliases.forEach(a => client.prefixCmds.set(a, cmd));
          prefix++;
        }
      }
    } catch (err) {
      console.error(`[CommandHandler] Error cargando ${file}:`, err.message);
    }
  }

  console.log(`[CommandHandler] ✅ ${slash} slash commands | ${prefix} prefix commands cargados`);
}

module.exports = { loadCommands };
