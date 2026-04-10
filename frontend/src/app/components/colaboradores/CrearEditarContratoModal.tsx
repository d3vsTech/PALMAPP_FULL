import { useState, useEffect, useRef } from 'react';
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
import { FileText, Upload, X, FileCheck } from 'lucide-react';
import { Badge } from '../ui/badge';

interface Contrato {
  id?: string;
  colaboradorId: string;
  colaboradorNombre?: string;
  fechaInicio: string;
  fechaTerminacion: string;
  modalidad: string;
  archivoNombre?: string;
  archivoUrl?: string;
  estado?: 'Vigente' | 'Terminado';
}

interface CrearEditarContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contrato?: Contrato;
  colaboradores: Array<{ id: string; nombres: string; apellidos: string; cedula: string }>;
  onSave: (contrato: Contrato, archivo?: File) => void;
}

const modalidadesContrato = [
  'Término Indefinido',
  'Término Fijo',
  'Obra o Labor',
  'Prestación de Servicios',
  'Temporal',
];

export function CrearEditarContratoModal({
  isOpen,
  onClose,
  contrato,
  colaboradores,
  onSave,
}: CrearEditarContratoModalProps) {
  const [formData, setFormData] = useState<Contrato>({
    colaboradorId: '',
    fechaInicio: '',
    fechaTerminacion: '',
    modalidad: 'Término Indefinido',
  });

  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoNombreExistente, setArchivoNombreExistente] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contrato) {
      setFormData(contrato);
      setArchivoNombreExistente(contrato.archivoNombre || '');
      setArchivo(null);
    } else {
      setFormData({
        colaboradorId: '',
        fechaInicio: '',
        fechaTerminacion: '',
        modalidad: 'Término Indefinido',
      });
      setArchivo(null);
      setArchivoNombreExistente('');
    }
  }, [contrato, isOpen]);

  const handleInputChange = (field: keyof Contrato, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar que sea PDF
      if (file.type !== 'application/pdf') {
        alert('Solo se permiten archivos PDF');
        return;
      }
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo no puede superar los 10MB');
        return;
      }
      setArchivo(file);
    }
  };

  const handleRemoveFile = () => {
    setArchivo(null);
    setArchivoNombreExistente('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    // Validaciones
    if (!formData.colaboradorId) {
      alert('Debes seleccionar un colaborador');
      return;
    }
    if (!formData.fechaInicio) {
      alert('La fecha de inicio es obligatoria');
      return;
    }
    if (!formData.fechaTerminacion) {
      alert('La fecha de terminación es obligatoria');
      return;
    }
    if (new Date(formData.fechaTerminacion) <= new Date(formData.fechaInicio)) {
      alert('La fecha de terminación debe ser posterior a la fecha de inicio');
      return;
    }
    if (!archivo && !archivoNombreExistente) {
      alert('Debes adjuntar el documento del contrato en PDF');
      return;
    }

    onSave(formData, archivo || undefined);
    handleClose();
  };

  const handleClose = () => {
    setArchivo(null);
    setArchivoNombreExistente('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const colaboradorSeleccionado = colaboradores.find((c) => c.id === formData.colaboradorId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {contrato ? 'Editar Contrato' : 'Nuevo Contrato de Trabajo'}
          </DialogTitle>
          <DialogDescription>
            {contrato
              ? 'Modifica la información del contrato laboral'
              : 'Registra un nuevo contrato de trabajo'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selector de Colaborador */}
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
                    {colaborador.nombres} {colaborador.apellidos} - {colaborador.cedula}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {colaboradorSeleccionado && (
              <div className="text-xs text-muted-foreground">
                Documento: {colaboradorSeleccionado.cedula}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Fecha de Inicio */}
            <div className="space-y-2">
              <Label htmlFor="fechaInicio" className="text-sm font-medium">
                Fecha de Inicio <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fechaInicio"
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => handleInputChange('fechaInicio', e.target.value)}
              />
            </div>

            {/* Fecha de Terminación */}
            <div className="space-y-2">
              <Label htmlFor="fechaTerminacion" className="text-sm font-medium">
                Fecha de Terminación <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fechaTerminacion"
                type="date"
                value={formData.fechaTerminacion}
                onChange={(e) => handleInputChange('fechaTerminacion', e.target.value)}
              />
            </div>
          </div>

          {/* Modalidad de Contrato */}
          <div className="space-y-2">
            <Label htmlFor="modalidad" className="text-sm font-medium">
              Modalidad de Contrato <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.modalidad}
              onValueChange={(value) => handleInputChange('modalidad', value)}
            >
              <SelectTrigger id="modalidad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modalidadesContrato.map((modalidad) => (
                  <SelectItem key={modalidad} value={modalidad}>
                    {modalidad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Adjuntar Documento */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Documento del Contrato (PDF) <span className="text-destructive">*</span>
            </Label>
            
            {/* Archivo existente o nuevo */}
            {(archivo || archivoNombreExistente) ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/20">
                <FileCheck className="h-5 w-5 text-success flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {archivo ? archivo.name : archivoNombreExistente}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {archivo ? `${(archivo.size / 1024).toFixed(2)} KB` : 'Archivo existente'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Arrastra y suelta el archivo PDF aquí
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  o haz clic para seleccionar (máx. 10MB)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Seleccionar Archivo
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <p className="text-xs text-muted-foreground">
              Solo archivos PDF. Tamaño máximo: 10MB
            </p>
          </div>

          {/* Vista previa de información */}
          {formData.colaboradorId && formData.fechaInicio && formData.fechaTerminacion && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Resumen del Contrato
              </h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Colaborador:</span>{' '}
                  <span className="font-medium">
                    {colaboradorSeleccionado?.nombres} {colaboradorSeleccionado?.apellidos}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Modalidad:</span>{' '}
                  <Badge variant="secondary">{formData.modalidad}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Vigencia:</span>{' '}
                  <span className="font-medium">
                    {new Date(formData.fechaInicio).toLocaleDateString('es-CO')} -{' '}
                    {new Date(formData.fechaTerminacion).toLocaleDateString('es-CO')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            {contrato ? 'Guardar Cambios' : 'Crear Contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
