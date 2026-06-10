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
import { TabLoadingGate } from './TabLoadingGate';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type Insumo,
} from '../../../api/configuracion';
import { cached } from '../../../api/cache';

const unidadesMedida = ['gramo', 'kilogramo', 'litro', 'mililitro', 'unidad'];

export function InsumosTab() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [insumoEdit, setInsumoEdit] = useState<Insumo | null>(null);
  const [formData, setFormData] = useState({ nombre: '', unidadMedida: '' });

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    cached('config:insumos', () => configuracionApi.insumos.listar({ per_page: 100 }))
      .then((res: any) => {
        // Robusto al shape de la respuesta: el backend puede mandar
        //  - { data: Insumo[], meta }  (paginado estándar)
        //  - { data: { data: Insumo[], meta } }  (doble wrap)
        //  - Insumo[]  (sin wrap)
        const arr: Insumo[] =
          Array.isArray(res) ? res
          : Array.isArray(res?.data) ? res.data
          : Array.isArray(res?.data?.data) ? res.data.data
          : [];
        setInsumos(arr);
        if (arr.length === 0) {
          // eslint-disable-next-line no-console
          console.warn('[InsumosTab] Respuesta vacía o shape inesperado:', res);
        }
      })
      .catch((e: any) => {
        // eslint-disable-next-line no-console
        console.error('[InsumosTab] Error al cargar insumos:', e);
        toast.error(e?.message ?? 'No se pudieron cargar los insumos');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleOpenModal = (insumo?: Insumo) => {
    if (insumo) {
      setInsumoEdit(insumo);
      setFormData({ nombre: insumo.nombre, unidadMedida: insumo.unidad_medida });
    } else {
      setInsumoEdit(null);
      setFormData({ nombre: '', unidadMedida: '' });
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim() || !formData.unidadMedida) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    try {
      const payload = { nombre: formData.nombre.trim(), unidad_medida: formData.unidadMedida };
      if (insumoEdit) {
        const res = await configuracionApi.insumos.editar(insumoEdit.id, payload);
        setInsumos((prev) => prev.map((i) => (i.id === insumoEdit.id ? res.data : i)));
      } else {
        const res = await configuracionApi.insumos.crear(payload);
        setInsumos((prev) => [...prev, res.data]);
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el insumo');
      }
    }
  };

  const handleDelete = (id: number, nombre: string) => {
    confirmDelete({
      title: '¿Eliminar insumo?',
      description: `¿Estás seguro de que deseas eliminar el insumo "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await configuracionApi.insumos.eliminar(id);
          setInsumos((prev) => prev.filter((i) => i.id !== id));
        } catch (e: any) {
          if (e?.code === ConfiguracionErrorCodes.INSUMO_CON_LABORES) {
            toast.error('No se puede eliminar: tiene labores activas asociadas');
          } else {
            toast.error(e?.message ?? 'No se pudo eliminar el insumo');
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

      <TabLoadingGate loading={loading} message="Cargando insumos…">
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
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
                          {insumo.unidad_medida}
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
                            onClick={() => handleDelete(insumo.id, insumo.nombre)}
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
      </TabLoadingGate>
    </>
  );
}
