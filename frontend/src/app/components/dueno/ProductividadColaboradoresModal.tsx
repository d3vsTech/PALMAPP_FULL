import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Search, Calendar, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface ProductividadColaboradoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaInicio: string;
  fechaFin: string;
}

// Datos mock de productividad de colaboradores
const colaboradoresData = [
  {
    id: 1,
    nombre: 'Juan Pérez',
    cedula: '1234567890',
    kgDiario: 285,
    gajosDiario: 1420,
    promedio: 18.5,
    alertaBaja: false,
    tareas: 'Cosecha Lote 1',
    rendimiento: 'Excelente',
  },
  {
    id: 2,
    nombre: 'María García',
    cedula: '9876543210',
    kgDiario: 310,
    gajosDiario: 1550,
    promedio: 19.2,
    alertaBaja: false,
    tareas: 'Cosecha Lote 2',
    rendimiento: 'Excelente',
  },
  {
    id: 3,
    nombre: 'Carlos Rodríguez',
    cedula: '4567891230',
    kgDiario: 220,
    gajosDiario: 1180,
    promedio: 17.1,
    alertaBaja: false,
    tareas: 'Cosecha Lote 3',
    rendimiento: 'Bueno',
  },
  {
    id: 4,
    nombre: 'Ana López',
    cedula: '7891234560',
    kgDiario: 195,
    gajosDiario: 980,
    promedio: 15.8,
    alertaBaja: true,
    tareas: 'Cosecha Lote 1',
    rendimiento: 'Regular',
  },
  {
    id: 5,
    nombre: 'Pedro Martínez',
    cedula: '3216549870',
    kgDiario: 275,
    gajosDiario: 1380,
    promedio: 18.9,
    alertaBaja: false,
    tareas: 'Cosecha Lote 4',
    rendimiento: 'Excelente',
  },
];

export function ProductividadColaboradoresModal({
  isOpen,
  onClose,
  fechaInicio,
  fechaFin,
}: ProductividadColaboradoresModalProps) {
  const [busqueda, setBusqueda] = useState('');

  const colaboradoresFiltrados = colaboradoresData.filter((col) =>
    col.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    col.cedula.includes(busqueda)
  );

  const getRendimientoBadge = (rendimiento: string, alertaBaja: boolean) => {
    if (alertaBaja) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {rendimiento}</Badge>;
    }
    if (rendimiento === 'Excelente') {
      return <Badge className="bg-success hover:bg-success/90 gap-1"><TrendingUp className="h-3 w-3" /> {rendimiento}</Badge>;
    }
    if (rendimiento === 'Bueno') {
      return <Badge className="bg-info hover:bg-info/90 gap-1">{rendimiento}</Badge>;
    }
    return <Badge variant="secondary">{rendimiento}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Productividad de Colaboradores
          </DialogTitle>
          <DialogDescription>
            Registro detallado de producción, rendimiento y alertas por colaborador
          </DialogDescription>
        </DialogHeader>

        {/* Filtros y búsqueda */}
        <div className="space-y-4 mb-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Periodo:</span>
            <span className="text-sm text-muted-foreground">
              {new Date(fechaInicio).toLocaleDateString('es-CO')} - {new Date(fechaFin).toLocaleDateString('es-CO')}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o cédula..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Resumen de estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <p className="text-xs text-muted-foreground mb-1">Promedio kg/día</p>
            <p className="text-2xl font-bold text-success">257 kg</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Promedio gajos/día</p>
            <p className="text-2xl font-bold text-primary">1,302</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
            <p className="text-xs text-muted-foreground mb-1">Rendimiento general</p>
            <p className="text-2xl font-bold text-info">17.9 kg/gajo</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
            <p className="text-xs text-muted-foreground mb-1">Alertas</p>
            <p className="text-2xl font-bold text-warning">1</p>
          </div>
        </div>

        {/* Tabla de colaboradores */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Colaborador</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead className="text-right">kg/Día</TableHead>
                <TableHead className="text-right">Gajos/Día</TableHead>
                <TableHead className="text-right">Promedio</TableHead>
                <TableHead>Tareas Asignadas</TableHead>
                <TableHead>Rendimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradoresFiltrados.map((colaborador) => (
                <TableRow key={colaborador.id} className={colaborador.alertaBaja ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-medium">{colaborador.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{colaborador.cedula}</TableCell>
                  <TableCell className="text-right font-semibold">{colaborador.kgDiario} kg</TableCell>
                  <TableCell className="text-right font-semibold">{colaborador.gajosDiario.toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-success">{colaborador.promedio} kg/gajo</span>
                  </TableCell>
                  <TableCell className="text-sm">{colaborador.tareas}</TableCell>
                  <TableCell>{getRendimientoBadge(colaborador.rendimiento, colaborador.alertaBaja)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button className="bg-success hover:bg-success/90">
            Exportar Reporte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
