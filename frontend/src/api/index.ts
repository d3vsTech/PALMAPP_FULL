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

export { nominaApi } from './nomina';
export type { Nomina, Prestamo, Permiso, Ausencia, Vacacion } from './nomina';

export { operacionesApi } from './operaciones';
export type { Planilla, PlanillaPayload, LineaPlanilla } from './operaciones';

export { viajesApi } from './viajes';
export type { Viaje, ViajePayload } from './viajes';

export { configuracionApi } from './configuracion';
export type {
  Semilla, Insumo, Cargo, Labor, ConceptoNomina,
  EditarFincaPayload, EditarPerfilPayload,
} from './configuracion';

export { superAdminApi } from './superAdmin';
export type { Tenant, CreateTenantPayload, GlobalUser, AuditoriaEntry } from './superAdmin';
