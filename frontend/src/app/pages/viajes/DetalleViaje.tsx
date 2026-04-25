import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowLeft, Truck, MapPin, Calendar, Package, Scale,
  CheckCircle, Clock, Edit, Save, X, Weight,
} from 'lucide-react';
import { Button }    from '../../components/ui/button';
import { Input }     from '../../components/ui/input';
import { Label }     from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { viajesApi, strField, type Viaje, type EstadoViajeApi } from '../../../api/viajes';

// ── helpers ───────────────────────────────────────────────────────────────────

type EstadoLocal = 'Creado' | 'En Camino' | 'En Planta' | 'Finalizado';
const ESTADO_MAP: Record<EstadoViajeApi, EstadoLocal> = {
  CREADO: 'Creado', EN_CAMINO: 'En Camino', EN_PLANTA: 'En Planta', FINALIZADO: 'Finalizado',
};

function getEstadoBadge(estado: EstadoLocal) {
  const cfg: Record<EstadoLocal, { cls: string }> = {
    'Creado':     { cls: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900/30' },
    'En Camino':  { cls: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-500 dark:bg-amber-950/30 dark:border-amber-900/30' },
    'En Planta':  { cls: 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30 dark:border-purple-900/30' },
    'Finalizado': { cls: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900/30' },
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${cfg[estado]?.cls ?? ''}`}>
      {estado}
    </span>
  );
}

// ── componente ────────────────────────────────────────────────────────────────

export default function DetalleViaje() {
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();

  const [viaje,      setViaje]      = useState<Viaje | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [modoEdicion,setModoEdicion]= useState(false);
  const [pesoInput,  setPesoInput]  = useState('');

  // campos editables
  const [editForm, setEditForm] = useState({ horaSalida: '', observaciones: '' });

  // ── carga ─────────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await viajesApi.ver(Number(id));
      setViaje(res.data);
      const v = res.data as any;
      setEditForm({
        horaSalida:   String(v.hora_salida ?? '').slice(0, 5),
        observaciones: String(v.observaciones ?? ''),
      });
    } catch { navigate('/viajes'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── guardar edición ───────────────────────────────────────────────────────
  const guardarEdicion = async () => {
    if (!viaje) return;
    setProcesando(true);
    try {
      await viajesApi.editar(viaje.id, {
        hora_salida:   editForm.horaSalida || undefined,
        observaciones: editForm.observaciones || null,
      });
      toast.success('Viaje actualizado');
      setModoEdicion(false);
      await cargar();
    } catch (e: any) { toast.error(e?.message ?? 'Error al guardar cambios'); }
    finally { setProcesando(false); }
  };

  // ── aprobar reconteos (aprueba todos los detalles pendientes) ─────────────
  const aprobarReconteos = async () => {
    if (!viaje) return;
    setProcesando(true);
    try {
      let autoDespachado = false;
      for (const det of (viaje.detalles ?? [])) {
        if (!det.reconteo_aprobado) {
          const r = await viajesApi.aprobarReconteo(viaje.id, det.id);
          if (r.data.auto_despachado) autoDespachado = true;
        }
      }
      toast.success(autoDespachado ? 'Reconteos aprobados — viaje en camino' : 'Reconteos aprobados');
      await cargar();
    } catch (e: any) { toast.error(e?.message ?? 'Error al aprobar reconteos'); }
    finally { setProcesando(false); }
  };

  // ── llegada a planta ──────────────────────────────────────────────────────
  const registrarLlegada = async () => {
    if (!viaje) return;
    const peso = parseFloat(pesoInput);
    if (!peso || isNaN(peso)) { toast.error('Ingresa el peso del viaje (báscula)'); return; }
    setProcesando(true);
    try {
      await viajesApi.llegadaPlanta(viaje.id, peso);
      toast.success('Llegada a planta registrada');
      setPesoInput('');
      await cargar();
    } catch (e: any) { toast.error(e?.message ?? 'Error al registrar llegada'); }
    finally { setProcesando(false); }
  };

  // ── finalizar ─────────────────────────────────────────────────────────────
  const finalizar = async () => {
    if (!viaje) return;
    if (!confirm('¿Finalizar el viaje? Esta acción es irreversible.')) return;
    setProcesando(true);
    try {
      await viajesApi.finalizar(viaje.id);
      toast.success('Viaje finalizado');
      navigate('/viajes');
    } catch (e: any) { toast.error(e?.message ?? 'Error al finalizar viaje'); }
    finally { setProcesando(false); }
  };

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando viaje...</div>;
  }
  if (!viaje) return null;

  const rv = viaje as any;
  const estadoLocal: EstadoLocal = ESTADO_MAP[viaje.estado] ?? 'Creado';
  const conductor    = String(rv.nombre_conductor ?? '');
  const placa        = String(rv.placa_vehiculo ?? '');
  const extractora   = strField(rv.extractora);
  const empresa      = strField(rv.empresa ?? rv.empresa_transportadora);
  const detalles     = viaje.detalles ?? [];
  const todosAprobados = detalles.length > 0 && detalles.every(d => d.reconteo_aprobado);
  const algunoPendiente = detalles.some(d => !d.reconteo_aprobado);

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/viajes')}
            className="h-12 w-12 rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{rv.remision ?? `Viaje #${viaje.id}`}</h1>
              {getEstadoBadge(estadoLocal)}
            </div>
            <p className="text-muted-foreground mt-1">
              {rv.fecha_viaje ? new Date(rv.fecha_viaje + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {estadoLocal === 'Creado' && !modoEdicion && (
            <Button variant="outline" onClick={() => setModoEdicion(true)} className="gap-2">
              <Edit className="h-4 w-4" /> Editar
            </Button>
          )}
          {modoEdicion && (
            <>
              <Button variant="outline" onClick={() => setModoEdicion(false)} disabled={procesando} className="gap-2">
                <X className="h-4 w-4" /> Cancelar
              </Button>
              <Button onClick={guardarEdicion} disabled={procesando} className="gap-2">
                <Save className="h-4 w-4" /> {procesando ? 'Guardando...' : 'Guardar'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* Info del viaje */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-subtle border-border">
            <CardHeader><CardTitle className="text-base">Información del Viaje</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Conductor</Label>
                <p className="font-medium text-foreground">{conductor}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Placa</Label>
                <p className="font-medium text-foreground">{placa}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Empresa Transportadora</Label>
                <p className="font-medium text-foreground">{empresa || '—'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Extractora Destino</Label>
                <p className="font-medium text-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />{extractora}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hora de Salida</Label>
                {modoEdicion ? (
                  <Input type="time" value={editForm.horaSalida}
                    onChange={e => setEditForm(p => ({ ...p, horaSalida: e.target.value }))} />
                ) : (
                  <p className="font-medium text-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {String(rv.hora_salida ?? '').slice(0, 5) || '—'}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Peso en Báscula</Label>
                <p className="font-medium text-foreground">
                  {rv.peso_viaje ? `${parseFloat(String(rv.peso_viaje)).toLocaleString()} kg` : '—'}
                </p>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Observaciones</Label>
                {modoEdicion ? (
                  <textarea
                    value={editForm.observaciones}
                    onChange={e => setEditForm(p => ({ ...p, observaciones: e.target.value }))}
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ) : (
                  <p className="text-sm text-foreground">{rv.observaciones || '—'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cosechas del viaje */}
          <Card className="glass-subtle border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Cosechas Enlazadas</CardTitle>
                <span className="text-sm text-muted-foreground">{detalles.length} cosecha{detalles.length !== 1 ? 's' : ''}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {detalles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay cosechas enlazadas</p>
              ) : detalles.map(det => {
                const c = det.cosecha;
                return (
                  <div key={det.id} className={`flex items-center justify-between p-3 rounded-lg border ${det.reconteo_aprobado ? 'border-success/30 bg-success/5' : 'border-border bg-muted/20'}`}>
                    <div className="flex items-center gap-3">
                      <Package className={`h-4 w-4 ${det.reconteo_aprobado ? 'text-success' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="text-sm font-medium">{c?.lote?.nombre ?? `Cosecha #${det.cosecha_id}`}</p>
                        {c?.sublote && <p className="text-xs text-muted-foreground">{c.sublote.nombre}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {c?.gajos_reconteo ?? c?.gajos_reportados ?? '—'} gajos
                      </span>
                      {c?.peso_confirmado && (
                        <span className="text-foreground font-medium">
                          {parseFloat(String(c.peso_confirmado)).toLocaleString()} kg
                        </span>
                      )}
                      {det.reconteo_aprobado
                        ? <CheckCircle className="h-4 w-4 text-success" />
                        : <Clock className="h-4 w-4 text-amber-500" />
                      }
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral: acciones */}
        <div className="space-y-4">

          {/* Línea de tiempo */}
          <Card className="glass-subtle border-border">
            <CardHeader><CardTitle className="text-base">Trazabilidad</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: 'Creado',       ts: rv.created_at,       done: true },
                { label: 'En Camino',    ts: rv.despachado_at,     done: !!rv.despachado_at },
                { label: 'En Planta',    ts: rv.llegada_planta_at, done: !!rv.llegada_planta_at },
                { label: 'Finalizado',   ts: rv.finalizado_at,     done: !!rv.finalizado_at },
              ].map(({ label, ts, done }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full border-2 ${done ? 'bg-success border-success' : 'bg-background border-border'}`} />
                  <div className="flex-1">
                    <p className={`font-medium ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
                    {ts && <p className="text-xs text-muted-foreground">{new Date(ts).toLocaleString('es-CO')}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Acciones según estado */}
          {estadoLocal === 'Creado' && detalles.length > 0 && (
            <Card className="glass-subtle border-border">
              <CardHeader><CardTitle className="text-base">Aprobar Reconteo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {algunoPendiente
                    ? `${detalles.filter(d => !d.reconteo_aprobado).length} detalle(s) pendiente(s) de aprobación.`
                    : 'Todos los detalles aprobados.'}
                </p>
                <Button
                  onClick={aprobarReconteos}
                  disabled={procesando || todosAprobados}
                  className="w-full gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {procesando ? 'Procesando...' : 'Aprobar y Despachar'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Si este es el último detalle pendiente, el viaje pasará automáticamente a <strong>En Camino</strong>.
                </p>
              </CardContent>
            </Card>
          )}

          {estadoLocal === 'En Camino' && (
            <Card className="glass-subtle border-border">
              <CardHeader><CardTitle className="text-base">Registrar Llegada a Planta</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-2">
                    <Weight className="h-3.5 w-3.5" /> Peso en báscula (kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 12500.50"
                    value={pesoInput}
                    onChange={e => setPesoInput(e.target.value)}
                  />
                </div>
                <Button onClick={registrarLlegada} disabled={procesando || !pesoInput} className="w-full gap-2">
                  <Truck className="h-4 w-4" />
                  {procesando ? 'Procesando...' : 'Confirmar Llegada'}
                </Button>
              </CardContent>
            </Card>
          )}

          {estadoLocal === 'En Planta' && (
            <Card className="glass-subtle border-border">
              <CardHeader><CardTitle className="text-base">Finalizar Viaje</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Al finalizar se calculará el promedio kg/gajo y el viaje quedará cerrado.
                </p>
                {rv.peso_viaje && (
                  <div className="flex items-center gap-2 text-sm">
                    <Scale className="h-4 w-4 text-success" />
                    <span>Peso registrado: <strong>{parseFloat(String(rv.peso_viaje)).toLocaleString()} kg</strong></span>
                  </div>
                )}
                <Button onClick={finalizar} disabled={procesando} className="w-full gap-2 bg-success hover:bg-success/90 text-white">
                  <CheckCircle className="h-4 w-4" />
                  {procesando ? 'Finalizando...' : 'Finalizar Viaje'}
                </Button>
              </CardContent>
            </Card>
          )}

          {estadoLocal === 'Creado' && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate(`/viajes/${viaje.id}/conteo`)}
            >
              <Package className="h-4 w-4" /> Ir a Conteo de Cosecha
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}