import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Truck, Calendar, Package, Scale, MapPin } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Card, CardContent } from '../ui/card';

interface CrearViajeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (viaje: any) => void;
  lotes: Array<{ id: string; nombre: string }>;
}

const extractoras = [
  'Extractora San Miguel',
  'Extractora Santa Rosa',
  'Extractora El Palmar',
  'Extractora La Esperanza',
];

export function CrearViajeModal({
  isOpen,
  onClose,
  onSave,
  lotes,
}: CrearViajeModalProps) {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    placaVehiculo: '',
    conductor: '',
    lotes: [] as string[],
    gajosEstimados: 0,
    peso: undefined as number | undefined,
    extractora: '',
    observaciones: '',
  });

  useEffect(() => {
    if (isOpen) {
      // Generar ID de remisión
      const año = new Date().getFullYear();
      const remisionId = `REM-${año}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
      
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        placaVehiculo: '',
        conductor: '',
        lotes: [],
        gajosEstimados: 0,
        peso: undefined,
        extractora: '',
        observaciones: '',
      });
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLoteToggle = (loteId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      lotes: checked
        ? [...prev.lotes, loteId]
        : prev.lotes.filter((l) => l !== loteId),
    }));
  };

  const handleSave = () => {
    if (!formData.fecha) {
      alert('La fecha es obligatoria');
      return;
    }
    if (!formData.placaVehiculo) {
      alert('La placa del vehículo es obligatoria');
      return;
    }
    if (!formData.conductor) {
      alert('El conductor es obligatorio');
      return;
    }
    if (formData.lotes.length === 0) {
      alert('Debes seleccionar al menos un lote');
      return;
    }
    if (!formData.gajosEstimados || formData.gajosEstimados <= 0) {
      alert('Los gajos estimados deben ser mayores a 0');
      return;
    }
    if (!formData.extractora) {
      alert('La extractora es obligatoria');
      return;
    }

    // Generar ID de remisión
    const año = new Date().getFullYear();
    const remisionId = `REM-${año}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

    const lotesNombres = lotes
      .filter((l) => formData.lotes.includes(l.id))
      .map((l) => l.nombre);

    onSave({
      ...formData,
      remisionId,
      lotesNombres,
      estado: 'Borrador',
      fechaCreacion: new Date().toISOString(),
    });
  };

  const lotesSeleccionados = lotes.filter((l) => formData.lotes.includes(l.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Nuevo Viaje de Despacho
          </DialogTitle>
          <DialogDescription>
            Crea una nueva remisión de despacho de fruto hacia la extractora
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Información Básica
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Fecha */}
              <div className="space-y-2">
                <Label htmlFor="fecha" className="text-sm font-medium">
                  Fecha <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => handleInputChange('fecha', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Extractora */}
              <div className="space-y-2">
                <Label htmlFor="extractora" className="text-sm font-medium">
                  Extractora Destino <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                  <Select
                    value={formData.extractora}
                    onValueChange={(value) => handleInputChange('extractora', value)}
                  >
                    <SelectTrigger id="extractora" className="pl-9">
                      <SelectValue placeholder="Seleccionar extractora" />
                    </SelectTrigger>
                    <SelectContent>
                      {extractoras.map((extractora) => (
                        <SelectItem key={extractora} value={extractora}>
                          {extractora}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Vehículo y Conductor */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Vehículo y Conductor
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Placa Vehículo */}
              <div className="space-y-2">
                <Label htmlFor="placa" className="text-sm font-medium">
                  Placa del Vehículo <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="placa"
                    type="text"
                    placeholder="ABC-123"
                    value={formData.placaVehiculo}
                    onChange={(e) =>
                      handleInputChange('placaVehiculo', e.target.value.toUpperCase())
                    }
                    className="pl-9 uppercase"
                    maxLength={8}
                  />
                </div>
              </div>

              {/* Conductor */}
              <div className="space-y-2">
                <Label htmlFor="conductor" className="text-sm font-medium">
                  Conductor <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="conductor"
                  type="text"
                  placeholder="Nombre del conductor"
                  value={formData.conductor}
                  onChange={(e) => handleInputChange('conductor', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Lotes de Origen */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Lotes de Origen <span className="text-destructive">*</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/20">
              {lotes.map((lote) => (
                <div key={lote.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`lote-${lote.id}`}
                    checked={formData.lotes.includes(lote.id)}
                    onCheckedChange={(checked) =>
                      handleLoteToggle(lote.id, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`lote-${lote.id}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {lote.nombre}
                  </label>
                </div>
              ))}
            </div>

            {lotesSeleccionados.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Seleccionados: {lotesSeleccionados.map((l) => l.nombre).join(', ')}
              </div>
            )}
          </div>

          {/* Carga */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Información de Carga
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Gajos Estimados */}
              <div className="space-y-2">
                <Label htmlFor="gajos" className="text-sm font-medium">
                  Gajos Estimados <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="gajos"
                    type="number"
                    placeholder="850"
                    value={formData.gajosEstimados || ''}
                    onChange={(e) =>
                      handleInputChange('gajosEstimados', parseInt(e.target.value) || 0)
                    }
                    className="pl-9"
                  />
                </div>
                {formData.gajosEstimados > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.gajosEstimados.toLocaleString()} gajos
                  </p>
                )}
              </div>

              {/* Peso (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="peso" className="text-sm font-medium">
                  Peso (kg) <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <div className="relative">
                  <Scale className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="peso"
                    type="number"
                    placeholder="12500"
                    value={formData.peso || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleInputChange('peso', value ? parseFloat(value) : undefined);
                    }}
                    className="pl-9"
                  />
                </div>
                {formData.peso && formData.peso > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.peso.toLocaleString()} kg ({(formData.peso / 1000).toFixed(2)} toneladas)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones" className="text-sm font-medium">
              Observaciones
            </Label>
            <Textarea
              id="observaciones"
              placeholder="Notas adicionales sobre el viaje..."
              value={formData.observaciones}
              onChange={(e) => handleInputChange('observaciones', e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {formData.placaVehiculo &&
            formData.gajosEstimados > 0 &&
            formData.lotes.length > 0 && (
              <Card className="bg-primary/5 border-primary/30">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-semibold mb-3">Resumen del Viaje</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehículo:</span>
                      <span className="font-semibold">{formData.placaVehiculo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conductor:</span>
                      <span className="font-semibold">{formData.conductor || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lotes:</span>
                      <span className="font-semibold">{lotesSeleccionados.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gajos:</span>
                      <span className="font-semibold text-primary">
                        {formData.gajosEstimados.toLocaleString()}
                      </span>
                    </div>
                    {formData.peso && formData.peso > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Peso:</span>
                        <span className="font-semibold text-success">
                          {formData.peso.toLocaleString()} kg
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Destino:</span>
                      <span className="font-semibold">{formData.extractora || '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Crear Viaje
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
