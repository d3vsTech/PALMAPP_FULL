/**
 * ModalAjustarCosecha
 *
 * Modal para resolver qué hacer con los gajos pendientes tipo "clavijo"
 * de una cosecha (gajos que se reportaron pero no existían físicamente).
 * Ofrece 3 acciones:
 *
 *  - CLAVIJO:      nunca existieron. Baja `gajos_reconteo` al total real
 *                  asignado. La cosecha se cierra.
 *  - REASIGNADO:   los gajos sí existían; se trasladan a un viaje ya creado.
 *                  Muestra dropdown con los viajes en estado CREADO del tenant.
 *  - MANTENIDO:    silencia la alerta N viajes más sin modificar cantidades.
 *
 * Todas las opciones piden motivo obligatorio (queda en `cosecha_ajuste.motivo`
 * para trazabilidad). La preservación histórica la garantiza el backend con
 * los snapshots que guarda en la tabla de ajustes.
 */
import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import {
  AlertTriangle, GhostIcon, ArrowRightLeft, PauseCircle, Loader2, Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ajustesCosechaApi, TIPO_AJUSTE_LABEL,
  type CosechaConAjustePendiente, type TipoAjuste,
} from '../../../api/ajustesCosecha';
import { viajesApi, type Viaje } from '../../../api/viajes';

interface Props {
  open: boolean;
  cosecha: CosechaConAjustePendiente | null;
  onClose: () => void;
  onAjustado: () => void;
}

export function ModalAjustarCosecha({ open, cosecha, onClose, onAjustado }: Props) {
  const [tipo, setTipo] = useState<TipoAjuste | null>(null);
  const [motivo, setMotivo] = useState('');
  const [viajeDestinoId, setViajeDestinoId] = useState('');
  const [silenciarPor, setSilenciarPor] = useState('2');
  const [enviando, setEnviando] = useState(false);
  /** Viajes en estado CREADO donde se puede reasignar la cantidad.
   *  Se carga en cuanto el usuario escoge "Reasignar a otro viaje". */
  const [viajesDisponibles, setViajesDisponibles] = useState<Viaje[]>([]);
  const [cargandoViajes, setCargandoViajes] = useState(false);

  useEffect(() => {
    if (tipo !== 'REASIGNADO' || viajesDisponibles.length > 0) return;
    setCargandoViajes(true);
    viajesApi.listar({ per_page: 100 })
      .then((res) => {
        // Solo CREADO admite nuevos detalles. EN_VALIDACION y FINALIZADO
        // rechazan `POST /viajes/{id}/detalles` con 409 VIAJE_NO_EDITABLE.
        const editables = (res.data ?? []).filter((v: any) => v.estado === 'CREADO');
        setViajesDisponibles(editables);
      })
      .catch(() => setViajesDisponibles([]))
      .finally(() => setCargandoViajes(false));
  }, [tipo, viajesDisponibles.length]);

  if (!cosecha) return null;

  const reset = () => {
    setTipo(null);
    setMotivo('');
    setViajeDestinoId('');
    setSilenciarPor('2');
  };

  const cerrar = () => {
    if (enviando) return;
    reset();
    onClose();
  };

  const confirmar = async () => {
    if (!tipo) return;
    if (motivo.trim().length < 5) {
      toast.error('Escribe un motivo mínimo de 5 caracteres');
      return;
    }
    if (tipo === 'REASIGNADO' && !viajeDestinoId.trim()) {
      toast.error('Selecciona el viaje al que se reasignan los gajos');
      return;
    }
    setEnviando(true);
    try {
      await ajustesCosechaApi.ajustar(cosecha.cosecha_id, {
        tipo,
        motivo: motivo.trim(),
        viaje_destino_id: tipo === 'REASIGNADO' ? Number(viajeDestinoId) : undefined,
        silenciar_por_viajes: tipo === 'MANTENIDO' ? Number(silenciarPor) : undefined,
      });
      toast.success('Ajuste guardado correctamente');
      reset();
      onAjustado();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo guardar el ajuste');
    } finally {
      setEnviando(false);
    }
  };

  const cfgSeleccionado = tipo ? TIPO_AJUSTE_LABEL[tipo] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) cerrar(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Ajustar cosecha con gajos pendientes
          </DialogTitle>
          <DialogDescription className="text-xs">
            {cosecha.lote?.nombre ?? 'Sin lote'}
            {cosecha.sublote?.nombre ? ` · ${cosecha.sublote.nombre}` : ''}
            {' · '}
            Planilla {new Date(cosecha.planilla_fecha + 'T00:00:00').toLocaleDateString('es-CO')}
          </DialogDescription>
        </DialogHeader>

        {/* Resumen de la cosecha. */}
        <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reportados</span>
            <span className="font-mono">{cosecha.gajos_reportados}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reconteo actual</span>
            <span className="font-mono">{cosecha.gajos_reconteo ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Asignados a viajes</span>
            <span className="font-mono">{cosecha.gajos_asignados_total}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="font-medium text-amber-600">Pendientes sin resolver</span>
            <span className="font-mono font-bold text-amber-600">
              {cosecha.gajos_pendientes}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Viajes transcurridos</span>
            <span>{cosecha.viajes_transcurridos}</span>
          </div>
        </div>

        {/* Selector de acción. */}
        <div className="space-y-2">
          <Label className="text-xs">¿Qué hacer con los {cosecha.gajos_pendientes} gajos pendientes?</Label>
          <div className="grid gap-2">
            <OpcionAccion
              activo={tipo === 'CLAVIJO'}
              onClick={() => setTipo('CLAVIJO')}
              icon={GhostIcon}
              titulo="Marcar como clavijo"
              descripcion="Nunca existieron. Diferencia de conteo del trabajador."
              destructivo
            />
            <OpcionAccion
              activo={tipo === 'REASIGNADO'}
              onClick={() => setTipo('REASIGNADO')}
              icon={ArrowRightLeft}
              titulo="Reasignar a otro viaje"
              descripcion="Sí existían; olvidé asignarlos a un viaje anterior."
            />
            <OpcionAccion
              activo={tipo === 'MANTENIDO'}
              onClick={() => setTipo('MANTENIDO')}
              icon={PauseCircle}
              titulo="Mantener pendientes"
              descripcion="Silenciar alerta unos viajes más sin cambiar nada."
            />
          </div>
        </div>

        {/* Campos condicionales según la opción. */}
        {tipo === 'REASIGNADO' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Viaje destino</Label>
            {cargandoViajes ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cargando viajes disponibles...
              </div>
            ) : viajesDisponibles.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No hay viajes en estado CREADO donde reasignar. Solo los viajes
                aún editables pueden recibir la reasignación.
              </p>
            ) : (
              <Select
                value={viajeDestinoId}
                onValueChange={setViajeDestinoId}
                disabled={enviando}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el viaje" />
                </SelectTrigger>
                <SelectContent>
                  {viajesDisponibles.map((v: any) => {
                    const rem = v.remision ?? v.id;
                    const placa = v.placa_vehiculo ?? '—';
                    const fecha = v.fecha_viaje
                      ? new Date(v.fecha_viaje + 'T00:00:00').toLocaleDateString('es-CO', {
                          day: '2-digit', month: 'short',
                        })
                      : '';
                    return (
                      <SelectItem key={v.id} value={String(v.id)}>
                        <span className="flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono">{rem}</span>
                          <span className="text-muted-foreground">·</span>
                          <span>{placa}</span>
                          {fecha && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground">{fecha}</span>
                            </>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            <p className="text-[10px] text-muted-foreground">
              Los {cosecha.gajos_pendientes} gajos se agregarán como split parcial al viaje seleccionado.
            </p>
          </div>
        )}

        {tipo === 'MANTENIDO' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Silenciar por N viajes</Label>
            <Input
              type="number"
              value={silenciarPor}
              onChange={(e) => setSilenciarPor(e.target.value)}
              min={1}
              max={10}
              disabled={enviando}
              className="w-24 font-mono"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Motivo del ajuste</Label>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explica por qué tomas esta decisión. Queda registrado en el historial."
            rows={3}
            disabled={enviando}
          />
        </div>

        {cfgSeleccionado && (
          <div className={`rounded-lg p-2.5 text-[11px] border ${cfgSeleccionado.color}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge variant="outline" className={cfgSeleccionado.color}>
                {cfgSeleccionado.label}
              </Badge>
            </div>
            <p className="opacity-90">{cfgSeleccionado.descripcion}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={cerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!tipo || enviando} className="gap-2">
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar ajuste
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface OpcionProps {
  activo: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  descripcion: string;
  destructivo?: boolean;
}
function OpcionAccion({ activo, onClick, icon: Icon, titulo, descripcion, destructivo }: OpcionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border p-3 transition-all flex items-start gap-3 ${
        activo
          ? destructivo
            ? 'border-destructive/50 bg-destructive/5'
            : 'border-primary bg-primary/5'
          : 'border-border hover:bg-muted/40'
      }`}
    >
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        destructivo ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{titulo}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{descripcion}</p>
      </div>
    </button>
  );
}
