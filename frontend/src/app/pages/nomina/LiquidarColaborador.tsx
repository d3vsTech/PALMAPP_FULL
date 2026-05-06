import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
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
  const nominaEmpleadoId = colaboradorId ? parseInt(colaboradorId) : null;

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
        const conceptosRes = await nominaApi.conceptos.select({
          tipo: 'DEDUCCION_VOLUNTARIA',
          aplica_a: aplicaA,
        });
        setConceptos(conceptosRes.data);

        if (aplicaA === 'VARIABLE') {
          const res = await nominaApi.resumenTrabajo(nominaEmpleadoId);
          setResumen(res.data);
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
    const totalBoni = bonificaciones.reduce((s, b) => s + (Number(b.valor) || 0), 0);
    const totalDedVol = deducciones.reduce((s, d) => s + (Number(d.valor) || 0), 0);
    const devengado = preview.total_devengado + totalBoni;
    const deduccionesTot = preview.total_deducciones_legales + totalDedVol;
    const neto = devengado + preview.subsidio_transporte - deduccionesTot;
    return { devengado, deduccionesTot, neto, totalBoni, totalDedVol };
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

  const liquidar = async () => {
    if (!nominaEmpleadoId) return;
    if (deducciones.some((d) => !d.concepto_id || d.valor <= 0)) {
      toast.error('Cada deducción voluntaria requiere concepto y valor');
      return;
    }
    if (bonificaciones.some((b) => !b.nombre.trim() || b.valor <= 0)) {
      toast.error('Cada bonificación requiere nombre y valor');
      return;
    }

    setEnviando(true);
    try {
      const res = await nominaApi.liquidar(nominaEmpleadoId, {
        dias_trabajados: diasTrabajados === '' ? undefined : Number(diasTrabajados),
        bonificaciones: bonificaciones.map((b) => ({ nombre: b.nombre, valor: Number(b.valor) })),
        deducciones_voluntarias: deducciones.map((d) => ({
          concepto_id: Number(d.concepto_id),
          valor: Number(d.valor),
          observacion: d.observacion || undefined,
        })),
      });
      toast.success(res.message ?? 'Empleado liquidado');
      navigate(`/nomina/${nominaId}/desprendible/${nominaEmpleadoId}`);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'Error al liquidar');
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
            <h1 className="text-4xl font-bold text-foreground">{empleado.nombre_completo}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline">{empleado.salario_tipo}</Badge>
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

      {/* Liquidación */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-6 w-6 text-primary" />
            Liquidación
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
            <div className="space-y-2">
              <Label>Subsidio transporte</Label>
              <Input
                value={`$${preview.subsidio_transporte.toLocaleString('es-CO')}`}
                disabled
              />
            </div>
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

          {/* Bonificaciones */}
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

          {/* Deducciones legales */}
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Deducciones legales (calculadas automáticamente)
            </h3>
            <div className="space-y-2 bg-destructive/5 p-4 rounded-lg border border-destructive/20">
              {preview.conceptos_legales.length === 0 ? (
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
                  ${preview.total_deducciones_legales.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>

          {/* Deducciones voluntarias */}
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
                  <div key={i} className="grid grid-cols-12 gap-2 p-3 bg-muted/30 rounded-lg items-end">
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

          {/* Resumen final */}
          {totales && (
            <div className="pt-4 border-t-2">
              <div className="space-y-2 bg-primary/10 p-4 rounded-lg border-2 border-primary/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Devengado</span>
                  <span className="font-semibold">${totales.devengado.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subsidio transporte</span>
                  <span className="font-semibold">
                    ${preview.subsidio_transporte.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deducciones</span>
                  <span className="font-semibold text-destructive">
                    -${totales.deduccionesTot.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t-2 border-primary/30">
                  <span className="font-bold text-lg">Neto a pagar</span>
                  <span className="font-bold text-2xl text-primary">
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
              Confirmar liquidación
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
