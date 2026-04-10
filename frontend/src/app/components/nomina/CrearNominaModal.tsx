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
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface CrearNominaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { ano: number; mes: number; quincena: number }) => void;
}

const meses = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const quincenas = [
  { value: 1, label: 'Primera Quincena (1-15)' },
  { value: 2, label: 'Segunda Quincena (16-30/31)' },
];

export function CrearNominaModal({ isOpen, onClose, onSave }: CrearNominaModalProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [ano, setAno] = useState(currentYear);
  const [mes, setMes] = useState(currentMonth);
  const [quincena, setQuincena] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setAno(currentYear);
      setMes(currentMonth);
      setQuincena(1);
    }
  }, [isOpen, currentYear, currentMonth]);

  const handleSave = () => {
    onSave({ ano, mes, quincena });
    onClose();
  };

  // Generar lista de años (5 años atrás hasta 2 años adelante)
  const anos = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  const mesSeleccionado = meses.find((m) => m.value === mes);
  const quincenaSeleccionada = quincenas.find((q) => q.value === quincena);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Nueva Nómina
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo período de nómina. Se generará automáticamente un registro para cada colaborador activo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Año */}
          <div className="space-y-2">
            <Label htmlFor="ano" className="text-sm font-medium">
              Año <span className="text-destructive">*</span>
            </Label>
            <Select value={ano.toString()} onValueChange={(value) => setAno(parseInt(value))}>
              <SelectTrigger id="ano">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={a.toString()}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mes */}
          <div className="space-y-2">
            <Label htmlFor="mes" className="text-sm font-medium">
              Mes <span className="text-destructive">*</span>
            </Label>
            <Select value={mes.toString()} onValueChange={(value) => setMes(parseInt(value))}>
              <SelectTrigger id="mes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quincena */}
          <div className="space-y-2">
            <Label htmlFor="quincena" className="text-sm font-medium">
              Quincena <span className="text-destructive">*</span>
            </Label>
            <Select value={quincena.toString()} onValueChange={(value) => setQuincena(parseInt(value))}>
              <SelectTrigger id="quincena">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quincenas.map((q) => (
                  <SelectItem key={q.value} value={q.value.toString()}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <Alert className="bg-primary/10 border-primary/30">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription>
              <span className="font-semibold">Período a crear:</span><br />
              {mesSeleccionado?.label} {ano} - {quincenaSeleccionada?.label}
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertDescription className="text-xs text-muted-foreground">
              Al crear el período, se generará automáticamente un registro de nómina para cada colaborador activo en el sistema.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Crear Nómina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
