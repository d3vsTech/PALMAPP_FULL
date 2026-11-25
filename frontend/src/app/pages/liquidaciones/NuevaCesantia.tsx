/**
 * Nuevo Período de Cesantías — conectado a POST /liquidaciones/periodos
 * (API_LIQUIDACIONES §2.2 y §2.4).
 *
 * El campo "Fondos de cesantías" del diseño original se omite a propósito:
 * el fondo es de cada colaborador (`empleados.fondo_cesantias`) y viaja en
 * cada fila del período.
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
import { Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';
import SeccionCard from '../../components/liquidaciones/SeccionCard';
import {
  liquidacionesApi,
  LiquidacionesErrorCodes,
  type FechaLimiteLiquidacion,
  type LiquidacionPeriodoItem,
} from '../../../api/liquidaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';

export default function NuevaCesantia() {
  const navigate = useNavigate();

  const anioActual = new Date().getFullYear();
  const [formData, setFormData] = useState({
    anio: String(anioActual),
    descripcion: '',
    fechaInicio: `${anioActual}-01-01`,
    fechaFin: `${anioActual}-12-31`,
    notas: '',
  });
  const [guardando, setGuardando] = useState(false);

  // §2.2 — fechas límite legal y operativa del año elegido, para informar
  // antes de crear. Se recarga al cambiar el año.
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
      .fechaLimite('CESANTIAS', anio)
      .then((r) => { if (reqId === flReqRef.current) setFechaLimite(r.data); })
      .catch(() => { if (reqId === flReqRef.current) setFechaLimite(null); });
  }, [formData.anio]);

  // 409 LIQUIDACION_PERIODO_DUPLICADO → diálogo con los existentes y
  // reintento con permitir_multiple.
  const [duplicados, setDuplicados] = useState<Partial<LiquidacionPeriodoItem>[] | null>(null);

  const handleChange = (campo: string, valor: string) => {
    setFormData(prev => {
      const next = { ...prev, [campo]: valor };
      // Al cambiar el año, realinear las fechas por defecto si no se tocaron.
      if (campo === 'anio' && /^\d{4}$/.test(valor)) {
        if (prev.fechaInicio === `${prev.anio}-01-01`) next.fechaInicio = `${valor}-01-01`;
        if (prev.fechaFin === `${prev.anio}-12-31`) next.fechaFin = `${valor}-12-31`;
      }
      return next;
    });
  };

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

  const guardar = async (permitirMultiple = false) => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const res = await liquidacionesApi.crear({
        tipo: 'CESANTIAS',
        anio: Number(formData.anio),
        descripcion: formData.descripcion.trim() || undefined,
        fecha_inicio: formData.fechaInicio || undefined,
        fecha_fin: formData.fechaFin || undefined,
        notas: formData.notas.trim() || undefined,
        permitir_multiple: permitirMultiple || undefined,
      });
      setDuplicados(null);
      toast.success(res.message ?? 'Período de cesantías creado');
      navigate(`/liquidaciones/cesantias/${res.data.id}`);
    } catch (err) {
      const e = err as ApiError & { periodos_existentes?: Partial<LiquidacionPeriodoItem>[] };
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_PERIODO_DUPLICADO) {
        setDuplicados(e.periodos_existentes ?? []);
      } else if (e.code === LiquidacionesErrorCodes.CONFIG_LEGAL_INCOMPLETA) {
        toast.error('Falta configurar el salario mínimo vigente en Constantes Legales');
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
        title="Nuevo período de cesantías"
        description="Define el período anual. Los colaboradores se agregan al momento de liquidar."
        backTo="/liquidaciones?tab=cesantias"
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
                placeholder={`Cesantías año ${formData.anio || anioActual}`}
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha de inicio *</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => handleChange('fechaInicio', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaFin">Fecha de fin *</Label>
              <Input
                id="fechaFin"
                type="date"
                value={formData.fechaFin}
                onChange={(e) => handleChange('fechaFin', e.target.value)}
              />
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
            <div className="rounded-lg bg-warning-soft p-3 text-sm text-foreground">
              Fecha límite de consignación: legal el{' '}
              <strong>{formatFecha(fechaLimite.fecha_limite_legal, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              {!fechaLimite.es_dia_habil && (
                <>
                  {' '}(cae en día no hábil) · operativa el{' '}
                  <strong>{formatFecha(fechaLimite.fecha_limite_operativa, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </>
              )}
              . Las cesantías no consignadas a tiempo generan sanción moratoria.
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg bg-muted/60 px-4 py-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">¿Cómo continuar?</span> El fondo de cesantías es el de cada colaborador y se toma de su ficha. Al crear el período pasarás directo al asistente para agregar colaboradores y calcular los montos.
            </p>
          </div>
        </div>
      </SeccionCard>

      <div className="barra-acciones flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => navigate('/liquidaciones?tab=cesantias')} disabled={guardando}>
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
            <AlertDialogTitle>Ya existe un período de cesantías para {formData.anio}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {(duplicados ?? []).map((p) => (
                  <p key={p.id}>
                    <strong>{p.descripcion}</strong> · {p.estado === 'BORRADOR' ? 'Borrador' : 'Cerrada'} · {p.total_colaboradores ?? 0} colaborador(es)
                  </p>
                ))}
                <p>¿Crear un período adicional para este mismo año? Un colaborador nunca puede quedar en dos períodos con días cruzados.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={guardando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => guardar(true)} disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear adicional
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
