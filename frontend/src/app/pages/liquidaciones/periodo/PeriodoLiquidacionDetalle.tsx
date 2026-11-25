/**
 * Wizard "Liquidar" de un período BORRADOR — 3 pasos (información →
 * colaboradores → confirmación con desprendibles), compartido por
 * cesantías, intereses y prima (API_LIQUIDACIONES §1.2, §2.7 y §2.8).
 * Cuando el período está CERRADA delega en VistaPeriodoCerrado.
 *
 * Flujo real: el paso 2 persiste filas con POST /colaboradores (éxito
 * parcial con omitidos); el paso 3 pinta GET /preview y confirma con el
 * calculo_hash. Si los insumos cambian entre el preview y el clic, el
 * backend responde LIQUIDACION_DESACTUALIZADA y se recarga el paso 3.
 */
import { useEffect, useRef, useState } from 'react';
import { comoBoton } from '../../../hooks/comoBoton';
import { useParams, useNavigate } from 'react-router';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import {
  ArrowLeft, ArrowRight, Check, Users, X, Info, Loader2, AlertTriangle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  liquidacionesApi,
  LiquidacionesErrorCodes,
  MOTIVO_EXCLUSION_LABEL,
  BLOQUEANTE_LABEL,
  type LiquidacionPeriodoDetalle,
  type EmpleadoDisponibleLiquidacion,
  type EmpleadoExcluidoLiquidacion,
  type PreviewLiquidacionPeriodo,
  type PreviewFilaLiquidacion,
} from '../../../../api/liquidaciones';
import type { ApiError } from '../../../../api/client';
import { formatFecha } from '../../../utils/fecha';
import { comparePersonaByFirstName, sortByFirstName } from '../../../utils/personas';
import PageHeader from '../../../components/common/PageHeader';
import SeccionCard from '../../../components/liquidaciones/SeccionCard';
import DatoLista, { type Dato } from '../../../components/liquidaciones/DatoLista';
import Pasos from '../../../components/liquidaciones/Pasos';
import Desprendible from '../../../components/liquidaciones/Desprendible';
import TotalResumen from '../../../components/liquidaciones/TotalResumen';
import type { Concepto } from '../../../components/liquidaciones/ConceptosTabla';
import {
  fmtCOP, semestreLabel, TEXTOS_PERIODO, CAJA_AVISO, CAJA_NOTA, CAJA_ERROR, type TipoPeriodoDetalle,
} from './textos';
import VistaPeriodoCerrado from './VistaPeriodoCerrado';

const PASOS = ['Información del período', 'Seleccionar colaboradores', 'Confirmación'];

const METODO_LABEL: Record<string, string> = {
  ULTIMO_SALARIO: 'Último salario',
  PROMEDIO: 'Promedio devengado',
  MANUAL: 'Ajuste manual',
};

/** "cesantías" → "Cesantías", para el eyebrow del encabezado. */
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Desprendible del paso 3 ──────────────────────────────────────────────────

/** Conceptos del preview: base salarial (cesantías y prima) o saldo y tasa (intereses). */
function conceptosPreview(fila: PreviewFilaLiquidacion, tipo: TipoPeriodoDetalle): Concepto[] {
  const txt = TEXTOS_PERIODO[tipo];
  const formula = `Fórmula: ${fila.resultado.formula_aplicada}`;
  const total: Concepto = {
    label: `Total ${txt.colValor.toLowerCase()}`,
    valor: fmtCOP(fila.resultado.valor_final),
    total: true,
  };
  if (tipo === 'INTERESES_CESANTIAS') {
    return [
      { label: 'Saldo cesantías', valor: fmtCOP(fila.origen?.saldo_cesantias ?? fila.base.base_prestacional) },
      { label: 'Tasa de interés', valor: `${fila.resultado.tasa_aplicada ?? 12} % anual`, detalle: 'Ley 52 de 1975' },
      { label: 'Días laborados', valor: fila.resultado.dias, detalle: formula },
      total,
    ];
  }
  return [
    { label: 'Salario básico', valor: fmtCOP(fila.base.salario_basico) },
    { label: 'Auxilio de transporte', valor: fmtCOP(fila.base.auxilio_transporte) },
    { label: 'Promedio variables', valor: fmtCOP(fila.base.promedio_variables) },
    {
      label: 'Base prestacional',
      valor: fmtCOP(fila.base.base_prestacional),
      detalle: (fila.base.metodo_base && METODO_LABEL[fila.base.metodo_base]) || 'Base de cálculo',
    },
    { label: 'Días laborados', valor: fila.resultado.dias, detalle: formula },
    total,
  ];
}

/** Días computados con el descuento entre paréntesis cuando lo hay. */
function diasDato(fila: PreviewFilaLiquidacion, conBaseSalarial: boolean): Dato {
  if (!conBaseSalarial) return { label: 'Días laborados', value: fila.resultado.dias };
  const d = fila.dias;
  return {
    label: 'Días laborados',
    value: (
      <>
        {d.dias_computados}
        {d.dias_descontados > 0 && (
          <span className="ml-1 text-xs text-muted-foreground" title="Días descontados por suspensiones o ausencias injustificadas">
            ({d.dias_vinculacion} − {d.dias_descontados})
          </span>
        )}
      </>
    ),
  };
}

/** Avisos de la fila: valor provisional, bloqueantes y advertencias. */
function AvisosFila({ fila }: { fila: PreviewFilaLiquidacion }) {
  const diasProyectados = fila.base.dias_proyectados ?? 0;
  const advertencias = fila.advertencias.filter((a) => a.code !== 'PRIMA_TRAMO_PROYECTADO');
  if (diasProyectados === 0 && fila.bloqueantes.length === 0 && advertencias.length === 0) return null;
  return (
    <div className="space-y-2 px-5 pb-4">
      {/* §2.8: el último tramo del semestre aún no tiene nómina cerrada. */}
      {diasProyectados > 0 && (
        <div className={CAJA_AVISO}>
          <Clock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <div className="space-y-0.5">
            <p className="font-medium">Valor provisional: {diasProyectados} día(s) proyectados</p>
            <p>
              Los últimos {diasProyectados} día(s) del semestre todavía no tienen nómina cerrada. Se calculan con el promedio de lo ya liquidado para poder pagar a tiempo. Al cerrar esa nómina puedes reabrir el período y recalcular para dejar el valor definitivo.
            </p>
          </div>
        </div>
      )}
      {fila.bloqueantes.map((b) => (
        <div key={b} className={`${CAJA_ERROR} font-medium`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <p>{BLOQUEANTE_LABEL[b] ?? b}</p>
        </div>
      ))}
      {advertencias.map((a, i) => (
        <div key={i} className={CAJA_AVISO}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <p>{a.mensaje ?? a.code}</p>
        </div>
      ))}
    </div>
  );
}

interface DesprendiblePreviewProps {
  fila: PreviewFilaLiquidacion;
  tipo: TipoPeriodoDetalle;
  /** Prima muestra el semestre en la cabecera, como el diseño. */
  semestre: number;
  anio: number;
}

function DesprendiblePreview({ fila, tipo, semestre, anio }: DesprendiblePreviewProps) {
  // Prima comparte con cesantías la base salarial de tres componentes
  // (§2.8); el caso distinto es intereses, que parte de un saldo y una tasa.
  const conBaseSalarial = tipo !== 'INTERESES_CESANTIAS';
  const col = fila.empleado;
  return (
    <Desprendible
      nombre={col.nombre_completo}
      cargo={col.cargo ?? undefined}
      meta={tipo === 'PRIMA'
        ? { label: 'Semestre', value: `${semestre}° · ${anio}` }
        : { label: 'Fondo', value: col.fondo_cesantias ?? '—' }}
      datos={[
        { label: 'Cédula', value: col.documento },
        diasDato(fila, conBaseSalarial),
        {
          label: 'Período',
          value: `${formatFecha(fila.dias.fecha_computo_desde)} – ${formatFecha(fila.dias.fecha_computo_hasta)}`,
        },
      ]}
      conceptos={conceptosPreview(fila, tipo)}
    >
      <AvisosFila fila={fila} />
    </Desprendible>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function PeriodoLiquidacionDetalle({ tipo }: { tipo: TipoPeriodoDetalle }) {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const periodoId = idParam ? parseInt(idParam) : null;
  const txt = TEXTOS_PERIODO[tipo];
  const esCesantias = tipo === 'CESANTIAS';
  const esIntereses = tipo === 'INTERESES_CESANTIAS';
  const esPrima = tipo === 'PRIMA';

  const [periodo, setPeriodo] = useState<LiquidacionPeriodoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [paso, setPaso] = useState(1);

  // Paso 2
  const [elegibles, setElegibles] = useState<EmpleadoDisponibleLiquidacion[]>([]);
  const [excluidos, setExcluidos] = useState<EmpleadoExcluidoLiquidacion[]>([]);
  const [cargandoDisponibles, setCargandoDisponibles] = useState(false);
  /** Elegibles marcados, aún sin persistir (se agregan al pasar al paso 3). */
  const [marcados, setMarcados] = useState<number[]>([]);
  const [quitandoFila, setQuitandoFila] = useState<number | null>(null);

  // Paso 3
  const [preview, setPreview] = useState<PreviewLiquidacionPeriodo | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [avanzando, setAvanzando] = useState(false);

  // Cobertura < 100 % → diálogo de forzar con motivo
  const [coberturaDialog, setCoberturaDialog] = useState<
    Array<{ nombre_completo: string; cobertura_pct: number }> | null
  >(null);
  const [motivoForzado, setMotivoForzado] = useState('');

  const reqIdRef = useRef(0);

  const cargarPeriodo = async () => {
    if (!periodoId) return null;
    const reqId = ++reqIdRef.current;
    try {
      const res = await liquidacionesApi.ver(periodoId);
      if (reqId !== reqIdRef.current) return null;
      setPeriodo(res.data);
      return res.data;
    } catch (err) {
      if (reqId !== reqIdRef.current) return null;
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo cargar el período');
      return null;
    }
  };

  /** Recarga tras reabrir, girar o anular; resetea el wizard si reabrió. */
  const recargar = async () => {
    const data = await cargarPeriodo();
    if (data && data.estado === 'BORRADOR') {
      setPaso(1);
      setPreview(null);
      setElegibles([]);
      setMarcados([]);
    }
    return data;
  };

  useEffect(() => {
    setCargando(true);
    cargarPeriodo().finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoId]);

  const cargarDisponibles = async () => {
    if (!periodoId) return;
    setCargandoDisponibles(true);
    try {
      const res = await liquidacionesApi.colaboradoresDisponibles(periodoId);
      // Por primer nombre, como en Pagos: quien busca a alguien lo busca
      // por como se llama, no por el orden en que lo creo el backend.
      setElegibles(sortByFirstName(res.data.empleados));
      setExcluidos(sortByFirstName(res.meta.excluidos ?? []));
    } catch (err) {
      const e = err as ApiError;
      if (e.code === LiquidacionesErrorCodes.PERIODO_CESANTIAS_REQUERIDO) {
        toast.error('El período de cesantías base fue reabierto: confírmalo de nuevo antes de continuar', { duration: 8000 });
      } else {
        toast.error(e.message ?? 'No se pudieron cargar los colaboradores');
      }
    } finally {
      setCargandoDisponibles(false);
    }
  };

  const cargarPreview = async () => {
    if (!periodoId) return false;
    setCargandoPreview(true);
    try {
      const res = await liquidacionesApi.preview(periodoId);
      setPreview(res.data);
      return true;
    } catch (err) {
      const e = err as ApiError;
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_SIN_COLABORADORES) {
        toast.error('Agrega al menos un colaborador antes de continuar');
      } else if (e.code === LiquidacionesErrorCodes.PERIODO_CESANTIAS_REQUERIDO) {
        toast.error('El período de cesantías base fue reabierto: confírmalo de nuevo antes de continuar', { duration: 8000 });
      } else {
        toast.error(e.message ?? 'No se pudo calcular el preview');
      }
      return false;
    } finally {
      setCargandoPreview(false);
    }
  };

  const toggleMarcado = (empleadoId: number) =>
    setMarcados(prev => prev.includes(empleadoId) ? prev.filter(x => x !== empleadoId) : [...prev, empleadoId]);

  const toggleTodos = () =>
    setMarcados(marcados.length === elegibles.length ? [] : elegibles.map(e => e.id));

  const quitarFila = async (filaId: number) => {
    if (!periodoId) return;
    setQuitandoFila(filaId);
    try {
      await liquidacionesApi.quitarColaborador(periodoId, filaId);
      await cargarPeriodo();
      await cargarDisponibles();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_PERIODO_REFERENCIADO) {
        toast.error('Un período de intereses usa esta fila como base: quita primero al colaborador de ese período');
      } else {
        toast.error(e.message ?? 'No se pudo quitar el colaborador');
      }
    } finally {
      setQuitandoFila(null);
    }
  };

  /** Paso 2 → 3: persiste los marcados (éxito parcial) y calcula el preview. */
  const avanzarAConfirmacion = async () => {
    if (!periodoId || !periodo) return;
    const filasActuales = periodo.filas.length;
    if (marcados.length === 0 && filasActuales === 0) {
      toast.error('Selecciona al menos un colaborador');
      return;
    }
    setAvanzando(true);
    try {
      if (marcados.length > 0) {
        const res = await liquidacionesApi.agregarColaboradores(periodoId, { empleado_ids: marcados });
        if ((res.omitidos ?? []).length > 0) {
          const detalle = res.omitidos
            .map((o) => `${o.nombre_completo} (${MOTIVO_EXCLUSION_LABEL[o.code] ?? o.code})`)
            .join(', ');
          toast.warning(`No se agregaron: ${detalle}`, { duration: 8000 });
        }
        setMarcados([]);
        await cargarPeriodo();
      }
      const ok = await cargarPreview();
      if (ok) setPaso(3);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudieron agregar los colaboradores');
    } finally {
      setAvanzando(false);
    }
  };

  const avanzar = async () => {
    if (paso === 1) {
      setPaso(2);
      if (elegibles.length === 0 && !cargandoDisponibles) cargarDisponibles();
      return;
    }
    if (paso === 2) await avanzarAConfirmacion();
  };
  const retroceder = () => setPaso(p => p - 1);

  const confirmar = async (forzar = false) => {
    if (!periodoId || !preview) return;
    if (forzar && motivoForzado.trim().length < 5) {
      toast.error('Escribe el motivo para forzar la confirmación');
      return;
    }
    setConfirmando(true);
    try {
      const res = await liquidacionesApi.confirmar(periodoId, {
        calculo_hash: preview.calculo_hash,
        forzar: forzar || undefined,
        motivo_forzado: forzar ? motivoForzado.trim() : undefined,
      });
      setCoberturaDialog(null);
      toast.success(res.message ?? `Liquidación de ${txt.nombre} confirmada`);
      // §1.2: con 200 el período ya está CERRADA; se pasa directo a la
      // vista con las acciones de giro y desprendibles.
      setPreview(null);
      setPaso(1);
      setPeriodo(res.data);
    } catch (err) {
      const e = err as ApiError & {
        colaboradores?: Array<{ nombre_completo: string; cobertura_pct: number }>;
        detalle?: Array<{ nombre_completo: string; codes: string[] }>;
      };
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_DESACTUALIZADA) {
        toast.warning('Los datos cambiaron desde el cálculo. Se recargó el preview: revisa y confirma de nuevo.', { duration: 8000 });
        await cargarPreview();
      } else if (e.code === LiquidacionesErrorCodes.LIQUIDACION_COBERTURA_INCOMPLETA) {
        setCoberturaDialog(e.colaboradores ?? []);
      } else if (e.code === LiquidacionesErrorCodes.LIQUIDACION_ADVERTENCIAS_BLOQUEANTES) {
        const nombres = (e.detalle ?? []).map((d) => d.nombre_completo).join(', ');
        toast.error(`No se puede confirmar: ${nombres || 'hay filas'} con datos bloqueantes. Quítalos del período o corrige sus datos.`, { duration: 10000 });
      } else {
        toast.error(e.message ?? 'No se pudo confirmar la liquidación');
      }
    } finally {
      setConfirmando(false);
    }
  };

  if (cargando) {
    return (
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando período...
      </Card>
    );
  }
  if (!periodo) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={mayuscula(txt.nombre)} title="Período no encontrado" backTo={txt.rutaTab} />
        <Card className="items-center py-12 text-center">
          <p className="text-sm text-muted-foreground">No se encontró el período de liquidación.</p>
        </Card>
      </div>
    );
  }

  // ── Vista CERRADA: resumen, giros, desprendibles, reabrir ────────────────
  if (periodo.estado === 'CERRADA') {
    return <VistaPeriodoCerrado periodo={periodo} tipo={tipo} onReload={recargar} />;
  }

  // El mismo orden que la lista de elegibles, para que agregar a alguien no
  // lo mande al final de los chips.
  const filasAgregadas = [...(periodo.filas ?? [])]
    .sort((a, b) => comparePersonaByFirstName(a.empleado, b.empleado));
  const fechaLarga = (f: string) => formatFecha(f, { day: 'numeric', month: 'long', year: 'numeric' });
  const todosMarcados = elegibles.length > 0 && marcados.length === elegibles.length;
  // En la nota gris de prima la fecha resalta en el color del texto, como el diseño.
  const fuerte = esPrima ? 'text-foreground' : undefined;
  // Fondos que ya traen las filas agregadas; vacío mientras no haya nadie.
  const fondosFilas = Array.from(
    new Set(filasAgregadas.map(f => f.empleado.fondo_cesantias).filter((x): x is string => !!x)),
  ).join(', ');

  // Prima lleva el semestre en segundo lugar y la descripción al final.
  const datosPeriodo: Dato[] = [
    { label: 'Año', value: periodo.anio },
    esPrima
      ? { label: 'Semestre', value: semestreLabel(periodo.semestre) || '—' }
      : { label: 'Descripción', value: periodo.descripcion },
    { label: 'Fecha de inicio', value: formatFecha(periodo.fecha_inicio) },
    { label: 'Fecha de fin', value: formatFecha(periodo.fecha_fin) },
    ...(esPrima ? [{ label: 'Descripción', value: periodo.descripcion }] : []),
    ...(esCesantias ? [{ label: 'Fondos de cesantías', value: fondosFilas || '—' }] : []),
    ...(esIntereses ? [{ label: 'Tasa de interés', value: '12 % anual (Ley 52 de 1975, fija por ley)' }] : []),
    ...(esIntereses && periodo.periodo_base
      ? [{
          label: 'Cesantías base',
          value: `${periodo.periodo_base.descripcion} (${periodo.periodo_base.total_colaboradores} colaboradores)`,
        }]
      : []),
  ];

  // ── Wizard BORRADOR ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={mayuscula(txt.nombre)}
        title={periodo.descripcion}
        description={
          <>
            {esPrima ? semestreLabel(periodo.semestre) : txt.subtituloWizard}
            {esPrima ? ' · Límite: ' : ' · Fecha límite: '}
            {formatFecha(periodo.fecha_limite_operativa)}
            <span title={`Fecha legal: ${formatFecha(periodo.fecha_limite_legal)}`}> (legal {formatFecha(periodo.fecha_limite_legal)})</span>
          </>
        }
        backTo={txt.rutaTab}
      />

      <Pasos pasos={PASOS} actual={paso} />

      {/* ── PASO 1: Info del período ── */}
      {paso === 1 && (
        <SeccionCard title="Información del período" description="Revisa los datos antes de continuar.">
          <div className="space-y-5">
            <DatoLista items={datosPeriodo} />
            <div className={esPrima ? CAJA_NOTA : CAJA_AVISO}>
              {esPrima
                ? <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />}
              <p>
                {txt.limiteLabel}: <strong className={fuerte}>{fechaLarga(periodo.fecha_limite_legal)}</strong>, operativa el <strong className={fuerte}>{fechaLarga(periodo.fecha_limite_operativa)}</strong>. {txt.avisoLimite}
              </p>
            </div>
            {periodo.advertencias_globales.map((a, i) => (
              <div key={i} className={CAJA_AVISO}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                <p>{a.mensaje ?? a.code}</p>
              </div>
            ))}
          </div>
        </SeccionCard>
      )}

      {/* ── PASO 2: Seleccionar colaboradores ── */}
      {paso === 2 && (
        <Card className="gap-0 overflow-hidden">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <h3>Seleccionar personal</h3>
              <p className="text-sm text-muted-foreground">
                Agrega los colaboradores a este período de {txt.nombreCorto}
                {filasAgregadas.length > 0 && (
                  <span className="text-foreground"> · {filasAgregadas.length} ya en el período</span>
                )}
                {marcados.length > 0 && (
                  <span className="text-foreground"> · {marcados.length} por agregar</span>
                )}
              </p>
            </div>
            <Button variant="outline" onClick={toggleTodos} disabled={elegibles.length === 0}>
              <Users strokeWidth={2} />
              {todosMarcados ? 'Quitar todos' : 'Agregar todos'}
            </Button>
          </div>

          {/* Ya agregados al período (persistidos) */}
          {filasAgregadas.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
              {filasAgregadas.map((f) => (
                <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1.5 text-xs font-medium text-foreground">
                  {f.empleado.nombre_completo}
                  <button
                    type="button"
                    onClick={() => quitarFila(f.id)}
                    disabled={quitandoFila === f.id}
                    className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Quitar del período"
                    aria-label={`Quitar a ${f.empleado.nombre_completo}`}
                  >
                    {quitandoFila === f.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <X className="h-3 w-3" />}
                  </button>
                </span>
              ))}
            </div>
          )}

          {cargandoDisponibles ? (
            <div className="flex items-center justify-center gap-2 border-t border-border py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando colaboradores disponibles...
            </div>
          ) : elegibles.length === 0 ? (
            <p className="border-t border-border py-10 text-center text-sm text-muted-foreground">
              No hay más colaboradores elegibles para este período.
            </p>
          ) : (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead className="whitespace-nowrap bg-muted/60 text-[13px] font-medium text-muted-foreground">
                  <tr>
                    <th className="w-12 px-5 py-2.5">
                      <Checkbox checked={todosMarcados} onCheckedChange={toggleTodos} aria-label="Seleccionar todos" />
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold">Nombre</th>
                    {esIntereses ? (
                      <>
                        <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Fondo</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Saldo cesantías</th>
                        <th className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Días base</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Intereses estimados</th>
                      </>
                    ) : (
                      <>
                        {esCesantias && (
                          <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Fondo</th>
                        )}
                        <th className="px-4 py-2.5 text-right font-semibold">Salario / promedio</th>
                        {esPrima && (
                          <th className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Días</th>
                        )}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {elegibles.map((col) => {
                    const sel = marcados.includes(col.id);
                    // §3.1: para PRODUCCION el salario_base es placeholder,
                    // se pinta el promedio mensual devengado.
                    const monto = col.salario_base_es_contractual
                      ? col.salario_base
                      : col.promedio_mensual_devengado;
                    return (
                      <tr key={col.id} {...comoBoton(() => toggleMarcado(col.id))}
                        className={`cursor-pointer transition-colors ${sel ? 'bg-primary-soft' : 'hover:bg-muted/40'}`}>
                        <td className="celda-seleccion px-5 py-3">
                          <Checkbox
                            checked={sel}
                            onCheckedChange={() => toggleMarcado(col.id)}
                            onClick={e => e.stopPropagation()}
                            aria-label={`Seleccionar a ${col.nombre_completo}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{col.nombre_completo}</span>
                          <span className="block text-xs text-muted-foreground">
                            {[col.cargo, col.documento].filter(Boolean).join(' · ')}
                          </span>
                        </td>
                        {esIntereses ? (
                          <>
                            <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{col.fondo_cesantias ?? '—'}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-foreground">{fmtCOP(col.saldo_cesantias ?? 0)}</td>
                            <td className="hidden px-4 py-3 text-right tabular-nums text-foreground sm:table-cell">{col.dias_base_intereses ?? '—'}</td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              <span className="font-medium text-foreground">{fmtCOP(col.intereses_estimados ?? 0)}</span>
                              <span className="block text-xs text-muted-foreground">Tasa {col.tasa ?? 12}%</span>
                            </td>
                          </>
                        ) : (
                          <>
                            {esCesantias && (
                              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{col.fondo_cesantias ?? '—'}</td>
                            )}
                            <td className="px-4 py-3 text-right tabular-nums">
                              <span className="font-medium text-foreground">{fmtCOP(monto ?? 0)}</span>
                              <span className="block text-xs text-muted-foreground">
                                {col.salario_base_es_contractual ? 'Salario contractual' : 'Promedio mensual'}
                              </span>
                            </td>
                            {esPrima && (
                              <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">
                                <span className="text-foreground">{col.dias_computados ?? '—'}</span>
                                {(col.dias_proyectados ?? 0) > 0 && (
                                  <span className="block text-xs text-warning">{col.dias_proyectados} proyectados</span>
                                )}
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Excluidos con motivo (§3.1) */}
          {excluidos.length > 0 && (
            <div className="space-y-1.5 border-t border-border px-5 py-4">
              <p className="text-[13px] font-medium text-muted-foreground">
                {excluidos.length} colaborador{excluidos.length !== 1 ? 'es' : ''} no elegible{excluidos.length !== 1 ? 's' : ''}
              </p>
              {excluidos.map((ex) => (
                <p key={`${ex.id}-${ex.motivo}`} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{ex.nombre_completo}</span>
                  {' · '}{MOTIVO_EXCLUSION_LABEL[ex.motivo] ?? ex.motivo}
                  {ex.motivo === 'RETIRADO_EN_EL_ANIO' && ex.fecha_retiro ? ` (${formatFecha(ex.fecha_retiro)})` : ''}
                </p>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── PASO 3: Confirmación (preview del backend) ── */}
      {paso === 3 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2>Confirmación</h2>
            <p className="text-sm text-muted-foreground">
              {txt.desprendiblesLabel} · {preview?.totales.colaboradores ?? 0} colaborador{(preview?.totales.colaboradores ?? 0) !== 1 ? 'es' : ''}
            </p>
          </div>

          {cargandoPreview && (
            <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando liquidación...
            </Card>
          )}

          {!cargandoPreview && [...(preview?.filas ?? [])]
            .sort((a, b) => comparePersonaByFirstName(a.empleado, b.empleado))
            .map((fila) => (
            <DesprendiblePreview key={fila.fila_id} fila={fila} tipo={tipo} semestre={periodo.semestre} anio={periodo.anio} />
          ))}

          {/* El cierre del paso va siempre, como el diseño; en 0 mientras no haya preview. */}
          {!cargandoPreview && (
            <TotalResumen
              conteoLabel="Colaboradores liquidados"
              conteo={preview?.totales.colaboradores ?? 0}
              totalLabel={txt.totalPreviewLabel}
              total={fmtCOP(preview?.totales.valor ?? 0)}
            />
          )}
        </div>
      )}

      {/* Navegación */}
      <div className="barra-acciones flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={paso === 1 ? () => navigate(txt.rutaTab) : retroceder} disabled={avanzando || confirmando}>
          {paso > 1 && <ArrowLeft strokeWidth={2} />}
          {paso === 1 ? 'Cancelar' : 'Anterior'}
        </Button>
        {paso < 3 ? (
          <Button onClick={avanzar} disabled={avanzando}>
            {avanzando && <Loader2 className="animate-spin" />}
            Siguiente
            <ArrowRight strokeWidth={2} />
          </Button>
        ) : (
          <Button
            onClick={() => confirmar(false)}
            disabled={confirmando || cargandoPreview || !preview || (preview.bloqueantes.length > 0)}
            title={preview && preview.bloqueantes.length > 0 ? 'Hay colaboradores con datos bloqueantes: quítalos o corrige sus datos' : undefined}
          >
            {confirmando ? <Loader2 className="animate-spin" /> : <Check strokeWidth={2} />}
            Confirmar liquidación
          </Button>
        )}
      </div>

      {/* Cobertura incompleta → forzar con motivo */}
      <AlertDialog open={coberturaDialog != null} onOpenChange={(open) => !open && !confirmando && setCoberturaDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cobertura de nóminas incompleta</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Estos colaboradores tienen meses del período sin nómina cerrada en el sistema, así que su promedio puede quedar corto:</p>
                {(coberturaDialog ?? []).map((c, i) => (
                  <p key={i}><strong>{c.nombre_completo}</strong> · cobertura {Number(c.cobertura_pct).toFixed(0)}%</p>
                ))}
                <p>Puedes confirmar de todas formas dejando el motivo por escrito (queda en auditoría).</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivoForzado">Motivo <span className="text-destructive">*</span></Label>
            <Textarea
              id="motivoForzado"
              rows={3}
              value={motivoForzado}
              onChange={(e) => setMotivoForzado(e.target.value)}
              placeholder="Ej: enero a marzo se liquidó en el sistema anterior"
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmar(true)} disabled={confirmando}>
              {confirmando && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
