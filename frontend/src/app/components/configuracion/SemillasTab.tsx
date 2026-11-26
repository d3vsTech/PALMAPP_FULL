import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ConfigSection, ConfigEmpty, ConfigRowActions } from './ConfigSection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Plus } from 'lucide-react';
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

/**
 * Deja la lista en el estado y en la caché de la sesión.
 *
 * Antes el `sessionStorage.setItem` vivía dentro del actualizador de estado.
 * React puede ejecutar esa función dos veces para comprobar que es pura, así
 * que ahí no van efectos: se calcula la lista nueva, se guarda, y recién
 * entonces se entrega al estado.
 */
function guardarSemillas(
  setSemillas: React.Dispatch<React.SetStateAction<Semilla[]>>,
  calcular: (previas: Semilla[]) => Semilla[],
) {
  setSemillas((previas) => {
    const siguientes = calcular(previas);
    try { sessionStorage.setItem(CACHE_KEY_SEMILLAS, JSON.stringify(siguientes)); } catch {}
    return siguientes;
  });
}

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
        guardarSemillas(setSemillas, (previas) =>
          previas.map((s) => (s.id === semillaEdit.id ? res.data : s)));
      } else {
        const res = await configuracionApi.semillas.crear(payload);
        guardarSemillas(setSemillas, (previas) => [...previas, res.data]);
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
          guardarSemillas(setSemillas, (previas) => previas.filter((s) => s.id !== id));
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
              {semillaEdit ? 'Editar semilla' : 'Nueva semilla'}
            </DialogTitle>
            <DialogDescription>
              Define una variedad de palma para el sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
                placeholder="Ej.: Elaeis guineensis"
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
      <ConfigSection
        title="Catálogo de semillas"
        description="Variedades de palma que se siembran en la finca."
        flush
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus strokeWidth={2} />
            Nueva semilla
          </Button>
        }
      >
        {semillas.length === 0 ? (
          <ConfigEmpty
            title="No hay semillas registradas"
            description="Agrega la primera variedad de palma."
            action={
              <Button onClick={() => handleOpenModal()}>
                <Plus strokeWidth={2} />
                Nueva semilla
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...semillas]
                .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' }))
                .map((semilla) => (
                  <TableRow key={semilla.id}>
                    <TableCell className="pl-5 font-semibold text-foreground">{semilla.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{semilla.tipo}</Badge>
                    </TableCell>
                    <TableCell className="pr-3">
                      <ConfigRowActions
                        label={semilla.nombre}
                        onEdit={() => handleOpenModal(semilla)}
                        onDelete={() => handleDelete(semilla.id, semilla.nombre)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </ConfigSection>
      </TabLoadingGate>
    </>
  );
}
