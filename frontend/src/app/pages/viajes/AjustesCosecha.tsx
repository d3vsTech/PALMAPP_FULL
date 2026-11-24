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
import { useNavigate, useLocation } from 'react-router';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../../components/ui/dialog';
import {
  ArrowLeft, Ghost, ArrowLeftRight, PauseCircle,
  Truck, Loader2, Sparkles,
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
  const location = useLocation();

  // Cuando la pantalla se abre desde la alerta del wizard/detalle de nómina
  // (navigate con { state: { from: 'nomina', nominaId, paso } }), el botón
  // "Volver" regresa a la nómina en vez de al listado de Viajes.
  const navState = (location.state ?? null) as
    | { from?: string; nominaId?: number | null; paso?: number }
    | null;
  const vieneDeNomina = navState?.from === 'nomina' && !!navState?.nominaId;
  const volverLabel = vieneDeNomina ? 'Volver a Nómina' : 'Volver a Viajes';
  const volverAlOrigen = () => {
    if (vieneDeNomina && navState?.nominaId) {
      // Al wizard en modo edición; el `state.from` le dice al wizard que
      // restaure el paso desde donde vino (sessionStorage). Sin ese flag,
      // el wizard arranca en paso 1 (comportamiento normal de "Editar").
      navigate(`/nomina/${navState.nominaId}/editar`, {
        state: { from: 'ajustes-cosecha' },
      });
    } else {
      navigate('/viajes');
    }
  };

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
    <div className="space-y-6">
      <PageHeader
        backTo={vieneDeNomina ? undefined : '/viajes'}
        eyebrow={vieneDeNomina ? 'Nómina' : 'Viajes'}
        title="Ajustes de cosecha"
        description="Cosechas con gajos pendientes desde hace 3 viajes o más. Decida qué hacer con ellos."
        actions={vieneDeNomina ? (
          <Button variant="outline" onClick={volverAlOrigen}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            {volverLabel}
          </Button>
        ) : undefined}
      />

      {/* Tabla */}
      {cargando ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Cargando cosechas con pendientes…
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="items-center py-12 text-center">
          <div className="max-w-sm space-y-1 px-6">
            <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Sparkles className="h-5 w-5" strokeWidth={2} />
            </span>
            <h3 className="text-base font-semibold text-foreground">Todo en orden</h3>
            <p className="text-sm text-muted-foreground">
              No hay cosechas con gajos pendientes que requieran ajuste.
            </p>
          </div>
          <Button onClick={volverAlOrigen}>{volverLabel}</Button>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[13px] text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">Lote · sublote</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Reportados</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Reconteo</th>
                  <th className="px-4 py-2.5 text-right font-semibold">En viajes</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Pendientes</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold">Peso perdido</th>
                  <th className="px-3 py-2.5 text-right font-semibold"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((cosecha) => (
                  <tr key={cosecha.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <p className="whitespace-nowrap font-semibold text-foreground">
                        {cosecha.lote?.nombre ?? 'Sin lote'}
                        {cosecha.sublote?.nombre ? ` · ${cosecha.sublote.nombre}` : ''}
                      </p>
                      <Badge variant="warning" className="mt-1">
                        {cosecha.viajes_transcurridos} viajes sin resolver
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatFechaCorta(cosecha.operacion.fecha)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{cosecha.gajos_reportados.toLocaleString('es-CO')}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {cosecha.gajos_reconteo != null ? cosecha.gajos_reconteo.toLocaleString('es-CO') : '–'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{cosecha.gajos_en_viajes.toLocaleString('es-CO')}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-warning">
                      {cosecha.gajos_pendientes.toLocaleString('es-CO')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-destructive">
                      {formatKg(cosecha.peso_estimado_perdido)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => abrirModal(cosecha, 'CLAVIJO')}
                          title="Marcar como clavija"
                          aria-label="Marcar como clavija"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Ghost className="h-4 w-4" strokeWidth={2} />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => abrirModal(cosecha, 'REASIGNADO')}
                          title="Reasignar a otro viaje"
                          aria-label="Reasignar a otro viaje"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ArrowLeftRight className="h-4 w-4" strokeWidth={2} />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => abrirModal(cosecha, 'MANTENIDO')}
                          title="Mantener pendientes"
                          aria-label="Mantener pendientes"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <PauseCircle className="h-4 w-4" strokeWidth={2} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de ajuste */}
      <Dialog open={!!cosechaSeleccionada} onOpenChange={(open) => { if (!open) cerrarDialog(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
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

          <div className="space-y-5">
            {/* Campo extra: Viaje destino (reasignar) */}
            {opcion === 'REASIGNADO' && (
              <div className="space-y-2">
                <Label>Viaje de destino</Label>
                {cargandoViajes ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                    Cargando viajes disponibles…
                  </div>
                ) : viajesDisponibles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No hay viajes en estado CREADO donde reasignar esta cosecha.
                  </p>
                ) : (
                  <>
                    <Select
                      value={viajeDestino}
                      onValueChange={setViajeDestino}
                      disabled={enviando}
                    >
                      <SelectTrigger aria-label="Viaje de destino">
                        <SelectValue placeholder="Selecciona el viaje" />
                      </SelectTrigger>
                      <SelectContent>
                        {viajesDisponibles.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.remision} · {v.placa_vehiculo} · {formatFechaCorta(v.fecha_viaje)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {viajeSeleccionado && (
                      <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">
                        <Truck className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                        <span className="font-semibold">{viajeSeleccionado.remision}</span>
                        <span className="text-muted-foreground">·</span>
                        <span>{viajeSeleccionado.placa_vehiculo}</span>
                        <span className="text-muted-foreground">·</span>
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
                <Label htmlFor="ajustescos-silenciar-por-n-viajes">Silenciar por cuántos viajes</Label>
                <Input id="ajustescos-silenciar-por-n-viajes"
                  type="number" step="0.001"
                  min={1}
                  max={20}
                  value={silenciarViajes}
                  onChange={(e) => setSilenciarViajes(Math.max(1, parseFloat(e.target.value) || 1))}
                  disabled={enviando}
                  className="w-24"
                />
              </div>
            )}

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="ajustescos-motivo-del-ajuste">Motivo del ajuste</Label>
              <Textarea id="ajustescos-motivo-del-ajuste"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explica por qué tomas esta decisión. Queda registrado en el historial."
                rows={3}
                maxLength={500}
                disabled={enviando}
                className="resize-none"
              />
            </div>

            {/* Caja informativa */}
            {opcion === 'CLAVIJO' && (
              <div className="space-y-1.5 rounded-lg border border-info/20 bg-info-soft p-4">
                <Badge variant="info">Clavija</Badge>
                <p className="text-sm text-foreground">Los gajos nunca existieron (clavijas). Se baja el reconteo al total real asignado.</p>
              </div>
            )}
            {opcion === 'REASIGNADO' && (
              <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary-soft p-4">
                <Badge>Reasignado a otro viaje</Badge>
                <p className="text-sm text-foreground">Los gajos sí existían; se agregan como split parcial al viaje seleccionado.</p>
              </div>
            )}
            {opcion === 'MANTENIDO' && (
              <div className="space-y-1.5 rounded-lg border border-warning/20 bg-warning-soft p-4">
                <Badge variant="warning">Mantenido pendiente</Badge>
                <p className="text-sm text-foreground">Silencia la alerta {silenciarViajes} viajes más; no modifica cantidades.</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={cerrarDialog} disabled={enviando}>Cancelar</Button>
              <Button onClick={guardarAjuste} disabled={enviando}>
                {enviando && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                Guardar ajuste
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
