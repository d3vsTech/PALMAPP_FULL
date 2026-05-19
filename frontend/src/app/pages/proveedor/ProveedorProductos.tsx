import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Plus, Search, Edit, Trash2, Eye, Package, AlertCircle, CheckCircle,
  Upload, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  proveedorApi, toNumber, buildImagenUrl, ProveedorErrorCodes,
  type ProductoProv, type CategoriaRefProv, type ListarProductosParams,
  type ProductosStats,
} from '../../../api/proveedor';

export default function ProveedorProductos() {
  const [productos, setProductos] = useState<ProductoProv[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRefProv[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [stats, setStats] = useState<ProductosStats | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [estadoFiltro, setEstadoFiltro] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(true);

  const [productoAEliminar, setProductoAEliminar] = useState<ProductoProv | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = () => {
    setCargando(true);
    const params: ListarProductosParams = { page };
    if (busqueda.trim()) params.buscar = busqueda.trim();
    if (categoriaFiltro !== 'todas') params.categoria_id = parseInt(categoriaFiltro);
    if (estadoFiltro !== 'todos') params.estado = estadoFiltro;
    proveedorApi.productos(params)
      .then((res) => {
        setProductos(res.data);
        setMeta(res.meta);
        if (res.stats) setStats(res.stats);
      })
      .catch((e: any) => toast.error(e?.message ?? 'Error al cargar productos'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    // wizard-init trae categorías + unidades en 1 sola petición.
    proveedorApi.wizardInitProductos()
      .then((res) => setCategorias(res.data.categorias as any))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, categoriaFiltro, estadoFiltro, page]);

  const eliminarProducto = async () => {
    if (!productoAEliminar) return;
    setEliminando(true);
    try {
      await proveedorApi.eliminarProducto(productoAEliminar.id);
      toast.success('Producto eliminado exitosamente');
      setProductoAEliminar(null);
      cargar();
    } catch (e: any) {
      const code = e?.code;
      if (code === ProveedorErrorCodes.PRODUCTO_CON_ORDENES_ACTIVAS
          || code === ProveedorErrorCodes.PRODUCTO_CON_PEDIDOS) {
        toast.error('No se puede eliminar: el producto tiene órdenes activas. Inactívalo en lugar de eliminarlo.');
      } else {
        toast.error(e?.message ?? 'Error al eliminar producto');
      }
    } finally {
      setEliminando(false);
    }
  };

  const getEstadoBadge = (producto: ProductoProv) => {
    if (producto.stock_disponible === 0) {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Sin Stock
        </Badge>
      );
    }
    if (producto.estado === 'inactivo') {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
          Inactivo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
        <CheckCircle className="h-3 w-3 mr-1" />
        Activo
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mis Productos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu catálogo de productos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/proveedor/productos/carga-masiva">
              <Upload className="h-4 w-4" />
              Carga Masiva
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="/proveedor/productos/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats del catálogo del proveedor */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Activos</p>
              <p className="text-3xl font-bold text-success">{stats.total_activos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Inactivos</p>
              <p className="text-3xl font-bold text-muted-foreground">{stats.total_inactivos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Sin stock</p>
              <p className="text-3xl font-bold text-destructive">{stats.total_sin_stock}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Select value={categoriaFiltro} onValueChange={(v) => { setCategoriaFiltro(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las categorías</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={estadoFiltro} onValueChange={(v) => { setEstadoFiltro(v as any); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de productos */}
      {cargando ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando productos...
        </div>
      ) : (
        <div className="grid gap-4">
          {productos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No se encontraron productos</p>
              </CardContent>
            </Card>
          ) : (
            productos.map((producto) => {
              const precio = toNumber(producto.precio_unitario);
              return (
                <Card key={producto.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {producto.imagen_principal ? (
                          <img src={buildImagenUrl(producto.imagen_principal)} alt={producto.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold">{producto.nombre}</h3>
                              {getEstadoBadge(producto)}
                              {producto.destacado && (
                                <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600">
                                  Destacado
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{producto.descripcion}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              {producto.categoria && <span>{producto.categoria.nombre}</span>}
                              <span className={producto.stock_disponible === 0 ? 'text-destructive' : ''}>
                                Stock: {producto.stock_disponible}
                              </span>
                              {producto.sku && <span>Ref: {producto.sku}</span>}
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-bold">
                              ${precio.toLocaleString('es-CO')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              por {producto.unidad_medida?.abreviatura ?? 'und'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="ghost" size="sm" asChild title="Ver detalle">
                          <Link to={`/proveedor/productos/${producto.id}`} aria-label="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild title="Editar">
                          <Link to={`/proveedor/productos/editar/${producto.id}`} aria-label="Editar">
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setProductoAEliminar(producto)}
                          title="Eliminar"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Paginación */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Página {meta.current_page} de {meta.last_page} · {meta.total} productos
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.current_page === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={meta.current_page === meta.last_page}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!productoAEliminar}
        onOpenChange={(o) => !eliminando && !o && setProductoAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              {productoAEliminar
                ? `¿Estás seguro de que deseas eliminar el producto "${productoAEliminar.nombre}"? Esta acción no se puede deshacer.`
                : 'Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); eliminarProducto(); }}
              disabled={eliminando}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
