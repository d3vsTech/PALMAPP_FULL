/**
 * Nuevo Período de Prima de Servicios — conectado a POST
 * /liquidaciones/periodos con tipo PRIMA (§2.4 y §2.8).
 *
 * La prima es semestral: `semestre` (1 o 2) es obligatorio, fija las fechas
 * por defecto y la fecha límite (30 de junio o 20 de diciembre del mismo
 * año). El primer y el segundo semestre del mismo año conviven sin pedir
 * permiso: el duplicado se mide por tipo, año y semestre.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
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

/** Rango por defecto de cada semestre (§2.8). */
const rangoSemestre = (anio: string, semestre: '1' | '2') =>
  semestre === '1'
    ? { inicio: `${anio}-01-01`, fin: `${anio}-06-30` }
    : { inicio: `${anio}-07-01`, fin: `${anio}-12-31` };

export default function NuevaPrima() {
  const navigate = useNavigate();

  const anioActual = new Date().getFullYear();
  // El semestre por defecto es el que corre hoy.
  const semestreActual: '1' | '2' = new Date().getMonth() < 6 ? '1' : '2';
  const rangoInicial = rangoSemestre(String(anioActual), semestreActual);

  const [formData, setFormData] = useState({
    anio: String(anioActual),
    semestre: semestreActual as '1' | '2',
    descripcion: '',
    fechaInicio: rangoInicial.inicio,
    fechaFin: rangoInicial.fin,
    notas: '',
  });
  const [guardando, setGuardando] = useState(false);

  // §2.2 — fecha límite del semestre elegido. Se recarga al cambiar año o
  // semestre; el backend exige el semestre para la prima.
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
      .fechaLimite('PRIMA', anio, Number(formData.semestre) as 1 | 2)
      .then((r) => { if (reqId === flReqRef.current) setFechaLimite(r.data); })
      .catch(() => { if (reqId === flReqRef.current) setFechaLimite(null); });
  }, [formData.anio, formData.semestre]);

  // 409 duplicado → diálogo con los existentes y reintento permitir_multiple.
  const [duplicados, setDuplicados] = useState<Partial<LiquidacionPeriodoItem>[] | null>(null);

  /**
   * Realinea las fechas cuando cambia el año o el semestre, siempre que el
   * usuario no las haya tocado a mano.
   */
  const handleChange = (campo: string, valor: string) => {
    setFormData(prev => {
      const next = { ...prev, [campo]: valor } as typeof prev;
      if (campo === 'anio' || campo === 'semestre') {
        const previo = rangoSemestre(prev.anio, prev.semestre);
        const nuevo = rangoSemestre(next.anio, next.semestre);
        if (prev.fechaInicio === previo.inicio) next.fechaInicio = nuevo.inicio;
        if (prev.fechaFin === previo.fin) next.fechaFin = nuevo.fin;
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
    // El backend responde 422 LIQUIDACION_RANGO_FUERA_DE_SEMESTRE; avisamos
    // antes para no gastar el viaje.
    const rango = rangoSemestre(formData.anio, formData.semestre);
    if (formData.fechaInicio < rango.inicio || formData.fechaFin > rango.fin) {
      toast.error(
        `Las fechas deben quedar dentro del ${formData.semestre === '1' ? 'primer' : 'segundo'} semestre (${formatFecha(rango.inicio)} a ${formatFecha(rango.fin)})`,
      );
      return false;
    }
    return true;
  };

  const guardar = async (permitirMultiple = false) => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const res = await liquidacionesApi.crear({
        tipo: 'PRIMA',
        anio: Number(formData.anio),
        semestre: Number(formData.semestre) as 1 | 2,
        descripcion: formData.descripcion.trim() || undefined,
        fecha_inicio: formData.fechaInicio || undefined,
        fecha_fin: formData.fechaFin || undefined,
        notas: formData.notas.trim() || undefined,
        permitir_multiple: permitirMultiple || undefined,
      });
      setDuplicados(null);
      toast.success(res.message ?? 'Período de prima creado');
      navigate(`/liquidaciones/prima/${res.data.id}`);
    } catch (err) {
      const e = err as ApiError & { periodos_existentes?: Partial<LiquidacionPeriodoItem>[] };
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_PERIODO_DUPLICADO) {
        setDuplicados(e.periodos_existentes ?? []);
      } else if (e.code === LiquidacionesErrorCodes.LIQUIDACION_RANGO_FUERA_DE_SEMESTRE) {
        toast.error('Las fechas deben quedar dentro del semestre elegido');
      } else if (e.code === LiquidacionesErrorCodes.LIQUIDACION_SEMESTRE_REQUERIDO) {
        toast.error('Elige el semestre de la prima');
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

  const etiquetaSemestre = formData.semestre === '1' ? '1.er semestre' : '2.º semestre';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Liquidaciones"
        title="Nuevo período de prima"
        description="Define el semestre. Los colaboradores se agregan al momento de liquidar."
        backTo="/liquidaciones?tab=prima"
      />

      <SeccionCard title="Información del período" description="Los campos con * son obligatorios.">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
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
              <Label htmlFor="semestre">Semestre *</Label>
              <Select value={formData.semestre} onValueChange={(v) => handleChange('semestre', v)}>
                <SelectTrigger id="semestre"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1.er semestre (ene a jun)</SelectItem>
                  <SelectItem value="2">2.º semestre (jul a dic)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                placeholder={`Prima de servicios ${etiquetaSemestre} ${formData.anio || anioActual}`}
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

          {/* Fechas límite del semestre elegido (legal + operativa, §2.2) */}
          {fechaLimite && (
            <div className="rounded-lg bg-warning-soft p-3 text-sm text-foreground">
              Fecha límite de pago: legal el{' '}
              <strong>{formatFecha(fechaLimite.fecha_limite_legal, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              {!fechaLimite.es_dia_habil && (
                <>
                  {' '}(cae en día no hábil) · operativa el{' '}
                  <strong>{formatFecha(fechaLimite.fecha_limite_operativa, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </>
              )}
              . La prima se paga dentro del mismo año del semestre (CST art. 306).
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg bg-muted/60 px-4 py-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">¿Cómo continuar?</span> La prima equivale a 15 días de salario por semestre completo y es proporcional al tiempo trabajado. Al crear el período pasarás directo al asistente para agregar colaboradores y calcular los montos.
            </p>
          </div>
        </div>
      </SeccionCard>

      <div className="barra-acciones flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => navigate('/liquidaciones?tab=prima')} disabled={guardando}>
          Cancelar
        </Button>
        <Button onClick={() => guardar()} disabled={guardando}>
          {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
          Crear período
        </Button>
      </div>

      {/* 409 duplicado → ofrecer crear uno adicional del mismo semestre */}
      <AlertDialog open={duplicados != null} onOpenChange={(open) => !open && !guardando && setDuplicados(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Ya existe una prima del {etiquetaSemestre} de {formData.anio}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {(duplicados ?? []).map((p) => (
                  <p key={p.id}>
                    <strong>{p.descripcion}</strong> · {p.estado === 'BORRADOR' ? 'Borrador' : 'Cerrada'} · {p.total_colaboradores ?? 0} colaborador(es)
                  </p>
                ))}
                <p>¿Crear un período adicional para este mismo semestre? Un colaborador nunca puede quedar en dos primas con días cruzados.</p>
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
