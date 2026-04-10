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
import { Plus, Edit, Trash2, Scale } from 'lucide-react';
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

interface TablaLegal {
  id: string;
  concepto: string;
  porcentajeEmpleado: number;
  porcentajeEmpresa: number;
  vigenciaDesde: string;
  vigenciaHasta: string;
}

const tablasData: TablaLegal[] = [
  {
    id: 'tl1',
    concepto: 'Salud',
    porcentajeEmpleado: 4,
    porcentajeEmpresa: 8.5,
    vigenciaDesde: '2023-01-01',
    vigenciaHasta: '',
  },
  {
    id: 'tl2',
    concepto: 'Pensión',
    porcentajeEmpleado: 4,
    porcentajeEmpresa: 12,
    vigenciaDesde: '2023-01-01',
    vigenciaHasta: '',
  },
  {
    id: 'tl3',
    concepto: 'ARL',
    porcentajeEmpleado: 0,
    porcentajeEmpresa: 0.522,
    vigenciaDesde: '2023-01-01',
    vigenciaHasta: '',
  },
];

const conceptosLegales = ['Salud', 'Pensión', 'ARL', 'Caja Compensación'];

export function TablasLegalesTab() {
  const [tablas, setTablas] = useState<TablaLegal[]>(tablasData);
  const [openModal, setOpenModal] = useState(false);
  const [tablaEdit, setTablaEdit] = useState<TablaLegal | null>(null);
  const [formData, setFormData] = useState({
    concepto: '',
    porcentajeEmpleado: 0,
    porcentajeEmpresa: 0,
    vigenciaDesde: '',
    vigenciaHasta: '',
  });

  const handleOpenModal = (tabla?: TablaLegal) => {
    if (tabla) {
      setTablaEdit(tabla);
      setFormData({
        concepto: tabla.concepto,
        porcentajeEmpleado: tabla.porcentajeEmpleado,
        porcentajeEmpresa: tabla.porcentajeEmpresa,
        vigenciaDesde: tabla.vigenciaDesde,
        vigenciaHasta: tabla.vigenciaHasta,
      });
    } else {
      setTablaEdit(null);
      setFormData({
        concepto: '',
        porcentajeEmpleado: 0,
        porcentajeEmpresa: 0,
        vigenciaDesde: new Date().toISOString().split('T')[0],
        vigenciaHasta: '',
      });
    }
    setOpenModal(true);
  };

  const handleSave = () => {
    if (!formData.concepto || !formData.vigenciaDesde) {
      alert('Concepto y fecha de inicio son obligatorios');
      return;
    }

    if (tablaEdit) {
      setTablas((prev) =>
        prev.map((t) =>
          t.id === tablaEdit.id ? { ...t, ...formData } : t
        )
      );
    } else {
      setTablas((prev) => [
        ...prev,
        { id: `tl${Date.now()}`, ...formData },
      ]);
    }

    setOpenModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta tabla legal?')) {
      setTablas((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              {tablaEdit ? 'Editar Tabla Legal' : 'Nueva Tabla Legal'}
            </DialogTitle>
            <DialogDescription>
              Define porcentajes legales colombianos y su vigencia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="concepto">
                Concepto <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.concepto}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, concepto: value }))
                }
              >
                <SelectTrigger id="concepto">
                  <SelectValue placeholder="Seleccionar concepto" />
                </SelectTrigger>
                <SelectContent>
                  {conceptosLegales.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="porcEmpleado">% Empleado</Label>
                <Input
                  id="porcEmpleado"
                  type="number"
                  step="0.01"
                  placeholder="4"
                  value={formData.porcentajeEmpleado || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      porcentajeEmpleado: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="porcEmpresa">% Empresa</Label>
                <Input
                  id="porcEmpresa"
                  type="number"
                  step="0.01"
                  placeholder="8.5"
                  value={formData.porcentajeEmpresa || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      porcentajeEmpresa: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vigDesde">
                  Vigencia Desde <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="vigDesde"
                  type="date"
                  value={formData.vigenciaDesde}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, vigenciaDesde: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vigHasta">Vigencia Hasta (opcional)</Label>
                <Input
                  id="vigHasta"
                  type="date"
                  value={formData.vigenciaHasta}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, vigenciaHasta: e.target.value }))
                  }
                />
              </div>
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
                <Scale className="h-5 w-5 text-primary" />
                Tablas Legales
              </CardTitle>
              <CardDescription>
                Historial de porcentajes legales colombianos
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Tabla
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tablas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Scale className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay tablas legales</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Agrega los porcentajes legales vigentes
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Tabla
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-center">% Empleado</TableHead>
                    <TableHead className="text-center">% Empresa</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tablas.map((tabla) => (
                    <TableRow key={tabla.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{tabla.concepto}</TableCell>
                      <TableCell className="text-center font-semibold text-primary">
                        {tabla.porcentajeEmpleado}%
                      </TableCell>
                      <TableCell className="text-center font-semibold text-accent">
                        {tabla.porcentajeEmpresa}%
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tabla.vigenciaDesde).toLocaleDateString('es-CO')}
                        {tabla.vigenciaHasta && (
                          <> → {new Date(tabla.vigenciaHasta).toLocaleDateString('es-CO')}</>
                        )}
                        {!tabla.vigenciaHasta && <> → Vigente</>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(tabla)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tabla.id)}
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
