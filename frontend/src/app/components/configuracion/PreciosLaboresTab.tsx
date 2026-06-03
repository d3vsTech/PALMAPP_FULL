import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type PrecioCosecha,
  type PrecioAbono,
  type PrecioPalma,
  type TipoPalmaPrecio,
  type Labor,
} from '../../../api/configuracion';
import { lotesApi } from '../../../api/plantacion';
import { formatCOP, formatThousands, parseCOP } from '../lib/format';

type LoteOption = { id: number; nombre: string };

const PALMA_LABEL: Record<TipoPalmaPrecio, string> = {
  PLATEO: 'Precio Plateo',
  PODA: 'Precio Poda',
  SANIDAD: 'Precio Control de Plagas',
  OTROS: 'Precio Otros',
};

/** Subtítulo y unidad se derivan del `tipo_pago` real del backend §4b
 *  (POR_PALMA o JORNAL_FIJO), no del `tipo` hardcodeado, para que cuando
 *  el admin cambia el tipo_pago desde "Labores", se refleje aquí también. */
function palmaSubLabel(p: PrecioPalma): string {
  return p.tipo_pago === 'JORNAL_FIJO' ? 'Precio por jornal fijo' : 'Precio por palma';
}

function palmaUnidad(p: PrecioPalma): string {
  return p.tipo_pago === 'JORNAL_FIJO' ? '/jornal' : '/palma';
}

function palmaLabelInput(p: PrecioPalma): string {
  return p.tipo_pago === 'JORNAL_FIJO' ? 'Valor por Jornal' : 'Valor por Palma';
}

const PALMA_GRADIENT: Record<TipoPalmaPrecio, string> = {
  PLATEO: 'from-amber-50/50 to-amber-50/10 dark:from-amber-950/20 dark:to-amber-950/5',
  PODA: 'from-purple-50/50 to-purple-50/10 dark:from-purple-950/20 dark:to-purple-950/5',
  SANIDAD: 'from-red-50/50 to-red-50/10 dark:from-red-950/20 dark:to-red-950/5',
  OTROS: 'from-slate-50/50 to-slate-50/10 dark:from-slate-950/20 dark:to-slate-950/5',
};

const PALMA_VALUE: Record<TipoPalmaPrecio, string> = {
  PLATEO: 'plateo',
  PODA: 'poda',
  SANIDAD: 'sanidad',
  OTROS: 'otros',
};

const FORM_COSECHA_VACIO = { lote_id: '', precio: '', anio: String(new Date().getFullYear()) };
const FORM_ABONO_VACIO = { gramos_min: '', gramos_max: '', precio_palma: '' };

export function PreciosLaboresTab() {
  // Cosecha
  const [preciosCosecha, setPreciosCosecha] = useState<PrecioCosecha[]>([]);
  const [lotes, setLotes] = useState<LoteOption[]>([]);
  const [openCosecha, setOpenCosecha] = useState(false);
  const [cosechaEdit, setCosechaEdit] = useState<PrecioCosecha | null>(null);
  const [formCosecha, setFormCosecha] = useState(FORM_COSECHA_VACIO);

  // Abonada
  const [rangosAbono, setRangosAbono] = useState<PrecioAbono[]>([]);
  const [openAbono, setOpenAbono] = useState(false);
  const [abonoEdit, setAbonoEdit] = useState<PrecioAbono | null>(null);
  const [formAbono, setFormAbono] = useState(FORM_ABONO_VACIO);

  // Precios de Palma
  const [preciosPalma, setPreciosPalma] = useState<PrecioPalma[]>([]);
  const [palmaInputs, setPalmaInputs] = useState<Record<number, string>>({});

  // Labores de Finca (precio = valor_base de §4 Labores)
  const [laboresFinca, setLaboresFinca] = useState<Labor[]>([]);
  const [laborInputs, setLaborInputs] = useState<Record<number, string>>({});

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    Promise.all([
      configuracionApi.preciosCosecha.listar({ per_page: 100 }),
      configuracionApi.preciosAbono.listar(),
      configuracionApi.preciosPalma.listar(),
      lotesApi.listar({ per_page: 100 }),
      configuracionApi.labores.listar({ per_page: 100 }),
    ])
      .then(([cosecha, abono, palma, lotesRes, laboresRes]) => {
        setPreciosCosecha(cosecha.data);
        setRangosAbono(abono.data);
        setPreciosPalma(palma.data);
        setPalmaInputs(
          Object.fromEntries(
            palma.data.map((p) => [p.id, p.precio_palma != null ? formatThousands(p.precio_palma) : '']),
          ),
        );
        setLotes((lotesRes.data ?? []).map((l: any) => ({ id: l.id, nombre: l.nombre })));
        setLaboresFinca(laboresRes.data);
        setLaborInputs(
          Object.fromEntries(
            laboresRes.data.map((l) => [l.id, l.valor_base != null ? formatThousands(l.valor_base) : '']),
          ),
        );
      })
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los precios'));
  }, []);

  // ── Cosecha ────────────────────────────────────────────────────────────────
  const handleOpenCosecha = (precio?: PrecioCosecha) => {
    if (precio) {
      setCosechaEdit(precio);
      setFormCosecha({
        lote_id: String(precio.lote_id),
        precio: formatThousands(precio.precio),
        anio: String(precio.anio),
      });
    } else {
      setCosechaEdit(null);
      setFormCosecha(FORM_COSECHA_VACIO);
    }
    setOpenCosecha(true);
  };

  const handleSaveCosecha = async () => {
    if (!cosechaEdit && !formCosecha.lote_id) {
      toast.error('Selecciona un lote');
      return;
    }
    if (!formCosecha.precio || !formCosecha.anio) {
      toast.error('Precio y año son obligatorios');
      return;
    }
    try {
      if (cosechaEdit) {
        const res = await configuracionApi.preciosCosecha.editar(cosechaEdit.id, {
          precio: Number(parseCOP(formCosecha.precio)),
          anio: Number(formCosecha.anio),
        });
        setPreciosCosecha((prev) => prev.map((p) => (p.id === cosechaEdit.id ? res.data : p)));
        toast.success(res.message ?? 'Precio actualizado');
      } else {
        const res = await configuracionApi.preciosCosecha.crear({
          lote_id: Number(formCosecha.lote_id),
          precio: Number(parseCOP(formCosecha.precio)),
          anio: Number(formCosecha.anio),
        });
        setPreciosCosecha((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Precio creado');
      }
      setOpenCosecha(false);
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.PRECIO_COSECHA_DUPLICADO) {
        toast.error('Ya existe un precio para este lote en ese año');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el precio');
      }
    }
  };

  const handleDeleteCosecha = (precio: PrecioCosecha) => {
    confirmDelete({
      title: 'Eliminar precio de cosecha',
      description: `¿Eliminar el precio de "${loteNombre(precio)}" (${precio.anio})? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await configuracionApi.preciosCosecha.eliminar(precio.id);
          setPreciosCosecha((prev) => prev.filter((p) => p.id !== precio.id));
          toast.success('Precio eliminado');
        } catch (e: any) {
          toast.error(e?.message ?? 'No se pudo eliminar el precio');
        }
      },
    });
  };

  const loteNombre = (precio: PrecioCosecha) =>
    precio.lote?.nombre ?? lotes.find((l) => l.id === precio.lote_id)?.nombre ?? `Lote ${precio.lote_id}`;

  // ── Abonada ────────────────────────────────────────────────────────────────
  const handleOpenAbono = (rango?: PrecioAbono) => {
    if (rango) {
      setAbonoEdit(rango);
      setFormAbono({
        gramos_min: String(rango.gramos_min),
        gramos_max: String(rango.gramos_max),
        precio_palma: formatThousands(rango.precio_palma),
      });
    } else {
      setAbonoEdit(null);
      const ultimo = rangosAbono[rangosAbono.length - 1];
      setFormAbono({
        gramos_min: ultimo ? String(ultimo.gramos_max + 1) : '0',
        gramos_max: '',
        precio_palma: '',
      });
    }
    setOpenAbono(true);
  };

  const handleSaveAbono = async () => {
    if (!formAbono.gramos_min || !formAbono.gramos_max || !formAbono.precio_palma) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    try {
      const payload = {
        gramos_min: Number(formAbono.gramos_min),
        gramos_max: Number(formAbono.gramos_max),
        precio_palma: Number(parseCOP(formAbono.precio_palma)),
      };
      if (abonoEdit) {
        const res = await configuracionApi.preciosAbono.editar(abonoEdit.id, payload);
        setRangosAbono((prev) => prev.map((r) => (r.id === abonoEdit.id ? res.data : r)));
        toast.success(res.message ?? 'Rango actualizado');
      } else {
        const res = await configuracionApi.preciosAbono.crear(payload);
        setRangosAbono((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Rango creado');
      }
      setOpenAbono(false);
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.RANGO_SOLAPADO) {
        toast.error('El rango de gramos se solapa con un rango existente');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el rango');
      }
    }
  };

  const handleDeleteAbono = (rango: PrecioAbono) => {
    confirmDelete({
      title: 'Eliminar rango de abonada',
      description: `¿Eliminar el rango ${rango.gramos_min} - ${rango.gramos_max} gramos? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await configuracionApi.preciosAbono.eliminar(rango.id);
          setRangosAbono((prev) => prev.filter((r) => r.id !== rango.id));
          toast.success('Rango eliminado');
        } catch (e: any) {
          toast.error(e?.message ?? 'No se pudo eliminar el rango');
        }
      },
    });
  };

  // ── Labor Finca (precio = valor_base) ──────────────────────────────────────
  // Inline edit del valor_base de cada labor §4. Se persiste con onBlur
  // (PUT /v1/tenant/labores/{id}) — el admin solo configura el precio aquí
  // porque en "Operaciones > Trabajos / Labores" únicamente registra nombre.
  const handleSaveLaborFinca = async (labor: Labor) => {
    const raw = laborInputs[labor.id] ?? '';
    const limpio = parseCOP(raw);
    const valor = limpio ? Number(limpio) : 0;
    if (Number(parseCOP(formatThousands(labor.valor_base))) === valor) return;
    try {
      const res = await configuracionApi.labores.editar(labor.id, { valor_base: valor });
      setLaboresFinca((prev) => prev.map((l) => (l.id === labor.id ? res.data : l)));
      toast.success('Precio actualizado');
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el precio');
      }
    }
  };

  // ── Palma (PLATEO/PODA/SANIDAD/OTROS) ──────────────────────────────────────
  const handleSavePalma = async (palma: PrecioPalma) => {
    const raw = palmaInputs[palma.id];
    const limpio = parseCOP(raw);
    const precio = !limpio ? null : Number(limpio);
    try {
      const res = await configuracionApi.preciosPalma.editar(palma.id, { precio_palma: precio });
      setPreciosPalma((prev) => prev.map((p) => (p.id === palma.id ? res.data : p)));
      toast.success(res.message ?? 'Precio actualizado');
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el precio');
      }
    }
  };

  return (
    <div className="space-y-6">
      {ConfirmDeleteDialog}

      <div className="space-y-4">
        <h2>Precios de Labores</h2>
        <p className="text-muted-foreground">
          Configura los precios de cada labor con sus diferentes criterios de pago
        </p>
      </div>

      {/* Modal Cosecha */}
      <Dialog open={openCosecha} onOpenChange={setOpenCosecha}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cosechaEdit ? 'Editar Precio de Cosecha' : 'Nuevo Precio de Cosecha'}</DialogTitle>
            <DialogDescription>Precio por kg de fruto cosechado por lote y año</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cosecha-lote">
                Lote <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formCosecha.lote_id}
                onValueChange={(value) => setFormCosecha((prev) => ({ ...prev, lote_id: value }))}
                disabled={!!cosechaEdit}
              >
                <SelectTrigger id="cosecha-lote">
                  <SelectValue placeholder="Seleccionar lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotes.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cosecha-anio">
                  Año <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cosecha-anio"
                  type="number"
                  value={formCosecha.anio}
                  onChange={(e) => setFormCosecha((prev) => ({ ...prev, anio: e.target.value }))}
                  placeholder="2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cosecha-precio">
                  Precio por Kg <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="cosecha-precio"
                    inputMode="numeric"
                    value={formCosecha.precio}
                    onChange={(e) =>
                      setFormCosecha((prev) => ({ ...prev, precio: formatThousands(parseCOP(e.target.value)) }))
                    }
                    placeholder="0"
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCosecha(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCosecha}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Abono */}
      <Dialog open={openAbono} onOpenChange={setOpenAbono}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{abonoEdit ? 'Editar Rango de Abonada' : 'Nuevo Rango de Abonada'}</DialogTitle>
            <DialogDescription>Rango de gramos y precio por palma</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="abono-min">
                  Gramos Mínimo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="abono-min"
                  type="number"
                  value={formAbono.gramos_min}
                  onChange={(e) => setFormAbono((prev) => ({ ...prev, gramos_min: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abono-max">
                  Gramos Máximo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="abono-max"
                  type="number"
                  value={formAbono.gramos_max}
                  onChange={(e) => setFormAbono((prev) => ({ ...prev, gramos_max: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="abono-precio">
                Precio por Palma <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="abono-precio"
                  inputMode="numeric"
                  value={formAbono.precio_palma}
                  onChange={(e) =>
                    setFormAbono((prev) => ({ ...prev, precio_palma: formatThousands(parseCOP(e.target.value)) }))
                  }
                  placeholder="0"
                  className="pl-7"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAbono(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAbono}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LABORES PALMA */}
      <div className="space-y-4">
        <div className="border-l-4 border-primary pl-4 py-2">
          <h3 className="text-xl font-bold">Labores Palma</h3>
          <p className="text-sm text-muted-foreground">Labores estándar de palma</p>
        </div>

        <Accordion type="multiple" defaultValue={['cosecha', 'abonada']} className="space-y-4">
          {/* Sección: Precios de Cosecha */}
          <AccordionItem value="cosecha" className="border-0">
            <Card className="border-border">
              <CardHeader className="border-b bg-gradient-to-r from-green-50/50 to-green-50/10 dark:from-green-950/20 dark:to-green-950/5">
                <AccordionTrigger className="hover:no-underline py-0">
                  <div className="text-left">
                    <CardTitle>Precios de Cosecha</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Precio por kg de fruto cosechado por lote y año
                    </p>
                  </div>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Precios por Lote</h3>
                    <Button onClick={() => handleOpenCosecha()} size="sm" variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Agregar Precio
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full table-fixed">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-4 font-semibold w-2/5">Lote</th>
                          <th className="text-left p-4 font-semibold w-1/5">Año</th>
                          <th className="text-right p-4 font-semibold w-1/4">Precio por Kg</th>
                          <th className="text-center p-4 font-semibold w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {preciosCosecha.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                              No hay precios de cosecha registrados
                            </td>
                          </tr>
                        ) : (
                          preciosCosecha.map((item) => (
                            <tr key={item.id} className="border-t border-border">
                              <td className="p-4">{loteNombre(item)}</td>
                              <td className="p-4">{item.anio}</td>
                              <td className="p-4 text-right font-semibold">
                                {formatCOP(item.precio)} /kg
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => handleOpenCosecha(item)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteCosecha(item)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* Sección: Escala de Abonada */}
          <AccordionItem value="abonada" className="border-0">
            <Card className="border-border">
              <CardHeader className="border-b bg-gradient-to-r from-emerald-50/50 to-emerald-50/10 dark:from-emerald-950/20 dark:to-emerald-950/5">
                <AccordionTrigger className="hover:no-underline py-0">
                  <div className="text-left">
                    <CardTitle>Escala de Abonada</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Rangos de gramos y precios por palma
                    </p>
                  </div>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Rangos de Abonada</h3>
                      <Button onClick={() => handleOpenAbono()} size="sm" variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Agregar Rango
                      </Button>
                    </div>

                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full table-fixed">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-4 font-semibold w-1/4">Gramos Mínimo</th>
                            <th className="text-left p-4 font-semibold w-1/4">Gramos Máximo</th>
                            <th className="text-left p-4 font-semibold w-2/5">Precio por Palma</th>
                            <th className="text-center p-4 font-semibold w-16"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rangosAbono.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                                No hay rangos de abonada registrados
                              </td>
                            </tr>
                          ) : (
                            rangosAbono.map((rango) => (
                              <tr key={rango.id} className="border-t border-border">
                                <td className="p-4">{rango.gramos_min}</td>
                                <td className="p-4">{rango.gramos_max}</td>
                                <td className="p-4 font-semibold">
                                  {formatCOP(rango.precio_palma)} /palma
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenAbono(rango)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => handleDeleteAbono(rango)}
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 mx-auto"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* Secciones: Plateo / Poda / Control de Plagas / Otros */}
          {preciosPalma.map((palma) => (
            <AccordionItem key={palma.id} value={PALMA_VALUE[palma.tipo]} className="border-0">
              <Card className="border-border">
                <CardHeader className={`border-b bg-gradient-to-r ${PALMA_GRADIENT[palma.tipo]}`}>
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="text-left">
                      <CardTitle>{PALMA_LABEL[palma.tipo]}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{palmaSubLabel(palma)}</p>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="p-6">
                    <div className="max-w-md space-y-3">
                      <Label htmlFor={`precio-${palma.id}`}>{palmaLabelInput(palma)}</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id={`precio-${palma.id}`}
                          inputMode="numeric"
                          value={palmaInputs[palma.id] ?? ''}
                          onChange={(e) =>
                            setPalmaInputs((prev) => ({ ...prev, [palma.id]: formatThousands(parseCOP(e.target.value)) }))
                          }
                          onBlur={() => handleSavePalma(palma)}
                          className="text-lg font-semibold"
                          placeholder="0"
                        />
                        <span className="text-muted-foreground">{palmaUnidad(palma)}</span>
                      </div>
                      {palmaInputs[palma.id] && Number(parseCOP(palmaInputs[palma.id])) > 0 && (
                        <p className="text-sm text-success font-medium">
                          {formatCOP(parseCOP(palmaInputs[palma.id]))} {palmaUnidad(palma)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* LABORES FINCA */}
      <div className="space-y-4">
        <div className="border-l-4 border-muted-foreground pl-4 py-2">
          <h3 className="text-xl font-bold">Labores Finca</h3>
          <p className="text-sm text-muted-foreground">Precio por jornal de las labores personalizadas</p>
        </div>

        {laboresFinca.length === 0 ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/50 p-8 text-center">
            <p className="text-muted-foreground">
              No hay labores de finca configuradas. Agrega labores personalizadas en la sección "Operaciones &gt; Trabajos / Labores".
            </p>
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full table-fixed">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold w-1/2">Labor</th>
                      <th className="text-right p-4 font-semibold">Valor Base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laboresFinca.map((labor) => (
                      <tr key={labor.id} className="border-t border-border">
                        <td className="p-4 font-medium">{labor.nombre}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-muted-foreground text-sm">$</span>
                            <Input
                              inputMode="numeric"
                              value={laborInputs[labor.id] ?? ''}
                              onChange={(e) =>
                                setLaborInputs((prev) => ({
                                  ...prev,
                                  [labor.id]: formatThousands(parseCOP(e.target.value)),
                                }))
                              }
                              onBlur={() => handleSaveLaborFinca(labor)}
                              placeholder="0"
                              className="w-32 text-right"
                            />
                            <span className="text-muted-foreground text-sm">/jornal</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
