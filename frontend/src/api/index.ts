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

export { plantacionApi } from './plantacion';
export type { Predio, Lote, Sublote, Palma, PredioPayload, LotePayload } from './plantacion';

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

export { operacionesApi } from './operaciones';
export type { Planilla, PlanillaPayload, LineaPlanilla } from './operaciones';

export {
  viajesApi,
  // Paramétricas §16 (Configuración → Viajes). Permiso CRUD: configuracion.editar.
  // Permiso /select y /transportadoresDe: configuracion.editar o viajes.crear.
  extractorasApi,
  empresasTransportadorasApi,
  transportadoresApi,
} from './viajes';
export type {
  Viaje, ViajePayload,
  // Tipos de las paramétricas de viajes
  Extractora, ExtractoraSelect,
  EmpresaTransportadora, EmpresaTransportadoraSelect,
  Transportador, TransportadorSelect,
} from './viajes';

export { configuracionApi, ConfiguracionErrorCodes } from './configuracion';
export type {
  // Paramétricas básicas
  Semilla, SemillaPayload, TipoSemilla, SemillaSelectItem,
  Insumo, InsumoPayload,
  PrecioAbono, PrecioAbonoPayload,
  Labor, LaborPayload, LaborSelectItem,
  PrecioPalma, PrecioPalmaPayload, TipoPalmaPrecio,
  PromedioLote, PromedioLotePayload,
  Cargo, CargoPayload, SalarioTipoCargo,
  ModalidadContrato, ModalidadContratoPayload,
  // Configuraciones agregadas
  ConfiguracionNomina, ConfiguracionNominaPayload, TipoPagoNomina,
  PrecioCosecha, PrecioCosechaPayload, PrecioCosechaParams,
  InfoEmpresa, InfoEmpresaPayload, TipoPersona,
  ConstantesLegales, ConstantesLegalesPayload,
  TablaLegal, TablaLegalPayload, TablaLegalConcepto,
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
