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
import { Plus, Edit, Trash2, Sprout, Loader2 } from 'lucide-react';
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
  type Semilla,
  type TipoSemilla,
} from '../../../api/configuracion';

/**
 * Tab "Semillas" conectado al API real (§1 API_PARAMETRICAS).
 *
 * Endpoints:
 *   GET    /api/v1/tenant/semillas        → listado paginado
 *   POST   /api/v1/tenant/semillas        → crear
 *   PUT    /api/v1/tenant/semillas/{id}   → editar (+ toggle estado)
 *   DELETE /api/v1/tenant/semillas/{id}   → eliminar (409 SEMILLA_CON_LOTES si tiene lotes)
 */

const TIPOS_SEMILLA: TipoSemilla[] = ['Africana', 'Híbrido', 'Compacta', 'Americana'];

const FORM_VACIO = { tipo: '' as TipoSemilla | '', nombre: '' };

export function SemillasTab() {
  const [semillas, setSemillas] = useState<Semilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [semillaEdit, setSemillaEdit] = useState<Semilla | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const [semillaAEliminar, setSemillaAEliminar] = useState<Semilla | null>(null);

  const cargar = () => {
    setCargando(true);
    configuracionApi.semillas
      .listar({ per_page: 100 })
      .then((res) => setSemillas(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las semillas'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleOpenModal = (semilla?: Semilla) => {
    if (semilla) {
      setSemillaEdit(semilla);
      setFormData({ tipo: semilla.tipo, nombre: semilla.nombre });
    } else {
      setSemillaEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.tipo || !formData.nombre.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const payload = { tipo: formData.tipo as TipoSemilla, nombre: formData.nombre.trim() };
      if (semillaEdit) {
        const res = await configuracionApi.semillas.editar(semillaEdit.id, payload);
        setSemillas((prev) => prev.map((s) => (s.id === semillaEdit.id ? res.data : s)));
        toast.success(res.message ?? 'Semilla actualizada');
      } else {
        const res = await configuracionApi.semillas.crear(payload);
        setSemillas((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Semilla creada');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la semilla');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (semilla: Semilla) => {
    try {
      const res = await configuracionApi.semillas.editar(semilla.id, { estado: !semilla.estado });
      setSemillas((prev) => prev.map((s) => (s.id === semilla.id ? res.data : s)));
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!semillaAEliminar) return;
    try {
      await configuracionApi.semillas.eliminar(semillaAEliminar.id);
      setSemillas((prev) => prev.filter((s) => s.id !== semillaAEliminar.id));
      toast.success('Semilla eliminada');
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.SEMILLA_CON_LOTES) {
        toast.error('No se puede eliminar: está asignada a uno o más lotes');
      } else {
        toast.error(e?.message ?? 'No se pudo eliminar la semilla');
      }
    } finally {
      setSemillaAEliminar(null);
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
                  setFormData((prev) => ({ ...prev, tipo: value as TipoSemilla }))
                }
              >
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_SEMILLA.map((tipo) => (
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
        open={!!semillaAEliminar}
        onOpenChange={(open) => !open && setSemillaAEliminar(null)}
        title="Eliminar semilla"
        description={`¿Estás seguro de eliminar "${semillaAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
      />

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
          {cargando ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando semillas...
            </div>
          ) : semillas.length === 0 ? (
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
                    <TableHead>Estado</TableHead>
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
                      <TableCell>
                        <Switch
                          checked={semilla.estado}
                          onCheckedChange={() => handleToggleEstado(semilla)}
                        />
                      </TableCell>
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
                            onClick={() => setSemillaAEliminar(semilla)}
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
