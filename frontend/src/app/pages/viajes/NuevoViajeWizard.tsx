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
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Truck,
  MapPin,
  Package,
  Trees,
} from 'lucide-react';

// Etapas del wizard
const ETAPAS = [
  { numero: 1, nombre: 'General' }
];

interface Lote {
  id: string;
  nombre: string;
}

interface Transportador {
  id: string;
  nombre: string;
  conductor: string;
  placaVehiculo: string;
}

const lotesMock: Lote[] = [
  { id: 'l1', nombre: 'Lote 1 - Norte' },
  { id: 'l2', nombre: 'Lote 2 - Sur' },
  { id: 'l3', nombre: 'Lote 3 - Este' },
  { id: 'l4', nombre: 'Lote 4 - Oeste' },
];

const transportadoresMock: Transportador[] = [
  { id: 't1', nombre: 'Transportes del Valle', conductor: 'Carlos Rodríguez', placaVehiculo: 'ABC-123' },
  { id: 't2', nombre: 'Transportes Rápidos', conductor: 'Juan Pérez', placaVehiculo: 'XYZ-789' },
  { id: 't3', nombre: 'Logística Express', conductor: 'Miguel Ángel', placaVehiculo: 'DEF-456' },
  { id: 't4', nombre: 'Carga Segura', conductor: 'Pedro López', placaVehiculo: 'GHI-321' },
];

const extractorasMock = [
  'Extractora San Miguel',
  'Extractora Santa Rosa',
  'Extractora La Palma',
];

export default function NuevoViajeWizard() {
  const navigate = useNavigate();
  const [etapaActual, setEtapaActual] = useState(1);

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    placaVehiculo: '',
    conductor: '',
    transportador: '',
    extractora: '',
    horaSalida: '',
    lotesSeleccionados: [] as string[],
    gajosEstimados: '',
    peso: '',
    observaciones: '',
  });

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTransportadorChange = (transportadorId: string) => {
    const transportador = transportadoresMock.find(t => t.id === transportadorId);
    if (transportador) {
      setFormData(prev => ({
        ...prev,
        transportador: transportadorId,
        conductor: transportador.conductor,
        placaVehiculo: transportador.placaVehiculo
      }));
    }
  };

  const toggleLote = (loteId: string) => {
    setFormData(prev => ({
      ...prev,
      lotesSeleccionados: prev.lotesSeleccionados.includes(loteId)
        ? prev.lotesSeleccionados.filter(id => id !== loteId)
        : [...prev.lotesSeleccionados, loteId]
    }));
  };

  const getLoteNombre = (loteId: string) => {
    return lotesMock.find(l => l.id === loteId)?.nombre || loteId;
  };

  // Navegación
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

  // Validación
  const puedeGuardar = formData.fecha !== '' && formData.placaVehiculo.trim() !== '' &&
                       formData.conductor.trim() !== '' && formData.transportador.trim() !== '' &&
                       formData.extractora !== '' && formData.horaSalida !== '';

  const guardarViaje = () => {
    console.log('Guardar viaje:', formData);
    navigate('/viajes');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/viajes')}
              className="rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold text-foreground">Nuevo Viaje</h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Registra un nuevo despacho de fruto
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="max-w-5xl mx-auto">
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Información General</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Datos básicos del viaje
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha del Viaje *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleInputChange('fecha', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportador">Transportador *</Label>
                <Select
                  value={formData.transportador}
                  onValueChange={handleTransportadorChange}
                >
                  <SelectTrigger id="transportador">
                    <SelectValue placeholder="Seleccionar transportador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {transportadoresMock.map((transportador) => (
                      <SelectItem key={transportador.id} value={transportador.id}>
                        {transportador.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conductor">Conductor *</Label>
                <Input
                  id="conductor"
                  placeholder="Selecciona un transportador primero"
                  value={formData.conductor}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="placaVehiculo">Placa del Vehículo *</Label>
                <Input
                  id="placaVehiculo"
                  placeholder="Selecciona un transportador primero"
                  value={formData.placaVehiculo}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="extractora">Extractora Destino *</Label>
                <Select
                  value={formData.extractora}
                  onValueChange={(value) => handleInputChange('extractora', value)}
                >
                  <SelectTrigger id="extractora">
                    <SelectValue placeholder="Seleccionar extractora..." />
                  </SelectTrigger>
                  <SelectContent>
                    {extractorasMock.map((extractora) => (
                      <SelectItem key={extractora} value={extractora}>
                        {extractora}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="horaSalida">Hora de Salida *</Label>
                <Input
                  id="horaSalida"
                  type="time"
                  value={formData.horaSalida}
                  onChange={(e) => handleInputChange('horaSalida', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => navigate('/viajes')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancelar
          </Button>

          <Button
            onClick={guardarViaje}
            disabled={!puedeGuardar}
            className="gap-2 bg-success hover:bg-success/90"
          >
            <Check className="h-4 w-4" />
            Crear Viaje
          </Button>
        </div>
      </div>
    </div>
  );
}