import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '../../components/ui/tabs';
import {
  ArrowLeft, ShoppingCart, User, MapPin, Phone, Calendar, Package,
  CheckCircle, Clock, Truck, Mail, CreditCard, Edit, XCircle, PackageCheck,
  ChefHat, Loader2, FileText, Hash, AlertTriangle, Zap, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  proveedorApi, toNumber, buildImagenUrl, descargarBlob,
  type PedidoProv, type EstadoPedidoProv,
  type EstadoPagoPedidoProv, type PrioridadPedidoProv,
  type CambiarEstadoPedidoPayload,
} from '../../../api/proveedor';
import { formatFecha, formatFechaHora } from '../../utils/fecha';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const estadoConfig: Record<EstadoPedidoProv, { label: string; className: string; icon: any }> = {
  pendiente:   { label: 'Pendiente',     className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',   icon: Clock },
  confirmado:  { label: 'Confirmado',    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',     icon: CheckCircle },
  preparando:  { label: 'Preparando',    className: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: ChefHat },
  en_transito: { label: 'En Tránsito',   className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',     icon: Truck },
  entregado:   { label: 'Entregado',     className: 'bg-success/10 text-success border-success/20',         icon: PackageCheck },
  cancelado:   { label: 'Cancelado',     className: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

const prioridadConfig: Record<PrioridadPedidoProv, { label: string; className: string; icon: any }> = {
  normal:  { label: 'Normal',  className: 'bg-muted text-muted-foreground border-border', icon: Package },
  alta:    { label: 'Alta',    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: AlertTriangle },
  urgente: { label: 'Urgente', className: 'bg-destructive/10 text-destructive border-destructive/20', icon: Zap },
};

const pagoConfig: Record<EstadoPagoPedidoProv, { label: string; className: string }> = {
  pendiente: { label: 'Pago pendiente', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  pagado:    { label: 'Pagado',          className: 'bg-success/10 text-success border-success/20' },
};

export default function PedidoDetalleProveedor() {
  const navigate = useNavigate();
  const { id: codigo } = useParams();

  const [pedido, setPedido] = useState<PedidoProv | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState('detalles');
  const [descargandoFactura, setDescargandoFactura] = useState(false);

  const [modalCambiarEstado, setModalCambiarEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState<EstadoPedidoProv | ''>('');
  const [notaEstado, setNotaEstado] = useState('');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [estadoPagoNuevo, setEstadoPagoNuevo] = useState<EstadoPagoPedidoProv | ''>('');
  const [prioridadNueva, setPrioridadNueva] = useState<PrioridadPedidoProv | ''>('');
  const [actualizando, setActualizando] = useState(false);

  const [modalPago, setModalPago] = useState(false);
  const [marcandoPago, setMarcandoPago] = useState(false);

  /**
   * `silent=true` para auto-refresh: sin spinner, sin redirigir si falla,
   * sin toasts. El usuario sigue viendo el pedido aunque haya un blip de red.
   */
  const cargar = (silent = false) => {
    if (!codigo) return;
    if (!silent) setCargando(true);
    proveedorApi.pedido(codigo)
      .then((res) => setPedido(res.data))
      .catch((e: any) => {
        if (!silent) {
          toast.error(e?.message ?? 'Pedido no encontrado');
          navigate('/proveedor/pedidos');
        }
      })
      .finally(() => { if (!silent) setCargando(false); });
  };

  useEffect(() => { cargar(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [codigo]);

  // Auto-sincronización 20s + on-focus. Pausamos si hay modal abierto para
  // no pisar lo que el usuario está editando.
  useAutoRefresh(
    () => cargar(true),
    20_000,
    !modalCambiarEstado && !modalPago,
  );

  /** YYYY-MM-DD en zona local (no UTC) para `<input type="date">`. */
  const hoyISO = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const abrirModalCambiarEstado = () => {
    if (!pedido) return;
    setNuevoEstado('');
    setNotaEstado('');
    setNumeroGuia(pedido.numero_guia ?? '');
    // Si no hay fecha previa, defaultea a HOY (entrega del mismo día permitida).
    setFechaEntrega(pedido.fecha_entrega_estimada?.slice(0, 10) ?? hoyISO);
    setEstadoPagoNuevo('');
    setPrioridadNueva('');
    setModalCambiarEstado(true);
  };

  const cambiarEstado = async () => {
    if (!codigo || !nuevoEstado) {
      toast.error('Selecciona un estado');
      return;
    }
    const payload: CambiarEstadoPedidoPayload = {
      estado: nuevoEstado as EstadoPedidoProv,
    };
    if (notaEstado.trim()) payload.comentario = notaEstado.trim();
    if (numeroGuia.trim()) payload.numero_guia = numeroGuia.trim();
    if (fechaEntrega) payload.fecha_entrega_estimada = fechaEntrega;
    if (estadoPagoNuevo) payload.estado_pago = estadoPagoNuevo;
    if (prioridadNueva) payload.prioridad = prioridadNueva;

    setActualizando(true);
    try {
      await proveedorApi.cambiarEstadoPedido(codigo, payload);
      toast.success('Estado actualizado');
      setModalCambiarEstado(false);
      cargar();
    } catch (e: any) {
      if (e?.code === 'TRANSICION_INVALIDA') {
        toast.error(e.message ?? 'Transición no permitida desde el estado actual');
      } else {
        toast.error(e?.message ?? 'Error al cambiar estado');
      }
    } finally {
      setActualizando(false);
    }
  };

  const marcarComoPagado = async () => {
    if (!codigo || !pedido) return;
    setMarcandoPago(true);
    try {
      await proveedorApi.cambiarEstadoPedido(codigo, {
        estado: pedido.estado, // misma estado, solo cambia estado_pago
        estado_pago: 'pagado',
        comentario: 'Pago confirmado por el proveedor',
      });
      toast.success('Pedido marcado como pagado');
      setModalPago(false);
      cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al actualizar el pago');
    } finally {
      setMarcandoPago(false);
    }
  };

  const descargarFactura = async () => {
    if (!pedido) return;
    setDescargandoFactura(true);
    try {
      const blob = await proveedorApi.descargarFactura(pedido.codigo);
      descargarBlob(blob, `Factura-${pedido.codigo}.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo descargar la factura');
    } finally {
      setDescargandoFactura(false);
    }
  };

  if (cargando) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/pedidos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cargando...</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando pedido...
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/pedidos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pedido no encontrado</h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">El pedido solicitado no existe</p>
            <Button onClick={() => navigate('/proveedor/pedidos')} className="mt-4">
              Volver a pedidos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = estadoConfig[pedido.estado];
  const EstadoIcon = config.icon;
  // §13: leer acciones_disponibles del backend. Fallback robusto:
  // si el backend manda claves desconocidas o array vacío, usamos la máquina
  // de estados oficial (§5) para que el modal siempre ofrezca las transiciones
  // válidas. Solo respetamos el array del backend cuando contiene al menos
  // una clave conocida.
  const ACCIONES_FALLBACK: Record<EstadoPedidoProv, string[]> = {
    pendiente:   ['confirmar', 'rechazar'],
    confirmado:  ['preparar'],
    preparando:  ['despachar'],
    en_transito: ['entregar'],
    entregado:   [],
    cancelado:   [],
  };
  const KNOWN = ['confirmar', 'rechazar', 'preparar', 'despachar', 'entregar'];
  const backendAcciones = pedido.acciones_disponibles ?? [];
  const tieneClavesConocidas = backendAcciones.some(a => KNOWN.includes(a));
  const acciones: string[] = tieneClavesConocidas
    ? backendAcciones
    : (ACCIONES_FALLBACK[pedido.estado] ?? []);
  const transicionesDisponibles: EstadoPedidoProv[] = [];
  if (acciones.includes('confirmar')) transicionesDisponibles.push('confirmado');
  if (acciones.includes('preparar')) transicionesDisponibles.push('preparando');
  if (acciones.includes('despachar')) transicionesDisponibles.push('en_transito');
  if (acciones.includes('entregar')) transicionesDisponibles.push('entregado');
  if (acciones.includes('rechazar')) transicionesDisponibles.push('cancelado');
  const subtotal = toNumber(pedido.subtotal);
  const envio = toNumber(pedido.costo_envio);
  const total = toNumber(pedido.total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/pedidos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{pedido.codigo}</h1>
            <p className="text-muted-foreground mt-1">Detalle del pedido</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`${config.className} text-base px-3 py-1`}>
            <EstadoIcon className="h-4 w-4 mr-2" />
            {config.label}
          </Badge>
          {pedido.prioridad && pedido.prioridad !== 'normal' && (() => {
            const cfg = prioridadConfig[pedido.prioridad];
            const Icon = cfg.icon;
            return (
              <Badge variant="outline" className={`${cfg.className} text-sm px-3 py-1`}>
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {cfg.label}
              </Badge>
            );
          })()}
          {pedido.estado_pago && (
            <Badge variant="outline" className={`${pagoConfig[pedido.estado_pago].className} text-sm px-3 py-1`}>
              {pagoConfig[pedido.estado_pago].label}
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={descargarFactura}
            disabled={descargandoFactura}
            className="gap-2"
          >
            {descargandoFactura ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Factura PDF
          </Button>
        </div>
      </div>

      <Tabs value={tabActiva} onValueChange={setTabActiva}>
        <TabsList>
          <TabsTrigger value="detalles">Detalles</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="detalles">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Información del cliente */}
              {pedido.tenant && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Información del Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Nombre</p>
                          <p className="font-medium">{pedido.tenant.nombre}</p>
                        </div>
                      </div>

                      {pedido.tenant.nit && (
                        <div className="flex items-start gap-3">
                          <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">NIT</p>
                            <p className="font-medium">{pedido.tenant.nit}</p>
                          </div>
                        </div>
                      )}

                      {pedido.tenant.telefono && (
                        <div className="flex items-start gap-3">
                          <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Teléfono</p>
                            <p className="font-medium">{pedido.tenant.telefono}</p>
                          </div>
                        </div>
                      )}

                      {(pedido.tenant.correo_contacto || pedido.tenant.email) && (
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{pedido.tenant.correo_contacto ?? pedido.tenant.email}</p>
                          </div>
                        </div>
                      )}

                      {pedido.tenant.direccion && (
                        <div className="flex items-start gap-3 sm:col-span-2">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Dirección registrada</p>
                            <p className="font-medium">{pedido.tenant.direccion}</p>
                          </div>
                        </div>
                      )}

                      {pedido.direccion_entrega && (
                        <div className="flex items-start gap-3 sm:col-span-2">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Dirección de entrega</p>
                            <p className="font-medium">{pedido.direccion_entrega}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Productos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Productos del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pedido.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between p-4 rounded-lg border">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-12 w-12 shrink-0 bg-muted rounded flex items-center justify-center overflow-hidden">
                            {item.producto?.imagen_principal ? (
                              <img src={buildImagenUrl(item.producto.imagen_principal)} alt={item.nombre_producto} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium mb-1">{item.nombre_producto}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                              <span>Cantidad: {item.cantidad}</span>
                              <span>·</span>
                              <span>${toNumber(item.precio_unitario).toLocaleString('es-CO')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-semibold">
                            ${toNumber(item.subtotal).toLocaleString('es-CO')}
                          </p>
                          {toNumber(item.descuento ?? 0) > 0 && (
                            <p className="text-xs text-success">
                              -${toNumber(item.descuento ?? 0).toLocaleString('es-CO')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Información de Pago */}
              {(pedido.metodo_pago || pedido.estado_pago) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Información de Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pedido.metodo_pago && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Método de pago</p>
                            <p className="font-medium">{pedido.metodo_pago}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {pedido.estado_pago && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Receipt className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Estado de pago</p>
                            <Badge variant="outline" className={pagoConfig[pedido.estado_pago].className}>
                              {pagoConfig[pedido.estado_pago].label}
                            </Badge>
                          </div>
                        </div>
                        {pedido.estado_pago === 'pendiente' && (
                          <Button size="sm" onClick={() => setModalPago(true)} className="gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Marcar como pagado
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notas del cliente */}
              {pedido.notas && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notas del cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{pedido.notas}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Resumen */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen del Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">${subtotal.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Envío</span>
                      <span className="font-medium">
                        {envio === 0 ? (
                          <span className="text-success">GRATIS</span>
                        ) : (
                          `$${envio.toLocaleString('es-CO')}`
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-3">
                      <span className="font-semibold">Total</span>
                      <span className="text-2xl font-bold">${total.toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Envío y fechas */}
              <Card>
                <CardHeader>
                  <CardTitle>Envío y Fechas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de creación</p>
                      <p className="font-medium">{formatFechaHora(pedido.fecha_pedido)}</p>
                    </div>
                  </div>
                  {pedido.numero_guia && (
                    <div className="flex items-start gap-3">
                      <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Número de guía</p>
                        <p className="font-medium">{pedido.numero_guia}</p>
                      </div>
                    </div>
                  )}
                  {pedido.fecha_entrega_estimada && (
                    <div className="flex items-start gap-3">
                      <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Entrega estimada</p>
                        <p className="font-medium">{formatFecha(pedido.fecha_entrega_estimada)}</p>
                      </div>
                    </div>
                  )}
                  {pedido.fecha_entrega_real && (
                    <div className="flex items-start gap-3">
                      <PackageCheck className="h-5 w-5 text-success mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Entregado</p>
                        <p className="font-medium text-success">{formatFecha(pedido.fecha_entrega_real)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Acciones (basadas en acciones_disponibles del backend) */}
              {transicionesDisponibles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Acciones</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full gap-2" onClick={abrirModalCambiarEstado}>
                      <Edit className="h-4 w-4" />
                      Cambiar Estado
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Historial del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              {(!pedido.historial || pedido.historial.length === 0) ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  Sin eventos en el historial
                </p>
              ) : (
                <div className="space-y-4">
                  {pedido.historial.map((evento, index) => {
                    const eventoConfig = estadoConfig[evento.estado_nuevo] ?? estadoConfig.pendiente;
                    const EventoIcon = eventoConfig.icon;
                    const esUltimo = pedido.historial && index === pedido.historial.length - 1;
                    return (
                      <div key={evento.id ?? `${evento.fecha_cambio}-${index}`} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${eventoConfig.className.replace('border-', 'border-0 ')}`}>
                            <EventoIcon className="h-4 w-4" />
                          </div>
                          {!esUltimo && (
                            <div className="w-0.5 h-full bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <div className="flex items-start justify-between mb-1 gap-2 flex-wrap">
                            <p className="font-medium">{eventoConfig.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFechaHora(evento.fecha_cambio)}
                            </p>
                          </div>
                          {evento.comentario && (
                            <p className="text-sm text-muted-foreground">{evento.comentario}</p>
                          )}
                          {evento.user && (
                            <p className="text-xs text-muted-foreground mt-1">Por: {evento.user.name}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal cambiar estado */}
      <Dialog open={modalCambiarEstado} onOpenChange={(o) => !actualizando && setModalCambiarEstado(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Estado del Pedido</DialogTitle>
            <DialogDescription>{pedido.codigo}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nuevo Estado</Label>
              <Select value={nuevoEstado} onValueChange={(v: any) => setNuevoEstado(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {transicionesDisponibles.map((t) => (
                    <SelectItem key={t} value={t}>{estadoConfig[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {transicionesDisponibles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay transiciones disponibles desde el estado actual.
                </p>
              )}
            </div>

            {nuevoEstado === 'en_transito' && (
              <div className="space-y-2">
                <Label htmlFor="num-guia">Número de guía</Label>
                <Input
                  id="num-guia"
                  placeholder="Ej: TRK123 · Servientrega"
                  value={numeroGuia}
                  onChange={(e) => setNumeroGuia(e.target.value)}
                />
              </div>
            )}

            {(nuevoEstado === 'confirmado' || nuevoEstado === 'en_transito') && (
              <div className="space-y-2">
                <Label htmlFor="fecha-estimada">Fecha estimada de entrega</Label>
                <Input
                  id="fecha-estimada"
                  type="date"
                  min={hoyISO}
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Puede ser hoy mismo si la entrega es del día.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={prioridadNueva} onValueChange={(v: any) => setPrioridadNueva(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin cambio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado de pago</Label>
                <Select value={estadoPagoNuevo} onValueChange={(v: any) => setEstadoPagoNuevo(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin cambio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="pagado">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Textarea
                placeholder="Agregar observaciones sobre el cambio de estado..."
                value={notaEstado}
                onChange={(e) => setNotaEstado(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCambiarEstado(false)} disabled={actualizando}>
              Cancelar
            </Button>
            <Button onClick={cambiarEstado} disabled={actualizando || !nuevoEstado}>
              {actualizando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal confirmar pago */}
      <Dialog open={modalPago} onOpenChange={(o) => !marcandoPago && setModalPago(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar pago recibido</DialogTitle>
            <DialogDescription>
              Marca este pedido como pagado. El cliente verá el cambio en su portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalPago(false)} disabled={marcandoPago}>
              Cancelar
            </Button>
            <Button onClick={marcarComoPagado} disabled={marcandoPago}>
              {marcandoPago && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
