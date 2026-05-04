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
  ArrowLeft, ArrowRight, Check, Truck, Leaf, Trash2, Edit, Save, X,
  CheckCircle, Clock, FileText, Sparkles, Image as ImageIcon, Upload, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  viajesApi, strField,
  type Viaje, type EstadoViajeApi,
} from '../../../api/viajes';
import { formatFechaHora } from '../../utils/fecha';

// ─── tipos UI (3 estados compactos) ───────────────────────────────────────────
export type EstadoViaje = 'Creado' | 'En Validación' | 'Finalizado';

const ESTADO_API_TO_UI: Record<EstadoViajeApi, EstadoViaje> = {
  CREADO:     'Creado',
  EN_CAMINO:  'En Validación',
  EN_PLANTA:  'En Validación',
  FINALIZADO: 'Finalizado',
};

const ETAPAS = [
  { numero: 1, nombre: 'Info. Viaje' },
  { numero: 2, nombre: 'Cosecha' },
  { numero: 3, nombre: 'Soporte Extractora' },
];

interface DatosExtractora {
  numeroRemision: string;
  fechaLlegada: string;
  horaLlegada: string;
  pesoRecibido: number;
  racimosRecibidos: number;
  temperaturaPulpa: number;
  acidezInicial: number;
  humedadSemilla: number;
  calidadMateriaPrima: string;
  observaciones: string;
}

export default function DetalleViaje() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [viaje, setViaje] = useState<any>(null);
  const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // Edición de datos del viaje
  const [modoEdicion, setModoEdicion] = useState(false);
  const [datosViaje, setDatosViaje] = useState({
    fecha: '', placaVehiculo: '', conductor: '',
    transportador: '', extractora: '', horaSalida: '',
  });

  // Validación con IA (UI mock — no hay endpoint real)
  const [imagenFormulario, setImagenFormulario] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [procesandoIA, setProcesandoIA] = useState(false);
  const [datosExtractora, setDatosExtractora] = useState<DatosExtractora>({
    numeroRemision: '', fechaLlegada: '', horaLlegada: '',
    pesoRecibido: 0, racimosRecibidos: 0,
    temperaturaPulpa: 0, acidezInicial: 0, humedadSemilla: 0,
    calidadMateriaPrima: '', observaciones: '',
  });

  // ── carga
  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await viajesApi.ver(Number(id));
      setViaje(res.data);
    } catch { navigate('/viajes'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  // Estado UI derivado del viaje
  const estadoApi: EstadoViajeApi = (viaje?.estado as EstadoViajeApi) ?? 'CREADO';
  const estadoActual: EstadoViaje = ESTADO_API_TO_UI[estadoApi] ?? 'Creado';

  // Etapas disponibles según estado
  const etapasDisponibles = estadoActual === 'En Validación'
    ? [ETAPAS[2]]
    : estadoActual === 'Finalizado'
    ? ETAPAS
    : ETAPAS.filter(e => e.numero <= 2);

  // Etapa inicial: si "En Validación" → soporte; si no → 1
  const [etapaActual, setEtapaActual] = useState(1);
  useEffect(() => {
    if (estadoActual === 'En Validación') setEtapaActual(3);
    else setEtapaActual(1);
  }, [estadoActual]);

  // Sincronizar form de edición cuando cambia el viaje
  useEffect(() => {
    if (!viaje) return;
    setDatosViaje({
      fecha:          String(viaje.fecha_viaje ?? ''),
      placaVehiculo:  String(viaje.placa_vehiculo ?? ''),
      conductor:      String(viaje.nombre_conductor ?? ''),
      transportador:  strField(viaje.empresa ?? viaje.empresa_transportadora),
      extractora:     strField(viaje.extractora),
      horaSalida:     String(viaje.hora_salida ?? '').slice(0, 5),
    });
  }, [viaje]);

  // ── handlers
  const habilitarEdicion = () => setModoEdicion(true);
  const cancelarEdicion  = () => {
    if (!viaje) return;
    setDatosViaje({
      fecha:         String(viaje.fecha_viaje ?? ''),
      placaVehiculo: String(viaje.placa_vehiculo ?? ''),
      conductor:     String(viaje.nombre_conductor ?? ''),
      transportador: strField(viaje.empresa ?? viaje.empresa_transportadora),
      extractora:    strField(viaje.extractora),
      horaSalida:    String(viaje.hora_salida ?? '').slice(0, 5),
    });
    setModoEdicion(false);
  };

  const guardarEdicion = async () => {
    if (!id) return;
    setProcesando(true);
    try {
      await viajesApi.editar(Number(id), {
        fecha_viaje: datosViaje.fecha,
        hora_salida: datosViaje.horaSalida,
      });
      toast.success('Viaje actualizado');
      setModoEdicion(false);
      await cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar cambios');
    } finally {
      setProcesando(false);
    }
  };

  const eliminarViaje = () => {
    if (!id) return;
    setConfirmEliminarOpen(true);
  };

  const confirmarEliminarViaje = async () => {
    if (!id) return;
    setConfirmEliminarOpen(false);
    try {
      await viajesApi.eliminar(Number(id));
      toast.success('Viaje eliminado');
      navigate('/viajes');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al eliminar el viaje');
    }
  };

  const handleImagenFormularioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagenFormulario(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagenPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Mock de IA: simula extracción tras 1.5 segundos
  const transcribirConIA = () => {
    setProcesandoIA(true);
    setTimeout(() => {
      setDatosExtractora({
        numeroRemision: `REM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        fechaLlegada:   new Date().toISOString().split('T')[0],
        horaLlegada:    new Date().toTimeString().slice(0, 5),
        pesoRecibido:   12500,
        racimosRecibidos: 850,
        temperaturaPulpa: 28.5,
        acidezInicial: 1.2,
        humedadSemilla: 18.5,
        calidadMateriaPrima: 'Buena',
        observaciones: 'Datos extraídos automáticamente del formulario',
      });
      setProcesandoIA(false);
      toast.success('Datos extraídos correctamente');
    }, 1500);
  };

  const guardarValidacion = async () => {
    if (!id) return;
    if (!datosExtractora.pesoRecibido) {
      toast.error('El peso recibido es requerido');
      return;
    }
    setProcesando(true);
    try {
      // Si está en EN_CAMINO, mover a EN_PLANTA con el peso recibido
      if (estadoApi === 'EN_CAMINO') {
        await viajesApi.llegadaPlanta(Number(id), datosExtractora.pesoRecibido);
      }
      // Finalizar (EN_PLANTA → FINALIZADO)
      await viajesApi.finalizar(Number(id));
      toast.success('Viaje finalizado');
      navigate('/viajes');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al finalizar el viaje');
    } finally {
      setProcesando(false);
    }
  };

  // Navegación de etapas
  const siguienteEtapa = () => {
    if (etapaActual < etapasDisponibles[etapasDisponibles.length - 1].numero) {
      const nextEtapa = etapasDisponibles.find(e => e.numero > etapaActual);
      if (nextEtapa) setEtapaActual(nextEtapa.numero);
    }
  };
  const etapaAnterior = () => {
    if (etapaActual > 1) {
      const prev = etapasDisponibles.filter(e => e.numero < etapaActual).pop();
      if (prev) setEtapaActual(prev.numero);
    }
  };
  const irAEtapa = (numero: number) => {
    if (etapasDisponibles.some(e => e.numero === numero)) setEtapaActual(numero);
  };

  // Render
  if (loading) {
    return (
      <div className="container mx-auto py-16 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando viaje...
      </div>
    );
  }
  if (!viaje) return null;

  const remisionId  = String(viaje.remision ?? viaje.id ?? '');
  const fechaViaje  = String(viaje.fecha_viaje ?? '');
  const placa       = String(viaje.placa_vehiculo ?? '');
  const conductor   = String(viaje.nombre_conductor ?? '');
  const transporte  = strField(viaje.empresa ?? viaje.empresa_transportadora);
  const extractora  = strField(viaje.extractora);
  const horaSalida  = String(viaje.hora_salida ?? '').slice(0, 5);
  const fechaCreado = viaje.created_at ?? null;
  const fechaValidacion = viaje.fecha_despachado ?? viaje.fecha_en_camino ?? null;
  const fechaFinalizado = viaje.fecha_finalizado ?? null;

  const detalles = (viaje.detalles ?? []) as any[];

  // Pasos del Timeline
  const timelineSteps = [
    { estado: 'Creado',         label: 'Creado',         icon: FileText,   fecha: fechaCreado,     completado: estadoActual !== 'Creado' },
    { estado: 'En Validación',  label: 'En Validación',  icon: Clock,      fecha: fechaValidacion, completado: estadoActual === 'Finalizado' },
    { estado: 'Finalizado',     label: 'Finalizado',     icon: CheckCircle, fecha: fechaFinalizado, completado: estadoActual === 'Finalizado' },
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/viajes')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Viajes
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold text-foreground">Detalle del Viaje - {remisionId}</h1>
          <Badge variant="outline" className={
            estadoActual === 'Creado' ? 'bg-muted text-muted-foreground border-muted' :
            estadoActual === 'En Validación' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' :
            'bg-success/10 text-success border-success/30'
          }>
            {estadoActual}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">Visualiza y gestiona la información del viaje</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: Wizard (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stepper */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {etapasDisponibles.map((etapa, index) => {
                  const estaCompleta = etapaActual > etapa.numero;
                  const estaActiva = etapaActual === etapa.numero;
                  return (
                    <div key={etapa.numero} className="flex items-center" style={{ flex: index < etapasDisponibles.length - 1 ? 1 : 'none' }}>
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
                          <div className={`text-sm font-semibold whitespace-nowrap ${estaActiva || estaCompleta ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {etapa.nombre}
                          </div>
                        </div>
                      </button>
                      {index < etapasDisponibles.length - 1 && (
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

          {/* Contenido de etapas */}
          <div className="space-y-6">
            {/* ETAPA 1: INFO VIAJE */}
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
                      <Input type="date"
                        value={modoEdicion ? datosViaje.fecha : fechaViaje}
                        disabled={!modoEdicion}
                        onChange={(e) => setDatosViaje({ ...datosViaje, fecha: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Placa del Vehículo</Label>
                      <Input value={modoEdicion ? datosViaje.placaVehiculo : placa} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Conductor</Label>
                      <Input value={modoEdicion ? datosViaje.conductor : conductor} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Transportador</Label>
                      <Input value={modoEdicion ? datosViaje.transportador : transporte} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Extractora Destino</Label>
                      <Input value={modoEdicion ? datosViaje.extractora : extractora} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora de Salida</Label>
                      <Input type="time"
                        value={modoEdicion ? datosViaje.horaSalida : horaSalida}
                        disabled={!modoEdicion}
                        onChange={(e) => setDatosViaje({ ...datosViaje, horaSalida: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 2: COSECHA */}
            {etapaActual === 2 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Leaf className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Cosecha</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {estadoActual === 'Finalizado' ? 'Información de cosecha registrada' : 'Cosechas asociadas al viaje'}
                        </p>
                      </div>
                    </div>
                    {estadoActual === 'Creado' && (
                      <Button onClick={() => navigate(`/viajes/${id}/conteo`)} className="gap-2">
                        <Edit className="h-4 w-4" />
                        Ir a Conteo
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {detalles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Leaf className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay cosechas registradas</p>
                      {estadoActual === 'Creado' && (
                        <p className="text-sm">Haz clic en "Ir a Conteo" para agregar cosechas</p>
                      )}
                    </div>
                  ) : (
                    detalles.map((d) => (
                      <Card key={d.id} className="border-border">
                        <CardContent className="pt-6">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Lote</Label>
                              <Input value={d.cosecha?.lote?.nombre ?? '—'} disabled />
                            </div>
                            <div className="space-y-2">
                              <Label>Sublote</Label>
                              <Input value={d.cosecha?.sublote?.nombre ?? '—'} disabled />
                            </div>
                            <div className="space-y-2">
                              <Label>Número de Gajos</Label>
                              <Input value={d.cosecha?.gajos_reportados ?? 0} disabled />
                            </div>
                            <div className="space-y-2">
                              <Label>Reconteo de Gajos</Label>
                              <Input value={d.cosecha?.gajos_reconteo ?? '—'} disabled />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Peso (kg)</Label>
                              <Input value={d.cosecha?.peso_confirmado ?? '—'} disabled />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* ETAPA 3: VALIDACIÓN CON IA */}
            {etapaActual === 3 && (
              <div className="space-y-6">
                {/* Carga de imagen */}
                <Card className="border-border">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Formulario de Extractora</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {estadoActual === 'Finalizado'
                            ? 'Documento validado de la extractora'
                            : 'Carga el formulario enviado por la extractora para validación automática'}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {estadoActual !== 'Finalizado' && (
                      <>
                        <div className="space-y-2">
                          <Label>Imagen del Formulario</Label>
                          <div className="flex flex-col gap-3">
                            <Input type="file"
                              onChange={handleImagenFormularioChange}
                              accept="image/*,.pdf"
                              className="cursor-pointer"
                            />
                            <p className="text-xs text-muted-foreground">Formatos permitidos: JPG, PNG, PDF</p>
                          </div>
                        </div>

                        {imagenPreview && (
                          <div className="space-y-3">
                            <div className="relative border-2 border-border rounded-lg overflow-hidden bg-muted/20">
                              <img src={imagenPreview} alt="Preview del formulario" className="w-full h-auto max-h-[400px] object-contain" />
                              <Button variant="ghost" size="sm"
                                onClick={() => { setImagenFormulario(null); setImagenPreview(null); }}
                                className="absolute top-2 right-2 bg-background/80 hover:bg-background text-destructive hover:text-destructive">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button onClick={transcribirConIA} disabled={procesandoIA}
                              className="w-full gap-2 bg-primary hover:bg-primary/90" size="lg">
                              {procesandoIA ? (
                                <><Loader2 className="h-5 w-5 animate-spin" />Procesando con IA...</>
                              ) : (
                                <><Sparkles className="h-5 w-5" />Transcribir con IA</>
                              )}
                            </Button>
                          </div>
                        )}

                        {!imagenPreview && (
                          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                            <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">Carga una imagen del formulario</p>
                            <p className="text-sm text-muted-foreground">La IA extraerá automáticamente los datos</p>
                          </div>
                        )}
                      </>
                    )}
                    {estadoActual === 'Finalizado' && (
                      <div className="flex items-center gap-2 p-4 bg-success/10 border border-success/20 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-success" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-success">Formulario validado exitosamente</p>
                          <p className="text-xs text-muted-foreground">Datos extraídos y verificados</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Datos extraídos */}
                {imagenFormulario && (
                  <Card className="border-border">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-success" />
                        </div>
                        <div>
                          <CardTitle>Datos de la Extractora</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {procesandoIA ? 'Extrayendo datos automáticamente...' : 'Verifica y edita los datos extraídos'}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Número de Remisión</Label>
                          <Input value={datosExtractora.numeroRemision}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, numeroRemision: e.target.value })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Fecha de Llegada</Label>
                          <Input type="date" value={datosExtractora.fechaLlegada}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, fechaLlegada: e.target.value })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Hora de Llegada</Label>
                          <Input type="time" value={datosExtractora.horaLlegada}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, horaLlegada: e.target.value })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Peso Recibido (kg)</Label>
                          <Input type="number" value={datosExtractora.pesoRecibido || ''}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, pesoRecibido: parseFloat(e.target.value) || 0 })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Racimos Recibidos</Label>
                          <Input type="number" value={datosExtractora.racimosRecibidos || ''}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, racimosRecibidos: parseInt(e.target.value) || 0 })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Temperatura Pulpa (°C)</Label>
                          <Input type="number" step="0.1" value={datosExtractora.temperaturaPulpa || ''}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, temperaturaPulpa: parseFloat(e.target.value) || 0 })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Acidez Inicial (%)</Label>
                          <Input type="number" step="0.1" value={datosExtractora.acidezInicial || ''}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, acidezInicial: parseFloat(e.target.value) || 0 })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Humedad Semilla (%)</Label>
                          <Input type="number" step="0.1" value={datosExtractora.humedadSemilla || ''}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, humedadSemilla: parseFloat(e.target.value) || 0 })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Calidad Materia Prima</Label>
                          <Select value={datosExtractora.calidadMateriaPrima}
                            onValueChange={(v) => setDatosExtractora({ ...datosExtractora, calidadMateriaPrima: v })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar calidad" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Excelente">Excelente</SelectItem>
                              <SelectItem value="Buena">Buena</SelectItem>
                              <SelectItem value="Regular">Regular</SelectItem>
                              <SelectItem value="Deficiente">Deficiente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Observaciones</Label>
                          <Input value={datosExtractora.observaciones}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, observaciones: e.target.value })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'}
                            placeholder="Observaciones adicionales..." />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Botones de navegación */}
            <div className="flex items-center justify-between pt-4">
              {estadoActual === 'Finalizado' && (
                <Button variant="outline" onClick={etapaAnterior} disabled={etapaActual === 1} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>
              )}
              {estadoActual === 'En Validación' && (
                <Button variant="outline" onClick={() => navigate('/viajes')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Volver a Viajes
                </Button>
              )}

              <div className="flex gap-2 ml-auto">
                {estadoActual === 'Creado' ? (
                  modoEdicion ? (
                    <>
                      <Button variant="outline" onClick={cancelarEdicion} disabled={procesando} className="gap-2">
                        <X className="h-4 w-4" /> Cancelar
                      </Button>
                      <Button onClick={guardarEdicion} disabled={procesando} className="gap-2 bg-success hover:bg-success/90">
                        <Save className="h-4 w-4" /> {procesando ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </>
                  ) : (
                    <>
                      {etapaActual === 1 && (
                        <>
                          <Button variant="outline" onClick={eliminarViaje} className="gap-2 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </Button>
                          <Button onClick={habilitarEdicion} className="gap-2">
                            <Edit className="h-4 w-4" /> Editar
                          </Button>
                          <Button onClick={siguienteEtapa} className="gap-2">
                            Siguiente <ArrowRight className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {etapaActual === 2 && (
                        <Button variant="outline" onClick={etapaAnterior} className="gap-2">
                          <ArrowLeft className="h-4 w-4" /> Anterior
                        </Button>
                      )}
                    </>
                  )
                ) : estadoActual === 'Finalizado' && etapaActual < 3 ? (
                  <Button onClick={siguienteEtapa} className="gap-2">
                    Siguiente <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : estadoActual === 'En Validación' && etapaActual === 3 ? (
                  <Button onClick={guardarValidacion} disabled={!imagenFormulario || procesandoIA || procesando}
                    className="gap-2 bg-success hover:bg-success/90">
                    <Check className="h-4 w-4" />
                    {procesando ? 'Procesando...' : 'Guardar y Finalizar'}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Timeline (1/3) - sticky */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-primary" />
                  Timeline del Viaje
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Progreso */}
                {estadoActual !== 'Finalizado' && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-semibold">
                          {etapasDisponibles.findIndex(e => e.numero === etapaActual) + 1} de {etapasDisponibles.length}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${((etapasDisponibles.findIndex(e => e.numero === etapaActual) + 1) / etapasDisponibles.length) * 100}%` }} />
                      </div>
                    </div>
                    <div className="h-px bg-border" />
                  </>
                )}

                <div className="relative space-y-6">
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
                  {timelineSteps.map((step) => {
                    const Icon = step.icon;
                    const isActive = step.estado === estadoActual;
                    const isCompleted = step.completado;
                    return (
                      <div key={step.estado} className="relative flex gap-3">
                        <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                          isCompleted ? 'bg-success border-success/20' : 'bg-muted border-border'
                        } ${isActive ? 'ring-2 ring-primary/30' : ''}`}>
                          {isCompleted ? <CheckCircle className="h-4 w-4 text-white" /> : <Icon className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 pb-2">
                          <h4 className={`text-sm font-semibold ${
                            isCompleted ? 'text-success' : isActive ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {step.label}
                          </h4>
                          {step.fecha && (
                            <p className="text-xs text-muted-foreground">
                              {formatFechaHora(step.fecha, {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          )}
                          {!step.fecha && !isCompleted && (
                            <p className="text-xs text-muted-foreground">Pendiente</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AlertDialog: confirmar eliminar viaje */}
      <AlertDialog open={confirmEliminarOpen} onOpenChange={setConfirmEliminarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará permanentemente este viaje. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminarViaje} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}