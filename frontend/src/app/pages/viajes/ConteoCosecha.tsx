import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Truck,
  Leaf,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  viajesApi,
  type Viaje as ViajeApi,
  type OperacionDisponible,
  type CosechaLibre,
} from '../../../api/viajes';
import { selectsApi } from '../../../api/operaciones';

const ETAPAS = [
  { numero: 1, nombre: 'Info. Viaje' },
  { numero: 2, nombre: 'Cosecha' },
];

interface CosechaConteo {
  id: string;
  planillaId: string;
  cuadrillaReconteo: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  gajos: number;
  reconteoGajos: number;
  pesoKg: number;
}


export default function ConteoCosecha() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // ── Estado API ────────────────────────────────────────────────────────────
  const [viajeApi, setViajeApi]          = useState<ViajeApi | null>(null);
  const [loading, setLoading]           = useState(true);
  const [cosechas, setCosechas]         = useState<CosechaConteo[]>([]);
  const [cosechaEnEdicion, setCosechaEnEdicion] = useState<CosechaConteo | null>(null);

  // Estado para agregar cosecha desde operaciones disponibles
  const [modalOpen,        setModalOpen]        = useState(false);
  const [operaciones,      setOperaciones]      = useState<OperacionDisponible[]>([]);
  const [operacionId,      setOperacionId]      = useState('');
  const [cosechasLibres,   setCosechasLibres]   = useState<CosechaLibre[]>([]);
  const [cargandoOps,      setCargandoOps]      = useState(false);
  const [cargandoCosechas, setCargandoCosechas] = useState(false);
  const cuadrillas: Array<{id: string; nombre: string}> = []; // API loads cosechas directly from detalles
  const [agregando,        setAgregando]        = useState(false);
  const [procesando,       setProcesando]       = useState(false);

  // ── Selects para display ─────────────────────────────────────────────────
  const [colaboradores, setColaboradores] = useState<Array<{id: string; nombres: string; apellidos: string}>>([]);
  const [lotesData,     setLotesData]     = useState<Array<{id: string; nombre: string}>>([]);
  const [sublotes,      setSublotes]      = useState<Array<{id: string; nombre: string; loteId: string}>>([]);

  useEffect(() => {
    (async () => {
      try {
        const [colRes, lotRes] = await Promise.all([selectsApi.colaboradores(), selectsApi.lotes()]);
        setColaboradores((colRes.data ?? []).map((x: any) => ({
          id: String(x.id), nombres: x.primer_nombre ?? x.nombres ?? '', apellidos: x.primer_apellido ?? x.apellidos ?? '',
        })));
        const lotes = (lotRes.data ?? []).map((l: any) => ({ id: String(l.id), nombre: l.nombre }));
        setLotesData(lotes);
        const subs = (await Promise.all(lotes.map(async l => {
          try { const sr = await selectsApi.sublotes({ lote_id: Number(l.id) });
            return (sr.data ?? []).map((s: any) => ({ id: String(s.id), nombre: s.nombre, loteId: l.id }));
          } catch { return []; }
        }))).flat();
        setSublotes(subs);
      } catch {}
    })();
  }, []);

  // planillasMock = operaciones disponibles (ya cargadas)
  const planillasMock = operaciones.map(o => ({ id: String(o.id), nombre: `Planilla ${o.fecha}` }));

  const [etapaActual, setEtapaActual] = useState(1);

  // Helper: extrae string de un campo que puede ser objeto o string
  function extractStr(val: unknown): string {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
      const o = val as Record<string, unknown>;
      return String(o.razon_social ?? o.nombre ?? o.name ?? '');
    }
    return String(val);
  }

  // Alias de display: convierte ViajeApi a campos camelCase para el JSX
  const rv = viajeApi as any;
  const viaje = viajeApi ? {
    id:            String(rv.id ?? ''),
    remisionId:    String(rv.remision ?? rv.id ?? ''),
    fecha:         String(rv.fecha_viaje ?? ''),
    placaVehiculo: String(rv.placa_vehiculo ?? ''),
    conductor:     String(rv.nombre_conductor ?? ''),
    transportador: extractStr(rv.empresa ?? rv.empresa_transportadora),
    extractora:    extractStr(rv.extractora),
    horaSalida:    String(rv.hora_salida ?? '').slice(0, 5),
    estado:        String(rv.estado ?? ''),
  } : null;

  // Cargar viaje
  const cargarViaje = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await viajesApi.ver(Number(id));
      setViajeApi(res.data);
      setCosechas((res.data.detalles ?? []).map(d => ({
        id: String(d.id),
        planillaId: String(d.cosecha_id ?? ''),
        cuadrillaReconteo: '',
        colaboradores: (d.cosecha as any)?.cuadrilla?.map((q: any) => String(q.empleado_id)) ?? [],
        lote: String(d.cosecha?.lote?.id ?? ''),
        sublote: String(d.cosecha?.sublote?.id ?? ''),
        gajos: d.cosecha?.gajos_reportados ?? 0,
        reconteoGajos: d.cosecha?.gajos_reconteo ?? 0,
        pesoKg: parseFloat(String(d.cosecha?.peso_confirmado ?? '0')),
        detalleId: d.id,
        reconteoAprobado: d.reconteo_aprobado,
      })));
    } catch { navigate('/viajes'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { cargarViaje(); }, [cargarViaje]);

  // Cargar operaciones disponibles para el modal
  useEffect(() => {
    if (!modalOpen) return;
    setCargandoOps(true);
    viajesApi.operacionesDisponibles()
      .then(r => setOperaciones(r.data ?? []))
      .catch(() => {})
      .finally(() => setCargandoOps(false));
  }, [modalOpen]);

  // Cargar cosechas libres cuando cambia la operación seleccionada
  useEffect(() => {
    if (!operacionId) { setCosechasLibres([]); return; }
    setCargandoCosechas(true);
    viajesApi.cosechasLibresDeOperacion(Number(operacionId))
      .then(r => setCosechasLibres(r.data ?? []))
      .catch(() => {})
      .finally(() => setCargandoCosechas(false));
  }, [operacionId]);

  const agregarCosechaAlViaje = async (cosechaId: number) => {
    if (!viajeApi || agregando) return;
    setAgregando(true);
    try {
      await viajesApi.agregarDetalle(viajeApi.id, cosechaId);
      setModalOpen(false);
      setOperacionId('');
      setCosechasLibres([]);
      await cargarViaje();
      toast.success('Cosecha agregada al viaje');
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al agregar cosecha');
    } finally { setAgregando(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>;
  }

  if (!viaje) return null;

  const siguienteEtapa = () => {
    if (etapaActual < ETAPAS.length) {
      setEtapaActual(etapaActual + 1);
    }
  };

  const etapaAnterior = () => {
    if (etapaActual > 1) {
      setEtapaActual(etapaActual - 1);
    }
  };

  const irAEtapa = (numero: number) => {
    setEtapaActual(numero);
  };

  const agregarCosecha = () => {
    setCosechaEnEdicion({
      id: `cosecha-${Date.now()}`,
      planillaId: '',
      cuadrillaReconteo: '',
      colaboradores: [],
      lote: '',
      sublote: '',
      gajos: 0,
      reconteoGajos: 0,
      pesoKg: 0
    });
  };

  const guardarCosecha = async () => {
    if (!cosechaEnEdicion || !viajeApi) return;
    const detalleId = (cosechaEnEdicion as any).detalleId;
    if (!detalleId) {
      // Cosecha local (aún no en API) — solo actualizar state
      setCosechas([cosechaEnEdicion, ...cosechas]);
      setCosechaEnEdicion(null);
      return;
    }
    setProcesando(true);
    try {
      await viajesApi.hidratarReconteo(viajeApi.id, detalleId, {
        gajos_reconteo: cosechaEnEdicion.reconteoGajos || cosechaEnEdicion.gajos,
        peso_confirmado: cosechaEnEdicion.pesoKg || undefined,
      });
      toast.success('Reconteo guardado');
      await cargarViaje();
      setCosechaEnEdicion(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al guardar reconteo');
    } finally { setProcesando(false); }
  };

  const cancelarCosecha = () => {
    setCosechaEnEdicion(null);
  };

  const eliminarCosecha = (id: string) => {
    setCosechas(cosechas.filter(c => c.id !== id));
  };

  const handleCuadrillaChange = (cuadrillaId: string) => {
    if (!cosechaEnEdicion) return;
    // Con API, la cuadrilla viene de los detalles del viaje ya cargados
    setCosechaEnEdicion({ ...cosechaEnEdicion, cuadrillaReconteo: cuadrillaId });
  };

  const finalizarConteo = async () => {
    if (!viajeApi) return;
    setProcesando(true);
    try {
      for (const cosecha of cosechas) {
        const detalleId = (cosecha as any).detalleId;
        if (detalleId && !(cosecha as any).reconteoAprobado) {
          const res = await viajesApi.aprobarReconteo(viajeApi.id, detalleId);
          if (res.data.auto_despachado) {
            toast.success('Conteo finalizado — viaje en camino');
            navigate('/viajes');
            return;
          }
        }
      }
      toast.success('Conteo finalizado');
      navigate('/viajes');
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al finalizar conteo');
    } finally { setProcesando(false); }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/viajes')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Viajes
        </Button>
        <h1>Conteo de Cosecha</h1>
        <p className="text-muted-foreground mt-1">
          Registra las cosechas del viaje
        </p>
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
                      {/* Círculo de etapa */}
                      <button
                        onClick={() => irAEtapa(etapa.numero)}
                        className={`flex flex-col items-center gap-2 ${
                          estaActiva || estaCompleta ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}
                        disabled={!estaActiva && !estaCompleta}
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                            estaCompleta
                              ? 'bg-primary border-primary text-white'
                              : estaActiva
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-muted border-border text-muted-foreground'
                          }`}
                        >
                          {estaCompleta ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <span className="font-bold">{etapa.numero}</span>
                          )}
                        </div>
                        <div className="text-center">
                          <div
                            className={`text-sm font-semibold whitespace-nowrap ${
                              estaActiva || estaCompleta ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {etapa.nombre}
                          </div>
                        </div>
                      </button>

                      {/* Línea conectora */}
                      {index < ETAPAS.length - 1 && (
                        <div className="flex-1 h-0.5 mx-3 bg-border relative min-w-[20px]">
                          <div
                            className={`absolute inset-0 bg-primary transition-all ${
                              estaCompleta ? 'w-full' : 'w-0'
                            }`}
                          />
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
                      <p className="text-sm text-muted-foreground">
                        Datos del viaje registrado
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fecha del Viaje</Label>
                      <Input value={new Date(viaje.fecha).toLocaleDateString('es-CO')} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Placa del Vehículo</Label>
                      <Input value={viaje.placaVehiculo} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Conductor</Label>
                      <Input value={viaje.conductor} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Transportador</Label>
                      <Input value={viaje.transportador} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Extractora Destino</Label>
                      <Input value={viaje.extractora} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora de Salida</Label>
                      <Input value={viaje.horaSalida} disabled />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 2: COSECHA */}
            {etapaActual === 2 && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={agregarCosecha} className="gap-2">
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
                          <p className="text-sm text-muted-foreground">
                            Registra las cosechas del viaje
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Planilla / Cosecha</Label>
                          <Select
                            value={cosechaEnEdicion.planillaId}
                            onValueChange={(value) => {
                              setCosechaEnEdicion({ ...cosechaEnEdicion, planillaId: value });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar planilla..." />
                            </SelectTrigger>
                            <SelectContent>
                              {planillasMock.map((planilla) => (
                                <SelectItem key={planilla.id} value={planilla.id}>
                                  {planilla.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Cuadrilla Reconteo</Label>
                          <Select
                            value={cosechaEnEdicion.cuadrillaReconteo}
                            onValueChange={handleCuadrillaChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar cuadrilla..." />
                            </SelectTrigger>
                            <SelectContent>
                              {cuadrillas.map((cuadrilla) => (
                                <SelectItem key={cuadrilla.id} value={cuadrilla.id}>
                                  {cuadrilla.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Colaboradores</Label>
                          <div className="flex flex-wrap gap-2">
                            {cosechaEnEdicion.colaboradores.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No hay colaboradores</p>
                            ) : (
                              cosechaEnEdicion.colaboradores.map((colId) => {
                                const col = colaboradores.find(c => c.id === colId);
                                return col ? (
                                  <Badge key={colId} variant="outline" className="text-xs">
                                    {col.nombres} {col.apellidos}
                                  </Badge>
                                ) : null;
                              })
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Lote</Label>
                          <Input
                            value={lotesData.find(l => l.id === cosechaEnEdicion.lote)?.nombre || 'Sin lote'}
                            disabled
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Sublote</Label>
                          <Input
                            value={sublotes.find(s => s.id === cosechaEnEdicion.sublote)?.nombre || 'Sin sublote'}
                            disabled
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Número de Gajos</Label>
                          <Input
                            type="number"
                            value={cosechaEnEdicion.gajos || ''}
                            disabled
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Reconteo de Gajos</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={cosechaEnEdicion.reconteoGajos || ''}
                            onChange={(e) => {
                              setCosechaEnEdicion({
                                ...cosechaEnEdicion,
                                reconteoGajos: parseInt(e.target.value) || 0
                              });
                            }}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Peso en kg (opcional)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={cosechaEnEdicion.pesoKg || ''}
                            onChange={(e) => {
                              setCosechaEnEdicion({
                                ...cosechaEnEdicion,
                                pesoKg: parseInt(e.target.value) || 0
                              });
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={cancelarCosecha}>
                          Cancelar
                        </Button>
                        <Button onClick={guardarCosecha} className="gap-2">
                          <Check className="h-4 w-4" />
                          Guardar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lista de cosechas guardadas */}
                {cosechas.map((cosecha) => {
                  const planilla = planillasMock.find(p => p.id === cosecha.planillaId);
                  const cuadrilla = cuadrillas.find(c => c.id === cosecha.cuadrillaReconteo);
                  const lote = lotesData.find(l => l.id === cosecha.lote);
                  const sublote = sublotes.find(s => s.id === cosecha.sublote);

                  return (
                    <Card key={cosecha.id} className="border-border hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          {/* Icon + Planilla */}
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                              <Leaf className="h-5 w-5 text-success" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">{planilla?.nombre || 'Sin planilla'}</h4>
                              <p className="text-xs text-muted-foreground">{cuadrilla?.nombre || 'Sin cuadrilla'}</p>
                            </div>
                          </div>

                          {/* Lote/Sublote */}
                          <div className="text-center shrink-0">
                            <p className="text-xs text-muted-foreground">Lote</p>
                            <p className="font-semibold text-sm">{lote?.nombre || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{sublote?.nombre || 'N/A'}</p>
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
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarCosecha(cosecha.id)}
                            className="text-destructive hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

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
              <Button
                variant="outline"
                onClick={etapaAnterior}
                disabled={etapaActual === 1}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="flex gap-2">
                {etapaActual < ETAPAS.length ? (
                  <Button
                    onClick={siguienteEtapa}
                    className="gap-2"
                  >
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={finalizarConteo}
                    className="gap-2 bg-success hover:bg-success/90"
                  >
                    <Check className="h-4 w-4" />
                    Finalizar Conteo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Panel de resumen (1/3) - sticky */}
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
                {/* Progreso general */}
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

                {/* Información del viaje */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Información del Viaje
                  </h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Placa</span>
                      <span className="font-semibold text-sm">{viaje.placaVehiculo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Conductor</span>
                      <span className="font-semibold text-sm">{viaje.conductor}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Extractora</span>
                      <span className="font-semibold text-sm truncate ml-2 max-w-[120px]" title={viaje.extractora}>
                        {viaje.extractora}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Resumen de cosechas */}
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
                          {cosechas.reduce((sum, c) => sum + c.gajos, 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Peso (kg)</span>
                        <span className="font-semibold text-sm text-success">
                          {cosechas.reduce((sum, c) => sum + c.pesoKg, 0)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}