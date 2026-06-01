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
import { Plus, Edit, Trash2 } from 'lucide-react';
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
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { toast } from 'sonner';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type Semilla,
  type TipoSemilla,
} from '../../../api/configuracion';

const tiposSemilla: TipoSemilla[] = [
  'Africana',
  'Híbrido',
  'Compacta',
  'Americana',
  'HIBRIDO_TENERA',
  'HIBRIDO_OXG',
];

export function SemillasTab() {
  const [semillas, setSemillas] = useState<Semilla[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [semillaEdit, setSemillaEdit] = useState<Semilla | null>(null);
  const [formData, setFormData] = useState<{ tipo: TipoSemilla | ''; nombre: string }>({
    tipo: '',
    nombre: '',
  });

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    configuracionApi.semillas
      .listar({ per_page: 100 })
      .then((res) => setSemillas(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las semillas'));
  }, []);

  const handleOpenModal = (semilla?: Semilla) => {
    if (semilla) {
      const tipoValido = tiposSemilla.includes(semilla.tipo) ? semilla.tipo : '';
      setSemillaEdit(semilla);
      setFormData({ tipo: tipoValido, nombre: semilla.nombre });
    } else {
      setSemillaEdit(null);
      setFormData({ tipo: '', nombre: '' });
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.tipo || !formData.nombre.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    try {
      const payload = { tipo: formData.tipo as TipoSemilla, nombre: formData.nombre.trim() };
      if (semillaEdit) {
        const res = await configuracionApi.semillas.editar(semillaEdit.id, payload);
        setSemillas((prev) => prev.map((s) => (s.id === semillaEdit.id ? res.data : s)));
      } else {
        const res = await configuracionApi.semillas.crear(payload);
        setSemillas((prev) => [...prev, res.data]);
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la semilla');
      }
    }
  };

  const handleDelete = (id: number, nombre: string) => {
    confirmDelete({
      title: '¿Eliminar semilla?',
      description: `¿Estás seguro de que deseas eliminar la semilla "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await configuracionApi.semillas.eliminar(id);
          setSemillas((prev) => prev.filter((s) => s.id !== id));
        } catch (e: any) {
          if (e?.code === ConfiguracionErrorCodes.SEMILLA_CON_LOTES) {
            toast.error('No se puede eliminar: está asignada a uno o más lotes');
          } else {
            toast.error(e?.message ?? 'No se pudo eliminar la semilla');
          }
        }
      },
    });
  };

  return (
    <>
      {ConfirmDeleteDialog}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
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
              <CardTitle>
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
                            onClick={() => handleDelete(semilla.id, semilla.nombre)}
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
