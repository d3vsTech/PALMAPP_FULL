/**
 * Registro de vacaciones disfrutadas antes de usar el sistema
 * (API_LIQUIDACIONES §10.6). Sin esto los saldos de los colaboradores
 * antiguos salen inflados: el sistema cree que nunca han descansado.
 *
 * No calcula valores ni genera pago. Solo consume saldo.
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { History, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { vacacionesApi, VacacionesErrorCodes } from '../../../../api/vacaciones';
import type { ApiError } from '../../../../api/client';

export interface OpcionColaborador {
  id: number;
  nombre: string;
  documento: string;
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  colaboradores: OpcionColaborador[];
  /** Preselección cuando se entra desde una fila. */
  empleadoId?: number;
  onRegistrado: () => void;
}

const HOY = () => new Date().toISOString().slice(0, 10);

export default function RegistrarHistoricoDialog({
  abierto, onCerrar, colaboradores, empleadoId, onRegistrado,
}: Props) {
  const [empleado, setEmpleado] = useState(empleadoId ? String(empleadoId) : '');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [diasHabiles, setDiasHabiles] = useState('');
  const [diasDinero, setDiasDinero] = useState('');
  const [fechaPago, setFechaPago] = useState('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const limpiar = () => {
    setEmpleado(empleadoId ? String(empleadoId) : '');
    setFechaInicio('');
    setFechaFin('');
    setDiasHabiles('');
    setDiasDinero('');
    setFechaPago('');
    setObservacion('');
  };

  const cerrar = () => {
    if (guardando) return;
    limpiar();
    onCerrar();
  };

  const guardar = async () => {
    if (!empleado) { toast.error('Elige el colaborador'); return; }
    if (!fechaInicio || !fechaFin) { toast.error('Faltan las fechas del disfrute'); return; }
    if (fechaFin < fechaInicio) { toast.error('La fecha fin va después de la de inicio'); return; }
    if (fechaInicio > HOY()) { toast.error('El histórico registra vacaciones ya disfrutadas'); return; }
    const habiles = Number(diasHabiles);
    if (!Number.isFinite(habiles) || habiles <= 0) { toast.error('Indica los días hábiles disfrutados'); return; }

    setGuardando(true);
    try {
      await vacacionesApi.crearHistorico({
        empleado_id: Number(empleado),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        dias_habiles: habiles,
        dias_dinero: diasDinero ? Number(diasDinero) : undefined,
        fecha_pago: fechaPago || undefined,
        observacion: observacion.trim() || undefined,
      });
      toast.success('Vacaciones históricas registradas');
      limpiar();
      onRegistrado();
      onCerrar();
    } catch (err) {
      const e = err as ApiError;
      switch (e.code) {
        case VacacionesErrorCodes.VACACIONES_HISTORICO_EN_NOMINA:
          toast.error('Ese rango cae en una nómina ya cerrada. Usa la liquidación normal.');
          break;
        case VacacionesErrorCodes.VACACIONES_SOLAPADAS:
          toast.error('El colaborador ya tiene vacaciones registradas en esas fechas');
          break;
        case VacacionesErrorCodes.VACACIONES_SALDO_INSUFICIENTE:
          toast.error('Los días superan lo que el colaborador tenía causado');
          break;
        case VacacionesErrorCodes.VACACIONES_FUERA_DE_CONTRATO:
          toast.error('Las fechas quedan fuera del contrato del colaborador');
          break;
        case VacacionesErrorCodes.EMPLEADO_NO_ELEGIBLE:
          toast.error('Ese colaborador no admite registro de vacaciones');
          break;
        default:
          toast.error(e.message ?? 'No se pudo registrar el histórico');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!v) cerrar(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Registrar vacaciones pasadas
          </DialogTitle>
          <DialogDescription>
            Vacaciones que el colaborador ya disfrutó antes de usar PalmApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Colaborador</Label>
            <Select value={empleado} onValueChange={setEmpleado} disabled={!!empleadoId}>
              <SelectTrigger><SelectValue placeholder="Elige el colaborador" /></SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre} · CC {c.documento}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fecha inicio</Label>
              <Input type="date" value={fechaInicio} max={HOY()} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha fin</Label>
              <Input type="date" value={fechaFin} max={HOY()} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Días hábiles disfrutados</Label>
              <Input
                type="number" min={0.5} step={0.5} placeholder="15"
                value={diasHabiles} onChange={(e) => setDiasHabiles(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Días compensados en dinero</Label>
              <Input
                type="number" min={0} step={0.5} placeholder="0"
                value={diasDinero} onChange={(e) => setDiasDinero(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Fecha de pago <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input type="date" value={fechaPago} max={HOY()} onChange={(e) => setFechaPago(e.target.value)} className="max-w-[12rem]" />
          </div>

          <div className="space-y-1.5">
            <Label>Observación <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              rows={2} placeholder="De dónde sale el dato: acta, carta, planilla vieja."
              value={observacion} onChange={(e) => setObservacion(e.target.value)}
            />
          </div>

          <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              Este registro no genera pago ni comprobante de valores. Solo descuenta los días del saldo.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={cerrar} disabled={guardando}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando} className="gap-2">
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
