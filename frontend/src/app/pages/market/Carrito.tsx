import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowLeft, Trash2, Plus, Minus, ShoppingCart, Package, ArrowRight, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { marketApi, toNumber, buildImagenUrl, type Carrito as CarritoT } from '../../../api/market';

export default function Carrito() {
  const navigate = useNavigate();

  const [carrito, setCarrito] = useState<CarritoT | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState<number | null>(null);
  const [confirmVaciar, setConfirmVaciar] = useState(false);
  const [vaciando, setVaciando] = useState(false);

  const cargar = () => {
    setCargando(true);
    marketApi.carrito()
      .then((res) => setCarrito(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'Error al cargar carrito'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const cambiarCantidad = async (itemId: number, nueva: number) => {
    if (nueva < 1) return;
    setActualizando(itemId);
    try {
      await marketApi.actualizarCantidad(itemId, nueva);
      cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo actualizar');
    } finally {
      setActualizando(null);
    }
  };

  const eliminarItem = async (itemId: number) => {
    setActualizando(itemId);
    try {
      await marketApi.eliminarItem(itemId);
      toast.success('Producto eliminado');
      cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo eliminar');
    } finally {
      setActualizando(null);
    }
  };

  const vaciarCarrito = async () => {
    setVaciando(true);
    try {
      await marketApi.vaciarCarrito();
      toast.success('Carrito vaciado');
      setConfirmVaciar(false);
      cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo vaciar el carrito');
    } finally {
      setVaciando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando carrito...
      </div>
    );
  }

  const items = carrito?.items ?? [];
  const resumen = carrito?.resumen ?? { subtotal: 0, costo_envio: 0, total: 0, cantidad_items: 0 };

  if (items.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/market')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al catálogo
          </Button>
          <h1 className="text-4xl font-bold text-foreground">Carrito de Compras</h1>
        </div>

        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Tu carrito está vacío</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Agrega productos para continuar con tu compra
            </p>
            <Button onClick={() => navigate('/market')}>
              <Package className="mr-2 h-4 w-4" />
              Ver catálogo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/market')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Continuar comprando
          </Button>
          <h1 className="text-4xl font-bold text-foreground">Carrito de Compras</h1>
          <p className="text-muted-foreground mt-2">
            {items.length} {items.length === 1 ? 'producto' : 'productos'} en tu carrito
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setConfirmVaciar(true)}
          className="gap-2 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          Vaciar carrito
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Lista de productos */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const precio = toNumber(item.precio_unitario);
            const subtotal = toNumber(item.subtotal);
            const isUpdating = actualizando === item.id;
            return (
              <Card key={item.id} className="border-border">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.producto.imagen_principal ? (
                        <img
                          src={buildImagenUrl(item.producto.imagen_principal)}
                          alt={item.producto.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-10 w-10 text-primary/30" />
                      )}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div>
                        <h3
                          className="font-semibold text-foreground cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/market/productos/${item.producto.id}`)}
                        >
                          {item.producto.nombre}
                        </h3>
                        <p className="text-sm text-muted-foreground">{item.producto.proveedor.nombre_empresa}</p>
                        <p className="text-sm text-muted-foreground">
                          Precio unitario: ${precio.toLocaleString('es-CO')} / {item.producto.unidad_medida.abreviatura}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                            disabled={isUpdating || item.cantidad <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => {
                              const v = parseInt(e.target.value) || 1;
                              if (v !== item.cantidad) cambiarCantidad(item.id, v);
                            }}
                            className="w-16 text-center"
                            min="1"
                            max={item.producto.stock_disponible}
                            disabled={isUpdating}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                            disabled={isUpdating || item.cantidad >= item.producto.stock_disponible}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarItem(item.id)}
                          disabled={isUpdating}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <p className="text-sm text-muted-foreground">Subtotal:</p>
                        <p className="text-xl font-bold text-success">
                          ${subtotal.toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Resumen de compra */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground">Resumen de Compra</h2>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal ({resumen.cantidad_items} {resumen.cantidad_items === 1 ? 'producto' : 'productos'})
                    </span>
                    <span className="font-semibold">${toNumber(resumen.subtotal).toLocaleString('es-CO')}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="font-semibold">
                      {toNumber(resumen.costo_envio) === 0
                        ? 'Gratis'
                        : `$${toNumber(resumen.costo_envio).toLocaleString('es-CO')}`}
                    </span>
                  </div>

                  <div className="h-px bg-border my-3" />

                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-success">
                      ${toNumber(resumen.total).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate('/market/checkout')}
                  className="w-full gap-2"
                  size="lg"
                >
                  Proceder al pago
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmVaciar} onOpenChange={(o) => !vaciando && setConfirmVaciar(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vaciar carrito</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={vaciando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); vaciarCarrito(); }}
              disabled={vaciando}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {vaciando ? 'Vaciando...' : 'Vaciar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
