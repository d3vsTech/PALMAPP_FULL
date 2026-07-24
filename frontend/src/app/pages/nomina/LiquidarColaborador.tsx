import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import {
  ArrowLeft,
  Calculator,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Save,
  Loader2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  nominaApi,
  PreviewLiquidacion,
  ResumenTrabajo,
  NominaConcepto,
  CategoriaResumenTrabajo,
  NominaErrorCodes,
  PrestamoCuotaPendiente,
} from '../../../api/nomina';
import type { ApiError } from '../../../api/client';

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
}

/** Colores V.19 por labor — se usan en el header de cada categoría del
 *  resumen de trabajo. Cada tupla es [bg del header, text del título]. */
type ColorCategoria = { bg: string; text: string };
const COLOR_POR_LABOR: Record<string, ColorCategoria> = {
  cosecha:       { bg: 'bg-amber-500/10',   text: 'text-amber-700' },
  plateo:        { bg: 'bg-[#1E5631]/10',   text: 'text-[#1E5631]' },
  poda:          { bg: 'bg-[#1E5631]/10',   text: 'text-[#1E5631]' },
  fertilizacion: { bg: 'bg-blue-500/10',    text: 'text-blue-700' },
  sanidad:       { bg: 'bg-rose-500/10',    text: 'text-rose-700' },
  otros:         { bg: 'bg-purple-500/10',  text: 'text-purple-700' },
  finca:         { bg: 'bg-zinc-500/10',    text: 'text-zinc-700 dark:text-zinc-300' },
};

const CATEGORIAS: { key: keyof Omit<ResumenTrabajo, 'total_general'>; titulo: string }[] = [
  { key: 'cosecha', titulo: 'Cosecha' },
  { key: 'plateo', titulo: 'Plateo' },
  { key: 'poda', titulo: 'Poda' },
  { key: 'fertilizacion', titulo: 'Fertilización' },
  { key: 'sanidad', titulo: 'Sanidad' },
  { key: 'otros', titulo: 'Otros' },
  { key: 'finca', titulo: 'Finca' },
];

function getIniciales(nombre: string): string {
  const partes = nombre.trim().split(' ').filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

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

export default function LiquidarColaborador() {
  const { nominaId, colaboradorId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nominaEmpleadoId = colaboradorId ? parseInt(colaboradorId) : null;
  /** Si la URL trae ?reliquidar=1, se usa PUT en vez de POST (re-liquidar). */
  const esReliquidacion = searchParams.get('reliquidar') === '1';

  const [preview, setPreview] = useState<PreviewLiquidacion | null>(null);
  const [resumen, setResumen] = useState<ResumenTrabajo | null>(null);
  const [conceptos, setConceptos] = useState<NominaConcepto[]>([]);
  const [cargando, setCargando] = useState(true);

  // Inputs editables
  const [diasTrabajados, setDiasTrabajados] = useState<number | ''>('');
  const [bonificaciones, setBonificaciones] = useState<BonificacionLocal[]>([]);
  const [deducciones, setDeducciones] = useState<DeduccionLocal[]>([]);

  const [enviando, setEnviando] = useState(false);

  // Carga inicial: preview siempre, resumen solo si VARIABLE, conceptos según tipo
  useEffect(() => {
    if (!nominaEmpleadoId) return;
    setCargando(true);

    nominaApi
      .preview(nominaEmpleadoId)
      .then(async (prev) => {
        setPreview(prev.data);
        setDiasTrabajados(prev.data.dias_trabajados);

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
          setConceptos(conceptosRes.data ?? []);

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
  }, [nominaEmpleadoId]);

  // Re-fetch preview cuando cambian días trabajados
  const refetchPreview = async () => {
    if (!nominaEmpleadoId) return;
    try {
      const prev = await nominaApi.preview(nominaEmpleadoId);
      setPreview(prev.data);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'Error al recalcular');
    }
  };

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
   * Aplica una cuota de préstamo pendiente como una nueva fila de deducciones
   * voluntarias. Pre-selecciona el concepto de subtipo PRESTAMO
   * (`DCTO_ADELANTO` sembrado por default) si existe en el catálogo del tenant.
   * El backend valida `prestamo_cuota_id` al confirmar (doc §5.3).
   */
  const aplicarCuotaPrestamo = async (cuota: PrestamoCuotaPendiente) => {
    if (deducciones.some((d) => d.prestamo_cuota_id === cuota.prestamo_cuota_id)) {
      toast.info('Esta cuota ya fue agregada a las deducciones');
      return;
    }
    // Prioridad para el `concepto_id`:
    // 1) DCTO_ADELANTO / subtipo=PRESTAMO del catálogo del tenant.
    // 2) Primer concepto DEDUCCION_VOLUNTARIA disponible (fallback).
    // 3) Si el catálogo está vacío o no tiene ninguno, lo creamos on-the-fly.
    //    El módulo de Préstamos maneja las cuotas, pero el backend de nómina
    //    exige `concepto_id` en cada deducción voluntaria (§5.3). Sembramos
    //    automáticamente para no bloquear al liquidador.
    let conceptoPrestamo: NominaConcepto | undefined = conceptos.find(
      (c) => c.subtipo === 'PRESTAMO' || c.codigo === 'DCTO_ADELANTO',
    ) ?? conceptos[0];

    if (!conceptoPrestamo) {
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
        conceptoPrestamo = creado.data;
        // Refrescamos el catálogo local para que futuras cuotas y el UI lo vean.
        setConceptos((prev) => [...prev, creado.data]);
        toast.success('Concepto "DCTO_ADELANTO" activado automáticamente');
      } catch (err) {
        const e = err as ApiError;
        toast.error(
          e.message
            ?? 'No se pudo activar el concepto para préstamos. Ve a Configuración → Conceptos de nómina.',
          { duration: 6000 },
        );
        return;
      }
    }

    setDeducciones((prev) => [
      ...prev,
      {
        concepto_id: conceptoPrestamo!.id,
        valor: cuota.monto,
        observacion: `Cuota ${cuota.numero_cuota}/${cuota.total_cuotas} - ${cuota.concepto}`,
        prestamo_cuota_id: cuota.prestamo_cuota_id,
      },
    ]);
    toast.success(`Cuota ${cuota.numero_cuota}/${cuota.total_cuotas} agregada`);
  };

  /** IDs de cuotas ya agregadas — para deshabilitar el botón "Aplicar". */
  const cuotasAplicadas = new Set(
    deducciones
      .filter((d) => d.prestamo_cuota_id != null)
      .map((d) => d.prestamo_cuota_id as number),
  );

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
            || (d.concepto_id && d.valor > 0),
        );
    const bonificacionesEfectivas = esOperario
      ? []
      : bonificaciones.filter((b) => b.nombre.trim() && b.valor > 0);
    if (!esOperario) {
      // Solo validamos ítems del usuario (sin `prestamo_cuota_id`): valor > 0
      // sin concepto, o concepto sin valor. Las cuotas de préstamo se
      // aplicaron desde el botón "Aplicar" y ya vienen con datos válidos.
      const dedManuales = deducciones.filter((d) => d.prestamo_cuota_id == null);
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
      if (deducciones.some((d) => d.prestamo_cuota_id != null && !d.concepto_id)) {
        toast.error(
          'Falta activar un concepto de deducción voluntaria (ej. DCTO_ADELANTO) en Configuración → Conceptos de nómina para aplicar la cuota de préstamo.',
          { duration: 6000 },
        );
        return;
      }
    }

    setEnviando(true);
    try {
      // Para operarios solo se manda `dias_trabajados`. El backend rechaza
      // con 422 si vienen `bonificaciones` o `deducciones_voluntarias`.
      const payload = esOperario
        ? {
            dias_trabajados: diasTrabajados === '' ? undefined : Number(diasTrabajados),
          }
        : {
            dias_trabajados: diasTrabajados === '' ? undefined : Number(diasTrabajados),
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
            })),
          };
      // Si vino ?reliquidar=1, usar PUT (re-liquidar). Si no, POST (liquidar).
      // El backend acepta ambos; la diferencia es que re-liquidar borra los
      // conceptos previos y reescribe (doc §5.3).
      const res = esReliquidacion
        ? await nominaApi.reLiquidar(nominaEmpleadoId, payload)
        : await nominaApi.liquidar(nominaEmpleadoId, payload);
      toast.success(res.message ?? (esReliquidacion ? 'Liquidación actualizada' : 'Empleado liquidado'));
      navigate(`/nomina/${nominaId}/desprendible/${nominaEmpleadoId}`);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.PRESTAMO_CUOTA_NO_PENDIENTE) {
        toast.error('Una de las cuotas de préstamo ya fue aplicada en otra nómina');
      } else if (e.code === NominaErrorCodes.PRESTAMO_CUOTA_EMPLEADO_MISMATCH) {
        toast.error('La cuota de préstamo no pertenece a este colaborador');
      } else {
        toast.error(e.message ?? 'Error al liquidar');
      }
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando preview...
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No se pudo cargar la liquidación.
      </div>
    );
  }

  const empleado = preview.empleado;
  /** Operario de tercero — sin deducciones legales, sin subsidio, sin
   *  bonificaciones ni deducciones voluntarias (doc §5.1 y §8.8). */
  const esOperario = empleado.salario_tipo === null;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/nomina">Nómina</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/nomina/${nominaId}`}>Detalle</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Liquidar</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/nomina/${nominaId}`)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
            <span className="text-xl font-bold text-primary">
              {getIniciales(empleado.nombre_completo)}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">{empleado.nombre_completo}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm">
              {esOperario ? (
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 text-[10px] font-bold uppercase">
                  Tercero{empleado.tercero ? ` · ${empleado.tercero.razon_social}` : ''}
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 text-[10px] font-bold uppercase">
                  {empleado.salario_tipo}
                </Badge>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Período de liquidación</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de trabajo — solo para colaboradores con salario VARIABLE.
          Muestra los jornales agrupados por categoría (Cosecha, Poda, Plateo,
          Sanidad, etc.) con subtotales y total general del período. */}
      {empleado.salario_tipo === 'VARIABLE' && resumen && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Resumen de Trabajo - Planilla Diaria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {CATEGORIAS.map(({ key, titulo }) => {
              const cat = resumen[key] as CategoriaResumenTrabajo;
              if (!cat || cat.filas.length === 0) return null;
              const cc = COLOR_POR_LABOR[key as string] ?? COLOR_POR_LABOR.finca;
              return (
                <div key={key} className="border border-border rounded-lg overflow-hidden">
                  <div className={`${cc.bg} px-3 py-2 border-b border-border flex justify-between items-center`}>
                    <h4 className={`font-semibold text-sm ${cc.text}`}>{titulo}</h4>
                    <div className="flex gap-3 text-xs">
                      {cat.subtotal_racimos !== undefined && (
                        <span>{cat.subtotal_racimos} racimos</span>
                      )}
                      {cat.subtotal_peso !== undefined && (
                        <span>{cat.subtotal_peso} kg</span>
                      )}
                      {cat.subtotal_palmas !== undefined && (
                        <span>{cat.subtotal_palmas} palmas</span>
                      )}
                      <span className="font-semibold text-success">
                        ${cat.subtotal_jornal.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left p-2 font-semibold text-muted-foreground">Fecha</th>
                          <th className="text-left p-2 font-semibold text-muted-foreground">Lote</th>
                          <th className="text-left p-2 font-semibold text-muted-foreground">Sublote</th>
                          {cat.filas.some((f) => f.cosecha) && (
                            <th className="text-left p-2 font-semibold text-muted-foreground">Cosecha</th>
                          )}
                          {cat.filas.some((f) => f.racimos !== undefined) && (
                            <th className="text-right p-2 font-semibold text-muted-foreground">Racimos</th>
                          )}
                          {cat.filas.some((f) => f.peso_kg !== undefined) && (
                            <th className="text-right p-2 font-semibold text-muted-foreground">Peso (kg)</th>
                          )}
                          {cat.filas.some((f) => f.palmas !== undefined) && (
                            <th className="text-right p-2 font-semibold text-muted-foreground">Palmas</th>
                          )}
                          {cat.filas.some((f) => f.descripcion) && (
                            <th className="text-left p-2 font-semibold text-muted-foreground">Descripción</th>
                          )}
                          <th className="text-right p-2 font-semibold text-muted-foreground">Jornal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.filas.map((f, i) => (
                          <tr
                            key={i}
                            className={`border-b border-border last:border-0 ${
                              i % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                            }`}
                          >
                            <td className="p-2 whitespace-nowrap">{f.fecha}</td>
                            <td className="p-2 whitespace-nowrap">{f.lote ?? '-'}</td>
                            <td className="p-2 whitespace-nowrap">{f.sublote ?? '-'}</td>
                            {cat.filas.some((x) => x.cosecha) && (
                              <td className="p-2 whitespace-nowrap">{f.cosecha ?? '-'}</td>
                            )}
                            {cat.filas.some((x) => x.racimos !== undefined) && (
                              <td className="p-2 text-right">{f.racimos ?? '-'}</td>
                            )}
                            {cat.filas.some((x) => x.peso_kg !== undefined) && (
                              <td className="p-2 text-right">{f.peso_kg ?? '-'}</td>
                            )}
                            {cat.filas.some((x) => x.palmas !== undefined) && (
                              <td className="p-2 text-right">{f.palmas ?? '-'}</td>
                            )}
                            {cat.filas.some((x) => x.descripcion) && (
                              <td className="p-2">{f.descripcion ?? '-'}</td>
                            )}
                            <td className="p-2 text-right font-semibold text-success">
                              ${f.jornal.toLocaleString('es-CO')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end pt-2 border-t-2 border-primary">
              <div className="flex items-center gap-3">
                <span className="font-bold">Total General:</span>
                <span className="text-2xl font-bold text-success">
                  ${resumen.total_general.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desprendible — layout tipo mockup */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-6 w-6 text-primary" />
            {esReliquidacion ? 'Re-liquidación' : 'Desprendible de Nómina'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grid: Nombre | Cédula | Días Trabajados */}
          <div className="grid gap-6 sm:grid-cols-3 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Nombre</p>
              <p className="font-semibold">{empleado.nombre_completo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cédula</p>
              <p className="font-semibold">{empleado.documento || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Días Trabajados</p>
              <Input
                type="number"
                value={diasTrabajados}
                onChange={(e) =>
                  setDiasTrabajados(e.target.value === '' ? '' : Number(e.target.value))
                }
                onBlur={refetchPreview}
                max={preview.dias_periodo}
                className="h-9 text-lg font-semibold border-0 bg-transparent px-0 focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Aviso de horas extras / ausencias PENDIENTES por aprobar. Doc
              §5.1: estos registros NO se incluyen en el cálculo actual hasta
              que se aprueben desde la planilla. */}
          {!esOperario
            && preview.pendientes_por_aprobar
            && ((preview.pendientes_por_aprobar.horas_extra ?? 0) > 0
              || (preview.pendientes_por_aprobar.ausencias ?? 0) > 0) && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20">
              <TrendingDown className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  Registros pendientes de aprobar
                </p>
                <p className="text-amber-700 dark:text-amber-400 mt-1">
                  Este colaborador tiene{' '}
                  {preview.pendientes_por_aprobar.horas_extra > 0 && (
                    <strong>
                      {preview.pendientes_por_aprobar.horas_extra} hora
                      {preview.pendientes_por_aprobar.horas_extra !== 1 ? 's' : ''} extra
                    </strong>
                  )}
                  {preview.pendientes_por_aprobar.horas_extra > 0
                    && preview.pendientes_por_aprobar.ausencias > 0
                    && ' y '}
                  {preview.pendientes_por_aprobar.ausencias > 0 && (
                    <strong>
                      {preview.pendientes_por_aprobar.ausencias} ausencia
                      {preview.pendientes_por_aprobar.ausencias !== 1 ? 's' : ''}
                    </strong>
                  )}
                  {' '}en estado PENDIENTE — no se incluyen en el cálculo hasta que
                  se aprueben desde la planilla correspondiente.
                </p>
              </div>
            </div>
          )}

          {/* ── DEVENGADO ─────────────────────────────────────────────── */}
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-success">
              <TrendingUp className="h-4 w-4" />
              Devengado
            </h3>
            <div className="rounded-lg border border-success/20 overflow-hidden bg-success/5">
              <div className="flex justify-between px-4 py-3 border-b border-success/10">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Sueldo base</span>
                <span className="font-semibold">${preview.salario_base.toLocaleString('es-CO')}</span>
              </div>
              {(preview.total_jornales > 0 && empleado.salario_tipo !== 'FIJO') && (
                <div className="flex justify-between px-4 py-3 border-b border-success/10">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Jornales</span>
                  <span className="font-semibold">${preview.total_jornales.toLocaleString('es-CO')}</span>
                </div>
              )}
              {preview.total_cosecha > 0 && (
                <div className="flex justify-between px-4 py-3 border-b border-success/10">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Cosecha</span>
                  <span className="font-semibold">${preview.total_cosecha.toLocaleString('es-CO')}</span>
                </div>
              )}
              {preview.total_horas_extra > 0 && (
                <div className="flex justify-between px-4 py-3 border-b border-success/10">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Horas extra
                    {(preview.detalle_horas_extra?.length ?? 0) > 0 && (
                      <span className="ml-2 normal-case tracking-normal text-muted-foreground/80">
                        · {Array.from(new Set(
                          preview.detalle_horas_extra!
                            .map((h) => h.tipo_nombre || h.codigo)
                            .filter(Boolean),
                        )).join(', ')}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold">${preview.total_horas_extra.toLocaleString('es-CO')}</span>
                </div>
              )}
              {preview.total_recargos > 0 && (
                <div className="flex justify-between px-4 py-3 border-b border-success/10">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Recargos</span>
                  <span className="font-semibold">${preview.total_recargos.toLocaleString('es-CO')}</span>
                </div>
              )}
              {preview.total_incapacidades > 0 && (
                <div className="flex justify-between px-4 py-3 border-b border-success/10">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Incapacidades
                    {(preview.detalle_ausencias?.length ?? 0) > 0 && (
                      <span className="ml-2 normal-case tracking-normal text-muted-foreground/80">
                        · {Array.from(new Set(
                          preview.detalle_ausencias!
                            // Solo las que suman al devengado (INCAPACIDAD).
                            .filter((a) => a.afecta === 'INCAPACIDAD')
                            .map((a) => a.motivo_nombre)
                            .filter(Boolean),
                        )).join(', ')}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold">${preview.total_incapacidades.toLocaleString('es-CO')}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 border-b border-success/10 bg-success/10">
                <span className="text-xs uppercase tracking-wide font-bold text-success">Total bruto</span>
                <span className="font-bold text-lg text-success">
                  ${preview.total_devengado.toLocaleString('es-CO')}
                </span>
              </div>
              {!esOperario && (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Subsidio transporte</span>
                  <span className="font-semibold">${(preview.subsidio_transporte ?? 0).toLocaleString('es-CO')}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── DEDUCCIONES ───────────────────────────────────────────── */}
          {!esOperario && (
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-destructive">
                <TrendingDown className="h-4 w-4" />
                Deducciones
              </h3>
              <div className="rounded-lg border border-destructive/20 overflow-hidden bg-destructive/5">
                {/* Legales automáticas */}
                {(preview.conceptos_legales ?? []).map((c) => (
                  <div key={c.concepto_id} className="flex justify-between px-4 py-3 border-b border-destructive/10">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {c.nombre}
                    </span>
                    <span className="font-semibold text-destructive">
                      ${c.valor.toLocaleString('es-CO')}
                    </span>
                  </div>
                ))}
                {/* Cuotas de préstamos (aplicables como deducciones) */}
                {(preview.prestamos_pendientes ?? []).map((cuota) => {
                  const yaAplicada = cuotasAplicadas.has(cuota.prestamo_cuota_id);
                  return (
                    <div
                      key={`cuota-${cuota.prestamo_cuota_id}`}
                      className="border-b border-destructive/10"
                    >
                      <div className="flex justify-between items-center px-4 py-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {cuota.concepto}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Cuota {cuota.numero_cuota}/{cuota.total_cuotas} · Saldo restante ${cuota.saldo_restante_prestamo.toLocaleString('es-CO')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-semibold ${yaAplicada ? 'text-destructive' : 'text-muted-foreground'}`}>
                            ${cuota.monto.toLocaleString('es-CO')}
                          </span>
                          <Button
                            size="sm"
                            variant={yaAplicada ? 'outline' : 'default'}
                            onClick={() => aplicarCuotaPrestamo(cuota)}
                            disabled={yaAplicada}
                            className={yaAplicada ? 'text-success border-success/50 h-7' : 'bg-primary hover:bg-primary/90 h-7'}
                          >
                            {yaAplicada ? 'Aplicada' : 'Aplicar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Deducciones voluntarias por concepto del catálogo. Cada
                    fila muestra un "+ Agregar" que crea una sub-fila con
                    valor + observación.
                    Reglas de negocio:
                    - "Ahorro Voluntario" no se gestiona desde nómina.
                    - "Descuento Adelantos / Préstamo" del catálogo cubre AMBAS
                      cosas, pero aquí en la UI el usuario solo debería
                      registrar ADELANTOS (los préstamos vienen ya como cuota
                      automática pre-seleccionada arriba con badge "Aplicada").
                      Por eso lo etiquetamos como "Descuento Adelantos" en el UI.
                */}
                {conceptos
                  .filter(esConceptoParaAdelantos)
                  .map((concepto) => {
                  const filas = deducciones
                    .map((d, idx) => ({ d, idx }))
                    .filter(({ d }) => d.concepto_id === concepto.id);
                  const totalConcepto = filas.reduce((s, { d }) => s + (Number(d.valor) || 0), 0);
                  return (
                    <div key={concepto.id} className="border-b border-destructive/10 last:border-0">
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {nombreConceptoUI(concepto)}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-semibold ${totalConcepto > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            ${totalConcepto.toLocaleString('es-CO')}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-primary hover:bg-primary/10"
                            onClick={() =>
                              setDeducciones((prev) => [
                                ...prev,
                                { concepto_id: concepto.id, valor: 0, observacion: '' },
                              ])
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar
                          </Button>
                        </div>
                      </div>
                      {filas.length > 0 && (
                        <div className="bg-background/60 border-t border-destructive/10 divide-y divide-destructive/10">
                          {filas.map(({ d, idx }) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center px-4 py-2">
                              <div className="col-span-4">
                                <Input
                                  type="number"
                                  value={d.valor || ''}
                                  onChange={(e) => actualizarDeduccion(idx, 'valor', Number(e.target.value))}
                                  placeholder="Valor"
                                  className="h-8 text-sm"
                                  disabled={!!d.prestamo_cuota_id}
                                />
                              </div>
                              <div className="col-span-7">
                                <Input
                                  value={d.observacion}
                                  onChange={(e) => actualizarDeduccion(idx, 'observacion', e.target.value)}
                                  placeholder="Observación"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="col-span-1 flex justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => quitarDeduccion(idx)}
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Fallback genérico — siempre presente: sirve para agregar
                    una deducción libre eligiendo el concepto en el select.
                    Cubre el caso en que `conceptos` viene vacío del backend
                    (catálogo no sembrado en el tenant) o cuando el usuario
                    quiere agregar sin un botón dedicado por concepto. */}
                <div className="border-t border-destructive/20 px-4 py-3 bg-destructive/[0.02]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground italic">
                      {conceptos.length === 0
                        ? 'No hay conceptos activos en el catálogo — agrega deducciones manualmente.'
                        : 'Agregar otra deducción voluntaria'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={agregarDeduccion}
                      className="h-7 gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nueva deducción
                    </Button>
                  </div>
                  {/* Filas sin concepto asignado — muestran select + valor +
                      observación para que el usuario elija todo. Excluimos
                      las cuotas de préstamo (ya se renderizan arriba con su
                      propia fila y badge "Aplicada" — mostrarlas otra vez
                      aquí duplicaría el monto en pantalla). */}
                  {deducciones
                    .map((d, idx) => ({ d, idx }))
                    .filter(({ d }) => !d.concepto_id && !d.prestamo_cuota_id)
                    .map(({ d, idx }) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end mt-3 p-3 bg-background rounded-md border border-border">
                        <div className="col-span-4">
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Concepto</Label>
                          <Select
                            value={d.concepto_id === '' ? '' : String(d.concepto_id)}
                            onValueChange={(v) => actualizarDeduccion(idx, 'concepto_id', Number(v))}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Selecciona" />
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
                                      <span className="text-[10px] text-muted-foreground ml-1">({c.codigo})</span>
                                    )}
                                  </SelectItem>
                                ));
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Valor</Label>
                          <Input
                            type="number"
                            value={d.valor || ''}
                            onChange={(e) => actualizarDeduccion(idx, 'valor', Number(e.target.value))}
                            className="h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-4">
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Observación</Label>
                          <Input
                            value={d.observacion}
                            onChange={(e) => actualizarDeduccion(idx, 'observacion', e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Opcional"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => quitarDeduccion(idx)}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BONIFICACIÓN ──────────────────────────────────────────── */}
          {!esOperario && (
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-success">
                <TrendingUp className="h-4 w-4" />
                Bonificación
              </h3>
              <div className="rounded-lg border border-success/20 overflow-hidden bg-success/5">
                <div className="flex justify-between items-center px-4 py-3 border-b border-success/10">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Bonificaciones</span>
                  <Button size="sm" variant="ghost" onClick={agregarBonificacion} className="h-7 gap-1 text-primary hover:bg-primary/10">
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </Button>
                </div>
                {bonificaciones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay bonificaciones
                  </p>
                ) : (
                  <div className="divide-y divide-success/10 bg-background/60">
                    {bonificaciones.map((b, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center px-4 py-2">
                        <div className="col-span-6">
                          <Input
                            placeholder="Nombre"
                            value={b.nombre}
                            onChange={(e) => actualizarBonificacion(i, 'nombre', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-5">
                          <Input
                            type="number"
                            placeholder="Valor"
                            value={b.valor || ''}
                            onChange={(e) => actualizarBonificacion(i, 'valor', Number(e.target.value))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => quitarBonificacion(i)}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── RESUMEN INGRESOS / DEDUCCIONES / TOTAL NETO ─────────── */}
          {totales && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider font-bold text-success">+ INGRESOS</p>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Total Bruto</p>
                    <p className="font-bold text-success text-base">
                      ${totales.devengado.toLocaleString('es-CO')}
                    </p>
                  </div>
                  {!esOperario && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Subsidio Transporte</p>
                      <p className="font-bold text-success text-base">
                        ${totales.subsidio.toLocaleString('es-CO')}
                      </p>
                    </div>
                  )}
                  <div className="text-sm">
                    <p className="text-muted-foreground">Bonificaciones</p>
                    <p className="font-bold text-success text-base">
                      ${totales.totalBoni.toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider font-bold text-destructive">- DEDUCCIONES</p>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Total Deducciones</p>
                    <p className="font-bold text-destructive text-base">
                      -${totales.deduccionesTot.toLocaleString('es-CO')}
                    </p>
                  </div>
                  {esOperario && (
                    <p className="text-xs text-muted-foreground italic">
                      No aplican deducciones legales para operarios de terceros.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-primary/30">
                <span className="font-bold text-lg tracking-wide">TOTAL NETO</span>
                <span className="font-bold text-3xl text-primary">
                  ${totales.neto.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/nomina/${nominaId}`)}
              disabled={enviando}
              className="h-12 text-base"
            >
              Cancelar
            </Button>
            <Button
              onClick={liquidar}
              disabled={enviando}
              className="h-12 text-base gap-2 bg-success hover:bg-success/90 text-white"
            >
              {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              {esReliquidacion ? 'Guardar cambios' : 'Confirmar y Guardar Liquidación'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
