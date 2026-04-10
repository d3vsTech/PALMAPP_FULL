import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Plus, Edit, Trash2, Sprout } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface Semilla {
  id: string;
  tipo: string;
  nombre: string;
}

const semillasData: Semilla[] = [
  { id: 's1', tipo: 'Africana', nombre: 'Elaeis Guineensis' },
  { id: 's2', tipo: 'Híbrido', nombre: 'Híbrido OxG' },
  { id: 's3', tipo: 'Compacta', nombre: 'Deli x AVROS' },
];

const tiposSemilla = ['Africana', 'Híbrido', 'Compacta', 'Americana'];

export function SemillasTab() {
  const [semillas, setSemillas] = useState<Semilla[]>(semillasData);
  const [openModal, setOpenModal] = useState(false);
  const [semillaEdit, setSemillaEdit] = useState<Semilla | null>(null);
  const [formData, setFormData] = useState({ tipo: '', nombre: '' });

  const handleOpenModal = (semilla?: Semilla) => {
    if (semilla) {
      setSemillaEdit(semilla);
      setFormData({ tipo: semilla.tipo, nombre: semilla.nombre });
    } else {
      setSemillaEdit(null);
      setFormData({ tipo: '', nombre: '' });
    }
    setOpenModal(true);
  };

  const handleSave = () => {
    if (!formData.tipo || !formData.nombre) {
      alert('Todos los campos son obligatorios');
      return;
    }

    if (semillaEdit) {
      setSemillas((prev) =>
        prev.map((s) =>
          s.id === semillaEdit.id ? { ...s, ...formData } : s
        )
      );
    } else {
      setSemillas((prev) => [
        ...prev,
        { id: `s${Date.now()}`, ...formData },
      ]);
    }

    setOpenModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta semilla?')) {
      setSemillas((prev) => prev.filter((s) => s.id !== id));
    }
  };

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              {semillaEdit ? 'Editar Semilla' : 'Nueva Semilla'}
            </DialogTitle>
            <DialogDescription>
              Define una variedad de palma para el sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">
                Tipo <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, tipo: value }))
                }
              >
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposSemilla.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Elaeis Guineensis"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-primary" />
                Catálogo de Semillas
              </CardTitle>
              <CardDescription>
                Variedades de palma que se siembran en la finca
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Semilla
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {semillas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Sprout className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay semillas registradas</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comienza agregando tu primera variedad de palma
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Semilla
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {semillas.map((semilla) => (
                    <TableRow key={semilla.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          <Sprout className="h-3 w-3" />
                          {semilla.tipo}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{semilla.nombre}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(semilla)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(semilla.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
