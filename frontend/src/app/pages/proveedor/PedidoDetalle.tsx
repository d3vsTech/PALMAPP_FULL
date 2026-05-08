import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
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
  ChefHat, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  proveedorApi, toNumber, buildImagenUrl, TRANSICIONES_VALIDAS,
  type PedidoProv, type EstadoPedidoProv,
} from '../../../api/proveedor';
import { formatFecha, formatFechaHora } from '../../utils/fecha';

const estadoConfig: Record<EstadoPedidoProv, { label: string; className: string; icon: any }> = {
  pendiente:   { label: 'Pendiente',     className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',   icon: Clock },
  confirmado:  { label: 'Confirmado',    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',     icon: CheckCircle },
  preparando:  { label: 'Preparando',    className: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: ChefHat },
  en_transito: { label: 'En Tránsito',   className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',     icon: Truck },
  entregado:   { label: 'Entregado',     className: 'bg-success/10 text-success border-success/20',         icon: PackageCheck },
  cancelado:   { label: 'Cancelado',     className: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export default function PedidoDetalleProveedor() {
  const navigate = useNavigate();
  const { id: codigo } = useParams();

  const [pedido, setPedido] = useState<PedidoProv | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState('detalles');

  const [modalCambiarEstado, setModalCambiarEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState<EstadoPedidoProv | ''>('');
  const [notaEstado, setNotaEstado] = useState('');
  const [actualizando, setActualizando] = useState(false);

  const cargar = () => {
    if (!codigo) return;
    setCargando(true);
    proveedorApi.pedido(codigo)
      .then((res) => setPedido(res.data))
      .catch((e: any) => {
        toast.error(e?.message ?? 'Pedido no encontrado');
        navigate('/proveedor/pedidos');
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [codigo]);

  const cambiarEstado = async () => {
    if (!codigo || !nuevoEstado) {
      toast.error('Selecciona un estado');
      return;
    }
    setActualizando(true);
    try {
      await proveedorApi.cambiarEstadoPedido(codigo, nuevoEstado as EstadoPedidoProv, notaEstado.trim() || undefined);
      toast.success('Estado actualizado');
      setModalCambiarEstado(false);
      setNuevoEstado('');
      setNotaEstado('');
      cargar();
    } catch (e: any) {
      const code = e?.code;
      if (code === 'TRANSICION_INVALIDA') {
        toast.error('No se puede hacer esa transición desde el estado actual');
      } else {
        toast.error(e?.message ?? 'Error al cambiar estado');
      }
    } finally {
      setActualizando(false);
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
  const transiciones = TRANSICIONES_VALIDAS[pedido.estado] ?? [];
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${config.className} text-base px-3 py-1`}>
            <EstadoIcon className="h-4 w-4 mr-2" />
            {config.label}
          </Badge>
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

                      {pedido.tenant.telefono && (
                        <div className="flex items-start gap-3">
                          <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Teléfono</p>
                            <p className="font-medium">{pedido.tenant.telefono}</p>
                          </div>
                        </div>
                      )}

                      {pedido.tenant.email && (
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{pedido.tenant.email}</p>
                          </div>
                        </div>
                      )}

                      {pedido.direccion_entrega && (
                        <div className="flex items-start gap-3">
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
              {pedido.metodo_pago && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Información de Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Método de pago</p>
                          <p className="font-medium">{pedido.metodo_pago}</p>
                        </div>
                      </div>
                    </div>
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

              {/* Fechas */}
              <Card>
                <CardHeader>
                  <CardTitle>Fechas Importantes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de creación</p>
                      <p className="font-medium">{formatFechaHora(pedido.fecha_pedido)}</p>
                    </div>
                  </div>
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

              {/* Acciones */}
              {transiciones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Acciones</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full gap-2"
                      onClick={() => {
                        setNuevoEstado('');
                        setNotaEstado('');
                        setModalCambiarEstado(true);
                      }}
                    >
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
                      <div key={evento.id} className="flex gap-4">
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
        <DialogContent>
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
                  {transiciones.map((t) => (
                    <SelectItem key={t} value={t}>{estadoConfig[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {transiciones.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay transiciones disponibles desde el estado actual.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nota (Opcional)</Label>
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
              Actualizar Estado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
