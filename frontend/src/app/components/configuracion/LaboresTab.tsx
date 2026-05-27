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
import { Plus, Edit, Trash2, Hammer, Loader2 } from 'lucide-react';
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
import { ConfirmDeleteDialog } from '../ui/confirm-delete-dialog';
import { toast } from 'sonner';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type Labor,
} from '../../../api/configuracion';

/**
 * Tab "Labores" conectado al API real (§4 API_PARAMETRICAS).
 *
 * Endpoints:
 *   GET    /api/v1/tenant/labores        → listado paginado
 *   POST   /api/v1/tenant/labores        → crear
 *   PUT    /api/v1/tenant/labores/{id}   → editar (+ toggle estado)
 *   DELETE /api/v1/tenant/labores/{id}   → eliminar (409 LABOR_CON_JORNALES si tiene jornales)
 *
 * Schema actual: labor simple con nombre + valor_base (dinero COP). Ya no hay
 * tipo_pago ni unidad.
 */

const FORM_VACIO = { nombre: '', valorBase: '' };

export function LaboresTab() {
  const [labores, setLabores] = useState<Labor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [laborEdit, setLaborEdit] = useState<Labor | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const [laborAEliminar, setLaborAEliminar] = useState<Labor | null>(null);

  const cargar = () => {
    setCargando(true);
    configuracionApi.labores
      .listar({ per_page: 100 })
      .then((res) => setLabores(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las labores'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleOpenModal = (labor?: Labor) => {
    if (labor) {
      setLaborEdit(labor);
      setFormData({ nombre: labor.nombre, valorBase: String(labor.valor_base) });
    } else {
      setLaborEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    const valor = Number(formData.valorBase);
    if (!formData.nombre.trim() || !(valor > 0)) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const payload = { nombre: formData.nombre.trim(), valor_base: valor };
      if (laborEdit) {
        const res = await configuracionApi.labores.editar(laborEdit.id, payload);
        setLabores((prev) => prev.map((l) => (l.id === laborEdit.id ? res.data : l)));
        toast.success(res.message ?? 'Labor actualizada');
      } else {
        const res = await configuracionApi.labores.crear(payload);
        setLabores((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Labor creada');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la labor');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (labor: Labor) => {
    try {
      const res = await configuracionApi.labores.editar(labor.id, { estado: !labor.estado });
      setLabores((prev) => prev.map((l) => (l.id === labor.id ? res.data : l)));
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!laborAEliminar) return;
    try {
      await configuracionApi.labores.eliminar(laborAEliminar.id);
      setLabores((prev) => prev.filter((l) => l.id !== laborAEliminar.id));
      toast.success('Labor eliminada');
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.LABOR_CON_JORNALES) {
        toast.error('No se puede eliminar: tiene jornales de Finca asociados');
      } else {
        toast.error(e?.message ?? 'No se pudo eliminar la labor');
      }
    } finally {
      setLaborAEliminar(null);
    }
  };

  const valorPreview = Number(formData.valorBase);

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
              <Label htmlFor="valorBase">
                Valor Base <span className="text-destructive">*</span>
              </Label>
              <Input
                id="valorBase"
                type="number"
                placeholder="50000"
                value={formData.valorBase}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, valorBase: e.target.value }))
                }
              />
              {valorPreview > 0 && (
                <p className="text-xs text-muted-foreground">
                  ${valorPreview.toLocaleString('es-CO')}
                </p>
              )}
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
        open={!!laborAEliminar}
        onOpenChange={(open) => !open && setLaborAEliminar(null)}
        title="Eliminar labor"
        description={`¿Estás seguro de eliminar "${laborAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
      />

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
          {cargando ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando labores...
            </div>
          ) : labores.length === 0 ? (
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
                    <TableHead className="text-right">Valor Base</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labores.map((labor) => (
                    <TableRow key={labor.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{labor.nombre}</TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        ${Number(labor.valor_base).toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={labor.estado}
                          onCheckedChange={() => handleToggleEstado(labor)}
                        />
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
                            onClick={() => setLaborAEliminar(labor)}
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
