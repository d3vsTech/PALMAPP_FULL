import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, Truck, MapPin, Package, Scale, Calendar, Clock,
  Loader2, Check, Calculator, Leaf, FileText, CheckCircle,
} from 'lucide-react';
import {
  viajesApi,
  parseFechaAPI,
  type Viaje,
  type EstadoViajeApi,
} from '../../../api/viajes';
import { toast } from 'sonner';

/**
 * DetalleViaje — pantalla que ve el viaje en cualquier estado
 *
 * - CREADO: redirige a /viajes/:id/conteo (no edita aquí)
 * - EN_CAMINO: permite registrar "Llegada a Planta" (peso_viaje)
 * - EN_PLANTA: permite "Finalizar Viaje"
 * - FINALIZADO: solo lectura
 */

function EstadoBadgeLarge({ estado }: { estado: EstadoViajeApi }) {
  const cfg: Record<EstadoViajeApi, { label: string; icon: any; cls: string }> = {
    CREADO:     { label: 'Creado',      icon: FileText,    cls: 'bg-muted text-muted-foreground border-muted' },
    EN_CAMINO:  { label: 'En Camino',   icon: Truck,       cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
    EN_PLANTA:  { label: 'En Planta',   icon: MapPin,      cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
    FINALIZADO: { label: 'Finalizado',  icon: CheckCircle, cls: 'bg-success/10 text-success border-success/30' },
  };
  const { label, icon: Icon, cls } = cfg[estado];
  return (
    <Badge variant="outline" className={`${cls} px-3 py-1 text-sm`}>
      <Icon className="h-4 w-4 mr-1.5" /> {label}
    </Badge>
  );
}

export default function DetalleViaje() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Modales de transición
  const [modalLlegada, setModalLlegada] = useState(false);
  const [pesoLlegada, setPesoLlegada] = useState<string>('');
  const [procesando, setProcesando] = useState(false);

  const cargarViaje = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorCarga(null);
    try {
      const res = await viajesApi.ver(Number(id));
      if (!res?.data) throw new Error('El servidor no devolvió datos del viaje');
      setViaje(res.data);
    } catch (err) {
      console.error('[DetalleViaje] Error al cargar:', err);
      setErrorCarga(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargarViaje(); }, [cargarViaje]);

  // Si es CREADO, redirigir al conteo
  useEffect(() => {
    if (viaje && viaje.estado === 'CREADO') {
      navigate(`/viajes/${viaje.id}/conteo`, { replace: true });
    }
  }, [viaje, navigate]);

  // ── Llegada a planta (EN_CAMINO → EN_PLANTA) ────────────────────
  const registrarLlegada = async () => {
    if (!viaje) return;
    const peso = parseFloat(pesoLlegada);
    if (!peso || peso <= 0) {
      toast.error('Ingresa un peso válido');
      return;
    }
    setProcesando(true);
    try {
      await viajesApi.llegadaPlanta(viaje.id, peso);
      toast.success('Llegada a planta registrada');
      setModalLlegada(false);
      setPesoLlegada('');
      await cargarViaje();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar llegada');
    } finally {
      setProcesando(false);
    }
  };

  // ── Finalizar viaje (EN_PLANTA → FINALIZADO) ────────────────────
  const finalizarViaje = async () => {
    if (!viaje) return;
    if (!window.confirm('¿Finalizar este viaje? Esta acción no se puede deshacer.')) return;
    setProcesando(true);
    try {
      await viajesApi.finalizar(viaje.id);
      toast.success('Viaje finalizado exitosamente');
      await cargarViaje();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al finalizar viaje');
    } finally {
      setProcesando(false);
    }
  };

  // Early returns
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
          <p className="text-sm text-muted-foreground mb-4">
            {errorCarga ?? 'El servidor no devolvió datos para este viaje.'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => cargarViaje()}>Reintentar</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/viajes')}>Volver al listado</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            ID del viaje: <code className="bg-muted px-1 rounded">{id}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const fechaViaje    = parseFechaAPI(viaje.fecha_viaje);
  const despachadoAt  = parseFechaAPI(viaje.despachado_at);
  const llegadaAt     = parseFechaAPI(viaje.llegada_planta_at);
  const finalizadoAt  = parseFechaAPI(viaje.finalizado_at);
  const peso          = viaje.peso_viaje ? parseFloat(String(viaje.peso_viaje)) : null;
  const detalles      = viaje.detalles ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/viajes')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver a Viajes
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detalle de Viaje</h1>
            <p className="text-muted-foreground mt-1">Información completa y seguimiento</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Remisión</p>
            <p className="text-2xl font-bold text-primary">{viaje.remision}</p>
            <div className="mt-2"><EstadoBadgeLarge estado={viaje.estado} /></div>
          </div>
        </div>
      </div>

      {/* Timeline / Estado del viaje */}
      <Card className="glass-subtle border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Seguimiento del Viaje</CardTitle>
              <p className="text-sm text-muted-foreground">Estados y tiempos</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-medium">Creado</span>
              </div>
              <p className="text-sm font-semibold">
                {fechaViaje ? fechaViaje.toLocaleDateString('es-CO') : '—'}
                {' '}
                <span className="text-xs text-muted-foreground">
                  {(viaje.hora_salida ?? '').substring(0, 5)}
                </span>
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${despachadoAt ? 'bg-amber-500/5 border-amber-500/30' : 'bg-muted/20 border-border opacity-50'}`}>
              <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span className="text-xs font-medium">Despachado</span>
              </div>
              <p className="text-sm font-semibold">
                {despachadoAt ? despachadoAt.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${llegadaAt ? 'bg-blue-500/5 border-blue-500/30' : 'bg-muted/20 border-border opacity-50'}`}>
              <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-xs font-medium">Llegada a Planta</span>
              </div>
              <p className="text-sm font-semibold">
                {llegadaAt ? llegadaAt.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${finalizadoAt ? 'bg-success/5 border-success/30' : 'bg-muted/20 border-border opacity-50'}`}>
              <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Finalizado</span>
              </div>
              <p className="text-sm font-semibold">
                {finalizadoAt ? finalizadoAt.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos del viaje */}
      <Card className="glass-subtle border-border">
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Fecha del viaje</span>
              </div>
              <p className="text-sm font-medium">
                {fechaViaje ? fechaViaje.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Hora salida</span>
              </div>
              <p className="text-sm font-medium">{(viaje.hora_salida ?? '').substring(0, 5) || '—'}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Truck className="h-4 w-4" />
                <span className="text-xs">Vehículo / Conductor</span>
              </div>
              <p className="text-sm font-medium">{viaje.placa_vehiculo}</p>
              <p className="text-xs text-muted-foreground">{viaje.nombre_conductor}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                <span className="text-xs">Extractora</span>
              </div>
              <p className="text-sm font-medium">{viaje.extractora?.razon_social ?? '—'}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs">Gajos totales</span>
              </div>
              <p className="text-sm font-medium">
                {(viaje.cantidad_gajos_total ?? 0).toLocaleString()}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Scale className="h-4 w-4" />
                <span className="text-xs">Peso del viaje</span>
              </div>
              <p className="text-sm font-medium">
                {peso ? `${peso.toLocaleString()} kg` : '—'}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Leaf className="h-4 w-4" />
                <span className="text-xs">Tipo</span>
              </div>
              <p className="text-sm font-medium">
                {viaje.es_homogeneo ? 'Homogéneo' : 'No homogéneo'}
              </p>
            </div>
            {viaje.observaciones && (
              <div className="md:col-span-2 lg:col-span-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs">Observaciones</span>
                </div>
                <p className="text-sm">{viaje.observaciones}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cosechas del viaje */}
      <Card className="glass-subtle border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
              <Leaf className="h-6 w-6 text-success" />
            </div>
            <div>
              <CardTitle>Cosechas ({detalles.length})</CardTitle>
              <p className="text-sm text-muted-foreground">Cosechas incluidas en este viaje</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {detalles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay cosechas registradas</p>
          ) : (
            <div className="space-y-3">
              {detalles.map((d) => (
                <div key={d.id}
                  className="p-4 rounded-lg bg-muted/20 border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {d.cosecha?.lote?.nombre ?? '—'} · {d.cosecha?.sublote?.nombre ?? '—'}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Gajos reportados: <strong className="text-foreground">{d.cosecha?.gajos_reportados ?? 0}</strong></span>
                        {d.cosecha?.gajos_reconteo !== undefined && d.cosecha?.gajos_reconteo !== null && (
                          <span>Reconteo: <strong className="text-foreground">{d.cosecha.gajos_reconteo}</strong></span>
                        )}
                        {d.cosecha?.peso_confirmado && (
                          <span>Peso: <strong className="text-foreground">{parseFloat(d.cosecha.peso_confirmado).toLocaleString()} kg</strong></span>
                        )}
                      </div>
                    </div>
                    {d.reconteo_aprobado && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/30">
                        <Check className="h-3.5 w-3.5" /> Aprobado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones según estado */}
      <div className="flex justify-end gap-3">
        {viaje.estado === 'EN_CAMINO' && (
          <Button
            onClick={() => setModalLlegada(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={procesando}
          >
            <MapPin className="h-4 w-4" /> Registrar Llegada a Planta
          </Button>
        )}
        {viaje.estado === 'EN_PLANTA' && (
          <Button
            onClick={finalizarViaje}
            className="gap-2 bg-success hover:bg-success/90"
            disabled={procesando}
          >
            {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Finalizar Viaje
          </Button>
        )}
      </div>

      {/* Modal Llegada a Planta */}
      {modalLlegada && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Registrar Llegada a Planta</CardTitle>
              <p className="text-sm text-muted-foreground">Ingresa el peso real del viaje</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Peso del viaje (kg) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pesoLlegada}
                  onChange={(e) => setPesoLlegada(e.target.value)}
                  placeholder="Ej: 12500.50"
                  autoFocus
                />
              </div>
            </CardContent>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setModalLlegada(false); setPesoLlegada(''); }} disabled={procesando}>
                Cancelar
              </Button>
              <Button onClick={registrarLlegada} disabled={procesando || !pesoLlegada}>
                {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Confirmar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}