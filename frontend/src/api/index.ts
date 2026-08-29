/**
 * API — Barrel export
 * Importa todo desde aquí: import { authApi, plantacionApi } from '@/api'
 */

export { apiClient, tokenStorage, tenantStorage } from './client';
export type { ApiError, PaginatedResponse } from './client';

export { authApi } from './auth';
export type {
  LoginFincaPayload, LoginSuperAdminPayload,
  TenantInfo, LoginFincaResponse, LoginSuperAdminResponse,
  SelectTenantPayload, SelectTenantResponse, MeResponse,
  ForgotPasswordPayload, ResetPasswordPayload,
} from './auth';

// Plantación — reexporta los apis que sí existen en plantacion.ts.
// (El símbolo agregado `plantacionApi` nunca existió; se quitó.)
export { prediosApi, lotesApi, sublotesApi, palmasApi, lineasApi } from './plantacion';

export { usuariosApi } from './usuarios';
export type { UsuarioTenant, CreateUsuarioPayload, UpdateUsuarioPayload } from './usuarios';

export { colaboradoresApi } from './colaboradores';
export type { Colaborador, ColaboradorPayload, Contrato } from './colaboradores';

export { nominaApi, NominaErrorCodes } from './nomina';
export type {
  Nomina,
  NominaEmpleado,
  NominaEmpleadoConcepto,
  NominaIndicadores,
  EmpleadoDisponible,
  PreviewLiquidacion,
  ConceptoLegalPreview,
  ResumenTrabajo,
  CategoriaResumenTrabajo,
  FilaResumenTrabajo,
  DesprendibleData,
  NominaConcepto,
  EstadoNomina,
  EstadoNominaEmpleado,
  Periodicidad,
  SalarioTipo,
  TipoConcepto,
  SubtipoConcepto,
  AplicaA,
  LiquidarPayload,
  BonificacionInput,
  DeduccionVoluntariaInput,
  NominaErrorCode,
} from './nomina';

export {
  operacionesApi,
  cosechasApi,
  jornalesApi,
  jornalGruposApi,
  horasExtraApi,
  ausenciasApi,
  selectsApi as operacionesSelectsApi,
  OperacionesErrorCodes,
  calcularValorHoraExtra,
} from './operaciones';
export type {
  Planilla, EstadoPlanilla, Periodo,
  Resumen, Indicadores,
  Cosecha, CosechaCuadrillaItem,
  Jornal, JornalPayload, JornalPalma, JornalFinca, CategoriaJornal, TipoJornalPalma,
  JornalGrupo, JornalGrupoMiembroPayload, CrearJornalGrupoPayload,
  HoraExtra, HoraExtraPayload, HoraExtraTipoRef, EstadoHoraExtra,
  Ausencia, EstadoNovedad,
  OperacionesErrorCode,
} from './operaciones';

export {
  viajesApi,
  // Paramétricas §16 (Configuración → Viajes). Permiso CRUD: configuracion.editar.
  // Permiso /select y /transportadoresDe: configuracion.editar o viajes.crear.
  extractorasApi,
  empresasTransportadorasApi,
  transportadoresApi,
  // §9 códigos de error del módulo Viajes.
  ViajesErrorCodes,
} from './viajes';
export type {
  Viaje,
  // Tipos de las paramétricas de viajes
  Extractora, ExtractoraSelect,
  EmpresaTransportadora, EmpresaTransportadoraSelect,
  Transportador, TransportadorSelect,
  ViajeErrorCode,
  // Payloads de creación/edición (§5.1 y §5.5-5.7)
  CrearViajePayload, EditarViajePayload,
  HidratarReconteoPayload, ValidarViajePayload,
} from './viajes';

// Paramétricas §18 — Rangos de Numeración Manual (prefijos + consecutivos
// para remisiones y otros documentos de viajes).
export { rangosNumeracionApi, RangosNumeracionErrorCodes } from './rangosNumeracion';
export type {
  RangoNumeracion,
  RangoNumeracionSelectItem,
  CrearRangoNumeracionPayload,
  EditarRangoNumeracionPayload,
  TipoDocumentoRango,
  TipoEliminacionRango,
  RangoNumeracionErrorCode,
} from './rangosNumeracion';

export { configuracionApi, ConfiguracionErrorCodes } from './configuracion';
export type {
  // Paramétricas básicas
  Semilla, SemillaPayload, TipoSemilla, SemillaSelectItem,
  Insumo, InsumoPayload,
  PrecioAbono, PrecioAbonoPayload,
  // §4 Labores (unificado: palma fijas + custom palma + custom finca)
  Labor, LaborPayload, LaborSelectItem, LaborParams,
  CategoriaLabor, TipoLaborPalma, TipoPagoLabor,
  // §19 Actividades de labor (sublabores para SANIDAD y custom PALMA)
  LaborActividad, LaborActividadPayload,
  PromedioLote, PromedioLotePayload,
  Cargo, CargoPayload, SalarioTipoCargo,
  ModalidadContrato, ModalidadContratoPayload,
  // Configuraciones agregadas
  ConfiguracionNomina, ConfiguracionNominaPayload, TipoPagoNomina,
  PrecioCosecha, PrecioCosechaPayload, PrecioCosechaParams,
  InfoEmpresa, InfoEmpresaPayload, TipoPersona,
  ConstantesLegales, ConstantesLegalesPayload,
  // Catálogos del colaborador
  ParametricaColaborador, ParametricaColaboradorPayload,
  EntidadBancaria, EntidadBancariaPayload, EntidadBancariaSelectItem,
  // §17 Motivos de Ausencia (Tipos de Novedades)
  MotivoAusencia, MotivoAusenciaPayload, MotivoAusenciaSelectItem,
  MotivoAusenciaListadoParams, TipoBaseAusencia,
  // Horas extra
  TipoHoraExtra, TipoHoraExtraPayload, CodigoHoraExtra, FranjaHoraria,
  TipoHoraExtraCodigoItem,
  // Auditoría
  AuditoriaRegistro, AuditoriaAccion, AuditoriaListadoParams, AuditoriaListadoResponse,
  // Compartido
  ParametricaParams,
} from './configuracion';

export { superAdminApi } from './superAdmin';
export type { Tenant, CreateTenantPayload, GlobalUser, AuditoriaEntry } from './superAdmin';

// §14.1 Calendario de festivos (Configuración → Festivos).
export { festivosApi } from './festivos';
export type {
  Festivo, FestivoOrigen, FestivoPayload, FestivosResponse, FestivoVerificacion,
} from './festivos';
