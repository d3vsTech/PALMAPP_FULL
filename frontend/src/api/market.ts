/**
 * api/market.ts
 * Módulo Market B2B (lado finca/tenant) — alineado a docs/API_MARKET.md
 * Base: /api/v1/tenant/market
 * Headers: Authorization Bearer + X-Tenant-Id
 */
import { requestConToken } from './request';

const BASE = '/api/v1/tenant/market';

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

export type EstadoPedido =
  | 'pendiente' | 'confirmado' | 'preparando' | 'en_transito' | 'entregado' | 'cancelado';

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono: string | null;
  orden: number;
  productos_count: number;
}

export interface PrecioVolumen {
  cantidad_minima: number;
  precio_unidad: string | number;
  activo?: boolean;
}

export interface UnidadMedida {
  id: number;
  codigo?: string;
  nombre?: string;
  abreviatura: string;
}

export interface ProveedorRef {
  id: number;
  nombre_empresa: string;
  nit?: string;
  email?: string;
  ciudad?: string;
  calificacion_promedio?: string | number;
}

export interface CategoriaRef {
  id: number;
  nombre: string;
  slug: string;
}

export interface ProductoImagen {
  id?: number;
  url: string;
  orden?: number;
  alt_text?: string | null;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  sku?: string;
  imagen_principal?: string | null;
  precio_unitario: string | number;
  stock_disponible: number;
  stock_minimo?: number;
  stock_bajo: boolean;
  calificacion_promedio?: string | number;
  total_resenas?: number;
  destacado?: boolean;
  estado: 'activo' | 'inactivo';
  proveedor: ProveedorRef;
  categoria: CategoriaRef;
  unidad_medida: UnidadMedida;
  precios_volumen?: PrecioVolumen[];
  especificaciones?: Record<string, any> | null;
  imagenes?: ProductoImagen[];
}

export interface ListadoParams {
  categoria_id?: number;
  categoria_slug?: string;
  buscar?: string;
  ordenar?: 'precio_asc' | 'precio_desc';
  destacados?: boolean;
  page?: number;
}

export interface Paginacion {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * Producto embebido en el item del carrito (subset de Producto).
 * Según API_MARKET §4.1: solo trae los campos necesarios para el carrito.
 */
export interface CarritoItemProducto {
  id: number;
  nombre: string;
  sku?: string;
  imagen_principal?: string | null;
  estado: 'activo' | 'inactivo';
  stock_disponible: number;
  stock_bajo?: boolean;
  unidad_medida: UnidadMedida;
  proveedor: { id: number; nombre_empresa: string };
  precios_volumen?: PrecioVolumen[];
}

export interface CarritoItem {
  id: number;
  producto: CarritoItemProducto;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface CarritoResumen {
  subtotal: number;
  costo_envio: number;
  total: number;
  cantidad_items: number;
}

export interface Carrito {
  id: number;
  items: CarritoItem[];
  resumen: CarritoResumen;
}

export interface PedidoItem {
  id: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: string | number;
  subtotal: string | number;
  descuento?: string | number;
  producto?: { id: number; nombre: string; imagen_principal?: string | null };
}

export interface PedidoHistorial {
  id: number;
  estado_anterior: EstadoPedido | null;
  estado_nuevo: EstadoPedido;
  comentario?: string | null;
  fecha_cambio: string;
  user?: { id: number; name: string };
}

export interface Pedido {
  id: number;
  codigo: string;
  estado: EstadoPedido;
  subtotal: string | number;
  costo_envio: string | number;
  total: string | number;
  metodo_pago?: string | null;
  direccion_entrega?: string | null;
  notas?: string | null;
  fecha_pedido: string;
  fecha_entrega_estimada?: string | null;
  fecha_entrega_real?: string | null;
  proveedor: ProveedorRef;
  items: PedidoItem[];
  historial?: PedidoHistorial[];
}

export interface PedidoStats {
  pedidos_activos: number;
  pedidos_entregados: number;
  total_gastado: number;
}

export interface CheckoutPayload {
  notas?: string;
  metodo_pago?: string;
  direccion_entrega?: string;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const marketApi = {
  // ── Catálogo ─────────────────────────────────────────────────────────────
  categorias: () =>
    get<{ data: Categoria[] }>('/categorias'),

  productos: (p?: ListadoParams) =>
    get<{ data: Producto[]; meta: Paginacion }>('/productos', p as Record<string, unknown>),

  producto: (id: number) =>
    get<{ data: Producto }>(`/productos/${id}`),

  // ── Carrito ──────────────────────────────────────────────────────────────
  carrito: () =>
    get<{ data: Carrito }>('/carrito'),

  agregarItem: (producto_id: number, cantidad: number) =>
    post<{ message: string; data: CarritoItem }>('/carrito/items', { producto_id, cantidad }),

  actualizarCantidad: (itemId: number, cantidad: number) =>
    put<{ message: string; data: CarritoItem }>(`/carrito/items/${itemId}`, { cantidad }),

  eliminarItem: (itemId: number) =>
    del<{ message: string }>(`/carrito/items/${itemId}`),

  vaciarCarrito: () =>
    del<{ message: string }>('/carrito'),

  // ── Pedidos ──────────────────────────────────────────────────────────────
  /**
   * Checkout — crea uno o varios pedidos (uno por proveedor) desde el carrito.
   * Multi-proveedor: si el carrito tiene productos de N proveedores, devuelve N pedidos.
   */
  checkout: (payload?: CheckoutPayload) =>
    post<{ message: string; total_pedidos: number; data: Pedido[] }>(
      '/pedidos',
      payload ?? {},
    ),

  pedidos: (p?: { estado?: EstadoPedido; page?: number }) =>
    get<{ stats: PedidoStats; data: Pedido[]; meta: Paginacion }>(
      '/pedidos',
      p as Record<string, unknown>,
    ),

  pedido: (codigo: string) =>
    get<{ data: Pedido }>(`/pedidos/${codigo}`),
};

// ─── Códigos de error ────────────────────────────────────────────────────────

export const MarketErrorCodes = {
  MODULE_DISABLED: 'MODULE_DISABLED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TENANT_REQUIRED: 'TENANT_REQUIRED',
  PRODUCTO_NOT_FOUND: 'PRODUCTO_NOT_FOUND',
  PRODUCTO_NO_ACTIVO: 'PRODUCTO_NO_ACTIVO',
  PROVEEDOR_INACTIVO: 'PROVEEDOR_INACTIVO',
  SIN_STOCK: 'SIN_STOCK',
  PRODUCTO_SIN_PRECIO: 'PRODUCTO_SIN_PRECIO',
  CARRITO_ITEM_NOT_FOUND: 'CARRITO_ITEM_NOT_FOUND',
  CARRITO_VACIO: 'CARRITO_VACIO',
  STOCK_INSUFICIENTE: 'STOCK_INSUFICIENTE',
  STOCK_INSUFICIENTE_CONCURRENTE: 'STOCK_INSUFICIENTE_CONCURRENTE',
  PEDIDO_NOT_FOUND: 'PEDIDO_NOT_FOUND',
} as const;

// ─── Utilidades ──────────────────────────────────────────────────────────────

export function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

// Host raíz del backend (sin /api) para componer URLs de imágenes de productos.
const _API_BASE = (
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ??
  'https://31.97.7.50:3000/api'
).replace(/\/+$/, '');
const _FILES_BASE = _API_BASE.replace(/\/api\/?$/, '');

/**
 * Convierte una ruta relativa de imagen del backend (ej. /assets/images/products/AGRO-001.jpg)
 * en URL absoluta. Si ya viene completa o es data URL, la devuelve tal cual.
 */
export function buildImagenUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('data:')) return path;
  const norm = path.startsWith('/') ? path : `/${path}`;
  return `${_FILES_BASE}${norm}`;
}

export const ESTADO_PEDIDO_LABEL: Record<EstadoPedido, { label: string; color: string }> = {
  pendiente:   { label: 'Pendiente',       color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  confirmado:  { label: 'Confirmado',      color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  preparando:  { label: 'En Preparación',  color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  en_transito: { label: 'En Camino',       color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' },
  entregado:   { label: 'Entregado',       color: 'bg-success/10 text-success border-success/30' },
  cancelado:   { label: 'Cancelado',       color: 'bg-destructive/10 text-destructive border-destructive/30' },
};
