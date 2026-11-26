import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
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
  type Insumo,
} from '../../../api/configuracion';
import { cached, invalidate } from '../../../api/cache';

const CACHE_KEY_INSUMOS = 'config:insumos';

/**
 * Catálogo de unidades de medida usadas en fertilizantes para palma de aceite.
 * Cubre los formatos del mercado colombiano:
 *  - sólidos granulados → kilogramo (bulto 50 kg) o tonelada (a granel)
 *  - líquidos → litro
 *  - efluentes (POME, vinaza) → metro cúbico
 *  - micronutrientes en microdosis → gramo
 */
const unidadesMedida: Array<{ value: string; label: string }> = [
  { value: 'gramo',         label: 'Gramo (g)' },
  { value: 'kilogramo',     label: 'Kilogramo (kg)' },
  { value: 'tonelada',      label: 'Tonelada (t)' },
  { value: 'litro',         label: 'Litro (L)' },
  { value: 'metro_cubico',  label: 'Metro cúbico (m³)' },
];

/**
 * Mapeo de presentación → unidad de medida real.
 *
 * El seed del backend cargó la columna "Presentación" del doc de fertilizantes
 * (Gránulo, Cápsula, Polvo, Líquido, etc.) en el campo `unidad_medida`. Eso es
 * una presentación física, no la unidad de pesaje/volumen.
 *
 * Este mapeo normaliza esos valores a la unidad de medida correcta según la
 * columna "Unidad de Medida" del mismo doc. La heurística:
 *  - Cualquier forma líquida → Litro.
 *  - Sólidos (gránulo, polvo, cápsula, sólido, cristales) → Kilogramo.
 *  - Si el valor ya es uno de nuestros codes (`kilogramo`, `litro`, ...) se
 *    deja pasar y se renderiza con su label.
 *  - Si no matchea, se devuelve el raw para no ocultar datos del backend.
 */
const PRESENTACION_A_UNIDAD: Record<string, string> = {
  // Sólidos puros → Kilogramo (kg)
  'granulo': 'kilogramo',
  'gránulo': 'kilogramo',
  'granulo/polvo': 'kilogramo',
  'gránulo/polvo': 'kilogramo',
  'granulo/soluble': 'kilogramo',
  'gránulo/soluble': 'kilogramo',
  'granulo dispersable': 'kilogramo',
  'gránulo dispersable': 'kilogramo',
  'granulado dispersable': 'kilogramo',
  'granulo rojo/blanco': 'kilogramo',
  'gránulo rojo/blanco': 'kilogramo',
  'polvo': 'kilogramo',
  'polvo/granulado': 'kilogramo',
  'polvo/granulo': 'kilogramo',
  'polvo/gránulo': 'kilogramo',
  'polvo soluble': 'kilogramo',
  'polvo/cristales': 'kilogramo',
  'capsula': 'kilogramo',
  'cápsula': 'kilogramo',
  'solido': 'kilogramo',
  'sólido': 'kilogramo',
  'solido humedo': 'kilogramo',
  'sólido húmedo': 'kilogramo',
  'cristales': 'kilogramo',
  'soluble': 'kilogramo',
  'soluble/granulo': 'kilogramo',
  'soluble/gránulo': 'kilogramo',
  // Líquidos → Litro (L)
  'liquido': 'litro',
  'líquido': 'litro',
  'liquido/semisolido': 'litro',
  'líquido/semisólido': 'litro',
  'semisolido': 'litro',
  'semisólido': 'litro',
  // Mixtos sólido/líquido (humus de lombriz) → Litro como default (más versátil)
  'solido/liquido': 'litro',
  'sólido/líquido': 'litro',
};

function formatearUnidad(raw?: string | null): string {
  if (!raw) return '—';
  const trim = raw.trim();
  // 1) Si ya es uno de nuestros codes, devolvemos el label.
  const directo = unidadesMedida.find((u) => u.value === trim.toLowerCase());
  if (directo) return directo.label;
  // 2) Si es una presentación conocida del seed, traducimos a la unidad real.
  const norm = trim.toLowerCase().replace(/\s+/g, ' ').replace(/_/g, ' ');
  const mapeado = PRESENTACION_A_UNIDAD[norm] ?? PRESENTACION_A_UNIDAD[norm.replace(/\s/g, '')];
  if (mapeado) {
    const u = unidadesMedida.find((x) => x.value === mapeado);
    return u?.label ?? trim;
  }
  // 3) Fallback: el raw tal cual (no ocultamos datos del backend).
  return trim;
}

export function InsumosTab() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [insumoEdit, setInsumoEdit] = useState<Insumo | null>(null);
  const [formData, setFormData] = useState({ nombre: '', unidadMedida: '' });

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    cached(CACHE_KEY_INSUMOS, () => configuracionApi.insumos.listar({ per_page: 100 }))
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
      invalidate(CACHE_KEY_INSUMOS);
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
          invalidate(CACHE_KEY_INSUMOS);
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
              {insumoEdit ? 'Editar insumo' : 'Nuevo insumo'}
            </DialogTitle>
            <DialogDescription>
              Define un producto químico o fertilizante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej.: KCl, Urea, Glifosato"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidad">
                Unidad de medida <span className="text-destructive">*</span>
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
                  {unidadesMedida.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
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
      <ConfigSection
        title="Catálogo de insumos"
        description="Productos químicos y fertilizantes utilizados en la finca."
        flush
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus strokeWidth={2} />
            Nuevo insumo
          </Button>
        }
      >
        {insumos.length === 0 ? (
          <ConfigEmpty
            title="No hay insumos registrados"
            description="Agrega el primer insumo."
            action={
              <Button onClick={() => handleOpenModal()}>
                <Plus strokeWidth={2} />
                Agregar insumo
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Nombre</TableHead>
                <TableHead>Unidad de medida</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...insumos]
                .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' }))
                .map((insumo) => (
                  <TableRow key={insumo.id}>
                    <TableCell className="pl-5 font-semibold text-foreground">{insumo.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatearUnidad(insumo.unidad_medida)}
                    </TableCell>
                    <TableCell className="pr-3">
                      <ConfigRowActions
                        label={insumo.nombre}
                        onEdit={() => handleOpenModal(insumo)}
                        onDelete={() => handleDelete(insumo.id, insumo.nombre)}
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
