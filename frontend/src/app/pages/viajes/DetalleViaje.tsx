import { useState, useEffect } from 'react';
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
  CheckCircle,
  Clock,
  FileText,
  Upload,
} from 'lucide-react';
import { colaboradores, lotes as lotesData, sublotes } from '../../lib/mockData';
import { toast } from 'sonner';

export type EstadoViaje = 'Creado' | 'En Camino' | 'En Planta' | 'Finalizado';

const ETAPAS = [
  { numero: 1, nombre: 'Info. Viaje' },
  { numero: 2, nombre: 'Cosecha' },
  { numero: 3, nombre: 'Soporte Extractora' },
];

interface Viaje {
  id: string;
  remisionId: string;
  fecha: string;
  placaVehiculo: string;
  conductor: string;
  transportador: string;
  extractora: string;
  horaSalida: string;
  estado: EstadoViaje;
  fechaCreacion: string;
  fechaEnCamino?: string;
  fechaEnPlanta?: string;
  fechaFinalizado?: string;
}

interface CosechaConteo {
  id: string;
  planillaId: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  gajos: number;
  pesoKg: number;
}

// Mock de planillas del día
const planillasMock = [
  { id: 'p1', fecha: '2026-04-14', nombre: 'Planilla 14/04/2026' },
  { id: 'p2', fecha: '2026-04-13', nombre: 'Planilla 13/04/2026' },
  { id: 'p3', fecha: '2026-04-12', nombre: 'Planilla 12/04/2026' },
];

// Mock data
const viajesMock: Viaje[] = [
  {
    id: 'v1',
    remisionId: 'REM-2026-001',
    fecha: '2026-03-09',
    placaVehiculo: 'ABC-123',
    conductor: 'Carlos Rodríguez',
    transportador: 'Transportes del Valle',
    extractora: 'Extractora San Miguel',
    horaSalida: '06:00',
    estado: 'En Camino',
    fechaCreacion: '2026-03-09T05:30:00',
    fechaEnCamino: '2026-03-09T06:00:00',
  },
  {
    id: 'v2',
    remisionId: 'REM-2026-002',
    fecha: '2026-03-09',
    placaVehiculo: 'XYZ-789',
    conductor: 'Juan Pérez',
    transportador: 'Transportes Rápidos',
    extractora: 'Extractora Santa Rosa',
    horaSalida: '07:30',
    estado: 'Creado',
    fechaCreacion: '2026-03-09T07:00:00',
  },
  {
    id: 'v3',
    remisionId: 'REM-2026-003',
    fecha: '2026-03-08',
    placaVehiculo: 'DEF-456',
    conductor: 'Miguel Ángel',
    transportador: 'Transportes del Valle',
    extractora: 'Extractora San Miguel',
    horaSalida: '05:30',
    estado: 'Finalizado',
    fechaCreacion: '2026-03-08T05:00:00',
    fechaEnCamino: '2026-03-08T05:30:00',
    fechaEnPlanta: '2026-03-08T08:15:00',
    fechaFinalizado: '2026-03-08T10:30:00',
  },
  {
    id: 'v4',
    remisionId: 'REM-2026-004',
    fecha: '2026-03-08',
    placaVehiculo: 'GHI-321',
    conductor: 'Pedro López',
    transportador: 'Transportes Rápidos',
    extractora: 'Extractora Santa Rosa',
    horaSalida: '06:30',
    estado: 'En Planta',
    fechaCreacion: '2026-03-08T06:00:00',
    fechaEnCamino: '2026-03-08T06:30:00',
    fechaEnPlanta: '2026-03-08T09:45:00',
  },
  {
    id: 'v5',
    remisionId: 'REM-2026-005',
    fecha: '2026-03-07',
    placaVehiculo: 'JKL-654',
    conductor: 'Roberto Sánchez',
    transportador: 'Transportes del Valle',
    extractora: 'Extractora San Miguel',
    horaSalida: '05:45',
    estado: 'Finalizado',
    fechaCreacion: '2026-03-07T05:15:00',
    fechaEnCamino: '2026-03-07T05:45:00',
    fechaEnPlanta: '2026-03-07T08:30:00',
    fechaFinalizado: '2026-03-07T11:00:00',
  },
  {
    id: 'v6',
    remisionId: 'REM-2026-006',
    fecha: '2026-03-06',
    placaVehiculo: 'MNO-987',
    conductor: 'Luis García',
    transportador: 'Transportes Rápidos',
    extractora: 'Extractora Santa Rosa',
    horaSalida: '06:30',
    estado: 'Finalizado',
    fechaCreacion: '2026-03-06T06:00:00',
    fechaEnCamino: '2026-03-06T06:30:00',
    fechaEnPlanta: '2026-03-06T09:15:00',
    fechaFinalizado: '2026-03-06T11:00:00',
  },
];

// Mock data de cosechas
const cosechasMock: CosechaConteo[] = [
  {
    id: 'c1',
    planillaId: 'p1',
    colaboradores: ['col1', 'col2'],
    lote: 'l1',
    sublote: 'sl1-1',
    gajos: 450,
    pesoKg: 6500,
  },
  {
    id: 'c2',
    planillaId: 'p1',
    colaboradores: ['col3', 'col4'],
    lote: 'l2',
    sublote: 'sl2-1',
    gajos: 400,
    pesoKg: 6000,
  },
];

export default function DetalleViaje() {
  const navigate = useNavigate();
  const { id } = useParams();
  const viaje = viajesMock.find(v => v.id === id);

  const [cosechas, setCosechas] = useState<CosechaConteo[]>(cosechasMock);
  const [archivoSoporte, setArchivoSoporte] = useState<File | null>(null);

  // Establecer estado y etapa inicial basados en el viaje
  const estadoInicial = viaje?.estado || 'Creado';
  const etapaInicial = estadoInicial === 'En Planta' ? 3 : 1;

  const [estadoActual, setEstadoActual] = useState<EstadoViaje>(estadoInicial);
  const [etapaActual, setEtapaActual] = useState(etapaInicial);

  useEffect(() => {
    if (!viaje) {
      navigate('/viajes');
    } else {
      // Actualizar estado y etapa cuando cambia el viaje
      setEstadoActual(viaje.estado);
      setEtapaActual(viaje.estado === 'En Planta' ? 3 : 1);
    }
  }, [viaje, navigate]);

  // Determinar etapas disponibles según el estado
  const etapasDisponibles = estadoActual === 'En Camino'
    ? ETAPAS.filter(e => e.numero <= 2)
    : estadoActual === 'En Planta'
    ? [ETAPAS[2]] // Solo el paso 3
    : estadoActual === 'Finalizado'
    ? ETAPAS // Todos los pasos para viajes finalizados
    : ETAPAS.filter(e => e.numero <= 2);

  if (!viaje) {
    return null;
  }

  const siguienteEtapa = () => {
    if (etapaActual < etapasDisponibles.length) {
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
    setCosechas([...cosechas, {
      id: `cosecha-${Date.now()}`,
      planillaId: '',
      colaboradores: [],
      lote: '',
      sublote: '',
      gajos: 0,
      pesoKg: 0
    }]);
  };

  const eliminarCosecha = (id: string) => {
    setCosechas(cosechas.filter(c => c.id !== id));
  };

  const agregarColaboradorACosecha = (cosechaId: string, colaboradorId: string) => {
    setCosechas(cosechas.map(c => {
      if (c.id === cosechaId && !c.colaboradores.includes(colaboradorId)) {
        return { ...c, colaboradores: [...c.colaboradores, colaboradorId] };
      }
      return c;
    }));
  };

  const eliminarColaboradorDeCosecha = (cosechaId: string, colaboradorId: string) => {
    setCosechas(cosechas.map(c => {
      if (c.id === cosechaId) {
        return { ...c, colaboradores: c.colaboradores.filter(id => id !== colaboradorId) };
      }
      return c;
    }));
  };

  const aprobarCosecha = () => {
    console.log('Aprobar cosecha:', { viaje, cosechas });
    // En un sistema real, aquí se haría una llamada a la API para actualizar el estado
    toast.success('Cosecha aprobada exitosamente', {
      description: 'El viaje ahora está en planta.',
    });
    navigate('/viajes');
  };

  const guardarSoporte = () => {
    if (!archivoSoporte) {
      toast.error('Debes cargar el soporte de la extractora');
      return;
    }
    console.log('Guardar soporte:', { viaje, archivo: archivoSoporte });
    setEstadoActual('Finalizado');
    toast.success('Soporte guardado exitosamente', {
      description: 'El viaje ha sido finalizado.',
    });
    navigate('/viajes');
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivoSoporte(e.target.files[0]);
    }
  };

  // Timeline states
  const timelineSteps = [
    {
      estado: 'Creado',
      label: 'Creado',
      icon: FileText,
      fecha: viaje.fechaCreacion,
      completado: ['Creado', 'En Camino', 'En Planta', 'Finalizado'].includes(estadoActual)
    },
    {
      estado: 'En Camino',
      label: 'En Camino',
      icon: Truck,
      fecha: viaje.fechaEnCamino,
      completado: ['En Camino', 'En Planta', 'Finalizado'].includes(estadoActual)
    },
    {
      estado: 'En Planta',
      label: 'En Planta',
      icon: Clock,
      fecha: viaje.fechaEnPlanta,
      completado: ['En Planta', 'Finalizado'].includes(estadoActual)
    },
    {
      estado: 'Finalizado',
      label: 'Finalizado',
      icon: CheckCircle,
      fecha: viaje.fechaFinalizado,
      completado: estadoActual === 'Finalizado'
    },
  ];

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
        <div className="flex items-center gap-3">
          <h1>Detalle del Viaje - {viaje.remisionId}</h1>
          <Badge variant="outline" className={
            estadoActual === 'Creado' ? 'bg-muted text-muted-foreground border-muted' :
            estadoActual === 'En Camino' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' :
            estadoActual === 'En Planta' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' :
            'bg-success/10 text-success border-success/30'
          }>
            {estadoActual}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          Visualiza y gestiona la información del viaje
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: Wizard (2/3) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Stepper horizontal - No mostrar solo si estamos en estado En Planta */}
          {estadoActual !== 'En Planta' && (
            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {etapasDisponibles.map((etapa, index) => {
                    const estaCompleta = etapaActual > etapa.numero;
                    const estaActiva = etapaActual === etapa.numero;

                    return (
                      <div key={etapa.numero} className="flex items-center" style={{ flex: index < etapasDisponibles.length - 1 ? 1 : 'none' }}>
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
                        {index < etapasDisponibles.length - 1 && (
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
          )}

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
                          {estadoActual === 'Finalizado' ? 'Información de cosecha registrada' : 'Edita o aprueba las cosechas del viaje'}
                        </p>
                      </div>
                    </div>
                    {estadoActual !== 'Finalizado' && (
                      <Button onClick={agregarCosecha} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Agregar Cosecha
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cosechas.map((cosecha) => (
                    <Card key={cosecha.id} className="border-border">
                      <CardContent className="pt-6 space-y-4">
                        {estadoActual !== 'Finalizado' && (
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarCosecha(cosecha.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Planilla / Cosecha</Label>
                            {estadoActual === 'Finalizado' ? (
                              <Input
                                value={planillasMock.find(p => p.id === cosecha.planillaId)?.nombre || 'N/A'}
                                disabled
                                className="bg-muted"
                              />
                            ) : (
                              <Select
                                value={cosecha.planillaId}
                                onValueChange={(value) => {
                                  const updated = cosechas.map(c =>
                                    c.id === cosecha.id ? { ...c, planillaId: value } : c
                                  );
                                  setCosechas(updated);
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
                            )}
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label>Colaboradores</Label>
                            {estadoActual !== 'Finalizado' && (
                              <Select
                                value=""
                                onValueChange={(value) => {
                                  if (value) {
                                    agregarColaboradorACosecha(cosecha.id, value);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Agregar colaborador" />
                                </SelectTrigger>
                                <SelectContent>
                                  {colaboradores
                                    .filter(col => !cosecha.colaboradores.includes(col.id))
                                    .map((col) => (
                                      <SelectItem key={col.id} value={col.id}>
                                        {col.nombres} {col.apellidos}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}
                            {cosecha.colaboradores.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {cosecha.colaboradores.map((colId) => {
                                  const col = colaboradores.find(c => c.id === colId);
                                  return col ? (
                                    <Badge
                                      key={colId}
                                      variant="secondary"
                                      className="pl-2.5 pr-1 py-1 gap-1"
                                    >
                                      <span>{col.nombres} {col.apellidos}</span>
                                      <button
                                        type="button"
                                        onClick={() => eliminarColaboradorDeCosecha(cosecha.id, colId)}
                                        className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Lote</Label>
                            {estadoActual === 'Finalizado' ? (
                              <Input
                                value={lotesData.find(l => l.id === cosecha.lote)?.nombre || 'N/A'}
                                disabled
                                className="bg-muted"
                              />
                            ) : (
                              <Select
                                value={cosecha.lote}
                                onValueChange={(value) => {
                                  const updated = cosechas.map(c =>
                                    c.id === cosecha.id ? { ...c, lote: value, sublote: '' } : c
                                  );
                                  setCosechas(updated);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar lote" />
                                </SelectTrigger>
                                <SelectContent>
                                  {lotesData.map((lote) => (
                                    <SelectItem key={lote.id} value={lote.id}>
                                      {lote.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Sublote</Label>
                            {estadoActual === 'Finalizado' ? (
                              <Input
                                value={sublotes.find(s => s.id === cosecha.sublote)?.nombre || 'N/A'}
                                disabled
                                className="bg-muted"
                              />
                            ) : (
                              <Select
                                value={cosecha.sublote}
                                onValueChange={(value) => {
                                  const updated = cosechas.map(c =>
                                    c.id === cosecha.id ? { ...c, sublote: value } : c
                                  );
                                  setCosechas(updated);
                                }}
                                disabled={!cosecha.lote}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar sublote" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sublotes
                                    .filter(s => s.loteId === cosecha.lote)
                                    .map((sublote) => (
                                      <SelectItem key={sublote.id} value={sublote.id}>
                                        {sublote.nombre}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Número de Gajos</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={cosecha.gajos || ''}
                              onChange={(e) => {
                                const updated = cosechas.map(c =>
                                  c.id === cosecha.id ? { ...c, gajos: parseInt(e.target.value) || 0 } : c
                                );
                                setCosechas(updated);
                              }}
                              disabled={estadoActual === 'Finalizado'}
                              className={estadoActual === 'Finalizado' ? 'bg-muted' : ''}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Peso en kg</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={cosecha.pesoKg || ''}
                              onChange={(e) => {
                                const updated = cosechas.map(c =>
                                  c.id === cosecha.id ? { ...c, pesoKg: parseInt(e.target.value) || 0 } : c
                                );
                                setCosechas(updated);
                              }}
                              disabled={estadoActual === 'Finalizado'}
                              className={estadoActual === 'Finalizado' ? 'bg-muted' : ''}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {cosechas.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Leaf className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay cosechas registradas</p>
                      <p className="text-sm">Haz clic en "Agregar Cosecha" para crear una</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ETAPA 3: SOPORTE EXTRACTORA */}
            {etapaActual === 3 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Soporte de Extractora</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {estadoActual === 'Finalizado' ? 'Documento cargado de la extractora' : 'Carga el documento enviado por la extractora'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {estadoActual === 'Finalizado' ? (
                    <div className="flex items-center gap-2 p-4 bg-success/10 border border-success/20 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-success" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-success">Soporte cargado exitosamente</p>
                        <p className="text-xs text-muted-foreground">soporte_extractora_{viaje.id}.pdf</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Archivo del Soporte</Label>
                        <div className="flex flex-col gap-3">
                          <Input
                            type="file"
                            onChange={handleArchivoChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="cursor-pointer"
                          />
                          {archivoSoporte && (
                            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                              <CheckCircle className="h-5 w-5 text-success" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-success">Archivo cargado</p>
                                <p className="text-xs text-muted-foreground">{archivoSoporte.name}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setArchivoSoporte(null)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Formatos permitidos: PDF, JPG, PNG
                        </p>
                      </div>

                      {!archivoSoporte && (
                        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                          <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground">Selecciona un archivo para continuar</p>
                          <p className="text-sm text-muted-foreground">El soporte de la extractora es requerido para finalizar</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Botones de navegación */}
            <div className="flex items-center justify-between pt-4">
              {(estadoActual === 'En Camino' || estadoActual === 'Finalizado') && (
                <Button
                  variant="outline"
                  onClick={etapaAnterior}
                  disabled={etapaActual === 1}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>
              )}

              {estadoActual === 'En Planta' && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/viajes')}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a Viajes
                </Button>
              )}

              <div className="flex gap-2 ml-auto">
                {estadoActual === 'Finalizado' && etapaActual < 3 ? (
                  <Button
                    onClick={siguienteEtapa}
                    className="gap-2"
                  >
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : estadoActual === 'En Camino' && etapaActual < 2 ? (
                  <Button
                    onClick={siguienteEtapa}
                    className="gap-2"
                  >
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    {estadoActual === 'En Camino' && etapaActual === 2 && (
                      <Button
                        onClick={aprobarCosecha}
                        className="gap-2 bg-success hover:bg-success/90"
                      >
                        <Check className="h-4 w-4" />
                        Aprobar Cosecha
                      </Button>
                    )}
                    {estadoActual === 'En Planta' && etapaActual === 3 && (
                      <Button
                        onClick={guardarSoporte}
                        className="gap-2 bg-success hover:bg-success/90"
                      >
                        <Check className="h-4 w-4" />
                        Guardar y Finalizar
                      </Button>
                    )}
                  </>
                )}
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
                {/* Progreso general */}
                {estadoActual !== 'En Planta' && estadoActual !== 'Finalizado' && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-semibold">{etapaActual} de {etapasDisponibles.length}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(etapaActual / etapasDisponibles.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="h-px bg-border" />
                  </>
                )}

                <div className="relative space-y-6">
                  {/* Línea vertical */}
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

                  {timelineSteps.map((step) => {
                    const Icon = step.icon;
                    const isActive = step.estado === estadoActual;
                    const isCompleted = step.completado;

                    return (
                      <div key={step.estado} className="relative flex gap-3">
                        {/* Círculo del estado */}
                        <div
                          className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                            isCompleted
                              ? 'bg-success border-success/20'
                              : 'bg-muted border-border'
                          } ${isActive ? 'ring-2 ring-primary/30' : ''}`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-white" />
                          ) : (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        {/* Contenido del estado */}
                        <div className="flex-1 pb-2">
                          <h4
                            className={`text-sm font-semibold ${
                              isCompleted ? 'text-success' : isActive ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            {step.label}
                          </h4>
                          {step.fecha && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(step.fecha).toLocaleString('es-CO', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
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
    </div>
  );
}