/**
 * Modelos PDA compartidos con la web (misma MongoDB)
 * IMPORTANTE: los nombres de colección deben coincidir exactamente
 * con los del dashboard para que ambos lean/escriban los mismos documentos.
 */
const mongoose = require('mongoose');

// ─── User ─────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  discordId: String,
  discordUsername: String,
  discordAvatar: String,
  nombre: String,
  apellido: String,
  idNumero: String,
  dniNumero: String,
  psnId: String,
  fechaNacimiento: String,
  fotoPersonaje: String,
  fotoBuscado: String,
  rango: String,
  departamento: String,
  isAdmin: Boolean,
  isPolice: Boolean,
  isSheriff: Boolean,
  isFirefighter: Boolean,
  idGenerado: Boolean,
  esPeligroso: Boolean,
  esBuscado: Boolean,
  notasPolicia: [{ texto: String, autor: String, fecha: Date }],
  defcon: Number,
  rangoAsignadoPor: String,
  rangoAsignadoEn: Date,
  registradoEn: { type: Date, default: Date.now },
}, { strict: false });

// ─── Sancion ──────────────────────────────────────────────────────────────────
const sancionSchema = new mongoose.Schema({
  ciudadanoId:        String,
  ciudadanoDiscordId: String,
  ciudadanoNombre:    String,
  ciudadanoPsnId:     String,
  tipo: {
    type: String,
    enum: ['multa', 'arresto', 'aviso', 'ban_temporal', 'ck'],
    default: 'multa',
  },
  motivo:          String,
  descripcion:     String,
  agente:          String,
  agenteDiscordId: String,
  cantidad:        Number,
  tiempoCarcel:    Number,
  duracion:        String,
  articulos: [{ articulo: String, nombre: String, multa: Number, carcel: Number, gravedad: String }],
  fecha:  { type: Date, default: Date.now },
  activa: { type: Boolean, default: true },
}, { collection: 'sanciones', strict: false });

// ─── Informe policial ─────────────────────────────────────────────────────────
const informeSchema = new mongoose.Schema({
  numeroInforme:      String,
  titulo:             String,
  agentePrincipal:    String,
  agentesImplicados:  [String],
  civilesImplicados:  [String],
  victimas:           [String],
  lugar:              String,
  fecha:              { type: Date, default: Date.now },
  descripcion:        String,
  pruebas:            [{ tipo: String, url: String, descripcion: String }],
  estado:             { type: String, default: 'abierto' },
  creadoPor:          String,
}, { collection: 'informes', strict: false });

informeSchema.pre('save', async function(next) {
  if (!this.numeroInforme) {
    const count = await mongoose.model('Informe').countDocuments();
    this.numeroInforme = `RPT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// ─── Denuncia ─────────────────────────────────────────────────────────────────
const denunciaSchema = new mongoose.Schema({
  numeroDenuncia:   String,
  denunciante:      String,
  denunciado:       String,
  motivo:           String,
  descripcion:      String,
  pruebas:          [{ tipo: String, url: String }],
  estado:           { type: String, default: 'pendiente' },
  agenteTramitador: String,
  fecha:            { type: Date, default: Date.now },
}, { collection: 'denuncias', strict: false });

denunciaSchema.pre('save', async function(next) {
  if (!this.numeroDenuncia) {
    const count = await mongoose.model('Denuncia').countDocuments();
    this.numeroDenuncia = `CMP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// ─── Vehiculo ─────────────────────────────────────────────────────────────────
const vehiculoSchema = new mongoose.Schema({
  matricula:         { type: String, uppercase: true },
  propietarioId:     String,  // Discord ID del dueño
  propietarioNombre: String,
  marca:             String,
  modelo:            String,
  color:             String,
  año:               Number,
  tipo:              String,
  robado:            { type: Boolean, default: false },
  multas:            [{ motivo: String, cantidad: Number, fecha: Date }],
  registradoPor:     String,
  fecha:             { type: Date, default: Date.now },
}, { collection: 'vehiculos', strict: false });

// ─── Arma ─────────────────────────────────────────────────────────────────────
const armaSchema = new mongoose.Schema({
  numeroSerie:       String,
  propietarioId:     String,  // Discord ID
  propietarioNombre: String,
  tipo:              String,
  modelo:            String,
  licencia:          { type: Boolean, default: false },
  numeroLicencia:    String,
  fechaVencimiento:  String,
  registradoPor:     String,
  fecha:             { type: Date, default: Date.now },
}, { collection: 'armas', strict: false });

// ─── Investigacion ────────────────────────────────────────────────────────────
const investigacionSchema = new mongoose.Schema({
  titulo:         String,
  descripcion:    String,
  sospechosos:    [String],
  evidencias:     [{ tipo: String, url: String, descripcion: String }],
  estado:         { type: String, default: 'abierta' },
  clasificacion:  { type: String, default: 'confidencial' },
  agentes:        [String],
  fecha:          { type: Date, default: Date.now },
  notas:          String,
}, { collection: 'investigaciones', strict: false });

// ─── Operativo ────────────────────────────────────────────────────────────────
const operativoSchema = new mongoose.Schema({
  nombre:              String,
  descripcion:         String,
  estado:              { type: String, default: 'planificacion' },
  agentesAsignados:    [String],
  zona:                String,
  prioridad:           { type: String, default: 'media' },
  fecha:               { type: Date, default: Date.now },
  notas:               String,
}, { collection: 'operativos', strict: false });

// ─── Casa ─────────────────────────────────────────────────────────────────────
const casaSchema = new mongoose.Schema({
  direccion:         String,
  propietarioId:     String,
  propietarioNombre: String,
  tipo:              String,
  zona:              String,
  anotaciones:       String,
  registradoPor:     String,
  fecha:             { type: Date, default: Date.now },
}, { collection: 'casas', strict: false });

// ─── InformePaciente (LSCFD) ──────────────────────────────────────────────────
const informePacienteSchema = new mongoose.Schema({
  paciente:    String,
  edad:        String,
  incidente:   String,
  tratamiento: String,
  estado:      { type: String, default: 'estable' },
  notas:       String,
  agente:      String,
  fecha:       { type: Date, default: Date.now },
}, { collection: 'informepacientes', strict: false });

// ─── InformePersonal (agentes) ────────────────────────────────────────────────
const informePersonalSchema = new mongoose.Schema({
  titulo:      String,
  descripcion: String,
  tipo:        { type: String, default: 'servicio' },
  agenteId:    String,
  agente:      String,
  fecha:       { type: Date, default: Date.now },
}, { collection: 'informepersonals', strict: false });

// ─── CK (Character Kill) ──────────────────────────────────────────────────────
const ckSchema = new mongoose.Schema({
  solicitanteId:     String,  // Discord ID
  solicitanteNombre: String,
  motivo:            String,
  historia:          String,
  evidencias:        [{ tipo: String, url: String }],
  estado:            { type: String, default: 'pendiente' },
  revisadoPor:       String,
  codigoAprobacion:  String,
  notas:             String,
  fecha:             { type: Date, default: Date.now },
}, { collection: 'cks', strict: false });

// ─── Exportar (evitar OverwriteModelError en hot-reload) ─────────────────────
function m(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

module.exports = {
  User:             m('User',             userSchema),
  Sancion:          m('Sancion',          sancionSchema),
  Informe:          m('Informe',          informeSchema),
  Denuncia:         m('Denuncia',         denunciaSchema),
  Vehiculo:         m('Vehiculo',         vehiculoSchema),
  Arma:             m('Arma',             armaSchema),
  Investigacion:    m('Investigacion',    investigacionSchema),
  Operativo:        m('Operativo',        operativoSchema),
  CK:               m('CK',              ckSchema),
  Casa:             m('Casa',             casaSchema),
  InformePaciente:  m('InformePaciente',  informePacienteSchema),
  InformePersonal:  m('InformePersonal',  informePersonalSchema),
};
