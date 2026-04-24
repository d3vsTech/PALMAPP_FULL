import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, Check, Truck, Leaf, Plus, Trash2, X, Loader2,
  Calendar, MapPin, Clock, FileText,
} from 'lucide-react';
import {
  viajesApi,
  parseFechaAPI,
  type Viaje,
  type ViajeDetalle,
  type OperacionDisponible,
  type CosechaLibre,
} from '../../../api/viajes';
import { toast } from 'sonner';

interface CosechaEditable {
  detalleId: number;
  cosechaId: number;
  loteNombre: string;
  subloteNombre: string;
  gajosReportados: number;
  cuadrillaCount: number;
  gajos: number;
  pesoKg: number;
  aprobado: boolean;
}

function cosechaDesdeDetalle(d: ViajeDetalle): CosechaEditable {
  return {
    detalleId: d?.id ?? 0,
    cosechaId: d?.cosecha_id ?? 0,
    loteNombre: d?.cosecha?.lote?.nombre ?? '—',
    subloteNombre: d?.cosecha?.sublote?.nombre ?? '—',
    gajosReportados: d?.cosecha?.gajos_reportados ?? 0,
    cuadrillaCount: d?.cosecha?.cuadrilla_count ?? 0,
    gajos: d?.cosecha?.gajos_reconteo ?? 0,
    pesoKg: parseFloat(d?.cosecha?.peso_confirmado ?? '0') || 0,
    aprobado: Boolean(d?.reconteo_aprobado),
  };
}

export default function ConteoCosecha() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [cosechas, setCosechas] = useState<CosechaEditable[]>([]);
  const [finalizando, setFinalizando] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [operaciones, setOperaciones] = useState<OperacionDisponible[]>([]);
  const [operacionId, setOperacionId] = useState<string>('');
  const [cosechasLibres, setCosechasLibres] = useState<CosechaLibre[]>([]);
  const [cargandoOps, setCargandoOps] = useState(false);
  const [cargandoCosechas, setCargandoCosechas] = useState(false);
  const [agregando, setAgregando] = useState(false);

  const cargarViaje = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorCarga(null);
    try {
      const res = await viajesApi.ver(Number(id));
      if (!res?.data) throw new Error('El servidor no devolvió datos del viaje');
      setViaje(res.data);
      const detalles = Array.isArray(res.data.detalles) ? res.data.detalles : [];
      setCosechas(detalles.map(cosechaDesdeDetalle));
    } catch (err) {
      console.error('[ConteoCosecha] Error al cargar viaje:', err);
      setErrorCarga(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargarViaje(); }, [cargarViaje]);

  const abrirModalAgregar = async () => {
    setModalOpen(true);
    setOperacionId('');
    setCosechasLibres([]);
    setCargandoOps(true);
    try {
      const res = await viajesApi.operacionesDisponibles();
      setOperaciones(res.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar operaciones');
    } finally {
      setCargandoOps(false);
    }
  };

  useEffect(() => {
    if (!modalOpen || !operacionId) { setCosechasLibres([]); return; }
    setCargandoCosechas(true);
    viajesApi
      .cosechasLibresDeOperacion(Number(operacionId))
      .then((r) => setCosechasLibres(r.data ?? []))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Error al cargar cosechas'))
      .finally(() => setCargandoCosechas(false));
  }, [modalOpen, operacionId]);

  const agregarCosechaAlViaje = async (cosechaId: number) => {
    if (!viaje) return;
    setAgregando(true);
    try {
      await viajesApi.agregarDetalle(viaje.id, cosechaId);
      toast.success('Cosecha agregada al viaje');
      setCosechasLibres((prev) => prev.filter((c) => c.id !== cosechaId));
      await cargarViaje();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar cosecha');
    } finally {
      setAgregando(false);
    }
  };

  const quitarCosecha = async (detalleId: number) => {
    if (!viaje) return;
    if (!window.confirm('¿Quitar esta cosecha del viaje?')) return;
    try {
      await viajesApi.eliminarDetalle(viaje.id, detalleId);
      setCosechas((prev) => prev.filter((c) => c.detalleId !== detalleId));
      toast.success('Cosecha quitada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al quitar cosecha');
    }
  };

  const actualizarGajos = (detalleId: number, gajos: number) =>
    setCosechas((prev) => prev.map((c) => (c.detalleId === detalleId ? { ...c, gajos } : c)));

  const actualizarPeso = (detalleId: number, pesoKg: number) =>
    setCosechas((prev) => prev.map((c) => (c.detalleId === detalleId ? { ...c, pesoKg } : c)));

  const finalizarConteo = async () => {
    if (!viaje) return;
    if (cosechas.length === 0) { toast.error('Debes agregar al menos una cosecha'); return; }
    const sinGajos = cosechas.filter((c) => !c.aprobado && (!c.gajos || c.gajos <= 0));
    if (sinGajos.length > 0) { toast.error('Todas las cosechas deben tener gajos de reconteo'); return; }

    setFinalizando(true);
    try {
      for (const c of cosechas) {
        if (c.aprobado) continue;
        await viajesApi.hidratarReconteo(viaje.id, c.detalleId, {
          gajos_reconteo: c.gajos,
          peso_confirmado: c.pesoKg > 0 ? c.pesoKg : null,
        });
        await viajesApi.aprobarReconteo(viaje.id, c.detalleId);
      }
      toast.success('Conteo finalizado. Viaje despachado.');
      navigate('/viajes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al finalizar el conteo');
    } finally {
      setFinalizando(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
      <Loader2 className="w-5 h-5 animate-spin" /> Cargando viaje...
    </div>
  );

  if (!viaje) return (
    <div className="max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate('/viajes')} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" /> Volver a Viajes
      </Button>
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">No se pudo cargar el viaje</h2>
          <p className="text-sm text-muted-foreground mb-4">{errorCarga ?? 'El servidor no devolvió datos para este viaje.'}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => cargarViaje()}>Reintentar</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/viajes')}>Volver al listado</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">ID del viaje: <code className="bg-muted px-1 rounded">{id}</code></p>
        </CardContent>
      </Card>
    </div>
  );

  if (viaje.estado !== 'CREADO') {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/viajes')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver a Viajes
        </Button>
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-400 mb-2">El viaje ya fue despachado</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Este viaje está en estado <strong>{viaje.estado}</strong> y ya no puede editarse.
            </p>
            <Button onClick={() => navigate(`/viajes/${viaje.id}`)}>Ir al detalle</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fechaViaje = parseFechaAPI(viaje.fecha_viaje);
  const puedeFinalizar = cosechas.length > 0 && cosechas.every((c) => c.aprobado || c.gajos > 0);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/viajes')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver a Viajes
        </Button>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Conteo de Cosecha</h1>
            <p className="text-muted-foreground mt-1">Registra las cosechas del viaje y aprueba el reconteo</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Remisión</p>
            <p className="text-xl font-bold text-primary">{viaje.remision}</p>
          </div>
        </div>
      </div>

      {/* Info del viaje */}
      <Card className="glass-subtle border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div><CardTitle>Información del Viaje</CardTitle><p className="text-sm text-muted-foreground">Datos generales</p></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><Calendar className="h-4 w-4" /><span className="text-xs">Fecha</span></div>
              <p className="text-sm font-medium">{fechaViaje ? fechaViaje.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Hora salida</span></div>
              <p className="text-sm font-medium">{(viaje.hora_salida ?? '').substring(0, 5) || '—'}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><Truck className="h-4 w-4" /><span className="text-xs">Vehículo / Conductor</span></div>
              <p className="text-sm font-medium">{viaje.placa_vehiculo}</p>
              <p className="text-xs text-muted-foreground">{viaje.nombre_conductor}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><MapPin className="h-4 w-4" /><span className="text-xs">Extractora</span></div>
              <p className="text-sm font-medium">{viaje.extractora?.razon_social ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cosechas */}
      <Card className="glass-subtle border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center"><Leaf className="h-6 w-6 text-success" /></div>
              <div>
                <CardTitle>Cosechas del Viaje</CardTitle>
                <p className="text-sm text-muted-foreground">{cosechas.length === 0 ? 'Agrega cosechas al viaje' : `${cosechas.length} cosecha(s)`}</p>
              </div>
            </div>
            <Button onClick={abrirModalAgregar} className="gap-2"><Plus className="h-4 w-4" /> Agregar Cosecha</Button>
          </div>
        </CardHeader>
        <CardContent>
          {cosechas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Leaf className="h-8 w-8 text-muted-foreground" /></div>
              <h3 className="mb-2 text-lg font-semibold">Sin cosechas agregadas</h3>
              <p className="mb-4 text-sm text-muted-foreground">Selecciona una operación aprobada y agrega sus cosechas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cosechas.map((c) => (
                <div key={c.detalleId} className={`p-4 rounded-lg border transition-colors ${c.aprobado ? 'bg-success/5 border-success/30' : 'bg-muted/20 border-border'}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{c.loteNombre} · {c.subloteNombre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Gajos reportados: <strong>{c.gajosReportados.toLocaleString()}</strong> · Cuadrilla: <strong>{c.cuadrillaCount}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.aprobado ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/30">
                          <Check className="h-3.5 w-3.5" /> Aprobado
                        </span>
                      ) : (
                        <Button size="sm" variant="ghost" className="hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => quitarCosecha(c.detalleId)} title="Quitar del viaje">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Gajos reconteo *</Label>
                      <Input type="number" min="0" value={c.gajos || ''} onChange={(e) => actualizarGajos(c.detalleId, parseInt(e.target.value) || 0)}
                        disabled={c.aprobado} placeholder="Ingresa los gajos contados" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Peso confirmado (kg) — opcional</Label>
                      <Input type="number" min="0" step="0.01" value={c.pesoKg || ''} onChange={(e) => actualizarPeso(c.detalleId, parseFloat(e.target.value) || 0)}
                        disabled={c.aprobado} placeholder="Ej: 4120.50" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/viajes')} disabled={finalizando}>Cancelar</Button>
        <Button onClick={finalizarConteo} disabled={!puedeFinalizar || finalizando} className="gap-2 bg-success hover:bg-success/90">
          {finalizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {finalizando ? 'Finalizando...' : 'Finalizar y Despachar'}
        </Button>
      </div>

      {/* Modal Agregar Cosecha */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Agregar Cosecha al Viaje</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Selecciona una operación aprobada</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}><X className="h-5 w-5" /></Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              <div className="space-y-2">
                <Label>Operación aprobada *</Label>
                <Select value={operacionId} onValueChange={setOperacionId}>
                  <SelectTrigger><SelectValue placeholder={cargandoOps ? 'Cargando...' : 'Seleccionar operación...'} /></SelectTrigger>
                  <SelectContent>
                    {operaciones.length === 0 && !cargandoOps && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No hay operaciones con cosechas libres</div>
                    )}
                    {operaciones.map((op) => {
                      const f = parseFechaAPI(op.fecha);
                      return (
                        <SelectItem key={op.id} value={String(op.id)}>
                          {f ? f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : op.fecha} · {op.cosechas_disponibles_count} cosechas
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {operacionId && (
                <div className="space-y-2">
                  <Label>Cosechas disponibles</Label>
                  {cargandoCosechas ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
                  ) : cosechasLibres.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg">
                      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No hay cosechas libres en esta operación</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cosechasLibres.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
                          <div>
                            <p className="text-sm font-medium">{c.lote?.nombre ?? '—'} · {c.sublote?.nombre ?? '—'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Gajos: {c.gajos_reportados.toLocaleString()} · Cuadrilla: {c.cuadrilla_count ?? 0}</p>
                          </div>
                          <Button size="sm" onClick={() => agregarCosechaAlViaje(c.id)} disabled={agregando} className="gap-1.5">
                            {agregando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Agregar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <div className="flex-shrink-0 border-t p-4 flex justify-end">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cerrar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}