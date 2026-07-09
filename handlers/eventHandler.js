const fs = require('fs');
const path = require('path');

function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  let count = 0;
  for (const file of files) {
    try {
      const event = require(path.join(eventsPath, file));
      if (!event.name || !event.execute) {
        console.warn(`[EventHandler] ${file} no tiene name/execute`);
        continue;
      }
      if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
      } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
      }
      count++;
    } catch (err) {
      console.error(`[EventHandler] Error cargando ${file}:`, err.message);
    }
  }

  console.log(`[EventHandler] ✅ ${count} eventos cargados`);
}

module.exports = { loadEvents };
