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

/** Catálogo inicial sembrado en background si el tenant no tiene semillas todavía.
 *  Una entrada por cada `tipo` del enum, con un nombre por defecto razonable. */
const SEMILLAS_DEFAULT: Array<{ tipo: TipoSemilla; nombre: string }> = [
  { tipo: 'Africana',       nombre: 'Africana (Elaeis guineensis)' },
  { tipo: 'Híbrido',        nombre: 'Híbrido OxG' },
  { tipo: 'Compacta',       nombre: 'Compacta' },
  { tipo: 'Americana',      nombre: 'Americana (Elaeis oleifera)' },
  { tipo: 'HIBRIDO_TENERA', nombre: 'Híbrido Ténera DxP' },
  { tipo: 'HIBRIDO_OXG',    nombre: 'Híbrido OxG tolerante PC' },
];

/** Clave de caché en sessionStorage para entrada instantánea. */
const CACHE_KEY_SEMILLAS = 'palmapp_cfg_semillas_v1';

export function SemillasTab() {
  const hayCache = (() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY_SEMILLAS);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Semilla[];
      return Array.isArray(parsed) && parsed.length > 0;
    } catch { return false; }
  })();
  const [loading, setLoading] = useState(!hayCache);
  const [semillas, setSemillas] = useState<Semilla[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [semillaEdit, setSemillaEdit] = useState<Semilla | null>(null);
  const [formData, setFormData] = useState<{ tipo: TipoSemilla | ''; nombre: string }>({
    tipo: '',
    nombre: '',
  });

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    let cancelado = false;

    // 1) Stale-while-revalidate: pinta del caché al instante si existe.
    try {
      const raw = sessionStorage.getItem(CACHE_KEY_SEMILLAS);
      if (raw) {
        const parsed = JSON.parse(raw) as Semilla[];
        if (Array.isArray(parsed) && parsed.length > 0) setSemillas(parsed);
      }
    } catch { /* caché corrupto: ignorar */ }

    // 2) Revalidar en background.
    (async () => {
      try {
        const res = await configuracionApi.semillas.listar({ per_page: 100 });
        if (cancelado) return;
        // Primera respuesta del backend → quitamos el loader.
        setLoading(false);
        const items = res.data ?? [];
        if (items.length > 0) {
          setSemillas(items);
          try { sessionStorage.setItem(CACHE_KEY_SEMILLAS, JSON.stringify(items)); } catch {}
          return;
        }

        // 3) Lista vacía → sembramos los 6 tipos en PARALELO (no secuencial).
        const resultados = await Promise.allSettled(
          SEMILLAS_DEFAULT.map((s) =>
            configuracionApi.semillas.crear({ tipo: s.tipo, nombre: s.nombre }),
          ),
        );
        if (cancelado) return;

        const creadas: Semilla[] = resultados
          .filter((r): r is PromiseFulfilledResult<{ data: Semilla; message: string }> => r.status === 'fulfilled')
          .map((r) => r.value.data);

        if (creadas.length === SEMILLAS_DEFAULT.length) {
          setSemillas(creadas);
          try { sessionStorage.setItem(CACHE_KEY_SEMILLAS, JSON.stringify(creadas)); } catch {}
          return;
        }

        // Si algún POST falló (race condition con otro tab), refetcheamos.
        try {
          const final = await configuracionApi.semillas.listar({ per_page: 100 });
          if (cancelado) return;
          setSemillas(final.data ?? creadas);
          try { sessionStorage.setItem(CACHE_KEY_SEMILLAS, JSON.stringify(final.data ?? creadas)); } catch {}
        } catch {
          if (!cancelado) setSemillas(creadas);
        }
      } catch (e: any) {
        if (!cancelado) {
          toast.error(e?.message ?? 'No se pudieron cargar las semillas');
          setLoading(false);
        }
      }
    })();
    return () => { cancelado = true; };
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
        setSemillas((prev) => {
          const next = prev.map((s) => (s.id === semillaEdit.id ? res.data : s));
          try { sessionStorage.setItem(CACHE_KEY_SEMILLAS, JSON.stringify(next)); } catch {}
          return next;
        });
      } else {
        const res = await configuracionApi.semillas.crear(payload);
        setSemillas((prev) => {
          const next = [...prev, res.data];
          try { sessionStorage.setItem(CACHE_KEY_SEMILLAS, JSON.stringify(next)); } catch {}
          return next;
        });
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
          setSemillas((prev) => {
            const next = prev.filter((s) => s.id !== id);
            try { sessionStorage.setItem(CACHE_KEY_SEMILLAS, JSON.stringify(next)); } catch {}
            return next;
          });
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

      <TabLoadingGate loading={loading} message="Cargando semillas…">
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
      </TabLoadingGate>
    </>
  );
}
