import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  ShoppingCart, Search, Package, LayoutGrid, List, Plus,
  ChevronLeft, ChevronRight, ArrowRight, Loader2,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { ProductoCard, ProductoFoto, Calificacion, CantidadInput } from '../../components/market/piezas';
import { cop } from '../../lib/formato';
import { cn } from '../../components/lib/utils';
import { toast } from 'sonner';
import {
  marketApi, toNumber, buildImagenUrl,
  type Categoria, type Producto, type ListadoParams,
} from '../../../api/market';

export default function Market() {
  const navigate = useNavigate();

  // ── Filtros y paginación sincronizados con la URL ────────────────────────
  // Esto permite que al volver desde el detalle del producto (back del browser
  // o navigate(-1)) la lista regrese a la misma página/filtro que estaba.
  const [searchParams, setSearchParams] = useSearchParams();

  const categoriaSlug = searchParams.get('categoria') ?? 'todas';
  const busqueda      = searchParams.get('buscar') ?? '';
  const ordenPrecio   = (searchParams.get('orden') ?? 'none') as 'precio_asc' | 'precio_desc' | 'none';
  const vistaGrid     = searchParams.get('vista') !== 'list';
  const page          = parseInt(searchParams.get('page') ?? '1', 10) || 1;

  /** Helper: actualiza un sub-conjunto de params. Pasar `null` borra la key. */
  const updateParams = (
    patch: Record<string, string | number | null | undefined>,
    opts?: { resetPage?: boolean },
  ) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '') next.delete(k);
        else next.set(k, String(v));
      });
      if (opts?.resetPage) next.delete('page');
      return next;
    }, { replace: true });
  };

  const setCategoriaSlug = (slug: string) =>
    updateParams({ categoria: slug === 'todas' ? null : slug }, { resetPage: true });
  const setBusqueda = (v: string) =>
    updateParams({ buscar: v || null }, { resetPage: true });
  const setOrdenPrecio = (v: 'precio_asc' | 'precio_desc' | 'none') =>
    updateParams({ orden: v === 'none' ? null : v }, { resetPage: true });
  const setVistaGrid = (grid: boolean) =>
    updateParams({ vista: grid ? null : 'list' });
  const setPage = (next: number | ((p: number) => number)) => {
    const value = typeof next === 'function' ? (next as (p: number) => number)(page) : next;
    updateParams({ page: value <= 1 ? null : value });
  };

  // ── Datos ────────────────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [cargandoCats, setCargandoCats] = useState(true);
  const [cargandoProds, setCargandoProds] = useState(true);
  const [cantidadCarrito, setCantidadCarrito] = useState(0);

  // ── Modal de producto ────────────────────────────────────────────────────
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSel, setProductoSel] = useState<Producto | null>(null);
  const [cantidadModal, setCantidadModal] = useState(1);
  const [agregando, setAgregando] = useState(false);

  // Carga inicial: categorías + carrito
  useEffect(() => {
    setCargandoCats(true);
    marketApi.categorias()
      .then((res) => setCategorias(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'Error al cargar categorías'))
      .finally(() => setCargandoCats(false));

    marketApi.carrito()
      .then((res) => setCantidadCarrito(res.data.resumen.cantidad_items))
      .catch(() => {});
  }, []);

  // Carga de productos al cambiar filtros
  useEffect(() => {
    setCargandoProds(true);
    const params: ListadoParams = { page };
    if (categoriaSlug !== 'todas') params.categoria_slug = categoriaSlug;
    if (busqueda.trim()) params.buscar = busqueda.trim();
    if (ordenPrecio !== 'none') params.ordenar = ordenPrecio;

    const t = setTimeout(() => {
      marketApi.productos(params)
        .then((res) => {
          setProductos(res.data);
          setMeta(res.meta);
        })
        .catch((e: any) => toast.error(e?.message ?? 'Error al cargar productos'))
        .finally(() => setCargandoProds(false));
    }, busqueda ? 350 : 0);

    return () => clearTimeout(t);
  }, [categoriaSlug, busqueda, ordenPrecio, page]);

  // Al volver del detalle (back del browser), si la URL trae `#prod-123`
  // hacemos scroll al card de ese producto.
  useEffect(() => {
    if (cargandoProds || productos.length === 0) return;
    const hash = window.location.hash;
    if (!hash.startsWith('#prod-')) return;
    // Esperar al próximo frame para asegurar que las cards ya se renderizaron.
    requestAnimationFrame(() => {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [cargandoProds, productos]);

  /**
   * Navegar al detalle de un producto guardando el ancla en la URL actual,
   * para que `navigate(-1)` restaure scroll exacto a esa card.
   */
  const verProducto = (productoId: number) => {
    const url = new URL(window.location.href);
    url.hash = `prod-${productoId}`;
    window.history.replaceState(window.history.state, '', url.toString());
    navigate(`/market/productos/${productoId}`);
  };

  // Construir lista de "categorías visibles" con "Todas" incluida
  const categoriasConTodas = useMemo(() => {
    const todasCat = { id: 0, nombre: 'Todas', slug: 'todas', icono: 'todas', orden: -1, productos_count: meta?.total ?? 0 };
    return [todasCat, ...categorias];
  }, [categorias, meta]);

  /** Deja el catálogo sin filtros desde el estado vacío. */
  const limpiarFiltros = () =>
    updateParams({ buscar: null, categoria: null }, { resetPage: true });

  const abrirModalProducto = (producto: Producto) => {
    setProductoSel(producto);
    setCantidadModal(1);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setProductoSel(null);
    setCantidadModal(1);
  };

  const agregarAlCarrito = async () => {
    if (!productoSel) return;
    if (cantidadModal > productoSel.stock_disponible) {
      toast.error(`Solo hay ${productoSel.stock_disponible} disponibles`);
      return;
    }
    setAgregando(true);
    try {
      await marketApi.agregarItem(productoSel.id, cantidadModal);
      toast.success(`${cantidadModal} × ${productoSel.nombre} agregado al carrito`);
      // Actualizar contador
      const c = await marketApi.carrito();
      setCantidadCarrito(c.data.resumen.cantidad_items);
      cerrarModal();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo agregar al carrito');
    } finally {
      setAgregando(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tienda de insumos"
        description="Compra insumos y equipos para tu plantación."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/market/pedidos')}>
              <Package strokeWidth={2} />
              Mis pedidos
            </Button>
            <Button onClick={() => navigate('/market/carrito')}>
              <ShoppingCart strokeWidth={2} />
              Carrito
              {cantidadCarrito > 0 && (
                <span className="ml-0.5 rounded-md bg-primary-foreground/20 px-1.5 text-xs font-semibold tabular-nums">
                  {cantidadCarrito}
                </span>
              )}
            </Button>
          </>
        }
      />

      {/* Categorías */}
      {cargandoCats ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          Cargando categorías...
        </p>
      ) : (
        <div
          role="tablist"
          aria-label="Categorías"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0"
        >
          {categoriasConTodas.map((cat) => {
            const activa = categoriaSlug === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setCategoriaSlug(cat.slug)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors',
                  activa
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {cat.nombre}
                {cat.productos_count !== undefined && cat.productos_count > 0 && (
                  <span className={cn('text-xs tabular-nums', activa ? 'text-primary/70' : 'text-muted-foreground/70')}>
                    {cat.productos_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Búsqueda, orden y vista */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <Input
            type="search"
            placeholder="Buscar por nombre o descripción"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
            aria-label="Buscar producto"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={ordenPrecio} onValueChange={(val: 'precio_asc' | 'precio_desc' | 'none') => setOrdenPrecio(val)}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Ordenar por precio">
              <SelectValue placeholder="Sin ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin ordenar</SelectItem>
              <SelectItem value="precio_asc">Precio: menor a mayor</SelectItem>
              <SelectItem value="precio_desc">Precio: mayor a menor</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex shrink-0 rounded-lg border border-border bg-card p-0.5">
            <button
              type="button"
              aria-label="Ver en cuadrícula"
              aria-pressed={vistaGrid}
              onClick={() => setVistaGrid(true)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                vistaGrid ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Ver en lista"
              aria-pressed={!vistaGrid}
              onClick={() => setVistaGrid(false)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                !vistaGrid ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {meta?.total ?? productos.length} {(meta?.total ?? productos.length) === 1 ? 'producto' : 'productos'}
      </p>

      {/* Catálogo */}
      {cargandoProds ? (
        <Card className="items-center py-14 text-center">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Cargando productos...
          </p>
        </Card>
      ) : productos.length === 0 ? (
        <Card className="items-center py-14 text-center">
          <div className="space-y-1">
            <h3>No hay productos</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Ningún producto coincide con la búsqueda o la categoría.
            </p>
          </div>
          {(busqueda || categoriaSlug !== 'todas') && (
            <Button variant="outline" onClick={limpiarFiltros}>Limpiar filtros</Button>
          )}
        </Card>
      ) : vistaGrid ? (
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {productos.map((producto) => (
            <ProductoCard
              key={producto.id}
              id={`prod-${producto.id}`}
              onAbrir={() => verProducto(producto.id)}
              nombre={producto.nombre}
              categoria={producto.categoria.nombre}
              imagen={producto.imagen_principal ? buildImagenUrl(producto.imagen_principal) : null}
              precio={toNumber(producto.precio_unitario)}
              unidad={producto.unidad_medida.abreviatura}
              stockBajo={producto.stock_bajo}
              rating={Number(producto.calificacion_promedio ?? 0)}
              subtitulo={producto.proveedor.nombre_empresa}
              marca={producto.destacado ? <Badge>Destacado</Badge> : undefined}
              accion={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={producto.stock_disponible <= 0}
                  onClick={() => abrirModalProducto(producto)}
                >
                  <Plus strokeWidth={2} />
                  Agregar
                </Button>
              }
            />
          ))}
        </div>
      ) : (
        <Card className="gap-0 overflow-hidden">
          <ul className="divide-y divide-border">
            {productos.map((producto) => (
              <li
                key={producto.id}
                id={`prod-${producto.id}`}
                className="flex scroll-mt-24 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5"
              >
                <ProductoFoto
                  categoria={producto.categoria.nombre}
                  src={producto.imagen_principal ? buildImagenUrl(producto.imagen_principal) : null}
                  alt={producto.nombre}
                  className="h-14 w-14 shrink-0"
                  iconClassName="h-5 w-5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => verProducto(producto.id)}
                      className="line-clamp-2 text-left font-semibold text-foreground hover:text-primary"
                    >
                      {producto.nombre}
                    </button>
                    {producto.stock_bajo && <Badge variant="warning">Stock bajo</Badge>}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{producto.descripcion}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{producto.proveedor.nombre_empresa}</span>
                    <span>{producto.categoria.nombre}</span>
                    {Number(producto.calificacion_promedio ?? 0) > 0 && (
                      <Calificacion valor={Number(producto.calificacion_promedio)} />
                    )}
                  </div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-heading text-lg font-bold tabular-nums text-foreground">
                    {cop(toNumber(producto.precio_unitario))}
                  </p>
                  <p className="text-xs text-muted-foreground">por {producto.unidad_medida.abreviatura}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={producto.stock_disponible <= 0}
                  onClick={() => abrirModalProducto(producto)}
                >
                  <Plus strokeWidth={2} />
                  <span className="hidden sm:inline">Agregar</span>
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Paginación */}
      {meta && meta.last_page > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {meta.current_page} de {meta.last_page} · {meta.total} productos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.current_page === 1}
            >
              <ChevronLeft strokeWidth={2} />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={meta.current_page === meta.last_page}
            >
              Siguiente
              <ChevronRight strokeWidth={2} />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de producto */}
      <Dialog open={modalAbierto} onOpenChange={(o) => !agregando && setModalAbierto(o)}>
        <DialogContent className="sm:max-w-lg">
          {productoSel && (() => {
            const precio = toNumber(productoSel.precio_unitario);
            const rating = Number(productoSel.calificacion_promedio ?? 0);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{productoSel.nombre}</DialogTitle>
                  <DialogDescription>{productoSel.proveedor.nombre_empresa}</DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                  <div className="flex gap-4">
                    <ProductoFoto
                      categoria={productoSel.categoria.nombre}
                      src={productoSel.imagen_principal ? buildImagenUrl(productoSel.imagen_principal) : null}
                      alt={productoSel.nombre}
                      className="h-20 w-20 shrink-0"
                    />
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-sm text-muted-foreground">{productoSel.descripcion}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {rating > 0 && <Calificacion valor={rating} />}
                        <Badge variant="secondary">{productoSel.stock_disponible} disponibles</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-4 rounded-lg bg-muted/60 px-4 py-3">
                    <div>
                      <p className="text-[13px] font-medium text-muted-foreground">Precio unitario</p>
                      <p className="font-heading text-lg font-bold tabular-nums">{cop(precio)}</p>
                      <p className="text-xs text-muted-foreground">por {productoSel.unidad_medida.abreviatura}</p>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <Label className="block text-xs text-muted-foreground">Cantidad</Label>
                      <CantidadInput
                        value={cantidadModal}
                        onChange={setCantidadModal}
                        max={productoSel.stock_disponible}
                        disabled={agregando}
                      />
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between border-t border-border pt-4">
                    <span className="text-sm text-muted-foreground">
                      Total ({cantidadModal} × {cop(precio)})
                    </span>
                    <span className="text-2xl font-bold">{cop(precio * cantidadModal)}</span>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={cerrarModal} disabled={agregando}>Cancelar</Button>
                  <Button onClick={agregarAlCarrito} disabled={agregando}>
                    {agregando
                      ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                      : <ShoppingCart strokeWidth={2} />}
                    Agregar al carrito
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Espacio para que la barra del carrito no tape los últimos productos */}
      {cantidadCarrito > 0 && <div className="h-20" aria-hidden />}

      {/* Barra del carrito */}
      {cantidadCarrito > 0 && (
        <div className="fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-2 pl-4 shadow-md sm:inset-x-auto sm:right-6 lg:bottom-6">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{cantidadCarrito}</span>{' '}
            {cantidadCarrito === 1 ? 'unidad' : 'unidades'} en el carrito
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/market/carrito')}>Ver carrito</Button>
            <Button size="sm" onClick={() => navigate('/market/checkout')}>
              Ir a pagar
              <ArrowRight strokeWidth={2} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
