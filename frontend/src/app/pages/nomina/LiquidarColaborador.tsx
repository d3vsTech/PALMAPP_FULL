import { useEffect, useMemo, useState } from 'react';
import { periodoLabel } from '../../utils/periodoNomina';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Plus,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdvertenciasBanner, NotaAntesDeConfirmar } from '../../components/nomina/AdvertenciasBanner';
import { DetalleDescansos } from '../../components/nomina/DetalleDescansos';
import { DetalleAusencias } from '../../components/nomina/DetalleAusencias';
import { lineasAusenciasRemuneradas, motivosRemunerados } from '../../components/nomina/ausenciasRemuneradas';
import { FaltasInjustificadas } from '../../components/nomina/FaltasInjustificadas';
import { avisarCierreAutomatico } from '../../utils/cierreAutomaticoNomina';
import { DiasVacaciones } from '../../components/nomina/DiasVacaciones';
import { BloqueosLiquidacion } from '../../components/nomina/BloqueosLiquidacion';
import { InterrumpirVacacionDialog } from '../../components/vacaciones/InterrumpirVacacionDialog';
import {
  agruparPrestamos,
  conceptoParaPrestamo,
  etiquetaPeriodoCuota,
  filasPorDefecto,
  observacionCuota,
  observacionSaldo,
} from '../../components/nomina/prestamosLiquidacion';
import {
  nominaApi,
  PreviewLiquidacion,
  ResumenTrabajo,
  NominaConcepto,
  CategoriaResumenTrabajo,
  NominaErrorCodes,
  PrestamoCuotaPendiente,
  PrestamoVigentePreview,
  type VacacionTrabajadaEnNomina,
  type ValidacionCosechaDetalleColaborador,
} from '../../../api/nomina';
import type { ApiError } from '../../../api/client';
import { ConceptosEditables, Eyebrow, FilaMonto, thead, th } from '../../components/nomina/piezas';

interface BonificacionLocal {
  nombre: string;
  valor: number;
}

interface DeduccionLocal {
  concepto_id: number | '';
  valor: number;
  observacion: string;
  /**
   * Si la deducción proviene de una cuota de préstamo aplicada desde el
   * bloque "Cuotas pendientes", el frontend guarda el ID de la cuota para
   * enviarlo al backend en `deducciones_voluntarias[].prestamo_cuota_id`
   * (doc §5.3). Al confirmar, el backend marca la cuota como APLICADA.
   */
  prestamo_cuota_id?: number;
  /**
   * Si la fila salda el préstamo completo en vez de una cuota. Viaja como
   * `prestamo_id` + `saldar: true`, y el `valor` tiene que ser el
   * `saldo_pendiente` exacto que trae el preview.
   */
  prestamo_id?: number;
  saldar?: boolean;
}

const CATEGORIAS: { key: keyof Omit<ResumenTrabajo, 'total_general'>; titulo: string }[] = [
  { key: 'cosecha', titulo: 'Cosecha' },
  { key: 'plateo', titulo: 'Plateo' },
  { key: 'poda', titulo: 'Poda' },
  { key: 'fertilizacion', titulo: 'Fertilización' },
  { key: 'sanidad', titulo: 'Sanidad' },
  { key: 'otros', titulo: 'Otros' },
  { key: 'finca', titulo: 'Finca' },
];

/**
 * Filtro de conceptos habilitados para el bloque "Descuentos Voluntarios"
 * en la pantalla de liquidación. Excluye:
 *   - AHORRO (por decisión de negocio, no se gestiona desde nómina).
 * El resto del catálogo (adelantos, otros descuentos custom del tenant) sí
 * se muestra. Los préstamos activos NO llegan por esta vía — se pre-cargan
 * como cuotas automáticas con `prestamo_cuota_id`.
 */
function esConceptoParaAdelantos(
  c: { nombre?: string | null; codigo?: string | null },
): boolean {
  const esAhorro = /ahorro/i.test(c.nombre ?? '') || /AHORRO/.test(c.codigo ?? '');
  return !esAhorro;
}

/**
 * Etiqueta que se muestra en la UI para un concepto de deducción voluntaria.
 * El concepto seedeado por default `DCTO_ADELANTO` viene del backend como
 * "Descuento Adelantos / Préstamo", pero en esta pantalla solo se registran
 * ADELANTOS (los préstamos entran como cuota automática pre-aplicada).
 * Renombramos para no confundir al usuario.
 */
function nombreConceptoUI(
  c: { nombre?: string | null; codigo?: string | null },
): string {
  if (c.codigo === 'DCTO_ADELANTO') return 'Descuento Adelantos';
  return c.nombre ?? '';
}

/**
 * Bonificaciones y deducciones manuales que dejó la liquidación anterior.
 *
 * Re-liquidar borra los conceptos previos y reescribe con lo que llegue
 * (§5.3): sin esto, reabrir y guardar borraría el adelanto que alguien ya
 * había registrado. Las filas de préstamo se omiten porque el preview ya las
 * propone con su propio default y mandarlas dos veces responde 422.
 */
async function filasManualesPrevias(
  nominaEmpleadoId: number,
  catalogo: NominaConcepto[],
): Promise<{ bonificaciones: BonificacionLocal[]; deducciones: DeduccionLocal[] }> {
  try {
    const res = await nominaApi.desprendible(nominaEmpleadoId);
    const liq = res.data.liquidacion;
    const conceptoPrestamo = conceptoParaPrestamo(catalogo);

    const bonificaciones = (liq.bonificaciones ?? [])
      .map((b) => ({ nombre: b.observacion || b.nombre, valor: Number(b.valor) || 0 }))
      .filter((b) => b.nombre.trim() && b.valor > 0);

    const deducciones = (liq.deducciones ?? [])
      .filter((d) => {
        if (!d.es_manual) return false;
        if (d.prestamo_cuota_id != null || d.prestamo_id != null || d.saldar) return false;
        // Un backend anterior a 2026-11-19 no manda esas tres llaves, así que
        // una cuota de préstamo y un adelanto suelto se ven igual. Ante la
        // duda se omite la del concepto de préstamos: perderla cuesta un clic;
        // duplicarla le cobra dos veces al colaborador.
        const sinDato = d.prestamo_cuota_id === undefined && d.prestamo_id === undefined;
        return !(sinDato && conceptoPrestamo && d.codigo === conceptoPrestamo.codigo);
      })
      .map((d) => {
        const concepto = catalogo.find((c) => c.codigo === d.codigo);
        return {
          concepto_id: concepto ? concepto.id : '',
          valor: Number(d.valor) || 0,
          observacion: d.observacion ?? '',
        } as DeduccionLocal;
      })
      .filter((d) => d.concepto_id !== '' && d.valor > 0);

    return { bonificaciones, deducciones };
  } catch {
    // Sin desprendible (fila PENDIENTE, backend viejo) no hay nada que
    // reconstruir y el editor abre solo con lo que trae el preview.
    return { bonificaciones: [], deducciones: [] };
  }
}

export default function LiquidarColaborador() {
  const { nominaId, colaboradorId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nominaEmpleadoId = colaboradorId ? parseInt(colaboradorId) : null;
  /** Si la URL trae ?reliquidar=1, se usa PUT en vez de POST (re-liquidar). */
  const esReliquidacion = searchParams.get('reliquidar') === '1';

  const [preview, setPreview] = useState<PreviewLiquidacion | null>(null);
  const [resumen, setResumen] = useState<ResumenTrabajo | null>(null);
  /**
   * Detalle de cosechas del colaborador según el bundle de Validar Cosecha
   * (§4.1) — la misma tabla del paso 3 del wizard, filtrada a esta persona.
   * `null` = sin datos (sin cosechas, o el bundle falló; la tabla no se pinta).
   */
  const [detalleCosechas, setDetalleCosechas] = useState<ValidacionCosechaDetalleColaborador | null>(null);
  const [conceptos, setConceptos] = useState<NominaConcepto[]>([]);
  const [cargando, setCargando] = useState(true);

  // Inputs editables. Los días trabajados no están: los calcula el backend
  // desde las planillas (§9.1) y aquí solo se muestran.
  const [bonificaciones, setBonificaciones] = useState<BonificacionLocal[]>([]);
  const [deducciones, setDeducciones] = useState<DeduccionLocal[]>([]);

  const [enviando, setEnviando] = useState(false);
  /**
   * PR-V2 — La vacación que la advertencia propone interrumpir. Es acá donde
   * se descubre el regreso anticipado: la planilla tiene jornal en días que
   * el módulo de Liquidaciones ya pagó como vacaciones.
   */
  const [vacacionAInterrumpir, setVacacionAInterrumpir] = useState<VacacionTrabajadaEnNomina | null>(null);
  /** Período de la nómina para el encabezado. Si no carga, se omite. */
  const [periodo, setPeriodo] = useState<string | null>(null);

  useEffect(() => {
    const id = Number(nominaId);
    if (!id) return;
    nominaApi.ver(id)
      .then((res) => setPeriodo(periodoLabel(res.data)))
      .catch(() => setPeriodo(null));
  }, [nominaId]);

  // Carga inicial: preview siempre, resumen solo si VARIABLE, conceptos según tipo
  useEffect(() => {
    if (!nominaEmpleadoId) return;
    setCargando(true);

    nominaApi
      .preview(nominaEmpleadoId)
      .then(async (prev) => {
        setPreview(prev.data);
        // Persistimos el NETO propuesto recalculado en sessionStorage — es
        // lo que efectivamente cobra el colaborador (bruto + subsidio − ded.).
        // El listado del detalle de nómina lo lee para pintar el mismo valor
        // que ve el liquidador acá. TTL de 10 min lo maneja el listado.
        try {
          sessionStorage.setItem(
            `nomina_preview_neto_${nominaEmpleadoId}`,
            JSON.stringify({
              total: Number(
                prev.data.total_neto_propuesto_con_prestamos
                  ?? prev.data.total_neto_propuesto
                  ?? 0,
              ),
              at: Date.now(),
            }),
          );
        } catch { /* sessionStorage puede estar deshabilitado */ }

        // Los detalles de horas extras y ausencias (con motivo, tipo, etc.)
        // ahora vienen directamente en el preview (§5.1 nuevos campos
        // `detalle_horas_extra`, `detalle_ausencias`, `pendientes_por_aprobar`).
        // Ya no consultamos los endpoints separados.

        const aplicaA = prev.data.empleado.salario_tipo;
        // Para operarios (`salario_tipo === null`) no aplican deducciones
        // voluntarias ni bonificaciones (doc §5.3 — backend rechaza con 422).
        if (aplicaA !== null) {
          // 1) Intento con filtro aplica_a. Algunos backends no incluyen
          //    los conceptos con aplica_a=AMBOS al filtrar por FIJO/VARIABLE,
          //    así que si viene vacío o corto, hacemos fallback sin filtro.
          let conceptosRes = await nominaApi.conceptos.select({
            tipo: 'DEDUCCION_VOLUNTARIA',
            aplica_a: aplicaA,
          });
          if (!conceptosRes.data || conceptosRes.data.length === 0) {
            conceptosRes = await nominaApi.conceptos.select({
              tipo: 'DEDUCCION_VOLUNTARIA',
            });
          }
          // 2) Si el select sigue vacío (algunos tenants no tienen sembrado el
          //    catálogo activo), intentamos con `listar` que trae también los
          //    conceptos inactivos — mejor mostrarlos que dejar el dropdown vacío.
          if (!conceptosRes.data || conceptosRes.data.length === 0) {
            const listRes = await nominaApi.conceptos.listar({
              tipo: 'DEDUCCION_VOLUNTARIA',
            });
            conceptosRes = { data: listRes.data ?? [] } as any;
          }
          const catalogo = conceptosRes.data ?? [];
          setConceptos(catalogo);

          // 2026-11-19 — El editor abre con la cuota del período y las
          // atrasadas ya aplicadas; el liquidador quita las que no van. Sin
          // concepto en el catálogo no se propone nada: el backend exige
          // `concepto_id` en cada deducción voluntaria.
          const porDefecto = filasPorDefecto(
            prev.data.prestamos_pendientes ?? [],
            prev.data.prestamos_vigentes ?? [],
            conceptoParaPrestamo(catalogo),
          );
          const previas = esReliquidacion
            ? await filasManualesPrevias(nominaEmpleadoId, catalogo)
            : { bonificaciones: [], deducciones: [] };

          setBonificaciones(previas.bonificaciones);
          setDeducciones([...previas.deducciones, ...porDefecto]);

          if (aplicaA === 'VARIABLE') {
            const res = await nominaApi.resumenTrabajo(nominaEmpleadoId);
            setResumen(res.data);
          }
        } else {
          // Operario VARIABLE-like (siempre tiene jornales/cosechas).
          try {
            const res = await nominaApi.resumenTrabajo(nominaEmpleadoId);
            setResumen(res.data);
          } catch {
            // Silencioso — algunos backends no exponen resumen para operario.
          }
        }
      })
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar liquidación'))
      .finally(() => setCargando(false));
    // `esReliquidacion` decide si se reconstruyen las filas manuales previas.
  }, [nominaEmpleadoId, esReliquidacion]);

  // Detalle de cosechas de esta persona desde el bundle de Validar Cosecha
  // (§4.1). Silencioso: si el bundle falla (permiso, backend viejo) o la
  // persona no tiene cosechas, la tabla simplemente no se pinta.
  useEffect(() => {
    const nid = nominaId ? parseInt(nominaId) : null;
    if (!nid || !preview) return;
    const esOperario = preview.empleado.tercero != null;
    let vigente = true;
    nominaApi
      .validarCosecha(nid)
      .then((res) => {
        if (!vigente) return;
        const match = (res.data.detalle_por_colaborador ?? []).find(
          (d) =>
            d.colaborador_id === preview.empleado.id
            && d.tipo === (esOperario ? 'OPERARIO' : 'EMPLEADO'),
        );
        setDetalleCosechas(match && (match.cosechas?.length ?? 0) > 0 ? match : null);
      })
      .catch(() => { /* sin tabla — no bloquear la liquidación */ });
    return () => { vigente = false; };
  }, [nominaId, preview]);

  /**
   * Promedio kg/gajo del LOTE por cosecha, desde el bundle de Validar
   * Cosecha (§4.1), indexado por fecha|lote|sublote para cruzarlo con las
   * filas del Resumen de Trabajo. Es el promedio con el que se calcula el
   * jornal (racimos empleado × promedio × precio).
   */
  const promsCosecha = useMemo(() => {
    const map = new Map<string, { efectivo: number | null }>();
    for (const c of detalleCosechas?.cosechas ?? []) {
      const key = `${(c.fecha ?? '').slice(0, 10)}|${c.lote ?? ''}|${c.sublote ?? ''}`;
      if (!map.has(key)) {
        map.set(key, {
          efectivo: c.promedio_efectivo != null ? Number(c.promedio_efectivo) : null,
        });
      }
    }
    return map;
  }, [detalleCosechas]);

  /** Normaliza la fecha de una fila del resumen (dd/mm/yyyy o ISO) a YYYY-MM-DD. */
  const normFecha = (raw?: string): string => {
    if (!raw) return '';
    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return raw.slice(0, 10);
  };

  const promDeFila = (f: { fecha?: string; lote?: string | null; sublote?: string | null }) =>
    promsCosecha.get(`${normFecha(f.fecha)}|${f.lote ?? ''}|${f.sublote ?? ''}`);

  // Cálculo en vivo del neto incluyendo bonificaciones/deducciones locales
  const totales = useMemo(() => {
    if (!preview) return null;
    // Para operarios todos los campos legales son 0/null. El motor calcula
    // total_neto_propuesto = total_devengado (doc §5.1).
    const totalBoni = bonificaciones.reduce((s, b) => s + (Number(b.valor) || 0), 0);
    const totalDedVol = deducciones.reduce((s, d) => s + (Number(d.valor) || 0), 0);
    const devengado = preview.total_devengado + totalBoni;
    const dedLegales = preview.total_deducciones_legales ?? 0;
    const subsidio = preview.subsidio_transporte ?? 0;
    const deduccionesTot = dedLegales + totalDedVol;
    const neto = devengado + subsidio - deduccionesTot;
    return { devengado, deduccionesTot, neto, totalBoni, totalDedVol, subsidio, dedLegales };
  }, [preview, bonificaciones, deducciones]);

  const agregarBonificacion = () =>
    setBonificaciones((prev) => [...prev, { nombre: '', valor: 0 }]);
  const quitarBonificacion = (i: number) =>
    setBonificaciones((prev) => prev.filter((_, idx) => idx !== i));
  const actualizarBonificacion = (i: number, campo: keyof BonificacionLocal, valor: any) =>
    setBonificaciones((prev) => prev.map((b, idx) => (idx === i ? { ...b, [campo]: valor } : b)));

  const agregarDeduccion = () =>
    setDeducciones((prev) => [...prev, { concepto_id: '', valor: 0, observacion: '' }]);
  const quitarDeduccion = (i: number) =>
    setDeducciones((prev) => prev.filter((_, idx) => idx !== i));
  const actualizarDeduccion = (i: number, campo: keyof DeduccionLocal, valor: any) =>
    setDeducciones((prev) => prev.map((d, idx) => (idx === i ? { ...d, [campo]: valor } : d)));

  /**
   * El concepto bajo el que entra un descuento de préstamo, en este orden:
   * 1) DCTO_ADELANTO o subtipo PRESTAMO del catálogo del tenant;
   * 2) el primer DEDUCCION_VOLUNTARIA disponible;
   * 3) si el catálogo está vacío, se crea.
   *
   * El módulo de Préstamos maneja las cuotas, pero el backend de nómina exige
   * `concepto_id` en cada deducción voluntaria (§5.3): se siembra solo para no
   * dejar al liquidador atascado. Devuelve `null` si no se pudo resolver.
   */
  const resolverConceptoPrestamo = async (): Promise<NominaConcepto | null> => {
    const existente = conceptoParaPrestamo(conceptos);
    if (existente) return existente;

    try {
      const creado = await nominaApi.conceptos.crear({
        codigo: 'DCTO_ADELANTO',
        nombre: 'Descuento Adelantos / Préstamo',
        tipo: 'DEDUCCION_VOLUNTARIA',
        subtipo: 'PRESTAMO',
        operacion: 'RESTA',
        calculo: 'VALOR_FIJO',
        aplica_a: 'AMBOS',
        activo: true,
      } as Partial<NominaConcepto>);
      setConceptos((prev) => [...prev, creado.data]);
      toast.success('Concepto "DCTO_ADELANTO" activado automáticamente');
      return creado.data;
    } catch (err) {
      toast.error(
        (err as ApiError).message
          ?? 'No se pudo activar el concepto para préstamos. Ve a Configuración → Conceptos de nómina.',
        { duration: 6000 },
      );
      return null;
    }
  };

  /**
   * Vuelve a aplicar una cuota que el liquidador había quitado. El backend
   * valida `prestamo_cuota_id` al confirmar (doc §5.3) y exige el `monto`
   * exacto, así que el valor viaja como lo manda el preview.
   */
  const aplicarCuotaPrestamo = async (cuota: PrestamoCuotaPendiente) => {
    if (deducciones.some((d) => d.prestamo_cuota_id === cuota.prestamo_cuota_id)) return;
    const conceptoPrestamo = await resolverConceptoPrestamo();
    if (!conceptoPrestamo) return;

    setDeducciones((prev) => [
      // Aplicar la cuota y saldar el préstamo se contradicen: el saldo ya la
      // incluye y mandar las dos cosas responde 422. Manda el último clic.
      ...prev.filter((d) => !(d.saldar && d.prestamo_id === cuota.prestamo_id)),
      {
        concepto_id: conceptoPrestamo.id,
        valor: cuota.monto,
        observacion: observacionCuota(cuota),
        prestamo_cuota_id: cuota.prestamo_cuota_id,
      },
    ]);
  };

  /**
   * Saca la cuota del descuento. Queda PENDIENTE y vuelve a proponerse en la
   * siguiente liquidación; nunca se envía con valor 0, que es un 422.
   */
  const quitarCuotaPrestamo = (prestamoCuotaId: number) =>
    setDeducciones((prev) => prev.filter((d) => d.prestamo_cuota_id !== prestamoCuotaId));

  /**
   * Descuenta todo el saldo del préstamo en un solo renglón (API_PRESTAMOS
   * §7.2). El `valor` es el `saldo_pendiente` del preview, sin tocar: el
   * backend lo compara exacto y responde `PRESTAMO_VALOR_NO_COINCIDE` si no
   * cuadra.
   */
  const saldarPrestamo = async (p: PrestamoVigentePreview) => {
    if (deducciones.some((d) => d.saldar && d.prestamo_id === p.prestamo_id)) return;
    const concepto = await resolverConceptoPrestamo();
    if (!concepto) return;

    const cuotasDelPrestamo = new Set(
      (preview?.prestamos_pendientes ?? [])
        .filter((c) => c.prestamo_id === p.prestamo_id)
        .map((c) => c.prestamo_cuota_id),
    );

    setDeducciones((prev) => [
      // El saldo cubre todas las cuotas del préstamo: las individuales salen.
      ...prev.filter(
        (d) => d.prestamo_cuota_id == null || !cuotasDelPrestamo.has(d.prestamo_cuota_id),
      ),
      {
        concepto_id: concepto.id,
        valor: p.saldo_pendiente,
        observacion: observacionSaldo(p),
        prestamo_id: p.prestamo_id,
        saldar: true,
      },
    ]);
  };

  /** Deshace el saldo: sus cuotas vuelven al default que trae el preview. */
  const quitarSaldoPrestamo = (p: PrestamoVigentePreview) => {
    const concepto = conceptoParaPrestamo(conceptos);
    const cuotas = (preview?.prestamos_pendientes ?? [])
      .filter((c) => c.prestamo_id === p.prestamo_id);

    setDeducciones((prev) => {
      const sinSaldo = prev.filter((d) => !(d.saldar && d.prestamo_id === p.prestamo_id));
      if (!concepto) return sinSaldo;
      const yaEstan = new Set(sinSaldo.map((d) => d.prestamo_cuota_id));
      const vuelven = cuotas
        .filter((c) => c.aplicar_por_defecto !== false && !yaEstan.has(c.prestamo_cuota_id))
        .map((c) => ({
          concepto_id: concepto.id,
          valor: c.monto,
          observacion: observacionCuota(c),
          prestamo_cuota_id: c.prestamo_cuota_id,
        }));
      return [...sinSaldo, ...vuelven];
    });
  };

  /** Préstamos que ya se saldan en esta liquidación. */
  const prestamosSaldados = new Set(
    deducciones
      .filter((d) => d.saldar && d.prestamo_id != null)
      .map((d) => d.prestamo_id as number),
  );

  /** Cuotas que esta liquidación descuenta — las demás quedan PENDIENTE. */
  const cuotasAplicadas = new Set(
    deducciones
      .filter((d) => d.prestamo_cuota_id != null)
      .map((d) => d.prestamo_cuota_id as number),
  );

  /**
   * PR-N8: el preview anticipa el 409 del POST. Con esto el botón se apaga en
   * vez de dejar que el usuario descubra el rechazo después de revisar toda
   * la liquidación.
   */
  const hayBloqueos = (preview?.bloqueos?.length ?? 0) > 0;

  /**
   * Vuelve a pedir el preview para repintar los bloqueos.
   *
   * Solo el preview: el resumen de trabajo y los conceptos no cambian porque
   * alguien haya registrado una novedad en otra pantalla.
   */
  const refrescarBloqueos = async () => {
    if (!nominaEmpleadoId) return;
    try {
      const prev = await nominaApi.preview(nominaEmpleadoId);
      setPreview(prev.data);
    } catch {
      // Si falla, el toast del 409 ya dijo lo que pasa; no hay nada más que
      // mostrar y la pantalla sigue usable con los datos que ya tenía.
    }
  };

  /**
   * Recarga el preview y vuelve a sembrar las filas de préstamo con los
   * valores vigentes. Es la salida del 422 por valor o cuota desactualizada:
   * las filas manuales se conservan, porque lo que cambió fue el préstamo.
   */
  const recargarPrestamos = async () => {
    if (!nominaEmpleadoId) return;
    try {
      const prev = await nominaApi.preview(nominaEmpleadoId);
      setPreview(prev.data);
      const porDefecto = filasPorDefecto(
        prev.data.prestamos_pendientes ?? [],
        prev.data.prestamos_vigentes ?? [],
        conceptoParaPrestamo(conceptos),
      );
      setDeducciones((actuales) => [
        ...actuales.filter((d) => d.prestamo_cuota_id == null && !d.saldar),
        ...porDefecto,
      ]);
    } catch {
      // El toast del 422 ya dijo qué pasó; la pantalla sigue usable con lo
      // que tenía y el liquidador puede recargarla.
    }
  };

  const liquidar = async () => {
    if (!nominaEmpleadoId || !preview) return;
    const esOperario = preview.empleado.salario_tipo === null;
    // Ignoramos las filas "vacías" (sin valor o sin concepto) — el usuario
    // pudo agregar una por error desde el botón "+ Agregar" y no llenarla.
    // Las cuotas de préstamo se incluyen siempre que tengan `prestamo_cuota_id`,
    // aunque `concepto_id` esté vacío por catálogo no sembrado (el backend
    // las procesa como cuotas y aplica el descuento).
    const deduccionesEfectivas = esOperario
      ? []
      : deducciones.filter((d) =>
          d.prestamo_cuota_id != null
            || d.saldar
            || (d.concepto_id && d.valor > 0),
        );
    const bonificacionesEfectivas = esOperario
      ? []
      : bonificaciones.filter((b) => b.nombre.trim() && b.valor > 0);
    if (!esOperario) {
      // Solo validamos ítems del usuario (sin `prestamo_cuota_id`): valor > 0
      // sin concepto, o concepto sin valor. Las cuotas de préstamo se
      // aplicaron desde el botón "Aplicar" y ya vienen con datos válidos.
      const dedManuales = deducciones.filter(
        (d) => d.prestamo_cuota_id == null && !d.saldar,
      );
      if (dedManuales.some((d) => (d.concepto_id && d.valor <= 0)
        || (!d.concepto_id && d.valor > 0))) {
        toast.error('Completa el concepto y el valor en las deducciones agregadas');
        return;
      }
      if (bonificaciones.some((b) => (b.nombre.trim() && b.valor <= 0)
        || (!b.nombre.trim() && b.valor > 0))) {
        toast.error('Completa el nombre y el valor en las bonificaciones agregadas');
        return;
      }
      // Si hay cuotas de préstamo sin concepto asignado (el catálogo del
      // tenant no tiene DCTO_ADELANTO), avisamos con acción clara.
      if (deducciones.some((d) => (d.prestamo_cuota_id != null || d.saldar) && !d.concepto_id)) {
        toast.error(
          'Falta activar un concepto de deducción voluntaria (ej. DCTO_ADELANTO) en Configuración → Conceptos de nómina para aplicar la cuota de préstamo.',
          { duration: 6000 },
        );
        return;
      }
    }

    setEnviando(true);
    try {
      // §9.9 — Para VARIABLE los días se derivan del sistema (asistencia +
      // ausencias). `dias_trabajados` es opcional en el body: omitirlo deja
      // que el backend use el suyo, que es el del preview que el usuario está
      // viendo. No se manda nunca, ni siquiera en FIJO, porque ya no hay forma
      // de capturarlo a mano.
      const payload = esOperario
        ? {}
        : {
            bonificaciones: bonificacionesEfectivas.map((b) => ({
              nombre: b.nombre,
              valor: Number(b.valor),
            })),
            deducciones_voluntarias: deduccionesEfectivas.map((d) => ({
              concepto_id: Number(d.concepto_id),
              valor: Number(d.valor),
              observacion: d.observacion || undefined,
              // Si la deducción proviene de una cuota de préstamo, enviamos
              // el ID para que el backend marque la cuota como APLICADA
              // y actualice el saldo (doc §5.3 + §15).
              prestamo_cuota_id: d.prestamo_cuota_id,
              // O el préstamo entero: todas sus cuotas pendientes bajo este
              // mismo concepto. Los dos campos son excluyentes por ítem.
              prestamo_id: d.prestamo_id,
              saldar: d.saldar,
            })),
          };
      // Si vino ?reliquidar=1, usar PUT (re-liquidar). Si no, POST (liquidar).
      // El backend acepta ambos; la diferencia es que re-liquidar borra los
      // conceptos previos y reescribe (doc §5.3).
      const res = esReliquidacion
        ? await nominaApi.reLiquidar(nominaEmpleadoId, payload)
        : await nominaApi.liquidar(nominaEmpleadoId, payload);
      toast.success(res.message ?? (esReliquidacion ? 'Liquidación actualizada' : 'Empleado liquidado'));
      // §4.4 — advertencia post-liquidación si había cosechas con
      // `alerta_despacho = "ALTA"`. No bloquea (la liquidación ya se hizo).
      if (res.advertencia?.code === 'COSECHA_GAJOS_SIN_DESPACHAR') {
        toast.warning(res.advertencia.texto, { duration: 8000 });
      }
      /*
       * §5.3 — Si esta era la última fila PENDIENTE, el backend ya cerró la
       * nómina. Y si el cierre se bloqueó, la liquidación igual quedó
       * guardada: el aviso dice qué falta por resolver.
       *
       * Al cerrarse, la pantalla a la que lleva es Pagos y no el
       * desprendible: el período terminó y lo que sigue es el listado, no
       * un comprobante más. El desprendible queda a un clic desde ahí.
       */
      if (avisarCierreAutomatico(res.cierre_automatico)) {
        navigate('/nomina');
        return;
      }
      navigate(`/nomina/${nominaId}/desprendible/${nominaEmpleadoId}`);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.PRESTAMO_CUOTA_NO_PENDIENTE) {
        toast.error('Una de las cuotas de préstamo ya fue aplicada en otra nómina', {
          duration: 9000,
          description: 'Se recargaron los descuentos del préstamo: revise y vuelva a guardar.',
        });
        void recargarPrestamos();
      } else if (e.code === NominaErrorCodes.PRESTAMO_CUOTA_EMPLEADO_MISMATCH
        || e.code === NominaErrorCodes.PRESTAMO_EMPLEADO_MISMATCH) {
        toast.error('El préstamo no pertenece a este colaborador');
      } else if (e.code === NominaErrorCodes.PRESTAMO_NO_VIGENTE) {
        toast.error('El préstamo ya no está vigente: se pagó o se canceló');
      } else if (e.code === NominaErrorCodes.PRESTAMO_SIN_CUOTAS_PENDIENTES) {
        toast.error('Ese préstamo ya no tiene cuotas pendientes');
      } else if (e.code === NominaErrorCodes.PRESTAMO_VALOR_NO_COINCIDE) {
        // El backend compara contra el monto exacto. Si llegamos aquí, el
        // saldo cambió mientras la pantalla estaba abierta: recargar el
        // preview trae los valores nuevos.
        toast.error('El valor del préstamo cambió', {
          duration: 9000,
          description: e.message
            ?? 'Se recargaron los descuentos del préstamo: revise y vuelva a guardar.',
        });
        void recargarPrestamos();
      } else if (e.code === NominaErrorCodes.NOVEDADES_PENDIENTES_EN_PERIODO) {
        // PR-N8 — El preview ya lo anticipa en `bloqueos[]`, así que llegar
        // aquí significa que la novedad se registró mientras esta pantalla
        // estaba abierta. Recargar el preview pinta el bloqueo y apaga el botón.
        toast.error('Hay novedades sin aprobar que cruzan el período', {
          duration: 10000,
          description: e.message ?? 'Decídalas en Novedades y vuelva a intentar.',
        });
        void refrescarBloqueos();
      } else {
        toast.error(e.message ?? 'Error al liquidar');
      }
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando liquidación...
      </Card>
    );
  }

  if (!preview) {
    return (
      <div className="space-y-6">
        <PageHeader
          backTo={`/nomina/${nominaId}`}
          title="No encontrado"
          description="No se encontró la información de liquidación."
        />
      </div>
    );
  }

  const empleado = preview.empleado;
  /** Operario de tercero — sin deducciones legales, sin subsidio, sin
   *  bonificaciones ni deducciones voluntarias (doc §5.1 y §8.8). */
  const esOperario = empleado.salario_tipo === null;

  return (
    <div className="space-y-6">
      {/* Los días trabajados son un dato calculado, no capturado: el
          backend los deriva de las planillas aprobadas, las novedades, los
          descansos perdidos y las vacaciones (§9.1). Si el número no cuadra,
          se corrige la planilla, no esta pantalla. */}
      <PageHeader
        backTo={`/nomina/${nominaId}`}
        eyebrow={`${esReliquidacion ? 'Re-liquidación' : 'Liquidar colaborador'}${periodo ? ` · ${periodo}` : ''}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {empleado.nombre_completo}
            <Badge variant="outline">
              {esOperario
                ? `Tercero${empleado.tercero ? ` · ${empleado.tercero.razon_social}` : ''}`
                : empleado.salario_tipo}
            </Badge>
          </span>
        }
        description={`C.C. ${empleado.documento || '-'} · ${preview.dias_trabajados} de ${preview.dias_periodo} días trabajados`}
      />

      {/* Resumen de trabajo — solo para colaboradores con salario VARIABLE.
          Muestra los jornales agrupados por categoría (Cosecha, Poda, Plateo,
          Sanidad, etc.) con subtotales y total general del período. */}
      {empleado.salario_tipo === 'VARIABLE' && resumen && (
        <Card className="gap-0 overflow-hidden">
          <CardHeader className="border-b pb-5">
            <CardTitle>Resumen de trabajo</CardTitle>
            <CardDescription>Planilla diaria del período, agrupada por actividad</CardDescription>
          </CardHeader>
          {!CATEGORIAS.some(({ key }) => ((resumen[key] as CategoriaResumenTrabajo)?.filas.length ?? 0) > 0) ? (
            <div className="px-6 py-10 text-center">
              <p className="font-semibold text-foreground">Sin registro</p>
              <p className="text-sm text-muted-foreground">No hay registro de jornales para este período.</p>
            </div>
          ) : (
          <div>
            {CATEGORIAS.map(({ key, titulo }) => {
              const cat = resumen[key] as CategoriaResumenTrabajo;
              if (!cat || cat.filas.length === 0) return null;
              const conPrecio = cat.filas.some((f) => f.precio_kg != null);
              const conPeso = !conPrecio && cat.filas.some((f) => f.peso_kg !== undefined);
              const colsTexto = 3 + (cat.filas.some((f) => f.cosecha) ? 1 : 0);
              const cf = 'whitespace-nowrap px-4 py-2.5';
              return (
                <div key={key} className="border-b border-border last:border-b-0">
                  <div className="px-6 pt-4 pb-2">
                    <h4>{titulo}</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className={thead}>
                        <tr>
                          <th className={`${th} pl-6 text-left`}>Fecha</th>
                          <th className={`${th} text-left`}>Lote</th>
                          <th className={`${th} text-left`}>Sublote</th>
                          {cat.filas.some((f) => f.cosecha) && (
                            <th className={`${th} text-left`}>Cosecha</th>
                          )}
                          {cat.filas.some((f) => f.racimos !== undefined) && (
                            <th
                              className={`${th} text-right`}
                              title="Racimos reportados por la cuadrilla en campo. Cuando hay reconteo del viaje se muestra el ajuste."
                            >
                              Racimos
                            </th>
                          )}
                          {cat.filas.some((f) => f.cuadrilla !== undefined) && (
                            <th
                              className={`${th} text-right`}
                              title="Personas entre las que se reparte la cosecha"
                            >
                              Cuadrilla
                            </th>
                          )}
                          {cat.filas.some((f) => f.racimos_empleado !== undefined) && (
                            <th
                              className={`${th} text-right`}
                              title="Porción del empleado: floor(racimos_verificados / cuadrilla). Es lo que multiplica el jornal."
                            >
                              Racimos empleado
                            </th>
                          )}
                          {/* Promedio del bundle Validar Cosecha (§4.1) —
                              solo en la categoría cosecha y si el bundle
                              cargó. Es el kg/gajo del lote con el que se
                              calcula el jornal. */}
                          {key === 'cosecha' && promsCosecha.size > 0 && (
                            <th
                              className={`${th} text-right`}
                              title="Promedio kg/gajo del lote para toda la quincena (con este se calcula el jornal)"
                            >
                              Prom. lote
                            </th>
                          )}
                          {/* Precio/kg del lote (el tercer factor del jornal:
                              racimos × promedio × precio). Reemplaza al peso
                              estimado, que confundía porque usa el promedio
                              del viaje y la cuadrilla completa. Fallback a
                              Peso si el backend no manda precio_kg. */}
                          {cat.filas.some((f) => f.precio_kg != null) ? (
                            <th
                              className={`${th} text-right`}
                              title="Precio pactado por kg para el lote. Con este se calcula el jornal."
                            >
                              Precio/kg
                            </th>
                          ) : cat.filas.some((f) => f.peso_kg !== undefined) && (
                            <th className={`${th} text-right`}>Peso (kg)</th>
                          )}
                          {/* Valor bruto de la cosecha, como en el diseno. */}
                          {cat.filas.some((f) => f.total_cosecha != null) && (
                            <th
                              className={`${th} hidden text-right lg:table-cell`}
                              title="Valor bruto de la cosecha. Si hubo cuadrilla, es del grupo, no del colaborador."
                            >
                              Total cosecha
                            </th>
                          )}
                          {cat.filas.some((f) => f.palmas !== undefined) && (
                            <th className={`${th} text-right`}>Palmas</th>
                          )}
                          {cat.filas.some((f) => f.descripcion) && (
                            <th className={`${th} text-left`}>Descripción</th>
                          )}
                          <th className={`${th} pr-6 text-right`}>Jornal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* Ordenar por fecha ascendente. El backend devuelve
                            las fechas ya formateadas como `dd/mm/yyyy` o como
                            ISO — la función parsea ambas y cae al string si
                            no reconoce el formato para no romper. */}
                        {[...cat.filas].sort((a, b) => {
                          const toDate = (raw?: string): number => {
                            if (!raw) return 0;
                            const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                            if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`).getTime();
                            const iso = raw.includes('T') ? new Date(raw) : new Date(raw + 'T00:00:00');
                            const t = iso.getTime();
                            return isNaN(t) ? 0 : t;
                          };
                          return toDate(a.fecha) - toDate(b.fecha);
                        }).map((f, i) => (
                          <tr key={i}>
                            <td className="whitespace-nowrap px-4 py-2.5 pl-6 text-muted-foreground">{f.fecha}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 font-medium text-foreground">{f.lote ?? '-'}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{f.sublote ?? '-'}</td>
                            {cat.filas.some((x) => x.cosecha) && (
                              <td className="whitespace-nowrap px-4 py-2.5">{f.cosecha ?? '-'}</td>
                            )}
                            {cat.filas.some((x) => x.racimos !== undefined) && (
                              <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                                {f.racimos ?? '-'}
                                {/* §5.2 — Mostrar ajuste cuando el reconteo del
                                    viaje difiere del reporte de campo. */}
                                {f.racimos !== undefined
                                  && f.racimos_verificados !== undefined
                                  && f.racimos_verificados !== f.racimos && (
                                  <span
                                    className="text-warning ml-1"
                                    title="Reconteo del viaje (lo que efectivamente paga)"
                                  >
                                    → {f.racimos_verificados}
                                  </span>
                                )}
                              </td>
                            )}
                            {cat.filas.some((x) => x.cuadrilla !== undefined) && (
                              <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                                {f.cuadrilla ?? '-'}
                              </td>
                            )}
                            {cat.filas.some((x) => x.racimos_empleado !== undefined) && (
                              <td
                                className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums font-medium"
                                title={
                                  f.promedio_liquidacion != null && f.precio_kg != null
                                    ? `Jornal = ${Number(f.racimos_empleado).toLocaleString('es-CO', { maximumFractionDigits: 4 })} × ${Number(f.promedio_liquidacion).toFixed(4)} × ${Number(f.precio_kg).toLocaleString('es-CO')}`
                                    : undefined
                                }
                              >
                                {/* §5.2 (2026-09-04) — fracción exacta, ya no
                                    entero: 415/2 = 207,5. Formateamos con coma
                                    decimal y sin decimales fantasma cuando el
                                    reparto da entero. */}
                                {f.racimos_empleado != null
                                  ? Number(f.racimos_empleado).toLocaleString('es-CO', { maximumFractionDigits: 4 })
                                  : '-'}
                              </td>
                            )}
                            {key === 'cosecha' && promsCosecha.size > 0 && (
                              <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                                {/* Coma decimal (es-CO): "10,6000". Con punto
                                    parecía separador de miles. */}
                                {promDeFila(f)?.efectivo != null
                                  ? promDeFila(f)!.efectivo!.toLocaleString('es-CO', {
                                      minimumFractionDigits: 4,
                                      maximumFractionDigits: 4,
                                    })
                                  : '-'}
                              </td>
                            )}
                            {cat.filas.some((x) => x.precio_kg != null) ? (
                              <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                                {f.precio_kg != null
                                  ? `$${Number(f.precio_kg).toLocaleString('es-CO')}`
                                  : '-'}
                              </td>
                            ) : cat.filas.some((x) => x.peso_kg !== undefined) && (
                              <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{f.peso_kg ?? '-'}</td>
                            )}
                            {cat.filas.some((x) => x.total_cosecha != null) && (
                              <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted-foreground lg:table-cell">
                                {f.total_cosecha != null
                                  ? `$${Number(f.total_cosecha).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`
                                  : '-'}
                              </td>
                            )}
                            {cat.filas.some((x) => x.palmas !== undefined) && (
                              <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{f.palmas ?? '-'}</td>
                            )}
                            {cat.filas.some((x) => x.descripcion) && (
                              <td className="px-4 py-2.5 text-muted-foreground">{f.descripcion ?? '-'}</td>
                            )}
                            <td className="whitespace-nowrap px-4 py-2.5 pr-6 text-right tabular-nums">
                              ${f.jornal.toLocaleString('es-CO')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border bg-muted/60 font-semibold text-foreground">
                          <td className={`${cf} pl-6`} colSpan={colsTexto}>
                            Subtotal {titulo.toLowerCase()}
                            {conPrecio && cat.subtotal_peso !== undefined && (
                              <span className="ml-2 font-normal text-muted-foreground">· {cat.subtotal_peso} kg</span>
                            )}
                          </td>
                          {cat.filas.some((x) => x.racimos !== undefined) && (
                            <td className={`${cf} text-right tabular-nums`}>{cat.subtotal_racimos ?? ''}</td>
                          )}
                          {cat.filas.some((x) => x.cuadrilla !== undefined) && <td className={cf}></td>}
                          {cat.filas.some((x) => x.racimos_empleado !== undefined) && <td className={cf}></td>}
                          {key === 'cosecha' && promsCosecha.size > 0 && <td className={cf}></td>}
                          {conPrecio && <td className={cf}></td>}
                          {conPeso && (
                            <td className={`${cf} text-right tabular-nums`}>{cat.subtotal_peso ?? ''}</td>
                          )}
                          {cat.filas.some((x) => x.total_cosecha != null) && (
                            <td className={`${cf} hidden text-right tabular-nums lg:table-cell`}>
                              {`$${cat.filas
                                .reduce((suma, x) => suma + Number(x.total_cosecha ?? 0), 0)
                                .toLocaleString('es-CO', { maximumFractionDigits: 2 })}`}
                            </td>
                          )}
                          {cat.filas.some((x) => x.palmas !== undefined) && (
                            <td className={`${cf} text-right tabular-nums`}>{cat.subtotal_palmas ?? ''}</td>
                          )}
                          {cat.filas.some((x) => x.descripcion) && <td className={cf}></td>}
                          <td className={`${cf} pr-6 text-right tabular-nums`}>
                            ${cat.subtotal_jornal.toLocaleString('es-CO')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    {/* §5.2 — Nota aclaratoria SOLO para cosecha en cuadrilla:
                        total_cosecha es del grupo, no del empleado. Aparece
                        solo si al menos una fila trae `cuadrilla`. */}
                    {cat.filas.some((f) => (f.cuadrilla ?? 0) > 1) && (
                      <p className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
                        <strong>Nota:</strong> el valor bruto de cada cosecha corresponde a la cuadrilla completa. El jornal del colaborador se calcula sobre su porción (racimos empleado × promedio × precio).
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex items-baseline justify-between gap-4 border-t border-border px-6 py-4">
              <span className="font-semibold text-foreground">Total general</span>
              <span className="text-xl font-bold tabular-nums text-foreground">
                ${resumen.total_general.toLocaleString('es-CO')}
              </span>
            </div>
          </div>
          )}
        </Card>
      )}

      {/* Avisos de la liquidación: pendientes, gajos sin despachar,
          bloqueos y advertencias. */}
      <div className="space-y-4 empty:hidden">
          {/* Aviso de horas extras / ausencias PENDIENTES por aprobar. Doc
              §5.1: estos registros NO se incluyen en el cálculo actual hasta
              que se aprueben desde la planilla.

              PLAN_AUSENCIAS_IMPLICITAS §1.7: `ausencias` puede llegar como
              número (versión antigua) o como objeto `{ total, fechas[],
              dias_impactados, impacto_estimado }` (versión nueva). Se
              normaliza acá para no duplicar renderizado. */}
          {(() => {
            if (esOperario || !preview.pendientes_por_aprobar) return null;
            const pend = preview.pendientes_por_aprobar;
            const horasExtra = pend.horas_extra ?? 0;
            const ausenciasRaw = pend.ausencias;
            const totalAusencias =
              typeof ausenciasRaw === 'number'
                ? ausenciasRaw
                : (ausenciasRaw?.total ?? 0);
            const ausenciasRich =
              typeof ausenciasRaw === 'object' && ausenciasRaw !== null
                ? ausenciasRaw
                : null;
            // PR-N4 — las solicitudes de vacaciones PENDIENTE también quedan
            // fuera: se aprueban liquidándolas en Liquidaciones → Vacaciones.
            // Viene como objeto con las fechas, igual que `ausencias`.
            const vacacionesRich = pend.vacaciones ?? null;
            const vacaciones = vacacionesRich?.total ?? 0;
            if (horasExtra === 0 && totalAusencias === 0 && vacaciones === 0) return null;
            return (
              <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                <div className="min-w-0 flex-1 text-sm text-foreground">
                  <p className="font-medium">
                    Registros pendientes de aprobar
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Este colaborador tiene{' '}
                    {horasExtra > 0 && (
                      <strong className="font-medium text-foreground">
                        {horasExtra} hora{horasExtra !== 1 ? 's' : ''} extra
                      </strong>
                    )}
                    {horasExtra > 0 && totalAusencias > 0 && ' y '}
                    {totalAusencias > 0 && (
                      <strong className="font-medium text-foreground">
                        {totalAusencias} ausencia{totalAusencias !== 1 ? 's' : ''}
                      </strong>
                    )}
                    {(horasExtra > 0 || totalAusencias > 0) && vacaciones > 0 && ' y '}
                    {vacaciones > 0 && (
                      <strong className="font-medium text-foreground">
                        {vacaciones} solicitud{vacaciones !== 1 ? 'es' : ''} de vacaciones
                      </strong>
                    )}
                    {' '}en estado pendiente. No se incluyen en el cálculo hasta que
                    se aprueben desde la planilla correspondiente.
                  </p>
                  {vacaciones > 0 && (
                    <p className="mt-2 text-muted-foreground">
                      {(vacacionesRich?.fechas?.length ?? 0) > 0 && (
                        <>Fechas: {vacacionesRich!.fechas!.join(', ')}. </>
                      )}
                      Las vacaciones se aprueban liquidándolas en Liquidaciones →
                      Vacaciones. Si se quedan sin liquidar, esta nómina paga
                      esos días como trabajados.
                    </p>
                  )}
                  {ausenciasRich && (ausenciasRich.fechas?.length ?? 0) > 0 && (
                    <p className="mt-2 text-muted-foreground">
                      Fechas: {ausenciasRich.fechas!.join(', ')}
                      {(ausenciasRich.impacto_estimado ?? 0) > 0 && (
                        <>
                          {' · '}Impacto estimado si se aprueban:{' '}
                          <strong className="font-medium text-foreground">
                            ${ausenciasRich.impacto_estimado!.toLocaleString('es-CO')}
                          </strong>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* §4.4 — Alerta de gajos sin despachar. Solo mostrar las cosechas
              con `alerta_despacho = "ALTA"` (las BAJA son clavijos esperados
              y convertirlas en incidentes hace que se pierda la señal). */}
          {preview.alertas_cosecha
            && (preview.alertas_cosecha.total_alta ?? 0) > 0 && (
            <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
              <div className="min-w-0 flex-1 text-sm text-foreground">
                <p className="font-medium">
                  {preview.alertas_cosecha.total_gajos_pendientes_enviar} gajos sin despachar en {preview.alertas_cosecha.total_alta} cosecha{preview.alertas_cosecha.total_alta !== 1 ? 's' : ''}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Esos gajos están reportados en la planilla pero no cargados a ningún camión, así que <strong className="font-medium text-foreground">no se van a pagar en esta liquidación</strong>. Carga la fruta al camión y vuelve a liquidar para incluirlos.
                </p>
                <div className="mt-2 space-y-1">
                  {preview.alertas_cosecha.cosechas
                    .filter((c) => c.alerta_despacho === 'ALTA')
                    .map((c) => (
                      <p key={c.cosecha_id} className="text-muted-foreground">
                        {c.fecha} · {c.lote}{c.sublote ? ` · ${c.sublote}` : ''}: se pagarán {c.gajos_asignados_a_viajes} de {c.gajos_reportados} gajos
                      </p>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* §9.9 — Advertencias no bloqueantes del preview (calendario
              desactualizado, recargo desactualizado, descanso perdido).
              Se rederivan en cada re-liquidación así que no se congelan. */}
          <BloqueosLiquidacion bloqueos={preview.bloqueos} />
          <AdvertenciasBanner
            items={preview.advertencias}
            size="sm"
            onInterrumpirVacacion={setVacacionAInterrumpir}
          />

          {/* Interrumpir acorta la vacación y devuelve a PENDIENTE esta fila:
              hay que volver a liquidarla con los días ya como trabajados. */}
          <InterrumpirVacacionDialog
            vacacionId={vacacionAInterrumpir?.vacacion_id ?? null}
            comprobante={vacacionAInterrumpir?.numero_comprobante}
            fechaSugerida={vacacionAInterrumpir?.fecha_reintegro_sugerida}
            onClose={() => setVacacionAInterrumpir(null)}
            onInterrumpida={() => {
              toast.success('Vacación interrumpida: vuelva a calcular la liquidación');
              void refrescarBloqueos();
            }}
          />
      </div>

      {/* Liquidación: conceptos a la izquierda, resumen fijo a la derecha. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6">
          {/* ── DEVENGADO ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Devengado</CardTitle>
              <CardDescription>Sueldo, novedades remuneradas y subsidio de transporte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Sueldo base</span>
                {/* El backend hoy manda `preview.salario_base` ya incluyendo
                    el recargo dominical/festivo dentro (contradice doc §9.2).
                    Para no duplicar en pantalla, mostramos el salario_base
                    PURO = valor del backend − recargo, y el recargo va en su
                    línea propia abajo. El TOTAL BRUTO sigue siendo
                    `preview.total_devengado` (no cambia).
                    TODO backend: emitir `salario_base` sin el recargo, como
                    dice §9.2 — cuando eso llegue esta resta queda inocua. */}
                <span className="font-medium tabular-nums text-foreground">
                  ${(
                    preview.salario_base
                    - (preview.total_recargo_dominical ?? 0)
                    - (preview.total_recargo_festivo ?? 0)
                  ).toLocaleString('es-CO')}
                </span>
              </div>
              {(preview.total_jornales > 0 && empleado.salario_tipo !== 'FIJO') && (
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Jornales</span>
                  <span className="font-medium tabular-nums text-foreground">${preview.total_jornales.toLocaleString('es-CO')}</span>
                </div>
              )}
              {preview.total_cosecha > 0 && (
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Cosecha</span>
                  <span className="font-medium tabular-nums text-foreground">${preview.total_cosecha.toLocaleString('es-CO')}</span>
                </div>
              )}
              {(preview.total_horas_extra ?? 0) > 0 && (
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Horas extra
                    {(preview.detalle_horas_extra?.length ?? 0) > 0 && (
                      <span className="ml-1 text-muted-foreground">
                        · {Array.from(new Set(
                          preview.detalle_horas_extra!
                            .map((h) => h.tipo_nombre || h.codigo)
                            .filter(Boolean),
                        )).join(', ')}
                      </span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">${(preview.total_horas_extra ?? 0).toLocaleString('es-CO')}</span>
                </div>
              )}
              {(preview.total_recargos ?? 0) > 0 && (
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Recargos</span>
                  <span className="font-medium tabular-nums text-foreground">${(preview.total_recargos ?? 0).toLocaleString('es-CO')}</span>
                </div>
              )}
              {/* §9.9 — Descansos. `total_*` puede venir 0 cuando no hubo
                  dominicales/festivos en el rango o cuando el backend responde
                  en versión antigua (campos undefined). En ambos casos no
                  se muestra la fila. */}
              {(preview.total_dominicales ?? 0) > 0 && (
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Dominicales
                    {(preview.dias_descanso_ganados ?? 0) > 0 && (
                      <span className="ml-1 text-muted-foreground">
                        · {preview.dias_descanso_ganados} día{preview.dias_descanso_ganados !== 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    ${(preview.total_dominicales ?? 0).toLocaleString('es-CO')}
                  </span>
                </div>
              )}
              {(preview.total_festivos ?? 0) > 0 && (
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Festivos</span>
                  <span className="font-medium tabular-nums text-foreground">
                    ${(preview.total_festivos ?? 0).toLocaleString('es-CO')}
                  </span>
                </div>
              )}
              {((preview.total_recargo_dominical ?? 0) + (preview.total_recargo_festivo ?? 0)) > 0 && (
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Recargo dominical / festivo
                    {preview.porcentaje_recargo_dominical != null && (
                      <span className="ml-1 text-muted-foreground">
                        · {preview.porcentaje_recargo_dominical}%
                      </span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    ${((preview.total_recargo_dominical ?? 0) + (preview.total_recargo_festivo ?? 0)).toLocaleString('es-CO')}
                  </span>
                </div>
              )}
              {/* Una línea por tipo de ausencia remunerada. `total_incapacidades`
                  mete en el mismo saco la incapacidad de la EPS y el permiso
                  remunerado, y escribir "INCAPACIDADES" sobre un permiso es
                  decirle al trabajador algo que no pasó. */}
              {(preview.total_incapacidades ?? 0) > 0 && lineasAusenciasRemuneradas({
                resumen: preview.ausencias_remuneradas_resumen,
                etiqueta: preview.etiqueta_ausencias_remuneradas,
                total: preview.total_incapacidades ?? 0,
                motivos: motivosRemunerados(preview.detalle_ausencias),
              }).map((linea, iLinea) => (
                <div key={linea.clave} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {linea.etiqueta}
                    {linea.detalle && (
                      <span className="ml-1 text-muted-foreground">
                        · {linea.detalle}
                      </span>
                    )}
                    {/* §9.6 (FIX B) — Si alguna incapacidad EPS agrupa varios
                        tramos contiguos en un mismo evento, mostramos un
                        badge sutil para que el liquidador sepa que la regla
                        100%/66.67% se aplicó desde el inicio real, no desde
                        cada fila. Sale con tooltip explicando qué es. */}
                    {(() => {
                      if (iLinea > 0) return null;
                      const agrupadas = (preview.detalle_ausencias ?? []).filter(
                        (a) => a.afecta === 'INCAPACIDAD' && (a.ausencia_ids?.length ?? 0) > 1,
                      );
                      if (agrupadas.length === 0) return null;
                      const totalTramos = agrupadas.reduce(
                        (s, a) => s + (a.ausencia_ids?.length ?? 0),
                        0,
                      );
                      return (
                        <Badge
                          variant="info"
                          className="ml-2 align-middle"
                          title={`Se agruparon ${totalTramos} tramos contiguos en ${agrupadas.length} evento(s) EPS. La regla 100%/66.67% se aplicó desde el inicio real del evento (§9.6).`}
                        >
                          {agrupadas.length} evento{agrupadas.length !== 1 ? 's' : ''} agrupado{agrupadas.length !== 1 ? 's' : ''}
                        </Badge>
                      );
                    })()}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">${linea.valor.toLocaleString('es-CO')}</span>
                </div>
              ))}
              {/* PR-L15 — Vacaciones con `modo_pago = NOMINA`: el tramo del
                  disfrute es salario de este período y ya viene dentro de
                  `total_devengado`. Las `DIRECTO` llegan en 0: las pagó
                  Liquidaciones y solo aparecen en el bloque informativo. */}
              {(preview.total_vacaciones ?? 0) > 0 && (
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Vacaciones
                    {(preview.dias_vacaciones_pagados ?? 0) > 0 && (
                      <span className="ml-1 text-muted-foreground">
                        · {preview.dias_vacaciones_pagados} día
                        {preview.dias_vacaciones_pagados !== 1 ? 's' : ''} remunerado
                        {preview.dias_vacaciones_pagados !== 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    ${(preview.total_vacaciones ?? 0).toLocaleString('es-CO')}
                  </span>
                </div>
              )}
              {(preview.total_vacaciones_compensadas ?? 0) > 0 && (
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Vacaciones compensadas en dinero
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    ${(preview.total_vacaciones_compensadas ?? 0).toLocaleString('es-CO')}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2 text-sm">
                <span className="font-semibold text-foreground">Total bruto</span>
                <span className="font-semibold tabular-nums text-foreground">
                  ${preview.total_devengado.toLocaleString('es-CO')}
                </span>
              </div>
              {!esOperario && (
                <div className="flex items-baseline justify-between gap-4 pt-2 text-sm">
                  <span className="text-muted-foreground">
                    Subsidio de transporte
                    {/* PR-N6 — el auxilio ya no sale solo de los días
                        trabajados: los días de novedad que lo conservan
                        también cuentan. Sin el desglose la cifra no se
                        puede verificar contra la tabla de ausencias. */}
                    {preview.dias_auxilio_transporte != null && (
                      <span className="ml-1 text-muted-foreground">
                        · {preview.dias_auxilio_transporte} día{preview.dias_auxilio_transporte !== 1 ? 's' : ''}
                        {(preview.dias_ausencia_remunerados_con_auxilio ?? 0) > 0 && (
                          <>
                            {' '}({preview.dias_ausencia_remunerados_con_auxilio} de novedad
                            que conservan el auxilio)
                          </>
                        )}
                      </span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">${(preview.subsidio_transporte ?? 0).toLocaleString('es-CO')}</span>
                </div>
              )}
            </div>

          {/* §5.1 — Ausencias del período, día por día. La línea
              "INCAPACIDADES" del devengado dice cuánto, pero no qué día ni
              por qué; sin esta tabla esa cifra no se puede verificar. */}
          <DetalleAusencias
            items={preview.detalle_ausencias}
            formatMoney={(n) => `$${n.toLocaleString('es-CO')}`}
            titulo="Ausencias y novedades del período"
          />

          {/* §9.9 — Descansos por día. Componente compartido con el
              desprendible (mismo shape, distinta variante visual). */}
          <DetalleDescansos
            items={preview.detalle_dominicales_festivos}
            diasPerdidos={preview.dias_descanso_perdidos ?? undefined}
            totalDescansoPerdido={preview.total_descanso_perdido ?? undefined}
            formatMoney={(n) => `$${n.toLocaleString('es-CO')}`}
            titulo="Descansos por día"
          />

          {/* PLAN_AUSENCIAS_IMPLICITAS §1.3 — Faltas injustificadas por
              no-registro en la planilla. Solo aparece si el backend adjunta
              el detalle (versión antigua = undefined = nada). */}
          <FaltasInjustificadas
            items={preview.detalle_faltas_injustificadas}
            total={preview.dias_injustificados}
            formatMoney={(n) => `$${n.toLocaleString('es-CO')}`}
            titulo="Faltas sin novedad registrada"
          />

          {/* PR-L8 — Las vacaciones del período. En `DIRECTO` la línea es
              informativa: explica por qué el período trae menos días
              trabajados. En `NOMINA` el tramo lo paga esta nómina y el bloque
              muestra cuánto (PR-L15). */}
          <DiasVacaciones
            items={preview.detalle_vacaciones}
            total={preview.dias_vacaciones}
            formatMoney={(n) => `$${n.toLocaleString('es-CO')}`}
            titulo="Vacaciones del período"
          />
            </CardContent>
          </Card>

          {/* ── DEDUCCIONES ───────────────────────────────────────────── */}
          {!esOperario && (
            <Card>
              <CardHeader>
                <CardTitle>Deducciones</CardTitle>
                <CardDescription>Aportes de ley, préstamos y otros descuentos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Legales automáticas */}
                <div className="space-y-2 empty:hidden">
                  {(preview.conceptos_legales ?? []).map((c) => (
                    <FilaMonto
                      key={c.concepto_id}
                      label={c.nombre}
                      value={`$${c.valor.toLocaleString('es-CO')}`}
                    />
                  ))}
                </div>
                {/* Un bloque por préstamo: arriba el saldo completo y
                    abajo las cuotas que se descuentan en este período, las
                    atrasadas primero. El preview las manda por separado
                    porque son decisiones distintas, pero en pantalla una
                    deuda es una sola fila con lo suyo adentro. Las cuotas
                    entran ya aplicadas y el botón las quita o las vuelve a
                    poner; quitar una la deja PENDIENTE para la siguiente
                    liquidación, no la perdona. */}
                {agruparPrestamos(
                  preview.prestamos_pendientes ?? [],
                  preview.prestamos_vigentes ?? [],
                ).map((grupo) => {
                  const yaSaldado = prestamosSaldados.has(grupo.prestamo_id);
                  const p = grupo.vigente;
                  return (
                    <div
                      key={`prestamo-${grupo.prestamo_id}`}
                      className="space-y-2 border-t border-border pt-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className="text-sm text-muted-foreground"
                          title={p
                            ? `${p.cuotas_pagadas}/${p.num_cuotas} cuotas pagadas`
                              + `${(p.cuotas_atrasadas ?? 0) > 0 ? ` · ${p.cuotas_atrasadas} atrasada(s)` : ''}`
                              + `${grupo.cuotas.length === 0 ? ' · sin cuota en este período' : ''}`
                            : undefined}
                        >
                          {grupo.concepto}
                        </span>
                        {p && (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              Saldo{' '}
                              <span className={`font-medium tabular-nums ${yaSaldado ? 'text-foreground' : 'text-muted-foreground'}`}>
                                ${p.saldo_pendiente.toLocaleString('es-CO')}
                              </span>
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => (yaSaldado ? quitarSaldoPrestamo(p) : saldarPrestamo(p))}
                              disabled={!yaSaldado && p.saldo_pendiente <= 0}
                              title={yaSaldado
                                ? 'Las cuotas del préstamo vuelven a su estado inicial.'
                                : 'Descuenta todas las cuotas pendientes en esta liquidación.'}
                            >
                              {yaSaldado ? 'Quitar' : 'Saldar todo'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Saldando el préstamo las cuotas sobran: el saldo ya
                          las incluye. */}
                      {!yaSaldado && grupo.cuotas.length > 0 && (
                        <div className="space-y-1">
                          {grupo.cuotas.map((cuota) => {
                            const aplicada = cuotasAplicadas.has(cuota.prestamo_cuota_id);
                            const periodo = etiquetaPeriodoCuota(cuota.anio, cuota.mes, cuota.quincena);
                            return (
                              <div
                                key={`cuota-${cuota.prestamo_cuota_id}`}
                                className="flex flex-wrap items-center justify-between gap-2 pl-4"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <span
                                    className="text-sm text-muted-foreground"
                                    title={periodo || undefined}
                                  >
                                    Cuota {cuota.numero_cuota}/{cuota.total_cuotas}
                                  </span>
                                  {cuota.atrasada && (
                                    <Badge
                                      variant="warning"
                                      title={periodo ? `De la ${periodo}, sin descontar.` : 'Sin descontar.'}
                                    >
                                      Atrasada
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm font-medium tabular-nums ${aplicada ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                                    ${cuota.monto.toLocaleString('es-CO')}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => (aplicada
                                      ? quitarCuotaPrestamo(cuota.prestamo_cuota_id)
                                      : aplicarCuotaPrestamo(cuota))}
                                    title={aplicada
                                      ? 'La cuota queda pendiente y vuelve a aparecer en la siguiente liquidación.'
                                      : 'Se descuenta en esta liquidación.'}
                                  >
                                    {aplicada ? 'Quitar' : 'Aplicar'}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Adelantos y descuentos voluntarios por concepto del catálogo.
                    "Ahorro Voluntario" no se gestiona desde nómina y los
                    préstamos ya salen arriba con su propio botón. */}
                {conceptos
                  .filter(esConceptoParaAdelantos)
                  .map((concepto) => {
                  // Las filas de préstamo se pintan arriba; listarlas aquí era
                  // el mismo descuento dos veces en pantalla.
                  const filas = deducciones
                    .map((d, idx) => ({ d, idx }))
                    .filter(({ d }) => d.concepto_id === concepto.id
                      && d.prestamo_cuota_id == null
                      && !d.saldar);
                  return (
                    <div key={concepto.id} className="border-t border-border pt-4">
                      <ConceptosEditables
                        titulo={nombreConceptoUI(concepto)}
                        items={filas.map(({ d }) => ({ concepto: d.observacion, valor: Number(d.valor) || 0 }))}
                        placeholder="Observación"
                        onAgregar={() =>
                          setDeducciones((prev) => [
                            ...prev,
                            { concepto_id: concepto.id, valor: 0, observacion: '' },
                          ])
                        }
                        onCambiar={(i, campo, valor) =>
                          actualizarDeduccion(
                            filas[i].idx,
                            campo === 'concepto' ? 'observacion' : 'valor',
                            campo === 'valor' ? Number(valor) || 0 : valor,
                          )}
                        onQuitar={(i) => quitarDeduccion(filas[i].idx)}
                        textoVacio="$0"
                      />
                    </div>
                  );
                })}

                {/* Deducción libre eligiendo el concepto. Cubre el catálogo
                    vacío del tenant. Las cuotas de préstamo no salen aquí. */}
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {conceptos.length === 0
                        ? 'No hay conceptos activos en el catálogo. Agrega deducciones manualmente.'
                        : 'Otra deducción voluntaria'}
                    </span>
                    <Button size="sm" variant="ghost" onClick={agregarDeduccion}>
                      <Plus strokeWidth={2} />
                      Nueva deducción
                    </Button>
                  </div>
                  {deducciones
                    .map((d, idx) => ({ d, idx }))
                    .filter(({ d }) => !d.concepto_id && !d.prestamo_cuota_id)
                    .map(({ d, idx }) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        <div className="w-full sm:w-44 sm:shrink-0">
                          <Select
                            value={d.concepto_id === '' ? '' : String(d.concepto_id)}
                            onValueChange={(v) => actualizarDeduccion(idx, 'concepto_id', Number(v))}
                          >
                            <SelectTrigger aria-label="Concepto de la deducción">
                              <SelectValue placeholder="Concepto" />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                // Mismo filtro que la sección de arriba:
                                // excluimos AHORRO (no aplica) para que el
                                // dropdown solo ofrezca conceptos que el
                                // usuario realmente puede registrar aquí.
                                const opciones = conceptos.filter(esConceptoParaAdelantos);
                                if (opciones.length === 0) {
                                  return (
                                    <div className="px-3 py-2 text-xs text-muted-foreground">
                                      No hay conceptos activos. Actívalos en Configuración → Conceptos de nómina.
                                    </div>
                                  );
                                }
                                return opciones.map((c) => (
                                  <SelectItem key={c.id} value={String(c.id)}>
                                    {nombreConceptoUI(c)}
                                    {c.codigo && (
                                      <span className="ml-1 text-xs text-muted-foreground">({c.codigo})</span>
                                    )}
                                  </SelectItem>
                                ));
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          id={`liquidarco-observacion-${idx}`}
                          value={d.observacion}
                          onChange={(e) => actualizarDeduccion(idx, 'observacion', e.target.value)}
                          placeholder="Observación"
                          aria-label="Observación"
                          className="min-w-0 flex-1"
                        />
                        <Input
                          id={`liquidarco-valor-${idx}`}
                          type="number" step="0.001"
                          value={d.valor || ''}
                          onChange={(e) => actualizarDeduccion(idx, 'valor', Number(e.target.value))}
                          className="w-28 text-right sm:w-36"
                          placeholder="0"
                          aria-label="Valor"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => quitarDeduccion(idx)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Quitar"
                          >
                            <Trash2 strokeWidth={2} />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── BONIFICACIÓN ──────────────────────────────────────────── */}
          {!esOperario && (
            <Card>
              <CardHeader>
                <CardTitle>Bonificación</CardTitle>
                <CardDescription>Se suma al final, después de deducciones</CardDescription>
              </CardHeader>
              <CardContent>
                <ConceptosEditables
                  titulo="Bonificaciones"
                  items={bonificaciones.map((b) => ({ concepto: b.nombre, valor: b.valor }))}
                  onAgregar={agregarBonificacion}
                  onCambiar={(i, campo, valor) =>
                    actualizarBonificacion(i, campo === 'concepto' ? 'nombre' : 'valor', valor)}
                  onQuitar={quitarBonificacion}
                  textoVacio="No hay bonificaciones"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── RESUMEN ──────────────────────────────────────────────── */}
        {totales && (
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Eyebrow>Ingresos</Eyebrow>
                <FilaMonto label="Total bruto" value={`$${totales.devengado.toLocaleString('es-CO')}`} />
                {!esOperario && (
                  <FilaMonto label="Subsidio de transporte" value={`$${totales.subsidio.toLocaleString('es-CO')}`} />
                )}
                <FilaMonto label="Bonificaciones" value={`$${totales.totalBoni.toLocaleString('es-CO')}`} />
              </div>
              <div className="space-y-2">
                <Eyebrow>Deducciones</Eyebrow>
                <FilaMonto label="Total deducciones" value={`−$${totales.deduccionesTot.toLocaleString('es-CO')}`} />
                {esOperario && (
                  <p className="text-xs text-muted-foreground">
                    No aplican deducciones legales para operarios de terceros.
                  </p>
                )}
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
                <span className="font-semibold text-foreground">Total neto</span>
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  ${totales.neto.toLocaleString('es-CO')}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

          {/* El backend no bloquea por advertencias, así que el freno es este
              recordatorio junto al botón: entre el banner de arriba y el clic
              hay toda la pantalla de por medio. */}
      <NotaAntesDeConfirmar items={preview.advertencias} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => navigate(`/nomina/${nominaId}`)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button
              onClick={liquidar}
              disabled={enviando || hayBloqueos}
              title={hayBloqueos ? 'Hay novedades sin aprobar que cruzan el período' : undefined}
            >
              {enviando ? <Loader2 className="animate-spin" strokeWidth={2} /> : <Check strokeWidth={2} />}
              {esReliquidacion ? 'Guardar cambios' : 'Confirmar y guardar liquidación'}
            </Button>
      </div>
    </div>
  );
}
