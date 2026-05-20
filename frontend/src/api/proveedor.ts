/**
 * api/proveedor.ts
 * Cliente del lado proveedor del módulo Market — alineado a docs/MARKET_MODULE.md §12.
 * Base: /api/v1/market/proveedor
 * Auth: Authorization Bearer (sin X-Tenant-Id, el proveedor se infiere del JWT vía middleware SetProveedor).
 */
import { requestConToken, fetchConToken } from './request';

const BASE = '/api/v1/market/proveedor';

/**
 * Token del PORTAL PROVEEDOR (NO el de finca).
 * El proveedor inicia sesión vía /api/v1/proveedor-auth/login y el token
 * queda guardado por `proveedorAuthStorage` en `palmapp_proveedor_token`.
 * Si por algún motivo no está, hacemos fallback al token global de finca
 * para no romper compatibilidad con flujos legacy.
 */
function tkn() {
  return localStorage.getItem('palmapp_proveedor_token')
    ?? localStorage.getItem('palmapp_token');
}

function toQuery(p?: Record<string, unknown>): string {
  if (!p) return '';
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return requestConToken<T>(`${BASE}${path}${toQuery(params)}`, { method: 'GET' }, tkn());
}
function post<T>(path: string, body?: unknown): Promise<T> {
  return requestConToken<T>(`${BASE}${path}`, {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }, tkn());
}
function put<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`${BASE}${path}`, { method: 'PUT', body: JSON.stringify(body) }, tkn());
}
function del<T>(path: string): Promise<T> {
  return requestConToken<T>(`${BASE}${path}`, { method: 'DELETE' }, tkn());
}
function patch<T>(path: string, body?: unknown): Promise<T> {
  return requestConToken<T>(`${BASE}${path}`, {
    method: 'PATCH',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }, tkn());
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EstadoPedidoProv =
  | 'pendiente' | 'confirmado' | 'preparando' | 'en_transito' | 'entregado' | 'cancelado';

/** Prioridad del pedido (API_MARKET_PROVEEDOR_PEDIDOS §9) */
export type PrioridadPedidoProv = 'normal' | 'alta' | 'urgente';

/** Estado de pago manual (API_MARKET_PROVEEDOR_PEDIDOS §10) */
export type EstadoPagoPedidoProv = 'pendiente' | 'pagado';

/** Acciones devueltas en `acciones_disponibles` por el backend */
export type AccionPedidoProv =
  | 'confirmar' | 'rechazar' | 'preparar' | 'despachar' | 'entregar';

/** Vistas (tabs) del listado de pedidos del proveedor (§3 query `tab`) */
export type TabPedidosProv = 'todos' | 'por_confirmar' | 'activos' | 'completados';

/** Stats agregados que devuelve el listado (no se calculan en cliente) */
export interface PedidosStatsProv {
  por_confirmar: number;
  activos: number;
  en_transito: number;
  completados: number;
  ventas_mes: number;
}

/** Dashboard del Portal Proveedor (API §1) */
export interface IndicadoresProv {
  productos_activos: number;
  productos_total: number;
  pedidos_pendientes: number;
  pedidos_en_proceso: number;
  pedidos_completados_mes: number;
  ventas_mes_actual: number;
  ventas_mes_anterior: number;
  variacion_ventas_porcentaje: number | null;
}

export interface PedidoRecienteProv {
  id: number;
  codigo: string;
  estado: EstadoPedidoProv;
  total: string | number;
  fecha_pedido: string;
  tenant: { id: number; nombre: string };
  primer_producto: {
    nombre: string;
    cantidad: number;
    unidad: string | null;
  };
}

export interface ProductoMasVendidoProv {
  id: number;
  nombre: string;
  imagen_principal: string | null;
  unidades_vendidas: number;
  ingresos_acumulados: number;
}

export interface DashboardProveedorResponse {
  indicadores: IndicadoresProv;
  pedidos_recientes: PedidoRecienteProv[];
  productos_mas_vendidos: ProductoMasVendidoProv[];
}

/** Wizard-init para crear/editar producto (§1 del API de Productos) */
export interface WizardInitProductosResponse {
  categorias: Array<{ id: number; nombre: string; slug: string; icono?: string | null }>;
  unidades_medida: Array<{ id: number; codigo: string; nombre: string; abreviatura: string }>;
}

/** Imagen de la galería del producto (no la imagen_principal) */
export interface ProductoImagenGaleria {
  id: number;
  producto_id?: number;
  url: string;
  orden: number;
  alt_text?: string | null;
  created_at?: string;
}

/** Estadísticas del listado de productos */
export interface ProductosStats {
  total_activos: number;
  total_inactivos: number;
  total_sin_stock: number;
}

/** Legacy — algunos consumidores aún la usan. Se conserva como alias del nuevo. */
export interface DashboardProv {
  productos_activos: number;
  productos_total: number;
  pedidos_pendientes: number;
  pedidos_en_transito: number;
  pedidos_entregados_mes: number;
  ventas_mes: number;
  ventas_total: number;
  calificacion_promedio?: number | string | null;
  productos_bajo_stock: number;
  pedidos_recientes?: PedidoProv[];
}

export interface CategoriaRefProv {
  id: number;
  nombre: string;
  slug: string;
}

export interface UnidadMedidaProv {
  id: number;
  codigo?: string;
  nombre?: string;
  abreviatura: string;
}

export interface PrecioVolumenProv {
  id?: number;
  cantidad_minima: number;
  precio_unidad: string | number;
  activo?: boolean;
}

export interface ProductoImagenProv {
  id?: number;
  url: string;
  principal?: boolean;
  orden?: number;
}

export interface ProductoProv {
  id: number;
  nombre: string;
  descripcion: string;
  sku?: string | null;
  categoria_id: number;
  unidad_medida_id: number;
  imagen_principal?: string | null;
  precio_unitario: string | number;
  stock_disponible: number;
  stock_minimo?: number;
  stock_bajo?: boolean;
  destacado?: boolean;
  estado: 'activo' | 'inactivo';
  especificaciones?: Record<string, any> | null;
  categoria?: CategoriaRefProv;
  unidad_medida?: UnidadMedidaProv;
  precios_volumen?: PrecioVolumenProv[];
  imagenes?: ProductoImagenProv[];
  calificacion_promedio?: number | string | null;
  total_resenas?: number;
}

export interface ProductoCreatePayload {
  nombre: string;
  descripcion: string;
  sku?: string;
  categoria_id: number;
  unidad_medida_id: number;
  precio_unitario: number;
  stock_disponible: number;
  stock_minimo?: number;
  destacado?: boolean;
  estado?: 'activo' | 'inactivo';
  especificaciones?: Record<string, any>;
  precios_volumen?: { cantidad_minima: number; precio_unidad: number }[];
}

export type ProductoUpdatePayload = Partial<ProductoCreatePayload>;

export interface PedidoItemProv {
  id: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: string | number;
  subtotal: string | number;
  descuento?: string | number;
  producto?: { id: number; nombre: string; imagen_principal?: string | null };
}

/**
 * Tenant del lado pedido. En `index` viene compacto (nombre/telefono/email).
 * En `show` viene completo con NIT y dirección.
 */
export interface TenantRefProv {
  id: number;
  nombre: string;
  ciudad?: string | null;
  email?: string | null;
  telefono?: string | null;
  /** Solo en detalle */
  nit?: string | null;
  /** Solo en detalle */
  correo_contacto?: string | null;
  /** Solo en detalle */
  direccion?: string | null;
}

export interface PedidoEstadoHistorialProv {
  id: number;
  estado_anterior: EstadoPedidoProv | null;
  estado_nuevo: EstadoPedidoProv;
  comentario?: string | null;
  fecha_cambio: string;
  user?: { id: number; name: string };
}

export interface PedidoProv {
  id: number;
  codigo: string;
  estado: EstadoPedidoProv;
  prioridad?: PrioridadPedidoProv;
  estado_pago?: EstadoPagoPedidoProv;
  numero_guia?: string | null;
  subtotal: string | number;
  costo_envio: string | number;
  total: string | number;
  metodo_pago?: string | null;
  direccion_entrega?: string | null;
  notas?: string | null;
  fecha_pedido: string;
  fecha_entrega_estimada?: string | null;
  fecha_entrega_real?: string | null;
  tenant?: TenantRefProv;
  /** En el listado puede venir vacío y solo `productos_resumen`. */
  items: PedidoItemProv[];
  /** Resumen textual en el listado (ej. "20 Fertilizante NPK 15-15-15 y 1 producto(s) más"). */
  productos_resumen?: string;
  historial?: PedidoEstadoHistorialProv[];
  /** Acciones que el frontend debe renderizar como CTAs (§13). */
  acciones_disponibles?: AccionPedidoProv[];
}

export interface Paginacion {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ListarProductosParams {
  buscar?: string;
  categoria_id?: number;
  estado?: 'activo' | 'inactivo';
  /** Solo productos destacados (se envía como `true`) */
  destacados?: boolean;
  /** Compat con código viejo */
  destacado?: boolean;
  /** Orden de resultados (default backend: recientes) */
  ordenar?: 'recientes' | 'nombre' | 'precio_asc' | 'precio_desc';
  page?: number;
  per_page?: number;
}

export interface ListarPedidosParams {
  /** Tab del portal proveedor (server-side filter) */
  tab?: TabPedidosProv;
  /** Estado específico (independiente del tab) */
  estado?: EstadoPedidoProv;
  /** Búsqueda por código o nombre de finca (server-side) */
  buscar?: string;
  page?: number;
  per_page?: number;
}

/** Body de `PUT /pedidos/{id}/estado` (§5) */
export interface CambiarEstadoPedidoPayload {
  estado: EstadoPedidoProv;
  comentario?: string;
  prioridad?: PrioridadPedidoProv;
  estado_pago?: EstadoPagoPedidoProv;
  numero_guia?: string | null;
  /** YYYY-MM-DD */
  fecha_entrega_estimada?: string | null;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * Construye FormData a partir de un payload de producto.
 * Laravel parsea `array notation` (clave[0][campo]) directo como array PHP,
 * por eso `precios_volumen` y `especificaciones` se serializan así en vez de
 * como JSON string (el backend rechaza "must be an array" con JSON.stringify).
 * `imagen_principal` (File) se incluye si está presente.
 */
function buildProductoFormData(
  payload: ProductoCreatePayload | ProductoUpdatePayload,
  imagen?: File | null,
): FormData {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === 'precios_volumen' && Array.isArray(v)) {
      v.forEach((item: any, i: number) => {
        Object.entries(item ?? {}).forEach(([ik, iv]) => {
          if (iv === undefined || iv === null) return;
          fd.append(`precios_volumen[${i}][${ik}]`, String(iv));
        });
      });
    } else if (k === 'especificaciones' && typeof v === 'object') {
      Object.entries(v as Record<string, unknown>).forEach(([ek, ev]) => {
        if (ev === undefined || ev === null) return;
        fd.append(`especificaciones[${ek}]`, String(ev));
      });
    } else if (typeof v === 'boolean') {
      fd.append(k, v ? '1' : '0');
    } else {
      fd.append(k, String(v));
    }
  });
  if (imagen instanceof File) fd.append('imagen_principal', imagen);
  return fd;
}

async function multipartConToken<T>(method: 'POST' | 'PUT', path: string, fd: FormData): Promise<T> {
  // Laravel no procesa archivos en PUT con multipart estándar. El truco es
  // hacer POST y mandar _method=PUT en el body.
  if (method === 'PUT') fd.append('_method', 'PUT');
  const res = await fetchConToken(`${BASE}${path}`, tkn(), { method: 'POST', body: fd });
  let data: any;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const err: any = new Error(data?.message ?? `Error ${res.status}`);
    err.status = res.status;
    err.code = data?.code ?? null;
    err.errors = data?.errors ?? null;
    throw err;
  }
  return data as T;
}

export const proveedorApi = {
  // ── Dashboard (§ doc API_MARKET_PROVEEDOR_DASHBOARD) ─────────────────────
  dashboard: () =>
    get<{ data: DashboardProveedorResponse }>('/dashboard'),

  // ── Productos: wizard-init (selects para el formulario) ──────────────────
  wizardInitProductos: () =>
    get<{ data: WizardInitProductosResponse }>('/wizard-init'),

  // ── Productos (CRUD) ─────────────────────────────────────────────────────
  productos: (p?: ListarProductosParams) =>
    get<{ data: ProductoProv[]; meta: Paginacion; stats?: ProductosStats }>(
      '/productos', p as Record<string, unknown>),

  producto: (id: number) =>
    get<{ data: ProductoProv }>(`/productos/${id}`),

  /**
   * Crea un producto. Soporta imagen principal (File). Si no se incluye archivo,
   * se hace JSON normal.
   */
  crearProducto: (payload: ProductoCreatePayload, imagen?: File | null) => {
    if (imagen instanceof File) {
      return multipartConToken<{ data: ProductoProv }>('POST', '/productos',
        buildProductoFormData(payload, imagen));
    }
    return post<{ message: string; data: ProductoProv }>('/productos', payload);
  },

  /**
   * Actualiza un producto. Si se incluye archivo, hace multipart con _method=PUT.
   */
  editarProducto: (id: number, payload: ProductoUpdatePayload, imagen?: File | null) => {
    if (imagen instanceof File) {
      return multipartConToken<{ data: ProductoProv }>('PUT', `/productos/${id}`,
        buildProductoFormData(payload, imagen));
    }
    return put<{ message: string; data: ProductoProv }>(`/productos/${id}`, payload);
  },

  eliminarProducto: (id: number) =>
    del<{ message: string }>(`/productos/${id}`),

  /** PATCH /productos/{id}/toggle — alterna activo/inactivo */
  toggleProducto: (id: number) =>
    patch<{ message: string; data: ProductoProv }>(`/productos/${id}/toggle`),

  /**
   * Sube UNA imagen a la galería del producto.
   * Multipart: campo `imagen` (file), `alt_text` (opcional), `orden` (opcional).
   */
  subirImagenGaleria: async (id: number, archivo: File, opts?: { alt_text?: string; orden?: number }) => {
    const fd = new FormData();
    fd.append('imagen', archivo);
    if (opts?.alt_text) fd.append('alt_text', opts.alt_text);
    if (typeof opts?.orden === 'number') fd.append('orden', String(opts.orden));
    return multipartConToken<{ data: ProductoImagenGaleria }>('POST',
      `/productos/${id}/imagenes`, fd);
  },

  /** DELETE /productos/{id}/imagenes/{imgId} */
  eliminarImagenGaleria: (id: number, imgId: number) =>
    del<{ message: string }>(`/productos/${id}/imagenes/${imgId}`),

  // ── Alias legacy (se mantiene para no romper código viejo) ───────────────
  /** @deprecated usar subirImagenGaleria (1 archivo) */
  subirImagenes: async (id: number, archivos: File[]) => {
    const results = await Promise.all(archivos.map(f =>
      proveedorApi.subirImagenGaleria(id, f),
    ));
    return { message: 'OK', data: results.map(r => r.data) };
  },
  /** @deprecated la imagen principal va dentro de crearProducto/editarProducto */
  subirImagenPrincipal: async (id: number, archivo: File) => {
    return proveedorApi.editarProducto(id, {}, archivo);
  },

  // ── Pedidos (API_MARKET_PROVEEDOR_PEDIDOS §3-§7) ─────────────────────────
  /**
   * Listado paginado. Devuelve `stats` agregado (no calcular en cliente).
   * Filtros: tab (vista), estado, buscar.
   */
  pedidos: (p?: ListarPedidosParams) =>
    get<{ data: PedidoProv[]; meta: Paginacion; stats: PedidosStatsProv }>(
      '/pedidos', p as Record<string, unknown>),

  /** Detalle por código (PED-001). Incluye items, historial y acciones_disponibles. */
  pedido: (codigo: string) =>
    get<{ data: PedidoProv }>(`/pedidos/${codigo}`),

  /**
   * Cambia el estado de un pedido. La máquina de estados la valida el backend.
   * Acepta también `prioridad`, `estado_pago`, `numero_guia`, `fecha_entrega_estimada`
   * para actualizarlos en el mismo request.
   * Error 409 con `code: TRANSICION_INVALIDA` si la transición no es válida.
   */
  cambiarEstadoPedido: (
    codigo: string,
    payload: CambiarEstadoPedidoPayload | EstadoPedidoProv,
    comentario?: string,
  ) => {
    // Compatibilidad: si se pasó solo el estado (firma vieja), envolverlo.
    const body: CambiarEstadoPedidoPayload = typeof payload === 'string'
      ? { estado: payload, comentario }
      : payload;
    return put<{ message: string; data: PedidoProv }>(
      `/pedidos/${codigo}/estado`,
      body,
    );
  },

  /**
   * Descarga la factura PDF del pedido. Devuelve un Blob para hacer
   * `URL.createObjectURL()` y forzar download.
   */
  descargarFactura: async (codigo: string): Promise<Blob> => {
    const res = await fetchConToken(
      `${BASE}/pedidos/${codigo}/factura`,
      tkn(),
      { method: 'GET' },
    );
    if (!res.ok) {
      let msg = `Error ${res.status}`;
      try { const j = await res.json(); msg = j?.message ?? msg; } catch { /* no json */ }
      const err: any = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return res.blob();
  },

  /**
   * Exportar pedidos a Excel (.xlsx). Acepta los mismos filtros del listado.
   * Máximo 1000 pedidos por exportación.
   */
  exportarPedidos: async (p?: ListarPedidosParams): Promise<Blob> => {
    const q = toQuery(p as Record<string, unknown>);
    const res = await fetchConToken(
      `${BASE}/pedidos/exportar${q}`,
      tkn(),
      { method: 'GET' },
    );
    if (!res.ok) {
      let msg = `Error ${res.status}`;
      try { const j = await res.json(); msg = j?.message ?? msg; } catch { /* no json */ }
      const err: any = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return res.blob();
  },

  // ── Catálogos auxiliares (para forms) ────────────────────────────────────
  /** @deprecated usar wizardInitProductos() que trae categorias + unidades en 1 call */
  categorias: () =>
    requestConToken<{ data: CategoriaRefProv[] }>(
      `/api/v1/tenant/market/categorias`,
      { method: 'GET' },
      tkn(),
    ),

  unidadesMedida: () =>
    get<{ data: UnidadMedidaProv[] }>('/unidades-medida'),
};

// ─── Códigos de error ────────────────────────────────────────────────────────

export const ProveedorErrorCodes = {
  // Auth / acceso
  PROVEEDOR_NOT_SELECTED: 'PROVEEDOR_NOT_SELECTED',
  PROVEEDOR_NOT_FOUND: 'PROVEEDOR_NOT_FOUND',
  PROVEEDOR_INACTIVE: 'PROVEEDOR_INACTIVE',
  PROVEEDOR_ACCESS_DENIED: 'PROVEEDOR_ACCESS_DENIED',
  PROVEEDOR_INACTIVO: 'PROVEEDOR_INACTIVO',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  // Productos
  PRODUCTO_NOT_FOUND: 'PRODUCTO_NOT_FOUND',
  PRODUCTO_CON_ORDENES_ACTIVAS: 'PRODUCTO_CON_ORDENES_ACTIVAS',
  PRODUCTO_CON_PEDIDOS: 'PRODUCTO_CON_PEDIDOS',
  IMAGEN_NOT_FOUND: 'IMAGEN_NOT_FOUND',
  // Pedidos
  PEDIDO_NOT_FOUND: 'PEDIDO_NOT_FOUND',
  TRANSICION_INVALIDA: 'TRANSICION_INVALIDA',
  IMAGEN_INVALIDA: 'IMAGEN_INVALIDA',
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

export { buildImagenUrl } from './market';

/**
 * Dispara la descarga de un Blob en el navegador con un nombre dado.
 * Útil para los endpoints `factura` y `exportar` del portal proveedor.
 */
export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberar memoria; pequeño delay para que Safari/Firefox alcancen a iniciar.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Transiciones permitidas por estado actual (para deshabilitar botones inválidos). */
export const TRANSICIONES_VALIDAS: Record<EstadoPedidoProv, EstadoPedidoProv[]> = {
  pendiente:   ['confirmado', 'cancelado'],
  confirmado:  ['preparando', 'cancelado'],
  preparando:  ['en_transito', 'cancelado'],
  en_transito: ['entregado', 'cancelado'],
  entregado:   [],
  cancelado:   [],
};
