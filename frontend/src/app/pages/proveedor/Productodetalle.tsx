/**
 * Detalle de producto del Portal Proveedor.
 * §3 de API_MARKET_PROVEEDOR_PRODUCTOS: GET /productos/{id}
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowLeft, Edit, Package, Trash2, AlertCircle, CheckCircle, Loader2, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  proveedorApi, toNumber, buildImagenUrl,
  ProveedorErrorCodes,
  type ProductoProv,
} from '../../../api/proveedor';

const formatCOP = (v: number | string): string => {
  const n = typeof v === 'number' ? v : parseFloat(String(v)) || 0;
  return `$${Math.trunc(n).toLocaleString('es-CO')}`;
};

export default function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState<ProductoProv | null>(null);
  const [cargando, setCargando] = useState(true);
  const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (!id) return;
    setCargando(true);
    proveedorApi.producto(Number(id))
      .then((res) => setProducto(res.data))
      .catch((e: any) => {
        if (e?.code === ProveedorErrorCodes.PRODUCTO_NOT_FOUND) {
          toast.error('Producto no encontrado');
        } else {
          toast.error(e?.message ?? 'Error al cargar el producto');
        }
        setProducto(null);
      })
      .finally(() => setCargando(false));
  }, [id]);

  const handleEliminar = () => setConfirmEliminarOpen(true);

  const confirmarEliminar = async () => {
    if (!producto) return;
    setEliminando(true);
    try {
      await proveedorApi.eliminarProducto(producto.id);
      toast.success('Producto eliminado correctamente');
      navigate('/proveedor/productos');
    } catch (e: any) {
      const code = e?.code;
      if (code === ProveedorErrorCodes.PRODUCTO_CON_ORDENES_ACTIVAS
          || code === ProveedorErrorCodes.PRODUCTO_CON_PEDIDOS) {
        toast.error('No se puede eliminar: el producto tiene órdenes activas. Inactívalo en lugar de eliminarlo.');
      } else {
        toast.error(e?.message ?? 'Error al eliminar el producto');
      }
    } finally {
      setEliminando(false);
      setConfirmEliminarOpen(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Cargando producto...</span>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/productos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Producto no encontrado</h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">El producto solicitado no existe o ya no está disponible.</p>
            <Button onClick={() => navigate('/proveedor/productos')} className="mt-4">
              Volver a productos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const estadoBadge = (() => {
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
  })();

  const precio = toNumber(producto.precio_unitario);
  const unidadLabel = producto.unidad_medida?.abreviatura ?? producto.unidad_medida?.nombre ?? 'und';
  const imagenPrincipal = buildImagenUrl(producto.imagen_principal);
  const galeria = producto.imagenes ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/productos')} title="Volver">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold text-foreground">{producto.nombre}</h1>
              {producto.destacado && (
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 gap-1">
                  <Star className="h-3 w-3" /> Destacado
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">Detalles del producto</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/proveedor/productos/editar/${producto.id}`)}
            className="gap-2"
            title="Editar producto"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={handleEliminar}
            title="Eliminar producto"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nombre del producto</p>
                  <p className="font-medium">{producto.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estado</p>
                  <div>{estadoBadge}</div>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Descripción</p>
                <p className="font-medium whitespace-pre-line">{producto.descripcion}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Categoría</p>
                  {producto.categoria ? (
                    <Badge variant="outline">{producto.categoria.nombre}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Unidad de medida</p>
                  <p className="font-medium">
                    {producto.unidad_medida?.nombre ?? '—'}
                    {producto.unidad_medida?.abreviatura ? ` (${producto.unidad_medida.abreviatura})` : ''}
                  </p>
                </div>
                {producto.sku && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ref. (SKU)</p>
                    <p className="font-mono text-sm">{producto.sku}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Precio e inventario */}
          <Card>
            <CardHeader>
              <CardTitle>Precio e Inventario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Precio unitario</p>
                  <p className="text-2xl font-bold">{formatCOP(precio)}</p>
                  <p className="text-xs text-muted-foreground">por {unidadLabel}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Stock disponible</p>
                  <p className={`text-2xl font-bold ${producto.stock_disponible === 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {producto.stock_disponible.toLocaleString('es-CO')}
                  </p>
                  <p className="text-xs text-muted-foreground">{unidadLabel} disponibles</p>
                </div>
                {typeof producto.stock_minimo === 'number' && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Stock mínimo</p>
                    <p className="text-2xl font-bold text-foreground">
                      {producto.stock_minimo.toLocaleString('es-CO')}
                    </p>
                    <p className="text-xs text-muted-foreground">alerta</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Precios por volumen */}
          {producto.precios_volumen && producto.precios_volumen.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Precios por Volumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {producto.precios_volumen.map((pv) => (
                    <div key={pv.id ?? pv.cantidad_minima} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">
                          A partir de {pv.cantidad_minima.toLocaleString('es-CO')} unidades
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pv.activo === false ? 'Inactivo' : 'Descuento aplicado'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCOP(pv.precio_unidad)}</p>
                        <p className="text-xs text-muted-foreground">por {unidadLabel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Galería */}
          {galeria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Galería de Imágenes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {galeria.map((img: any) => {
                    const url = buildImagenUrl(img.url);
                    return (
                      <div key={img.id} className="aspect-square rounded-lg border overflow-hidden bg-muted">
                        {url ? (
                          <img src={url} alt={img.alt_text ?? producto.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Imagen principal */}
          <Card>
            <CardHeader>
              <CardTitle>Imagen del Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {imagenPrincipal ? (
                  <img src={imagenPrincipal} alt={producto.nombre} className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas (si están disponibles en el detalle) */}
          {((producto as any).unidades_vendidas != null || (producto as any).ingresos_acumulados != null) && (
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(producto as any).unidades_vendidas != null && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ventas totales</p>
                    <p className="text-2xl font-bold">
                      {Number((producto as any).unidades_vendidas).toLocaleString('es-CO')}
                    </p>
                    <p className="text-xs text-muted-foreground">unidades vendidas</p>
                  </div>
                )}
                {(producto as any).ingresos_acumulados != null && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ingresos acumulados</p>
                    <p className="text-2xl font-bold">
                      {formatCOP((producto as any).ingresos_acumulados)}
                    </p>
                    <p className="text-xs text-muted-foreground">en ventas totales</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Especificaciones */}
          {producto.especificaciones && Object.keys(producto.especificaciones).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Especificaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  {Object.entries(producto.especificaciones).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</dt>
                      <dd className="font-medium text-right">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* AlertDialog: confirmar eliminar */}
      <AlertDialog open={confirmEliminarOpen} onOpenChange={(o) => !eliminando && setConfirmEliminarOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará permanentemente <strong>{producto.nombre}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmarEliminar(); }}
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
