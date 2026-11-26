import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';
import { ProductoFoto, CantidadInput, ResumenLinea } from '../../components/market/piezas';
import { cop } from '../../lib/formato';
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
      <div className="space-y-6">
        <PageHeader backTo="/market" title="Carrito" />
        <Card className="items-center py-14 text-center">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Cargando carrito...
          </p>
        </Card>
      </div>
    );
  }

  const items = carrito?.items ?? [];
  const resumen = carrito?.resumen ?? { subtotal: 0, costo_envio: 0, total: 0, cantidad_items: 0 };

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader backTo="/market" title="Carrito" />
        <Card className="items-center py-14 text-center">
          <div className="space-y-1">
            <h3>Tu carrito está vacío</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Agrega productos del catálogo para continuar con la compra.
            </p>
          </div>
          <Button onClick={() => navigate('/market')}>Ver catálogo</Button>
        </Card>
      </div>
    );
  }

  const etiqueta = `${items.length} ${items.length === 1 ? 'producto' : 'productos'}`;
  const envio = toNumber(resumen.costo_envio);

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/market"
        title="Carrito"
        description={`${etiqueta} en tu carrito`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/market')}>Seguir comprando</Button>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive-soft hover:text-destructive"
              onClick={() => setConfirmVaciar(true)}
            >
              <Trash2 strokeWidth={2} />
              Vaciar carrito
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Productos */}
        <Card className="gap-0 overflow-hidden lg:col-span-2">
          <div className="hidden grid-cols-[1fr_auto_8rem_2.25rem] gap-4 bg-muted/60 px-5 py-2.5 text-[13px] font-medium text-muted-foreground sm:grid">
            <span>Producto</span>
            <span className="w-[8.5rem] text-center">Cantidad</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const precio = toNumber(item.precio_unitario);
              const enCurso = actualizando === item.id;
              return (
                <li
                  key={item.id}
                  className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-[1fr_auto_8rem_2.25rem] sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductoFoto
                      src={item.producto.imagen_principal ? buildImagenUrl(item.producto.imagen_principal) : null}
                      alt={item.producto.nombre}
                      className="h-14 w-14 shrink-0"
                      iconClassName="h-5 w-5"
                    />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/market/productos/${item.producto.id}`)}
                        className="line-clamp-2 max-w-full text-left font-semibold text-foreground hover:text-primary"
                      >
                        {item.producto.nombre}
                      </button>
                      <p className="break-words text-xs text-muted-foreground">
                        {item.producto.proveedor.nombre_empresa}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cop(precio)} / {item.producto.unidad_medida.abreviatura}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar ${item.producto.nombre}`}
                    disabled={enCurso}
                    onClick={() => eliminarItem(item.id)}
                    className="text-muted-foreground hover:text-destructive sm:order-last"
                  >
                    <Trash2 strokeWidth={2} />
                  </Button>
                  <CantidadInput
                    size="sm"
                    value={item.cantidad}
                    max={item.producto.stock_disponible}
                    disabled={enCurso}
                    onChange={(n) => cambiarCantidad(item.id, n)}
                  />
                  <p className="self-center text-right font-semibold tabular-nums">
                    {cop(toNumber(item.subtotal))}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Resumen */}
        <div className="lg:sticky lg:top-6">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Resumen de compra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <ResumenLinea
                  label={`Subtotal (${resumen.cantidad_items} ${resumen.cantidad_items === 1 ? 'producto' : 'productos'})`}
                  value={cop(toNumber(resumen.subtotal))}
                />
                <ResumenLinea label="Envío" value={envio === 0 ? 'Gratis' : cop(envio)} />
                <div className="border-t border-border">
                  <ResumenLinea total label="Total" value={cop(toNumber(resumen.total))} />
                </div>
              </div>
              <Button onClick={() => navigate('/market/checkout')} className="w-full">
                Continuar al pago
                <ArrowRight strokeWidth={2} />
              </Button>
            </CardContent>
          </Card>
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
