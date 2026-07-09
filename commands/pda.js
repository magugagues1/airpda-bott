/**
 * PDA — Router delgado que delega a módulos especializados
 *
 * Slash: /pda buscar | /pda id | /pda multar | /pda sanciones | /pda mis-multas
 *        /pda buscado | /pda peligroso | /pda nota
 *        /pda informes | /pda crear-informe
 *        /pda denuncias | /pda crear-denuncia
 *        /pda vehiculo | /pda arma
 *        /pda operativos | /pda investigaciones
 *        /pda ck | /pda sync | /pda stats
 */
const { SlashCommandBuilder } = require('discord.js');
const { buscar, id } = require('./pda/buscar');
const { multar, sanciones, misMultas } = require('./pda/sanciones');
const { buscado, peligroso, nota } = require('./pda/estado');
const { informes, crearInforme, denuncias, crearDenuncia } = require('./pda/informes');
const { vehiculo, arma, casa, registrarCasa, registrarArma } = require('./pda/vehiculos');
const { operativos, investigaciones, ck, sync, stats, rango, defcon, ckAdmin } = require('./pda/misc');

const data = new SlashCommandBuilder()
  .setName('pda')
  .setDescription('Sistema PDA — Integración con el dashboard web')

  .addSubcommand(s => s.setName('buscar')
    .setDescription('Buscar ciudadano en la PDA')
    .addStringOption(o => o.setName('query').setDescription('Nombre, apellido o número de ID').setRequired(true).setMinLength(2)))

  .addSubcommand(s => s.setName('id')
    .setDescription('Buscar ciudadano por número de ID o DNI')
    .addStringOption(o => o.setName('numero').setDescription('Número de ID o DNI').setRequired(true)))

  .addSubcommand(s => s.setName('multar')
    .setDescription('Sancionar a un ciudadano (queda en el dashboard)')
    .addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(true).setMaxLength(200))
    .addStringOption(o => o.setName('tipo').setDescription('Tipo de sanción').setRequired(true)
      .addChoices(
        { name: '📋 Multa económica', value: 'multa' },
        { name: '🚔 Arresto', value: 'arresto' },
        { name: '⚠️ Aviso / Advertencia', value: 'aviso' },
        { name: '⛔ Ban temporal', value: 'ban_temporal' },
      ))
    .addUserOption(o => o.setName('usuario').setDescription('Usuario de Discord').setRequired(false))
    .addStringOption(o => o.setName('id').setDescription('ID/DNI del ciudadano').setRequired(false))
    .addIntegerOption(o => o.setName('cantidad').setDescription('Monto ($) — para multas').setRequired(false).setMinValue(0))
    .addIntegerOption(o => o.setName('carcel').setDescription('Tiempo en cárcel (minutos) — para arrestos').setRequired(false).setMinValue(0))
    .addStringOption(o => o.setName('duracion').setDescription('Duración — para ban temporal (ej: "7 días")').setRequired(false)))

  .addSubcommand(s => s.setName('sanciones')
    .setDescription('Ver sanciones activas de un ciudadano')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario de Discord').setRequired(false))
    .addStringOption(o => o.setName('nombre').setDescription('Buscar por nombre completo').setRequired(false)))

  .addSubcommand(s => s.setName('mis-multas').setDescription('Ver tus multas y sanciones activas'))

  .addSubcommand(s => s.setName('buscado')
    .setDescription('Marcar/desmarcar ciudadano como BUSCADO')
    .addStringOption(o => o.setName('id').setDescription('ID MongoDB del ciudadano (de /pda buscar)').setRequired(true))
    .addBooleanOption(o => o.setName('estado').setDescription('¿Buscado?').setRequired(true)))

  .addSubcommand(s => s.setName('peligroso')
    .setDescription('Marcar/desmarcar ciudadano como PELIGROSO')
    .addStringOption(o => o.setName('id').setDescription('ID MongoDB del ciudadano (de /pda buscar)').setRequired(true))
    .addBooleanOption(o => o.setName('estado').setDescription('¿Peligroso?').setRequired(true)))

  .addSubcommand(s => s.setName('nota')
    .setDescription('Añadir nota policial a un ciudadano')
    .addStringOption(o => o.setName('id').setDescription('ID MongoDB del ciudadano').setRequired(true))
    .addStringOption(o => o.setName('texto').setDescription('Contenido de la nota').setRequired(true).setMaxLength(500)))

  .addSubcommand(s => s.setName('informes').setDescription('Ver últimos informes policiales'))

  .addSubcommand(s => s.setName('crear-informe')
    .setDescription('Crear un informe policial (queda en el dashboard)')
    .addStringOption(o => o.setName('titulo').setDescription('Título del informe').setRequired(true).setMaxLength(100))
    .addStringOption(o => o.setName('descripcion').setDescription('Descripción de los hechos').setRequired(true).setMaxLength(500))
    .addStringOption(o => o.setName('lugar').setDescription('Lugar de los hechos').setRequired(false).setMaxLength(100))
    .addStringOption(o => o.setName('civiles').setDescription('Civiles implicados (separados por coma)').setRequired(false).setMaxLength(200)))

  .addSubcommand(s => s.setName('denuncias').setDescription('Ver últimas denuncias'))

  .addSubcommand(s => s.setName('crear-denuncia')
    .setDescription('Presentar una denuncia (queda en el dashboard)')
    .addStringOption(o => o.setName('denunciado').setDescription('Nombre del denunciado').setRequired(true).setMaxLength(100))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo de la denuncia').setRequired(true).setMaxLength(200))
    .addStringOption(o => o.setName('descripcion').setDescription('Descripción detallada').setRequired(true).setMaxLength(500)))

  .addSubcommand(s => s.setName('vehiculo')
    .setDescription('Buscar vehículo en el registro del dashboard')
    .addStringOption(o => o.setName('query').setDescription('Matrícula, nombre del dueño o modelo').setRequired(true)))

  .addSubcommand(s => s.setName('arma')
    .setDescription('Buscar arma o licencia en el registro del dashboard')
    .addStringOption(o => o.setName('query').setDescription('Número de serie, dueño o número de licencia').setRequired(true)))

  .addSubcommand(s => s.setName('operativos').setDescription('Ver operativos activos y en planificación'))

  .addSubcommand(s => s.setName('investigaciones').setDescription('Ver investigaciones abiertas'))

  .addSubcommand(s => s.setName('ck')
    .setDescription('Solicitar un Character Kill para tu personaje')
    .addStringOption(o => o.setName('motivo').setDescription('Motivo del CK').setRequired(true).setMaxLength(200))
    .addStringOption(o => o.setName('historia').setDescription('Historial RP que justifica el CK').setRequired(true).setMaxLength(800)))

  .addSubcommand(s => s.setName('casa')
    .setDescription('Buscar propiedad en el registro del dashboard')
    .addStringOption(o => o.setName('query').setDescription('Dirección, propietario o zona').setRequired(true)))

  .addSubcommand(s => s.setName('registrar-casa')
    .setDescription('[POLICÍA] Registrar una propiedad en el dashboard')
    .addStringOption(o => o.setName('direccion').setDescription('Dirección de la propiedad').setRequired(true).setMaxLength(150))
    .addStringOption(o => o.setName('propietario-nombre').setDescription('Nombre del propietario').setRequired(true).setMaxLength(100))
    .addStringOption(o => o.setName('tipo').setDescription('Tipo de propiedad').setRequired(false)
      .addChoices({ name: '🏠 Casa', value: 'casa' }, { name: '🏢 Apartamento', value: 'apartamento' }, { name: '🏭 Almacén', value: 'almacen' }, { name: '🏬 Local comercial', value: 'local' }, { name: '🏗️ Otra', value: 'otra' }))
    .addStringOption(o => o.setName('zona').setDescription('Zona / barrio').setRequired(false).setMaxLength(80))
    .addStringOption(o => o.setName('anotaciones').setDescription('Notas adicionales').setRequired(false).setMaxLength(300))
    .addUserOption(o => o.setName('propietario-discord').setDescription('Usuario de Discord del propietario').setRequired(false)))

  .addSubcommand(s => s.setName('registrar-arma')
    .setDescription('[POLICÍA] Registrar un arma/licencia en el dashboard')
    .addStringOption(o => o.setName('propietario-nombre').setDescription('Nombre del propietario').setRequired(true).setMaxLength(100))
    .addStringOption(o => o.setName('tipo').setDescription('Tipo de arma').setRequired(true)
      .addChoices({ name: '🔫 Pistola', value: 'pistola' }, { name: '🔫 Revólver', value: 'revolver' }, { name: '🔫 Escopeta', value: 'escopeta' }, { name: '🔫 Rifle', value: 'rifle' }, { name: '🔫 Subfusil', value: 'subfusil' }, { name: '🔪 Arma blanca', value: 'arma_blanca' }))
    .addStringOption(o => o.setName('modelo').setDescription('Modelo del arma').setRequired(false).setMaxLength(80))
    .addStringOption(o => o.setName('serie').setDescription('Número de serie').setRequired(false).setMaxLength(50))
    .addBooleanOption(o => o.setName('licencia').setDescription('¿Tiene licencia?').setRequired(false))
    .addStringOption(o => o.setName('num-licencia').setDescription('Número de licencia').setRequired(false).setMaxLength(50))
    .addUserOption(o => o.setName('propietario-discord').setDescription('Usuario de Discord del propietario').setRequired(false)))

  .addSubcommand(s => s.setName('rango')
    .setDescription('[ALTO RANGO] Asignar rango a un agente en la PDA')
    .addStringOption(o => o.setName('id').setDescription('ID MongoDB del agente (de /pda buscar)').setRequired(true))
    .addStringOption(o => o.setName('rango').setDescription('Nuevo rango').setRequired(true).setMaxLength(60))
    .addStringOption(o => o.setName('departamento').setDescription('Departamento').setRequired(true)
      .addChoices({ name: 'LSPD — Police Department', value: 'LSPD' }, { name: 'LSCSD — County Sheriff', value: 'LSCSD' }, { name: 'LSCFD — Fire Department', value: 'LSCFD' })))

  .addSubcommand(s => s.setName('defcon')
    .setDescription('[ALTO RANGO] Ver o cambiar el nivel DEFCON de la ciudad')
    .addIntegerOption(o => o.setName('nivel').setDescription('Nuevo nivel DEFCON (1=Emergencia, 5=Normal). Omite para ver el actual.').setRequired(false).setMinValue(1).setMaxValue(5)))

  .addSubcommand(s => s.setName('ck-admin')
    .setDescription('[ADMIN] Gestionar solicitudes de Character Kill')
    .addStringOption(o => o.setName('accion').setDescription('Acción a realizar').setRequired(true)
      .addChoices({ name: '📋 Ver pendientes', value: 'ver' }, { name: '✅ Aprobar CK', value: 'aprobar' }, { name: '❌ Rechazar CK', value: 'rechazar' }))
    .addStringOption(o => o.setName('ck-id').setDescription('ID MongoDB del CK (requerido para aprobar/rechazar)').setRequired(false))
    .addStringOption(o => o.setName('codigo').setDescription('Código admin (requerido para aprobar/rechazar)').setRequired(false))
    .addStringOption(o => o.setName('notas').setDescription('Notas para el solicitante').setRequired(false).setMaxLength(300)))

  .addSubcommand(s => s.setName('sync').setDescription('Sincronizar tu perfil Discord con la PDA'))

  .addSubcommand(s => s.setName('stats').setDescription('Estadísticas de sanciones activas en la PDA'));


async function execute(interaction, client) {
  const sub = interaction.options.getSubcommand();
  const handlers = {
    buscar, id, multar, sanciones, misMultas,
    buscado, peligroso, nota,
    informes, crearInforme, denuncias, crearDenuncia,
    vehiculo, arma, casa, registrarCasa, registrarArma,
    operativos, investigaciones, ck, sync, stats, rango, defcon, ckAdmin,
  };
  const handler = handlers[sub];
  if (handler) return handler(interaction, client);
}

module.exports = { data, execute };
