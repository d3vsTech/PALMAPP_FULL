import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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
  type Labor,
  type PrecioPalma,
  type TipoPagoPalma,
} from '../../../api/configuracion';

/** Label legible por tipo de palma del sistema (§4b). */
const NOMBRE_PALMA: Record<string, string> = {
  PLATEO: 'Plateo',
  PODA: 'Poda',
  SANIDAD: 'Sanidad',
  OTROS: 'Otros',
};

/**
 * Labores de palma fijas del diseño. Las que tienen `apiTipo` se editan vía
 * §4b (`/precios-palma`). Cosecha y Abono no viven en esa tabla (Cosecha usa
 * §9 precios_cosecha, Abono usa §3 precios-abono) — para mantener la UX
 * consistente, su `tipo_pago` se persiste en localStorage por tenant.
 */
const PALMA_LABELS: Array<{
  key: string;
  nombre: string;
  apiTipo?: 'PLATEO' | 'PODA' | 'SANIDAD' | 'OTROS';
  tipoPagoDefault: 'POR_PALMA' | 'JORNAL_FIJO';
}> = [
  { key: 'cosecha', nombre: 'Cosecha', tipoPagoDefault: 'POR_PALMA' },
  { key: 'plateo',  nombre: 'Plateo',  apiTipo: 'PLATEO',  tipoPagoDefault: 'POR_PALMA' },
  { key: 'poda',    nombre: 'Poda',    apiTipo: 'PODA',    tipoPagoDefault: 'POR_PALMA' },
  { key: 'abono',   nombre: 'Abono',   tipoPagoDefault: 'POR_PALMA' },
  { key: 'sanidad', nombre: 'Sanidad', apiTipo: 'SANIDAD', tipoPagoDefault: 'JORNAL_FIJO' },
];

/** Storage key para tipo_pago local de Cosecha/Abono. */
const LS_KEY_LOCAL_TIPO_PAGO = 'palmapp_labores_palma_tipo_pago_local';

function leerTipoPagoLocal(): Record<string, 'POR_PALMA' | 'JORNAL_FIJO'> {
  try {
    const raw = localStorage.getItem(LS_KEY_LOCAL_TIPO_PAGO);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function guardarTipoPagoLocal(key: string, valor: 'POR_PALMA' | 'JORNAL_FIJO') {
  const actual = leerTipoPagoLocal();
  actual[key] = valor;
  try {
    localStorage.setItem(LS_KEY_LOCAL_TIPO_PAGO, JSON.stringify(actual));
  } catch { /* cuota llena */ }
}

export function LaboresTab() {
  const [laboresFinca, setLaboresFinca] = useState<Labor[]>([]);
  const [preciosPalma, setPreciosPalma] = useState<PrecioPalma[]>([]);
  // tipo_pago de Cosecha/Abono (los que no viven en §4b). Persiste localmente.
  const [tipoPagoLocal, setTipoPagoLocal] = useState<Record<string, TipoPagoPalma>>(() => leerTipoPagoLocal());

  const [openModal, setOpenModal] = useState(false);
  const [laborEdit, setLaborEdit] = useState<Labor | null>(null);
  const [palmaEdit, setPalmaEdit] = useState<PrecioPalma | null>(null);
  // Si estamos editando una Labor Palma "local" (Cosecha/Abono) guardamos su key.
  const [palmaLocalEdit, setPalmaLocalEdit] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ nombre: string; tipo_pago: TipoPagoPalma }>({
    nombre: '',
    tipo_pago: 'POR_PALMA',
  });

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    configuracionApi.labores
      .listar({ per_page: 100 })
      .then((res) => setLaboresFinca(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las labores'));

    // §4b — los 4 tipos fijos del sistema (PLATEO, PODA, SANIDAD, OTROS) vienen
    // sembrados al provisionar el tenant. Solo se pueden EDITAR (precio_palma,
    // tipo_pago, estado). No hay POST ni DELETE.
    configuracionApi.preciosPalma
      .listar()
      .then((res) => setPreciosPalma(res.data ?? []))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las labores de palma'));
  }, []);

  const abrirModalLaborFinca = (labor?: Labor) => {
    setPalmaEdit(null);
    setPalmaLocalEdit(null);
    if (labor) {
      setLaborEdit(labor);
      setFormData({ nombre: labor.nombre, tipo_pago: 'POR_PALMA' });
    } else {
      setLaborEdit(null);
      setFormData({ nombre: '', tipo_pago: 'POR_PALMA' });
    }
    setOpenModal(true);
  };

  const abrirModalLaborPalma = (precio: PrecioPalma) => {
    setLaborEdit(null);
    setPalmaLocalEdit(null);
    setPalmaEdit(precio);
    setFormData({
      nombre: NOMBRE_PALMA[precio.tipo] ?? precio.tipo,
      tipo_pago: precio.tipo_pago,
    });
    setOpenModal(true);
  };

  /** Edita Cosecha o Abono — viven fuera de §4b, persisten en localStorage. */
  const abrirModalPalmaLocal = (label: typeof PALMA_LABELS[number]) => {
    setLaborEdit(null);
    setPalmaEdit(null);
    setPalmaLocalEdit(label.key);
    setFormData({
      nombre: label.nombre,
      tipo_pago: tipoPagoLocal[label.key] ?? label.tipoPagoDefault,
    });
    setOpenModal(true);
  };

  const handleSave = async () => {
    // EDITAR LABOR DE PALMA LOCAL (Cosecha / Abono — sin endpoint en §4b).
    if (palmaLocalEdit) {
      guardarTipoPagoLocal(palmaLocalEdit, formData.tipo_pago);
      setTipoPagoLocal((prev) => ({ ...prev, [palmaLocalEdit]: formData.tipo_pago }));
      toast.success('Labor de palma actualizada');
      setOpenModal(false);
      return;
    }

    // EDITAR LABOR DE PALMA (§4b — solo cambia tipo_pago / estado, no el nombre).
    if (palmaEdit) {
      try {
        const res = await configuracionApi.preciosPalma.editar(palmaEdit.id, {
          tipo_pago: formData.tipo_pago,
        });
        setPreciosPalma((prev) => prev.map((p) => (p.id === palmaEdit.id ? res.data : p)));
        toast.success(res.message ?? 'Labor de palma actualizada');
        setOpenModal(false);
      } catch (e: any) {
        if (e?.errors) {
          const primero = Object.values(e.errors).flat()[0];
          toast.error(typeof primero === 'string' ? primero : 'Error de validación');
        } else {
          toast.error(e?.message ?? 'No se pudo actualizar la labor de palma');
        }
      }
      return;
    }

    // CREAR / EDITAR LABOR DE FINCA.
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la labor es obligatorio');
      return;
    }
    try {
      if (laborEdit) {
        const payload = { nombre: formData.nombre.trim() };
        const res = await configuracionApi.labores.editar(laborEdit.id, payload);
        setLaboresFinca((prev) => prev.map((l) => (l.id === laborEdit.id ? res.data : l)));
      } else {
        const payload = { nombre: formData.nombre.trim(), valor_base: 0 };
        const res = await configuracionApi.labores.crear(payload);
        setLaboresFinca((prev) => [...prev, res.data]);
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la labor');
      }
    }
  };

  const handleDelete = (id: number, nombre: string) => {
    confirmDelete({
      title: '¿Eliminar labor?',
      description: `¿Estás seguro de que deseas eliminar la labor "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await configuracionApi.labores.eliminar(id);
          setLaboresFinca((prev) => prev.filter((l) => l.id !== id));
        } catch (e: any) {
          if (e?.code === ConfiguracionErrorCodes.LABOR_CON_JORNALES) {
            toast.error('No se puede eliminar: tiene jornales de Finca asociados');
          } else {
            toast.error(e?.message ?? 'No se pudo eliminar la labor');
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
              {palmaEdit
                ? `Editar ${NOMBRE_PALMA[palmaEdit.tipo] ?? palmaEdit.tipo}`
                : palmaLocalEdit
                  ? `Editar ${formData.nombre}`
                  : laborEdit
                    ? 'Editar Labor'
                    : 'Nueva Labor'}
            </DialogTitle>
            <DialogDescription>
              {palmaEdit || palmaLocalEdit
                ? 'Define cómo se paga esta labor de palma. El precio se configura en "Nómina y Liquidaciones > Precios Labores".'
                : 'Define un tipo de trabajo de campo. Los precios se configuran en Nómina y Liquidaciones.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre de la Labor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Reparación de portón"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
                disabled={!!palmaEdit || !!palmaLocalEdit}
              />
            </div>

            {(palmaEdit || palmaLocalEdit) && (
              <div className="space-y-2">
                <Label htmlFor="tipo_pago">
                  Tipo de Pago <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipo_pago}
                  onValueChange={(v: TipoPagoPalma) =>
                    setFormData((prev) => ({ ...prev, tipo_pago: v }))
                  }
                >
                  <SelectTrigger id="tipo_pago">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POR_PALMA">Por Palma</SelectItem>
                    <SelectItem value="JORNAL_FIJO">Jornal Fijo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.tipo_pago === 'POR_PALMA'
                    ? 'Se cobra por cada palma trabajada (precio × cantidad).'
                    : 'Se cobra un valor plano por jornal (sin contar palmas).'}
                </p>
              </div>
            )}

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Nota:</strong> Los precios de las labores se configuran en la sección "Nómina y Liquidaciones &gt; Precios Labores"
              </p>
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

      <div className="space-y-6">
        {/* LABORES PALMA - FIJAS */}
        <Card className="border-border">
          <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-primary/5">
            <div>
              <CardTitle>Labores Palma</CardTitle>
              <CardDescription>
                Labores estándar de palma - No se pueden crear nuevas
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              {PALMA_LABELS.map((label) => {
                // Matchea contra el API §4b si esta labor es editable allí.
                const precio = label.apiTipo
                  ? preciosPalma.find((p) => p.tipo === label.apiTipo)
                  : undefined;
                const tipoPago: TipoPagoPalma = precio?.tipo_pago
                  ?? tipoPagoLocal[label.key]
                  ?? label.tipoPagoDefault;
                return (
                  <div
                    key={label.key}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{label.nombre}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {tipoPago === 'POR_PALMA' ? 'Por Palma' : 'Jornal Fijo'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          precio
                            ? abrirModalLaborPalma(precio)
                            : abrirModalPalmaLocal(label)
                        }
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* LABORES FINCA - EDITABLES */}
        <Card className="border-border">
          <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Labores Finca</CardTitle>
                <CardDescription>
                  Labores personalizadas - Puedes crear y editar
                </CardDescription>
              </div>
              <Button onClick={() => abrirModalLaborFinca()}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Labor
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {laboresFinca.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <h3 className="mb-2 text-lg font-semibold">No hay labores personalizadas</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Comienza agregando tu primera labor de finca
                </p>
                <Button onClick={() => abrirModalLaborFinca()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Labor
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {laboresFinca.map((labor) => (
                  <div
                    key={labor.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{labor.nombre}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Jornal Fijo
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirModalLaborFinca(labor)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(labor.id, labor.nombre)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
