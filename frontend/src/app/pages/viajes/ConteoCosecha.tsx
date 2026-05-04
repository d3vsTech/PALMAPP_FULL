import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowLeft, ArrowRight, Check, Truck, Leaf, Plus, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  viajesApi, strField,
  type Viaje, type ViajeDetalle, type OperacionDisponible, type CosechaLibre,
} from '../../../api/viajes';

const ETAPAS = [
  { numero: 1, nombre: 'Info. Viaje' },
  { numero: 2, nombre: 'Cosecha' },
];

/** Cosecha guardada en el viaje (mapea a viaje_detalle del backend) */
interface CosechaConteo {
  id: string;            // viaje_detalle.id (o tmp para nuevas)
  detalleId?: number;    // backend
  cosechaId: number;     // registro_cosecha.id
  planillaId: string;    // operacion.id
  planillaNombre: string;
  loteName: string;
  subloteName: string;
  gajos: number;         // gajos_reportados
  reconteoGajos: number;
  pesoKg: number;
  cuadrillaCount: number;
  aprobado: boolean;
}

/** Cosecha en edición */
interface CosechaEnEdicion {
  cosechaId: number | null;
  planillaId: string;
  cuadrillaReconteo: string; // = cosechaId del select de "cuadrilla" (cosecha)
  loteName: string;
  subloteName: string;
  gajos: number;
  reconteoGajos: number;
  pesoKg: number;
  cuadrillaCount: number;
  // Edición de un detalle ya existente
  editandoDetalleId?: number;
}

export default function ConteoCosecha() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Datos del viaje
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [cosechaToDelete, setCosechaToDelete] = useState<CosechaConteo | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // Wizard
  const [etapaActual, setEtapaActual] = useState(1);

  // Cosechas guardadas
  const [cosechas, setCosechas] = useState<CosechaConteo[]>([]);

  // Cosecha en edición
  const [cosechaEnEdicion, setCosechaEnEdicion] = useState<CosechaEnEdicion | null>(null);

  // Catálogos del API
  const [operaciones, setOperaciones] = useState<OperacionDisponible[]>([]);
  const [cosechasLibres, setCosechasLibres] = useState<CosechaLibre[]>([]);
  const [cargandoOps, setCargandoOps] = useState(false);
  const [cargandoCosechas, setCargandoCosechas] = useState(false);

  // ── mapeo API → local
  const mapDetalle = (d: ViajeDetalle, planillaNombreById: Map<number, string>): CosechaConteo => ({
    id: String(d.id),
    detalleId: d.id,
    cosechaId: d.cosecha_id,
    planillaId: '',
    planillaNombre: '',
    loteName: d.cosecha?.lote?.nombre ?? '—',
    subloteName: d.cosecha?.sublote?.nombre ?? '',
    gajos: d.cosecha?.gajos_reportados ?? 0,
    reconteoGajos: d.cosecha?.gajos_reconteo ?? 0,
    pesoKg: d.cosecha?.peso_confirmado ? parseFloat(String(d.cosecha.peso_confirmado)) : 0,
    cuadrillaCount: d.cosecha?.cuadrilla_count ?? 0,
    aprobado: d.reconteo_aprobado,
  });

  // ── carga del viaje
  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await viajesApi.ver(Number(id));
      setViaje(res.data);
      const planillaMap = new Map<number, string>();
      setCosechas((res.data.detalles ?? []).map(d => mapDetalle(d, planillaMap)));
    } catch { navigate('/viajes'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── al iniciar agregar/editar, cargar operaciones disponibles
  const cargarOperaciones = async () => {
    setCargandoOps(true);
    try {
      const r = await viajesApi.operacionesDisponibles();
      setOperaciones(r.data ?? []);
    } catch { /* ignore */ }
    finally { setCargandoOps(false); }
  };

  // ── al elegir planilla, cargar cosechas libres
  useEffect(() => {
    if (!cosechaEnEdicion?.planillaId) { setCosechasLibres([]); return; }
    setCargandoCosechas(true);
    viajesApi.cosechasLibresDeOperacion(Number(cosechaEnEdicion.planillaId))
      .then(r => setCosechasLibres(r.data ?? []))
      .catch(() => setCosechasLibres([]))
      .finally(() => setCargandoCosechas(false));
  }, [cosechaEnEdicion?.planillaId]);

  // ── handlers
  const siguienteEtapa = () => etapaActual < ETAPAS.length && setEtapaActual(etapaActual + 1);
  const etapaAnterior  = () => etapaActual > 1 && setEtapaActual(etapaActual - 1);
  const irAEtapa = (n: number) => setEtapaActual(n);

  const agregarCosecha = () => {
    setCosechaEnEdicion({
      cosechaId: null,
      planillaId: '',
      cuadrillaReconteo: '',
      loteName: '',
      subloteName: '',
      gajos: 0,
      reconteoGajos: 0,
      pesoKg: 0,
      cuadrillaCount: 0,
    });
    cargarOperaciones();
  };

  const cancelarCosecha = () => setCosechaEnEdicion(null);

  /** Al elegir una "cuadrilla" (que en este API es realmente una cosecha) */
  const handleCuadrillaChange = (cosechaId: string) => {
    if (!cosechaEnEdicion) return;
    const c = cosechasLibres.find(x => String(x.id) === cosechaId);
    if (!c) {
      setCosechaEnEdicion({ ...cosechaEnEdicion, cuadrillaReconteo: cosechaId });
      return;
    }
    setCosechaEnEdicion({
      ...cosechaEnEdicion,
      cosechaId: c.id,
      cuadrillaReconteo: cosechaId,
      loteName: c.lote?.nombre ?? '—',
      subloteName: c.sublote?.nombre ?? '',
      gajos: c.gajos_reportados ?? 0,
      cuadrillaCount: c.cuadrilla_count ?? 0,
    });
  };

  const guardarCosecha = async () => {
    if (!viaje || !cosechaEnEdicion) return;
    if (!cosechaEnEdicion.reconteoGajos || cosechaEnEdicion.reconteoGajos <= 0) {
      toast.error('Ingresa el reconteo de gajos');
      return;
    }
    setProcesando(true);
    try {
      let detalleId = cosechaEnEdicion.editandoDetalleId;
      // Crear detalle si es nuevo
      if (!detalleId) {
        if (!cosechaEnEdicion.cosechaId) {
          toast.error('Selecciona una cosecha');
          setProcesando(false);
          return;
        }
        const r = await viajesApi.agregarDetalle(viaje.id, cosechaEnEdicion.cosechaId);
        detalleId = (r.data as any)?.id;
      }
      if (!detalleId) {
        toast.error('No se pudo identificar el detalle');
        setProcesando(false);
        return;
      }
      // Guardar reconteo
      await viajesApi.hidratarReconteo(viaje.id, detalleId, {
        gajos_reconteo: cosechaEnEdicion.reconteoGajos,
        peso_confirmado: cosechaEnEdicion.pesoKg > 0 ? cosechaEnEdicion.pesoKg : undefined,
      });
      toast.success('Cosecha guardada');
      setCosechaEnEdicion(null);
      await cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar la cosecha');
    } finally {
      setProcesando(false);
    }
  };

  const eliminarCosecha = (c: CosechaConteo) => {
    if (!viaje || !c.detalleId) return;
    if (c.aprobado) { toast.error('No se puede eliminar una cosecha aprobada'); return; }
    setCosechaToDelete(c);
  };

  const confirmarEliminarCosecha = async () => {
    if (!viaje || !cosechaToDelete?.detalleId) return;
    const c = cosechaToDelete;
    setCosechaToDelete(null);
    try {
      await viajesApi.eliminarDetalle(viaje.id, c.detalleId!);
      toast.success('Cosecha eliminada');
      await cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al eliminar la cosecha');
    }
  };

  const finalizarConteo = async () => {
    if (!viaje) { return; }
    if (cosechas.length === 0) { toast.error('Agrega al menos una cosecha'); return; }
    const pendientes = cosechas.filter(c => !c.aprobado);
    if (pendientes.some(c => !c.reconteoGajos || c.reconteoGajos <= 0)) {
      toast.error('Todas las cosechas deben tener reconteo antes de aprobar');
      return;
    }
    setProcesando(true);
    try {
      for (const c of pendientes) {
        if (c.detalleId) {
          const r = await viajesApi.aprobarReconteo(viaje.id, c.detalleId);
          if (r.data.auto_despachado) {
            toast.success('Conteo registrado exitosamente', {
              description: 'El viaje ahora está en camino hacia la extractora.',
            });
            navigate('/viajes');
            return;
          }
        }
      }
      toast.success('Conteo registrado exitosamente', {
        description: 'El viaje ahora está en camino hacia la extractora.',
      });
      navigate('/viajes');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al finalizar el conteo');
    } finally {
      setProcesando(false);
    }
  };

  // ── render
  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>;
  }
  if (!viaje) return null;

  const v = viaje as any;

  /** Formatea 'YYYY-MM-DD' (o ISO completo) sin caer en "Invalid Date". */
  const formatearFechaViaje = (raw?: string | null): string => {
    if (!raw || typeof raw !== 'string') return '—';
    // Tomar solo los primeros 10 chars (YYYY-MM-DD) y validar formato
    const ymd = raw.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '—';
    const d = new Date(ymd + 'T12:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CO');
  };
  const fechaFmt = formatearFechaViaje(v.fecha_viaje);
  const placa      = String(v.placa_vehiculo ?? '');
  const conductor  = String(v.nombre_conductor ?? '');
  const transporte = strField(v.empresa ?? v.empresa_transportadora) || '—';
  const extractora = strField(v.extractora) || '—';
  const horaSalida = String(v.hora_salida ?? '').slice(0, 5);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/viajes')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Viajes
        </Button>
        <h1 className="text-4xl font-bold text-foreground">Conteo de Cosecha</h1>
        <p className="text-muted-foreground mt-1">Registra las cosechas del viaje</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: Wizard (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stepper horizontal */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {ETAPAS.map((etapa, index) => {
                  const estaCompleta = etapaActual > etapa.numero;
                  const estaActiva = etapaActual === etapa.numero;
                  return (
                    <div key={etapa.numero} className="flex items-center" style={{ flex: index < ETAPAS.length - 1 ? 1 : 'none' }}>
                      <button
                        onClick={() => irAEtapa(etapa.numero)}
                        className={`flex flex-col items-center gap-2 ${estaActiva || estaCompleta ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                        disabled={!estaActiva && !estaCompleta}
                      >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                          estaCompleta ? 'bg-primary border-primary text-white'
                          : estaActiva ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted border-border text-muted-foreground'
                        }`}>
                          {estaCompleta ? <Check className="h-5 w-5" /> : <span className="font-bold">{etapa.numero}</span>}
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-semibold whitespace-nowrap ${
                            estaActiva || estaCompleta ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {etapa.nombre}
                          </div>
                        </div>
                      </button>
                      {index < ETAPAS.length - 1 && (
                        <div className="flex-1 h-0.5 mx-3 bg-border relative min-w-[20px]">
                          <div className={`absolute inset-0 bg-primary transition-all ${estaCompleta ? 'w-full' : 'w-0'}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Contenido de las etapas */}
          <div className="space-y-6">
            {/* ETAPA 1: INFORMACIÓN DEL VIAJE */}
            {etapaActual === 1 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Información del Viaje</CardTitle>
                      <p className="text-sm text-muted-foreground">Datos del viaje registrado</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fecha del Viaje</Label>
                      <Input value={fechaFmt} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Placa del Vehículo</Label>
                      <Input value={placa} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Conductor</Label>
                      <Input value={conductor} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Transportador</Label>
                      <Input value={transporte} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Extractora Destino</Label>
                      <Input value={extractora} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora de Salida</Label>
                      <Input value={horaSalida} disabled />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 2: COSECHA */}
            {etapaActual === 2 && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={agregarCosecha} className="gap-2" disabled={!!cosechaEnEdicion}>
                    <Plus className="h-4 w-4" />
                    Agregar Cosecha
                  </Button>
                </div>

                {/* Formulario de edición */}
                {cosechaEnEdicion && (
                  <Card className="border-primary/50 shadow-lg">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Leaf className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle>Cosecha</CardTitle>
                          <p className="text-sm text-muted-foreground">Registra las cosechas del viaje</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Planilla / Cosecha */}
                        <div className="space-y-2 md:col-span-2">
                          <Label>Planilla / Cosecha</Label>
                          <Select
                            value={cosechaEnEdicion.planillaId}
                            onValueChange={(value) => {
                              setCosechaEnEdicion({
                                ...cosechaEnEdicion, planillaId: value, cuadrillaReconteo: '',
                                cosechaId: null, loteName: '', subloteName: '', gajos: 0, cuadrillaCount: 0,
                              });
                            }}
                            disabled={cargandoOps}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={cargandoOps ? 'Cargando planillas...' : 'Seleccionar planilla...'} />
                            </SelectTrigger>
                            <SelectContent>
                              {operaciones.map((op) => (
                                <SelectItem key={op.id} value={String(op.id)}>
                                  Planilla {op.fecha} — {op.cosechas_disponibles_count} cosecha{op.cosechas_disponibles_count !== 1 ? 's' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Cuadrilla Reconteo (= cosecha del backend) */}
                        <div className="space-y-2 md:col-span-2">
                          <Label>Cuadrilla Reconteo</Label>
                          <Select
                            value={cosechaEnEdicion.cuadrillaReconteo}
                            onValueChange={handleCuadrillaChange}
                            disabled={!cosechaEnEdicion.planillaId || cargandoCosechas}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !cosechaEnEdicion.planillaId
                                  ? 'Selecciona una planilla primero'
                                  : cargandoCosechas
                                  ? 'Cargando cuadrillas...'
                                  : cosechasLibres.length === 0
                                  ? 'No hay cuadrillas disponibles'
                                  : 'Seleccionar cuadrilla...'
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {cosechasLibres.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  Cuadrilla — {c.lote?.nombre ?? '—'}{c.sublote ? ` · ${c.sublote.nombre}` : ''} ({c.gajos_reportados ?? 0} gajos)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Colaboradores */}
                        <div className="space-y-2 md:col-span-2">
                          <Label>Colaboradores</Label>
                          <div className="flex flex-wrap gap-2">
                            {cosechaEnEdicion.cuadrillaCount > 0 ? (
                              <Badge variant="outline" className="text-xs">
                                {cosechaEnEdicion.cuadrillaCount} colaborador{cosechaEnEdicion.cuadrillaCount !== 1 ? 'es' : ''}
                              </Badge>
                            ) : (
                              <p className="text-sm text-muted-foreground">No hay colaboradores</p>
                            )}
                          </div>
                        </div>

                        {/* Lote */}
                        <div className="space-y-2">
                          <Label>Lote</Label>
                          <Input value={cosechaEnEdicion.loteName || 'Sin lote'} disabled />
                        </div>

                        {/* Sublote */}
                        <div className="space-y-2">
                          <Label>Sublote</Label>
                          <Input value={cosechaEnEdicion.subloteName || 'Sin sublote'} disabled />
                        </div>

                        {/* Número de Gajos */}
                        <div className="space-y-2">
                          <Label>Número de Gajos</Label>
                          <Input type="number" value={cosechaEnEdicion.gajos || ''} disabled />
                        </div>

                        {/* Reconteo de Gajos */}
                        <div className="space-y-2">
                          <Label>Reconteo de Gajos</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={cosechaEnEdicion.reconteoGajos || ''}
                            onChange={(e) => {
                              setCosechaEnEdicion({
                                ...cosechaEnEdicion,
                                reconteoGajos: parseInt(e.target.value) || 0,
                              });
                            }}
                          />
                        </div>

                        {/* Peso en kg */}
                        <div className="space-y-2 md:col-span-2">
                          <Label>Peso en kg (opcional)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={cosechaEnEdicion.pesoKg || ''}
                            onChange={(e) => {
                              setCosechaEnEdicion({
                                ...cosechaEnEdicion,
                                pesoKg: parseInt(e.target.value) || 0,
                              });
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={cancelarCosecha} disabled={procesando}>
                          Cancelar
                        </Button>
                        <Button onClick={guardarCosecha} disabled={procesando} className="gap-2">
                          <Check className="h-4 w-4" />
                          {procesando ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lista de cosechas guardadas */}
                {cosechas.map((cosecha) => (
                  <Card key={cosecha.id} className="border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Icon + Lote/Sublote header */}
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                            <Leaf className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{cosecha.loteName}</h4>
                            <p className="text-xs text-muted-foreground">
                              {cosecha.cuadrillaCount > 0 ? `${cosecha.cuadrillaCount} colaboradores` : 'Sin cuadrilla'}
                            </p>
                          </div>
                        </div>

                        {/* Lote/Sublote */}
                        <div className="text-center shrink-0">
                          <p className="text-xs text-muted-foreground">Lote</p>
                          <p className="font-semibold text-sm">{cosecha.loteName || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{cosecha.subloteName || 'N/A'}</p>
                        </div>

                        {/* Gajos */}
                        <div className="text-center shrink-0">
                          <p className="text-xs text-muted-foreground">Gajos</p>
                          <p className="font-bold text-lg">{cosecha.gajos}</p>
                        </div>

                        {/* Reconteo */}
                        <div className="text-center shrink-0">
                          <p className="text-xs text-muted-foreground">Reconteo</p>
                          <p className="font-bold text-lg text-primary">{cosecha.reconteoGajos}</p>
                        </div>

                        {/* Peso */}
                        {cosecha.pesoKg > 0 && (
                          <div className="text-center shrink-0">
                            <p className="text-xs text-muted-foreground">Peso</p>
                            <p className="font-semibold text-sm">{cosecha.pesoKg} kg</p>
                          </div>
                        )}

                        {/* Botón eliminar */}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => eliminarCosecha(cosecha)}
                          disabled={cosecha.aprobado || procesando}
                          className="text-destructive hover:text-destructive shrink-0"
                          title={cosecha.aprobado ? 'No se puede eliminar una cosecha aprobada' : 'Eliminar'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {cosechas.length === 0 && !cosechaEnEdicion && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Leaf className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No hay cosechas registradas</p>
                    <p className="text-sm">Haz clic en "Agregar Cosecha" para crear una</p>
                  </div>
                )}
              </div>
            )}

            {/* Botones de navegación */}
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={etapaAnterior} disabled={etapaActual === 1} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex gap-2">
                {etapaActual < ETAPAS.length ? (
                  <Button onClick={siguienteEtapa} className="gap-2">
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={finalizarConteo}
                    disabled={procesando || cosechas.length === 0}
                    className="gap-2 bg-success hover:bg-success/90"
                  >
                    <Check className="h-4 w-4" />
                    {procesando ? 'Procesando...' : 'Finalizar Conteo'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Panel Resumen sticky (1/3) */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Progreso */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-semibold">{etapaActual} de {ETAPAS.length}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(etapaActual / ETAPAS.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Información del Viaje */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Información del Viaje
                  </h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Placa</span>
                      <span className="font-semibold text-sm">{placa || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Conductor</span>
                      <span className="font-semibold text-sm truncate ml-2 max-w-[140px]" title={conductor}>
                        {conductor || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Extractora</span>
                      <span className="font-semibold text-sm truncate ml-2 max-w-[140px]" title={extractora}>
                        {extractora}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Resumen de Cosechas */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Cosechas
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Registradas</span>
                    <span className="font-semibold text-sm">{cosechas.length}</span>
                  </div>
                  {cosechas.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Gajos</span>
                        <span className="font-semibold text-sm text-primary">
                          {cosechas.reduce((sum, c) => sum + c.gajos, 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Reconteo</span>
                        <span className="font-semibold text-sm text-primary">
                          {cosechas.reduce((sum, c) => sum + c.reconteoGajos, 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      {cosechas.some(c => c.pesoKg > 0) && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Peso (kg)</span>
                          <span className="font-semibold text-sm text-success">
                            {cosechas.reduce((sum, c) => sum + c.pesoKg, 0).toLocaleString('es-CO')}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AlertDialog: confirmar eliminar cosecha del viaje */}
      <AlertDialog open={!!cosechaToDelete} onOpenChange={open => !open && setCosechaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará permanentemente esta cosecha del viaje. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminarCosecha} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}