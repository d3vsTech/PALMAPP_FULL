import { Fragment, useEffect, useState } from 'react';
import { comoBoton } from '../../hooks/comoBoton';
import { Button } from '../ui/button';
import { ConfigSection, ConfigEmpty, ConfigRowActions } from './ConfigSection';
import { Plus, ChevronDown } from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
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
  | { kind: 'crear-trabajo' }
  | { kind: 'editar'; labor: Labor };

type FormState = {
  nombre: string;
  tipo_pago: TipoPagoLabor;
  /** Solo en 'crear-trabajo': la labor fija bajo la que cuelga el trabajo. */
  labor_id: number | null;
};

const FORM_VACIO: FormState = { nombre: '', tipo_pago: 'POR_PALMA', labor_id: null };

/**
 * Las dos labores que admiten trabajos: SANIDAD y OTROS.
 *
 * Son las únicas con desplegable en la tarjeta y las únicas que en el wizard
 * de Operaciones piden elegir un trabajo. Las demás fijas son la labor misma,
 * y una custom de palma es una labor plana con su propio precio.
 */
function admiteTrabajos(labor: Labor): boolean {
  return labor.es_sistema === true && (labor.tipo === 'SANIDAD' || labor.tipo === 'OTROS');
}

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
  /**
   * Sube de uno cada vez que se crea un trabajo desde el botón de arriba. Va
   * en la `key` del panel: lo remonta y vuelve a pedir su lista, que si no se
   * quedaría con la que cargó al abrirse.
   */
  const [versionTrabajos, setVersionTrabajos] = useState(0);
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
  const laboresConTrabajos = laboresPalma.filter(admiteTrabajos);

  // ── Modal ──────────────────────────────────────────────────────────────────
  const abrirNuevaPalma = () => {
    setModo({ kind: 'crear-palma' });
    setFormData(FORM_VACIO);
  };

  const abrirNuevaFinca = () => {
    setModo({ kind: 'crear-finca' });
    setFormData({ nombre: '', tipo_pago: 'JORNAL_FIJO', labor_id: null });
  };

  /** El atajo de arriba: crea el mismo trabajo que el desplegable de la labor. */
  const abrirNuevoTrabajo = () => {
    setModo({ kind: 'crear-trabajo' });
    setFormData({
      nombre: '',
      tipo_pago: 'JORNAL_FIJO',
      labor_id: laboresConTrabajos[0]?.id ?? null,
    });
  };

  const abrirEditar = (labor: Labor) => {
    setModo({ kind: 'editar', labor });
    setFormData({ nombre: labor.nombre, tipo_pago: labor.tipo_pago, labor_id: null });
  };

  const cerrarModal = () => setModo(null);

  /**
   * Crea un trabajo bajo Sanidad u Otros. Es el mismo endpoint que usa el
   * desplegable de la labor (§19), así que el trabajo queda igual: sin precio
   * propio, heredando el de la labor hasta que se le ponga uno en Precios de
   * Labores. Al terminar deja la labor abierta para que se vea dónde quedó.
   */
  const crearTrabajo = async (laborId: number) => {
    try {
      await configuracionApi.laborActividades.crear(laborId, {
        nombre: formData.nombre.trim(),
      });
      setExpandidas((prev) => new Set(prev).add(laborId));
      setVersionTrabajos((v) => v + 1);
      toast.success('Trabajo creado');
      cerrarModal();
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.ACTIVIDAD_DUPLICADA) {
        toast.error('Ya existe un trabajo con ese nombre en esa labor');
      } else if (e?.code === ConfiguracionErrorCodes.LABOR_NO_ADMITE_ACTIVIDADES) {
        toast.error('Esa labor no admite trabajos');
      } else {
        toast.error(e?.message ?? 'No se pudo crear el trabajo');
      }
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!modo) return;

    if (!formData.nombre.trim() && modo.kind !== 'editar') {
      toast.error('El nombre de la labor es obligatorio');
      return;
    }

    if (modo.kind === 'crear-trabajo') {
      if (!formData.labor_id) {
        toast.error('Elige la labor a la que pertenece el trabajo');
        return;
      }
      await crearTrabajo(formData.labor_id);
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
  // En COSECHA "POR_PALMA" se muestra como "Por kilogramo" porque el pago se
  // calcula sobre el peso confirmado (precios_cosecha). El value en backend
  // sigue siendo POR_PALMA, solo cambia el label visible.
  const labelTipoPago = (tp: TipoPagoLabor, tipo?: TipoLaborPalma | null) => {
    if (tp === 'POR_PALMA') return tipo === 'COSECHA' ? 'Por kilogramo' : 'Por palma';
    return 'Jornal fijo';
  };

  const editingFija = modo?.kind === 'editar' && modo.labor.es_sistema;
  const editingFinca = modo?.kind === 'editar' && modo.labor.categoria === 'FINCA';
  const editingCosecha = modo?.kind === 'editar' && modo.labor.tipo === 'COSECHA';
  const creatingFinca = modo?.kind === 'crear-finca';
  const creandoTrabajo = modo?.kind === 'crear-trabajo';
  const tipoPagoVisible = !creatingFinca && !editingFinca;

  return (
    <>
      {ConfirmDeleteDialog}
      <Dialog open={!!modo} onOpenChange={(o) => !o && cerrarModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modo?.kind === 'editar'
                ? 'Editar labor'
                : creandoTrabajo
                  ? 'Nuevo trabajo'
                  : 'Nueva labor'}
            </DialogTitle>
            <DialogDescription>
              {creandoTrabajo
                ? 'Queda dentro de Sanidad o de Otros, y desde ahí se elige al registrar la planilla en Operaciones.'
                : 'Define un tipo de trabajo de campo. Los precios se configuran en Pagos y liquidaciones.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {creandoTrabajo && (
              <div className="space-y-2">
                <Label htmlFor="labor_padre">
                  Tipo de labor <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.labor_id ? String(formData.labor_id) : ''}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, labor_id: Number(v) }))
                  }
                >
                  <SelectTrigger id="labor_padre">
                    <SelectValue placeholder="Elige la labor" />
                  </SelectTrigger>
                  <SelectContent>
                    {laboresConTrabajos.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        {l.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Solo Sanidad y Otros reciben trabajos. Las demás labores son el
                  trabajo en sí.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nombre">
                {creandoTrabajo ? 'Nombre del trabajo' : 'Nombre de la labor'}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder={
                  creandoTrabajo
                    ? 'Ej: Censo de plagas, Tratamiento de PC'
                    : modo?.kind === 'crear-finca'
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

            {creandoTrabajo ? null : tipoPagoVisible ? (
              <div className="space-y-2">
                <Label htmlFor="tipo_pago">
                  Tipo de pago <span className="text-destructive">*</span>
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
                      {editingCosecha ? 'Por kilogramo' : 'Por palma'}
                    </SelectItem>
                    <SelectItem value="JORNAL_FIJO">Jornal fijo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.tipo_pago === 'POR_PALMA'
                    ? editingCosecha
                      ? 'Se paga según kilogramos cosechados'
                      : 'Se paga según cantidad de palmas trabajadas'
                    : 'Se paga un valor fijo por día trabajado'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="tipo_pago_finca">
                  Tipo de pago <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tipo_pago_finca"
                  value="Jornal fijo"
                  disabled
                  className="bg-muted/60"
                />
                <p className="text-xs text-muted-foreground">
                  Las labores de finca solo permiten pago por jornal fijo.
                </p>
              </div>
            )}

            <p className="rounded-lg bg-info-soft px-3 py-2.5 text-sm text-info">
              Los precios de las labores se configuran en Pagos y liquidaciones, Precios de labores.
            </p>
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
        {/* LABORES PALMA — 6 fijas del sistema. Ya no se crean labores
            custom desde aquí: los trabajos extra se registran como
            sub-actividades dentro de Sanidad u Otros. */}
        <ConfigSection
          title="Labores de palma"
          description="Trabajos sobre la palma. Las predefinidas se pueden editar pero no eliminar."
          flush
          actions={
            <>
              {/* Atajo al mismo "Nuevo trabajo" del desplegable de Sanidad y
                  Otros, que son las únicas labores a las que se les agregan. */}
              {laboresConTrabajos.length > 0 && (
                <Button variant="outline" onClick={abrirNuevoTrabajo}>
                  <Plus strokeWidth={2} />
                  Nueva labor de palma
                </Button>
              )}
            </>
          }
        >
          {laboresPalma.length === 0 ? (
            <ConfigEmpty
              title="No hay labores de palma"
              description="Las labores predefinidas del sistema aparecerán aquí."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Labor</TableHead>
                  <TableHead>Tipo de pago</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
              {[...laboresPalma].sort((a, b) => {
                // Mismo orden que las tabs del wizard de Operaciones §3:
                // Cosecha → Plateo → Poda → Fertilización → Sanidad → Otros
                // → custom (alfabético). Las fijas usan `tipo`; las custom
                // van al final ordenadas por nombre.
                const ORDEN: Record<string, number> = {
                  COSECHA: 1, PLATEO: 2, PODA: 3, FERTILIZACION: 4, SANIDAD: 5, OTROS: 6,
                };
                const oa = a.tipo ? ORDEN[a.tipo] ?? 99 : 99;
                const ob = b.tipo ? ORDEN[b.tipo] ?? 99 : 99;
                if (oa !== ob) return oa - ob;
                return (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' });
              }).map((labor) => {
                // Desde agosto 2026, OTROS es una labor fija (`es_sistema=true`,
                // `tipo='OTROS'`) sembrada en todo tenant. `esFija` cubre las 6
                // fijas del sistema (COSECHA, PLATEO, PODA, FERT, SANIDAD, OTROS).
                const esFija = labor.es_sistema === true;
                // Solo las 2 fijas del sistema con desplegable de trabajos:
                // SANIDAD y OTROS. Las labores custom que el admin cree NO
                // muestran el panel — su propósito es ser labores planas con
                // su propio precio y tipo_pago.
                const admiteActividades = admiteTrabajos(labor);
                const expandida = expandidas.has(labor.id);
                return (
                  <Fragment key={labor.id}>
                    <TableRow
                      className={admiteActividades ? 'cursor-pointer' : undefined}
                      {...comoBoton(() => toggleExpandida(labor.id), admiteActividades)}
                    >
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2">
                          {admiteActividades && (
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                                expandida ? '' : '-rotate-90'
                              }`}
                              strokeWidth={2}
                            />
                          )}
                          <span className="font-semibold text-foreground">{labor.nombre}</span>
                          {esFija && (
                            <Badge variant="secondary" className="ml-2">Predefinida</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {labelTipoPago(labor.tipo_pago, labor.tipo)}
                      </TableCell>
                      <TableCell className="pr-3" onClick={(e) => e.stopPropagation()}>
                        <ConfigRowActions
                          label={labor.nombre}
                          onEdit={() => abrirEditar(labor)}
                          onDelete={esFija ? undefined : () => handleDelete(labor)}
                        />
                      </TableCell>
                    </TableRow>
                    {admiteActividades && expandida && (
                      <TableRow>
                        <TableCell colSpan={3} className="bg-muted/20 p-0">
                          <LaborActividadesPanel
                            key={`${labor.id}-${versionTrabajos}`}
                            laborId={labor.id}
                            open={expandida}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              </TableBody>
            </Table>
          )}
        </ConfigSection>

        {/* LABORES FINCA — custom (siempre JORNAL_FIJO) */}
        <ConfigSection
          title="Labores de finca"
          description="Labores propias de la finca, pagadas por jornal fijo."
          flush
          actions={
            <Button variant="outline" onClick={abrirNuevaFinca}>
              <Plus strokeWidth={2} />
              Nueva labor de finca
            </Button>
          }
        >
          {laboresFinca.length === 0 ? (
            <ConfigEmpty
              title="No hay labores de finca"
              description="Agrega la primera labor personalizada de la finca."
              action={
                <Button onClick={abrirNuevaFinca}>
                  <Plus strokeWidth={2} />
                  Agregar labor
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Labor</TableHead>
                  <TableHead>Tipo de pago</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...laboresFinca]
                  .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' }))
                  .map((labor) => (
                    <TableRow key={labor.id}>
                      <TableCell className="pl-5 font-semibold text-foreground">{labor.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">Jornal fijo</TableCell>
                      <TableCell className="pr-3">
                        <ConfigRowActions
                          label={labor.nombre}
                          onEdit={() => abrirEditar(labor)}
                          onDelete={() => handleDelete(labor)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </ConfigSection>
      </div>
      </TabLoadingGate>
    </>
  );
}
