/**
 * Planilla Diaria de Trabajo — diseño V.18 con conexiones a la API real.
 *
 * Endpoints (doc `API_PLANILLA_DIARIA.md`):
 *  - GET /nominas/{id}/planilla-diaria         → bundle completo del reporte
 *  - GET /nominas/{id}/planilla-diaria/lotes   → dropdown de lotes
 *  - GET /nominas/{id}/planilla-diaria/exportar → Excel descargable
 *
 * Ruta: `/nomina/planilla-diaria` (opcionalmente `?nomina_id=N`).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, FileText, Filter, Download, Loader2,
} from 'lucide-react';
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

// ── Tipos locales para el render ─────────────────────────────────────────────
type TipoLabor = 'Cosecha' | 'Plateo' | 'Poda' | 'Fertilización' | 'Sanidad' | 'Otros' | 'Auxiliares';

const laboresOrden: TipoLabor[] = [
  'Cosecha', 'Plateo', 'Poda', 'Fertilización', 'Sanidad', 'Otros', 'Auxiliares',
];

// Paleta V.19 por labor (usada también en LiquidarTerceros / NominaDetalle):
//   Cosecha       → amber
//   Poda / Plateo → verde oscuro (#1E5631)
//   Fertilización → blue
//   Sanidad       → rose
//   Otros         → purple
//   Auxiliares    → zinc
const colorPorLabor: Record<TipoLabor, string> = {
  Cosecha:       'bg-amber-500/10 text-amber-700 border-amber-300',
  Plateo:        'bg-[#1E5631]/10 text-[#1E5631] border-[#1E5631]/30',
  Poda:          'bg-[#1E5631]/10 text-[#1E5631] border-[#1E5631]/30',
  Fertilización: 'bg-blue-500/10 text-blue-700 border-blue-300',
  Sanidad:       'bg-rose-500/10 text-rose-700 border-rose-300',
  Otros:         'bg-purple-500/10 text-purple-700 border-purple-300',
  Auxiliares:    'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-400',
};

const bordesPorLabor: Record<TipoLabor, string> = {
  Cosecha:       'border-l-4 border-l-amber-500',
  Plateo:        'border-l-4 border-l-[#1E5631]',
  Poda:          'border-l-4 border-l-[#1E5631]',
  Fertilización: 'border-l-4 border-l-blue-500',
  Sanidad:       'border-l-4 border-l-rose-500',
  Otros:         'border-l-4 border-l-purple-500',
  Auxiliares:    'border-l-4 border-l-zinc-400',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}
function fmtMoney(v: string | number | null | undefined): string {
  const n = toNumber(v);
  return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}
function fmtNumero(v: string | number | null | undefined, decimals = 0): string {
  const n = toNumber(v);
  return n.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
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

/** Etiqueta de una nómina para el dropdown. */
function labelNomina(n: Nomina): string {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mes = meses[(n.mes ?? 1) - 1] ?? String(n.mes);
  const q = n.quincena ? ` — Quincena ${n.quincena}` : '';
  return `${mes} ${n.anio}${q}`;
}

// ── Componente ───────────────────────────────────────────────────────────────
export default function PlanillaDiaria() {
  const navigate = useNavigate();
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
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/nomina">Pagos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Planilla Diaria</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/nomina')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Pagos
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-primary">Planilla Diaria de Trabajo</h1>
            <p className="text-muted-foreground">Registro diario de operaciones y cosecha</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Selector de planilla */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Planilla:</span>
              <Select
                value={nominaId ? String(nominaId) : ''}
                onValueChange={cambiarNomina}
                disabled={cargandoNominas}
              >
                <SelectTrigger className="w-64 border-primary/40 text-primary font-semibold">
                  <SelectValue placeholder={cargandoNominas ? 'Cargando...' : 'Seleccionar planilla'} />
                </SelectTrigger>
                <SelectContent>
                  {nominas.map((n) => (
                    <SelectItem key={n.id} value={String(n.id)}>
                      {labelNomina(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={exportar}
              disabled={!nominaId || !bundle || exportando}
            >
              {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar
            </Button>
          </div>
        </div>

        {/* Identificador visual de planilla activa */}
        {bundle?.periodo && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Visualizando: {bundle.periodo.nombre}
            </span>
          </div>
        )}
      </div>

      {/* Filtros */}
      {nominaId && (
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Filtros</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Colaborador</label>
                <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los colaboradores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los colaboradores</SelectItem>
                    {colaboradoresPeriodo.map((c) => (
                      <SelectItem key={`${c.tipo}-${c.id}`} value={c.nombre}>
                        <span className="flex items-center gap-2">
                          <span>{c.nombre}</span>
                          {c.tipo === 'operario' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 font-medium">
                              Tercero
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lote</label>
                <Select value={filtroLote} onValueChange={setFiltroLote}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los lotes</SelectItem>
                    {lotes.map((lote) => (
                      <SelectItem key={lote.id} value={String(lote.id)}>{lote.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha</label>
                <Input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  min={bundle?.periodo.fecha_inicio}
                  max={bundle?.periodo.fecha_fin}
                />
              </div>
            </div>
            {hayFiltros && (
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sin nómina seleccionada */}
      {!nominaId && !cargandoNominas && (
        <Card className="border-border">
          <CardContent className="text-center py-12 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-1">Selecciona un período de nómina</p>
            <p className="text-sm">Elige una nómina para ver el reporte de planilla diaria.</p>
          </CardContent>
        </Card>
      )}

      {/* Cargando */}
      {nominaId && cargando && !bundle && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando planilla...
        </div>
      )}

      {/* Registros agrupados por labor */}
      {nominaId && bundle && (
        <>
          {registrosPorLabor.length === 0 ? (
            <Card className="border-border">
              <CardContent className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No hay registros</p>
                <p className="text-sm">
                  {hayFiltros
                    ? 'No se encontraron registros con los filtros aplicados.'
                    : 'No hay operaciones aprobadas para este período.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
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

              {/* Gran total */}
              {bundle.totales && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <span className="font-bold text-foreground">TOTALES GENERALES</span>
                      <div className="flex gap-8 flex-wrap">
                        {toNumber(bundle.totales.total_kilos) > 0 && (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Total Kilos</p>
                            <p className="font-bold text-foreground">
                              {fmtNumero(bundle.totales.total_kilos)}
                            </p>
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total Bruto</p>
                          <p className="font-bold text-success">
                            {fmtMoney(bundle.totales.total_bruto)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total Neto Colaboradores</p>
                          <p className="font-bold text-primary">
                            {fmtMoney(bundle.totales.total_neto_colaboradores)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
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
    <Card className={`border-border overflow-hidden ${bordesPorLabor[labor]}`}>
      <CardHeader className="py-3 px-5 bg-muted/20 border-b border-border">
        <div className="flex items-center gap-3">
          <Badge className={`${colorPorLabor[labor]} border text-xs font-semibold px-3 py-0.5`}>
            {labor}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {count} registro{count !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <Th>Fecha</Th>
                <Th>Col. 1</Th>
                <Th>Col. 2</Th>
                <Th>Col. 3</Th>
                <Th>Cuadrilla</Th>
                <Th>Lote</Th>
                {esCosecha && (
                  <>
                    <Th className="text-right">Nº Gajos</Th>
                    <Th className="text-right">Kilos</Th>
                    <Th className="text-right">Promedio</Th>
                  </>
                )}
                <Th className="text-right">Precio</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-center">Colab.</Th>
                <Th className="text-right">Pago x Colab.</Th>
                <Th className="text-right bg-primary/5">$ Col Neto</Th>
              </tr>
            </thead>
            <tbody>
              {esCosecha
                ? registrosCosecha.map((r, idx) => (
                    <FilaCosecha key={r.id} r={r} idx={idx} />
                  ))
                : registrosJornal.map((r, idx) => (
                    <FilaJornal key={r.id} r={r} idx={idx} />
                  ))}
              {/* Subtotal por labor */}
              <tr className="border-t-2 border-dashed border-muted-foreground/20 bg-muted/10 font-semibold text-xs">
                <td className="p-3 text-muted-foreground" colSpan={6}>Subtotal {labor}</td>
                {esCosecha && (
                  <>
                    <td className="p-3"></td>
                    <td className="p-3 text-right">{fmtNumero(subtotalKilos)}</td>
                    <td className="p-3"></td>
                  </>
                )}
                <td className="p-3"></td>
                <td className="p-3 text-right text-success">
                  {fmtMoney(esCosecha ? subtotalTotalMostrar : subtotal_total)}
                </td>
                <td className="p-3"></td>
                <td className="p-3"></td>
                <td className="p-3 text-right text-primary bg-primary/5">
                  {fmtMoney(esCosecha ? subtotalColNetoMostrar : subtotal_col_neto)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function FilaCosecha({ r, idx }: { r: PlanillaDiariaFilaCosecha; idx: number }) {
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
    <tr className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}>
      <td className="p-3 whitespace-nowrap">{fmtFecha(r.fecha)}</td>
      <TdColab nombre={cols.col1} c={r.colaboradores[0]} />
      <TdColab nombre={cols.col2} c={r.colaboradores[1]} />
      <TdColab nombre={cols.col3} c={r.colaboradores[2]} />
      <td className="p-3 text-muted-foreground whitespace-nowrap max-w-[220px] truncate" title={cols.cuadrilla}>
        {cols.cuadrilla || '-'}
      </td>
      <td className="p-3 font-semibold whitespace-nowrap">{r.lote}</td>
      <td className="p-3 text-right whitespace-nowrap">{fmtNumero(gajos)}</td>
      <td className="p-3 text-right font-semibold whitespace-nowrap">
        {kilos > 0 ? fmtNumero(kilos) : '—'}
      </td>
      <td className="p-3 text-right whitespace-nowrap">
        {promedio > 0 ? fmtNumero(promedio, 2) : '—'}
      </td>
      <td className="p-3 text-right whitespace-nowrap">{fmtMoney(precio)}</td>
      <td className="p-3 text-right font-semibold text-success whitespace-nowrap">
        {total > 0 ? fmtMoney(total) : '—'}
      </td>
      <td className="p-3 text-center font-semibold whitespace-nowrap">{r.num_colaboradores}</td>
      <td className="p-3 text-right font-medium whitespace-nowrap">
        {pagoPorColab > 0 ? fmtMoney(pagoPorColab) : '—'}
      </td>
      <td className="p-3 text-right font-bold text-primary bg-primary/5 whitespace-nowrap">
        {fmtMoney(colNeto)}
      </td>
    </tr>
  );
}

function FilaJornal({ r, idx }: { r: PlanillaDiariaFilaJornal; idx: number }) {
  const cols = distribuirColaboradores(r.colaboradores);
  return (
    <tr className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}>
      <td className="p-3 whitespace-nowrap">{fmtFecha(r.fecha)}</td>
      <TdColab nombre={cols.col1} c={r.colaboradores[0]} />
      <TdColab nombre={cols.col2} c={r.colaboradores[1]} />
      <TdColab nombre={cols.col3} c={r.colaboradores[2]} />
      <td className="p-3 text-muted-foreground whitespace-nowrap max-w-[220px] truncate" title={cols.cuadrilla}>
        {cols.cuadrilla || '-'}
      </td>
      <td className="p-3 font-semibold whitespace-nowrap">{r.lote ?? '—'}</td>
      <td className="p-3 text-right whitespace-nowrap">{fmtMoney(r.precio)}</td>
      <td className="p-3 text-right font-semibold text-success whitespace-nowrap">{fmtMoney(r.total)}</td>
      <td className="p-3 text-center font-semibold whitespace-nowrap">{r.num_colaboradores}</td>
      <td className="p-3 text-right font-medium whitespace-nowrap">{fmtMoney(r.pago_por_colaborador)}</td>
      <td className="p-3 text-right font-bold text-primary bg-primary/5 whitespace-nowrap">
        {fmtMoney(r.col_neto)}
      </td>
    </tr>
  );
}

// ── Celdas reutilizables ─────────────────────────────────────────────────────
function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

/** Celda de colaborador con badge "Tercero" (naranja) cuando el colaborador es operario. */
function TdColab({ nombre, c }: { nombre: string; c?: PlanillaDiariaColaborador }) {
  if (!nombre) return <td className="p-3 font-medium whitespace-nowrap">-</td>;
  return (
    <td className="p-3 font-medium whitespace-nowrap">
      <div className="flex items-center gap-1.5">
        <span>{nombre}</span>
        {c?.tipo === 'operario' && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium whitespace-nowrap"
            title={c.tercero_nombre ? `Tercero · ${c.tercero_nombre}` : 'Tercero'}
          >
            Tercero
          </span>
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
  return Array.from(map.values()).sort((a, b) => {
    const cmp = primerApellido(a.nombre).localeCompare(primerApellido(b.nombre), 'es');
    return cmp !== 0 ? cmp : a.nombre.localeCompare(b.nombre, 'es');
  });
}

/**
 * Devuelve el primer apellido de un nombre completo.
 * Convención Colombia:
 *  - 4+ palabras (Nombre Nombre Apellido Apellido) → penúltima palabra
 *  - 3  palabras (Nombre Apellido Apellido)        → segunda palabra
 *  - 2  palabras (Nombre Apellido)                 → última palabra
 */
function primerApellido(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 4) return partes[partes.length - 2].toLowerCase();
  if (partes.length === 3) return partes[1].toLowerCase();
  if (partes.length === 2) return partes[1].toLowerCase();
  return nombre.toLowerCase();
}
