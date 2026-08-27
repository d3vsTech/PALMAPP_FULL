/**
 * API — Calendario de festivos del tenant (doc §14.1).
 *
 * `GET` lo puede leer cualquier usuario con `nomina.ver` / `nomina.liquidar`
 * (quien liquida necesita ver por qué el 13-jul salió con recargo). El resto
 * de operaciones exige `configuracion.editar`.
 *
 * Los festivos con `origen: 'NACIONAL'` NO se editan ni se borran (el backend
 * responde 403 `FESTIVO_NACIONAL_INMUTABLE`). Para "corregir" uno, el tenant
 * crea su propia fila para esa fecha (POST). Con `activo: false` suprime el
 * nacional; con `activo: true` lo renombra o agrega uno local.
 */

import { apiClient } from './client';

const T = true; // requiresTenant

export type FestivoOrigen = 'NACIONAL' | 'TENANT';

export interface Festivo {
  id: number;
  fecha: string;
  nombre: string;
  origen: FestivoOrigen;
  activo: boolean;
  base_legal?: string | null;
  trasladado_desde?: string | null;
  observacion?: string | null;
  /** UX; el backend igual revalida. */
  editable: boolean;
  /** ¿gana en la resolución nacional+tenant? */
  vigente: boolean;
}

export interface FestivoVerificacion {
  estado: 'COINCIDE' | 'DISCREPA' | 'FUENTE_NO_DISPONIBLE' | string;
  fuente: string;
  verificado_at: string;
  total_local: number;
  total_remoto: number;
  solo_local: string[];
  solo_remoto: string[];
}

export interface FestivosResponse {
  anio: number;
  total: number;
  festivos: Festivo[];
  verificacion?: FestivoVerificacion;
}

/**
 * Crear un festivo del tenant. `activo: false` suprime un festivo nacional
 * (opera ese día por convenio); `activo: true` renombra o agrega uno local.
 */
export interface FestivoPayload {
  fecha: string;
  nombre: string;
  activo: boolean;
  observacion?: string | null;
}

export const festivosApi = {
  /**
   * GET /configuracion/festivos?anio= (§14.1).
   * Cada llamada dispara una verificación oportunista contra Nager.Date si
   * la última tiene más de 30 días.
   */
  listar: (anio: number) =>
    apiClient.get<{ data: FestivosResponse }>(
      `/v1/tenant/configuracion/festivos?anio=${anio}`,
      T,
    ),

  crear: (payload: FestivoPayload) =>
    apiClient.post<{ message: string; data: Festivo }>(
      '/v1/tenant/configuracion/festivos',
      payload,
      T,
    ),

  editar: (id: number, payload: Partial<FestivoPayload>) =>
    apiClient.put<{ message: string; data: Festivo }>(
      `/v1/tenant/configuracion/festivos/${id}`,
      payload,
      T,
    ),

  eliminar: (id: number) =>
    apiClient.delete<{ message: string }>(
      `/v1/tenant/configuracion/festivos/${id}`,
      T,
    ),
};
