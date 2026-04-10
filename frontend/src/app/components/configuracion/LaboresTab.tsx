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
import { Plus, Edit, Trash2, Hammer } from 'lucide-react';
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
import { Badge } from '../ui/badge';

interface Labor {
  id: string;
  nombre: string;
  tipoPago: 'JORNAL FIJO' | 'POR PALMA';
  valorBase: number;
  unidad: 'PALMAS' | 'JORNAL';
}

const laboresData: Labor[] = [
  { id: 'l1', nombre: 'Cosecha', tipoPago: 'POR PALMA', valorBase: 1200, unidad: 'PALMAS' },
  { id: 'l2', nombre: 'Plateo', tipoPago: 'POR PALMA', valorBase: 800, unidad: 'PALMAS' },
  { id: 'l3', nombre: 'Poda', tipoPago: 'POR PALMA', valorBase: 950, unidad: 'PALMAS' },
  { id: 'l4', nombre: 'Sanidad', tipoPago: 'JORNAL FIJO', valorBase: 50000, unidad: 'JORNAL' },
];

export function LaboresTab() {
  const [labores, setLabores] = useState<Labor[]>(laboresData);
  const [openModal, setOpenModal] = useState(false);
  const [laborEdit, setLaborEdit] = useState<Labor | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipoPago: 'POR PALMA' as 'JORNAL FIJO' | 'POR PALMA',
    valorBase: 0,
    unidad: 'PALMAS' as 'PALMAS' | 'JORNAL',
  });

  const handleOpenModal = (labor?: Labor) => {
    if (labor) {
      setLaborEdit(labor);
      setFormData({
        nombre: labor.nombre,
        tipoPago: labor.tipoPago,
        valorBase: labor.valorBase,
        unidad: labor.unidad,
      });
    } else {
      setLaborEdit(null);
      setFormData({ nombre: '', tipoPago: 'POR PALMA', valorBase: 0, unidad: 'PALMAS' });
    }
    setOpenModal(true);
  };

  const handleSave = () => {
    if (!formData.nombre || formData.valorBase <= 0) {
      alert('Todos los campos son obligatorios');
      return;
    }

    if (laborEdit) {
      setLabores((prev) =>
        prev.map((l) =>
          l.id === laborEdit.id ? { ...l, ...formData } : l
        )
      );
    } else {
      setLabores((prev) => [
        ...prev,
        { id: `l${Date.now()}`, ...formData },
      ]);
    }

    setOpenModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta labor?')) {
      setLabores((prev) => prev.filter((l) => l.id !== id));
    }
  };

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5 text-primary" />
              {laborEdit ? 'Editar Labor' : 'Nueva Labor'}
            </DialogTitle>
            <DialogDescription>
              Define un tipo de trabajo de campo y su precio base
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre de la Labor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Cosecha, Plateo, Poda"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoPago">
                Tipo de Pago <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.tipoPago}
                onValueChange={(value: 'JORNAL FIJO' | 'POR PALMA') => {
                  setFormData((prev) => ({
                    ...prev,
                    tipoPago: value,
                    unidad: value === 'JORNAL FIJO' ? 'JORNAL' : 'PALMAS',
                  }));
                }}
              >
                <SelectTrigger id="tipoPago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POR PALMA">POR PALMA (valor por cada palma trabajada)</SelectItem>
                  <SelectItem value="JORNAL FIJO">JORNAL FIJO (valor diario fijo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorBase">
                Valor Base <span className="text-destructive">*</span>
              </Label>
              <Input
                id="valorBase"
                type="number"
                placeholder={formData.tipoPago === 'POR PALMA' ? '1200' : '50000'}
                value={formData.valorBase || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    valorBase: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              {formData.valorBase > 0 && (
                <p className="text-xs text-muted-foreground">
                  ${formData.valorBase.toLocaleString('es-CO')}
                  {formData.tipoPago === 'POR PALMA' ? '/palma' : '/jornal'}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-medium mb-1">Unidad</p>
              <p className="text-sm text-muted-foreground">
                {formData.unidad}
              </p>
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
                <Hammer className="h-5 w-5 text-primary" />
                Catálogo de Labores
              </CardTitle>
              <CardDescription>
                Tipos de trabajo de campo y sus precios base
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Labor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {labores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Hammer className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay labores registradas</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comienza agregando tu primera labor
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Labor
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo de Pago</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">Valor Base</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labores.map((labor) => (
                    <TableRow key={labor.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{labor.nombre}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            labor.tipoPago === 'POR PALMA'
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-accent/10 text-accent border-accent/30'
                          }
                        >
                          {labor.tipoPago}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{labor.unidad}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        ${labor.valorBase.toLocaleString('es-CO')}
                        <span className="text-xs text-muted-foreground ml-1">
                          /{labor.unidad === 'PALMAS' ? 'palma' : 'jornal'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(labor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(labor.id)}
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
