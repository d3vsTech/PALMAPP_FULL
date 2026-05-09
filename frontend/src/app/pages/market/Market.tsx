import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  ShoppingCart, Search, Star, Package, Grid3x3, List, Plus,
  Sprout, Droplet, Wrench, Cog, Apple, ShieldCheck,
  ChevronLeft, ChevronRight, Minus, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  marketApi, toNumber, buildImagenUrl,
  type Categoria, type Producto, type ListadoParams,
} from '../../../api/market';

// Mapeo de íconos por slug/nombre de categoría
const ICONOS_CATEGORIA: Record<string, any> = {
  todas: Package,
  fertilizantes: Sprout,
  agroquimicos: Droplet,
  herramientas: Wrench,
  maquinaria: Cog,
  insumos: Apple,
  semillas: Sprout,
  equipos: ShieldCheck,
};

function getIconoCategoria(slug: string): any {
  const key = slug.toLowerCase().replace(/[áéíóúñ]/g, (c) => ({
    á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n',
  }[c] || c));
  return ICONOS_CATEGORIA[key] ?? Package;
}

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

  const [indiceCarrusel, setIndiceCarrusel] = useState(0);

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

  const categoriasVisibles = 5;
  const categoriasMostradas = categoriasConTodas.slice(indiceCarrusel, indiceCarrusel + categoriasVisibles);
  const puedeIrAtras = indiceCarrusel > 0;
  const puedeIrAdelante = indiceCarrusel + categoriasVisibles < categoriasConTodas.length;

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Market</h1>
          <p className="text-muted-foreground mt-2">
            Compra insumos y equipos para tu plantación
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/market/pedidos')}
            className="gap-2"
          >
            <Package className="h-5 w-5" />
            Mis Pedidos
          </Button>
          <Button
            onClick={() => navigate('/market/carrito')}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 relative"
          >
            <ShoppingCart className="h-5 w-5" />
            Carrito
            {cantidadCarrito > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-white text-xs font-bold border-2 border-background">
                {cantidadCarrito}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Categorías */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Categorías</h2>
        {cargandoCats ? (
          <div className="flex items-center gap-2 text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando categorías...
          </div>
        ) : (
          <div className="relative">
            {puedeIrAtras && (
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg bg-background"
                onClick={() => setIndiceCarrusel(Math.max(0, indiceCarrusel - 1))}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}

            <div className="px-12">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {categoriasMostradas.map((cat) => {
                  const Icon = getIconoCategoria(cat.slug);
                  const isSelected = categoriaSlug === cat.slug;
                  return (
                    <Card
                      key={cat.slug}
                      className={`cursor-pointer transition-all duration-300 border-2 ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-lg'
                          : 'border-border hover:border-primary/50 hover:shadow-md'
                      }`}
                      onClick={() => setCategoriaSlug(cat.slug)}
                    >
                      <CardContent className="p-4 flex flex-col items-center justify-center gap-3">
                        <div
                          className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-primary/20' : 'bg-muted'
                          }`}
                        >
                          <Icon
                            className={`h-7 w-7 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                          />
                        </div>
                        <p
                          className={`text-sm font-medium text-center leading-tight ${
                            isSelected ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {cat.nombre}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {puedeIrAdelante && (
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg bg-background"
                onClick={() => setIndiceCarrusel(indiceCarrusel + 1)}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filtros y búsqueda */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2 lg:col-span-2">
                <Label>Buscar producto</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre o descripción..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ordenar por precio</Label>
                <Select value={ordenPrecio} onValueChange={(val: any) => setOrdenPrecio(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin ordenar</SelectItem>
                    <SelectItem value="precio_asc">Menor a mayor</SelectItem>
                    <SelectItem value="precio_desc">Mayor a menor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium text-foreground">{productos.length}</span> productos
                {meta && meta.total > productos.length && ` de ${meta.total}`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant={vistaGrid ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVistaGrid(true)}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={!vistaGrid ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVistaGrid(false)}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catálogo */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Catálogo</h2>

        {cargandoProds ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando productos...
          </div>
        ) : productos.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay productos</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                No se encontraron productos con los filtros seleccionados
              </p>
            </CardContent>
          </Card>
        ) : vistaGrid ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productos.map((producto) => {
              const precio = toNumber(producto.precio_unitario);
              const rating = Number(producto.calificacion_promedio ?? 0);
              return (
                <Card
                  key={producto.id}
                  id={`prod-${producto.id}`}
                  className="glass-subtle border-border hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer scroll-mt-24"
                  onClick={() => verProducto(producto.id)}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {producto.imagen_principal ? (
                      <img
                        src={buildImagenUrl(producto.imagen_principal)}
                        alt={producto.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Package className="h-16 w-16 text-primary/30" />
                      </div>
                    )}
                    {producto.stock_bajo && (
                      <Badge className="absolute top-2 right-2 bg-amber-500">Stock bajo</Badge>
                    )}
                    {producto.destacado && (
                      <Badge className="absolute top-2 left-2 bg-primary">Destacado</Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {producto.nombre}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {producto.descripcion}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.floor(rating > 0 ? rating : 5)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                        {rating > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({rating.toFixed(1)})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">{producto.proveedor.nombre_empresa}</p>
                          <p className="text-lg font-bold text-success">
                            ${precio.toLocaleString('es-CO')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            por {producto.unidad_medida.abreviatura}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModalProducto(producto);
                          }}
                          className="w-full gap-2"
                          size="sm"
                          disabled={producto.stock_disponible <= 0}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {productos.map((producto) => {
              const precio = toNumber(producto.precio_unitario);
              const rating = Number(producto.calificacion_promedio ?? 0);
              return (
                <Card
                  key={producto.id}
                  id={`prod-${producto.id}`}
                  className="glass-subtle border-border hover:shadow-lg transition-all duration-300 cursor-pointer scroll-mt-24"
                  onClick={() => verProducto(producto.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {producto.imagen_principal ? (
                          <img src={buildImagenUrl(producto.imagen_principal)} alt={producto.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-12 w-12 text-primary/30" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-foreground hover:text-primary transition-colors">
                              {producto.nombre}
                            </h3>
                            <p className="text-sm text-muted-foreground">{producto.descripcion}</p>
                          </div>
                          {producto.stock_bajo && <Badge className="bg-amber-500">Stock bajo</Badge>}
                        </div>

                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < Math.floor(rating > 0 ? rating : 5)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted'
                              }`}
                            />
                          ))}
                          {rating > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({rating.toFixed(1)})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant="outline">{producto.categoria.nombre}</Badge>
                            <p className="text-sm text-muted-foreground mt-1">{producto.proveedor.nombre_empresa}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-success">
                              ${precio.toLocaleString('es-CO')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              por {producto.unidad_medida.abreviatura}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              verProducto(producto.id);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Ver detalles
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirModalProducto(producto);
                            }}
                            size="sm"
                            className="gap-2"
                            disabled={producto.stock_disponible <= 0}
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Agregar al carrito
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between pt-6">
            <p className="text-sm text-muted-foreground">
              Página {meta.current_page} de {meta.last_page} · {meta.total} productos
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={meta.current_page === meta.last_page}
                className="gap-1"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de producto */}
      <Dialog open={modalAbierto} onOpenChange={(o) => !agregando && setModalAbierto(o)}>
        <DialogContent className="max-w-2xl">
          {productoSel && (() => {
            const precio = toNumber(productoSel.precio_unitario);
            const rating = Number(productoSel.calificacion_promedio ?? 0);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{productoSel.nombre}</DialogTitle>
                  <DialogDescription>{productoSel.proveedor.nombre_empresa}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {productoSel.imagen_principal ? (
                      <img
                        src={buildImagenUrl(productoSel.imagen_principal)}
                        alt={productoSel.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-24 w-24 text-primary/30" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Descripción</h3>
                    <p className="text-sm text-muted-foreground">{productoSel.descripcion}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(rating > 0 ? rating : 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-muted-foreground ml-2">
                        {rating > 0 ? rating.toFixed(1) : 'Sin reseñas'}
                      </span>
                    </div>
                    <Badge variant="outline">Stock: {productoSel.stock_disponible}</Badge>
                  </div>

                  <Card className="border-primary bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Precio unitario</p>
                          <p className="text-2xl font-bold text-success">
                            ${precio.toLocaleString('es-CO')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            por {productoSel.unidad_medida.abreviatura}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <Label className="mb-3 block">Cantidad</Label>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCantidadModal(Math.max(1, cantidadModal - 1))}
                        disabled={cantidadModal <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        max={productoSel.stock_disponible}
                        value={cantidadModal}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setCantidadModal(Math.min(productoSel.stock_disponible, Math.max(1, val)));
                        }}
                        className="w-24 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCantidadModal(Math.min(productoSel.stock_disponible, cantidadModal + 1))}
                        disabled={cantidadModal >= productoSel.stock_disponible}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Card className="border-success bg-success/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total a agregar</p>
                          <p className="text-sm text-muted-foreground">
                            {cantidadModal} × ${precio.toLocaleString('es-CO')}
                          </p>
                        </div>
                        <p className="text-3xl font-bold text-success">
                          ${(precio * cantidadModal).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={cerrarModal} className="flex-1" disabled={agregando}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={agregarAlCarrito}
                      className="flex-1 gap-2"
                      disabled={agregando}
                    >
                      {agregando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                      Agregar al Carrito
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}
