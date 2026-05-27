import { useEffect, useState } from 'react';
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
import { Plus, Edit, Trash2, Package, Loader2 } from 'lucide-react';
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
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ConfirmDeleteDialog } from '../ui/confirm-delete-dialog';
import { toast } from 'sonner';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type Insumo,
} from '../../../api/configuracion';

/**
 * Tab "Insumos" conectado al API real (§2 API_PARAMETRICAS).
 *
 * Endpoints:
 *   GET    /api/v1/tenant/insumos        → listado paginado
 *   POST   /api/v1/tenant/insumos        → crear
 *   PUT    /api/v1/tenant/insumos/{id}   → editar (+ toggle estado)
 *   DELETE /api/v1/tenant/insumos/{id}   → eliminar (409 INSUMO_CON_LABORES si tiene labores)
 */

const unidadesMedida = ['gramo', 'kilogramo', 'litro', 'mililitro', 'unidad'];

const FORM_VACIO = { nombre: '', unidad_medida: '' };

export function InsumosTab() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [insumoEdit, setInsumoEdit] = useState<Insumo | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const [insumoAEliminar, setInsumoAEliminar] = useState<Insumo | null>(null);

  const cargar = () => {
    setCargando(true);
    configuracionApi.insumos
      .listar({ per_page: 100 })
      .then((res) => setInsumos(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los insumos'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleOpenModal = (insumo?: Insumo) => {
    if (insumo) {
      setInsumoEdit(insumo);
      setFormData({ nombre: insumo.nombre, unidad_medida: insumo.unidad_medida });
    } else {
      setInsumoEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim() || !formData.unidad_medida) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const payload = { nombre: formData.nombre.trim(), unidad_medida: formData.unidad_medida };
      if (insumoEdit) {
        const res = await configuracionApi.insumos.editar(insumoEdit.id, payload);
        setInsumos((prev) => prev.map((i) => (i.id === insumoEdit.id ? res.data : i)));
        toast.success(res.message ?? 'Insumo actualizado');
      } else {
        const res = await configuracionApi.insumos.crear(payload);
        setInsumos((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Insumo creado');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el insumo');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (insumo: Insumo) => {
    try {
      const res = await configuracionApi.insumos.editar(insumo.id, { estado: !insumo.estado });
      setInsumos((prev) => prev.map((i) => (i.id === insumo.id ? res.data : i)));
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!insumoAEliminar) return;
    try {
      await configuracionApi.insumos.eliminar(insumoAEliminar.id);
      setInsumos((prev) => prev.filter((i) => i.id !== insumoAEliminar.id));
      toast.success('Insumo eliminado');
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.INSUMO_CON_LABORES) {
        toast.error('No se puede eliminar: tiene labores activas asociadas');
      } else {
        toast.error(e?.message ?? 'No se pudo eliminar el insumo');
      }
    } finally {
      setInsumoAEliminar(null);
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
                value={formData.unidad_medida}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, unidad_medida: value }))
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
            <Button variant="outline" onClick={() => setOpenModal(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={guardando}>
              {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!insumoAEliminar}
        onOpenChange={(open) => !open && setInsumoAEliminar(null)}
        title="Eliminar insumo"
        description={`¿Estás seguro de eliminar "${insumoAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
      />

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
          {cargando ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando insumos...
            </div>
          ) : insumos.length === 0 ? (
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
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map((insumo) => (
                    <TableRow key={insumo.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{insumo.nombre}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                          {insumo.unidad_medida}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={insumo.estado}
                          onCheckedChange={() => handleToggleEstado(insumo)}
                        />
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
                            onClick={() => setInsumoAEliminar(insumo)}
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
