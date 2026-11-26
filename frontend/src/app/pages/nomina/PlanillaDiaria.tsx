/**
 * Planilla Diaria de Trabajo, diseño V.18 con conexiones a la API real.
 *
 * Endpoints (doc `API_PLANILLA_DIARIA.md`):
 *  - GET /nominas/{id}/planilla-diaria         → bundle completo del reporte
 *  - GET /nominas/{id}/planilla-diaria/lotes   → dropdown de lotes
 *  - GET /nominas/{id}/planilla-diaria/exportar → Excel descargable
 *
 * Ruta: `/nomina/planilla-diaria` (opcionalmente `?nomina_id=N`).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { sortByFirstName } from '../../utils/personas';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Banknote, Download, Loader2, Scale, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import {
  nominaApi,
  Nomina,
  PlanillaDiariaBundle,
  PlanillaDiariaColaborador,
  PlanillaDiariaFilaCosecha,
  PlanillaDiariaFilaJornal,
  PlanillaDiariaFiltros,
  PlanillaDiariaLote,
  PlanillaDiariaSecciones,
} from '../../../api/nomina';
import type { ApiError } from '../../../api/client';
import { cop } from '../../lib/formato';
import { formatFecha } from '../../utils/fecha';
import { thead } from '../../components/nomina/piezas';

// ── Tipos locales para el render ─────────────────────────────────────────────
type TipoLabor = 'Cosecha' | 'Plateo' | 'Poda' | 'Fertilización' | 'Sanidad' | 'Otros' | 'Auxiliares';

const laboresOrden: TipoLabor[] = [
  'Cosecha', 'Plateo', 'Poda', 'Fertilización', 'Sanidad', 'Otros', 'Auxiliares',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}
// Wrapper: aquí null se muestra como "$0", no como ''.
function fmtMoney(v: string | number | null | undefined): string {
  return cop(toNumber(v));
}
function fmtNumero(v: string | number | null | undefined, decimals = 0): string {
  const n = toNumber(v);
  return n.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
function fmtFecha(iso: string | null | undefined): string {
  return formatFecha(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Los 3 primeros nombres van a COL.1/2/3. El resto se muestra en CUADRILLA. */
function distribuirColaboradores(cols: PlanillaDiariaColaborador[]): {
  col1: string; col2: string; col3: string; cuadrilla: string;
} {
  const nombres = cols.map((c) => c.nombre);
  return {
    col1: nombres[0] ?? '',
    col2: nombres[1] ?? '',
    col3: nombres[2] ?? '',
    cuadrilla: nombres.slice(3).join(', '),
  };
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Etiqueta de una nómina para el dropdown, como el diseño: "Planilla 1 – 15 Abril 2026". */
function labelNomina(n: Nomina): string {
  const ini = n.fecha_inicio?.slice(0, 10);
  const fin = n.fecha_fin?.slice(0, 10);
  if (!ini || !fin) return `Planilla ${MESES[(n.mes ?? 1) - 1] ?? n.mes} ${n.anio}`;
  const [, mesIni, diaIni] = ini.split('-').map(Number);
  const [anioFin, mesFin, diaFin] = fin.split('-').map(Number);
  const desde = mesIni === mesFin ? `${diaIni}` : `${diaIni} ${MESES[mesIni - 1]}`;
  return `Planilla ${desde} – ${diaFin} ${MESES[mesFin - 1]} ${anioFin}`;
}

// ── Componente ───────────────────────────────────────────────────────────────
export default function PlanillaDiaria() {
  const [searchParams, setSearchParams] = useSearchParams();
  const nominaIdParam = searchParams.get('nomina_id');
  const [nominaId, setNominaId] = useState<number | null>(
    nominaIdParam ? parseInt(nominaIdParam) : null,
  );

  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [cargandoNominas, setCargandoNominas] = useState(false);

  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroLote, setFiltroLote] = useState<string>('todos');
  const [filtroColaborador, setFiltroColaborador] = useState<string>('todos');

  const [bundle, setBundle] = useState<PlanillaDiariaBundle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [lotes, setLotes] = useState<PlanillaDiariaLote[]>([]);
  const [exportando, setExportando] = useState(false);

  // Colaboradores únicos del período (para poblar el Select del filtro).
  // Se cachea de un fetch al bundle sin filtros para que la lista no se recorte
  // al aplicar el filtro por colaborador.
  const [colaboradoresPeriodo, setColaboradoresPeriodo] = useState<PlanillaDiariaColaborador[]>([]);

  // Cargar lista de nóminas al montar.
  useEffect(() => {
    setCargandoNominas(true);
    nominaApi
      .listar({ per_page: 50 })
      .then((res) => {
        setNominas(res.data ?? []);
        // Si no hay nómina en URL, seleccionar la primera.
        if (!nominaId && res.data?.length) {
          const first = res.data[0];
          setNominaId(first.id);
          setSearchParams({ nomina_id: String(first.id) });
        }
      })
      .catch(() => setNominas([]))
      .finally(() => setCargandoNominas(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar lotes del período cuando cambia la nómina.
  useEffect(() => {
    if (!nominaId) {
      setLotes([]);
      return;
    }
    nominaApi.planillaDiaria
      .lotes(nominaId)
      .then((res) => setLotes(res.data ?? []))
      .catch(() => setLotes([]));
  }, [nominaId]);

  // Cargar bundle con filtros.
  const cargarBundle = useCallback(async () => {
    if (!nominaId) return;
    setCargando(true);
    try {
      const params: PlanillaDiariaFiltros = {};
      if (filtroColaborador !== 'todos') params.colaborador = filtroColaborador;
      if (filtroLote !== 'todos') params.lote_id = parseInt(filtroLote);
      if (filtroFecha) params.fecha = filtroFecha;
      const res = await nominaApi.planillaDiaria.ver(nominaId, params);
      setBundle(res.data);
      // Si el request fue sin filtro de colaborador, refrescar el catálogo del select.
      if (filtroColaborador === 'todos' && filtroLote === 'todos' && !filtroFecha) {
        setColaboradoresPeriodo(extraerColaboradores(res.data));
      }
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'Error al cargar la planilla diaria');
      setBundle(null);
    } finally {
      setCargando(false);
    }
  }, [nominaId, filtroColaborador, filtroLote, filtroFecha]);

  useEffect(() => {
    cargarBundle();
  }, [cargarBundle]);

  const cambiarNomina = (id: string) => {
    const n = parseInt(id);
    setNominaId(n);
    setSearchParams({ nomina_id: id });
  };

  const limpiarFiltros = () => {
    setFiltroFecha('');
    setFiltroLote('todos');
    setFiltroColaborador('todos');
  };

  const exportar = async () => {
    if (!nominaId) return;
    setExportando(true);
    try {
      const params: PlanillaDiariaFiltros = {};
      if (filtroColaborador !== 'todos') params.colaborador = filtroColaborador;
      if (filtroLote !== 'todos') params.lote_id = parseInt(filtroLote);
      if (filtroFecha) params.fecha = filtroFecha;
      const blob = await nominaApi.planillaDiaria.exportar(nominaId, params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const nombreArchivo = bundle?.periodo?.nombre
        ? `Planilla-Diaria-${bundle.periodo.nombre}.xlsx`
        : 'planilla-diaria.xlsx';
      a.download = nombreArchivo.replace(/\s+/g, '-');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo exportar el archivo');
    } finally {
      setExportando(false);
    }
  };

  const hayFiltros = !!(filtroFecha || filtroLote !== 'todos' || filtroColaborador !== 'todos');

  // Aplanar las secciones de la API a la lista por labor que espera el render.
  const registrosPorLabor = useMemo(() => {
    if (!bundle?.secciones) return [];
    const s = bundle.secciones;
    const mapping: Record<TipoLabor, { count: number; subtotal_total: string; subtotal_col_neto: string }> = {
      Cosecha:       { count: s.cosecha.count,       subtotal_total: s.cosecha.subtotal_total,       subtotal_col_neto: s.cosecha.subtotal_col_neto },
      Plateo:        { count: s.plateo.count,        subtotal_total: s.plateo.subtotal_total,        subtotal_col_neto: s.plateo.subtotal_col_neto },
      Poda:          { count: s.poda.count,          subtotal_total: s.poda.subtotal_total,          subtotal_col_neto: s.poda.subtotal_col_neto },
      Fertilización: { count: s.fertilizacion.count, subtotal_total: s.fertilizacion.subtotal_total, subtotal_col_neto: s.fertilizacion.subtotal_col_neto },
      Sanidad:       { count: s.sanidad.count,       subtotal_total: s.sanidad.subtotal_total,       subtotal_col_neto: s.sanidad.subtotal_col_neto },
      Otros:         { count: s.otros.count,         subtotal_total: s.otros.subtotal_total,         subtotal_col_neto: s.otros.subtotal_col_neto },
      Auxiliares:    { count: s.auxiliares.count,    subtotal_total: s.auxiliares.subtotal_total,    subtotal_col_neto: s.auxiliares.subtotal_col_neto },
    };
    return laboresOrden.filter((l) => mapping[l].count > 0).map((l) => ({ labor: l, meta: mapping[l] }));
  }, [bundle]);

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/nomina"
        eyebrow="Pagos"
        title="Planilla diaria de trabajo"
        description="Registro diario de operaciones y cosecha."
        actions={
          <>
            <Select
              value={nominaId ? String(nominaId) : ''}
              onValueChange={cambiarNomina}
              disabled={cargandoNominas}
            >
              <SelectTrigger aria-label="Planilla" className="w-full sm:w-64">
                <SelectValue placeholder={cargandoNominas ? 'Cargando…' : 'Seleccionar planilla'} />
              </SelectTrigger>
              <SelectContent>
                {nominas.map((n) => (
                  <SelectItem key={n.id} value={String(n.id)}>
                    {labelNomina(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={exportar}
              disabled={!nominaId || !bundle || exportando}
            >
              {exportando
                ? <Loader2 className="animate-spin" strokeWidth={2} />
                : <Download strokeWidth={2} />}
              Exportar
            </Button>
          </>
        }
      />

      {/* Los totales del período, en la tira de indicadores. */}
      {nominaId && bundle?.totales && (
        <StatStrip
          items={[
            {
              label: 'Total neto colaboradores',
              value: fmtMoney(bundle.totales.total_neto_colaboradores),
              note: bundle.periodo?.nombre,
              icon: Wallet,
              tone: 'green' as const,
            },
            { label: 'Total bruto', value: fmtMoney(bundle.totales.total_bruto), icon: Banknote, tone: 'green' as const },
            ...(toNumber(bundle.totales.total_kilos) > 0
              ? [{ label: 'Total kilos', value: fmtNumero(bundle.totales.total_kilos), icon: Scale, tone: 'lime' as const }]
              : []),
          ]}
        />
      )}

      {/* Filtros, debajo de la tira como en el diseño. */}
      {nominaId && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
            <SelectTrigger id="planilladi-colaborador" aria-label="Colaborador" className="w-full sm:w-72">
              <SelectValue placeholder="Todos los colaboradores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los colaboradores</SelectItem>
              {colaboradoresPeriodo.map((c) => (
                <SelectItem key={`${c.tipo}-${c.id}`} value={c.nombre}>
                  <span className="flex items-center gap-2">
                    <span>{c.nombre}</span>
                    {c.tipo === 'operario' && (
                      <Badge variant="warning">Tercero</Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroLote} onValueChange={setFiltroLote}>
            <SelectTrigger id="planilladi-lote" aria-label="Lote" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los lotes</SelectItem>
              {lotes.map((lote) => (
                <SelectItem key={lote.id} value={String(lote.id)}>{lote.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id="planilladi-fecha"
            type="date"
            aria-label="Fecha"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            min={bundle?.periodo.fecha_inicio}
            max={bundle?.periodo.fecha_fin}
            className="w-full sm:w-44"
          />
          {hayFiltros && (
            <Button variant="ghost" onClick={limpiarFiltros}>Limpiar</Button>
          )}
        </div>
      )}

      {/* Sin nómina seleccionada */}
      {!nominaId && !cargandoNominas && (
        <Card className="items-center py-12 text-center">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Selecciona un período de nómina</p>
            <p className="text-sm text-muted-foreground">Elige una nómina para ver el reporte de planilla diaria.</p>
          </div>
        </Card>
      )}

      {/* Cargando */}
      {nominaId && cargando && !bundle && (
        <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando planilla…
        </Card>
      )}

      {/* Registros agrupados por labor */}
      {nominaId && bundle && (
        <>
          {registrosPorLabor.length === 0 ? (
            <Card className="items-center py-12 text-center">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">No hay registros</p>
                <p className="text-sm text-muted-foreground">
                  {hayFiltros
                    ? 'No se encontraron registros con los filtros aplicados.'
                    : 'No hay operaciones aprobadas para este período.'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {registrosPorLabor.map(({ labor, meta }) => (
                <SeccionLabor
                  key={labor}
                  labor={labor}
                  count={meta.count}
                  subtotal_total={meta.subtotal_total}
                  subtotal_col_neto={meta.subtotal_col_neto}
                  secciones={bundle.secciones}
                />
              ))}

            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sección por labor (renderiza cosecha o jornales según el tipo) ──────────
function SeccionLabor({
  labor, count, subtotal_total, subtotal_col_neto, secciones,
}: {
  labor: TipoLabor;
  count: number;
  subtotal_total: string;
  subtotal_col_neto: string;
  secciones: PlanillaDiariaSecciones;
}) {
  const esCosecha = labor === 'Cosecha';
  // Mapeo del tipo local a la sección del bundle.
  const registrosCosecha: PlanillaDiariaFilaCosecha[] = esCosecha ? secciones.cosecha.registros : [];
  const registrosJornal: PlanillaDiariaFilaJornal[] = (() => {
    switch (labor) {
      case 'Plateo':        return secciones.plateo.registros;
      case 'Poda':          return secciones.poda.registros;
      case 'Fertilización': return secciones.fertilizacion.registros;
      case 'Sanidad':       return secciones.sanidad.registros;
      case 'Otros':         return secciones.otros.registros;
      case 'Auxiliares':    return secciones.auxiliares.registros;
      default: return [];
    }
  })();

  // Subtotal de kilos (solo para cosecha). Con fallback promedio*gajos.
  const subtotalKilos = esCosecha
    ? registrosCosecha.reduce(
        (s, r) => s + (toNumber(r.kilos) || toNumber(r.promedio) * toNumber(r.gajos)),
        0,
      )
    : 0;
  // Subtotal Total (bruto) con fallback si el backend no lo envía calculado.
  const subtotalTotalCalc = esCosecha
    ? registrosCosecha.reduce((s, r) => {
        const kilos = toNumber(r.kilos) || toNumber(r.promedio) * toNumber(r.gajos);
        return s + (toNumber(r.total) || kilos * toNumber(r.precio));
      }, 0)
    : 0;
  const subtotalTotalMostrar =
    toNumber(subtotal_total) > 0 ? subtotal_total : subtotalTotalCalc;
  // Subtotal Col Neto con fallback (suma de pago_por_colaborador o total/nColab).
  const subtotalColNetoCalc = esCosecha
    ? registrosCosecha.reduce((s, r) => {
        const kilos = toNumber(r.kilos) || toNumber(r.promedio) * toNumber(r.gajos);
        const total = toNumber(r.total) || kilos * toNumber(r.precio);
        const nColab = r.num_colaboradores || 1;
        const pago = toNumber(r.pago_por_colaborador) || (nColab > 0 ? total / nColab : 0);
        return s + (toNumber(r.col_neto) || pago);
      }, 0)
    : 0;
  const subtotalColNetoMostrar =
    toNumber(subtotal_col_neto) > 0 ? subtotal_col_neto : subtotalColNetoCalc;

  return (
    <Card className="gap-0 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5">
        <h3>{labor}</h3>
        <Badge variant="secondary">
          {count} registro{count !== 1 ? 's' : ''}
        </Badge>
      </div>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full text-[13px]">
            <thead className={thead}>
              <tr>
                <Th className="pl-5">Fecha</Th>
                <Th>Col. 1</Th>
                <Th>Col. 2</Th>
                <Th>Col. 3</Th>
                <Th>Cuadrilla</Th>
                <Th>Lote</Th>
                {esCosecha && (
                  <>
                    <Th className="text-right">N.° gajos</Th>
                    <Th className="text-right">Kilos</Th>
                    <Th className="text-right">Promedio</Th>
                  </>
                )}
                <Th className="text-right">Precio</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Colab.</Th>
                <Th className="text-right">Pago por colab.</Th>
                <Th className="pr-5 text-right">Neto colab.</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {esCosecha
                ? registrosCosecha.map((r) => <FilaCosecha key={r.id} r={r} />)
                : registrosJornal.map((r) => <FilaJornal key={r.id} r={r} />)}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/60 font-semibold text-foreground">
                <td className={`${celda} pl-5`} colSpan={6}>Subtotal {labor.toLowerCase()}</td>
                {esCosecha && (
                  <>
                    <td className={celda}></td>
                    <td className={`${celda} text-right tabular-nums`}>{fmtNumero(subtotalKilos)}</td>
                    <td className={celda}></td>
                  </>
                )}
                <td className={celda}></td>
                <td className={`${celda} text-right tabular-nums`}>
                  {fmtMoney(esCosecha ? subtotalTotalMostrar : subtotal_total)}
                </td>
                <td className={celda}></td>
                <td className={celda}></td>
                <td className={`${celda} pr-5 text-right tabular-nums`}>
                  {fmtMoney(esCosecha ? subtotalColNetoMostrar : subtotal_col_neto)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
    </Card>
  );
}

function FilaCosecha({ r }: { r: PlanillaDiariaFilaCosecha }) {
  const cols = distribuirColaboradores(r.colaboradores);
  // Respaldo: si el backend no envía kilos/total/pagoxcolab pero manda promedio + precio,
  // los calculamos para que no aparezcan en 0 cuando la cosecha SÍ tiene datos.
  const gajos = toNumber(r.gajos);
  const promedio = toNumber(r.promedio);
  const precio = toNumber(r.precio);
  const kilos = toNumber(r.kilos) || promedio * gajos;
  const total = toNumber(r.total) || kilos * precio;
  const nColab = r.num_colaboradores || 1;
  const pagoPorColab = toNumber(r.pago_por_colaborador) || (nColab > 0 ? total / nColab : 0);
  const colNeto = toNumber(r.col_neto) || pagoPorColab;
  return (
    <tr className="transition-colors hover:bg-muted/40">
      <td className={`${celda} pl-5 text-muted-foreground`}>{fmtFecha(r.fecha)}</td>
      <TdColab nombre={cols.col1} c={r.colaboradores[0]} />
      <TdColab nombre={cols.col2} c={r.colaboradores[1]} />
      <TdColab nombre={cols.col3} c={r.colaboradores[2]} />
      <td className={`${celdaTexto} text-muted-foreground`} title={cols.cuadrilla}>
        {cols.cuadrilla || '—'}
      </td>
      <td className={`${celdaTexto} min-w-[7rem] font-medium text-foreground`}>{r.lote}</td>
      <td className={`${celda} text-right tabular-nums`}>{fmtNumero(gajos)}</td>
      <td className={`${celda} text-right tabular-nums`}>
        {kilos > 0 ? fmtNumero(kilos) : '—'}
      </td>
      <td className={`${celda} text-right tabular-nums text-muted-foreground`}>
        {promedio > 0 ? fmtNumero(promedio, 2) : '—'}
      </td>
      <td className={`${celda} text-right tabular-nums text-muted-foreground`}>{fmtMoney(precio)}</td>
      <td className={`${celda} text-right tabular-nums`}>
        {total > 0 ? fmtMoney(total) : '—'}
      </td>
      <td className={`${celda} text-right tabular-nums`}>{r.num_colaboradores}</td>
      <td className={`${celda} text-right tabular-nums text-muted-foreground`}>
        {pagoPorColab > 0 ? fmtMoney(pagoPorColab) : '—'}
      </td>
      <td className={`${celda} pr-5 text-right font-semibold tabular-nums text-foreground`}>
        {fmtMoney(colNeto)}
      </td>
    </tr>
  );
}

function FilaJornal({ r }: { r: PlanillaDiariaFilaJornal }) {
  const cols = distribuirColaboradores(r.colaboradores);
  // Cuando el grupo mezcla precios (colaborador propio + operario con precio
  // pactado distinto), backend manda `precio` y `pago_por_colaborador` en null
  // y marca `precio_mixto=true`. La fuente de verdad queda en `total`.
  const esPrecioMixto = r.precio_mixto === true || r.precio == null;
  return (
    <tr className="transition-colors hover:bg-muted/40">
      <td className={`${celda} pl-5 text-muted-foreground`}>{fmtFecha(r.fecha)}</td>
      <TdColab nombre={cols.col1} c={r.colaboradores[0]} />
      <TdColab nombre={cols.col2} c={r.colaboradores[1]} />
      <TdColab nombre={cols.col3} c={r.colaboradores[2]} />
      <td className={`${celdaTexto} text-muted-foreground`} title={cols.cuadrilla}>
        {cols.cuadrilla || '—'}
      </td>
      <td className={`${celdaTexto} min-w-[7rem]`}>
        <div className="font-medium text-foreground">{r.lote ?? '—'}</div>
        {r.sublabor && (
          <div className="mt-0.5 text-xs text-muted-foreground">{r.sublabor}</div>
        )}
      </td>
      <td className={`${celda} text-right tabular-nums text-muted-foreground`}>
        {esPrecioMixto ? 'Mixto' : fmtMoney(r.precio)}
      </td>
      <td className={`${celda} text-right tabular-nums`}>{fmtMoney(r.total)}</td>
      <td className={`${celda} text-right tabular-nums`}>{r.num_colaboradores}</td>
      <td className={`${celda} text-right tabular-nums text-muted-foreground`}>
        {esPrecioMixto ? 'Mixto' : fmtMoney(r.pago_por_colaborador)}
      </td>
      <td className={`${celda} pr-5 text-right font-semibold tabular-nums text-foreground`}>
        {fmtMoney(r.col_neto)}
      </td>
    </tr>
  );
}

// ── Celdas reutilizables ─────────────────────────────────────────────────────
/** Celda del diseño: una línea y sin cortar. Relleno corto para que quepa. */
const celda = 'whitespace-nowrap px-2 py-2.5';
/** Celda de texto: puede bajar de línea para no empujar la tabla. */
const celdaTexto = 'px-2 py-2.5 leading-snug';

/** Parte un nombre en nombres y apellidos para mostrarlo en dos líneas.
 *  Con 3 palabras se asume un nombre y dos apellidos. */
function partirNombre(nombre: string): [string, string] {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length < 2) return [nombre, ''];
  const corte = Math.max(1, Math.floor(partes.length / 2));
  return [partes.slice(0, corte).join(' '), partes.slice(corte).join(' ')];
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`${celda} text-left font-semibold ${className}`}>
      {children}
    </th>
  );
}

/** Celda de colaborador con badge "Tercero" (naranja) cuando el colaborador es operario. */
function TdColab({ nombre, c }: { nombre: string; c?: PlanillaDiariaColaborador }) {
  if (!nombre) return <td className={`${celdaTexto} font-medium text-foreground`}>—</td>;
  const [nombres, apellidos] = partirNombre(nombre);
  return (
    <td className={`${celdaTexto} font-medium text-foreground`} title={nombre}>
      <div className="flex items-center gap-1.5">
        <span className="whitespace-nowrap">
          {nombres}
          {apellidos && <br />}
          {apellidos}
        </span>
        {c?.tipo === 'operario' && (
          <Badge
            variant="warning"
            className="shrink-0"
            title={c.tercero_nombre ? `Tercero · ${c.tercero_nombre}` : 'Tercero'}
          >
            Tercero
          </Badge>
        )}
      </div>
    </td>
  );
}

/** Extrae los colaboradores únicos del bundle para poblar el select de filtro. */
function extraerColaboradores(bundle: PlanillaDiariaBundle): PlanillaDiariaColaborador[] {
  const map = new Map<string, PlanillaDiariaColaborador>();
  const secciones = bundle.secciones;
  const listas: Array<{ registros: Array<{ colaboradores: PlanillaDiariaColaborador[] }> }> = [
    secciones.cosecha,
    secciones.plateo,
    secciones.poda,
    secciones.fertilizacion,
    secciones.sanidad,
    secciones.otros,
    secciones.auxiliares,
  ];
  listas.forEach((seccion) => {
    seccion.registros.forEach((r) => {
      r.colaboradores.forEach((c) => {
        const key = `${c.tipo}-${c.id}`;
        if (!map.has(key)) map.set(key, c);
      });
    });
  });
  // Orden alfabetico por primer nombre (convencion del sistema).
  return sortByFirstName(Array.from(map.values()));
}
