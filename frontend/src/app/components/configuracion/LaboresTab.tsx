import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Plus, Edit, Trash2, ChevronDown } from 'lucide-react';
import { LaborActividadesPanel } from './LaborActividadesPanel';
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
  type TipoPagoLabor,
  type TipoLaborPalma,
  type CategoriaLabor,
} from '../../../api/configuracion';
import { cached } from '../../../api/cache';
import { TabLoadingGate } from './TabLoadingGate';

/**
 * §4 Labores — catálogo unificado.
 *
 * Renderiza 2 cards:
 *  - Labores Palma: las 5 fijas del sistema (PLATEO/PODA/SANIDAD/COSECHA/
 *    FERTILIZACION) y las custom palma. Permite crear, editar y eliminar
 *    custom. Las fijas solo permiten editar tipo_pago.
 *  - Labores Finca: custom finca (siempre JORNAL_FIJO).
 */

type ModoEdicion =
  | { kind: 'crear-palma' }
  | { kind: 'crear-finca' }
  | { kind: 'editar'; labor: Labor };

type FormState = {
  nombre: string;
  tipo_pago: TipoPagoLabor;
};

const FORM_VACIO: FormState = { nombre: '', tipo_pago: 'POR_PALMA' };

export function LaboresTab() {
  const [labores, setLabores] = useState<Labor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<ModoEdicion | null>(null);
  const [formData, setFormData] = useState<FormState>(FORM_VACIO);
  /**
   * §19 — Set con los ids de labores cuyo panel de actividades está expandido.
   * Solo aplica a SANIDAD (fija) y a labores custom PALMA (es_sistema=false,
   * tipo=null). Las demás no admiten actividades — no muestran chevron.
   */
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());
  const toggleExpandida = (id: number) =>
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    cached('config:labores', () => configuracionApi.labores.listar({ per_page: 100 }))
      .then((res) => setLabores(res.data ?? []))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las labores'))
      .finally(() => setLoading(false));
  }, []);

  // Subconjuntos derivados.
  const laboresPalma = labores.filter((l) => l.categoria === 'PALMA');
  const laboresFinca = labores.filter((l) => l.categoria === 'FINCA');

  // ── Modal ──────────────────────────────────────────────────────────────────
  const abrirNuevaPalma = () => {
    setModo({ kind: 'crear-palma' });
    setFormData(FORM_VACIO);
  };

  const abrirNuevaFinca = () => {
    setModo({ kind: 'crear-finca' });
    setFormData({ nombre: '', tipo_pago: 'JORNAL_FIJO' });
  };

  const abrirEditar = (labor: Labor) => {
    setModo({ kind: 'editar', labor });
    setFormData({ nombre: labor.nombre, tipo_pago: labor.tipo_pago });
  };

  const cerrarModal = () => setModo(null);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!modo) return;

    if (!formData.nombre.trim() && modo.kind !== 'editar') {
      toast.error('El nombre de la labor es obligatorio');
      return;
    }

    try {
      if (modo.kind === 'editar') {
        const labor = modo.labor;
        // En labores fijas: nombre/categoria/tipo son inmutables; solo
        // mandamos tipo_pago. En custom mandamos nombre + tipo_pago.
        const payload: any = labor.es_sistema
          ? { tipo_pago: formData.tipo_pago }
          : { nombre: formData.nombre.trim(), tipo_pago: formData.tipo_pago };
        const res = await configuracionApi.labores.editar(labor.id, payload);
        setLabores((prev) => prev.map((l) => (l.id === labor.id ? res.data : l)));
        toast.success(res.message ?? 'Labor actualizada');
      } else {
        const categoria: CategoriaLabor = modo.kind === 'crear-palma' ? 'PALMA' : 'FINCA';
        const payload = {
          categoria,
          nombre: formData.nombre.trim(),
          // FINCA siempre fuerza JORNAL_FIJO server-side; mandamos algo válido.
          tipo_pago: categoria === 'FINCA' ? ('JORNAL_FIJO' as const) : formData.tipo_pago,
        };
        const res = await configuracionApi.labores.crear(payload);
        setLabores((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Labor creada');
      }
      cerrarModal();
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.LABOR_DUPLICADA) {
        toast.error('Ya existe una labor con ese nombre.');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la labor');
      }
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (labor: Labor) => {
    confirmDelete({
      title: '¿Eliminar labor?',
      description: `¿Estás seguro de que deseas eliminar la labor "${labor.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await configuracionApi.labores.eliminar(labor.id);
          setLabores((prev) => prev.filter((l) => l.id !== labor.id));
          toast.success('Labor eliminada');
        } catch (e: any) {
          if (e?.code === ConfiguracionErrorCodes.LABOR_DEL_SISTEMA) {
            toast.error('No se puede eliminar: es una labor del sistema');
          } else if (e?.code === ConfiguracionErrorCodes.LABOR_CON_JORNALES) {
            toast.error('No se puede eliminar: tiene jornales asociados');
          } else if (e?.code === ConfiguracionErrorCodes.LABOR_CON_COSECHAS) {
            toast.error('No se puede eliminar: tiene registros de cosecha asociados');
          } else {
            toast.error(e?.message ?? 'No se pudo eliminar la labor');
          }
        }
      },
    });
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  // En COSECHA "POR_PALMA" se muestra como "Por Kilogramo" porque el pago se
  // calcula sobre el peso confirmado (precios_cosecha). El value en backend
  // sigue siendo POR_PALMA — solo cambia el label visible.
  const labelTipoPago = (tp: TipoPagoLabor, tipo?: TipoLaborPalma | null) => {
    if (tp === 'POR_PALMA') return tipo === 'COSECHA' ? 'Por Kilogramo' : 'Por Palma';
    return 'Jornal Fijo';
  };

  const editingFija = modo?.kind === 'editar' && modo.labor.es_sistema;
  const editingFinca = modo?.kind === 'editar' && modo.labor.categoria === 'FINCA';
  const editingCosecha = modo?.kind === 'editar' && modo.labor.tipo === 'COSECHA';
  const creatingFinca = modo?.kind === 'crear-finca';
  const tipoPagoVisible = !creatingFinca && !editingFinca;

  return (
    <>
      {ConfirmDeleteDialog}
      <Dialog open={!!modo} onOpenChange={(o) => !o && cerrarModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modo?.kind === 'editar'
                ? `Editar ${modo.labor.nombre}`
                : modo?.kind === 'crear-palma'
                  ? 'Nueva Labor de Palma'
                  : 'Nueva Labor de Finca'}
            </DialogTitle>
            <DialogDescription>
              Define un tipo de trabajo de campo. Los precios se configuran en
              "Nómina y Liquidaciones &gt; Precios Labores".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre de la Labor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder={
                  modo?.kind === 'crear-finca'
                    ? 'Ej: Reparación de portón'
                    : 'Ej: Resiembra, Repique'
                }
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
                disabled={editingFija}
              />
              {editingFija && (
                <p className="text-xs text-muted-foreground">
                  El nombre de las labores del sistema no se puede editar.
                </p>
              )}
            </div>

            {tipoPagoVisible ? (
              <div className="space-y-2">
                <Label htmlFor="tipo_pago">
                  Tipo de Pago <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipo_pago}
                  onValueChange={(v: TipoPagoLabor) =>
                    setFormData((prev) => ({ ...prev, tipo_pago: v }))
                  }
                >
                  <SelectTrigger id="tipo_pago">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POR_PALMA">
                      {editingCosecha ? 'Por Kilogramo' : 'Por Palma'}
                    </SelectItem>
                    <SelectItem value="JORNAL_FIJO">Jornal Fijo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="tipo_pago_finca">
                  Tipo de Pago <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tipo_pago_finca"
                  value="JORNAL FIJO"
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Las labores de finca solo permiten pago por jornal fijo.
                </p>
              </div>
            )}

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Nota:</strong> Los precios de las labores se configuran en la sección "Nómina y Liquidaciones &gt; Precios Labores".
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TabLoadingGate loading={loading} message="Cargando labores…">
      <div className="space-y-6">
        {/* LABORES PALMA — 5 fijas + custom */}
        <Card className="border-border">
          <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Labores Palma</CardTitle>
                <CardDescription>
                  Labores de palma - Puedes crear nuevas y editar
                </CardDescription>
              </div>
              <Button onClick={abrirNuevaPalma}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Labor
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {laboresPalma.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay labores de palma configuradas.
              </p>
            ) : (
              <div className="space-y-2">
                {[...laboresPalma].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })).map((labor) => {
                  // "Otros" es labor especial: el wizard la crea automáticamente
                  // y sirve como contenedor genérico. La tratamos como fija
                  // (no eliminable, badge "Predefinida") aunque el backend la
                  // guarde con es_sistema=false.
                  const esOtros = (labor.nombre ?? '').trim().toLowerCase() === 'otros';
                  const esFija = labor.es_sistema || esOtros;
                  // §19: solo SANIDAD (fija) y las labores custom PALMA
                  // (es_sistema=false, tipo=null) admiten actividades.
                  const admiteActividades =
                    labor.tipo === 'SANIDAD' ||
                    (!labor.es_sistema && labor.categoria === 'PALMA' && labor.tipo == null);
                  const expandida = expandidas.has(labor.id);
                  return (
                    <div
                      key={labor.id}
                      className="rounded-lg bg-muted/30 border border-border overflow-hidden"
                    >
                      <div
                        className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                          admiteActividades ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => admiteActividades && toggleExpandida(labor.id)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {admiteActividades && (
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform ${
                                expandida ? 'rotate-180' : ''
                              }`}
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-semibold">{labor.nombre}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {labelTipoPago(labor.tipo_pago, labor.tipo)}
                              {esFija && ' · Predefinida'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEditar(labor)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!esFija && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(labor)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {admiteActividades && expandida && (
                        <LaborActividadesPanel laborId={labor.id} open={expandida} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* LABORES FINCA — custom (siempre JORNAL_FIJO) */}
        <Card className="border-border">
          <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Labores Finca</CardTitle>
                <CardDescription>
                  Labores personalizadas - Puedes crear y editar
                </CardDescription>
              </div>
              <Button onClick={abrirNuevaFinca}>
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
                <Button onClick={abrirNuevaFinca}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Labor
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {[...laboresFinca].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })).map((labor) => (
                  <div
                    key={labor.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{labor.nombre}</p>
                      <p className="text-sm text-muted-foreground mt-1">Jornal Fijo</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirEditar(labor)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(labor)}
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
      </TabLoadingGate>
    </>
  );
}
