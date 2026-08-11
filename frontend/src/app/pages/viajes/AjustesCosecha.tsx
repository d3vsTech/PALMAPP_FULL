/**
 * AjustesCosecha
 *
 * Pantalla dedicada a resolver cosechas con gajos pendientes tipo clavija.
 * Se llega solo desde el banner de alerta en el paso Cosecha del conteo.
 *
 * URL: /viajes/ajustes-cosecha
 *
 * Diseño alineado con V.21/PalmApp — tabla + 3 botones por fila (uno por
 * acción). Al hacer click en un botón se abre el modal ya con la acción
 * seleccionada. Se conserva la conexión al backend real (§13 API_VIAJES.md).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../../components/ui/dialog';
import {
  ArrowLeft, TriangleAlert, Ghost, ArrowLeftRight, PauseCircle,
  Truck, ChevronDown, Loader2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ajustesCosechaApi, AjusteGajosErrorCodes,
  type CosechaConAjustePendiente, type Accion, type ViajeDisponible,
} from '../../../api/ajustesCosecha';

function formatKg(kg: number | null | undefined): string {
  if (kg == null) return '—';
  return kg.toLocaleString('es-CO', { maximumFractionDigits: 0 }) + ' kg';
}

function formatFechaCorta(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO');
}

export default function AjustesCosecha() {
  const navigate = useNavigate();

  const [items, setItems] = useState<CosechaConAjustePendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cosechaSeleccionada, setCosechaSeleccionada] = useState<CosechaConAjustePendiente | null>(null);
  const [opcion, setOpcion] = useState<Accion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [silenciarViajes, setSilenciarViajes] = useState(2);
  const [viajeDestino, setViajeDestino] = useState('');
  const [viajesDisponibles, setViajesDisponibles] = useState<ViajeDisponible[]>([]);
  const [cargandoViajes, setCargandoViajes] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await ajustesCosechaApi.listar();
      setItems(res.data.cosechas);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirModal = (cosecha: CosechaConAjustePendiente, accion: Accion) => {
    setCosechaSeleccionada(cosecha);
    setOpcion(accion);
    setMotivo('');
    setViajeDestino('');
    setSilenciarViajes(2);
    setViajesDisponibles([]);
    if (accion === 'REASIGNADO') {
      setCargandoViajes(true);
      ajustesCosechaApi.viajesDisponibles(cosecha.id)
        .then((r) => setViajesDisponibles(r.data ?? []))
        .catch(() => setViajesDisponibles([]))
        .finally(() => setCargandoViajes(false));
    }
  };

  const cerrarDialog = () => {
    if (enviando) return;
    setCosechaSeleccionada(null);
    setOpcion(null);
    setMotivo('');
    setViajeDestino('');
    setViajesDisponibles([]);
  };

  const guardarAjuste = async () => {
    if (!cosechaSeleccionada || !opcion) return;
    if (motivo.trim().length < 5) {
      toast.error('Escribe un motivo mínimo de 5 caracteres');
      return;
    }
    if (opcion === 'REASIGNADO' && !viajeDestino) {
      toast.error('Selecciona el viaje al que se reasignan los gajos');
      return;
    }
    setEnviando(true);
    try {
      await ajustesCosechaApi.aplicar(cosechaSeleccionada.id, {
        accion: opcion,
        motivo: motivo.trim(),
        viaje_destino_id: opcion === 'REASIGNADO' ? Number(viajeDestino) : undefined,
        silenciar_viajes: opcion === 'MANTENIDO' ? silenciarViajes : undefined,
      });
      toast.success('Ajuste guardado correctamente');
      cerrarDialog();
      cargar();
    } catch (err: any) {
      const code = err?.code ?? err?.error_code;
      if (code === AjusteGajosErrorCodes.SIN_GAJOS_PENDIENTES) {
        toast.error('La cosecha ya no tiene gajos pendientes.');
        cerrarDialog();
        cargar();
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

  const viajeSeleccionado = viajesDisponibles.find((v) => String(v.id) === viajeDestino);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/viajes')}
          className="mb-2 gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Viajes
        </Button>
        <h1>Ajustes de cosecha</h1>
        <p className="text-muted-foreground mt-1">
          Cosechas con gajos pendientes desde hace 3+ viajes. Decide qué hacer con ellos.
        </p>
      </div>

      {/* Tabla */}
      {cargando ? (
        <Card className="border-border">
          <CardContent className="p-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando cosechas con pendientes...
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Todo en orden</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No hay cosechas con gajos pendientes que requieran ajuste.
            </p>
            <Button onClick={() => navigate('/viajes')} className="mt-4">
              Volver a Viajes
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lote · Sublote</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reportados</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reconteo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">En viajes</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pendientes</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Peso perdido</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((cosecha, i) => (
                    <tr
                      key={cosecha.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">
                          {cosecha.lote?.nombre ?? 'Sin lote'}
                          {cosecha.sublote?.nombre ? ` · ${cosecha.sublote.nombre}` : ''}
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200 mt-1 inline-block">
                          {cosecha.viajes_transcurridos} viajes sin resolver
                        </span>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatFechaCorta(cosecha.operacion.fecha)}
                      </td>
                      <td className="px-4 py-4 text-right font-medium">{cosecha.gajos_reportados}</td>
                      <td className="px-4 py-4 text-right font-medium">{cosecha.gajos_reconteo ?? '–'}</td>
                      <td className="px-4 py-4 text-right font-medium">{cosecha.gajos_en_viajes}</td>
                      <td className="px-4 py-4 text-right font-bold text-orange-500">{cosecha.gajos_pendientes}</td>
                      <td className="px-4 py-4 text-right font-bold text-destructive">
                        {formatKg(cosecha.peso_estimado_perdido)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => abrirModal(cosecha, 'CLAVIJO')}
                            title="Marcar como clavija"
                            className="h-8 w-8 rounded-lg bg-sky-100 hover:bg-sky-200 flex items-center justify-center transition-colors"
                          >
                            <Ghost className="h-4 w-4 text-sky-500" />
                          </button>
                          <button
                            onClick={() => abrirModal(cosecha, 'REASIGNADO')}
                            title="Reasignar a otro viaje"
                            className="h-8 w-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                          >
                            <ArrowLeftRight className="h-4 w-4 text-primary" />
                          </button>
                          <button
                            onClick={() => abrirModal(cosecha, 'MANTENIDO')}
                            title="Mantener pendientes"
                            className="h-8 w-8 rounded-lg bg-orange-100 hover:bg-orange-200 flex items-center justify-center transition-colors"
                          >
                            <PauseCircle className="h-4 w-4 text-orange-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de ajuste */}
      <Dialog open={!!cosechaSeleccionada} onOpenChange={(open) => { if (!open) cerrarDialog(); }}>
        <DialogContent className="sm:max-w-none w-[calc(100vw-2rem)] sm:w-[680px] max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-xl">
              <TriangleAlert className="h-5 w-5 text-orange-500 shrink-0" />
              {opcion === 'CLAVIJO' && 'Marcar como clavija'}
              {opcion === 'REASIGNADO' && 'Reasignar a otro viaje'}
              {opcion === 'MANTENIDO' && 'Mantener pendientes'}
            </DialogTitle>
            <DialogDescription>
              {cosechaSeleccionada?.lote?.nombre ?? 'Sin lote'}
              {cosechaSeleccionada?.sublote?.nombre ? ` · ${cosechaSeleccionada.sublote.nombre}` : ''}
              {' · '}Operación {cosechaSeleccionada ? formatFechaCorta(cosechaSeleccionada.operacion.fecha) : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Campo extra: Viaje destino (reasignar) */}
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
                        value={viajeDestino}
                        onChange={(e) => setViajeDestino(e.target.value)}
                        disabled={enviando}
                        className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors pr-10"
                      >
                        <option value="">Selecciona el viaje</option>
                        {viajesDisponibles.map((v) => (
                          <option key={v.id} value={String(v.id)}>
                            {v.remision} · {v.placa_vehiculo} · {formatFechaCorta(v.fecha_viaje)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                    {viajeSeleccionado && (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold">
                        <Truck className="h-4 w-4 shrink-0" />
                        <span>{viajeSeleccionado.remision}</span>
                        <span className="opacity-70">·</span>
                        <span>{viajeSeleccionado.placa_vehiculo}</span>
                        <span className="opacity-70">·</span>
                        <span>{formatFechaCorta(viajeSeleccionado.fecha_viaje)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Campo extra: Silenciar por N viajes (mantener) */}
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

            {/* Caja informativa */}
            {opcion === 'CLAVIJO' && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-1.5">
                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-600 border border-sky-300">Clavija</span>
                <p className="text-sm text-foreground font-medium">Los gajos nunca existieron (clavijas). Se baja el reconteo al total real asignado.</p>
              </div>
            )}
            {opcion === 'REASIGNADO' && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Reasignado a otro viaje</span>
                <p className="text-sm text-foreground font-medium">Los gajos sí existían; se agregan como split parcial al viaje seleccionado.</p>
              </div>
            )}
            {opcion === 'MANTENIDO' && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-1.5">
                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-300">Mantenido pendiente</span>
                <p className="text-sm text-foreground font-medium">Silencia la alerta {silenciarViajes} viajes más; no modifica cantidades.</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={cerrarDialog} disabled={enviando}>Cancelar</Button>
              <Button onClick={guardarAjuste} disabled={enviando}>
                {enviando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar ajuste
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
