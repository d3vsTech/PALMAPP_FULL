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
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';
import SeccionCard from '../../components/liquidaciones/SeccionCard';
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Liquidaciones"
        title="Nuevo período de intereses"
        description="Define el período anual (tasa 12 %, Ley 52 de 1975). Los colaboradores se agregan al liquidar."
        backTo="/liquidaciones?tab=intereses"
      />

      <SeccionCard title="Información del período" description="Los campos con * son obligatorios.">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="anio">Año *</Label>
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
                placeholder={`Intereses de cesantías ${formData.anio || anioActual}`}
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha de inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => handleChange('fechaInicio', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Opcional. Si la dejas vacía, se usa la del período de cesantías.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaFin">Fecha de fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={formData.fechaFin}
                onChange={(e) => handleChange('fechaFin', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Opcional. Si la dejas vacía, se usa la del período de cesantías.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              rows={3}
              placeholder="Observaciones adicionales del período"
              value={formData.notas}
              onChange={(e) => handleChange('notas', e.target.value)}
              className="resize-none"
            />
          </div>

          {/* Fechas límite del año elegido (legal + operativa, §2.2) */}
          {fechaLimite && (
            <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <p>
                Fecha límite de pago: legal el{' '}
                <strong>{formatFecha(fechaLimite.fecha_limite_legal, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                {!fechaLimite.es_dia_habil && (
                  <>
                    {' '}(cae en día no hábil) · operativa el{' '}
                    <strong>{formatFecha(fechaLimite.fecha_limite_operativa, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </>
                )}
                . Los intereses no pagados a tiempo generan sanción de mora.
              </p>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg bg-muted/60 px-4 py-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">¿Cómo continuar?</span> Los intereses se calculan al 12 % anual sobre las cesantías ya confirmadas del mismo año. Al crear el período pasarás directo al asistente para agregar colaboradores y calcular los montos.
            </p>
          </div>
        </div>
      </SeccionCard>

      <div className="barra-acciones flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => navigate('/liquidaciones?tab=intereses')} disabled={guardando}>
          Cancelar
        </Button>
        <Button onClick={() => guardar()} disabled={guardando}>
          {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
          Crear período
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
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
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
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                  baseElegida === p.id
                    ? 'border-primary bg-primary-soft'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <span className="font-semibold text-foreground">{p.descripcion}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {formatFecha(p.fecha_inicio)} a {formatFecha(p.fecha_fin)} · {p.total_colaboradores} colaborador(es)
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
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              Usar este período
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
