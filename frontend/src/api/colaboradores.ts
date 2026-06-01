/**
 * API — Colaboradores
 * Base: /api/v1/tenant/colaboradores
 *
 * Cubre:
 *  - CRUD completo con soft delete + restaurar
 *  - Avatar (subir/eliminar, multipart)
 *  - Documentos (listar/subir/descargar/visualizar inline/eliminar)
 *  - Paramétricas para dropdowns: EPS / ARL / Fondos de Pensión / Entidades Bancarias
 *  - Listado liviano /select para wizards (Operaciones, Nómina, etc.)
 */
import { requestConToken, fetchConToken } from './request';

function tkn() { return localStorage.getItem('palmapp_token'); }

// ─── Base URL del servidor (sin /api) para construir URLs absolutas de archivos ──
const _API_BASE = (
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ??
  'https://31.97.7.50:3000/api'
).replace(/\/+$/, '');
/** Host raíz del backend (sin /api), para componer URLs de avatares y documentos */
export const FILES_BASE_URL = _API_BASE.replace(/\/api\/?$/, '');

/**
 * Convierte una URL de avatar relativa (ej. /storage/avatars/abc.jpg) en URL absoluta.
 * Si ya viene completa (http:// o https://) la devuelve tal cual.
 * Devuelve null si no hay URL.
 */
export function buildAvatarUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  if (avatarUrl.startsWith('data:')) return avatarUrl;          // data URL (preview local)
  const path = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${FILES_BASE_URL}${path}`;
}

// ─── Tipos públicos ────────────────────────────────────────────────────────────

/** Tipos de documento soportados por el backend (§Tipos de Documento). */
export type TipoDocumento = 'CC' | 'TI' | 'PASAPORTE' | 'CE' | 'PPT';

/** Modalidad de pago — `PRODUCCION` reemplaza al antiguo `VARIABLE`. */
export type ModalidadPago = 'FIJO' | 'PRODUCCION';

/** Tipo de cuenta bancaria (incluye EFECTIVO desde la última versión del doc). */
export type TipoCuentaBancaria = 'AHORROS' | 'CORRIENTE' | 'EFECTIVO';

/** Predio asignado al colaborador (forma compacta). */
export interface PredioRefColaborador {
  id: number;
  nombre: string;
}

/** Contrato vigente que viene anidado en el detalle del colaborador. */
export interface ContratoVigenteColaborador {
  id: number;
  empleado_id: number;
  fecha_inicio: string;
  fecha_terminacion: string | null;
  salario: string | number;
  estado_contrato: 'VIGENTE' | 'TERMINADO' | string;
  adjunto_path: string | null;
  adjunto_nombre_original: string | null;
  observacion: string | null;
  estado: boolean;
}

/** Shape canónico del colaborador (response de §1, §2). */
export interface Colaborador {
  id: number;
  // Personal
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  // Identificación
  tipo_documento: TipoDocumento;
  documento: string;
  fecha_nacimiento: string;
  fecha_expedicion_documento: string;
  lugar_expedicion: string | null;
  // Contratación
  cargo: string;
  salario_base: string | number | null;
  /** Aplica subsidio de transporte. Default `true`. */
  subsidio_transporte: boolean;
  modalidad_pago: ModalidadPago;
  fecha_ingreso: string;
  fecha_retiro: string | null;
  predio?: PredioRefColaborador | null;
  // Contacto
  correo_electronico: string | null;
  telefono: string | null;
  direccion: string | null;
  municipio: string | null;
  departamento: string | null;
  // Seguridad social (guardamos el nombre seleccionado del catálogo)
  eps: string | null;
  fondo_pension: string | null;
  fondo_cesantias: string | null;
  arl: string | null;
  caja_compensacion: string | null;
  // Dotación
  talla_camisa: string | null;
  talla_pantalon: string | null;
  talla_calzado: string | null;
  // Bancario
  tipo_cuenta: TipoCuentaBancaria | null;
  entidad_bancaria: string | null;
  numero_cuenta: string | null;
  // Emergencia
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  // Avatar
  avatar_url?: string | null;
  // Estado y timestamps
  estado: boolean;
  created_at?: string;
  updated_at?: string;
  /** Solo presente en el detalle (§2). */
  contrato_vigente?: ContratoVigenteColaborador | null;
}

/** Payload de creación (§3). `salario_base` solo es obligatorio si FIJO. */
export interface CrearColaboradorPayload {
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  tipo_documento: TipoDocumento;
  documento: string;
  fecha_nacimiento: string;
  fecha_expedicion_documento: string;
  lugar_expedicion?: string;
  cargo: string;
  salario_base?: number;
  subsidio_transporte?: boolean;
  modalidad_pago: ModalidadPago;
  predio_id?: number | null;
  fecha_ingreso: string;
  fecha_retiro?: string | null;
  eps?: string;
  fondo_pension?: string;
  fondo_cesantias?: string;
  arl?: string;
  caja_compensacion?: string;
  talla_camisa?: string;
  talla_pantalon?: string;
  talla_calzado?: string;
  tipo_cuenta?: TipoCuentaBancaria;
  entidad_bancaria?: string;
  numero_cuenta?: string;
  correo_electronico?: string;
  telefono?: string;
  direccion?: string;
  municipio?: string;
  departamento?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
}

/** Payload de edición (§4). Todos opcionales + flag `estado`. */
export type EditarColaboradorPayload = Partial<CrearColaboradorPayload> & {
  estado?: boolean;
};

export interface ColaboradorListadoParams {
  search?: string;
  cargo?: string;
  modalidad_pago?: ModalidadPago;
  predio_id?: number;
  estado?: boolean;
  /** Incluir colaboradores eliminados (soft delete) junto con los vigentes */
  incluir_eliminados?: boolean;
  /** Devolver únicamente los colaboradores eliminados */
  solo_eliminados?: boolean;
  per_page?: number;
  page?: number;
}

export interface ColaboradorSelectParams {
  estado?: boolean;
  modalidad_pago?: ModalidadPago;
  predio_id?: number;
}

/** Item del listado /select (§0 dropdowns). */
export interface ColaboradorSelectItem {
  id: number;
  nombre_completo: string;
  documento: string;
  modalidad_pago: ModalidadPago;
}

// ─── Tipos de documentos del colaborador (§7-§12) ─────────────────────────────

/** Quien subió el documento. */
export interface SubidoPor {
  id: number;
  name: string;
}

/** Documento del colaborador (response de §8, §10). */
export interface DocumentoColaborador {
  id: number;
  categoria: string;
  tipo_documento: string;
  nombre_archivo: string;
  archivo_nombre_original: string;
  mime_type: string;
  archivo_tamano: number;
  fecha_documento: string | null;
  observacion: string | null;
  subido_por: SubidoPor | null;
  estado: boolean;
  created_at: string;
  updated_at: string;
}

/** Body de subida (multipart). */
export interface SubirDocumentoPayload {
  archivo: File;
  categoria: string;
  tipo_documento: string;
  nombre_archivo?: string;
  fecha_documento?: string;
  observacion?: string;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────
async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const q = params ? '?' + new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)])
    )
  ).toString() : '';
  return requestConToken<T>(`/api/v1/tenant/colaboradores${path}${q}`, { method: 'GET' }, tkn());
}
async function post<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant/colaboradores${path}`, { method: 'POST', body: JSON.stringify(body) }, tkn());
}
async function put<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant/colaboradores${path}`, { method: 'PUT', body: JSON.stringify(body) }, tkn());
}
async function del<T>(path: string): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant/colaboradores${path}`, { method: 'DELETE' }, tkn());
}

// ─── Tipos del bundle wizard-init ──────────────────────────────────────────────
export interface ParametricaItem    { id: number; nombre: string }
export interface PredioParametrica  { id: number; nombre: string; estado: boolean }
export interface DepartamentoItem   { codigo: string; nombre: string }

export interface DocumentoCategoria {
  label: string;
  unico_por_tipo: boolean;
  permite_tipo_personalizado?: boolean;
  tipos: Record<string, string>;
}

export interface WizardParametricas {
  predios:              PredioParametrica[];
  eps:                  ParametricaItem[];
  arl:                  ParametricaItem[];
  fondos_pension:       ParametricaItem[];
  fondos_cesantias:     ParametricaItem[];
  entidades_bancarias:  ParametricaItem[];
  departamentos:        DepartamentoItem[];
  documento_categorias: Record<string, DocumentoCategoria>;
}

export interface WizardInitResponse {
  /** `null` en modo creación */
  colaborador: Colaborador | null;
  parametricas: WizardParametricas;
}

export const colaboradoresApi = {
  // ─── Bundle de inicialización del wizard ─────────────────────────────────
  /**
   * Reemplaza 9 fetches paralelos del wizard de colaboradores
   * (predios, documento-categorias, eps, arl, fondos-pension, fondos-cesantias,
   * entidades-bancarias, departamentos y colaboradores/{id}).
   * - `id` presente → modo edición, devuelve colaborador + paramétricas.
   * - `id` ausente  → modo creación, devuelve solo paramétricas (colaborador = null).
   */
  wizardInit: (id?: number | string) => {
    const path = id != null
      ? `/${id}/wizard-init`
      : `/wizard-init`;
    return get<{ data: WizardInitResponse }>(path);
  },

  // ─── Listado / búsqueda ──────────────────────────────────────────────────
  listar: (p?: ColaboradorListadoParams) =>
    get<{ data: Colaborador[]; meta: any }>('', p as any),

  /**
   * Listado liviano para dropdowns (sin paginación).
   * Retorna: [{ id, nombre_completo, documento, modalidad_pago }]
   */
  selectListado: (p?: ColaboradorSelectParams) =>
    get<{ data: ColaboradorSelectItem[] }>('/select', p as any),

  ver: (id: number) => get<{ data: Colaborador }>(`/${id}`),

  /**
   * Crea un colaborador. Si `modalidad_pago='PRODUCCION'` y se omite
   * `salario_base`, el backend lo auto-completa con `salario_minimo_vigente`
   * del tenant.
   */
  crear: (b: CrearColaboradorPayload) =>
    post<{ message: string; data: Colaborador }>('', b as unknown as Record<string, unknown>),

  /** Edita un colaborador. Todos los campos opcionales + `estado`. */
  editar: (id: number, b: EditarColaboradorPayload) =>
    put<{ message: string; data: Colaborador }>(`/${id}`, b as unknown as Record<string, unknown>),

  /**
   * Soft delete del colaborador. Mantiene historial (jornales, nómina, contratos, docs).
   * Para reincorporarlo usar `restaurar(id)`.
   */
  eliminar: (id: number) => del<{ message: string }>(`/${id}`),

  /** Restaura un colaborador previamente eliminado (soft delete). */
  restaurar: (id: number) =>
    requestConToken<{ message: string; data: Colaborador }>(
      `/api/v1/tenant/colaboradores/${id}/restaurar`,
      { method: 'POST' },
      tkn()
    ),

  toggle: (id: number) =>
    requestConToken<{ message: string; data: Colaborador }>(
      `/api/v1/tenant/colaboradores/${id}/toggle`, { method: 'PATCH' }, tkn()
    ),

  // ─── Avatar ──────────────────────────────────────────────────────────────
  /**
   * Sube/reemplaza el avatar del colaborador.
   * El FormData debe traer un campo `avatar` con el archivo (jpg/png/webp, máx 3 MB).
   *
   * Ejemplo de uso:
   *   const fd = new FormData();
   *   fd.append('avatar', file);
   *   colaboradoresApi.subirAvatar(id, fd);
   */
  subirAvatar: (id: number, formData: FormData) =>
    requestConToken<{ message: string; data: Colaborador }>(
      `/api/v1/tenant/colaboradores/${id}/avatar`,
      { method: 'POST', body: formData },
      tkn()
    ),

  /**
   * Elimina el avatar del colaborador.
   * Devuelve 409 con `code: 'AVATAR_NOT_FOUND'` si no tenía avatar.
   */
  eliminarAvatar: (id: number) =>
    requestConToken<{ message: string; data: Colaborador }>(
      `/api/v1/tenant/colaboradores/${id}/avatar`,
      { method: 'DELETE' },
      tkn()
    ),

  // ─── Documentos ──────────────────────────────────────────────────────────
  getCategorias: () =>
    get<{ data: Record<string, DocumentoCategoria> }>('/documento-categorias'),

  getDocumentos: (id: number, categoria?: string) =>
    get<{ data: DocumentoColaborador[] }>(
      `/${id}/documentos`,
      categoria ? { categoria } : undefined,
    ),

  verDocumento: (id: number, docId: number) =>
    get<{ data: DocumentoColaborador }>(`/${id}/documentos/${docId}`),

  /**
   * Sube un documento. El FormData debe incluir:
   *   archivo (File, max 10 MB)
   *   categoria (string, ver DocumentoCategoria)
   *   tipo_documento (string)
   *   nombre_archivo (string, opcional)
   *   fecha_documento (date YYYY-MM-DD, opcional)
   *   observacion (string, opcional)
   */
  subirDocumento: (id: number, formData: FormData) =>
    requestConToken<{ message: string; data: DocumentoColaborador }>(
      `/api/v1/tenant/colaboradores/${id}/documentos`,
      { method: 'POST', body: formData },
      tkn()
    ),

  eliminarDocumento: (id: number, docId: number) =>
    requestConToken<{ message: string }>(
      `/api/v1/tenant/colaboradores/${id}/documentos/${docId}`,
      { method: 'DELETE' }, tkn()
    ),

  /**
   * URL relativa para descarga (Content-Disposition: attachment).
   * Para fetch autenticado real usar `descargarDocumentoBlob` (incluye token).
   */
  descargarDocumento: (id: number, docId: number) =>
    `/api/v1/tenant/colaboradores/${id}/documentos/${docId}/descargar`,

  /**
   * Descarga el archivo como Blob con headers de auth + tenant.
   * Útil para hacer download programático: `URL.createObjectURL(blob)` + `<a download>`.
   */
  descargarDocumentoBlob: async (id: number, docId: number): Promise<Blob> => {
    const res = await fetchConToken(
      `/api/v1/tenant/colaboradores/${id}/documentos/${docId}/descargar`,
      tkn(),
      { method: 'GET' }
    );
    if (!res.ok) throw new Error(`Error ${res.status} al descargar el documento`);
    return res.blob();
  },

  /**
   * Visualiza el documento inline (preview en navegador).
   * Devuelve el Blob; el caller debe generar `URL.createObjectURL(blob)`
   * y asignarlo a un <iframe> (PDF) o <img> (imagen).
   *
   * Mime types soportados: application/pdf, image/jpeg, image/png, image/webp.
   * Si no es previsualizable, lanza error con `code: 'MIME_NOT_PREVIEWABLE'` (HTTP 415).
   *
   * IMPORTANTE: revocar la URL al desmontar para liberar memoria:
   *   URL.revokeObjectURL(objectUrl);
   */
  visualizarDocumento: async (
    id: number,
    docId: number
  ): Promise<{ blob: Blob; mimeType: string; filename?: string }> => {
    const res = await fetchConToken(
      `/api/v1/tenant/colaboradores/${id}/documentos/${docId}/visualizar`,
      tkn(),
      { method: 'GET' }
    );
    if (res.status === 415) {
      // Body viene como JSON pero la respuesta puede llegar como blob
      let payload: any = {};
      try {
        const text = await res.clone().text();
        payload = JSON.parse(text);
      } catch { /* ignore */ }
      const err = new Error(payload?.message ?? 'Tipo de archivo no previsualizable');
      (err as any).code = payload?.code ?? 'MIME_NOT_PREVIEWABLE';
      (err as any).mimeType = payload?.mime_type;
      (err as any).status = 415;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(`Error ${res.status} al visualizar el documento`);
      (err as any).status = res.status;
      throw err;
    }
    const mimeType = res.headers.get('content-type') ?? 'application/octet-stream';
    // Extraer filename del Content-Disposition (inline; filename="...")
    const cd = res.headers.get('content-disposition') ?? '';
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
    const filename = m ? decodeURIComponent(m[1]) : undefined;
    const blob = await res.blob();
    return { blob, mimeType, filename };
  },

  // ─── Paramétricas (selects para dropdowns del formulario) ──────────────────
  // Endpoints: /api/v1/tenant/{recurso}/select → { data: [{ id, nombre }] }
  // Devuelven solo activos (estado=true), sin paginación, ordenados por nombre.
  // El frontend guarda el `nombre` (no el id) en el payload del colaborador.
  getEPS: () =>
    requestConToken<{ data: Array<{ id: number; nombre: string }> }>(
      '/api/v1/tenant/eps/select', { method: 'GET' }, tkn()
    ),

  getARL: () =>
    requestConToken<{ data: Array<{ id: number; nombre: string }> }>(
      '/api/v1/tenant/arl/select', { method: 'GET' }, tkn()
    ),

  getFondosPension: () =>
    requestConToken<{ data: Array<{ id: number; nombre: string }> }>(
      '/api/v1/tenant/fondos-pension/select', { method: 'GET' }, tkn()
    ),

  getFondosCesantias: () =>
    requestConToken<{ data: Array<{ id: number; nombre: string }> }>(
      '/api/v1/tenant/fondos-cesantias/select', { method: 'GET' }, tkn()
    ),

  getEntidadesBancarias: () =>
    requestConToken<{ data: Array<{ id: number; nombre: string }> }>(
      '/api/v1/tenant/entidades-bancarias/select', { method: 'GET' }, tkn()
    ),

  // ─── Importación masiva (Excel) ──────────────────────────────────────────
  /**
   * Inicia importación masiva. FormData con campo `archivo` (.xlsx/.xls, máx 5 MB).
   * Devuelve `importacion_id` para consultar el estado por polling.
   */
  importar: (formData: FormData) =>
    requestConToken<{
      message: string;
      data: { importacion_id: number; estado: EstadoImportacion };
    }>(
      '/api/v1/tenant/colaboradores/importar',
      { method: 'POST', body: formData },
      tkn()
    ),

  /**
   * Estado y resultados de una importación. Polling cada 3-5 s mientras
   * el estado sea PENDIENTE o PROCESANDO.
   */
  estadoImportacion: (id: number) =>
    requestConToken<{ data: ImportacionColaboradores }>(
      `/api/v1/tenant/colaboradores/importaciones/${id}`,
      { method: 'GET' },
      tkn()
    ),
};

// ─── Tipos de importación masiva ─────────────────────────────────────────────
export type EstadoImportacion =
  | 'PENDIENTE'
  | 'PROCESANDO'
  | 'COMPLETADO'
  | 'CON_ERRORES'
  | 'FALLIDO';

export const ESTADOS_IMPORTACION_FINALES: EstadoImportacion[] = [
  'COMPLETADO',
  'CON_ERRORES',
  'FALLIDO',
];

export interface ImportacionResultadoFila {
  fila: number;
  estado: 'exitoso' | 'fallido';
  documento: string | null;
  mensaje: string;
}

export interface ImportacionColaboradores {
  id: number;
  estado: EstadoImportacion;
  nombre_archivo_original: string;
  total_filas: number;
  filas_exitosas: number;
  filas_fallidas: number;
  error_fatal: string | null;
  resultados: ImportacionResultadoFila[] | null;
  iniciado_at: string | null;
  finalizado_at: string | null;
  created_at: string;
}

// ─── Códigos de error específicos del módulo ─────────────────────────────────
export const ColaboradoresErrorCodes = {
  /** Se intentó restaurar un colaborador que no estaba eliminado (409). */
  EMPLEADO_NO_ELIMINADO: 'EMPLEADO_NO_ELIMINADO',
  /** Al restaurar, otro colaborador activo ya usa el mismo documento (409). */
  DOCUMENTO_DUPLICADO: 'DOCUMENTO_DUPLICADO',
  /** Se intentó borrar avatar de un colaborador sin avatar (409). */
  AVATAR_NOT_FOUND: 'AVATAR_NOT_FOUND',
  /** El documento no se puede previsualizar inline; usar /descargar (415). */
  MIME_NOT_PREVIEWABLE: 'MIME_NOT_PREVIEWABLE',
} as const;

export type ColaboradoresErrorCode =
  typeof ColaboradoresErrorCodes[keyof typeof ColaboradoresErrorCodes];