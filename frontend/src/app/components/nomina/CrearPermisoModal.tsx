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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ClipboardList, Calendar, DollarSign } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';

interface Permiso {
  id?: string;
  colaboradorId: string;
  fechaInicio: string;
  fechaFin: string;
  tipo: 'Remunerado' | 'No Remunerado';
  valorJornal?: number;
  motivo: string;
}

interface CrearPermisoModalProps {
  isOpen: boolean;
  onClose: () => void;
  permiso?: Permiso;
  colaboradores: Array<{ id: string; nombres: string; apellidos: string; salarioBase: number }>;
  onSave: (permiso: Permiso) => void;
}

export function CrearPermisoModal({
  isOpen,
  onClose,
  permiso,
  colaboradores,
  onSave,
}: CrearPermisoModalProps) {
  const [formData, setFormData] = useState<Permiso>({
    colaboradorId: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    tipo: 'No Remunerado',
    valorJornal: 0,
    motivo: '',
  });

  useEffect(() => {
    if (permiso) {
      setFormData(permiso);
    } else {
      setFormData({
        colaboradorId: '',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaFin: new Date().toISOString().split('T')[0],
        tipo: 'No Remunerado',
        valorJornal: 0,
        motivo: '',
      });
    }
  }, [permiso, isOpen]);

  const handleInputChange = (field: keyof Permiso, value: string | number) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      
      // Si cambia a No Remunerado, limpiar el valor del jornal
      if (field === 'tipo' && value === 'No Remunerado') {
        newData.valorJornal = 0;
      }
      
      return newData;
    });
  };

  const handleSave = () => {
    if (!formData.colaboradorId) {
      alert('Debes seleccionar un colaborador');
      return;
    }
    if (!formData.fechaInicio || !formData.fechaFin) {
      alert('Las fechas son obligatorias');
      return;
    }
    if (new Date(formData.fechaFin) < new Date(formData.fechaInicio)) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }
    if (formData.tipo === 'Remunerado' && (!formData.valorJornal || formData.valorJornal <= 0)) {
      alert('El valor del jornal es obligatorio para permisos remunerados');
      return;
    }

    onSave(formData);
    onClose();
  };

  const colaboradorSeleccionado = colaboradores.find((c) => c.id === formData.colaboradorId);

  // Calcular días del permiso
  const calcularDias = () => {
    if (formData.fechaInicio && formData.fechaFin) {
      const inicio = new Date(formData.fechaInicio);
      const fin = new Date(formData.fechaFin);
      const diffTime = Math.abs(fin.getTime() - inicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const diasPermiso = calcularDias();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {permiso ? 'Editar Permiso' : 'Registrar Permiso'}
          </DialogTitle>
          <DialogDescription>
            {permiso
              ? 'Modifica la información del permiso'
              : 'Registra un permiso laboral'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Colaborador */}
          <div className="space-y-2">
            <Label htmlFor="colaborador" className="text-sm font-medium">
              Colaborador <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.colaboradorId}
              onValueChange={(value) => handleInputChange('colaboradorId', value)}
            >
              <SelectTrigger id="colaborador">
                <SelectValue placeholder="Selecciona un colaborador" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((colaborador) => (
                  <SelectItem key={colaborador.id} value={colaborador.id}>
                    {colaborador.nombres} {colaborador.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Fecha Inicio */}
            <div className="space-y-2">
              <Label htmlFor="fechaInicio" className="text-sm font-medium">
                Fecha Inicio <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fechaInicio"
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => handleInputChange('fechaInicio', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Fecha Fin */}
            <div className="space-y-2">
              <Label htmlFor="fechaFin" className="text-sm font-medium">
                Fecha Fin <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fechaFin"
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => handleInputChange('fechaFin', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {diasPermiso > 0 && (
            <div className="text-sm text-muted-foreground">
              Duración: <span className="font-semibold text-foreground">{diasPermiso} día{diasPermiso > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Tipo de Permiso */}
          <div className="space-y-2">
            <Label htmlFor="tipo" className="text-sm font-medium">
              Tipo de Permiso <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.tipo}
              onValueChange={(value) => handleInputChange('tipo', value)}
            >
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No Remunerado">
                  <div className="flex items-center gap-2">
                    No Remunerado
                    <Badge variant="outline" className="text-xs">Sin pago</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="Remunerado">
                  <div className="flex items-center gap-2">
                    Remunerado
                    <Badge variant="outline" className="text-xs bg-success/10 text-success">Con pago</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Valor Jornal (solo si es remunerado) */}
          {formData.tipo === 'Remunerado' && (
            <div className="space-y-2">
              <Label htmlFor="valorJornal" className="text-sm font-medium">
                Valor del Jornal <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="valorJornal"
                  type="number"
                  placeholder="86666"
                  value={formData.valorJornal || ''}
                  onChange={(e) => handleInputChange('valorJornal', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
              {formData.valorJornal && formData.valorJornal > 0 && (
                <p className="text-xs text-muted-foreground">
                  ${formData.valorJornal.toLocaleString('es-CO')} × {diasPermiso} día{diasPermiso > 1 ? 's' : ''} ={' '}
                  <span className="font-semibold text-success">
                    ${(formData.valorJornal * diasPermiso).toLocaleString('es-CO')}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-sm font-medium">
              Motivo
            </Label>
            <Textarea
              id="motivo"
              placeholder="Calamidad doméstica, cita médica, etc."
              value={formData.motivo}
              onChange={(e) => handleInputChange('motivo', e.target.value)}
              rows={2}
            />
          </div>

          {/* Resumen */}
          {colaboradorSeleccionado && diasPermiso > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <p className="text-muted-foreground">
                Permiso <Badge variant="secondary" className="ml-1">{formData.tipo}</Badge>
              </p>
              <p className="font-semibold text-foreground">
                {colaboradorSeleccionado.nombres} {colaboradorSeleccionado.apellidos}
              </p>
              <p className="text-muted-foreground">
                {diasPermiso} día{diasPermiso > 1 ? 's' : ''}
                {formData.tipo === 'Remunerado' && formData.valorJornal && formData.valorJornal > 0 && (
                  <span className="ml-2 text-success font-semibold">
                    (${(formData.valorJornal * diasPermiso).toLocaleString('es-CO')})
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            {permiso ? 'Guardar Cambios' : 'Registrar Permiso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
