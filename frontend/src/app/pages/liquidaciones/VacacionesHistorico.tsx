/**
 * Histórico de vacaciones liquidadas (API_LIQUIDACIONES §10.7).
 *
 * Los filtros van al backend, no al arreglo: los totales del pie vienen en
 * `meta.totales` y cubren el filtro completo, no solo la página visible.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Search, Download, Eye, Loader2, Banknote, MoreHorizontal, RotateCcw, Ban, Calculator,
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
import {
  ESTADO_VACACION_LABEL, ESTADO_VACACION_VARIANTE, ORIGEN_LABEL,
  descargarBlob, fmtCOP, fmtDias, fmtFechaCorta,
} from './vacaciones/comunes';
import PagoVacacionDialog from './vacaciones/PagoVacacionDialog';
import AnularVacacionDialog, { type ModoAnulacion } from './vacaciones/AnularVacacionDialog';
import PageHeader from '../../components/common/PageHeader';

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
  /**
   * v1.14 — Las acortadas por un regreso anticipado y las que dejaron dinero
   * por recuperar. Son dos preguntas distintas, así que van en un solo
   * selector con tres opciones y no en dos checkboxes.
   */
  const [filtroInterrupcion, setFiltroInterrupcion] = useState('todos');

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
        interrumpida: filtroInterrupcion === 'interrumpidas' ? 1 : undefined,
        reintegro_pendiente: filtroInterrupcion === 'reintegro' ? 1 : undefined,
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
  }, [filtroNombre, filtroDesde, filtroHasta, filtroEstado, filtroOrigen, filtroModoPago,
    filtroInterrupcion, pagina]);

  // Cualquier filtro nuevo vuelve a la primera página.
  useEffect(() => {
    setPagina(1);
  }, [filtroNombre, filtroDesde, filtroHasta, filtroEstado, filtroOrigen, filtroModoPago]);

  const hayFiltros =
    filtroNombre || filtroDesde || filtroHasta ||
    filtroEstado !== 'todos' || filtroOrigen !== 'todos' || filtroModoPago !== 'todos'
    || filtroInterrupcion !== 'todos';

  const limpiar = () => {
    setFiltroNombre('');
    setFiltroDesde('');
    setFiltroHasta('');
    setFiltroEstado('todos');
    setFiltroOrigen('todos');
    setFiltroModoPago('todos');
    setFiltroInterrupcion('todos');
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
      <PageHeader
        eyebrow="Vacaciones"
        title="Histórico de vacaciones"
        description="Registro de todas las vacaciones liquidadas."
        backTo="/liquidaciones?tab=vacaciones"
      />

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="relative w-full lg:w-72 lg:shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <Input
            type="search"
            placeholder="Buscar colaborador"
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
          {hayFiltros && (
            <Button variant="ghost" size="sm" className="col-span-2 justify-self-start" onClick={limpiar}>
              Limpiar filtros
            </Button>
          )}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="whitespace-nowrap">Desde</span>
            <Input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} className="sm:w-40" />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="whitespace-nowrap">Hasta</span>
            <Input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} className="sm:w-40" />
          </label>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="col-span-2 w-full sm:col-span-1 sm:w-48" aria-label="Estado"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="PENDIENTE">Solicitudes pendientes</SelectItem>
              <SelectItem value="APROBADA">Pendiente de pago</SelectItem>
              <SelectItem value="PAGADA">Pagada</SelectItem>
              <SelectItem value="CANCELADA">Anulada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroOrigen} onValueChange={setFiltroOrigen}>
            <SelectTrigger className="col-span-2 w-full sm:col-span-1 sm:w-48" aria-label="Origen"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo origen</SelectItem>
              <SelectItem value="SISTEMA">Liquidadas aquí</SelectItem>
              <SelectItem value="HISTORICO">Registros históricos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroModoPago} onValueChange={setFiltroModoPago}>
            <SelectTrigger className="col-span-2 w-full sm:col-span-1 sm:w-48" aria-label="Forma de pago"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Toda forma de pago</SelectItem>
              <SelectItem value="DIRECTO">{MODO_PAGO_LABEL.DIRECTO}</SelectItem>
              <SelectItem value="NOMINA">{MODO_PAGO_LABEL.NOMINA}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroInterrupcion} onValueChange={setFiltroInterrupcion}>
            <SelectTrigger className="col-span-2 w-full sm:col-span-1 sm:w-52" aria-label="Interrupción"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Interrumpidas o no</SelectItem>
              <SelectItem value="interrumpidas">Interrumpidas</SelectItem>
              <SelectItem value="reintegro">Con reintegro pendiente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* v1.14 — Lo pagado de más no se recupera solo: hay que descontarlo en
          la nómina del reintegro o condonarlo. */}
      {(meta?.totales.reintegros_pendientes ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => { setFiltroInterrupcion('reintegro'); setPagina(1); }}
          className="flex w-full gap-2 rounded-lg bg-warning-soft p-3 text-left text-sm text-foreground transition-colors hover:bg-warning-soft/70"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
          <span>
            {meta!.totales.reintegros_pendientes} vacación(es) interrumpida(s) con{' '}
            {fmtCOP(meta!.totales.reintegros_pendientes_valor ?? 0)} por reintegrar.
            {' '}Descuéntelo en la nómina del reintegro o condónelo.
          </span>
        </button>
      )}

      {/* Tabla */}
      <Card className="gap-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="whitespace-nowrap bg-muted/60 text-[13px] font-medium text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">Colaborador</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold md:table-cell">Días disfrute</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold md:table-cell">Días dinero</th>
                <th className="hidden px-4 py-2.5 text-left font-semibold lg:table-cell">Inicio vacaciones</th>
                <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Fecha de pago</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Estado</th>
                <th className="px-4 py-2.5"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cargando ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando registros...
                    </span>
                  </td>
                </tr>
              ) : filas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    {hayFiltros
                      ? 'No se encontraron registros con los filtros aplicados.'
                      : 'Todavía no hay vacaciones liquidadas.'}
                  </td>
                </tr>
              ) : (
                filas.map((h) => (
                  <FilaHistorico
                    key={h.id}
                    h={h}
                    descargando={descargando === h.id}
                    onLiquidar={() => navigate(`/liquidaciones/vacaciones/nueva?solicitud=${h.id}`)}
                    onVer={() => navigate(`/liquidaciones/vacaciones/${h.id}`)}
                    onPagar={() => setAPagar(h)}
                    onDescargar={() => descargarComprobante(h)}
                    onAnular={(modo) => setAAnular({ fila: h, modo })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-1 border-t border-border px-5 py-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p>
            <span className="font-medium text-foreground">{meta?.totales.registros ?? 0}</span> registros
            {(filtroDesde || filtroHasta) && ' en el período seleccionado'}
            {meta && meta.totales.pendientes_pago > 0 && (
              <span> · {meta.totales.pendientes_pago} sin pagar</span>
            )}
            {/* PR-L15 — De esas, las que esperan el cierre de una nomina.
                No son una mora del modulo: no hay nada que girar aqui. */}
            {meta && (meta.totales.pendientes_pago_nomina ?? 0) > 0 && (
              <span>{' · '}{meta.totales.pendientes_pago_nomina} esperando nómina</span>
            )}
            {/* PR-N4 — Sin liquidar, la nómina del período paga esos días
                como trabajados. Merece su propio contador. */}
            {meta && (meta.totales.solicitudes_pendientes ?? 0) > 0 && (
              <span className="font-medium text-foreground">
                {' · '}{meta.totales.solicitudes_pendientes} solicitud
                {meta.totales.solicitudes_pendientes !== 1 ? 'es' : ''} por resolver
              </span>
            )}
          </p>
          {/* v1.11 — `total_pagado` es el bruto; `valor_neto` es lo que de
              verdad salió de caja, ya sin los aportes del trabajador. */}
          <p>
            Total pagado:{' '}
            <span className="font-semibold tabular-nums text-foreground">{fmtCOP(meta?.totales.total_pagado ?? 0)}</span>
            {meta && (meta.totales.total_deducciones ?? 0) > 0 && (
              <>
                {' · '}Neto girado:{' '}
                <span className="font-semibold tabular-nums text-foreground">{fmtCOP(meta.totales.valor_neto ?? 0)}</span>
              </>
            )}
          </p>
        </div>

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <Button variant="outline" size="sm" disabled={pagina <= 1 || cargando} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {meta.current_page} de {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= meta.last_page || cargando}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
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

interface FilaHistoricoProps {
  h: VacacionItem;
  descargando: boolean;
  onLiquidar: () => void;
  onVer: () => void;
  onPagar: () => void;
  onDescargar: () => void;
  onAnular: (modo: ModoAnulacion) => void;
}

function FilaHistorico({ h, descargando, onLiquidar, onVer, onPagar, onDescargar, onAnular }: FilaHistoricoProps) {
  return (
    <tr className="transition-colors hover:bg-muted/40">
      <td className="min-w-[12rem] px-5 py-3">
        <span className="font-semibold text-foreground">{h.empleado.nombre_completo}</span>
        <span className="block text-xs text-muted-foreground">{h.empleado.cargo ?? `C.C. ${h.empleado.documento}`}</span>
        {/* El comprobante y su origen van bajo el nombre, sin columna propia. */}
        <span className="block text-xs text-muted-foreground">
          {h.numero_comprobante}
          {h.origen !== 'SISTEMA' && ` · ${ORIGEN_LABEL[h.origen]}`}
        </span>
        {h.interrumpida && (
          <span className="block text-xs text-warning">
            Interrumpida
            {h.interrupcion?.reintegro?.estado === 'PENDIENTE' ? ' · reintegro pendiente' : ''}
          </span>
        )}
        <span className="mt-1 block sm:hidden">
          <Badge variant={ESTADO_VACACION_VARIANTE[h.estado]}>{ESTADO_VACACION_LABEL[h.estado]}</Badge>
        </span>
      </td>
      <td className="hidden px-4 py-3 text-right tabular-nums text-foreground md:table-cell">{fmtDias(h.dias_habiles)}</td>
      <td className="hidden px-4 py-3 text-right tabular-nums text-foreground md:table-cell">
        {h.dias_dinero > 0 ? fmtDias(h.dias_dinero) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground lg:table-cell">
        {fmtFechaCorta(h.fecha_inicio)}
        {/* El fin del disfrute se conserva como subtítulo de la fila. */}
        {h.fecha_inicio && h.fecha_fin && (
          <span className="block text-xs">hasta {fmtFechaCorta(h.fecha_fin)}</span>
        )}
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">
        {/* En NOMINA la fecha de pago llega solo cuando el ultimo tramo
            cierra: hasta entonces lo util es cuanto pagaron y cuanto falta. */}
        {porNomina(h) && h.estado !== 'CANCELADA' ? (
          <>
            <span className="tabular-nums text-foreground">{fmtCOP(yaPagado(h))} pagado</span>
            {saldo(h) > 0 ? (
              <span className={`block text-xs ${saldoVencido(h) ? 'text-destructive' : 'text-muted-foreground'}`}>
                {fmtCOP(saldo(h))} pendiente
              </span>
            ) : (
              <span className="block text-xs text-muted-foreground">{fmtFechaCorta(h.pago.fecha_pago)}</span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">{fmtFechaCorta(h.pago.fecha_pago)}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">{fmtCOP(h.valor_total)}</td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <div className="flex flex-col items-start gap-1">
          <Badge variant={ESTADO_VACACION_VARIANTE[h.estado]}>{ESTADO_VACACION_LABEL[h.estado]}</Badge>
          {/* Forma de pago bajo el estado: el diseño no le da columna. */}
          {h.estado !== 'PENDIENTE' && (
            <span className="text-xs text-muted-foreground">{MODO_PAGO_LABEL[h.modo_pago ?? 'DIRECTO']}</span>
          )}
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
      <td className="whitespace-nowrap px-4 py-3">
        <AccionesFila h={h} descargando={descargando} onLiquidar={onLiquidar} onVer={onVer} onPagar={onPagar} onDescargar={onDescargar} onAnular={onAnular} />
      </td>
    </tr>
  );
}

function AccionesFila({ h, descargando, onLiquidar, onVer, onPagar, onDescargar, onAnular }: FilaHistoricoProps) {
  // Las dos anulaciones van en menú: son destructivas y no deben quedar al
  // lado de "Ver" (§10.9, §10.10).
  const conMenu = h.estado !== 'CANCELADA' && h.estado !== 'PENDIENTE' && h.origen !== 'LIQUIDACION_FINAL'
    && (puedeAnularPago(h) || puedeAnularLiquidacion(h));
  return (
    <div className="flex items-center justify-end gap-1">
      {/* PR-N4 — Una solicitud PENDIENTE no tiene valores ni comprobante:
          aprobarla ES liquidarla, con el `solicitud_id` por delante. */}
      {h.estado === 'PENDIENTE' && (
        <>
          <Button size="sm" variant="outline" onClick={onLiquidar}>
            <Calculator strokeWidth={2} />
            Liquidar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAnular('solicitud')} className="text-muted-foreground hover:text-destructive">
            Rechazar
          </Button>
        </>
      )}
      {h.estado === 'APROBADA' && h.origen === 'SISTEMA' && (
        <Button size="sm" variant="outline" onClick={onPagar}>
          <Banknote strokeWidth={2} />
          {/* En NOMINA el giro solo cubre el saldo que las nominas no pagaron. */}
          {porNomina(h) ? 'Pagar saldo' : 'Pagar'}
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={onVer} aria-label={`Ver comprobante de ${h.empleado.nombre_completo}`} title="Ver comprobante">
        <Eye className="text-muted-foreground" strokeWidth={2} />
      </Button>
      {/* Una solicitud no tiene comprobante que descargar: el PDF se genera al liquidarla. */}
      {h.estado !== 'PENDIENTE' && (
        <Button
          variant="ghost"
          size="icon"
          disabled={descargando}
          onClick={onDescargar}
          aria-label={`Descargar comprobante de ${h.empleado.nombre_completo}`}
          title="Descargar comprobante"
        >
          {descargando ? <Loader2 className="animate-spin" /> : <Download className="text-muted-foreground" strokeWidth={2} />}
        </Button>
      )}
      {conMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Más acciones">
              <MoreHorizontal className="text-muted-foreground" strokeWidth={2} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* PR-L15 — Lo que pago una nomina cerrada no se devuelve desde
                aqui: hay que reabrir esa nomina. El backend responde 409. */}
            {puedeAnularPago(h) && (
              <DropdownMenuItem onClick={() => onAnular('pago')} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Anular pago
              </DropdownMenuItem>
            )}
            {/* Con tramos ya pagados en nomina deja de ser anulable. */}
            {puedeAnularLiquidacion(h) && (
              <DropdownMenuItem onClick={() => onAnular('liquidacion')} className="gap-2 text-destructive focus:text-destructive">
                <Ban className="h-4 w-4" />
                Anular liquidación
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
