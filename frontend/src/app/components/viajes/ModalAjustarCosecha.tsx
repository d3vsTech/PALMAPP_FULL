/**
 * ModalAjustarCosecha
 *
 * Modal para resolver qué hacer con los gajos pendientes tipo "clavijo"
 * de una cosecha. Diseño alineado con V.20/PalmApp; la conexión al backend
 * (§13 API_VIAJES.md) se mantiene sin cambios.
 *
 * 3 acciones:
 *  - CLAVIJO      → nunca existieron. Baja `gajos_reconteo`.
 *  - REASIGNADO   → sí existían; se agregan a un viaje en CREADO.
 *  - MANTENIDO    → silencia la alerta N viajes más.
 */
import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import {
  TriangleAlert, Ghost, ArrowLeftRight, PauseCircle, ChevronDown, Truck, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ajustesCosechaApi, AjusteGajosErrorCodes,
  type CosechaConAjustePendiente, type Accion, type ViajeDisponible,
} from '../../../api/ajustesCosecha';

interface Props {
  open: boolean;
  cosecha: CosechaConAjustePendiente | null;
  onClose: () => void;
  onAjustado: () => void;
}

const OPCIONES = [
  {
    id: 'CLAVIJO' as Accion,
    icon: Ghost,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-500',
    titulo: 'Marcar como clavijo',
    descripcion: 'Nunca existieron. Diferencia de conteo del trabajador.',
    borderSeleccionado: 'border-sky-400 bg-sky-50',
  },
  {
    id: 'REASIGNADO' as Accion,
    icon: ArrowLeftRight,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    titulo: 'Reasignar a otro viaje',
    descripcion: 'Sí existían; olvidé asignarlos a un viaje anterior.',
    borderSeleccionado: 'border-primary bg-primary/5',
  },
  {
    id: 'MANTENIDO' as Accion,
    icon: PauseCircle,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-500',
    titulo: 'Mantener pendientes',
    descripcion: 'Silenciar alerta unos viajes más sin cambiar nada.',
    borderSeleccionado: 'border-orange-400 bg-orange-50',
  },
];

export function ModalAjustarCosecha({ open, cosecha, onClose, onAjustado }: Props) {
  const [opcion, setOpcion] = useState<Accion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [viajeDestinoId, setViajeDestinoId] = useState('');
  const [silenciarViajes, setSilenciarViajes] = useState(2);
  const [enviando, setEnviando] = useState(false);
  const [viajesDisponibles, setViajesDisponibles] = useState<ViajeDisponible[]>([]);
  const [cargandoViajes, setCargandoViajes] = useState(false);

  useEffect(() => {
    if (opcion !== 'REASIGNADO' || !cosecha) return;
    setCargandoViajes(true);
    ajustesCosechaApi.viajesDisponibles(cosecha.id)
      .then((res) => setViajesDisponibles(res.data ?? []))
      .catch(() => setViajesDisponibles([]))
      .finally(() => setCargandoViajes(false));
  }, [opcion, cosecha]);

  if (!cosecha) return null;

  const reset = () => {
    setOpcion(null);
    setMotivo('');
    setViajeDestinoId('');
    setSilenciarViajes(2);
    setViajesDisponibles([]);
  };

  const cerrar = () => {
    if (enviando) return;
    reset();
    onClose();
  };

  const guardarAjuste = async () => {
    if (!opcion) return;
    if (motivo.trim().length < 5) {
      toast.error('Escribe un motivo mínimo de 5 caracteres');
      return;
    }
    if (opcion === 'REASIGNADO' && !viajeDestinoId) {
      toast.error('Selecciona el viaje al que se reasignan los gajos');
      return;
    }
    setEnviando(true);
    try {
      await ajustesCosechaApi.aplicar(cosecha.id, {
        accion: opcion,
        motivo: motivo.trim(),
        viaje_destino_id: opcion === 'REASIGNADO' ? Number(viajeDestinoId) : undefined,
        silenciar_viajes: opcion === 'MANTENIDO' ? silenciarViajes : undefined,
      });
      toast.success('Ajuste guardado correctamente');
      reset();
      onAjustado();
    } catch (err: any) {
      const code = err?.code ?? err?.error_code;
      if (code === AjusteGajosErrorCodes.SIN_GAJOS_PENDIENTES) {
        toast.error('La cosecha ya no tiene gajos pendientes.');
        onAjustado();
      } else if (code === AjusteGajosErrorCodes.VIAJE_NO_EDITABLE) {
        toast.error('El viaje destino ya no está en estado CREADO.');
      } else if (code === AjusteGajosErrorCodes.COSECHA_YA_ASIGNADA) {
        toast.error('Esta cosecha ya está asignada al viaje destino.');
      } else if (code === AjusteGajosErrorCodes.VIAJE_NOT_FOUND) {
        toast.error('El viaje destino no existe.');
      } else {
        toast.error(err?.message ?? 'No se pudo guardar el ajuste');
      }
    } finally {
      setEnviando(false);
    }
  };

  const fechaReporte = new Date(cosecha.operacion.fecha + 'T00:00:00').toLocaleDateString('es-CO');
  const viajeSeleccionado = viajesDisponibles.find((v) => String(v.id) === viajeDestinoId);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) cerrar(); }}>
      <DialogContent className="sm:max-w-none w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary text-xl">
            <TriangleAlert className="h-5 w-5 text-orange-500 shrink-0" />
            Ajustar cosecha con gajos pendientes
          </DialogTitle>
          <DialogDescription>
            {cosecha.lote?.nombre ?? 'Sin lote'}
            {cosecha.sublote?.nombre ? ` · ${cosecha.sublote.nombre}` : ''}
            {' · '}Operación {fechaReporte}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Tabla de info */}
          <div className="rounded-xl border border-border overflow-hidden">
            {[
              { label: 'Reportados', valor: cosecha.gajos_reportados, naranja: false },
              { label: 'Reconteo actual', valor: cosecha.gajos_reconteo ?? '–', naranja: false },
              { label: 'Asignados a viajes', valor: cosecha.gajos_en_viajes, naranja: false },
              { label: 'Pendientes sin resolver', valor: cosecha.gajos_pendientes, naranja: true },
              { label: 'Viajes transcurridos', valor: cosecha.viajes_transcurridos, naranja: false },
            ].map((fila, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-2.5 ${i < 4 ? 'border-b border-border' : ''}`}
              >
                <span className={`text-sm ${fila.naranja ? 'font-semibold text-orange-500' : 'text-muted-foreground'}`}>
                  {fila.label}
                </span>
                <span className={`text-sm font-bold ${fila.naranja ? 'text-orange-500' : 'text-foreground'}`}>
                  {fila.valor}
                </span>
              </div>
            ))}
          </div>

          {/* Pregunta */}
          <div>
            <p className="font-semibold text-foreground mb-3">
              ¿Qué hacer con los {cosecha.gajos_pendientes} gajos pendientes?
            </p>
            <div className="space-y-2">
              {OPCIONES.map((op) => {
                const Icon = op.icon;
                const seleccionada = opcion === op.id;
                return (
                  <button
                    key={op.id}
                    onClick={() => setOpcion(op.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                      seleccionada
                        ? op.borderSeleccionado
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl ${op.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${op.iconColor}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{op.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{op.descripcion}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campo extra para REASIGNADO */}
          {opcion === 'REASIGNADO' && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Viaje destino</label>
              {cargandoViajes ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cargando viajes disponibles...
                </div>
              ) : viajesDisponibles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No hay viajes en estado CREADO donde reasignar esta cosecha.
                </p>
              ) : (
                <>
                  <div className="relative">
                    <select
                      value={viajeDestinoId}
                      onChange={(e) => setViajeDestinoId(e.target.value)}
                      disabled={enviando}
                      className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors pr-10"
                    >
                      <option value="">Selecciona el viaje</option>
                      {viajesDisponibles.map((v) => (
                        <option key={v.id} value={String(v.id)}>
                          {v.remision} · {v.placa_vehiculo} · {new Date(v.fecha_viaje + 'T00:00:00').toLocaleDateString('es-CO')}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {viajeSeleccionado && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold w-full">
                      <Truck className="h-4 w-4 shrink-0" />
                      <span>{viajeSeleccionado.remision}</span>
                      <span className="opacity-70">·</span>
                      <span>{viajeSeleccionado.placa_vehiculo}</span>
                      <span className="opacity-70">·</span>
                      <span>
                        {new Date(viajeSeleccionado.fecha_viaje + 'T00:00:00').toLocaleDateString('es-CO')}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Campo extra para MANTENIDO */}
          {opcion === 'MANTENIDO' && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Silenciar por N viajes</label>
              <input
                type="number"
                min={1}
                max={20}
                value={silenciarViajes}
                onChange={(e) => setSilenciarViajes(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={enviando}
                className="w-24 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Motivo del ajuste</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica por qué tomas esta decisión. Queda registrado en el historial."
              rows={3}
              maxLength={500}
              disabled={enviando}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {/* Caja informativa según opción */}
          {opcion === 'CLAVIJO' && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-1.5">
              <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-600 border border-sky-300">
                Clavijo
              </span>
              <p className="text-sm text-foreground font-medium">
                Los gajos nunca existieron (clavijos). Se baja el reconteo al total real asignado.
              </p>
            </div>
          )}
          {opcion === 'REASIGNADO' && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
              <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Reasignado a otro viaje
              </span>
              <p className="text-sm text-foreground font-medium">
                Los gajos sí existían; se agregan como split parcial al viaje seleccionado.
              </p>
            </div>
          )}
          {opcion === 'MANTENIDO' && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-1.5">
              <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-300">
                Mantenido pendiente
              </span>
              <p className="text-sm text-foreground font-medium">
                Silencia la alerta {silenciarViajes} viajes más; no modifica cantidades.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={cerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={guardarAjuste} disabled={!opcion || enviando}>
              {enviando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar ajuste
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
