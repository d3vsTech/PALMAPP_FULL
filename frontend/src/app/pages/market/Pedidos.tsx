import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Clock, PackageCheck, Wallet, ChevronRight, Loader2, Ban } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import { EstadoPedidoBadge } from '../../components/market/piezas';
import { cop } from '../../lib/formato';
import { toast } from 'sonner';
import {
  marketApi, toNumber, MarketErrorCodes,
  type Pedido, type EstadoPedido, type PedidoStats,
} from '../../../api/market';
import { pagosApi, ESTADO_PAGO_LABEL, type EstadoPago } from '../../../api/pagos';
import { formatFecha } from '../../utils/fecha';

export default function Pedidos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [stats, setStats] = useState<PedidoStats | null>(null);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | 'todos'>('todos');
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(true);
  /** Estado de pago por código de pedido. Alimenta el badge que aparece
   *  al lado del estado logístico. Se hidrata solo para los pedidos que
   *  usan `epayco` (los otros métodos no tienen pasarela).
   *
   *  Optimización: los estados terminales (`pagado`, `rechazado`, `fallido`)
   *  no vuelven a consultarse — solo re-consultamos los que están en
   *  `pendiente` o `procesando` (que sí pueden cambiar por el webhook). */
  const [estadosPago, setEstadosPago] = useState<Map<string, EstadoPago>>(new Map());
  /** Ref con el snapshot más reciente del mapa — para leer dentro de
   *  `cargar` sin meter estadosPago en las dependencias del useCallback. */
  const estadosPagoRef = useRef<Map<string, EstadoPago>>(new Map());
  useEffect(() => { estadosPagoRef.current = estadosPago; }, [estadosPago]);

  /** Diálogo de cancelación (§5.3). Se abre al hacer click en el botón
   *  "Cancelar" de la fila. `pedidoACancelar` guarda el código; motivo
   *  opcional; `cancelando` bloquea el diálogo mientras se ejecuta. */
  const [pedidoACancelar, setPedidoACancelar] = useState<string | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);

  /** Stale-guard: si cambian filtro/página mientras hay una petición en
   *  vuelo, la respuesta vieja no debe pisar a la nueva. */
  const reqIdRef = useRef(0);

  /**
   * Carga la página actual. Aceptamos `silent=true` para los refrescos en
   * segundo plano (polling / focus): no mostramos el spinner, así la lista
   * no parpadea cuando el proveedor cambia un estado del otro lado.
   */
  const cargar = (silent = false) => {
    const reqId = ++reqIdRef.current;
    if (!silent) setCargando(true);
    marketApi.pedidos({
      estado: filtroEstado === 'todos' ? undefined : filtroEstado,
      page,
    })
      .then(async (res) => {
        if (reqId !== reqIdRef.current) return;
        setPedidos(res.data);
        setStats(res.stats);
        setMeta(res.meta);

        // Hidratar estado de pago solo la primera vez que vemos el pedido.
        // Los auto-refresh silenciosos no vuelven a consultar — para ver el
        // estado actualizado, el usuario refresca (F5) o entra al detalle
        // del pedido (esa pantalla tiene su propio polling).
        const cache = estadosPagoRef.current;
        const objetivos = (res.data ?? []).filter((p: any) => {
          if (p.metodo_pago !== 'epayco') return false;
          return !cache.has(p.codigo);
        });
        if (objetivos.length === 0) return;
        const entries = await Promise.all(
          objetivos.map(async (p) => {
            try {
              const r = await pagosApi.estado(p.codigo);
              return [p.codigo, r.data.estado_pago] as const;
            } catch {
              return null;
            }
          }),
        );
        // Si la lista cambió mientras consultábamos pagos, estos estados
        // corresponden a pedidos viejos: no aplicarlos.
        if (reqId !== reqIdRef.current) return;
        const nuevos = new Map(estadosPagoRef.current);
        (entries.filter(Boolean) as Array<readonly [string, EstadoPago]>).forEach(([codigo, estado]) => {
          nuevos.set(codigo, estado);
        });
        setEstadosPago(nuevos);
      })
      .catch((e: any) => {
        if (reqId !== reqIdRef.current) return;
        if (!silent) toast.error(e?.message ?? 'Error al cargar pedidos');
      })
      .finally(() => { if (!silent && reqId === reqIdRef.current) setCargando(false); });
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, page]);

  // Se eliminó el auto-refresh periódico — los pedidos no cambian tanto
  // como para justificar un polling constante. El usuario puede recargar
  // con F5 o navegar de nuevo a la pantalla si quiere ver actualizaciones.

  /**
   * Si ePayco cayó en el fallback (`response_url` del backend), aterrizamos
   * aquí con `x_extra1` en la URL. Redirigimos al detalle del pedido —
   * allí ya hay polling al backend y se muestra el estado real del pago.
   */
  useEffect(() => {
    const codigo = searchParams.get('x_extra1');
    if (!codigo) return;
    navigate(`/market/pedidos/${codigo}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /** Cancelable según §5.3: estado ∈ {pendiente,confirmado,preparando,en_transito}
   *  y estado_pago ∉ {pagado, procesando}. */
  const esCancelable = (p: Pedido): boolean => {
    if (p.estado === 'entregado' || p.estado === 'cancelado') return false;
    const ep = estadosPago.get(p.codigo);
    if (ep === 'pagado' || ep === 'procesando') return false;
    return true;
  };

  const ejecutarCancelacion = async () => {
    if (!pedidoACancelar) return;
    setCancelando(true);
    try {
      await marketApi.cancelarPedido(pedidoACancelar, motivoCancelacion.trim() || undefined);
      toast.success('Pedido cancelado correctamente');
      setPedidoACancelar(null);
      setMotivoCancelacion('');
      cargar();
    } catch (err: any) {
      const code = err?.code ?? err?.error_code;
      if (code === MarketErrorCodes.PEDIDO_YA_CANCELADO) {
        toast.info('El pedido ya está cancelado');
        setPedidoACancelar(null);
        cargar();
      } else if (code === MarketErrorCodes.PAGO_YA_APROBADO) {
        toast.error('No se puede cancelar: el pago ya fue aprobado');
      } else if (code === MarketErrorCodes.PAGO_EN_PROCESO) {
        toast.error('Hay un pago en curso. Espera a que se resuelva.');
      } else if (code === MarketErrorCodes.PEDIDO_NO_CANCELABLE) {
        toast.error('Este pedido ya no se puede cancelar');
      } else {
        toast.error(err?.message ?? 'No se pudo cancelar el pedido');
      }
    } finally {
      setCancelando(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/market"
        eyebrow="Tienda de insumos"
        title="Mis pedidos"
        description="Seguimiento de las compras de insumos de la finca."
        actions={<Button variant="outline" onClick={() => navigate('/market')}>Ir al catálogo</Button>}
      />

      <StatStrip
        loading={cargando}
        items={[
          { label: 'Pedidos activos', value: stats?.pedidos_activos ?? 0, note: 'en proceso', icon: Clock, tone: 'amber' },
          { label: 'Entregados', value: stats?.pedidos_entregados ?? 0, note: 'completados', icon: PackageCheck, tone: 'green' },
          { label: 'Total comprado', value: cop(stats?.total_gastado ?? 0), note: 'acumulado', icon: Wallet, tone: 'green' },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2>Pedidos</h2>
        <Select
          value={filtroEstado}
          onValueChange={(val) => { setFiltroEstado(val as EstadoPedido | 'todos'); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="preparando">En preparación</SelectItem>
            <SelectItem value="en_transito">En camino</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {cargando ? (
        <Card className="items-center py-14 text-center">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Cargando pedidos...
          </p>
        </Card>
      ) : pedidos.length === 0 ? (
        <Card className="items-center py-14 text-center">
          <div className="space-y-1">
            <h3>No hay pedidos</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              {filtroEstado === 'todos'
                ? 'Todavía no has hecho ningún pedido.'
                : 'Ningún pedido tiene el estado seleccionado.'}
            </p>
          </div>
          {filtroEstado !== 'todos' && (
            <Button variant="outline" onClick={() => setFiltroEstado('todos')}>Ver todos los pedidos</Button>
          )}
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[13px] font-medium text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">Pedido</th>
                  <th className="hidden px-4 py-2.5 text-left font-semibold md:table-cell">Proveedor</th>
                  <th className="hidden px-4 py-2.5 text-left font-semibold lg:table-cell">Productos</th>
                  <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Estado</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                  <th className="px-2 py-2.5 text-right font-semibold">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pedidos.map((pedido) => {
                  const pago = estadosPago.get(pedido.codigo);
                  const etiquetaPago = pago && pago !== 'pendiente' ? ESTADO_PAGO_LABEL[pago] : null;
                  return (
                    <tr key={pedido.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-5 py-3 align-top">
                        <Link
                          to={`/market/pedidos/${pedido.codigo}`}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {pedido.codigo}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{formatFecha(pedido.fecha_pedido)}</span>
                        <span className="mt-1 block text-xs text-muted-foreground md:hidden">
                          {pedido.proveedor.nombre_empresa}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <EstadoPedidoBadge estado={pedido.estado} className="sm:hidden" />
                          {etiquetaPago && (
                            <Badge variant="outline" className={etiquetaPago.color}>{etiquetaPago.label}</Badge>
                          )}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 align-top md:table-cell">{pedido.proveedor.nombre_empresa}</td>
                      <td className="hidden px-4 py-3 align-top lg:table-cell">
                        <ul className="space-y-0.5 text-muted-foreground">
                          {pedido.items.map((prod, i) => (
                            <li key={i} className="line-clamp-2">
                              <span className="font-medium tabular-nums text-foreground">{prod.cantidad}×</span>{' '}
                              {prod.nombre_producto}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="hidden px-4 py-3 align-top sm:table-cell">
                        <EstadoPedidoBadge estado={pedido.estado} />
                      </td>
                      <td className="px-4 py-3 text-right align-top font-semibold tabular-nums">
                        {cop(toNumber(pedido.total))}
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="flex items-center justify-end gap-0.5">
                          {esCancelable(pedido) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Cancelar pedido ${pedido.codigo}`}
                              title="Cancelar pedido"
                              className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                              onClick={() => setPedidoACancelar(pedido.codigo)}
                            >
                              <Ban strokeWidth={2} />
                            </Button>
                          )}
                          <Link
                            to={`/market/pedidos/${pedido.codigo}`}
                            aria-label={`Ver pedido ${pedido.codigo}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <ChevronRight className="h-4 w-4" strokeWidth={2} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      {/* Diálogo de cancelación (§5.3). Reusa el mismo patrón que la
          pantalla de detalle para consistencia. */}
      <AlertDialog
        open={!!pedidoACancelar}
        onOpenChange={(o) => { if (!cancelando && !o) setPedidoACancelar(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Cancelar pedido {pedidoACancelar}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará el pedido y repondrá el stock automáticamente.
              No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="pedidos-motivo-opcional">Motivo (opcional)</label>
            <Textarea id="pedidos-motivo-opcional"
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
              onClick={(e) => { e.preventDefault(); ejecutarCancelacion(); }}
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
