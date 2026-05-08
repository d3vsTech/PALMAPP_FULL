import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
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
  Tabs, TabsList, TabsTrigger,
} from '../../components/ui/tabs';
import {
  ShoppingCart, Search, Package, CheckCircle, Clock, Eye, Truck, XCircle,
  PackageCheck, Calendar, ArrowUpDown, Loader2, ChefHat,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  proveedorApi, toNumber, TRANSICIONES_VALIDAS,
  type PedidoProv, type EstadoPedidoProv,
} from '../../../api/proveedor';
import { formatFecha } from '../../utils/fecha';

type Vista = 'todos' | 'por-confirmar' | 'activos' | 'completados';

const estadoConfig: Record<EstadoPedidoProv, { label: string; className: string; icon: any }> = {
  pendiente:   { label: 'Pendiente',     className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',   icon: Clock },
  confirmado:  { label: 'Confirmado',    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',     icon: CheckCircle },
  preparando:  { label: 'Preparando',    className: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: ChefHat },
  en_transito: { label: 'En Tránsito',   className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',     icon: Truck },
  entregado:   { label: 'Entregado',     className: 'bg-success/10 text-success border-success/20',         icon: PackageCheck },
  cancelado:   { label: 'Cancelado',     className: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export default function ProveedorPedidos() {
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<PedidoProv[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPedidoProv | 'todos'>('todos');
  const [vistaActiva, setVistaActiva] = useState<Vista>('todos');
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(true);

  const [modalAccion, setModalAccion] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<PedidoProv | null>(null);
  const [accionTipo, setAccionTipo] = useState<'confirmar' | 'enviar' | 'cancelar' | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviandoAccion, setEnviandoAccion] = useState(false);

  const cargar = () => {
    setCargando(true);
    proveedorApi.pedidos({
      estado: estadoFiltro === 'todos' ? undefined : estadoFiltro,
      page,
    })
      .then((res) => { setPedidos(res.data); setMeta(res.meta); })
      .catch((e: any) => toast.error(e?.message ?? 'Error al cargar pedidos'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro, page]);

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const cumpleBusqueda =
      pedido.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (pedido.tenant?.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase());

    let cumpleVista = true;
    if (vistaActiva === 'por-confirmar') cumpleVista = pedido.estado === 'pendiente';
    else if (vistaActiva === 'activos') cumpleVista = !['entregado', 'cancelado'].includes(pedido.estado);
    else if (vistaActiva === 'completados') cumpleVista = ['entregado', 'cancelado'].includes(pedido.estado);

    return cumpleBusqueda && cumpleVista;
  });

  const abrirModalAccion = (pedido: PedidoProv, tipo: 'confirmar' | 'enviar' | 'cancelar') => {
    setPedidoSeleccionado(pedido);
    setAccionTipo(tipo);
    setComentario('');
    setModalAccion(true);
  };

  const ejecutarAccion = async () => {
    if (!pedidoSeleccionado || !accionTipo) return;

    const nuevoEstado: EstadoPedidoProv =
      accionTipo === 'confirmar' ? 'confirmado'
        : accionTipo === 'enviar' ? 'en_transito'
          : 'cancelado';

    if (accionTipo === 'cancelar' && !comentario.trim()) {
      toast.error('Por favor indica el motivo de la cancelación');
      return;
    }

    setEnviandoAccion(true);
    try {
      await proveedorApi.cambiarEstadoPedido(pedidoSeleccionado.codigo, nuevoEstado, comentario.trim() || undefined);
      toast.success(`Pedido ${pedidoSeleccionado.codigo} actualizado`);
      setModalAccion(false);
      cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cambiar estado');
    } finally {
      setEnviandoAccion(false);
    }
  };

  const cambiarEstadoDirecto = async (pedido: PedidoProv, nuevoEstado: EstadoPedidoProv) => {
    try {
      await proveedorApi.cambiarEstadoPedido(pedido.codigo, nuevoEstado);
      toast.success(`Estado actualizado a "${estadoConfig[nuevoEstado].label}"`);
      cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cambiar estado');
    }
  };

  const getEstadoBadge = (estado: EstadoPedidoProv) => {
    const config = estadoConfig[estado];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const estadisticas = {
    porConfirmar: pedidos.filter((p) => p.estado === 'pendiente').length,
    activos: pedidos.filter((p) => !['entregado', 'cancelado'].includes(p.estado)).length,
    enTransito: pedidos.filter((p) => p.estado === 'en_transito').length,
    completados: pedidos.filter((p) => p.estado === 'entregado').length,
    totalVentas: pedidos
      .filter((p) => p.estado === 'entregado')
      .reduce((sum, p) => sum + toNumber(p.total), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gestión de Pedidos</h1>
        <p className="text-muted-foreground mt-1">Administra y procesa los pedidos de tus clientes</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Por Confirmar</p>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-3xl font-bold">{estadisticas.porConfirmar}</p>
            <p className="text-xs text-muted-foreground mt-1">Requieren acción</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Activos</p>
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold">{estadisticas.activos}</p>
            <p className="text-xs text-muted-foreground mt-1">En proceso</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">En Tránsito</p>
              <Truck className="h-4 w-4 text-cyan-600" />
            </div>
            <p className="text-3xl font-bold">{estadisticas.enTransito}</p>
            <p className="text-xs text-muted-foreground mt-1">En camino</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Completados</p>
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <p className="text-3xl font-bold">{estadisticas.completados}</p>
            <p className="text-xs text-muted-foreground mt-1">Entregados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Ventas</p>
              <ArrowUpDown className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">
              {estadisticas.totalVentas >= 1_000_000
                ? `$${(estadisticas.totalVentas / 1_000_000).toFixed(1)}M`
                : `$${estadisticas.totalVentas.toLocaleString('es-CO')}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total entregado</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de vistas */}
      <Tabs value={vistaActiva} onValueChange={(v: any) => setVistaActiva(v)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="por-confirmar">
            Por Confirmar
            {estadisticas.porConfirmar > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white">{estadisticas.porConfirmar}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activos">Activos</TabsTrigger>
          <TabsTrigger value="completados">Completados</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código o cliente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Select
                value={estadoFiltro}
                onValueChange={(v) => { setEstadoFiltro(v as any); setPage(1); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="preparando">Preparando</SelectItem>
                  <SelectItem value="en_transito">En Tránsito</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de pedidos */}
      {cargando ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando pedidos...
        </div>
      ) : (
        <div className="space-y-3">
          {pedidosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No se encontraron pedidos</p>
              </CardContent>
            </Card>
          ) : (
            pedidosFiltrados.map((pedido) => {
              const transiciones = TRANSICIONES_VALIDAS[pedido.estado] ?? [];
              return (
                <Card key={pedido.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {/* Header del pedido */}
                    <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <ShoppingCart className="h-5 w-5 text-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold">{pedido.codigo}</h3>
                            {getEstadoBadge(pedido.estado)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatFecha(pedido.fecha_pedido)}
                            </span>
                            <span>·</span>
                            <span>{pedido.tenant?.nombre ?? 'Cliente'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">${toNumber(pedido.total).toLocaleString('es-CO')}</p>
                        {pedido.metodo_pago && (
                          <p className="text-xs text-muted-foreground">{pedido.metodo_pago}</p>
                        )}
                      </div>
                    </div>

                    {/* Productos resumidos */}
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-muted-foreground mb-1">Productos:</p>
                      {pedido.items.map((item, index) => (
                        <p key={index} className="text-sm">
                          {item.cantidad}x {item.nombre_producto}
                        </p>
                      ))}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex gap-2 flex-wrap">
                        {pedido.estado === 'pendiente' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => abrirModalAccion(pedido, 'confirmar')}
                              className="gap-2"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Confirmar Pedido
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalAccion(pedido, 'cancelar')}
                              className="gap-2 text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                              Cancelar
                            </Button>
                          </>
                        )}
                        {pedido.estado === 'confirmado' && transiciones.includes('preparando') && (
                          <Button
                            size="sm"
                            onClick={() => cambiarEstadoDirecto(pedido, 'preparando')}
                            className="gap-2"
                          >
                            <ChefHat className="h-4 w-4" />
                            Iniciar Preparación
                          </Button>
                        )}
                        {pedido.estado === 'preparando' && (
                          <Button
                            size="sm"
                            onClick={() => abrirModalAccion(pedido, 'enviar')}
                            className="gap-2"
                          >
                            <Truck className="h-4 w-4" />
                            Despachar
                          </Button>
                        )}
                        {pedido.estado === 'en_transito' && (
                          <Button
                            size="sm"
                            onClick={() => cambiarEstadoDirecto(pedido, 'entregado')}
                            className="gap-2 bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Confirmar Entrega
                          </Button>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/proveedor/pedidos/${pedido.codigo}`)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Paginación */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Página {meta.current_page} de {meta.last_page} · {meta.total} pedidos
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.current_page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                  disabled={meta.current_page === meta.last_page}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de acciones */}
      <Dialog open={modalAccion} onOpenChange={(o) => !enviandoAccion && setModalAccion(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accionTipo === 'confirmar' && 'Confirmar Pedido'}
              {accionTipo === 'enviar' && 'Despachar Pedido'}
              {accionTipo === 'cancelar' && 'Cancelar Pedido'}
            </DialogTitle>
            <DialogDescription>
              {pedidoSeleccionado?.codigo} · {pedidoSeleccionado?.tenant?.nombre ?? 'Cliente'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {accionTipo === 'confirmar' && (
              <>
                <p className="text-sm text-muted-foreground">
                  ¿Confirmas que puedes procesar este pedido? El cliente será notificado.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="comentario">Comentario (opcional)</Label>
                  <Textarea
                    id="comentario"
                    placeholder="Agrega un mensaje para el cliente"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}

            {accionTipo === 'enviar' && (
              <div className="space-y-2">
                <Label htmlFor="guia">Información del envío (opcional)</Label>
                <Input
                  id="guia"
                  placeholder="Ej: Guía TRK123 · Servientrega"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Se registrará en el historial del pedido.
                </p>
              </div>
            )}

            {accionTipo === 'cancelar' && (
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo de la cancelación *</Label>
                <Textarea
                  id="motivo"
                  placeholder="Explica por qué cancelas este pedido..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAccion(false)} disabled={enviandoAccion}>
              Cancelar
            </Button>
            <Button onClick={ejecutarAccion} disabled={enviandoAccion}>
              {enviandoAccion && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
