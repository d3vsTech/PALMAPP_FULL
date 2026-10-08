/**
 * Histórico de vacaciones liquidadas (API_LIQUIDACIONES §10.7).
 *
 * Los filtros van al backend, no al arreglo: los totales del pie vienen en
 * `meta.totales` y cubren el filtro completo, no solo la página visible.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, Search, Download, Eye, Loader2, Banknote, MoreHorizontal, RotateCcw, Ban, Check,
  AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  vacacionesApi,
  ADVERTENCIA_PAGO_NOMINA_LABEL,
  MODO_PAGO_LABEL,
  type EstadoVacacion,
  type MetaHistoricoVacaciones,
  type ModoPagoVacacion,
  type OrigenVacacion,
  type VacacionItem,
} from '../../../api/vacaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';
import {
  ESTADO_VACACION_BADGE, ESTADO_VACACION_LABEL, MODO_PAGO_BADGE, ORIGEN_LABEL,
  descargarBlob, fmtCOP, fmtDias,
} from './vacaciones/comunes';
import PagoVacacionDialog from './vacaciones/PagoVacacionDialog';
import AnularVacacionDialog, { type ModoAnulacion } from './vacaciones/AnularVacacionDialog';

/**
 * PR-L15 — `modo_pago = NOMINA` no gira plata desde el modulo: cada nomina
 * que cubre el disfrute paga su tramo al cerrarse. Mientras queden tramos
 * sin cerrar hay saldo, y el modulo no debe ofrecer ni "Pagar" el total ni
 * "Anular pago": el backend responde 409.
 */
const porNomina = (v: VacacionItem) => v.modo_pago === 'NOMINA';

/** Lo que las nominas ya pagaron. En DIRECTO `total_pagado` es null. */
const yaPagado = (v: VacacionItem) => v.pago.total_pagado ?? 0;

/** Saldo que ninguna nomina cerrada cubrio todavia. */
const saldo = (v: VacacionItem) => v.pago.pendiente ?? Math.max(v.valor_total - yaPagado(v), 0);

/** El disfrute termino y sigue habiendo saldo: pide accion (Anexo A.1.1). */
const saldoVencido = (v: VacacionItem) =>
  v.advertencias?.some((a) => a.code === 'VACACIONES_PAGO_EN_NOMINA_PENDIENTE') ?? false;

/**
 * Lo que pago una nomina cerrada no se devuelve desde aqui: hay que reabrir
 * esa nomina. Si no queda ninguna de las dos anulaciones, el menu sobra.
 */
const puedeAnularPago = (v: VacacionItem) =>
  v.estado === 'PAGADA' && v.pago.metodo_pago !== 'NOMINA';

const puedeAnularLiquidacion = (v: VacacionItem) => !(porNomina(v) && yaPagado(v) > 0);

export default function VacacionesHistorico() {
  const navigate = useNavigate();

  const [filas, setFilas] = useState<VacacionItem[]>([]);
  const [meta, setMeta] = useState<MetaHistoricoVacaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);

  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroOrigen, setFiltroOrigen] = useState('todos');
  const [filtroModoPago, setFiltroModoPago] = useState('todos');

  const [aPagar, setAPagar] = useState<VacacionItem | null>(null);
  const [aAnular, setAAnular] = useState<{ fila: VacacionItem; modo: ModoAnulacion } | null>(null);
  const [descargando, setDescargando] = useState<number | null>(null);
  const reqIdRef = useRef(0);

  const cargar = () => {
    const reqId = ++reqIdRef.current;
    setCargando(true);
    vacacionesApi
      .listar({
        q: filtroNombre.trim() || undefined,
        desde: filtroDesde || undefined,
        hasta: filtroHasta || undefined,
        estado: filtroEstado !== 'todos' ? (filtroEstado as EstadoVacacion) : undefined,
        origen: filtroOrigen !== 'todos' ? (filtroOrigen as OrigenVacacion) : undefined,
        modo_pago: filtroModoPago !== 'todos' ? (filtroModoPago as ModoPagoVacacion) : undefined,
        page: pagina,
        per_page: 25,
      })
      .then((res) => {
        if (reqId !== reqIdRef.current) return;
        setFilas(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (reqId !== reqIdRef.current) return;
        const e = err as ApiError;
        toast.error(e.message ?? 'Error al cargar el histórico');
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setCargando(false);
      });
  };

  useEffect(() => {
    const t = setTimeout(cargar, filtroNombre ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroNombre, filtroDesde, filtroHasta, filtroEstado, filtroOrigen, filtroModoPago, pagina]);

  // Cualquier filtro nuevo vuelve a la primera página.
  useEffect(() => {
    setPagina(1);
  }, [filtroNombre, filtroDesde, filtroHasta, filtroEstado, filtroOrigen, filtroModoPago]);

  const hayFiltros =
    filtroNombre || filtroDesde || filtroHasta ||
    filtroEstado !== 'todos' || filtroOrigen !== 'todos' || filtroModoPago !== 'todos';

  const limpiar = () => {
    setFiltroNombre('');
    setFiltroDesde('');
    setFiltroHasta('');
    setFiltroEstado('todos');
    setFiltroOrigen('todos');
    setFiltroModoPago('todos');
  };

  const descargarComprobante = async (v: VacacionItem) => {
    setDescargando(v.id);
    try {
      const blob = await vacacionesApi.comprobantePdf(v.id);
      descargarBlob(blob, `vacaciones_${v.empleado.documento}_${v.numero_comprobante}.pdf`);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo descargar el comprobante');
    } finally {
      setDescargando(null);
    }
  };

  const reemplazar = (v: VacacionItem) =>
    setFilas((prev) => prev.map((f) => (f.id === v.id ? v : f)));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/liquidaciones?tab=vacaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Histórico de Vacaciones</h1>
        <p className="mt-1 text-muted-foreground">Registro de todas las vacaciones liquidadas</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador..."
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
            className="h-9 pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-muted-foreground">Desde</span>
          <Input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} className="h-9" />
        </div>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-muted-foreground">Hasta</span>
          <Input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} className="h-9" />
        </div>

        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="h-9 w-[11rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="PENDIENTE">Solicitudes pendientes</SelectItem>
            <SelectItem value="APROBADA">Pendiente de pago</SelectItem>
            <SelectItem value="PAGADA">Pagada</SelectItem>
            <SelectItem value="CANCELADA">Anulada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroOrigen} onValueChange={setFiltroOrigen}>
          <SelectTrigger className="h-9 w-[11rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo origen</SelectItem>
            <SelectItem value="SISTEMA">Liquidadas aquí</SelectItem>
            <SelectItem value="HISTORICO">Registros históricos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroModoPago} onValueChange={setFiltroModoPago}>
          <SelectTrigger className="h-9 w-[11rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Toda forma de pago</SelectItem>
            <SelectItem value="DIRECTO">{MODO_PAGO_LABEL.DIRECTO}</SelectItem>
            <SelectItem value="NOMINA">{MODO_PAGO_LABEL.NOMINA}</SelectItem>
          </SelectContent>
        </Select>

        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiar}>Limpiar filtros</Button>
        )}
      </div>

      {/* Tabla */}
      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Colaborador</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Comprobante</th>
                  <th className="p-4 text-center text-sm font-semibold text-muted-foreground">Días disfrute</th>
                  <th className="p-4 text-center text-sm font-semibold text-muted-foreground">Días dinero</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Rango</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Forma de pago</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Pago</th>
                  <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Total</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Estado</th>
                  <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando registros
                      </span>
                    </td>
                  </tr>
                ) : filas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                      {hayFiltros
                        ? 'No se encontraron registros con los filtros aplicados'
                        : 'Todavía no hay vacaciones liquidadas'}
                    </td>
                  </tr>
                ) : (
                  filas.map((h, idx) => (
                    <tr
                      key={h.id}
                      className={`border-b border-border transition-colors last:border-0 hover:bg-muted/20 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{h.empleado.nombre_completo}</span>
                          <span className="text-xs text-muted-foreground">{h.empleado.cargo ?? `CC ${h.empleado.documento}`}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground">{h.numero_comprobante}</span>
                          {h.origen !== 'SISTEMA' && (
                            <span className="text-xs text-muted-foreground">{ORIGEN_LABEL[h.origen]}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-success">{fmtDias(h.dias_habiles)}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-amber-600">
                          {h.dias_dinero > 0 ? fmtDias(h.dias_dinero) : '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">
                          {h.fecha_inicio ? `${formatFecha(h.fecha_inicio)} — ${formatFecha(h.fecha_fin)}` : '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        {h.estado === 'PENDIENTE' ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <Badge variant="outline" className={MODO_PAGO_BADGE[h.modo_pago ?? 'DIRECTO']}>
                            {MODO_PAGO_LABEL[h.modo_pago ?? 'DIRECTO']}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        {/* En NOMINA la fecha de pago llega solo cuando el
                            ultimo tramo cierra: hasta entonces lo util es
                            cuanto pagaron las nominas y cuanto falta. */}
                        {porNomina(h) && h.estado !== 'CANCELADA' ? (
                          <div className="flex flex-col">
                            <span className="text-sm text-foreground">{fmtCOP(yaPagado(h))} pagado</span>
                            {saldo(h) > 0 ? (
                              <span className={`text-xs ${saldoVencido(h) ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {fmtCOP(saldo(h))} pendiente
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{formatFecha(h.pago.fecha_pago)}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-foreground">{formatFecha(h.pago.fecha_pago)}</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-semibold text-foreground">{fmtCOP(h.valor_total)}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="outline" className={ESTADO_VACACION_BADGE[h.estado]}>
                            {ESTADO_VACACION_LABEL[h.estado]}
                          </Badge>
                          {saldoVencido(h) && (
                            <span
                              className="inline-flex items-center gap-1 text-xs text-destructive"
                              title={ADVERTENCIA_PAGO_NOMINA_LABEL.VACACIONES_PAGO_EN_NOMINA_PENDIENTE}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Saldo sin pagar
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {/* PR-N4 — Una solicitud PENDIENTE no tiene valores
                              ni comprobante: aprobarla ES liquidarla, con el
                              `solicitud_id` por delante. */}
                          {h.estado === 'PENDIENTE' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => navigate(`/liquidaciones/vacaciones/nueva?solicitud=${h.id}`)}
                                className="gap-1.5 bg-success hover:bg-success/90"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Liquidar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAAnular({ fila: h, modo: 'solicitud' })}
                                className="gap-1.5 hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Rechazar
                              </Button>
                            </>
                          )}
                          {h.estado === 'APROBADA' && h.origen === 'SISTEMA' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAPagar(h)}
                              className="gap-1.5 hover:border-primary hover:bg-primary/10 hover:text-primary"
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              {/* En NOMINA el giro solo cubre el saldo que las
                                  nominas no alcanzaron a pagar. */}
                              {porNomina(h) ? 'Pagar saldo' : 'Pagar'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/liquidaciones/vacaciones/${h.id}`)}
                            className="gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                          </Button>
                          {/* Una solicitud no tiene comprobante que descargar:
                              el PDF se genera al liquidarla. */}
                          {h.estado !== 'PENDIENTE' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={descargando === h.id}
                              onClick={() => descargarComprobante(h)}
                              className="gap-1.5 hover:border-primary hover:bg-primary/10 hover:text-primary"
                            >
                              {descargando === h.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Download className="h-3.5 w-3.5" />}
                              PDF
                            </Button>
                          )}
                          {/* Las dos anulaciones van en menú: son destructivas
                              y no deben quedar al lado de "Ver" (§10.9, §10.10). */}
                          {h.estado !== 'CANCELADA' && h.estado !== 'PENDIENTE' && h.origen !== 'LIQUIDACION_FINAL'
                            && (puedeAnularPago(h) || puedeAnularLiquidacion(h)) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="px-2">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {/* PR-L15 — Lo que pago una nomina cerrada no
                                    se devuelve desde aqui: hay que reabrir
                                    esa nomina. El backend responde 409. */}
                                {puedeAnularPago(h) && (
                                  <DropdownMenuItem
                                    onClick={() => setAAnular({ fila: h, modo: 'pago' })}
                                    className="gap-2"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Anular pago
                                  </DropdownMenuItem>
                                )}
                                {/* Igual con la liquidacion: con tramos ya
                                    pagados en nomina deja de ser anulable. */}
                                {puedeAnularLiquidacion(h) && (
                                  <DropdownMenuItem
                                    onClick={() => setAAnular({ fila: h, modo: 'liquidacion' })}
                                    className="gap-2 text-destructive focus:text-destructive"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    Anular liquidación
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{meta?.totales.registros ?? 0}</span> registros
              {(filtroDesde || filtroHasta) && ' en el período seleccionado'}
              {meta && meta.totales.pendientes_pago > 0 && (
                <span> · {meta.totales.pendientes_pago} sin pagar</span>
              )}
              {/* PR-L15 — De esas, las que esperan el cierre de una nomina.
                  No son una mora del modulo: no hay nada que girar aqui. */}
              {meta && (meta.totales.pendientes_pago_nomina ?? 0) > 0 && (
                <span className="text-sky-600 dark:text-sky-400">
                  {' · '}{meta.totales.pendientes_pago_nomina} esperando nómina
                </span>
              )}
              {/* PR-N4 — Sin liquidar, la nómina del período paga esos días
                  como trabajados. Merece su propio contador. */}
              {meta && (meta.totales.solicitudes_pendientes ?? 0) > 0 && (
                <span className="text-orange-600 dark:text-orange-400">
                  {' · '}{meta.totales.solicitudes_pendientes} solicitud
                  {meta.totales.solicitudes_pendientes !== 1 ? 'es' : ''} por resolver
                </span>
              )}
            </p>
            {/* v1.11 — `total_pagado` es el bruto; `valor_neto` es lo que de
                verdad salió de caja, ya sin los aportes del trabajador. */}
            <p className="text-sm text-muted-foreground">
              Total pagado:{' '}
              <span className="font-semibold text-foreground">{fmtCOP(meta?.totales.total_pagado ?? 0)}</span>
              {meta && (meta.totales.total_deducciones ?? 0) > 0 && (
                <>
                  {' · '}Neto girado:{' '}
                  <span className="font-semibold text-foreground">
                    {fmtCOP(meta.totales.valor_neto ?? 0)}
                  </span>
                </>
              )}
            </p>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <Button
                variant="outline" size="sm"
                disabled={pagina <= 1 || cargando}
                onClick={() => setPagina((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {meta.current_page} de {meta.last_page}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={pagina >= meta.last_page || cargando}
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PagoVacacionDialog
        vacacion={aPagar}
        onCerrar={() => setAPagar(null)}
        onPagada={reemplazar}
      />

      <AnularVacacionDialog
        vacacion={aAnular?.fila ?? null}
        modo={aAnular?.modo ?? 'pago'}
        onCerrar={() => setAAnular(null)}
        onAnulada={reemplazar}
      />
    </div>
  );
}
