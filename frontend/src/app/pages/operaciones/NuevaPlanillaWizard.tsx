import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  FileText,
  Leaf,
  Scissors,
  Droplets,
  Shield,
  Wrench,
  ClipboardList,
  Clock,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { colaboradores, lotes as lotesData, sublotes } from '../../lib/mockData';

// Tipos de fertilizantes
const fertilizantes = [
  'NPK 15-15-15',
  'Urea',
  'KCl (Cloruro de Potasio)',
  'Sulfato de Magnesio',
  'Boro',
  'Otro'
];

// Tipos de labor para auxiliares
const laboresAuxiliares = [
  'Mantenimiento de vías',
  'Limpieza de instalaciones',
  'Reparación de cercas',
  'Mantenimiento de equipos',
  'Transporte',
  'Otro'
];

// Tipos de ausentismo
const motivosAusentismo = [
  'Enfermedad',
  'Calamidad Doméstica',
  'Permiso Personal',
  'Licencia',
  'Incapacidad',
  'Otro'
];

// Tipos de horas extras
const tiposHoraExtra = [
  'Hora Extra Diurna',
  'Hora Extra Nocturna',
  'Hora Extra Dominical',
  'Hora Extra Festiva',
  'Recargo Nocturno',
  'Recargo Dominical',
];

interface TrabajoCosecha {
  id: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  gajosRecogidos: number;
  kilos: number;
}

interface TrabajoPlateo {
  id: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  numeroPalmas: number;
}

interface TrabajoPoda {
  id: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  numeroPalmas: number;
}

interface TrabajoFertilizacion {
  id: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  palmas: number;
  tipoFertilizante: string;
  otroFertilizante?: string;
  cantidadGramos: number;
}

interface TrabajoSanidad {
  id: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  trabajoRealizado: string;
}

interface TrabajoOtros {
  id: string;
  colaboradores: string[];
  nombre: string;
  laborRealizada: string;
  lote: string;
  sublote: string;
}

interface TrabajoAuxiliar {
  id: string;
  nombre: string;
  labor: string;
  otraLabor?: string;
  lugar: string;
  total: number;
  horasExtra: number;
}

interface AusenteRegistro {
  id: string;
  colaboradorId: string;
  motivo: string;
  otroMotivo?: string;
}

interface HoraExtra {
  id: string;
  colaboradorId: string;
  tipoHora: string;
  numeroHoras: number;
  observacion: string;
}

const ETAPAS = [
  { numero: 1, nombre: 'Info. General' },
  { numero: 2, nombre: 'Labores de Palma' },
  { numero: 3, nombre: 'Labores de Finca' },
  { numero: 4, nombre: 'Horas Extras' },
  { numero: 5, nombre: 'Finalización' },
];

export default function NuevaPlanillaWizard() {
  const navigate = useNavigate();
  const [etapaActual, setEtapaActual] = useState(1);

  // Información General
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [elaboradoPor, setElaboradoPor] = useState('');
  const [huboLluvia, setHuboLluvia] = useState<'si' | 'no' | ''>('');
  const [lluvia, setLluvia] = useState('');
  const [inicioLabores, setInicioLabores] = useState('06:00');
  
  // Observaciones y Ausentes (Final)
  const [observaciones, setObservaciones] = useState('');
  const [ausentes, setAusentes] = useState<AusenteRegistro[]>([]);
  const [colaboradorAusenteSeleccionado, setColaboradorAusenteSeleccionado] = useState('');
  const [motivoAusenteSeleccionado, setMotivoAusenteSeleccionado] = useState('');
  const [otroMotivoAusente, setOtroMotivoAusente] = useState('');
  
  // Estados de trabajos
  const [trabajosCosecha, setTrabajosCosecha] = useState<TrabajoCosecha[]>([]);
  const [cosechaEnEdicion, setCosechaEnEdicion] = useState<TrabajoCosecha | null>(null);
  const [trabajosPlateo, setTrabajosPlateo] = useState<TrabajoPlateo[]>([]);
  const [plateoEnEdicion, setPlateoEnEdicion] = useState<TrabajoPlateo | null>(null);
  const [trabajosPoda, setTrabajosPoda] = useState<TrabajoPoda[]>([]);
  const [podaEnEdicion, setPodaEnEdicion] = useState<TrabajoPoda | null>(null);
  const [trabajosFertilizacion, setTrabajosFertilizacion] = useState<TrabajoFertilizacion[]>([]);
  const [fertilizacionEnEdicion, setFertilizacionEnEdicion] = useState<TrabajoFertilizacion | null>(null);
  const [trabajosSanidad, setTrabajosSanidad] = useState<TrabajoSanidad[]>([]);
  const [sanidadEnEdicion, setSanidadEnEdicion] = useState<TrabajoSanidad | null>(null);
  const [trabajosOtros, setTrabajosOtros] = useState<TrabajoOtros[]>([]);
  const [otrosEnEdicion, setOtrosEnEdicion] = useState<TrabajoOtros | null>(null);
  const [trabajosAuxiliares, setTrabajosAuxiliares] = useState<TrabajoAuxiliar[]>([]);
  const [horasExtras, setHorasExtras] = useState<HoraExtra[]>([]);
  const [horaExtraEnEdicion, setHoraExtraEnEdicion] = useState<HoraExtra | null>(null);

  const irAEtapa = (numero: number) => {
    setEtapaActual(numero);
  };

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

  const guardarTodo = () => {
    console.log('Guardando planilla...');
    navigate('/operaciones');
  };

  // Funciones para agregar trabajos
  const agregarCosecha = () => {
    setCosechaEnEdicion({
      id: `cosecha-${Date.now()}`,
      colaboradores: [],
      lote: '',
      sublote: '',
      gajosRecogidos: 0,
      kilos: 0
    });
  };

  const guardarCosecha = () => {
    if (cosechaEnEdicion) {
      // Agregar al principio del array (LIFO)
      setTrabajosCosecha([cosechaEnEdicion, ...trabajosCosecha]);
      setCosechaEnEdicion(null);
    }
  };

  const cancelarCosecha = () => {
    setCosechaEnEdicion(null);
  };

  const agregarPlateo = () => {
    setPlateoEnEdicion({
      id: `plateo-${Date.now()}`,
      colaboradores: [],
      lote: '',
      sublote: '',
      numeroPalmas: 0
    });
  };

  const guardarPlateo = () => {
    if (plateoEnEdicion) {
      setTrabajosPlateo([plateoEnEdicion, ...trabajosPlateo]);
      setPlateoEnEdicion(null);
    }
  };

  const cancelarPlateo = () => {
    setPlateoEnEdicion(null);
  };

  const agregarPoda = () => {
    setPodaEnEdicion({
      id: `poda-${Date.now()}`,
      colaboradores: [],
      lote: '',
      sublote: '',
      numeroPalmas: 0
    });
  };

  const guardarPoda = () => {
    if (podaEnEdicion) {
      setTrabajosPoda([podaEnEdicion, ...trabajosPoda]);
      setPodaEnEdicion(null);
    }
  };

  const cancelarPoda = () => {
    setPodaEnEdicion(null);
  };

  const agregarFertilizacion = () => {
    setFertilizacionEnEdicion({
      id: `fertilizacion-${Date.now()}`,
      colaboradores: [],
      lote: '',
      sublote: '',
      palmas: 0,
      tipoFertilizante: '',
      otroFertilizante: '',
      cantidadGramos: 0
    });
  };

  const guardarFertilizacion = () => {
    if (fertilizacionEnEdicion) {
      setTrabajosFertilizacion([fertilizacionEnEdicion, ...trabajosFertilizacion]);
      setFertilizacionEnEdicion(null);
    }
  };

  const cancelarFertilizacion = () => {
    setFertilizacionEnEdicion(null);
  };

  const agregarSanidad = () => {
    setSanidadEnEdicion({
      id: `sanidad-${Date.now()}`,
      colaboradores: [],
      lote: '',
      sublote: '',
      trabajoRealizado: ''
    });
  };

  const guardarSanidad = () => {
    if (sanidadEnEdicion) {
      setTrabajosSanidad([sanidadEnEdicion, ...trabajosSanidad]);
      setSanidadEnEdicion(null);
    }
  };

  const cancelarSanidad = () => {
    setSanidadEnEdicion(null);
  };

  const agregarOtros = () => {
    setOtrosEnEdicion({
      id: `otros-${Date.now()}`,
      colaboradores: [],
      nombre: '',
      laborRealizada: '',
      lote: '',
      sublote: ''
    });
  };

  const guardarOtros = () => {
    if (otrosEnEdicion) {
      setTrabajosOtros([otrosEnEdicion, ...trabajosOtros]);
      setOtrosEnEdicion(null);
    }
  };

  const cancelarOtros = () => {
    setOtrosEnEdicion(null);
  };

  // Funciones para horas extras
  const agregarHoraExtra = () => {
    setHoraExtraEnEdicion({
      id: `horaextra-${Date.now()}`,
      colaboradorId: '',
      tipoHora: '',
      numeroHoras: 0,
      observacion: ''
    });
  };

  const guardarHoraExtra = () => {
    if (horaExtraEnEdicion) {
      setHorasExtras([horaExtraEnEdicion, ...horasExtras]); // LIFO
      setHoraExtraEnEdicion(null);
    }
  };

  const cancelarHoraExtra = () => {
    setHoraExtraEnEdicion(null);
  };

  const eliminarHoraExtra = (id: string) => {
    setHorasExtras(horasExtras.filter(h => h.id !== id));
  };

  const agregarAuxiliar = () => {
    setTrabajosAuxiliares([...trabajosAuxiliares, {
      id: `auxiliar-${Date.now()}`,
      nombre: '',
      labor: '',
      otraLabor: '',
      lugar: '',
      total: 0,
      horasExtra: 0
    }]);
  };

  // Funciones para eliminar trabajos
  const eliminarCosecha = (id: string) => {
    setTrabajosCosecha(trabajosCosecha.filter(t => t.id !== id));
  };

  const eliminarPlateo = (id: string) => {
    setTrabajosPlateo(trabajosPlateo.filter(t => t.id !== id));
  };

  const eliminarPoda = (id: string) => {
    setTrabajosPoda(trabajosPoda.filter(t => t.id !== id));
  };

  const eliminarFertilizacion = (id: string) => {
    setTrabajosFertilizacion(trabajosFertilizacion.filter(t => t.id !== id));
  };

  const eliminarSanidad = (id: string) => {
    setTrabajosSanidad(trabajosSanidad.filter(t => t.id !== id));
  };

  const eliminarOtros = (id: string) => {
    setTrabajosOtros(trabajosOtros.filter(t => t.id !== id));
  };

  const eliminarAuxiliar = (id: string) => {
    setTrabajosAuxiliares(trabajosAuxiliares.filter(t => t.id !== id));
  };

  // Funciones para manejar colaboradores en cosecha en edición
  const agregarColaboradorEnEdicion = (colaboradorId: string) => {
    if (cosechaEnEdicion && !cosechaEnEdicion.colaboradores.includes(colaboradorId)) {
      setCosechaEnEdicion({
        ...cosechaEnEdicion,
        colaboradores: [...cosechaEnEdicion.colaboradores, colaboradorId]
      });
    }
  };

  const eliminarColaboradorEnEdicion = (colaboradorId: string) => {
    if (cosechaEnEdicion) {
      setCosechaEnEdicion({
        ...cosechaEnEdicion,
        colaboradores: cosechaEnEdicion.colaboradores.filter(id => id !== colaboradorId)
      });
    }
  };

  // Funciones para manejar colaboradores en cosecha
  const agregarColaboradorACosecha = (trabajoId: string, colaboradorId: string) => {
    setTrabajosCosecha(trabajosCosecha.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDeCosecha = (trabajoId: string, colaboradorId: string) => {
    setTrabajosCosecha(trabajosCosecha.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };


  // Funciones para plateo
  const agregarColaboradorAPlateo = (trabajoId: string, colaboradorId: string) => {
    setTrabajosPlateo(trabajosPlateo.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDePlateo = (trabajoId: string, colaboradorId: string) => {
    setTrabajosPlateo(trabajosPlateo.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };

  // Funciones para poda
  const agregarColaboradorAPoda = (trabajoId: string, colaboradorId: string) => {
    setTrabajosPoda(trabajosPoda.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDePoda = (trabajoId: string, colaboradorId: string) => {
    setTrabajosPoda(trabajosPoda.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };

  // Funciones para fertilización
  const agregarColaboradorAFertilizacion = (trabajoId: string, colaboradorId: string) => {
    setTrabajosFertilizacion(trabajosFertilizacion.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDeFertilizacion = (trabajoId: string, colaboradorId: string) => {
    setTrabajosFertilizacion(trabajosFertilizacion.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };


  // Funciones para ausentes
  const agregarAusente = () => {
    if (colaboradorAusenteSeleccionado && motivoAusenteSeleccionado) {
      if (motivoAusenteSeleccionado === 'Otro' && !otroMotivoAusente) {
        return;
      }
      const nuevoAusente: AusenteRegistro = {
        id: `ausente-${Date.now()}`,
        colaboradorId: colaboradorAusenteSeleccionado,
        motivo: motivoAusenteSeleccionado,
        otroMotivo: motivoAusenteSeleccionado === 'Otro' ? otroMotivoAusente : undefined
      };
      setAusentes([...ausentes, nuevoAusente]);
      setColaboradorAusenteSeleccionado('');
      setMotivoAusenteSeleccionado('');
      setOtroMotivoAusente('');
    }
  };

  const eliminarAusente = (id: string) => {
    setAusentes(ausentes.filter(a => a.id !== id));
  };

  const puedeAvanzarEtapa1 = fecha && elaboradoPor;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/operaciones')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1>Crear Nueva Planilla</h1>
        <p className="text-muted-foreground mt-1">
          Configura tu planilla paso a paso
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
            {/* ETAPA 1: INFORMACIÓN GENERAL */}
            {etapaActual === 1 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Información General</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Ingresa los datos básicos de la planilla
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fecha">Fecha *</Label>
                      <Input
                        id="fecha"
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="elaboradoPor">Elaborado por *</Label>
                      <Input
                        id="elaboradoPor"
                        placeholder="Nombre completo"
                        value={elaboradoPor}
                        onChange={(e) => setElaboradoPor(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="huboLluvia">¿Hubo lluvia?</Label>
                      <Select
                        value={huboLluvia}
                        onValueChange={(value) => {
                          setHuboLluvia(value as 'si' | 'no');
                          if (value === 'no') {
                            setLluvia('');
                          }
                        }}
                      >
                        <SelectTrigger id="huboLluvia">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {huboLluvia === 'si' && (
                      <div className="space-y-2">
                        <Label htmlFor="lluvia">Lluvia (mm)</Label>
                        <Input
                          id="lluvia"
                          type="number"
                          placeholder="Ej: 15"
                          value={lluvia}
                          onChange={(e) => setLluvia(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="inicioLabores">Inicio de Labores</Label>
                      <Input
                        id="inicioLabores"
                        type="time"
                        value={inicioLabores}
                        onChange={(e) => setInicioLabores(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 2: LABORES DE PALMA */}
            {etapaActual === 2 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Labores de Palma</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Cosecha, plateo, poda, fertilización, sanidad y otros
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Tabs defaultValue="cosecha" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="cosecha">Cosecha</TabsTrigger>
                      <TabsTrigger value="plateo">Plateo</TabsTrigger>
                      <TabsTrigger value="poda">Poda</TabsTrigger>
                      <TabsTrigger value="fertilizacion">Fertilización</TabsTrigger>
                      <TabsTrigger value="sanidad">Sanidad</TabsTrigger>
                      <TabsTrigger value="otros">Otros</TabsTrigger>
                    </TabsList>

                    {/* TAB: COSECHA */}
                    <TabsContent value="cosecha" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarCosecha} className="gap-2" disabled={cosechaEnEdicion !== null}>
                          <Plus className="h-4 w-4" />
                          Agregar Cosecha
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {cosechaEnEdicion && (
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value) {
                                      agregarColaboradorEnEdicion(value);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !cosechaEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {col.nombres} {col.apellidos}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {cosechaEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {cosechaEnEdicion.colaboradores.map((colId) => {
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
                                            onClick={() => eliminarColaboradorEnEdicion(colId)}
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
                                <Select
                                  value={cosechaEnEdicion.lote}
                                  onValueChange={(value) => {
                                    setCosechaEnEdicion({ ...cosechaEnEdicion, lote: value, sublote: '' });
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
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={cosechaEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    setCosechaEnEdicion({ ...cosechaEnEdicion, sublote: value });
                                  }}
                                  disabled={!cosechaEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === cosechaEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Gajos Recogidos</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={cosechaEnEdicion.gajosRecogidos || ''}
                                  onChange={(e) => {
                                    setCosechaEnEdicion({ ...cosechaEnEdicion, gajosRecogidos: parseInt(e.target.value) || 0 });
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Kilos (opcional)</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={cosechaEnEdicion.kilos || ''}
                                  onChange={(e) => {
                                    setCosechaEnEdicion({ ...cosechaEnEdicion, kilos: parseInt(e.target.value) || 0 });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-4 border-t">
                              <Button variant="outline" onClick={cancelarCosecha} type="button">
                                Cancelar
                              </Button>
                              <Button onClick={guardarCosecha} className="gap-2" type="button">
                                <Save className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Cards de cosechas guardadas */}
                      {trabajosCosecha.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* Icono y Lote/Sublote */}
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                                    <Leaf className="h-5 w-5 text-success" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">
                                      {sublote?.nombre || 'Sublote no especificado'}
                                    </p>
                                  </div>
                                </div>

                                {/* Colaboradores */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <Badge key={colId} variant="outline" className="text-xs">
                                            {col.nombres.split(' ')[0]} {col.apellidos.split(' ')[0]}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>

                                {/* Gajos */}
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Gajos</p>
                                  <p className="font-bold text-lg">{trabajo.gajosRecogidos}</p>
                                </div>

                                {/* Kilos (si existe) */}
                                {trabajo.kilos > 0 && (
                                  <div className="text-right shrink-0">
                                    <p className="text-xs text-muted-foreground">Kilos</p>
                                    <p className="font-semibold">{trabajo.kilos}</p>
                                  </div>
                                )}

                                {/* Botón eliminar */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarCosecha(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosCosecha.length === 0 && !cosechaEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Leaf className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No hay registros de cosecha</p>
                          <p className="text-sm">Haz clic en "Agregar Cosecha" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* TAB: PLATEO */}
                    <TabsContent value="plateo" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarPlateo} className="gap-2" disabled={plateoEnEdicion !== null}>
                          <Plus className="h-4 w-4" />
                          Agregar Plateo
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {plateoEnEdicion && (
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value && !plateoEnEdicion.colaboradores.includes(value)) {
                                      setPlateoEnEdicion({ ...plateoEnEdicion, colaboradores: [...plateoEnEdicion.colaboradores, value] });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !plateoEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {col.nombres} {col.apellidos}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {plateoEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {plateoEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge key={colId} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">
                                          <span>{col.nombres} {col.apellidos}</span>
                                          <button
                                            type="button"
                                            onClick={() => setPlateoEnEdicion({ ...plateoEnEdicion, colaboradores: plateoEnEdicion.colaboradores.filter(id => id !== colId) })}
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
                                <Select
                                  value={plateoEnEdicion.lote}
                                  onValueChange={(value) => setPlateoEnEdicion({ ...plateoEnEdicion, lote: value, sublote: '' })}
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
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={plateoEnEdicion.sublote}
                                  onValueChange={(value) => setPlateoEnEdicion({ ...plateoEnEdicion, sublote: value })}
                                  disabled={!plateoEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === plateoEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Número de Palmas</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={plateoEnEdicion.numeroPalmas || ''}
                                  onChange={(e) => setPlateoEnEdicion({ ...plateoEnEdicion, numeroPalmas: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-4 border-t">
                              <Button variant="outline" onClick={cancelarPlateo} type="button">
                                Cancelar
                              </Button>
                              <Button onClick={guardarPlateo} className="gap-2" type="button">
                                <Save className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Cards de plateos guardados */}
                      {trabajosPlateo.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                    <Scissors className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sublote no especificado'}</p>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <Badge key={colId} variant="outline" className="text-xs">
                                            {col.nombres.split(' ')[0]} {col.apellidos.split(' ')[0]}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Palmas</p>
                                  <p className="font-bold text-lg">{trabajo.numeroPalmas}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarPlateo(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosPlateo.length === 0 && !plateoEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Scissors className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No hay registros de plateo</p>
                          <p className="text-sm">Haz clic en "Agregar Plateo" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>


                    {/* TAB: PODA */}
                    <TabsContent value="poda" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarPoda} className="gap-2" disabled={podaEnEdicion !== null}>
                          <Plus className="h-4 w-4" />
                          Agregar Poda
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {podaEnEdicion && (
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value && !podaEnEdicion.colaboradores.includes(value)) {
                                      setPodaEnEdicion({ ...podaEnEdicion, colaboradores: [...podaEnEdicion.colaboradores, value] });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !podaEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {col.nombres} {col.apellidos}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {podaEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {podaEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge key={colId} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">
                                          <span>{col.nombres} {col.apellidos}</span>
                                          <button
                                            type="button"
                                            onClick={() => setPodaEnEdicion({ ...podaEnEdicion, colaboradores: podaEnEdicion.colaboradores.filter(id => id !== colId) })}
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
                                <Select
                                  value={podaEnEdicion.lote}
                                  onValueChange={(value) => setPodaEnEdicion({ ...podaEnEdicion, lote: value, sublote: '' })}
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
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={podaEnEdicion.sublote}
                                  onValueChange={(value) => setPodaEnEdicion({ ...podaEnEdicion, sublote: value })}
                                  disabled={!podaEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === podaEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Número de Palmas</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={podaEnEdicion.numeroPalmas || ''}
                                  onChange={(e) => setPodaEnEdicion({ ...podaEnEdicion, numeroPalmas: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-4 border-t">
                              <Button variant="outline" onClick={cancelarPoda} type="button">
                                Cancelar
                              </Button>
                              <Button onClick={guardarPoda} className="gap-2" type="button">
                                <Save className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Cards de podas guardadas */}
                      {trabajosPoda.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                                    <Scissors className="h-5 w-5 text-orange-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sublote no especificado'}</p>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <Badge key={colId} variant="outline" className="text-xs">
                                            {col.nombres.split(' ')[0]} {col.apellidos.split(' ')[0]}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Palmas</p>
                                  <p className="font-bold text-lg">{trabajo.numeroPalmas}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarPoda(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosPoda.length === 0 && !podaEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Scissors className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No hay registros de poda</p>
                          <p className="text-sm">Haz clic en "Agregar Poda" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>


                    {/* TAB: FERTILIZACIÓN */}
                    <TabsContent value="fertilizacion" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarFertilizacion} className="gap-2" disabled={fertilizacionEnEdicion !== null}>
                          <Plus className="h-4 w-4" />
                          Agregar Fertilización
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {fertilizacionEnEdicion && (
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value && !fertilizacionEnEdicion.colaboradores.includes(value)) {
                                      setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, colaboradores: [...fertilizacionEnEdicion.colaboradores, value] });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !fertilizacionEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {col.nombres} {col.apellidos}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {fertilizacionEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {fertilizacionEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge key={colId} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">
                                          <span>{col.nombres} {col.apellidos}</span>
                                          <button
                                            type="button"
                                            onClick={() => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, colaboradores: fertilizacionEnEdicion.colaboradores.filter(id => id !== colId) })}
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
                                <Select
                                  value={fertilizacionEnEdicion.lote}
                                  onValueChange={(value) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, lote: value, sublote: '' })}
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
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={fertilizacionEnEdicion.sublote}
                                  onValueChange={(value) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, sublote: value })}
                                  disabled={!fertilizacionEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === fertilizacionEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Número de Palmas</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={fertilizacionEnEdicion.palmas || ''}
                                  onChange={(e) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, palmas: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Tipo de Fertilizante</Label>
                                <Select
                                  value={fertilizacionEnEdicion.tipoFertilizante}
                                  onValueChange={(value) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, tipoFertilizante: value, otroFertilizante: value !== 'Otro' ? '' : fertilizacionEnEdicion.otroFertilizante })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fertilizantes.map((fert) => (
                                      <SelectItem key={fert} value={fert}>
                                        {fert}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {fertilizacionEnEdicion.tipoFertilizante === 'Otro' && (
                                <div className="space-y-2">
                                  <Label>Especificar otro fertilizante</Label>
                                  <Input
                                    placeholder="Ingrese el tipo de fertilizante"
                                    value={fertilizacionEnEdicion.otroFertilizante || ''}
                                    onChange={(e) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, otroFertilizante: e.target.value })}
                                  />
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label>Cantidad (gramos)</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={fertilizacionEnEdicion.cantidadGramos || ''}
                                  onChange={(e) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, cantidadGramos: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-4 border-t">
                              <Button variant="outline" onClick={cancelarFertilizacion} type="button">
                                Cancelar
                              </Button>
                              <Button onClick={guardarFertilizacion} className="gap-2" type="button">
                                <Save className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Cards de fertilizaciones guardadas */}
                      {trabajosFertilizacion.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        const fertTipo = trabajo.tipoFertilizante === 'Otro' ? trabajo.otroFertilizante : trabajo.tipoFertilizante;
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                                    <Droplets className="h-5 w-5 text-purple-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sublote no especificado'}</p>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <Badge key={colId} variant="outline" className="text-xs">
                                            {col.nombres.split(' ')[0]} {col.apellidos.split(' ')[0]}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Palmas</p>
                                  <p className="font-bold text-lg">{trabajo.palmas}</p>
                                </div>
                                <div className="text-right shrink-0 min-w-[100px]">
                                  <p className="text-xs text-muted-foreground">Fertilizante</p>
                                  <p className="font-semibold text-xs truncate">{fertTipo || 'No especificado'}</p>
                                  <p className="text-xs text-muted-foreground">{trabajo.cantidadGramos}g</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarFertilizacion(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosFertilizacion.length === 0 && !fertilizacionEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Droplets className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No hay registros de fertilización</p>
                          <p className="text-sm">Haz clic en "Agregar Fertilización" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>


                    {/* TAB: SANIDAD */}
                    <TabsContent value="sanidad" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarSanidad} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Agregar Sanidad
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {sanidadEnEdicion && (
                        <Card className="border-primary/50 shadow-lg">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value && !sanidadEnEdicion.colaboradores.includes(value)) {
                                      setSanidadEnEdicion({
                                        ...sanidadEnEdicion,
                                        colaboradores: [...sanidadEnEdicion.colaboradores, value]
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !sanidadEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {col.nombres} {col.apellidos}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {sanidadEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {sanidadEnEdicion.colaboradores.map((colId) => {
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
                                            onClick={() => {
                                              setSanidadEnEdicion({
                                                ...sanidadEnEdicion,
                                                colaboradores: sanidadEnEdicion.colaboradores.filter(id => id !== colId)
                                              });
                                            }}
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
                                <Select
                                  value={sanidadEnEdicion.lote}
                                  onValueChange={(value) => {
                                    setSanidadEnEdicion({ ...sanidadEnEdicion, lote: value, sublote: '' });
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
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={sanidadEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    setSanidadEnEdicion({ ...sanidadEnEdicion, sublote: value });
                                  }}
                                  disabled={!sanidadEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === sanidadEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Trabajo Realizado</Label>
                                <Input
                                  placeholder="Descripción del trabajo"
                                  value={sanidadEnEdicion.trabajoRealizado}
                                  onChange={(e) => {
                                    setSanidadEnEdicion({ ...sanidadEnEdicion, trabajoRealizado: e.target.value });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={cancelarSanidad}>
                                Cancelar
                              </Button>
                              <Button onClick={guardarSanidad} className="gap-2">
                                <Check className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Lista de trabajos guardados */}
                      {trabajosSanidad.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* Icon + Lote/Sublote */}
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                                    <Shield className="h-5 w-5 text-info" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Sin lote'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sin sublote'}</p>
                                  </div>
                                </div>

                                {/* Colaboradores */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  <div className="flex flex-wrap gap-1">
                                    {trabajo.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge key={colId} variant="outline" className="text-xs">
                                          {col.nombres} {col.apellidos}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                </div>

                                {/* Trabajo realizado */}
                                <div className="text-right shrink-0 max-w-xs">
                                  <p className="text-xs text-muted-foreground">Trabajo</p>
                                  <p className="font-semibold text-sm truncate">{trabajo.trabajoRealizado || 'Sin descripción'}</p>
                                </div>

                                {/* Botón eliminar */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarSanidad(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosSanidad.length === 0 && !sanidadEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No hay registros de sanidad vegetal</p>
                          <p className="text-sm">Haz clic en "Agregar Sanidad" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* TAB: OTROS */}
                    <TabsContent value="otros" className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={agregarOtros} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Agregar Otros
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {otrosEnEdicion && (
                        <Card className="border-primary/50 shadow-lg">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value && !otrosEnEdicion.colaboradores.includes(value)) {
                                      setOtrosEnEdicion({
                                        ...otrosEnEdicion,
                                        colaboradores: [...otrosEnEdicion.colaboradores, value]
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !otrosEnEdicion.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {col.nombres} {col.apellidos}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {otrosEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {otrosEnEdicion.colaboradores.map((colId) => {
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
                                            onClick={() => {
                                              setOtrosEnEdicion({
                                                ...otrosEnEdicion,
                                                colaboradores: otrosEnEdicion.colaboradores.filter(id => id !== colId)
                                              });
                                            }}
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
                              <div className="space-y-2 md:col-span-2">
                                <Label>Nombre</Label>
                                <Input
                                  placeholder="Nombre del trabajo"
                                  value={otrosEnEdicion.nombre}
                                  onChange={(e) => {
                                    setOtrosEnEdicion({ ...otrosEnEdicion, nombre: e.target.value });
                                  }}
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Labor Realizada</Label>
                                <Input
                                  placeholder="Descripción de la labor"
                                  value={otrosEnEdicion.laborRealizada}
                                  onChange={(e) => {
                                    setOtrosEnEdicion({ ...otrosEnEdicion, laborRealizada: e.target.value });
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={otrosEnEdicion.lote}
                                  onValueChange={(value) => {
                                    setOtrosEnEdicion({ ...otrosEnEdicion, lote: value, sublote: '' });
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
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={otrosEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    setOtrosEnEdicion({ ...otrosEnEdicion, sublote: value });
                                  }}
                                  disabled={!otrosEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === otrosEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={cancelarOtros}>
                                Cancelar
                              </Button>
                              <Button onClick={guardarOtros} className="gap-2">
                                <Check className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Lista de trabajos guardados */}
                      {trabajosOtros.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* Icon + Lote/Sublote */}
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                                    <Wrench className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">{trabajo.nombre || 'Sin nombre'}</h4>
                                    <p className="text-xs text-muted-foreground">{lote?.nombre || 'Sin lote'} - {sublote?.nombre || 'Sin sublote'}</p>
                                  </div>
                                </div>

                                {/* Colaboradores */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  <div className="flex flex-wrap gap-1">
                                    {trabajo.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge key={colId} variant="outline" className="text-xs">
                                          {col.nombres} {col.apellidos}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                </div>

                                {/* Labor realizada */}
                                <div className="text-right shrink-0 max-w-xs">
                                  <p className="text-xs text-muted-foreground">Labor</p>
                                  <p className="font-semibold text-sm truncate">{trabajo.laborRealizada || 'Sin descripción'}</p>
                                </div>

                                {/* Botón eliminar */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarOtros(trabajo.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosOtros.length === 0 && !otrosEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Wrench className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No hay registros de otros trabajos</p>
                          <p className="text-sm">Haz clic en "Agregar Otros" para crear uno</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 3: LABORES DE FINCA (AUXILIARES) */}
            {etapaActual === 3 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wrench className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Labores de Finca</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Auxiliares y trabajos complementarios
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={agregarAuxiliar}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trabajosAuxiliares.map((trabajo) => (
                    <Card key={trabajo.id} className="border-border">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarAuxiliar(trabajo.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input
                              placeholder="Nombre del colaborador"
                              value={trabajo.nombre}
                              onChange={(e) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, nombre: e.target.value } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Labor</Label>
                            <Select
                              value={trabajo.labor}
                              onValueChange={(value) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? {
                                    ...t,
                                    labor: value,
                                    otraLabor: value !== 'Otro' ? '' : t.otraLabor
                                  } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar labor" />
                              </SelectTrigger>
                              <SelectContent>
                                {laboresAuxiliares.map((labor) => (
                                  <SelectItem key={labor} value={labor}>
                                    {labor}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {trabajo.labor === 'Otro' && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>Especificar otra labor</Label>
                              <Input
                                placeholder="Ingrese el tipo de labor"
                                value={trabajo.otraLabor || ''}
                                onChange={(e) => {
                                  const updated = trabajosAuxiliares.map(t =>
                                    t.id === trabajo.id ? { ...t, otraLabor: e.target.value } : t
                                  );
                                  setTrabajosAuxiliares(updated);
                                }}
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label>Lugar</Label>
                            <Input
                              placeholder="Ubicación"
                              value={trabajo.lugar}
                              onChange={(e) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, lugar: e.target.value } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Total</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={trabajo.total || ''}
                              onChange={(e) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, total: parseInt(e.target.value) || 0 } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Horas Extra</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={trabajo.horasExtra || ''}
                              onChange={(e) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, horasExtra: parseInt(e.target.value) || 0 } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {trabajosAuxiliares.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wrench className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay registros de trabajos auxiliares</p>
                      <p className="text-sm">Haz clic en "Agregar" para crear uno</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ETAPA 4: HORAS EXTRAS */}
            {etapaActual === 4 && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={agregarHoraExtra} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar Hora Extra
                  </Button>
                </div>

                {/* Formulario de edición */}
                {horaExtraEnEdicion && (
                  <Card className="border-primary/50 shadow-lg">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle>Horas Extras</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Registra las horas extras de los colaboradores
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Tipo de Hora</Label>
                          <Select
                            value={horaExtraEnEdicion.tipoHora}
                            onValueChange={(value) => {
                              setHoraExtraEnEdicion({ ...horaExtraEnEdicion, tipoHora: value });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo de hora" />
                            </SelectTrigger>
                            <SelectContent>
                              {tiposHoraExtra.map((tipo) => (
                                <SelectItem key={tipo} value={tipo}>
                                  {tipo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Número de Horas</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={horaExtraEnEdicion.numeroHoras || ''}
                            onChange={(e) => {
                              setHoraExtraEnEdicion({
                                ...horaExtraEnEdicion,
                                numeroHoras: parseFloat(e.target.value) || 0
                              });
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Colaborador</Label>
                          <Select
                            value={horaExtraEnEdicion.colaboradorId}
                            onValueChange={(value) => {
                              setHoraExtraEnEdicion({ ...horaExtraEnEdicion, colaboradorId: value });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar colaborador" />
                            </SelectTrigger>
                            <SelectContent>
                              {colaboradores.map((col) => (
                                <SelectItem key={col.id} value={col.id}>
                                  {col.nombres} {col.apellidos}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Observación</Label>
                          <Textarea
                            placeholder="Observaciones sobre la hora extra..."
                            value={horaExtraEnEdicion.observacion}
                            onChange={(e) => {
                              setHoraExtraEnEdicion({ ...horaExtraEnEdicion, observacion: e.target.value });
                            }}
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={cancelarHoraExtra}>
                          Cancelar
                        </Button>
                        <Button onClick={guardarHoraExtra} className="gap-2">
                          <Check className="h-4 w-4" />
                          Guardar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lista de horas extras guardadas */}
                {horasExtras.map((hora) => {
                  const colaborador = colaboradores.find(c => c.id === hora.colaboradorId);

                  return (
                    <Card key={hora.id} className="border-border hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          {/* Icon + Colaborador */}
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                              <Clock className="h-5 w-5 text-warning" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">
                                {colaborador ? `${colaborador.nombres} ${colaborador.apellidos}` : 'Sin colaborador'}
                              </h4>
                              <p className="text-xs text-muted-foreground">{hora.tipoHora}</p>
                            </div>
                          </div>

                          {/* Horas */}
                          <div className="text-center shrink-0">
                            <p className="text-xs text-muted-foreground">Horas</p>
                            <p className="font-bold text-lg">{hora.numeroHoras}</p>
                          </div>

                          {/* Observación */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Observación</p>
                            <p className="text-sm truncate">{hora.observacion || 'Sin observación'}</p>
                          </div>

                          {/* Botón eliminar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarHoraExtra(hora.id)}
                            className="text-destructive hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {horasExtras.length === 0 && !horaExtraEnEdicion && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No hay horas extras registradas</p>
                    <p className="text-sm">Haz clic en "Agregar Hora Extra" para crear una</p>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 5: FINALIZACIÓN (OBSERVACIONES Y AUSENTES) */}
            {etapaActual === 5 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Finalización</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Observaciones y ausentes
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea
                      id="observaciones"
                      placeholder="Notas o comentarios sobre la jornada..."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Ausentes</Label>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="colaboradorAusente">Colaborador</Label>
                        <Select
                          value={colaboradorAusenteSeleccionado}
                          onValueChange={setColaboradorAusenteSeleccionado}
                        >
                          <SelectTrigger id="colaboradorAusente">
                            <SelectValue placeholder="Seleccionar colaborador" />
                          </SelectTrigger>
                          <SelectContent>
                            {colaboradores
                              .filter(col => !ausentes.some(a => a.colaboradorId === col.id))
                              .map((col) => (
                                <SelectItem key={col.id} value={col.id}>
                                  {col.nombres} {col.apellidos}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="motivoAusente">Motivo</Label>
                        <Select
                          value={motivoAusenteSeleccionado}
                          onValueChange={(value) => {
                            setMotivoAusenteSeleccionado(value);
                            if (value !== 'Otro') {
                              setOtroMotivoAusente('');
                            }
                          }}
                        >
                          <SelectTrigger id="motivoAusente">
                            <SelectValue placeholder="Seleccionar motivo" />
                          </SelectTrigger>
                          <SelectContent>
                            {motivosAusentismo.map((motivo) => (
                              <SelectItem key={motivo} value={motivo}>
                                {motivo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>&nbsp;</Label>
                        <Button
                          type="button"
                          onClick={agregarAusente}
                          disabled={!colaboradorAusenteSeleccionado || !motivoAusenteSeleccionado || (motivoAusenteSeleccionado === 'Otro' && !otroMotivoAusente)}
                          className="w-full gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar
                        </Button>
                      </div>
                    </div>

                    {motivoAusenteSeleccionado === 'Otro' && (
                      <div className="space-y-2">
                        <Label htmlFor="otroMotivoAusente">Especificar otro motivo</Label>
                        <Input
                          id="otroMotivoAusente"
                          placeholder="Ingrese el motivo"
                          value={otroMotivoAusente}
                          onChange={(e) => setOtroMotivoAusente(e.target.value)}
                        />
                      </div>
                    )}

                    {ausentes.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 text-sm font-semibold">Colaborador</th>
                              <th className="text-left p-3 text-sm font-semibold">Motivo</th>
                              <th className="text-right p-3 text-sm font-semibold">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ausentes.map((ausente) => {
                              const col = colaboradores.find(c => c.id === ausente.colaboradorId);
                              const motivoMostrar = ausente.motivo === 'Otro' && ausente.otroMotivo
                                ? `Otro: ${ausente.otroMotivo}`
                                : ausente.motivo;
                              return (
                                <tr key={ausente.id} className="border-t border-border">
                                  <td className="p-3 text-sm">
                                    {col ? `${col.nombres} ${col.apellidos}` : '-'}
                                  </td>
                                  <td className="p-3 text-sm">{motivoMostrar}</td>
                                  <td className="p-3 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => eliminarAusente(ausente.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {ausentes.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                        <p className="text-sm">No hay ausentes registrados</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

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
                  disabled={etapaActual === 1 && !puedeAvanzarEtapa1}
                  className="gap-2"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={guardarTodo}
                  className="gap-2 bg-success hover:bg-success/90"
                >
                  <Save className="h-4 w-4" />
                  Guardar Planilla
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: Panel de resumen (1/3) - sticky */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
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

                {/* RESUMEN DETALLADO */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Resumen Detallado
                  </h4>

                  {!fecha && !elaboradoPor ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No hay información para mostrar</p>
                      <p className="text-xs mt-1">Completa las etapas anteriores</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {fecha && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Fecha</span>
                          <span className="font-semibold text-sm">
                            {new Date(fecha).toLocaleDateString('es-CO')}
                          </span>
                        </div>
                      )}
                      {elaboradoPor && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Elaborado por</span>
                          <span className="font-semibold text-sm truncate ml-2 max-w-[150px]" title={elaboradoPor}>
                            {elaboradoPor}
                          </span>
                        </div>
                      )}
                      {huboLluvia && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Lluvia</span>
                          <span className="font-semibold text-sm">
                            {huboLluvia === 'si' && lluvia ? `${lluvia} mm` : 'No'}
                          </span>
                        </div>
                      )}
                      {inicioLabores && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Inicio Labores</span>
                          <span className="font-semibold text-sm">{inicioLabores}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="h-px bg-border" />

                {/* Contadores de labores */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Labores
                  </h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cosecha</span>
                      <span className="font-semibold text-sm">{trabajosCosecha.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Plateo</span>
                      <span className="font-semibold text-sm">{trabajosPlateo.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Poda</span>
                      <span className="font-semibold text-sm">{trabajosPoda.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fertilización</span>
                      <span className="font-semibold text-sm">{trabajosFertilizacion.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sanidad</span>
                      <span className="font-semibold text-sm">{trabajosSanidad.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Otros</span>
                      <span className="font-semibold text-sm">{trabajosOtros.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auxiliares</span>
                      <span className="font-semibold text-sm">{trabajosAuxiliares.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}