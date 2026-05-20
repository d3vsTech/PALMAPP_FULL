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
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '../../components/ui/tooltip';
import {
  ShoppingCart, Search, Package, CheckCircle, Clock, Eye, Truck, XCircle,
  PackageCheck, Calendar, ArrowUpDown, Loader2, ChefHat, FileText, Download,
  AlertTriangle, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  proveedorApi, toNumber, descargarBlob,
  type PedidoProv, type EstadoPedidoProv, type TabPedidosProv,
  type PedidosStatsProv, type AccionPedidoProv,
  type EstadoPagoPedidoProv, type PrioridadPedidoProv,
  type CambiarEstadoPedidoPayload,
} from '../../../api/proveedor';
import { formatFecha } from '../../utils/fecha';
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

type AccionModal = 'confirmar' | 'despachar' | 'cancelar';

export default function ProveedorPedidos() {
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<PedidoProv[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [stats, setStats] = useState<PedidosStatsProv | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPedidoProv | 'todos'>('todos');
  const [tab, setTab] = useState<TabPedidosProv>('todos');
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);

  const [modalAccion, setModalAccion] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<PedidoProv | null>(null);
  const [accionTipo, setAccionTipo] = useState<AccionModal | null>(null);
  const [comentario, setComentario] = useState('');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [enviandoAccion, setEnviandoAccion] = useState(false);

  /**
   * `silent=true` para refrescos en background (polling/focus): no toca el
   * spinner ni muestra toasts de error, así la lista no parpadea cuando la
   * finca crea un nuevo pedido mientras el proveedor está mirando.
   */
  const cargar = (silent = false) => {
    if (!silent) setCargando(true);
    proveedorApi.pedidos({
      tab,
      estado: estadoFiltro === 'todos' ? undefined : estadoFiltro,
      buscar: busqueda.trim() || undefined,
      page,
    })
      .then((res) => { setPedidos(res.data); setMeta(res.meta); setStats(res.stats); })
      .catch((e: any) => { if (!silent) toast.error(e?.message ?? 'Error al cargar pedidos'); })
      .finally(() => { if (!silent) setCargando(false); });
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, estadoFiltro, busqueda, page]);

  // Auto-sincronización con el lado finca. Pausamos mientras hay modal de
  // acción abierto para no pisar los datos que el usuario está editando.
  useAutoRefresh(() => cargar(true), 20_000, !modalAccion);

  // Debounce búsqueda 350 ms para no spammear el backend en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      if (busquedaInput !== busqueda) {
        setPage(1);
        setBusqueda(busquedaInput);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaInput]);

  /** YYYY-MM-DD en zona local (no UTC) para `<input type="date">`. */
  const hoyISO = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const abrirModalAccion = (pedido: PedidoProv, tipo: AccionModal) => {
    setPedidoSeleccionado(pedido);
    setAccionTipo(tipo);
    setComentario('');
    setNumeroGuia(pedido.numero_guia ?? '');
    // Default a HOY si no había fecha previa: la entrega del mismo día es válida.
    setFechaEntrega(pedido.fecha_entrega_estimada?.slice(0, 10) ?? hoyISO);
    setModalAccion(true);
  };

  const ejecutarAccion = async () => {
    if (!pedidoSeleccionado || !accionTipo) return;

    const nuevoEstado: EstadoPedidoProv =
      accionTipo === 'confirmar' ? 'confirmado'
        : accionTipo === 'despachar' ? 'en_transito'
          : 'cancelado';

    if (accionTipo === 'cancelar' && !comentario.trim()) {
      toast.error('Por favor indica el motivo de la cancelación');
      return;
    }

    const payload: CambiarEstadoPedidoPayload = {
      estado: nuevoEstado,
      comentario: comentario.trim() || undefined,
    };
    if (accionTipo === 'confirmar' && fechaEntrega) {
      payload.fecha_entrega_estimada = fechaEntrega;
    }
    if (accionTipo === 'despachar') {
      if (numeroGuia.trim()) payload.numero_guia = numeroGuia.trim();
      if (fechaEntrega) payload.fecha_entrega_estimada = fechaEntrega;
    }

    setEnviandoAccion(true);
    try {
      await proveedorApi.cambiarEstadoPedido(pedidoSeleccionado.codigo, payload);
      toast.success(`Pedido ${pedidoSeleccionado.codigo} actualizado`);
      setModalAccion(false);
      cargar();
    } catch (e: any) {
      if (e?.code === 'TRANSICION_INVALIDA') {
        toast.error(e.message ?? 'Transición de estado no permitida');
      } else {
        toast.error(e?.message ?? 'Error al cambiar estado');
      }
    } finally {
      setEnviandoAccion(false);
    }
  };

  /** Avance directo (preparar, entregar) sin abrir modal. */
  const cambiarEstadoDirecto = async (pedido: PedidoProv, nuevoEstado: EstadoPedidoProv) => {
    try {
      await proveedorApi.cambiarEstadoPedido(pedido.codigo, { estado: nuevoEstado });
      toast.success(`Estado actualizado a "${estadoConfig[nuevoEstado].label}"`);
      cargar();
    } catch (e: any) {
      if (e?.code === 'TRANSICION_INVALIDA') {
        toast.error(e.message ?? 'Transición no permitida');
      } else {
        toast.error(e?.message ?? 'Error al cambiar estado');
      }
    }
  };

  const descargarFactura = async (pedido: PedidoProv) => {
    try {
      const blob = await proveedorApi.descargarFactura(pedido.codigo);
      descargarBlob(blob, `Factura-${pedido.codigo}.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo descargar la factura');
    }
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const blob = await proveedorApi.exportarPedidos({
        tab,
        estado: estadoFiltro === 'todos' ? undefined : estadoFiltro,
        buscar: busqueda.trim() || undefined,
      });
      const fecha = new Date().toISOString().slice(0, 10);
      descargarBlob(blob, `Pedidos-${fecha}.xlsx`);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo exportar');
    } finally {
      setExportando(false);
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

  const getPrioridadBadge = (p?: PrioridadPedidoProv) => {
    if (!p || p === 'normal') return null;
    const cfg = prioridadConfig[p];
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={cfg.className}>
        <Icon className="h-3 w-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const getPagoBadge = (estado?: EstadoPagoPedidoProv) => {
    if (!estado) return null;
    const cfg = pagoConfig[estado];
    return (
      <Badge variant="outline" className={cfg.className}>
        {cfg.label}
      </Badge>
    );
  };

  /**
   * Render de CTAs basado en `acciones_disponibles` del backend (§13) con
   * fallback robusto a la máquina de estados (§5).
   *
   * Reglas:
   * - El backend manda claves conocidas → respetamos lo que dice (filtra).
   * - El backend manda claves desconocidas o array vacío → usamos la máquina
   *   de estados para que el botón aparezca igual. Esto cubre backends que
   *   usan otros nombres (`confirmar_entrega` vs `entregar`) o que olvidan
   *   poblar el campo en algunos estados.
   */
  const renderAccionesPedido = (pedido: PedidoProv) => {
    const ACCIONES_FALLBACK: Record<EstadoPedidoProv, AccionPedidoProv[]> = {
      pendiente:   ['confirmar', 'rechazar'],
      confirmado:  ['preparar'],
      preparando:  ['despachar'],
      en_transito: ['entregar'],
      entregado:   [],
      cancelado:   [],
    };
    const KNOWN: AccionPedidoProv[] = ['confirmar', 'rechazar', 'preparar', 'despachar', 'entregar'];
    const backendAcciones = pedido.acciones_disponibles ?? [];
    const tieneClavesConocidas = backendAcciones.some(a => KNOWN.includes(a as AccionPedidoProv));
    const acciones: AccionPedidoProv[] = tieneClavesConocidas
      ? backendAcciones
      : (ACCIONES_FALLBACK[pedido.estado] ?? []);
    if (acciones.length === 0) return null;

    return (
      <>
        {acciones.includes('confirmar') && (
          <Button size="sm" onClick={() => abrirModalAccion(pedido, 'confirmar')} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Confirmar Pedido
          </Button>
        )}
        {acciones.includes('rechazar') && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => abrirModalAccion(pedido, 'cancelar')}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <XCircle className="h-4 w-4" />
            Rechazar
          </Button>
        )}
        {acciones.includes('preparar') && (
          <Button size="sm" onClick={() => cambiarEstadoDirecto(pedido, 'preparando')} className="gap-2">
            <ChefHat className="h-4 w-4" />
            Iniciar Preparación
          </Button>
        )}
        {acciones.includes('despachar') && (
          <Button size="sm" onClick={() => abrirModalAccion(pedido, 'despachar')} className="gap-2">
            <Truck className="h-4 w-4" />
            Despachar
          </Button>
        )}
        {acciones.includes('entregar') && (
          <Button
            size="sm"
            onClick={() => cambiarEstadoDirecto(pedido, 'entregado')}
            className="gap-2 bg-success hover:bg-success/90"
          >
            <CheckCircle className="h-4 w-4" />
            Confirmar Entrega
          </Button>
        )}
      </>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Pedidos</h1>
          <p className="text-muted-foreground mt-1">Administra y procesa los pedidos de tus clientes</p>
        </div>
        <Button variant="outline" onClick={exportarExcel} disabled={exportando} className="gap-2">
          {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar Excel
        </Button>
      </div>

      {/* KPIs (vienen agregados del backend, no del listado) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Por Confirmar</p>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-3xl font-bold">{stats?.por_confirmar ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Requieren acción</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Activos</p>
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold">{stats?.activos ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">En proceso</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">En Tránsito</p>
              <Truck className="h-4 w-4 text-cyan-600" />
            </div>
            <p className="text-3xl font-bold">{stats?.en_transito ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">En camino</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Completados</p>
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <p className="text-3xl font-bold">{stats?.completados ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Entregados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Ventas del mes</p>
              <ArrowUpDown className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">
              {(() => {
                const v = stats?.ventas_mes ?? 0;
                return v >= 1_000_000
                  ? `$${(v / 1_000_000).toFixed(1)}M`
                  : `$${v.toLocaleString('es-CO')}`;
              })()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Entregados en el mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs (server-side) */}
      <Tabs value={tab} onValueChange={(v: any) => { setTab(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="por_confirmar">
            Por Confirmar
            {(stats?.por_confirmar ?? 0) > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white">{stats?.por_confirmar}</Badge>
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
                  value={busquedaInput}
                  onChange={(e) => setBusquedaInput(e.target.value)}
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
          {pedidos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No se encontraron pedidos</p>
              </CardContent>
            </Card>
          ) : (
            pedidos.map((pedido) => (
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
                          {getPrioridadBadge(pedido.prioridad)}
                          {getPagoBadge(pedido.estado_pago)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatFecha(pedido.fecha_pedido)}
                          </span>
                          <span>·</span>
                          <span>{pedido.tenant?.nombre ?? 'Cliente'}</span>
                          {pedido.numero_guia && (
                            <>
                              <span>·</span>
                              <span>Guía: {pedido.numero_guia}</span>
                            </>
                          )}
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

                  {/* Resumen de productos (campo del backend, evita N requests). */}
                  {(pedido.productos_resumen || pedido.items?.length > 0) && (
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-muted-foreground mb-1">Productos:</p>
                      {pedido.productos_resumen ? (
                        <p className="text-sm">{pedido.productos_resumen}</p>
                      ) : (
                        pedido.items.map((item, i) => (
                          <p key={i} className="text-sm">
                            {item.cantidad}x {item.nombre_producto}
                          </p>
                        ))
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex gap-2 flex-wrap">
                      {renderAccionesPedido(pedido)}
                    </div>

                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => descargarFactura(pedido)}
                            className="h-9 w-9"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Descargar factura PDF</TooltipContent>
                      </Tooltip>
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
                  </div>
                </CardContent>
              </Card>
            ))
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
              {accionTipo === 'despachar' && 'Despachar Pedido'}
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
                  <Label htmlFor="fecha-entrega">Fecha estimada de entrega</Label>
                  <Input
                    id="fecha-entrega"
                    type="date"
                    min={hoyISO}
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Puede ser hoy mismo. Se mostrará al cliente y queda en el historial.
                  </p>
                </div>
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

            {accionTipo === 'despachar' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="guia">Número de guía</Label>
                  <Input
                    id="guia"
                    placeholder="Ej: TRK123 · Servientrega"
                    value={numeroGuia}
                    onChange={(e) => setNumeroGuia(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha-entrega-desp">Fecha estimada de entrega</Label>
                  <Input
                    id="fecha-entrega-desp"
                    type="date"
                    min={hoyISO}
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Puede ser hoy mismo si el despacho es del día.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comentario-desp">Comentario (opcional)</Label>
                  <Textarea
                    id="comentario-desp"
                    placeholder="Agrega detalles del envío"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
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
    </TooltipProvider>
  );
}
