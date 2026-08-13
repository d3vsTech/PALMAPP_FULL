import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck, PackageCheck,
  MapPin, CreditCard, Store, Calendar, ChefHat, Loader2, Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  marketApi, toNumber, buildImagenUrl, MarketErrorCodes,
  type Pedido, type EstadoPedido,
} from '../../../api/market';
import {
  pagosApi, ESTADO_PAGO_LABEL, METODO_PAGO_LABEL,
  type EstadoPagoResponse, type MetodoPago,
} from '../../../api/pagos';
import { ModalReintentoEpayco } from '../../components/market/ModalReintentoEpayco';
import { formatFecha, formatFechaHora } from '../../utils/fecha';

const estadoConfig: Record<EstadoPedido, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  pendiente:   { label: 'Pendiente',     color: 'text-amber-600',  bgColor: 'bg-amber-50',     borderColor: 'border-amber-200',  icon: Clock },
  confirmado:  { label: 'Confirmado',    color: 'text-blue-600',   bgColor: 'bg-blue-50',      borderColor: 'border-blue-200',   icon: CheckCircle },
  preparando:  { label: 'En Preparación', color: 'text-purple-600', bgColor: 'bg-purple-50',    borderColor: 'border-purple-200', icon: ChefHat },
  en_transito: { label: 'En Camino',     color: 'text-indigo-600', bgColor: 'bg-indigo-50',    borderColor: 'border-indigo-200', icon: Truck },
  entregado:   { label: 'Entregado',     color: 'text-success',    bgColor: 'bg-success/10',   borderColor: 'border-success/20', icon: PackageCheck },
  cancelado:   { label: 'Cancelado',     color: 'text-destructive', bgColor: 'bg-destructive/10', borderColor: 'border-destructive/20', icon: XCircle },
};

export default function PedidoDetalle() {
  const navigate = useNavigate();
  const { id: codigo } = useParams();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  /** Respuesta del endpoint GET /pago/estado del pedido (§10.4). */
  const [estadoPago, setEstadoPago] = useState<EstadoPagoResponse['data'] | null>(null);
  const [modalReintentoAbierto, setModalReintentoAbierto] = useState(false);
  /** Diálogo de confirmación para cancelar el pedido (§5.3). */
  const [dialogoCancelarAbierto, setDialogoCancelarAbierto] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);

  /**
   * `silent=true` cuando viene de polling/focus: no muestra spinner ni
   * redirige al listado si hay error transitorio, así no pierde el contexto
   * del usuario que está viendo el pedido.
   */
  const cargar = (silent = false) => {
    if (!codigo) return;
    if (!silent) setCargando(true);
    marketApi.pedido(codigo)
      .then((res) => setPedido(res.data))
      .catch((e: any) => {
        if (!silent) {
          toast.error(e?.message ?? 'Pedido no encontrado');
          navigate('/market/pedidos');
        }
      })
      .finally(() => { if (!silent) setCargando(false); });
    // Hidratar estado de pago en paralelo. Degrada suave si el backend
    // no responde (ej. pedidos viejos sin registro de pago).
    pagosApi.estado(codigo).then((r) => setEstadoPago(r.data)).catch(() => setEstadoPago(null));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, navigate]);

  // Se eliminó el auto-refresh periódico — para ver cambios el usuario
  // recarga con F5 o navega de nuevo a la pantalla.

  /** Ejecuta la cancelación con el motivo opcional (§5.3). */
  const cancelarPedido = async () => {
    if (!pedido) return;
    setCancelando(true);
    try {
      await marketApi.cancelarPedido(pedido.codigo, motivoCancelacion.trim() || undefined);
      toast.success('Pedido cancelado correctamente');
      setDialogoCancelarAbierto(false);
      setMotivoCancelacion('');
      cargar();
    } catch (err: any) {
      const code = err?.code ?? err?.error_code;
      if (code === MarketErrorCodes.PEDIDO_YA_CANCELADO) {
        toast.info('El pedido ya está cancelado');
        setDialogoCancelarAbierto(false);
        cargar();
      } else if (code === MarketErrorCodes.PAGO_YA_APROBADO) {
        toast.error('No se puede cancelar: el pago ya fue aprobado');
      } else if (code === MarketErrorCodes.PAGO_EN_PROCESO) {
        toast.error('Hay un pago en curso. Espera a que se resuelva antes de cancelar.');
      } else if (code === MarketErrorCodes.PEDIDO_NO_CANCELABLE) {
        toast.error('Este pedido ya no se puede cancelar');
      } else {
        toast.error(err?.message ?? 'No se pudo cancelar el pedido');
      }
    } finally {
      setCancelando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando pedido...
      </div>
    );
  }

  if (!pedido) {
    return <div className="text-center py-20 text-muted-foreground">Pedido no encontrado.</div>;
  }

  const config = estadoConfig[pedido.estado] ?? estadoConfig.pendiente;
  const Icon = config.icon;
  const subtotal = toNumber(pedido.subtotal);
  const envio = toNumber(pedido.costo_envio);
  const total = toNumber(pedido.total);
  const historial = pedido.historial ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/market/pedidos')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis pedidos
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">{pedido.codigo}</h1>
            <p className="text-muted-foreground mt-2">
              Realizado el {formatFecha(pedido.fecha_pedido)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${config.bgColor} ${config.color} ${config.borderColor} border h-fit`}>
              <Icon className="h-4 w-4 mr-1" />
              {config.label}
            </Badge>
            {/* Botón cancelar — §5.3. Estados cancelables:
                pendiente/confirmado/preparando/en_transito y estado_pago
                distinto de pagado/procesando. */}
            {pedido.estado !== 'entregado' && pedido.estado !== 'cancelado'
              && estadoPago?.estado_pago !== 'pagado'
              && estadoPago?.estado_pago !== 'procesando'
              && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogoCancelarAbierto(true)}
                  className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                >
                  <Ban className="h-4 w-4" />
                  Cancelar pedido
                </Button>
              )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline del pedido */}
          {historial.length > 0 && (
            <Card className="border-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">Seguimiento del Pedido</h2>

                <div className="relative">
                  {historial.map((evento, index) => {
                    const eventoConfig = estadoConfig[evento.estado_nuevo] ?? estadoConfig.pendiente;
                    const EventoIcon = eventoConfig.icon;
                    const esUltimo = index === historial.length - 1;

                    return (
                      <div key={evento.id} className="relative flex gap-4 pb-8 last:pb-0">
                        {!esUltimo && (
                          <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />
                        )}

                        <div
                          className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 ${eventoConfig.borderColor} ${eventoConfig.bgColor}`}
                        >
                          <EventoIcon className={`h-6 w-6 ${eventoConfig.color}`} />
                        </div>

                        <div className="flex-1 pt-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-foreground">{eventoConfig.label}</h3>
                            <span className="text-xs text-muted-foreground">
                              {formatFechaHora(evento.fecha_cambio)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {evento.comentario ?? `Estado actualizado a ${eventoConfig.label.toLowerCase()}`}
                          </p>
                          {evento.user && (
                            <p className="text-xs text-muted-foreground mt-1">por {evento.user.name}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Productos */}
          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Productos</h2>

              <div className="space-y-4">
                {pedido.items.map((producto) => (
                  <div
                    key={producto.id}
                    className="flex items-center justify-between pb-4 border-b border-border last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {producto.producto?.imagen_principal ? (
                          <img
                            src={buildImagenUrl(producto.producto.imagen_principal)}
                            alt={producto.nombre_producto}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-primary/30" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{producto.nombre_producto}</p>
                        <p className="text-sm text-muted-foreground">
                          {producto.cantidad} × ${toNumber(producto.precio_unitario).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      ${toNumber(producto.subtotal).toLocaleString('es-CO')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Información de entrega */}
          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Información de Entrega</h2>

              <div className="space-y-4">
                {pedido.direccion_entrega && (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Dirección de entrega</p>
                        <p className="text-sm text-muted-foreground">{pedido.direccion_entrega}</p>
                        {pedido.notas && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Indicaciones: {pedido.notas}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="h-px bg-border" />
                  </>
                )}

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">Proveedor</p>
                    <p className="text-sm text-muted-foreground">{pedido.proveedor.nombre_empresa}</p>
                  </div>
                </div>

                {pedido.metodo_pago && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground mb-1">Método de pago</p>
                        <p className="text-sm text-muted-foreground">
                          {METODO_PAGO_LABEL[pedido.metodo_pago as MetodoPago] ?? pedido.metodo_pago}
                        </p>
                        {estadoPago && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={ESTADO_PAGO_LABEL[estadoPago.estado_pago].color}
                            >
                              {ESTADO_PAGO_LABEL[estadoPago.estado_pago].label}
                            </Badge>
                            {estadoPago.ultimo_pago?.franchise && (
                              <span className="text-[10px] text-muted-foreground">
                                {estadoPago.ultimo_pago.franchise}
                              </span>
                            )}
                            {estadoPago.ultimo_pago?.approval_code && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                Aprob: {estadoPago.ultimo_pago.approval_code}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Botón de "Pagar ahora / Reintentar" solo aparece cuando
                            el pedido es ePayco y aún no está pagado (§10.3). */}
                        {pedido.metodo_pago === 'epayco'
                          && estadoPago
                          && (estadoPago.estado_pago === 'pendiente'
                            || estadoPago.estado_pago === 'rechazado'
                            || estadoPago.estado_pago === 'fallido')
                          && (
                            <Button
                              size="sm"
                              className="mt-3 gap-2"
                              onClick={() => setModalReintentoAbierto(true)}
                            >
                              <CreditCard className="h-4 w-4" />
                              {estadoPago.estado_pago === 'pendiente'
                                ? 'Pagar ahora'
                                : 'Reintentar pago'}
                            </Button>
                          )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumen del pedido */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground">Resumen del Pedido</h2>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">${subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="font-semibold">
                      {envio === 0 ? (
                        <span className="text-success">GRATIS</span>
                      ) : (
                        `$${envio.toLocaleString('es-CO')}`
                      )}
                    </span>
                  </div>

                  <div className="h-px bg-border my-3" />

                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-success">
                      ${total.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-muted/30">
              <CardContent className="p-4 flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    {pedido.estado === 'entregado'
                      ? 'Fecha de entrega'
                      : pedido.estado === 'cancelado'
                        ? 'Pedido cancelado'
                        : 'Fecha estimada de entrega'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pedido.estado === 'entregado' && pedido.fecha_entrega_real
                      ? formatFecha(pedido.fecha_entrega_real)
                      : pedido.estado === 'cancelado'
                        ? '—'
                        : pedido.fecha_entrega_estimada
                          ? formatFecha(pedido.fecha_entrega_estimada)
                          : '3-5 días hábiles'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de reintento de pago con ePayco (§10.5). */}
      <ModalReintentoEpayco
        open={modalReintentoAbierto}
        codigoPedido={pedido.codigo}
        onClose={() => setModalReintentoAbierto(false)}
      />

      {/* Diálogo de confirmación para cancelar pedido (§5.3). */}
      <AlertDialog
        open={dialogoCancelarAbierto}
        onOpenChange={(o) => { if (!cancelando) setDialogoCancelarAbierto(o); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Cancelar pedido {pedido.codigo}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará el pedido y repondrá el stock automáticamente.
              No se puede deshacer. Puedes agregar un motivo opcional para tu registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Motivo (opcional)</label>
            <Textarea
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Ej: Ya no necesito el pedido"
              rows={3}
              disabled={cancelando}
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelando}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); cancelarPedido(); }}
              disabled={cancelando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sí, cancelar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
