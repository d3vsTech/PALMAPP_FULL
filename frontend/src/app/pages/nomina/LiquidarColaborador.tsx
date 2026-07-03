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

        const aplicaA = prev.data.empleado.salario_tipo;
        // Para operarios (`salario_tipo === null`) no aplican deducciones
        // voluntarias ni bonificaciones (doc §5.3 — backend rechaza con 422).
        if (aplicaA !== null) {
          const conceptosRes = await nominaApi.conceptos.select({
            tipo: 'DEDUCCION_VOLUNTARIA',
            aplica_a: aplicaA,
          });
          setConceptos(conceptosRes.data);

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
  const aplicarCuotaPrestamo = (cuota: PrestamoCuotaPendiente) => {
    if (deducciones.some((d) => d.prestamo_cuota_id === cuota.prestamo_cuota_id)) {
      toast.info('Esta cuota ya fue agregada a las deducciones');
      return;
    }
    const conceptoPrestamo = conceptos.find(
      (c) => c.subtipo === 'PRESTAMO' || c.codigo === 'DCTO_ADELANTO',
    );
    setDeducciones((prev) => [
      ...prev,
      {
        concepto_id: conceptoPrestamo?.id ?? '',
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
    if (!esOperario) {
      if (deducciones.some((d) => !d.concepto_id || d.valor <= 0)) {
        toast.error('Cada deducción voluntaria requiere concepto y valor');
        return;
      }
      if (bonificaciones.some((b) => !b.nombre.trim() || b.valor <= 0)) {
        toast.error('Cada bonificación requiere nombre y valor');
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
            bonificaciones: bonificaciones.map((b) => ({ nombre: b.nombre, valor: Number(b.valor) })),
            deducciones_voluntarias: deducciones.map((d) => ({
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
            <div className="flex items-center gap-3 mt-2">
              {esOperario ? (
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-300">
                  Tercero{empleado.tercero ? ` · ${empleado.tercero.razon_social}` : ''}
                </Badge>
              ) : (
                <Badge variant="outline">{empleado.salario_tipo}</Badge>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{empleado.cargo}</span>
              {empleado.predio && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{empleado.predio.nombre}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de trabajo (solo VARIABLE) */}
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
              return (
                <div key={key} className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-primary/10 px-3 py-2 border-b border-border flex justify-between items-center">
                    <h4 className="font-semibold text-sm text-primary">{titulo}</h4>
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

      {/* Desprendible */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-6 w-6 text-primary" />
            {esReliquidacion ? 'Re-liquidación' : 'Desprendible de Nómina'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Días trabajados */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dias">Días trabajados</Label>
              <div className="flex gap-2">
                <Input
                  id="dias"
                  type="number"
                  value={diasTrabajados}
                  onChange={(e) =>
                    setDiasTrabajados(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  onBlur={refetchPreview}
                  max={preview.dias_periodo}
                />
                <span className="text-xs text-muted-foreground self-center whitespace-nowrap">
                  / {preview.dias_periodo} del período
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Salario base</Label>
              <Input value={`$${preview.salario_base.toLocaleString('es-CO')}`} disabled />
            </div>
            {!esOperario && (
              <div className="space-y-2">
                <Label>Subsidio transporte</Label>
                <Input
                  value={`$${(preview.subsidio_transporte ?? 0).toLocaleString('es-CO')}`}
                  disabled
                />
              </div>
            )}
          </div>

          {/* Devengado */}
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Devengado
            </h3>
            <div className="space-y-2 bg-success/5 p-4 rounded-lg border border-success/20">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {empleado.salario_tipo === 'FIJO' ? 'Salario base prorrateado' : 'Jornales'}
                </span>
                <span className="font-semibold">
                  ${preview.total_jornales.toLocaleString('es-CO')}
                </span>
              </div>
              {preview.total_cosecha > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cosecha</span>
                  <span className="font-semibold">${preview.total_cosecha.toLocaleString('es-CO')}</span>
                </div>
              )}
              {preview.total_horas_extra > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Horas extra</span>
                  <span className="font-semibold">${preview.total_horas_extra.toLocaleString('es-CO')}</span>
                </div>
              )}
              {preview.total_recargos > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recargos</span>
                  <span className="font-semibold">${preview.total_recargos.toLocaleString('es-CO')}</span>
                </div>
              )}
              {preview.total_incapacidades > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Incapacidades</span>
                  <span className="font-semibold">${preview.total_incapacidades.toLocaleString('es-CO')}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-success/30">
                <span className="font-bold text-success">Total devengado</span>
                <span className="font-bold text-lg text-success">
                  ${preview.total_devengado.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>

          {/* Bonificaciones — ocultas para operarios (doc §5.3) */}
          {!esOperario && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                Bonificaciones
              </h3>
              <Button size="sm" variant="outline" onClick={agregarBonificacion} className="gap-1">
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>
            {bonificaciones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3 bg-muted/20 rounded-lg">
                Sin bonificaciones.
              </p>
            ) : (
              <div className="space-y-2">
                {bonificaciones.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <Input
                      placeholder="Nombre"
                      value={b.nombre}
                      onChange={(e) => actualizarBonificacion(i, 'nombre', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Valor"
                      value={b.valor || ''}
                      onChange={(e) => actualizarBonificacion(i, 'valor', Number(e.target.value))}
                      className="w-40"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => quitarBonificacion(i)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Deducciones legales — solo empleados internos (doc §8.8) */}
          {!esOperario && (
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Deducciones legales (calculadas automáticamente)
            </h3>
            <div className="space-y-2 bg-destructive/5 p-4 rounded-lg border border-destructive/20">
              {!preview.conceptos_legales || preview.conceptos_legales.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">No aplica</p>
              ) : (
                preview.conceptos_legales.map((c) => (
                  <div key={c.concepto_id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {c.nombre} ({c.porcentaje}% sobre ${c.base.toLocaleString('es-CO')})
                    </span>
                    <span className="font-semibold text-destructive">
                      ${c.valor.toLocaleString('es-CO')}
                    </span>
                  </div>
                ))
              )}
              <div className="flex justify-between pt-2 border-t border-destructive/30">
                <span className="font-semibold">Subtotal</span>
                <span className="font-semibold text-destructive">
                  ${(preview.total_deducciones_legales ?? 0).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>
          )}

          {/* Cuotas de préstamos pendientes para el período — doc §5.1 y §15 */}
          {!esOperario && (preview.prestamos_pendientes?.length ?? 0) > 0 && (
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-amber-600" />
                Cuotas de préstamos pendientes
              </h3>
              <div className="space-y-2">
                {preview.prestamos_pendientes!.map((cuota) => {
                  const yaAplicada = cuotasAplicadas.has(cuota.prestamo_cuota_id);
                  return (
                    <div
                      key={cuota.prestamo_cuota_id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                        yaAplicada
                          ? 'bg-success/5 border-success/30'
                          : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300/60'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{cuota.concepto}</p>
                        <p className="text-xs text-muted-foreground">
                          Cuota {cuota.numero_cuota}/{cuota.total_cuotas} · Saldo restante $
                          {cuota.saldo_restante_prestamo.toLocaleString('es-CO')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Monto cuota</p>
                        <p className="text-sm font-bold text-amber-700">
                          ${cuota.monto.toLocaleString('es-CO')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={yaAplicada ? 'outline' : 'default'}
                        onClick={() => aplicarCuotaPrestamo(cuota)}
                        disabled={yaAplicada}
                        className={yaAplicada ? 'text-success border-success/50' : 'bg-primary hover:bg-primary/90'}
                      >
                        {yaAplicada ? 'Aplicada' : 'Aplicar cuota'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deducciones voluntarias — ocultas para operarios (doc §5.3) */}
          {!esOperario && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-600" />
                Deducciones voluntarias
              </h3>
              <Button size="sm" variant="outline" onClick={agregarDeduccion} className="gap-1">
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>
            {deducciones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3 bg-muted/20 rounded-lg">
                Sin deducciones voluntarias.
              </p>
            ) : (
              <div className="space-y-2">
                {deducciones.map((d, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-12 gap-2 p-3 rounded-lg items-end ${
                      d.prestamo_cuota_id
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300/60'
                        : 'bg-muted/30'
                    }`}
                  >
                    {d.prestamo_cuota_id && (
                      <div className="col-span-12 -mb-1">
                        <Badge className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-300">
                          Cuota de préstamo
                        </Badge>
                      </div>
                    )}
                    <div className="col-span-4">
                      <Label className="text-xs">Concepto</Label>
                      <Select
                        value={d.concepto_id === '' ? '' : String(d.concepto_id)}
                        onValueChange={(v) => actualizarDeduccion(i, 'concepto_id', Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent>
                          {conceptos.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Valor</Label>
                      <Input
                        type="number"
                        value={d.valor || ''}
                        onChange={(e) => actualizarDeduccion(i, 'valor', Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Observación</Label>
                      <Input
                        value={d.observacion}
                        onChange={(e) => actualizarDeduccion(i, 'observacion', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => quitarDeduccion(i)}
                        className="text-destructive hover:bg-destructive/10 w-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Resumen final — layout V.15: 2 columnas (Ingresos / Deducciones) */}
          {totales && (
            <div className="pt-6 border-t-2">
              <div className="space-y-4 bg-primary/10 p-6 rounded-lg border-2 border-primary/30">
                <div className="grid grid-cols-2 gap-8">
                  {/* INGRESOS */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-success mb-3">+ INGRESOS</h4>
                    <div>
                      <p className="text-sm text-muted-foreground">Devengado</p>
                      <p className="font-bold text-lg text-success">${totales.devengado.toLocaleString('es-CO')}</p>
                    </div>
                    {!esOperario && (
                      <div>
                        <p className="text-sm text-muted-foreground">Subsidio Transporte</p>
                        <p className="font-bold text-lg text-success">${totales.subsidio.toLocaleString('es-CO')}</p>
                      </div>
                    )}
                    {totales.totalBoni > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Bonificaciones</p>
                        <p className="font-bold text-lg text-success">${totales.totalBoni.toLocaleString('es-CO')}</p>
                      </div>
                    )}
                  </div>

                  {/* DEDUCCIONES */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-destructive mb-3">- DEDUCCIONES</h4>
                    {!esOperario && (
                      <div>
                        <p className="text-sm text-muted-foreground">Deducciones legales</p>
                        <p className="font-bold text-lg text-destructive">-${totales.dedLegales.toLocaleString('es-CO')}</p>
                      </div>
                    )}
                    {esOperario && (
                      <div>
                        <p className="text-sm text-muted-foreground italic">
                          No aplican deducciones legales para operarios de terceros.
                        </p>
                      </div>
                    )}
                    {totales.totalDedVol > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Deducciones voluntarias</p>
                        <p className="font-bold text-lg text-destructive">-${totales.totalDedVol.toLocaleString('es-CO')}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Total deducciones</p>
                      <p className="font-bold text-lg text-destructive">-${totales.deduccionesTot.toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t-2 border-primary/30">
                  <span className="font-bold text-2xl">TOTAL NETO</span>
                  <span className="font-bold text-3xl text-primary">
                    ${totales.neto.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/nomina/${nominaId}`)}
              className="flex-1"
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button
              onClick={liquidar}
              disabled={enviando}
              className="flex-1 gap-2 bg-success hover:bg-success/90"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {esReliquidacion ? 'Guardar cambios' : 'Confirmar liquidación'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
