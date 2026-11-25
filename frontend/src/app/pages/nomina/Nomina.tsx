/**
 * Pantalla Pagos — listado de períodos de nómina.
 *
 * Diseño portado de V.15 (PalmApp - V220626/src/app/pages/nomina/Nomina.tsx)
 * manteniendo las conexiones a la API existente en V.2 (`nominaApi.listar`
 * y `nominaApi.indicadores`).
 *
 * Rutas:
 *  - `/nomina`                          → este listado
 *  - `/nomina/nueva`                    → crear nuevo período
 *  - `/nomina/planilla-diaria`          → planilla diaria
 *  - `/nomina/nuevo-prestamo`           → CRUD préstamos (futuro: `/nomina/prestamos`)
 *  - `/nomina/:id`                      → detalle
 *
 * Nota sobre KPIs: V.15 usa 4 indicadores filtrables por período (Pagado a
 * Colaboradores, Pagado a Terceros, Neto a Pagar, Pendiente). V.2 todavía no
 * tiene terceros pagados desde nómina, así que ese KPI muestra "—". El resto
 * se calcula con los datos de las nóminas listadas.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Plus, Calculator, Eye, Search,
  HandCoins, Receipt, Trash2, Pencil, Upload, Loader2,
  Wallet, Building2, Clock,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import { cop, num } from '../../lib/formato';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  nominaApi, Nomina as NominaT, NominaIndicadores, NominaErrorCodes,
  type EstadoNomina,
} from '../../../api/nomina';
import type { ApiError } from '../../../api/client';

const MESES_NOMBRE: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

function periodoLabel(n: NominaT): string {
  const mes = MESES_NOMBRE[n.mes] ?? String(n.mes);
  const base = n.tipo_pago_snapshot === 'QUINCENAL' && n.quincena
    ? `${mes} ${n.anio} - ${n.quincena === 1 ? 'Primera' : 'Segunda'} quincena`
    : `${mes} ${n.anio}`;
  // §2.6 — Si la nómina tiene `etiqueta`, se anexa entre paréntesis para
  // distinguirla de otras del mismo período (p.ej. "Campo" vs "Admin").
  return n.etiqueta ? `${base} · ${n.etiqueta}` : base;
}

/** §2.6 — Rango real de días (puede ser custom, no solo derivado del mes). */
function rangoFechasLabel(n: NominaT): string {
  const fmt = (raw: string) => {
    if (!raw) return '';
    // El backend puede devolver `YYYY-MM-DD` (fecha simple, sin zona) o un
    // ISO datetime completo tipo `2026-05-01T05:00:00.000000Z`. Detectamos
    // por la presencia de la `T`: si viene datetime, se parsea directo;
    // si viene fecha simple, se le pone `T00:00:00` para evitar que la
    // conversión de zona corra un día atrás.
    const d = raw.includes('T') ? new Date(raw) : new Date(raw + 'T00:00:00');
    if (isNaN(d.getTime())) {
      // Fallback: mostrar solo la parte de la fecha (`YYYY-MM-DD`) si algo
      // muy raro llegó, para no ensuciar la tabla con el ISO completo.
      return raw.slice(0, 10);
    }
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  return `${fmt(n.fecha_inicio)} - ${fmt(n.fecha_fin)}`;
}

function toNumber(v: string | number): number {
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

/** Formato compacto en millones para los mini-KPIs (igual que V.15). */
function fmtMillones(n: number): string {
  // Cero se muestra como $0 (no como guion): "aún no se ha pagado nada"
  // es un dato, no una ausencia de dato.
  if (!n || n <= 0) return '$0';
  return `$${num(n / 1_000_000, 2)} M`;
}

export default function Nomina() {
  const navigate = useNavigate();

  // ── Filtros de la tabla ───────────────────────────────────────────────────
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroMes, setFiltroMes] = useState<string>('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  // ── Filtro de KPIs (período independiente, igual a V.15) ──────────────────
  const [periodoKpi, setPeriodoKpi] = useState<string>('todos');

  const [nominas, setNominas] = useState<NominaT[]>([]);
  const [indicadores, setIndicadores] = useState<NominaIndicadores | null>(null);
  const [cargando, setCargando] = useState(true);

  // Eliminar nómina (solo BORRADOR sin liquidados — el backend bloquea con
  // NOMINA_CON_LIQUIDADOS/NOMINA_CERRADA si no se cumple, lo manejamos abajo).
  const [nominaAEliminar, setNominaAEliminar] = useState<NominaT | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /*
   * La proyección de los borradores la trae el propio listado en `resumen`
   * (API_NOMINA §2.2, 2026-10-07). Antes esta pantalla abría
   * `GET /nominas/{id}` por cada borrador y estimaba las deducciones al 8 %;
   * el backend ahora proyecta cada fila PENDIENTE con las reglas de §9 y
   * devuelve devengado, auxilio, deducciones reales y neto en una sola
   * petición. Las cifras de un borrador cambian: ahora el devengado incluye
   * el auxilio de transporte y las deducciones son SALUD/PENSION/FSP, no un
   * 8 % plano.
   */

  // Editar nómina: navega a `/nomina/:id/editar` que carga el wizard completo
  // en modo edición (paso 1 pre-poblado, paso 2 con colaboradores ya agregados,
  // paso 3 validar cosecha, paso 4 confirmar).

  // Guard contra respuestas fuera de orden: si el usuario cambia el filtro
  // dos veces rápido, la respuesta vieja puede llegar de última y pisar la
  // nueva. Cada carga incrementa el contador; solo la última puede setear.
  const reqIdRef = useRef(0);

  const cargarNominas = () => {
    const reqId = ++reqIdRef.current;
    setCargando(true);
    return Promise.all([
      nominaApi.listar({
        estado: filtroEstado !== 'todos' ? (filtroEstado as EstadoNomina) : undefined,
        mes: filtroMes !== 'todos' ? parseInt(filtroMes) : undefined,
        per_page: 50,
      }),
      nominaApi.indicadores(),
    ])
      .then(([listRes, indRes]) => {
        if (reqId !== reqIdRef.current) return;
        setNominas(listRes.data);
        setIndicadores(indRes.data);
        setCargando(false);
      })
      .catch((err: ApiError) => {
        if (reqId !== reqIdRef.current) return;
        toast.error(err.message ?? 'Error al cargar nóminas');
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarNominas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, filtroMes]);

  const confirmarEliminar = async () => {
    if (!nominaAEliminar) return;
    setEliminando(true);
    try {
      await nominaApi.eliminar(nominaAEliminar.id);
      toast.success('Nómina eliminada');
      setNominaAEliminar(null);
      cargarNominas();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.NOMINA_IMPORTADA_CONSUMIDA) {
        // La cesantía o la prima que la usó conserva su copia del cálculo y
        // no se recalcula nunca: hay que reabrirla o eliminarla primero.
        toast.error('Una liquidación ya usó este período', {
          duration: 9000,
          description: e.message
            ?? 'Reabre o elimina esa cesantía o prima antes de borrar la importación.',
        });
      } else if (e.code === NominaErrorCodes.NOMINA_CON_LIQUIDADOS) {
        toast.error('No se puede eliminar: hay colaboradores liquidados');
      } else if (e.code === NominaErrorCodes.NOMINA_CERRADA) {
        toast.error('No se puede eliminar una nómina cerrada');
      } else {
        toast.error(e.message ?? 'Error al eliminar nómina');
      }
    } finally {
      setEliminando(false);
    }
  };


  const nominasFiltradas = useMemo(() => {
    if (!filtroBusqueda) return nominas;
    const q = filtroBusqueda.toLowerCase();
    return nominas.filter((n) => periodoLabel(n).toLowerCase().includes(q));
  }, [nominas, filtroBusqueda]);

  // ── Opciones del dropdown de período para KPIs ───────────────────────────
  const opcionesPeriodo = useMemo(() => {
    return [
      { value: 'todos', label: 'Todos los períodos' },
      ...nominas.map((n) => ({ value: String(n.id), label: periodoLabel(n) })),
    ];
  }, [nominas]);

  // ── Indicadores del backend filtrados al mes del período elegido ────────
  // §2.3 API_NOMINA — /indicadores acepta ?anio&mes. Con un período
  // seleccionado, las cards "Pagado a Colaboradores/Terceros" reflejan lo
  // pagado en ESE mes (nóminas CERRADAS + actas PAGADAS) en vez de quedarse
  // con el acumulado global. La granularidad del filtro es el mes: con dos
  // nóminas en el mismo mes, ambas suman.
  const [indicadoresPeriodo, setIndicadoresPeriodo] = useState<typeof indicadores>(null);
  const indPeriodoReqRef = useRef(0);
  useEffect(() => {
    const reqId = ++indPeriodoReqRef.current;
    if (periodoKpi === 'todos') {
      setIndicadoresPeriodo(null);
      return;
    }
    const n = nominas.find((x) => String(x.id) === periodoKpi);
    if (!n) {
      setIndicadoresPeriodo(null);
      return;
    }
    nominaApi
      .indicadores({ anio: n.anio, mes: n.mes })
      .then((r) => {
        if (reqId !== indPeriodoReqRef.current) return;
        setIndicadoresPeriodo(r.data);
      })
      .catch(() => {
        if (reqId !== indPeriodoReqRef.current) return;
        setIndicadoresPeriodo(null); // fallback al cálculo local
      });
  }, [periodoKpi, nominas]);

  // ── Cálculo de los 4 mini-KPIs sobre el período seleccionado ─────────────
  // "todos" → usa los indicadores agregados del backend (más precisos: incluyen
  //   total_terceros pagados / pendientes que vienen de `nomina_tercero`).
  // Período específico → cálculo en cliente con la data ya listada (los KPIs de
  //   terceros por nómina vendrían del endpoint /nominas/{id}/terceros).
  const kpis = useMemo(() => {
    // Neto de una nómina: `resumen.neto` (§2.2) ya trae lo liquidado más la
    // proyección de los pendientes. El `total_general` del backend solo suma
    // lo confirmado y queda muy por debajo de lo que se va a pagar; se usa
    // de respaldo para las CERRADAS, donde los dos coinciden.
    const netoDeNomina = (n: NominaT): number =>
      n.resumen ? n.resumen.neto : toNumber(n.total_general);

    if (periodoKpi === 'todos' && indicadores) {
      // §10.1 — Una nómina EN_PROGRESO sigue abierta: lo que la cierra es
      // CERRADA. Agruparlas por "distinto de BORRADOR" dejaría fuera de los
      // KPIs todo lo que ya tiene a alguien liquidado.
      const borradores = nominas.filter((n) => n.estado !== 'CERRADA');
      const labelBorrador = borradores.length === 1
        ? periodoLabel(borradores[0])
        : `${borradores.length} períodos abiertos`;
      const netoBorradores = borradores.reduce((s, n) => s + netoDeNomina(n), 0);
      // Pendiente = lo mayor entre las actas pendientes que reporta el
      // backend y lo proyectado en borradores. Max, no suma: el acta de un
      // tercero del borrador está contada en ambos lados.
      const pendiente = Math.max(indicadores.pendiente_pagar ?? 0, netoBorradores);
      return {
        totalColaboradores: indicadores.total_colaboradores ?? 0,
        totalTerceros: indicadores.total_terceros ?? 0,
        netoAPagar: netoBorradores,
        totalPendiente: pendiente,
        labelBorrador,
        borradoresLen: borradores.length,
      };
    }

    // Filtro por período específico — cálculo derivado de la lista.
    const filtradas = periodoKpi === 'todos'
      ? nominas
      : nominas.filter((n) => String(n.id) === periodoKpi);

    const cerradas = filtradas.filter((n) => n.estado === 'CERRADA');
    const borradores = filtradas.filter((n) => n.estado !== 'CERRADA');

    // "Pagado" del mes del período, desde el backend cuando ya cargó;
    // fallback a la suma local de cerradas mientras tanto.
    const totalColaboradores = indicadoresPeriodo?.total_colaboradores
      ?? cerradas.reduce((s, n) => s + toNumber(n.total_general), 0);
    const totalTerceros = indicadoresPeriodo?.total_terceros ?? 0;
    const netoAPagar = borradores.reduce((s, n) => s + netoDeNomina(n), 0);
    const totalPendiente = netoAPagar;

    const labelBorrador = borradores.length === 1
      ? periodoLabel(borradores[0])
      : `${borradores.length} períodos abiertos`;

    return { totalColaboradores, totalTerceros, netoAPagar, totalPendiente, labelBorrador, borradoresLen: borradores.length };
  }, [nominas, periodoKpi, indicadores, indicadoresPeriodo]);

  /** Hay algo filtrando, asi que el vacio puede ser por los filtros. */
  const hayFiltros = filtroEstado !== 'todos' || filtroMes !== 'todos' || filtroBusqueda !== '';
  const limpiarFiltros = () => {
    setFiltroEstado('todos');
    setFiltroMes('todos');
    setFiltroBusqueda('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos"
        description="Períodos de nómina y desprendibles de pago."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/nomina/planilla-diaria')}>
              <Receipt strokeWidth={2} />
              Planilla diaria
            </Button>
            <Button variant="outline" onClick={() => navigate('/nomina/prestamos')}>
              <HandCoins strokeWidth={2} />
              Préstamos
            </Button>
            {/* Los períodos que la finca pagó antes del sistema. Entra por
                archivo y queda como nómina cerrada, con su desprendible. */}
            <Button variant="outline" onClick={() => navigate('/nomina/importar')}>
              <Upload strokeWidth={2} />
              Importar pagos
            </Button>
            <Button onClick={() => navigate('/nomina/nueva')}>
              <Plus strokeWidth={2} />
              Nuevo período de pago
            </Button>
          </>
        }
      />

      {/* Resumen de pagos. La tira de indicadores, con su propio período:
          manda sobre las cuatro cifras, no sobre la lista de abajo. */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2>Resumen de pagos</h2>
          <Select value={periodoKpi} onValueChange={setPeriodoKpi}>
            <SelectTrigger aria-label="Período del resumen" className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opcionesPeriodo.map((op) => (
                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <StatStrip
          items={[
            {
              label: 'Pagado a colaboradores',
              value: fmtMillones(kpis.totalColaboradores),
              note: 'Neto entregado a internos',
              icon: Wallet,
              tone: 'green',
            },
            {
              label: 'Pagado a terceros',
              value: fmtMillones(kpis.totalTerceros),
              note: 'Empresas contratistas',
              icon: Building2,
              tone: 'green',
            },
            {
              label: 'Neto a pagar',
              value: fmtMillones(kpis.netoAPagar),
              note: kpis.borradoresLen > 0 ? kpis.labelBorrador : 'Sin períodos abiertos',
              icon: Calculator,
              tone: 'blue',
            },
            /* Tres escenarios: hay deuda, hay borrador sin liquidar, o no hay
               ni lo uno ni lo otro. El tercero no es una cifra, es "Al día". */
            kpis.totalPendiente > 0
              ? {
                  label: 'Pendiente por pagar',
                  value: <span className="text-destructive">{fmtMillones(kpis.totalPendiente)}</span>,
                  note: 'Internos y terceros sin pagar',
                  icon: Clock,
                  tone: 'amber',
                }
              : kpis.borradoresLen > 0
                ? {
                    label: 'Pendiente por pagar',
                    value: 'Sin liquidar',
                    note: `${kpis.borradoresLen} nómina${kpis.borradoresLen === 1 ? '' : 's'} en curso`,
                    icon: Clock,
                    tone: 'amber',
                  }
                : {
                    label: 'Pendiente por pagar',
                    value: 'Al día',
                    note: 'Todo pagado y sin pendientes',
                    icon: Clock,
                    tone: 'amber',
                  },
          ]}
        />
      </section>

      {/* Períodos de pago. Los filtros van en la misma linea del titulo:
          en el diseño no tienen tarjeta propia ni rotulo encima. */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2>Períodos de pago</h2>
            <p className="text-sm text-muted-foreground">
              {hayFiltros
                ? `${nominasFiltradas.length} resultado${nominasFiltradas.length !== 1 ? 's' : ''}`
                : 'Historial de períodos de nómina procesados'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <Input
                id="nomina-buscar"
                type="search"
                aria-label="Buscar período"
                placeholder="Buscar período"
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger id="nomina-estado" aria-label="Estado" className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="BORRADOR">En borrador</SelectItem>
                <SelectItem value="EN_PROGRESO">En progreso</SelectItem>
                <SelectItem value="CERRADA">Finalizada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger id="nomina-mes" aria-label="Mes" className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los meses</SelectItem>
                {Object.entries(MESES_NOMBRE).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hayFiltros && (
              <Button variant="ghost" onClick={limpiarFiltros}>Limpiar</Button>
            )}
          </div>
        </div>

        {cargando ? (
          <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando nóminas...
          </Card>
        ) : nominasFiltradas.length > 0 ? (
          <Card className="gap-0 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="whitespace-nowrap bg-muted/60 text-[13px] font-medium text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 text-left font-semibold">Período</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                      <th className="hidden px-4 py-2.5 text-right font-semibold lg:table-cell">Devengado</th>
                      <th className="hidden px-4 py-2.5 text-right font-semibold xl:table-cell">Deducciones</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Neto</th>
                      <th className="px-5 py-2.5 text-right font-semibold">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {nominasFiltradas.map((n) => {
                      const totalReal = toNumber(n.total_general);
                      const dedReal = toNumber(n.total_deducciones);
                      // §2.2 — `resumen` llega con el listado, así que no hay
                      // nada que esperar. `estimado` es del backend: marca las
                      // cifras solo mientras quede una fila PENDIENTE.
                      const res = n.resumen;
                      const usarEstimado = res?.estimado ?? false;
                      const dev = res ? res.devengado : totalReal + dedReal;
                      const ded = res ? res.deducciones : dedReal;
                      const total = res ? res.neto : totalReal;
                      return (
                        <tr key={n.id} className="transition-colors hover:bg-muted/40">
                          <td className="min-w-[13rem] px-5 py-3">
                            <Link
                              to={`/nomina/${n.id}`}
                              className="font-semibold text-foreground hover:text-primary"
                            >
                              {periodoLabel(n)}
                            </Link>
                            <span className="block text-xs text-muted-foreground">
                              {rangoFechasLabel(n)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusBadge status={n.estado as any} />
                              {/* §16 — Un período que se pagó antes del
                                  sistema y entró por archivo. No se liquida ni
                                  se cierra: ya está cerrado. */}
                              {n.origen === 'IMPORTACION' && (
                                <Badge variant="secondary">Histórico</Badge>
                              )}
                            </div>
                          </td>
                          {/* `estimado` marca las cifras mientras quede una
                              fila pendiente de liquidar. Se dice una vez, en
                              el neto, y no tres veces con una flecha. */}
                          <td className="hidden px-4 py-3 text-right tabular-nums text-foreground lg:table-cell">
                            {cop(dev)}
                          </td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-foreground xl:table-cell">
                            {cop(ded)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                            {cop(total)}
                            {usarEstimado && (
                              <span className="block text-xs font-normal text-muted-foreground">Estimado</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* §10.1 — Liquidar sigue disponible mientras la
                                  nómina no esté CERRADA; editar y eliminar
                                  solo en BORRADOR, porque con una fila ya
                                  liquidada el backend responde 409
                                  NOMINA_CON_LIQUIDADOS. */}
                              {n.estado !== 'CERRADA' ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(`/nomina/${n.id}`)}
                                  >
                                    <Calculator strokeWidth={2} />
                                    Liquidar
                                  </Button>
                                  {n.estado === 'BORRADOR' && (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/nomina/${n.id}/editar`);
                                        }}
                                        className="text-muted-foreground"
                                        title="Editar nómina"
                                        aria-label="Editar nómina"
                                      >
                                        <Pencil strokeWidth={2} />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setNominaAEliminar(n);
                                        }}
                                        className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                                        title="Eliminar nómina"
                                        aria-label="Eliminar nómina"
                                      >
                                        <Trash2 strokeWidth={2} />
                                      </Button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-muted-foreground"
                                    onClick={() => navigate(`/nomina/${n.id}`)}
                                  >
                                    <Eye strokeWidth={2} />
                                    Ver
                                  </Button>
                                  {/* §2.5 — Una importada sí se borra, para
                                      deshacer un cargue; una del wizard, no. */}
                                  {n.origen === 'IMPORTACION' && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNominaAEliminar(n);
                                      }}
                                      className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                                      title="Eliminar importación"
                                      aria-label="Eliminar importación"
                                    >
                                      <Trash2 strokeWidth={2} />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
          </Card>
        ) : nominas.length === 0 ? (
          <Card className="items-center py-14 text-center">
            <div className="space-y-1">
              <h3>No hay períodos de nómina</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Crea el primer período para liquidar a tus colaboradores.
              </p>
            </div>
            <Button onClick={() => navigate('/nomina/nueva')}>
              <Plus strokeWidth={2} />
              Crear primer período
            </Button>
          </Card>
        ) : (
          <Card className="items-center py-12 text-center">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Sin resultados</p>
              <p className="text-sm text-muted-foreground">Ningún período coincide con los filtros.</p>
            </div>
            <Button variant="outline" size="sm" onClick={limpiarFiltros}>Limpiar filtros</Button>
          </Card>
        )}
      </section>

      {/* Confirmar eliminar nómina */}
      <AlertDialog
        open={!!nominaAEliminar}
        onOpenChange={(o) => !o && setNominaAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar nómina</AlertDialogTitle>
            <AlertDialogDescription>
              {nominaAEliminar && (
                <>
                  Se eliminará el período <strong>{periodoLabel(nominaAEliminar)}</strong> y
                  todos sus colaboradores pendientes. Esta acción no podrá deshacerse.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminar}
              disabled={eliminando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
