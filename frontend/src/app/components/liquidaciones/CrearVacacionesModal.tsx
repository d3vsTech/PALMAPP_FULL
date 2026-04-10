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
import { Palmtree, Calendar } from 'lucide-react';
import { Badge } from '../ui/badge';

interface Vacaciones {
  id?: string;
  colaboradorId: string;
  fechaInicio: string;
  fechaFin: string;
  diasHabiles: number;
  estado: 'Pendiente' | 'Aprobada' | 'Pagada' | 'Cancelada';
}

interface CrearVacacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  vacaciones?: Vacaciones;
  colaboradores: Array<{ id: string; nombres: string; apellidos: string; diasVacacionesDisponibles: number }>;
  onSave: (vacaciones: Vacaciones) => void;
}

export function CrearVacacionesModal({
  isOpen,
  onClose,
  vacaciones,
  colaboradores,
  onSave,
}: CrearVacacionesModalProps) {
  const [formData, setFormData] = useState<Vacaciones>({
    colaboradorId: '',
    fechaInicio: '',
    fechaFin: '',
    diasHabiles: 0,
    estado: 'Pendiente',
  });

  useEffect(() => {
    if (vacaciones) {
      setFormData(vacaciones);
    } else {
      setFormData({
        colaboradorId: '',
        fechaInicio: '',
        fechaFin: '',
        diasHabiles: 0,
        estado: 'Pendiente',
      });
    }
  }, [vacaciones, isOpen]);

  const handleInputChange = (field: keyof Vacaciones, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Calcular días hábiles (excluyendo fines de semana)
  const calcularDiasHabiles = (inicio: string, fin: string) => {
    if (!inicio || !fin) return 0;

    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);
    let diasHabiles = 0;

    const currentDate = new Date(fechaInicio);
    while (currentDate <= fechaFin) {
      const diaSemana = currentDate.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        // No es domingo (0) ni sábado (6)
        diasHabiles++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return diasHabiles;
  };

  useEffect(() => {
    if (formData.fechaInicio && formData.fechaFin) {
      const dias = calcularDiasHabiles(formData.fechaInicio, formData.fechaFin);
      setFormData((prev) => ({ ...prev, diasHabiles: dias }));
    }
  }, [formData.fechaInicio, formData.fechaFin]);

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
    if (formData.diasHabiles === 0) {
      alert('No hay días hábiles en el rango seleccionado');
      return;
    }

    const colaborador = colaboradores.find((c) => c.id === formData.colaboradorId);
    if (colaborador && formData.diasHabiles > colaborador.diasVacacionesDisponibles) {
      alert(
        `El colaborador solo tiene ${colaborador.diasVacacionesDisponibles} días disponibles`
      );
      return;
    }

    onSave(formData);
    onClose();
  };

  const colaboradorSeleccionado = colaboradores.find((c) => c.id === formData.colaboradorId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palmtree className="h-5 w-5 text-success" />
            {vacaciones ? 'Editar Solicitud de Vacaciones' : 'Nueva Solicitud de Vacaciones'}
          </DialogTitle>
          <DialogDescription>
            {vacaciones
              ? 'Modifica la solicitud de vacaciones'
              : 'Registra una nueva solicitud de vacaciones'}
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
                    {colaborador.nombres} {colaborador.apellidos} -{' '}
                    {colaborador.diasVacacionesDisponibles} días disponibles
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {colaboradorSeleccionado && (
              <p className="text-xs text-muted-foreground">
                Días disponibles:{' '}
                <span className="font-semibold text-success">
                  {colaboradorSeleccionado.diasVacacionesDisponibles}
                </span>
              </p>
            )}
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

          {formData.diasHabiles > 0 && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm">
              <p className="text-muted-foreground">
                Días hábiles solicitados:{' '}
                <span className="font-bold text-primary">{formData.diasHabiles}</span>
              </p>
              {colaboradorSeleccionado && (
                <p className="text-xs text-muted-foreground mt-1">
                  Días restantes después de aprobar:{' '}
                  <span
                    className={
                      colaboradorSeleccionado.diasVacacionesDisponibles - formData.diasHabiles >= 0
                        ? 'text-success font-semibold'
                        : 'text-destructive font-semibold'
                    }
                  >
                    {colaboradorSeleccionado.diasVacacionesDisponibles - formData.diasHabiles}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Estado (solo en edición) */}
          {vacaciones && (
            <div className="space-y-2">
              <Label htmlFor="estado" className="text-sm font-medium">
                Estado
              </Label>
              <Select
                value={formData.estado}
                onValueChange={(value: any) => handleInputChange('estado', value)}
              >
                <SelectTrigger id="estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">
                    <Badge variant="outline">Pendiente</Badge>
                  </SelectItem>
                  <SelectItem value="Aprobada">
                    <Badge className="bg-blue-500">Aprobada</Badge>
                  </SelectItem>
                  <SelectItem value="Pagada">
                    <Badge className="bg-success">Pagada</Badge>
                  </SelectItem>
                  <SelectItem value="Cancelada">
                    <Badge variant="destructive">Cancelada</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-success hover:bg-success/90">
            {vacaciones ? 'Guardar Cambios' : 'Crear Solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
