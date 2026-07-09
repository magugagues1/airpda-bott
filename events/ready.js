const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`\n🤖 Bot conectado como ${client.user.tag}`);
    console.log(`📊 Servidores: ${client.guilds.cache.size}`);
    console.log(`👥 Usuarios: ${client.users.cache.size}`);
    console.log(`⚙️  Comandos slash: ${client.commands.size}`);
    console.log(`⚙️  Comandos prefix: ${client.prefixCmds.size}`);

    // Actividad rotativa
    const activities = [
      { name: '🚔 AmericanRP', type: ActivityType.Playing },
      { name: `${client.guilds.cache.size} servidores`, type: ActivityType.Watching },
      { name: '!ayuda para comandos', type: ActivityType.Listening },
      { name: 'Los Santos PD', type: ActivityType.Watching },
    ];

    let i = 0;
    const setActivity = () => {
      client.user.setPresence({
        activities: [activities[i % activities.length]],
        status: 'online',
      });
      i++;
    };

    setActivity();
    setInterval(setActivity, 30_000);

    console.log('\n✅ AmericanRP Bot listo!\n');
  },
};
