import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { 
  Plus, 
  Truck, 
  Package, 
  MapPin, 
  Scale, 
  Calendar, 
  Eye,
  TrendingUp
} from 'lucide-react';

export type EstadoViaje = 'Borrador' | 'En Camino' | 'En Planta' | 'Finalizado' | 'En Disputa';

interface Viaje {
  id: string;
  remisionId: string;
  fecha: string;
  placaVehiculo: string;
  conductor: string;
  lotes: string[];
  lotesNombres: string[];
  gajosEstimados: number;
  peso?: number;
  extractora: string;
  estado: EstadoViaje;
  observaciones?: string;
  fechaCreacion: string;
  fechaEnCamino?: string;
  fechaEnPlanta?: string;
  fechaFinalizado?: string;
}

// Mock data
const viajesData: Viaje[] = [
  {
    id: 'v1',
    remisionId: 'REM-2026-001',
    fecha: '2026-03-09',
    placaVehiculo: 'ABC-123',
    conductor: 'Carlos Rodríguez',
    lotes: ['l1', 'l2'],
    lotesNombres: ['Lote 1 - Norte', 'Lote 2 - Sur'],
    gajosEstimados: 850,
    peso: 12500,
    extractora: 'Extractora San Miguel',
    estado: 'En Camino',
    observaciones: 'Salida a las 6:00 AM',
    fechaCreacion: '2026-03-09T05:30:00',
    fechaEnCamino: '2026-03-09T06:00:00',
  },
  {
    id: 'v2',
    remisionId: 'REM-2026-002',
    fecha: '2026-03-09',
    placaVehiculo: 'XYZ-789',
    conductor: 'Juan Pérez',
    lotes: ['l3'],
    lotesNombres: ['Lote 3 - Este'],
    gajosEstimados: 600,
    extractora: 'Extractora Santa Rosa',
    estado: 'Borrador',
    fechaCreacion: '2026-03-09T07:00:00',
  },
  {
    id: 'v3',
    remisionId: 'REM-2026-003',
    fecha: '2026-03-08',
    placaVehiculo: 'DEF-456',
    conductor: 'Miguel Ángel',
    lotes: ['l1', 'l4'],
    lotesNombres: ['Lote 1 - Norte', 'Lote 4 - Oeste'],
    gajosEstimados: 920,
    peso: 13800,
    extractora: 'Extractora San Miguel',
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
    lotes: ['l2', 'l3'],
    lotesNombres: ['Lote 2 - Sur', 'Lote 3 - Este'],
    gajosEstimados: 750,
    peso: 11200,
    extractora: 'Extractora Santa Rosa',
    estado: 'En Planta',
    observaciones: 'Espera en fila para descargue',
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
    lotes: ['l1'],
    lotesNombres: ['Lote 1 - Norte'],
    gajosEstimados: 520,
    peso: 7800,
    extractora: 'Extractora San Miguel',
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
    lotes: ['l2', 'l4'],
    lotesNombres: ['Lote 2 - Sur', 'Lote 4 - Oeste'],
    gajosEstimados: 680,
    peso: 10100,
    extractora: 'Extractora Santa Rosa',
    estado: 'En Disputa',
    observaciones: 'Diferencia en peso reportado vs recibido',
    fechaCreacion: '2026-03-06T06:00:00',
    fechaEnCamino: '2026-03-06T06:30:00',
    fechaEnPlanta: '2026-03-06T09:15:00',
  },
];

export default function Viajes() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState<EstadoViaje | 'Todos'>('Todos');

  const viajesFiltrados =
    filtroEstado === 'Todos'
      ? viajesData
      : viajesData.filter((v) => v.estado === filtroEstado);

  const getEstadoColor = (estado: EstadoViaje) => {
    switch (estado) {
      case 'Borrador':
        return 'bg-muted text-muted-foreground border-muted';
      case 'En Camino':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'En Planta':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
      case 'Finalizado':
        return 'bg-success/10 text-success border-success/30';
      case 'En Disputa':
        return 'bg-destructive/10 text-destructive border-destructive/30';
    }
  };

  const getEstadoIcon = (estado: EstadoViaje) => {
    switch (estado) {
      case 'Borrador':
        return <Package className="h-3 w-3" />;
      case 'En Camino':
        return <Truck className="h-3 w-3" />;
      case 'En Planta':
        return <MapPin className="h-3 w-3" />;
      case 'Finalizado':
        return <Scale className="h-3 w-3" />;
      case 'En Disputa':
        return <Package className="h-3 w-3" />;
    }
  };

  // KPIs
  const totalViajes = viajesData.length;
  const viajesEnCamino = viajesData.filter((v) => v.estado === 'En Camino').length;
  const viajesFinalizados = viajesData.filter((v) => v.estado === 'Finalizado').length;
  const gajosTotal = viajesData.reduce((sum, v) => sum + v.gajosEstimados, 0);
  const pesoTotal = viajesData.reduce((sum, v) => sum + (v.peso || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header con botones - mismo estilo que otros módulos */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Viajes</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de despachos de fruto hacia la extractora
          </p>
        </div>
        <Button 
          onClick={() => navigate('/viajes/nuevo')} 
          className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="h-5 w-5" />
          Nuevo Viaje
        </Button>
      </div>

      {/* KPIs - mismo estilo que otros módulos */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Indicadores Principales</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Viajes</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">{totalViajes}</p>
                    <span className="text-sm text-muted-foreground">despachos</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-primary bg-primary/10 border-primary/20">
                    <TrendingUp className="h-4 w-4" />
                    <span>Este mes</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">En Camino</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">{viajesEnCamino}</p>
                    <span className="text-sm text-muted-foreground">activos</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-500 dark:bg-amber-950/30 dark:border-amber-900/30">
                    <Truck className="h-4 w-4" />
                    <span>En tránsito</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Finalizados</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">{viajesFinalizados}</p>
                    <span className="text-sm text-muted-foreground">completados</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                    <Scale className="h-4 w-4" />
                    <span>Cerrados</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <Scale className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Gajos Totales</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">{gajosTotal.toLocaleString()}</p>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-accent bg-accent/10 border-accent/20">
                    <Package className="h-4 w-4" />
                    <span>{pesoTotal.toLocaleString()} kg</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs de filtro por estado y Grid de Viajes */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Viajes Registrados</h2>
          <p className="text-muted-foreground">Despachos de fruto hacia extractoras</p>
        </div>

        <Tabs defaultValue="Todos" className="space-y-6" onValueChange={(value) => setFiltroEstado(value as any)}>
          <TabsList className="bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="Todos">Todos</TabsTrigger>
            <TabsTrigger value="Borrador">Borrador</TabsTrigger>
            <TabsTrigger value="En Camino">En Camino</TabsTrigger>
            <TabsTrigger value="En Planta">En Planta</TabsTrigger>
            <TabsTrigger value="Finalizado">Finalizado</TabsTrigger>
            <TabsTrigger value="En Disputa">En Disputa</TabsTrigger>
          </TabsList>

          <TabsContent value={filtroEstado} className="space-y-4">
            {viajesFiltrados.length === 0 ? (
              <Card className="glass-subtle border-border">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Truck className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">No hay viajes registrados</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Comienza creando tu primer viaje de despacho
                  </p>
                  <Button onClick={() => navigate('/viajes/nuevo')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primer Viaje
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {viajesFiltrados.map((viaje) => (
                  <Card
                    key={viaje.id}
                    className="glass-subtle border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => navigate(`/viajes/${viaje.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                          <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <Badge className={getEstadoColor(viaje.estado)}>
                          <span className="flex items-center gap-1">
                            {getEstadoIcon(viaje.estado)}
                            {viaje.estado}
                          </span>
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{viaje.remisionId}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(viaje.fecha).toLocaleDateString('es-CO', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Vehículo y conductor */}
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{viaje.placaVehiculo}</span>
                        <span className="text-muted-foreground">• {viaje.conductor}</span>
                      </div>

                      {/* Lotes */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>Lotes de origen</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {viaje.lotesNombres.map((lote, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-muted/50">
                              {lote}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Gajos y Peso */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                          <p className="text-xs text-muted-foreground mb-1">Gajos</p>
                          <p className="text-lg font-bold text-primary">
                            {viaje.gajosEstimados.toLocaleString()}
                          </p>
                        </div>
                        {viaje.peso && (
                          <div className="rounded-lg bg-success/5 border border-success/10 p-3">
                            <p className="text-xs text-muted-foreground mb-1">Peso</p>
                            <p className="text-lg font-bold text-success">
                              {viaje.peso.toLocaleString()} kg
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Botón Ver Detalle */}
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/viajes/${viaje.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalle
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
