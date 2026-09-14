/**
 * Diálogo "Registrar consignación / pago" (API_LIQUIDACIONES §5.1).
 * Sirve para una fila o para todos los pendientes del período. Éxito
 * parcial: las omitidas y las advertencias del backend se muestran como
 * toasts. `valor_pagado = valor_final` siempre: no hay pagos parciales.
 */
import { useEffect, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  liquidacionesApi,
  LiquidacionesErrorCodes,
  type LiquidacionFila,
  type MetodoPago,
  type RegistrarPagosResponse,
} from '../../../../api/liquidaciones';
import type { ApiError } from '../../../../api/client';
import { formatFecha } from '../../../utils/fecha';
import { fmtCOP, type TipoPeriodoDetalle, TEXTOS_PERIODO } from './textos';

const METODOS: MetodoPago[] = ['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'PILA'];

/** null = todos los pendientes; una fila = solo ese colaborador. */
export type ObjetivoPago = { fila: LiquidacionFila | null; pendientes: number };

interface Props {
  periodoId: number;
  tipo: TipoPeriodoDetalle;
  objetivo: ObjetivoPago | null;
  onClose: () => void;
  /** Se llama tras registrar, con la respuesta, para refrescar el período. */
  onRegistrado: (res: RegistrarPagosResponse) => void;
}

export default function RegistrarPagoDialog({ periodoId, tipo, objetivo, onClose, onRegistrado }: Props) {
  const txt = TEXTOS_PERIODO[tipo];
  const esCesantias = tipo === 'CESANTIAS';
  const hoy = new Date().toISOString().slice(0, 10);

  const [fechaPago, setFechaPago] = useState(hoy);
  const [metodoPago, setMetodoPago] = useState<string>('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const [fondo, setFondo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Reiniciar el formulario cada vez que se abre.
  useEffect(() => {
    if (objetivo) {
      setFechaPago(hoy);
      setMetodoPago('TRANSFERENCIA');
      setReferencia('');
      setFondo('');
      setObservacion('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivo]);

  if (!objetivo) return null;
  const { fila, pendientes } = objetivo;

  const registrar = async () => {
    if (!fechaPago) {
      toast.error('Indica la fecha del giro');
      return;
    }
    if (fechaPago > hoy) {
      toast.error('La fecha de pago no puede ser futura');
      return;
    }
    setGuardando(true);
    try {
      const res = await liquidacionesApi.registrarPagos(periodoId, {
        ...(fila ? { empleado_ids: [fila.empleado.id] } : { todos: true }),
        fecha_pago: fechaPago,
        metodo_pago: (metodoPago || undefined) as MetodoPago | undefined,
        referencia_pago: referencia.trim() || undefined,
        fondo_consignacion: esCesantias ? (fondo.trim() || undefined) : undefined,
        observacion: observacion.trim() || undefined,
      });

      // Omitidas (§5.1): sin fondo o ya registradas.
      const sinFondo = res.data.omitidas.filter(o => o.code === LiquidacionesErrorCodes.SIN_FONDO_CESANTIAS);
      if (sinFondo.length > 0) {
        toast.error(
          `Sin fondo de cesantías: ${sinFondo.map(o => o.nombre_completo).join(', ')}. Indica el fondo en la ficha del colaborador o en este formulario.`,
          { duration: 10000 },
        );
      }
      const yaPagadas = res.data.omitidas.filter(o => o.code === LiquidacionesErrorCodes.LIQUIDACION_PAGO_YA_REGISTRADO);
      if (yaPagadas.length > 0) {
        toast.info(`Ya tenían ${txt.giroSustantivo}: ${yaPagadas.map(o => o.nombre_completo).join(', ')}`);
      }

      // Advertencias no bloqueantes (Anexo A.3).
      for (const adv of res.advertencias ?? []) {
        if (adv.code === 'PAGO_CON_MORA') {
          toast.warning(`Giro con mora: ${adv.dias_mora} día(s) después de la fecha legal (${formatFecha(String(adv.fecha_limite_legal))}). Informativo, sin sanción automática.`, { duration: 8000 });
        } else if (adv.code === 'FONDO_DISTINTO_AL_ELEGIDO') {
          toast.warning('Se consignó en un fondo distinto del elegido por el colaborador', { duration: 8000 });
        } else if (adv.code === 'FONDO_NO_CATALOGADO') {
          toast.warning('El fondo indicado no está en el catálogo de la finca', { duration: 8000 });
        }
      }

      if (res.data.pagadas.length > 0) {
        toast.success(res.message);
      }
      onRegistrado(res);
      onClose();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_PERIODO_NO_CERRADO) {
        toast.error('El período debe estar cerrado para registrar giros');
      } else if (e.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e.message ?? `No se pudo registrar la ${txt.giroSustantivo}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && !guardando && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {fila ? `${txt.girarFila} — ${fila.empleado.nombre_completo}` : txt.girarTodos}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {fila
              ? <>Se registra el giro por el valor liquidado: <strong>{fmtCOP(fila.valor_final)}</strong>. No hay pagos parciales; un giro por menos se corrige anulando y registrando de nuevo.</>
              : <>Se registra el giro de {pendientes} colaborador{pendientes !== 1 ? 'es' : ''} pendiente{pendientes !== 1 ? 's' : ''}, cada uno por su valor liquidado.</>}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fechaPago">Fecha del giro <span className="text-destructive">*</span></Label>
            <Input id="fechaPago" type="date" max={hoy} value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Método</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METODOS.map(m => (
                  <SelectItem key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="referencia">Referencia</Label>
            <Input id="referencia" placeholder="Ej: TRX-001" maxLength={100} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
          </div>
          {esCesantias && (
            <div className="space-y-1.5">
              <Label htmlFor="fondo">Fondo</Label>
              <Input
                id="fondo"
                placeholder={fila?.empleado.fondo_cesantias ?? 'El de cada colaborador'}
                maxLength={50}
                value={fondo}
                onChange={(e) => setFondo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Vacío usa el fondo elegido por cada colaborador</p>
            </div>
          )}
          <div className={`space-y-1.5 ${esCesantias ? 'col-span-2' : ''}`}>
            <Label htmlFor="observacion">Observación</Label>
            <Input id="observacion" placeholder="Opcional" maxLength={500} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={guardando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={registrar} disabled={guardando}>
            {guardando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Registrar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
