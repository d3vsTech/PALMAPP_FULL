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
import { Plus, Edit, Trash2, Briefcase } from 'lucide-react';
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

interface Cargo {
  id: string;
  nombre: string;
  tipoSalario: 'FIJO' | 'VARIABLE';
  salarioBase: number;
}

const cargosData: Cargo[] = [
  { id: 'c1', nombre: 'Jefe de Campo', tipoSalario: 'FIJO', salarioBase: 2500000 },
  { id: 'c2', nombre: 'Operario de Cosecha', tipoSalario: 'VARIABLE', salarioBase: 0 },
  { id: 'c3', nombre: 'Operario de Plateo', tipoSalario: 'VARIABLE', salarioBase: 0 },
  { id: 'c4', nombre: 'Vigilante', tipoSalario: 'FIJO', salarioBase: 1300000 },
];

export function CargosTab() {
  const [cargos, setCargos] = useState<Cargo[]>(cargosData);
  const [openModal, setOpenModal] = useState(false);
  const [cargoEdit, setCargoEdit] = useState<Cargo | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipoSalario: 'FIJO' as 'FIJO' | 'VARIABLE',
    salarioBase: 0,
  });

  const handleOpenModal = (cargo?: Cargo) => {
    if (cargo) {
      setCargoEdit(cargo);
      setFormData({
        nombre: cargo.nombre,
        tipoSalario: cargo.tipoSalario,
        salarioBase: cargo.salarioBase,
      });
    } else {
      setCargoEdit(null);
      setFormData({ nombre: '', tipoSalario: 'FIJO', salarioBase: 0 });
    }
    setOpenModal(true);
  };

  const handleSave = () => {
    if (!formData.nombre) {
      alert('El nombre es obligatorio');
      return;
    }

    if (cargoEdit) {
      setCargos((prev) =>
        prev.map((c) =>
          c.id === cargoEdit.id ? { ...c, ...formData } : c
        )
      );
    } else {
      setCargos((prev) => [
        ...prev,
        { id: `c${Date.now()}`, ...formData },
      ]);
    }

    setOpenModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este cargo?')) {
      setCargos((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              {cargoEdit ? 'Editar Cargo' : 'Nuevo Cargo'}
            </DialogTitle>
            <DialogDescription>
              Define un puesto de trabajo y su esquema salarial
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre del Cargo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Jefe de Campo, Operario de Cosecha"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoSalario">
                Tipo de Salario <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.tipoSalario}
                onValueChange={(value: 'FIJO' | 'VARIABLE') =>
                  setFormData((prev) => ({
                    ...prev,
                    tipoSalario: value,
                    salarioBase: value === 'VARIABLE' ? 0 : prev.salarioBase,
                  }))
                }
              >
                <SelectTrigger id="tipoSalario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIJO">FIJO (sueldo mensual)</SelectItem>
                  <SelectItem value="VARIABLE">VARIABLE (pago por producción)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipoSalario === 'FIJO' && (
              <div className="space-y-2">
                <Label htmlFor="salarioBase">
                  Salario Base <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="salarioBase"
                  type="number"
                  placeholder="2500000"
                  value={formData.salarioBase || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      salarioBase: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
                {formData.salarioBase > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ${formData.salarioBase.toLocaleString('es-CO')}
                  </p>
                )}
              </div>
            )}

            {formData.tipoSalario === 'VARIABLE' && (
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">
                  El salario variable se calcula según la producción del empleado
                </p>
              </div>
            )}
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
                <Briefcase className="h-5 w-5 text-primary" />
                Catálogo de Cargos
              </CardTitle>
              <CardDescription>
                Puestos de trabajo y esquemas salariales
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cargo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cargos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay cargos registrados</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comienza agregando tu primer cargo
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Cargo
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nombre del Cargo</TableHead>
                    <TableHead>Tipo de Salario</TableHead>
                    <TableHead className="text-right">Salario Base</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cargos.map((cargo) => (
                    <TableRow key={cargo.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{cargo.nombre}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            cargo.tipoSalario === 'FIJO'
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-accent/10 text-accent border-accent/30'
                          }
                        >
                          {cargo.tipoSalario}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        {cargo.tipoSalario === 'FIJO'
                          ? `$${cargo.salarioBase.toLocaleString('es-CO')}`
                          : 'Variable'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(cargo)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cargo.id)}
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
