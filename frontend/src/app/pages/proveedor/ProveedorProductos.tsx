import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Eye, Loader2, Package, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import EmptyState from '../../components/common/EmptyState';
import {
  proveedorApi, toNumber, buildImagenUrl, ProveedorErrorCodes,
  type ProductoProv, type CategoriaRefProv, type ListarProductosParams,
  type ProductosStats,
} from '../../../api/proveedor';
import { cop, num } from '../../lib/formato';

type EstadoFiltro = 'todos' | 'activo' | 'inactivo';

export default function ProveedorProductos() {
  const [productos, setProductos] = useState<ProductoProv[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRefProv[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [stats, setStats] = useState<ProductosStats | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);

  const [productoAEliminar, setProductoAEliminar] = useState<ProductoProv | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /**
   * Si cambian filtros o página con una petición en vuelo, la respuesta vieja
   * no debe pisar a la nueva.
   */
  const reqIdRef = useRef(0);

  const cargar = () => {
    const reqId = ++reqIdRef.current;
    setCargando(true);
    const params: ListarProductosParams = { page: pagina };
    if (busqueda.trim()) params.buscar = busqueda.trim();
    if (categoriaFiltro !== 'todas') params.categoria_id = parseInt(categoriaFiltro);
    if (estadoFiltro !== 'todos') params.estado = estadoFiltro;

    proveedorApi.productos(params)
      .then((res) => {
        if (reqId !== reqIdRef.current) return;
        setProductos(res.data);
        setMeta(res.meta);
        if (res.stats) setStats(res.stats);
      })
      .catch((e) => {
        if (reqId !== reqIdRef.current) return;
        toast.error(e instanceof Error ? e.message : 'No se pudieron cargar los productos');
      })
      .finally(() => { if (reqId === reqIdRef.current) setCargando(false); });
  };

  useEffect(() => {
    // wizard-init trae categorías y unidades en una sola petición.
    proveedorApi.wizardInitProductos()
      .then((res) => setCategorias(res.data.categorias))
      .catch(() => { /* los filtros funcionan sin el catálogo */ });
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, categoriaFiltro, estadoFiltro, pagina]);

  const eliminar = async () => {
    if (!productoAEliminar) return;
    setEliminando(true);
    try {
      await proveedorApi.eliminarProducto(productoAEliminar.id);
      toast.success('Producto eliminado');
      setProductoAEliminar(null);
      cargar();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === ProveedorErrorCodes.PRODUCTO_CON_ORDENES_ACTIVAS
        || code === ProveedorErrorCodes.PRODUCTO_CON_PEDIDOS) {
        toast.error('No se puede eliminar: el producto tiene órdenes activas. Inactívalo en vez de eliminarlo.');
      } else {
        toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el producto');
      }
    } finally {
      setEliminando(false);
    }
  };

  /** Sin stock manda sobre el estado: es lo que impide vender. */
  const estadoDelProducto = (producto: ProductoProv) => {
    if (producto.stock_disponible === 0) return { label: 'Sin stock', variante: 'destructive' as const };
    if (producto.estado === 'inactivo') return { label: 'Inactivo', variante: 'secondary' as const };
    return { label: 'Activo', variante: 'success' as const };
  };

  const hayFiltros = busqueda.trim() !== '' || categoriaFiltro !== 'todas' || estadoFiltro !== 'todos';

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaFiltro('todas');
    setEstadoFiltro('todos');
    setPagina(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portal de proveedores"
        title="Mis productos"
        description="Tu catálogo publicado en el marketplace."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/proveedor/productos/carga-masiva">
                <Upload className="h-4 w-4" strokeWidth={2} />
                Carga masiva
              </Link>
            </Button>
            <Button asChild>
              <Link to="/proveedor/productos/nuevo">
                <Plus className="h-4 w-4" strokeWidth={2} />
                Nuevo producto
              </Link>
            </Button>
          </>
        }
      />

      {stats && (
        <StatStrip
          items={[
            { label: 'Productos publicados', value: num(meta?.total ?? 0), note: 'en tu catálogo' },
            { label: 'Activos', value: num(stats.total_activos) },
            { label: 'Inactivos', value: num(stats.total_inactivos) },
            { label: 'Sin stock', value: num(stats.total_sin_stock) },
          ]}
        />
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <Input
            aria-label="Buscar productos"
            placeholder="Buscar por nombre o referencia"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            className="pl-9"
          />
        </div>
        <Select value={categoriaFiltro} onValueChange={(v) => { setCategoriaFiltro(v); setPagina(1); }}>
          <SelectTrigger aria-label="Categoría"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estadoFiltro} onValueChange={(v) => { setEstadoFiltro(v as EstadoFiltro); setPagina(1); }}>
          <SelectTrigger aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {cargando ? (
        <Card className="gap-0">
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando productos…
          </div>
        </Card>
      ) : productos.length === 0 ? (
        <Card className="gap-0">
          <EmptyState
            title="No se encontraron productos"
            description={hayFiltros
              ? 'Ningún producto coincide con los filtros aplicados.'
              : 'Todavía no has publicado productos en el marketplace.'}
            action={hayFiltros ? { label: 'Quitar filtros', onClick: limpiarFiltros } : undefined}
          />
        </Card>
      ) : (
        <Card className="gap-0 divide-y divide-border overflow-hidden">
          {productos.map((producto) => {
            const estado = estadoDelProducto(producto);
            const imagen = buildImagenUrl(producto.imagen_principal);
            return (
              <div key={producto.id} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground">
                  {imagen
                    ? <img src={imagen} alt="" className="h-full w-full object-cover" />
                    : <Package className="h-6 w-6" strokeWidth={2} />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/proveedor/productos/${producto.id}`}
                      className="font-semibold text-foreground hover:text-primary hover:underline"
                    >
                      {producto.nombre}
                    </Link>
                    <Badge variant={estado.variante}>{estado.label}</Badge>
                    {producto.destacado && <Badge variant="warning">Destacado</Badge>}
                  </div>
                  {producto.descripcion && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{producto.descripcion}</p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    {producto.categoria && <span>{producto.categoria.nombre}</span>}
                    <span className={producto.stock_disponible === 0 ? 'text-destructive' : undefined}>
                      Stock {num(producto.stock_disponible)}
                    </span>
                    {producto.sku && <span>Ref {producto.sku}</span>}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-bold text-foreground">{cop(toNumber(producto.precio_unitario))}</p>
                  <p className="text-xs text-muted-foreground">
                    por {producto.unidad_medida?.abreviatura ?? 'und'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
                  <Button variant="ghost" size="icon" asChild title="Ver detalle">
                    <Link to={`/proveedor/productos/${producto.id}`} aria-label="Ver detalle">
                      <Eye className="h-4 w-4" strokeWidth={2} />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild title="Editar">
                    <Link to={`/proveedor/productos/editar/${producto.id}`} aria-label="Editar">
                      <Pencil className="h-4 w-4" strokeWidth={2} />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-destructive"
                    title="Eliminar"
                    aria-label="Eliminar"
                    onClick={() => setProductoAEliminar(producto)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Página {meta.current_page} de {meta.last_page} · {num(meta.total)} productos
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="outline"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={cargando || meta.current_page === 1}
            >
              Anteriores
            </Button>
            <Button
              size="sm" variant="outline"
              onClick={() => setPagina((p) => Math.min(meta.last_page, p + 1))}
              disabled={cargando || meta.current_page === meta.last_page}
            >
              Siguientes
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!productoAEliminar}
        onOpenChange={(abierto) => !eliminando && !abierto && setProductoAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              {productoAEliminar
                ? `Se elimina "${productoAEliminar.nombre}" del catálogo. Esta acción no se puede deshacer.`
                : 'Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void eliminar(); }}
              disabled={eliminando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminando ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
