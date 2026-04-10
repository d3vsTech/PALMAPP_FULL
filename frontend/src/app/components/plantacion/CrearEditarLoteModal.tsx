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
import { Checkbox } from '../ui/checkbox';
import { Sprout, AlertCircle } from 'lucide-react';
import { Link } from 'react-router';

interface Lote {
  id: string;
  nombre: string;
  predioId: string;
  fechaSiembra: string; // Formato YYYY-MM-DD
  anoSiembra: number;
  variedad: string;
  semillas: string[];
  hectareas: number;
  sublotes?: number;
}

interface CrearEditarLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  lote?: Lote;
  predios: Array<{ id: string; nombre: string; hectareas: number }>;
  predioIdSeleccionado?: string;
  onSave: (lote: Partial<Lote>) => void;
  catalogoSemillas: Array<{ id: string; nombre: string }>;
  lotesExistentes: Lote[];
}

export function CrearEditarLoteModal({
  isOpen,
  onClose,
  lote,
  predios,
  predioIdSeleccionado,
  onSave,
  catalogoSemillas,
  lotesExistentes,
}: CrearEditarLoteModalProps) {
  const [nombre, setNombre] = useState('');
  const [predioId, setPredioId] = useState('');
  const [fechaSiembra, setFechaSiembra] = useState('');
  const [variedad, setVariedad] = useState('');
  const [semillasSeleccionadas, setSemillasSeleccionadas] = useState<string[]>([]);
  const [hectareas, setHectareas] = useState('');

  useEffect(() => {
    if (lote) {
      setNombre(lote.nombre);
      setPredioId(lote.predioId);
      setFechaSiembra(lote.fechaSiembra || `${lote.anoSiembra}-01-01`);
      setVariedad(lote.variedad);
      setSemillasSeleccionadas(lote.semillas);
      setHectareas(lote.hectareas.toString());
    } else {
      setNombre('');
      setPredioId(predioIdSeleccionado || '');
      setFechaSiembra('');
      setVariedad('');
      setSemillasSeleccionadas([]);
      setHectareas('');
    }
  }, [lote, predioIdSeleccionado, isOpen]);

  const handleSemillaChange = (semilla: string, checked: boolean) => {
    if (checked) {
      setSemillasSeleccionadas([...semillasSeleccionadas, semilla]);
    } else {
      setSemillasSeleccionadas(semillasSeleccionadas.filter((s) => s !== semilla));
    }
  };

  // Calcular hectáreas disponibles del predio
  const calcularHectareasDisponibles = (predioSeleccionadoId: string): number => {
    const predio = predios.find(p => p.id === predioSeleccionadoId);
    if (!predio) return 0;

    // Sumar hectáreas de los lotes existentes del predio (excepto el que se está editando)
    const hectareasUsadas = lotesExistentes
      .filter(l => l.predioId === predioSeleccionadoId && l.id !== lote?.id)
      .reduce((sum, l) => sum + l.hectareas, 0);

    return predio.hectareas - hectareasUsadas;
  };

  const handleSave = () => {
    if (!nombre.trim()) {
      alert('El nombre del lote es obligatorio');
      return;
    }
    if (!predioId) {
      alert('Debes seleccionar un predio');
      return;
    }
    if (!fechaSiembra) {
      alert('La fecha de siembra es obligatoria');
      return;
    }
    if (!variedad.trim()) {
      alert('La variedad es obligatoria');
      return;
    }
    if (semillasSeleccionadas.length === 0) {
      alert('Debes seleccionar al menos una semilla');
      return;
    }
    if (!hectareas || parseFloat(hectareas) <= 0) {
      alert('Ingresa una cantidad de hectáreas válida');
      return;
    }

    // Validar que las hectáreas no superen las disponibles
    const hectareasDisponibles = calcularHectareasDisponibles(predioId);
    if (parseFloat(hectareas) > hectareasDisponibles) {
      alert(`Las hectáreas sembradas (${hectareas} ha) no pueden superar las hectáreas disponibles del predio (${hectareasDisponibles.toFixed(2)} ha)`);
      return;
    }

    const fecha = new Date(fechaSiembra);
    
    onSave({
      id: lote?.id,
      nombre: nombre.trim(),
      predioId,
      fechaSiembra,
      anoSiembra: fecha.getFullYear(),
      variedad: variedad.trim(),
      semillas: semillasSeleccionadas,
      hectareas: parseFloat(hectareas),
      sublotes: lote?.sublotes || 0,
    });

    handleClose();
  };

  const handleClose = () => {
    setNombre('');
    setPredioId('');
    setFechaSiembra('');
    setVariedad('');
    setSemillasSeleccionadas([]);
    setHectareas('');
    onClose();
  };

  const hectareasDisponibles = predioId ? calcularHectareasDisponibles(predioId) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-success" />
            {lote ? 'Editar Lote' : 'Crear Nuevo Lote'}
          </DialogTitle>
          <DialogDescription>
            {lote
              ? 'Modifica la información del lote existente'
              : 'Crea un lote dentro de un predio. Después podrás agregar sublotes, líneas y palmas.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Predio */}
          <div className="space-y-2">
            <Label htmlFor="predio" className="text-sm font-medium">
              Predio <span className="text-destructive">*</span>
            </Label>
            <Select value={predioId} onValueChange={setPredioId}>
              <SelectTrigger id="predio">
                <SelectValue placeholder="Selecciona un predio" />
              </SelectTrigger>
              <SelectContent>
                {predios.map((predio) => (
                  <SelectItem key={predio.id} value={predio.id}>
                    {predio.nombre} ({predio.hectareas} ha totales)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {predioId && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Hectáreas disponibles: <strong>{hectareasDisponibles.toFixed(2)} ha</strong>
              </p>
            )}
          </div>

          {/* Nombre del Lote */}
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-sm font-medium">
              Nombre del Lote <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre"
              placeholder="Ej: Lote 1 - Norte"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Fecha de Siembra */}
            <div className="space-y-2">
              <Label htmlFor="fechaSiembra" className="text-sm font-medium">
                Fecha de Siembra <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fechaSiembra"
                type="date"
                value={fechaSiembra}
                onChange={(e) => setFechaSiembra(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Hectáreas */}
            <div className="space-y-2">
              <Label htmlFor="hectareas" className="text-sm font-medium">
                Hectáreas Sembradas <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hectareas"
                type="number"
                step="0.01"
                placeholder="45.5"
                min="0"
                max={hectareasDisponibles}
                value={hectareas}
                onChange={(e) => setHectareas(e.target.value)}
              />
              {predioId && parseFloat(hectareas) > 0 && (
                <p className={`text-xs ${parseFloat(hectareas) > hectareasDisponibles ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {parseFloat(hectareas) > hectareasDisponibles 
                    ? '⚠️ Excede las hectáreas disponibles' 
                    : `✓ Quedarán ${(hectareasDisponibles - parseFloat(hectareas)).toFixed(2)} ha disponibles`}
                </p>
              )}
            </div>
          </div>

          {/* Variedad */}
          <div className="space-y-2">
            <Label htmlFor="variedad" className="text-sm font-medium">
              Variedad <span className="text-destructive">*</span>
            </Label>
            <Input
              id="variedad"
              placeholder="Ej: Elaeis Guineensis"
              value={variedad}
              onChange={(e) => setVariedad(e.target.value)}
            />
          </div>

          {/* Semillas (Multi-select con checkboxes del catálogo de Maestros) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Semillas <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Selecciona una o más semillas del catálogo
            </p>
            
            {catalogoSemillas.length > 0 ? (
              <>
                <div className="border rounded-lg p-4 space-y-3 bg-muted/20 max-h-48 overflow-y-auto">
                  {catalogoSemillas.map((semilla) => (
                    <div key={semilla.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`semilla-${semilla.id}`}
                        checked={semillasSeleccionadas.includes(semilla.nombre)}
                        onCheckedChange={(checked) =>
                          handleSemillaChange(semilla.nombre, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`semilla-${semilla.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {semilla.nombre}
                      </label>
                    </div>
                  ))}
                </div>
                {semillasSeleccionadas.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Seleccionadas: {semillasSeleccionadas.length}
                  </p>
                )}
              </>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/10">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  No hay semillas en el catálogo
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Debes crear semillas primero en Configuración → Maestros
                </p>
                <Link to="/configuracion?tab=maestros">
                  <Button variant="outline" size="sm" className="gap-2">
                    Ir a Maestros
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-success hover:bg-success/90"
            disabled={catalogoSemillas.length === 0}
          >
            {lote ? 'Guardar Cambios' : 'Crear Lote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}