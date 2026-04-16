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
import {
  Truck,
  Calendar,
  Package,
  Scale,
  MapPin,
  CheckCircle,
  Clock,
  AlertTriangle,
  Edit,
  Save,
} from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import type { EstadoViaje } from '../../pages/viajes/Viajes';

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

interface DetalleViajeModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaje: Viaje;
  onSave: (viaje: any) => void;
  lotes: Array<{ id: string; nombre: string }>;
}

const extractoras = [
  'Extractora San Miguel',
  'Extractora Santa Rosa',
  'Extractora El Palmar',
  'Extractora La Esperanza',
];

const estadosOrden: EstadoViaje[] = ['Borrador', 'En Camino', 'En Planta', 'Finalizado'];

export function DetalleViajeModal({
  isOpen,
  onClose,
  viaje,
  onSave,
  lotes,
}: DetalleViajeModalProps) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [formData, setFormData] = useState(viaje);

  useEffect(() => {
    setFormData(viaje);
    setModoEdicion(false);
  }, [viaje, isOpen]);

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

  const handleCambiarEstado = (nuevoEstado: EstadoViaje) => {
    const ahora = new Date().toISOString();
    const updates: any = { estado: nuevoEstado };

    // Actualizar timestamps según el estado
    if (nuevoEstado === 'En Camino' && !formData.fechaEnCamino) {
      updates.fechaEnCamino = ahora;
    } else if (nuevoEstado === 'En Planta' && !formData.fechaEnPlanta) {
      updates.fechaEnPlanta = ahora;
    } else if (nuevoEstado === 'Finalizado' && !formData.fechaFinalizado) {
      updates.fechaFinalizado = ahora;
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    if (!formData.placaVehiculo || !formData.conductor || formData.lotes.length === 0) {
      alert('Todos los campos obligatorios deben estar completos');
      return;
    }

    const lotesNombres = lotes
      .filter((l) => formData.lotes.includes(l.id))
      .map((l) => l.nombre);

    onSave({
      ...formData,
      lotesNombres,
    });
    setModoEdicion(false);
  };

  const getEstadoColor = (estado: EstadoViaje) => {
    switch (estado) {
      case 'Borrador':
        return 'bg-muted text-muted-foreground';
      case 'En Camino':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
      case 'En Planta':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'Finalizado':
        return 'bg-success/10 text-success';
      case 'En Disputa':
        return 'bg-destructive/10 text-destructive';
    }
  };

  const getEstadoIcon = (estado: EstadoViaje) => {
    switch (estado) {
      case 'Borrador':
        return <Package className="h-4 w-4" />;
      case 'En Camino':
        return <Truck className="h-4 w-4" />;
      case 'En Planta':
        return <MapPin className="h-4 w-4" />;
      case 'Finalizado':
        return <CheckCircle className="h-4 w-4" />;
      case 'En Disputa':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatearFecha = (fecha?: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {viaje.remisionId}
            </DialogTitle>
            <Badge className={getEstadoColor(formData.estado)}>
              <span className="flex items-center gap-1">
                {getEstadoIcon(formData.estado)}
                {formData.estado}
              </span>
            </Badge>
          </div>
          <DialogDescription>
            Detalle y gestión del viaje de despacho
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Timeline de Estados */}
          <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Timeline del Viaje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Borrador */}
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      formData.fechaCreacion
                        ? 'bg-success/10 border-success text-success'
                        : 'bg-muted border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Creado (Borrador)</p>
                    <p className="text-xs text-muted-foreground">
                      {formatearFecha(formData.fechaCreacion)}
                    </p>
                  </div>
                </div>

                {/* En Camino */}
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      formData.fechaEnCamino
                        ? 'bg-success/10 border-success text-success'
                        : 'bg-muted border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">En Camino</p>
                    <p className="text-xs text-muted-foreground">
                      {formatearFecha(formData.fechaEnCamino)}
                    </p>
                  </div>
                </div>

                {/* En Planta */}
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      formData.fechaEnPlanta
                        ? 'bg-success/10 border-success text-success'
                        : 'bg-muted border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">En Planta</p>
                    <p className="text-xs text-muted-foreground">
                      {formatearFecha(formData.fechaEnPlanta)}
                    </p>
                  </div>
                </div>

                {/* Finalizado */}
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      formData.fechaFinalizado
                        ? 'bg-success/10 border-success text-success'
                        : 'bg-muted border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Finalizado</p>
                    <p className="text-xs text-muted-foreground">
                      {formatearFecha(formData.fechaFinalizado)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cambiar Estado */}
              {formData.estado !== 'Finalizado' && formData.estado !== 'En Disputa' && (
                <div className="mt-6 pt-4 border-t">
                  <Label className="text-sm font-medium mb-2 block">Cambiar Estado</Label>
                  <div className="flex gap-2 flex-wrap">
                    {estadosOrden.map((estado) => {
                      const indexActual = estadosOrden.indexOf(formData.estado);
                      const indexEstado = estadosOrden.indexOf(estado);
                      const esAvance = indexEstado === indexActual + 1;

                      if (esAvance) {
                        return (
                          <Button
                            key={estado}
                            size="sm"
                            onClick={() => handleCambiarEstado(estado)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            Marcar como {estado}
                          </Button>
                        );
                      }
                      return null;
                    })}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCambiarEstado('En Disputa')}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Reportar Disputa
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Información del Viaje */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Información del Viaje</h3>
              {!modoEdicion ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModoEdicion(true)}
                  disabled={formData.estado === 'Finalizado'}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setModoEdicion(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Fecha */}
              <div className="space-y-2">
                <Label className="text-sm">Fecha</Label>
                {modoEdicion ? (
                  <Input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => handleInputChange('fecha', e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {new Date(formData.fecha).toLocaleDateString('es-CO')}
                  </p>
                )}
              </div>

              {/* Extractora */}
              <div className="space-y-2">
                <Label className="text-sm">Extractora Destino</Label>
                {modoEdicion ? (
                  <Select
                    value={formData.extractora}
                    onValueChange={(value) => handleInputChange('extractora', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {extractoras.map((extractora) => (
                        <SelectItem key={extractora} value={extractora}>
                          {extractora}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium">{formData.extractora}</p>
                )}
              </div>

              {/* Placa */}
              <div className="space-y-2">
                <Label className="text-sm">Placa del Vehículo</Label>
                {modoEdicion ? (
                  <Input
                    value={formData.placaVehiculo}
                    onChange={(e) =>
                      handleInputChange('placaVehiculo', e.target.value.toUpperCase())
                    }
                    className="uppercase"
                  />
                ) : (
                  <p className="text-sm font-medium">{formData.placaVehiculo}</p>
                )}
              </div>

              {/* Conductor */}
              <div className="space-y-2">
                <Label className="text-sm">Conductor</Label>
                {modoEdicion ? (
                  <Input
                    value={formData.conductor}
                    onChange={(e) => handleInputChange('conductor', e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium">{formData.conductor}</p>
                )}
              </div>

              {/* Gajos */}
              <div className="space-y-2">
                <Label className="text-sm">Gajos Estimados</Label>
                {modoEdicion ? (
                  <Input
                    type="number"
                    value={formData.gajosEstimados}
                    onChange={(e) =>
                      handleInputChange('gajosEstimados', parseInt(e.target.value) || 0)
                    }
                  />
                ) : (
                  <p className="text-sm font-medium text-primary">
                    {formData.gajosEstimados.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Peso */}
              <div className="space-y-2">
                <Label className="text-sm">Peso (kg)</Label>
                {modoEdicion ? (
                  <Input
                    type="number"
                    value={formData.peso || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleInputChange('peso', value ? parseFloat(value) : undefined);
                    }}
                    placeholder="Opcional"
                  />
                ) : (
                  <p className="text-sm font-medium text-success">
                    {formData.peso
                      ? `${formData.peso.toLocaleString()} kg`
                      : 'No registrado'}
                  </p>
                )}
              </div>
            </div>

            {/* Lotes */}
            <div className="space-y-2">
              <Label className="text-sm">Lotes de Origen</Label>
              {modoEdicion ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/20">
                  {lotes.map((lote) => (
                    <div key={lote.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`lote-edit-${lote.id}`}
                        checked={formData.lotes.includes(lote.id)}
                        onCheckedChange={(checked) =>
                          handleLoteToggle(lote.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`lote-edit-${lote.id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {lote.nombre}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.lotesNombres.map((nombre, index) => (
                    <Badge key={index} variant="outline">
                      {nombre}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label className="text-sm">Observaciones</Label>
              {modoEdicion ? (
                <Textarea
                  value={formData.observaciones || ''}
                  onChange={(e) => handleInputChange('observaciones', e.target.value)}
                  rows={3}
                  placeholder="Notas adicionales..."
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {formData.observaciones || 'Sin observaciones'}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}