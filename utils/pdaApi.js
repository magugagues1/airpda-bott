/**
 * PDA API — Acceso directo a la MongoDB compartida con el dashboard web
 */

function getModels() {
  return require('../database/models/PdaModels');
}

const api = {

  // ─── USUARIOS ───────────────────────────────────────────────────────────────

  async buscarUsuario(query) {
    const { User } = getModels();
    return User.find({
      $or: [
        { nombre:    { $regex: query, $options: 'i' } },
        { apellido:  { $regex: query, $options: 'i' } },
        { idNumero:  { $regex: query, $options: 'i' } },
        { dniNumero: { $regex: query, $options: 'i' } },
      ],
    }).lean();
  },

  async buscarPorDiscord(discordId) {
    const { User } = getModels();
    return User.findOne({ discordId }).lean();
  },

  async buscarPorId(idNumero) {
    const { User } = getModels();
    return User.findOne({ $or: [{ idNumero }, { dniNumero: idNumero }] }).lean();
  },

  async marcarBuscado(userId, valor, foto = null) {
    const { User } = getModels();
    const upd = { esBuscado: valor };
    if (foto) upd.fotoBuscado = foto;
    return User.findByIdAndUpdate(userId, upd, { new: true });
  },

  async marcarPeligroso(userId, valor) {
    const { User } = getModels();
    return User.findByIdAndUpdate(userId, { esPeligroso: valor }, { new: true });
  },

  async agregarNota(userId, texto, autor) {
    const { User } = getModels();
    return User.findByIdAndUpdate(
      userId,
      { $push: { notasPolicia: { texto, autor, fecha: new Date() } } },
      { new: true },
    );
  },

  // ─── SANCIONES ──────────────────────────────────────────────────────────────

  async getSanciones(nombreCompleto) {
    const { Sancion } = getModels();
    return Sancion.find({
      ciudadanoNombre: { $regex: nombreCompleto, $options: 'i' },
      activa: { $ne: false },
    }).sort({ fecha: -1 }).lean();
  },

  async getSancionesByDiscordId(discordId) {
    const { User, Sancion } = getModels();
    const pdaUser = await User.findOne({ discordId }).lean().catch(() => null);

    const orClauses = [{ ciudadanoDiscordId: discordId }];
    if (pdaUser) {
      orClauses.push({ ciudadanoId: pdaUser._id.toString() });
      if (pdaUser.nombre && pdaUser.apellido) {
        orClauses.push({
          ciudadanoNombre: { $regex: `${pdaUser.nombre}\\s+${pdaUser.apellido}`, $options: 'i' },
        });
      }
    }

    return Sancion.find({ $or: orClauses, activa: { $ne: false } }).sort({ fecha: -1 }).lean();
  },

  async getSancionesByCiudadanoId(ciudadanoMongoId) {
    const { Sancion } = getModels();
    return Sancion.find({ ciudadanoId: ciudadanoMongoId, activa: { $ne: false } }).sort({ fecha: -1 }).lean();
  },

  async crearSancion(data) {
    const { Sancion } = getModels();
    return Sancion.create(data);
  },

  async desactivarSancion(sancionId) {
    const { Sancion } = getModels();
    return Sancion.findByIdAndUpdate(sancionId, { activa: false }, { new: true });
  },

  async getStats() {
    const { Sancion } = getModels();
    const total    = await Sancion.countDocuments({ activa: { $ne: false } });
    const multas   = await Sancion.countDocuments({ tipo: 'multa',   activa: { $ne: false } });
    const arrestos = await Sancion.countDocuments({ tipo: 'arresto', activa: { $ne: false } });
    return { total, multas, arrestos };
  },

  // ─── INFORMES ───────────────────────────────────────────────────────────────

  async getInformes(limit = 50) {
    const { Informe } = getModels();
    return Informe.find().sort({ fecha: -1 }).limit(limit).lean();
  },

  async crearInforme(data) {
    const { Informe } = getModels();
    return new Informe(data).save();
  },

  // ─── DENUNCIAS ──────────────────────────────────────────────────────────────

  async getDenuncias(limit = 50) {
    const { Denuncia } = getModels();
    return Denuncia.find().sort({ fecha: -1 }).limit(limit).lean();
  },

  async crearDenuncia(data) {
    const { Denuncia } = getModels();
    return new Denuncia(data).save();
  },

  // ─── VEHÍCULOS ──────────────────────────────────────────────────────────────

  async buscarVehiculo(query) {
    const { Vehiculo } = getModels();
    return Vehiculo.find({
      $or: [
        { matricula:         { $regex: query, $options: 'i' } },
        { propietarioNombre: { $regex: query, $options: 'i' } },
        { modelo:            { $regex: query, $options: 'i' } },
        { propietarioId:     query },
      ],
    }).lean();
  },

  async registrarVehiculo(data) {
    const { Vehiculo } = getModels();
    // Upsert por matrícula para no duplicar
    return Vehiculo.findOneAndUpdate(
      { matricula: data.matricula?.toUpperCase() },
      data,
      { upsert: true, new: true },
    );
  },

  async marcarRobado(matricula, robado) {
    const { Vehiculo } = getModels();
    return Vehiculo.findOneAndUpdate(
      { matricula: matricula.toUpperCase() },
      { robado },
      { new: true },
    );
  },

  async eliminarVehiculo(matricula) {
    const { Vehiculo } = getModels();
    return Vehiculo.findOneAndDelete({ matricula: matricula.toUpperCase() });
  },

  // ─── ARMAS ──────────────────────────────────────────────────────────────────

  async buscarArma(query) {
    const { Arma } = getModels();
    return Arma.find({
      $or: [
        { numeroSerie:       { $regex: query, $options: 'i' } },
        { propietarioNombre: { $regex: query, $options: 'i' } },
        { propietarioId:     query },
        { numeroLicencia:    { $regex: query, $options: 'i' } },
      ],
    }).lean();
  },

  async registrarArma(data) {
    const { Arma } = getModels();
    return Arma.create(data);
  },

  // ─── INVESTIGACIONES ────────────────────────────────────────────────────────

  async getInvestigaciones(limit = 20) {
    const { Investigacion } = getModels();
    return Investigacion.find({ estado: { $ne: 'cerrada' } }).sort({ fecha: -1 }).limit(limit).lean();
  },

  // ─── OPERATIVOS ─────────────────────────────────────────────────────────────

  async getOperativos(limit = 20) {
    const { Operativo } = getModels();
    return Operativo.find({ estado: { $in: ['planificacion', 'activo'] } }).sort({ fecha: -1 }).limit(limit).lean();
  },

  // ─── CK ─────────────────────────────────────────────────────────────────────

  async crearCK(data) {
    const { CK } = getModels();
    return CK.create(data);
  },

  async getCKByDiscord(discordId) {
    const { CK } = getModels();
    return CK.find({ solicitanteId: discordId }).sort({ fecha: -1 }).lean();
  },

  async getCKPendientes() {
    const { CK } = getModels();
    return CK.find({ estado: 'pendiente' }).sort({ fecha: -1 }).lean();
  },

  async getCKTodos(limit = 50) {
    const { CK } = getModels();
    return CK.find().sort({ fecha: -1 }).limit(limit).lean();
  },

  async aprobarCK(ckId, revisadoPor, notas = '') {
    const { CK } = getModels();
    return CK.findByIdAndUpdate(ckId, { estado: 'aprobado', revisadoPor, notas }, { new: true });
  },

  async rechazarCK(ckId, revisadoPor, notas = '') {
    const { CK } = getModels();
    return CK.findByIdAndUpdate(ckId, { estado: 'rechazado', revisadoPor, notas }, { new: true });
  },

  // ─── CASAS ──────────────────────────────────────────────────────────────────

  async getCasas(limit = 50) {
    const { Casa } = getModels();
    return Casa.find().sort({ fecha: -1 }).limit(limit).lean();
  },

  async buscarCasa(query) {
    const { Casa } = getModels();
    return Casa.find({
      $or: [
        { direccion:         { $regex: query, $options: 'i' } },
        { propietarioNombre: { $regex: query, $options: 'i' } },
        { zona:              { $regex: query, $options: 'i' } },
        { propietarioId:     query },
      ],
    }).lean();
  },

  async registrarCasa(data) {
    const { Casa } = getModels();
    return Casa.create(data);
  },

  async eliminarCasa(id) {
    const { Casa } = getModels();
    return Casa.findByIdAndDelete(id);
  },

  // ─── INFORMES PACIENTES ──────────────────────────────────────────────────────

  async getInformesPacientes(limit = 50) {
    const { InformePaciente } = getModels();
    return InformePaciente.find().sort({ fecha: -1 }).limit(limit).lean();
  },

  async crearInformePaciente(data) {
    const { InformePaciente } = getModels();
    return InformePaciente.create(data);
  },

  // ─── INFORMES PERSONALES ─────────────────────────────────────────────────────

  async getInformesPersonales(agenteId = null, limit = 50) {
    const { InformePersonal } = getModels();
    const query = agenteId ? { agenteId } : {};
    return InformePersonal.find(query).sort({ fecha: -1 }).limit(limit).lean();
  },

  async crearInformePersonal(data) {
    const { InformePersonal } = getModels();
    return InformePersonal.create(data);
  },

  // ─── RANGOS / DEFCON ─────────────────────────────────────────────────────────

  async asignarRango(userId, rango, departamento, asignadoPor) {
    const { User } = getModels();
    return User.findByIdAndUpdate(
      userId,
      { rango, departamento, rangoAsignadoPor: asignadoPor, rangoAsignadoEn: new Date() },
      { new: true },
    );
  },

  async getDefcon() {
    const { User } = getModels();
    const u = await User.findOne({}).lean();
    return u?.defcon ?? 5;
  },

  async setDefcon(nivel) {
    const { User } = getModels();
    await User.updateMany({}, { defcon: nivel });
    return nivel;
  },

  // ─── OPERATIVOS (crear/actualizar) ───────────────────────────────────────────

  async crearOperativo(data) {
    const { Operativo } = getModels();
    return Operativo.create(data);
  },

  async actualizarOperativo(id, data) {
    const { Operativo } = getModels();
    return Operativo.findByIdAndUpdate(id, data, { new: true });
  },

  // ─── INVESTIGACIONES (crear/actualizar) ──────────────────────────────────────

  async crearInvestigacion(data) {
    const { Investigacion } = getModels();
    return Investigacion.create(data);
  },

  async actualizarInvestigacion(id, data) {
    const { Investigacion } = getModels();
    return Investigacion.findByIdAndUpdate(id, data, { new: true });
  },
};

module.exports = api;
