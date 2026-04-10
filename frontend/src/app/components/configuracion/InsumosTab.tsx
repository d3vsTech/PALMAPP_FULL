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
import { Plus, Edit, Trash2, Package } from 'lucide-react';
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

interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
}

const insumosData: Insumo[] = [
  { id: 'i1', nombre: 'KCl', unidadMedida: 'gramo' },
  { id: 'i2', nombre: 'Borax', unidadMedida: 'gramo' },
  { id: 'i3', nombre: 'Glifosato', unidadMedida: 'litro' },
  { id: 'i4', nombre: 'Urea', unidadMedida: 'gramo' },
];

const unidadesMedida = ['gramo', 'kilogramo', 'litro', 'mililitro', 'unidad'];

export function InsumosTab() {
  const [insumos, setInsumos] = useState<Insumo[]>(insumosData);
  const [openModal, setOpenModal] = useState(false);
  const [insumoEdit, setInsumoEdit] = useState<Insumo | null>(null);
  const [formData, setFormData] = useState({ nombre: '', unidadMedida: '' });

  const handleOpenModal = (insumo?: Insumo) => {
    if (insumo) {
      setInsumoEdit(insumo);
      setFormData({ nombre: insumo.nombre, unidadMedida: insumo.unidadMedida });
    } else {
      setInsumoEdit(null);
      setFormData({ nombre: '', unidadMedida: '' });
    }
    setOpenModal(true);
  };

  const handleSave = () => {
    if (!formData.nombre || !formData.unidadMedida) {
      alert('Todos los campos son obligatorios');
      return;
    }

    if (insumoEdit) {
      setInsumos((prev) =>
        prev.map((i) =>
          i.id === insumoEdit.id ? { ...i, ...formData } : i
        )
      );
    } else {
      setInsumos((prev) => [
        ...prev,
        { id: `i${Date.now()}`, ...formData },
      ]);
    }

    setOpenModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este insumo?')) {
      setInsumos((prev) => prev.filter((i) => i.id !== id));
    }
  };

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {insumoEdit ? 'Editar Insumo' : 'Nuevo Insumo'}
            </DialogTitle>
            <DialogDescription>
              Define un producto químico o fertilizante
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: KCl, Urea, Glifosato"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidad">
                Unidad de Medida <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.unidadMedida}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, unidadMedida: value }))
                }
              >
                <SelectTrigger id="unidad">
                  <SelectValue placeholder="Seleccionar unidad" />
                </SelectTrigger>
                <SelectContent>
                  {unidadesMedida.map((unidad) => (
                    <SelectItem key={unidad} value={unidad}>
                      {unidad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Package className="h-5 w-5 text-primary" />
                Catálogo de Insumos
              </CardTitle>
              <CardDescription>
                Productos químicos y fertilizantes utilizados en la finca
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Insumo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {insumos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay insumos registrados</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comienza agregando tu primer insumo
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Insumo
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Unidad de Medida</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map((insumo) => (
                    <TableRow key={insumo.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{insumo.nombre}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                          {insumo.unidadMedida}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(insumo)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(insumo.id)}
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
