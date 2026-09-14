/**
 * Nuevo Período de Intereses de Cesantías — conectado a POST
 * /liquidaciones/periodos con tipo INTERESES_CESANTIAS (§2.4 y §2.7).
 *
 * Exige un período de cesantías CERRADA del año: si hay varias tandas el
 * backend responde 422 PERIODO_CESANTIAS_REQUERIDO con la lista y aquí se
 * elige cuál usar como base. Las fechas se dejan vacías para que el
 * backend tome las del período padre.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { ArrowLeft, Calendar, FileText, Percent, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  liquidacionesApi,
  LiquidacionesErrorCodes,
  type DescriptorPeriodo,
  type FechaLimiteLiquidacion,
  type LiquidacionPeriodoItem,
} from '../../../api/liquidaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';

export default function NuevaIntereses() {
  const navigate = useNavigate();

  const anioActual = new Date().getFullYear();
  const [formData, setFormData] = useState({
    anio: String(anioActual),
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    notas: '',
  });
  const [guardando, setGuardando] = useState(false);

  // §2.2 — fechas límite del año elegido (31 ene legal, operativa hábil).
  const [fechaLimite, setFechaLimite] = useState<FechaLimiteLiquidacion | null>(null);
  const flReqRef = useRef(0);
  useEffect(() => {
    const anio = Number(formData.anio);
    if (!anio || anio < 2020 || anio > 2100) {
      setFechaLimite(null);
      return;
    }
    const reqId = ++flReqRef.current;
    liquidacionesApi
      .fechaLimite('INTERESES_CESANTIAS', anio)
      .then((r) => { if (reqId === flReqRef.current) setFechaLimite(r.data); })
      .catch(() => { if (reqId === flReqRef.current) setFechaLimite(null); });
  }, [formData.anio]);

  // 409 duplicado → diálogo con los existentes y reintento permitir_multiple.
  const [duplicados, setDuplicados] = useState<Partial<LiquidacionPeriodoItem>[] | null>(null);
  // 422 con varias tandas de cesantías → elegir el período base.
  const [tandas, setTandas] = useState<DescriptorPeriodo[] | null>(null);
  const [baseElegida, setBaseElegida] = useState<number | null>(null);
  // Sobrevive al encadenamiento de diálogos (duplicado y luego tandas).
  const permitirMultipleRef = useRef(false);

  const handleChange = (campo: string, valor: string) =>
    setFormData(prev => ({ ...prev, [campo]: valor }));

  const validar = () => {
    if (!formData.anio || isNaN(Number(formData.anio))) {
      toast.error('Ingresa un año válido');
      return false;
    }
    if (formData.fechaInicio && formData.fechaFin
      && new Date(formData.fechaInicio) > new Date(formData.fechaFin)) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
      return false;
    }
    return true;
  };

  const guardar = async (opts?: { permitirMultiple?: boolean; periodoBaseId?: number }) => {
    if (!validar()) return;
    if (!opts) permitirMultipleRef.current = false;
    else if (opts.permitirMultiple) permitirMultipleRef.current = true;
    setGuardando(true);
    try {
      const res = await liquidacionesApi.crear({
        tipo: 'INTERESES_CESANTIAS',
        anio: Number(formData.anio),
        descripcion: formData.descripcion.trim() || undefined,
        fecha_inicio: formData.fechaInicio || undefined,
        fecha_fin: formData.fechaFin || undefined,
        notas: formData.notas.trim() || undefined,
        periodo_base_id: opts?.periodoBaseId,
        permitir_multiple: permitirMultipleRef.current || undefined,
      });
      setDuplicados(null);
      setTandas(null);
      toast.success(res.message ?? 'Período de intereses creado');
      navigate(`/liquidaciones/intereses/${res.data.id}`);
    } catch (err) {
      const e = err as ApiError & {
        periodos_existentes?: Partial<LiquidacionPeriodoItem>[];
        periodos_cesantias?: DescriptorPeriodo[];
      };
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_PERIODO_DUPLICADO) {
        setDuplicados(e.periodos_existentes ?? []);
      } else if (e.code === LiquidacionesErrorCodes.PERIODO_CESANTIAS_REQUERIDO) {
        if ((e.periodos_cesantias ?? []).length > 0) {
          setTandas(e.periodos_cesantias ?? []);
          setBaseElegida(e.periodos_cesantias?.[0]?.id ?? null);
        } else {
          toast.error(`Primero confirma las cesantías del año ${formData.anio}: los intereses se calculan sobre ese período cerrado`, { duration: 8000 });
        }
      } else if (e.code === LiquidacionesErrorCodes.CONFIG_LEGAL_INCOMPLETA) {
        toast.error('Falta configurar la tasa de intereses de cesantías en Constantes Legales');
      } else if (e.code === LiquidacionesErrorCodes.LIQUIDACION_TIPO_NO_SOPORTADO) {
        toast.error('Este tipo de liquidación aún no está disponible');
      } else if (e.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e.message ?? 'No se pudo crear el período');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Liquidaciones
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary">Nuevo Período de Intereses</h1>
          <p className="text-muted-foreground mt-1">
            Define el período anual (tasa 12% — Ley 52 de 1975). Los colaboradores se agregan al liquidar.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información del Período
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="anio">
                Año <span className="text-destructive">*</span>
              </Label>
              <Input
                id="anio"
                type="number"
                placeholder="2026"
                value={formData.anio}
                onChange={(e) => handleChange('anio', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                placeholder={`Intereses de cesantías año ${formData.anio || anioActual}`}
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha Inicio</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fechaInicio"
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => handleChange('fechaInicio', e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">Si se deja vacía se usa la del período de cesantías</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaFin">Fecha Fin</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fechaFin"
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => handleChange('fechaFin', e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">Si se deja vacía se usa la del período de cesantías</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <textarea
              id="notas"
              rows={3}
              placeholder="Observaciones adicionales del período..."
              value={formData.notas}
              onChange={(e) => handleChange('notas', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Fechas límite del año elegido (legal + operativa, §2.2) */}
          {fechaLimite && (
            <div className="p-4 rounded-xl border border-orange-200 bg-orange-50 text-sm text-orange-800">
              Fecha límite de pago: legal el{' '}
              <strong>{formatFecha(fechaLimite.fecha_limite_legal, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              {!fechaLimite.es_dia_habil && (
                <>
                  {' '}(cae en día no hábil) · operativa el{' '}
                  <strong>{formatFecha(fechaLimite.fecha_limite_operativa, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </>
              )}
              . Los intereses no pagados a tiempo generan sanción de mora.
            </div>
          )}

          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
            <Percent className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-primary">¿Cómo continuar?</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Los intereses se calculan al 12% anual sobre las cesantías ya confirmadas del mismo año. Al crear el período pasarás directo al wizard para agregar colaboradores y calcular los montos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" size="lg" onClick={() => navigate('/liquidaciones')} disabled={guardando}>
          Cancelar
        </Button>
        <Button size="lg" onClick={() => guardar()} disabled={guardando} className="gap-2">
          {guardando ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
          Crear Período
        </Button>
      </div>

      {/* 409 duplicado → ofrecer crear uno adicional */}
      <AlertDialog open={duplicados != null} onOpenChange={(open) => !open && !guardando && setDuplicados(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ya existe un período de intereses para {formData.anio}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {(duplicados ?? []).map((p) => (
                  <p key={p.id}>
                    <strong>{p.descripcion}</strong> · {p.estado === 'BORRADOR' ? 'Borrador' : 'Cerrada'} · {p.total_colaboradores ?? 0} colaborador(es)
                  </p>
                ))}
                <p>¿Crear un período adicional para este mismo año?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={guardando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => guardar({ permitirMultiple: true })} disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crear adicional
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 422 con varias tandas de cesantías → elegir el período base */}
      <AlertDialog open={tandas != null} onOpenChange={(open) => !open && !guardando && setTandas(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Sobre qué período de cesantías?</AlertDialogTitle>
            <AlertDialogDescription>
              Hay varios períodos de cesantías cerrados en {formData.anio}. Elige el que sirve de base para los intereses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            {(tandas ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setBaseElegida(p.id)}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                  baseElegida === p.id
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-border hover:bg-muted/30'
                }`}
              >
                <span className="font-semibold">{p.descripcion}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {formatFecha(p.fecha_inicio)} — {formatFecha(p.fecha_fin)} · {p.total_colaboradores} colaborador(es)
                </span>
              </button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={guardando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => baseElegida != null && guardar({ periodoBaseId: baseElegida })}
              disabled={guardando || baseElegida == null}
            >
              {guardando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Usar este período
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
