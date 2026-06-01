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
} from '../../../api/configuracion';

// Labores fijas de palma (mismo set hardcoded que V.12 para mantener el diseño).
// El precio real se configura en "Nómina y Liquidaciones > Precios Labores".
const laboresPalmaFijas = [
  { id: 'lp1', nombre: 'Cosecha', tipoPago: 'POR PALMA' as const },
  { id: 'lp2', nombre: 'Plateo', tipoPago: 'POR PALMA' as const },
  { id: 'lp3', nombre: 'Poda', tipoPago: 'POR PALMA' as const },
  { id: 'lp4', nombre: 'Abono', tipoPago: 'POR PALMA' as const },
  { id: 'lp5', nombre: 'Sanidad', tipoPago: 'JORNAL FIJO' as const },
];

type TipoPagoLabor = 'POR PALMA' | 'JORNAL FIJO';

export function LaboresTab() {
  const [laboresFinca, setLaboresFinca] = useState<Labor[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [laborEdit, setLaborEdit] = useState<Labor | null>(null);
  const [esLaborPalma, setEsLaborPalma] = useState(false);
  const [formData, setFormData] = useState<{ nombre: string; tipoPago: TipoPagoLabor }>({
    nombre: '',
    tipoPago: 'POR PALMA',
  });

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    configuracionApi.labores
      .listar({ per_page: 100 })
      .then((res) => setLaboresFinca(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las labores'));
  }, []);

  const handleOpenModal = (
    labor?: Labor | { nombre: string; tipoPago: TipoPagoLabor },
    esLaborPalmaArg?: boolean,
  ) => {
    if (labor) {
      const esPalma = !!esLaborPalmaArg;
      setEsLaborPalma(esPalma);
      if (esPalma) {
        setLaborEdit(null);
        const palma = labor as { nombre: string; tipoPago: TipoPagoLabor };
        setFormData({ nombre: palma.nombre, tipoPago: palma.tipoPago });
      } else {
        const real = labor as Labor;
        setLaborEdit(real);
        setFormData({ nombre: real.nombre, tipoPago: 'POR PALMA' });
      }
    } else {
      setEsLaborPalma(false);
      setLaborEdit(null);
      setFormData({ nombre: '', tipoPago: 'POR PALMA' });
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (esLaborPalma) {
      toast.info('El precio de las labores de palma se configura en "Nómina y Liquidaciones > Precios Labores"');
      setOpenModal(false);
      return;
    }
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la labor es obligatorio');
      return;
    }

    try {
      // El precio (valor_base) lo configura el admin desde "Nómina y
      // Liquidaciones > Precios Labores"; aquí solo guardamos nombre.
      // El backend exige valor_base al crear, por eso lo dejamos en 0
      // (placeholder hasta que se le ponga precio aparte). Al editar nombre
      // preservamos el valor_base que ya tiene.
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
              {laborEdit || esLaborPalma ? 'Editar Labor' : 'Nueva Labor'}
            </DialogTitle>
            <DialogDescription>
              Define un tipo de trabajo de campo. Los precios se configuran en Nómina y Liquidaciones
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre de la Labor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Cosecha, Plateo, Poda, Fertilización"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
                disabled={esLaborPalma}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoPago">
                Tipo de Pago <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.tipoPago}
                onValueChange={(value: TipoPagoLabor) => {
                  setFormData((prev) => ({ ...prev, tipoPago: value }));
                }}
                disabled={esLaborPalma}
              >
                <SelectTrigger id="tipoPago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POR PALMA">POR PALMA</SelectItem>
                  <SelectItem value="JORNAL FIJO">JORNAL FIJO</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.tipoPago === 'POR PALMA'
                  ? 'Se paga según cantidad de palmas trabajadas'
                  : 'Se paga un valor fijo por día trabajado'}
              </p>
            </div>

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
              {laboresPalmaFijas.map((labor) => (
                <div
                  key={labor.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold">{labor.nombre}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {labor.tipoPago === 'POR PALMA' ? 'Por Palma' : 'Jornal Fijo'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(labor, true)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
              <Button onClick={() => handleOpenModal()}>
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
                <Button onClick={() => handleOpenModal()}>
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
                        Por Palma
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(labor)}
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
