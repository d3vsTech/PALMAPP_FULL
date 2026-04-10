import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import {
  ArrowLeft,
  Truck,
  User,
  MapPin,
  Scale,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Edit,
  Download
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

// Mock data - en producción vendría del backend
const viajesMock: Viaje[] = [
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
    observaciones: 'Salida a las 6:00 AM. Ruta en buen estado.',
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
    observaciones: 'Viaje completado sin novedades',
    fechaCreacion: '2026-03-08T05:00:00',
    fechaEnCamino: '2026-03-08T05:30:00',
    fechaEnPlanta: '2026-03-08T08:15:00',
    fechaFinalizado: '2026-03-08T10:30:00',
  },
];

export default function DetalleViaje() {
  const navigate = useNavigate();
  const { id } = useParams();
  const viaje = viajesMock.find(v => v.id === id);

  const [observaciones, setObservaciones] = useState(viaje?.observaciones || '');
  const [estadoActual, setEstadoActual] = useState<EstadoViaje>(viaje?.estado || 'Borrador');

  if (!viaje) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Viaje no encontrado</p>
        <Button onClick={() => navigate('/viajes')} className="mt-4">
          Volver a Viajes
        </Button>
      </div>
    );
  }

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

  const handleCambiarEstado = (nuevoEstado: EstadoViaje) => {
    setEstadoActual(nuevoEstado);
    console.log('Cambiar estado a:', nuevoEstado);
  };

  const handleEditar = () => {
    navigate(`/viajes/editar/${id}`);
  };

  const handleExportar = () => {
    console.log('Exportar viaje:', id);
  };

  // Timeline states
  const timelineSteps = [
    { 
      estado: 'Borrador', 
      label: 'Borrador', 
      icon: FileText, 
      fecha: viaje.fechaCreacion,
      completado: ['Borrador', 'En Camino', 'En Planta', 'Finalizado'].includes(estadoActual)
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
      icon: MapPin, 
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
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/viajes">Viajes</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{viaje.remisionId}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/viajes')}
            className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-foreground">
                Viaje {viaje.remisionId}
              </h1>
              <Badge className={getEstadoColor(estadoActual)}>
                {estadoActual}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {new Date(viaje.fecha).toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleEditar}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            onClick={handleExportar}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Contenido Principal - Dos Columnas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna Izquierda - Información del Viaje */}
        <div className="space-y-6">
          <Card className="glass-subtle border-border shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Información del Viaje</CardTitle>
                  <CardDescription>Detalles del despacho</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Placa y Conductor */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    <span>Placa del Vehículo</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{viaje.placaVehiculo}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Conductor</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{viaje.conductor}</p>
                </div>
              </div>

              {/* Lotes de Origen */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Lotes de Origen</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viaje.lotesNombres.map((lote, index) => (
                    <Badge key={index} variant="outline" className="bg-primary/5 border-primary/20">
                      {lote}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Extractora */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Destino</span>
                </div>
                <p className="text-lg font-semibold text-foreground">{viaje.extractora}</p>
              </div>

              {/* Gajos y Peso - Destacados */}
              <div className="grid gap-4 md:grid-cols-2 pt-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6 text-center">
                    <Package className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">Gajos Enviados</p>
                    <p className="text-4xl font-bold text-primary">
                      {viaje.gajosEstimados.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>

                {viaje.peso && (
                  <Card className="border-success/20 bg-success/5">
                    <CardContent className="pt-6 text-center">
                      <Scale className="h-8 w-8 text-success mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">Peso Total</p>
                      <p className="text-4xl font-bold text-success">
                        {viaje.peso.toLocaleString()}
                        <span className="text-xl ml-1">kg</span>
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botones de cambio de estado */}
          <Card className="glass-subtle border-border">
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
              <CardDescription>Actualizar estado del viaje</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {estadoActual === 'Borrador' && (
                <Button
                  onClick={() => handleCambiarEstado('En Camino')}
                  className="w-full gap-2 bg-amber-500 hover:bg-amber-600"
                >
                  <Truck className="h-4 w-4" />
                  Cambiar a En Camino
                </Button>
              )}
              
              {estadoActual === 'En Camino' && (
                <Button
                  onClick={() => handleCambiarEstado('En Planta')}
                  className="w-full gap-2 bg-blue-500 hover:bg-blue-600"
                >
                  <MapPin className="h-4 w-4" />
                  Marcar En Planta
                </Button>
              )}

              {estadoActual === 'En Planta' && (
                <Button
                  onClick={() => handleCambiarEstado('Finalizado')}
                  className="w-full gap-2 bg-success hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4" />
                  Finalizar Viaje
                </Button>
              )}

              {estadoActual !== 'Finalizado' && estadoActual !== 'En Disputa' && (
                <Button
                  variant="outline"
                  onClick={() => handleCambiarEstado('En Disputa')}
                  className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Marcar en Disputa
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha - Timeline del Viaje */}
        <div className="space-y-6">
          <Card className="glass-subtle border-border shadow-lg min-h-[650px]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/20">
                  <Clock className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <CardTitle>Timeline del Viaje</CardTitle>
                  <CardDescription>Estado y progreso del despacho</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative space-y-10">
                {/* Línea vertical */}
                <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-border" />

                {timelineSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = step.estado === estadoActual;
                  const isCompleted = step.completado;

                  return (
                    <div key={step.estado} className="relative flex gap-4">
                      {/* Círculo del estado */}
                      <div
                        className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 ${
                          isCompleted
                            ? 'bg-success border-success/20 shadow-lg shadow-success/20'
                            : 'bg-muted border-border'
                        } ${isActive ? 'ring-4 ring-primary/20' : ''}`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-6 w-6 text-white" />
                        ) : (
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Contenido del estado */}
                      <div className="flex-1 pb-8">
                        <div
                          className={`rounded-lg border p-4 ${
                            isActive
                              ? 'bg-primary/5 border-primary/30'
                              : isCompleted
                              ? 'bg-success/5 border-success/20'
                              : 'bg-muted/20 border-border'
                          }`}
                        >
                          <h3
                            className={`font-semibold mb-1 ${
                              isCompleted ? 'text-success' : isActive ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            {step.label}
                          </h3>
                          {step.fecha && (
                            <p className="text-sm text-muted-foreground">
                              {new Date(step.fecha).toLocaleString('es-CO', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                          {!step.fecha && !isCompleted && (
                            <p className="text-sm text-muted-foreground">Pendiente</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Estado En Disputa (si aplica) */}
                {estadoActual === 'En Disputa' && (
                  <div className="relative flex gap-4">
                    <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 bg-destructive border-destructive/20 shadow-lg shadow-destructive/20">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="rounded-lg border p-4 bg-destructive/5 border-destructive/30">
                        <h3 className="font-semibold mb-1 text-destructive">En Disputa</h3>
                        <p className="text-sm text-muted-foreground">
                          Requiere revisión y resolución
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Observaciones y Novedades */}
      <Card className="glass-subtle border-border">
        <CardHeader>
          <CardTitle>Observaciones y Novedades</CardTitle>
          <CardDescription>Notas adicionales sobre el viaje</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Agregar observaciones sobre el viaje..."
            rows={5}
            className="resize-none"
          />
          <div className="flex justify-end mt-4">
            <Button onClick={() => console.log('Guardar observaciones')}>
              Guardar Observaciones
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}