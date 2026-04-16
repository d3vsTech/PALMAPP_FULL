import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
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
import { colaboradores, lotes as lotesData, sublotes } from '../../lib/mockData';
import { toast } from 'sonner';

const ETAPAS = [
  { numero: 1, nombre: 'Info. Viaje' },
  { numero: 2, nombre: 'Cosecha' },
];

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

export default function ConteoCosecha() {
  const navigate = useNavigate();
  const location = useLocation();
  const viaje = location.state?.viaje;

  const [etapaActual, setEtapaActual] = useState(1);
  const [cosechas, setCosechas] = useState<CosechaConteo[]>([]);

  useEffect(() => {
    if (!viaje) {
      navigate('/viajes');
    }
  }, [viaje, navigate]);

  if (!viaje) {
    return null;
  }

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

  const finalizarConteo = () => {
    console.log('Finalizar conteo:', { viaje, cosechas });
    // Cambiar el estado del viaje a "En Camino"
    // En un sistema real, aquí se haría una llamada a la API para actualizar el estado
    // Por ejemplo: await api.updateViajeEstado(viaje.id, 'En Camino', { cosechas });

    // Mostrar mensaje de éxito
    toast.success('Conteo registrado exitosamente', {
      description: 'El viaje ahora está en camino hacia la extractora.',
    });

    navigate('/viajes');
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
                          Registra las cosechas del viaje
                        </p>
                      </div>
                    </div>
                    <Button onClick={agregarCosecha} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Agregar Cosecha
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cosechas.map((cosecha) => (
                    <Card key={cosecha.id} className="border-border">
                      <CardContent className="pt-6 space-y-4">
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
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Planilla / Cosecha</Label>
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
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label>Colaboradores</Label>
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
                          </div>

                          <div className="space-y-2">
                            <Label>Sublote</Label>
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
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Peso en kg (opcional)</Label>
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