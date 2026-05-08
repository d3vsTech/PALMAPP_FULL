/**
 * api/proveedor.ts
 * Cliente del lado proveedor del módulo Market — alineado a docs/MARKET_MODULE.md §12.
 * Base: /api/v1/market/proveedor
 * Auth: Authorization Bearer (sin X-Tenant-Id, el proveedor se infiere del JWT vía middleware SetProveedor).
 */
import { requestConToken, fetchConToken } from './request';

const BASE = '/api/v1/market/proveedor';

function tkn() { return localStorage.getItem('palmapp_token'); }

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

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EstadoPedidoProv =
  | 'pendiente' | 'confirmado' | 'preparando' | 'en_transito' | 'entregado' | 'cancelado';

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

export interface TenantRefProv {
  id: number;
  nombre: string;
  ciudad?: string | null;
  email?: string | null;
  telefono?: string | null;
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
  items: PedidoItemProv[];
  historial?: PedidoEstadoHistorialProv[];
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
  destacado?: boolean;
  page?: number;
  per_page?: number;
}

export interface ListarPedidosParams {
  estado?: EstadoPedidoProv;
  page?: number;
  per_page?: number;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const proveedorApi = {
  // ── Dashboard ────────────────────────────────────────────────────────────
  dashboard: () =>
    get<{ data: DashboardProv }>('/dashboard'),

  // ── Productos (CRUD) ─────────────────────────────────────────────────────
  productos: (p?: ListarProductosParams) =>
    get<{ data: ProductoProv[]; meta: Paginacion }>('/productos', p as Record<string, unknown>),

  producto: (id: number) =>
    get<{ data: ProductoProv }>(`/productos/${id}`),

  crearProducto: (payload: ProductoCreatePayload) =>
    post<{ message: string; data: ProductoProv }>('/productos', payload),

  editarProducto: (id: number, payload: ProductoUpdatePayload) =>
    put<{ message: string; data: ProductoProv }>(`/productos/${id}`, payload),

  eliminarProducto: (id: number) =>
    del<{ message: string }>(`/productos/${id}`),

  /**
   * Sube imágenes adicionales a la galería del producto.
   * Multipart con campo `imagenes[]` (array de archivos).
   */
  subirImagenes: async (id: number, archivos: File[]) => {
    const fd = new FormData();
    archivos.forEach((f) => fd.append('imagenes[]', f));
    const res = await fetchConToken(
      `${BASE}/productos/${id}/imagenes`,
      tkn(),
      { method: 'POST', body: fd },
    );
    if (!res.ok) {
      let msg = 'Error al subir imágenes';
      try { const j = await res.json(); msg = j.message ?? msg; } catch {}
      throw new Error(msg);
    }
    return res.json() as Promise<{ message: string; data: ProductoImagenProv[] }>;
  },

  /**
   * Sube/reemplaza la imagen principal del producto.
   * Multipart con campo `imagen`.
   */
  subirImagenPrincipal: async (id: number, archivo: File) => {
    const fd = new FormData();
    fd.append('imagen', archivo);
    const res = await fetchConToken(
      `${BASE}/productos/${id}/imagen-principal`,
      tkn(),
      { method: 'POST', body: fd },
    );
    if (!res.ok) {
      let msg = 'Error al subir imagen principal';
      try { const j = await res.json(); msg = j.message ?? msg; } catch {}
      throw new Error(msg);
    }
    return res.json() as Promise<{ message: string; data: ProductoProv }>;
  },

  // ── Pedidos ──────────────────────────────────────────────────────────────
  pedidos: (p?: ListarPedidosParams) =>
    get<{ data: PedidoProv[]; meta: Paginacion }>('/pedidos', p as Record<string, unknown>),

  pedido: (codigo: string) =>
    get<{ data: PedidoProv }>(`/pedidos/${codigo}`),

  /**
   * Cambia el estado de un pedido. Acepta cualquier transición válida del modelo.
   * El backend registra entrada en market_pedido_estados_historial.
   */
  cambiarEstadoPedido: (codigo: string, estado: EstadoPedidoProv, comentario?: string) =>
    put<{ message: string; data: PedidoProv }>(
      `/pedidos/${codigo}/estado`,
      { estado, comentario },
    ),

  // ── Catálogos auxiliares (para forms) ────────────────────────────────────
  categorias: () =>
    requestConToken<{ data: CategoriaRefProv[] }>(
      `/api/v1/tenant/market/categorias`, // mismo endpoint público; el JWT vale
      { method: 'GET' },
      tkn(),
    ),

  unidadesMedida: () =>
    get<{ data: UnidadMedidaProv[] }>('/unidades-medida'),
};

// ─── Códigos de error ────────────────────────────────────────────────────────

export const ProveedorErrorCodes = {
  PROVEEDOR_INACTIVO: 'PROVEEDOR_INACTIVO',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PRODUCTO_NOT_FOUND: 'PRODUCTO_NOT_FOUND',
  PRODUCTO_CON_PEDIDOS: 'PRODUCTO_CON_PEDIDOS',
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

/** Transiciones permitidas por estado actual (para deshabilitar botones inválidos). */
export const TRANSICIONES_VALIDAS: Record<EstadoPedidoProv, EstadoPedidoProv[]> = {
  pendiente:   ['confirmado', 'cancelado'],
  confirmado:  ['preparando', 'cancelado'],
  preparando:  ['en_transito', 'cancelado'],
  en_transito: ['entregado', 'cancelado'],
  entregado:   [],
  cancelado:   [],
};
