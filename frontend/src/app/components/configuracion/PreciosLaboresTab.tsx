import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Edit, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { CardTitle } from '../ui/card';
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
import { ConfirmDeleteDialog } from '../ui/confirm-delete-dialog';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type PrecioCosecha,
  type PrecioAbono,
  type PrecioPalma,
  type TipoPalmaPrecio,
} from '../../../api/configuracion';
import { lotesApi } from '../../../api/plantacion';

/**
 * Tab "Precios de Labores" conectado al API real. Agrupa 3 recursos:
 *   A. Precios de Cosecha   → configuracionApi.preciosCosecha (CRUD por lote+año)
 *   B. Escala de Abonada    → configuracionApi.preciosAbono   (CRUD por rangos)
 *   C. Plateo/Poda/Sanidad/Otros → configuracionApi.preciosPalma (solo PUT)
 *
 * "Control de Plagas" en la UI = tipo SANIDAD.
 */

type LoteOption = { id: number; nombre: string };

const PALMA_LABEL: Record<TipoPalmaPrecio, string> = {
  PLATEO: 'Precio Plateo',
  PODA: 'Precio Poda',
  SANIDAD: 'Precio Control de Plagas',
  OTROS: 'Precio Otros',
};

const PALMA_GRADIENT: Record<TipoPalmaPrecio, string> = {
  PLATEO: 'from-amber-50/50 to-amber-50/10 dark:from-amber-950/20 dark:to-amber-950/5',
  PODA: 'from-purple-50/50 to-purple-50/10 dark:from-purple-950/20 dark:to-purple-950/5',
  SANIDAD: 'from-red-50/50 to-red-50/10 dark:from-red-950/20 dark:to-red-950/5',
  OTROS: 'from-slate-50/50 to-slate-50/10 dark:from-slate-950/20 dark:to-slate-950/5',
};

const PALMA_ACCORDION_VALUE: Record<TipoPalmaPrecio, string> = {
  PLATEO: 'plateo',
  PODA: 'poda',
  SANIDAD: 'control-plagas',
  OTROS: 'otros',
};

const FORM_COSECHA_VACIO = { lote_id: '', precio: '', anio: String(new Date().getFullYear()) };
const FORM_ABONO_VACIO = { gramos_min: '', gramos_max: '', precio_palma: '' };

export function PreciosLaboresTab() {
  const [cargando, setCargando] = useState(true);

  // Sección A — Cosecha
  const [preciosCosecha, setPreciosCosecha] = useState<PrecioCosecha[]>([]);
  const [lotes, setLotes] = useState<LoteOption[]>([]);
  const [openCosecha, setOpenCosecha] = useState(false);
  const [cosechaEdit, setCosechaEdit] = useState<PrecioCosecha | null>(null);
  const [formCosecha, setFormCosecha] = useState(FORM_COSECHA_VACIO);
  const [cosechaAEliminar, setCosechaAEliminar] = useState<PrecioCosecha | null>(null);
  const [guardandoCosecha, setGuardandoCosecha] = useState(false);

  // Sección B — Abonada
  const [rangosAbono, setRangosAbono] = useState<PrecioAbono[]>([]);
  const [openAbono, setOpenAbono] = useState(false);
  const [abonoEdit, setAbonoEdit] = useState<PrecioAbono | null>(null);
  const [formAbono, setFormAbono] = useState(FORM_ABONO_VACIO);
  const [abonoAEliminar, setAbonoAEliminar] = useState<PrecioAbono | null>(null);
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  // Sección C — Precios de Palma
  const [preciosPalma, setPreciosPalma] = useState<PrecioPalma[]>([]);
  const [palmaInputs, setPalmaInputs] = useState<Record<number, string>>({});
  const [guardandoPalma, setGuardandoPalma] = useState<number | null>(null);

  useEffect(() => {
    setCargando(true);
    Promise.all([
      configuracionApi.preciosCosecha.listar({ per_page: 100 }),
      configuracionApi.preciosAbono.listar(),
      configuracionApi.preciosPalma.listar(),
      lotesApi.listar({ per_page: 100 }),
    ])
      .then(([cosecha, abono, palma, lotesRes]) => {
        setPreciosCosecha(cosecha.data);
        setRangosAbono(abono.data);
        setPreciosPalma(palma.data);
        setPalmaInputs(
          Object.fromEntries(
            palma.data.map((p) => [p.id, p.precio_palma != null ? String(p.precio_palma) : '']),
          ),
        );
        setLotes((lotesRes.data ?? []).map((l: any) => ({ id: l.id, nombre: l.nombre })));
      })
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los precios'))
      .finally(() => setCargando(false));
  }, []);

  // ─── Sección A: Cosecha ───────────────────────────────────────────────────
  const handleOpenCosecha = (precio?: PrecioCosecha) => {
    if (precio) {
      setCosechaEdit(precio);
      setFormCosecha({
        lote_id: String(precio.lote_id),
        precio: String(precio.precio),
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
    setGuardandoCosecha(true);
    try {
      if (cosechaEdit) {
        const res = await configuracionApi.preciosCosecha.editar(cosechaEdit.id, {
          precio: Number(formCosecha.precio),
          anio: Number(formCosecha.anio),
        });
        setPreciosCosecha((prev) => prev.map((p) => (p.id === cosechaEdit.id ? res.data : p)));
        toast.success(res.message ?? 'Precio actualizado');
      } else {
        const res = await configuracionApi.preciosCosecha.crear({
          lote_id: Number(formCosecha.lote_id),
          precio: Number(formCosecha.precio),
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
    } finally {
      setGuardandoCosecha(false);
    }
  };

  const handleDeleteCosecha = async () => {
    if (!cosechaAEliminar) return;
    try {
      await configuracionApi.preciosCosecha.eliminar(cosechaAEliminar.id);
      setPreciosCosecha((prev) => prev.filter((p) => p.id !== cosechaAEliminar.id));
      toast.success('Precio eliminado');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo eliminar el precio');
    } finally {
      setCosechaAEliminar(null);
    }
  };

  const loteNombre = (precio: PrecioCosecha) =>
    precio.lote?.nombre ?? lotes.find((l) => l.id === precio.lote_id)?.nombre ?? `Lote ${precio.lote_id}`;

  // ─── Sección B: Abonada ───────────────────────────────────────────────────
  const handleOpenAbono = (rango?: PrecioAbono) => {
    if (rango) {
      setAbonoEdit(rango);
      setFormAbono({
        gramos_min: String(rango.gramos_min),
        gramos_max: String(rango.gramos_max),
        precio_palma: String(rango.precio_palma),
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
    setGuardandoAbono(true);
    try {
      const payload = {
        gramos_min: Number(formAbono.gramos_min),
        gramos_max: Number(formAbono.gramos_max),
        precio_palma: Number(formAbono.precio_palma),
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
    } finally {
      setGuardandoAbono(false);
    }
  };

  const handleDeleteAbono = async () => {
    if (!abonoAEliminar) return;
    try {
      await configuracionApi.preciosAbono.eliminar(abonoAEliminar.id);
      setRangosAbono((prev) => prev.filter((r) => r.id !== abonoAEliminar.id));
      toast.success('Rango eliminado');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo eliminar el rango');
    } finally {
      setAbonoAEliminar(null);
    }
  };

  // ─── Sección C: Precios de Palma ──────────────────────────────────────────
  const handleSavePalma = async (palma: PrecioPalma) => {
    const raw = palmaInputs[palma.id];
    const precio = raw === undefined || raw.trim() === '' ? null : Number(raw);
    setGuardandoPalma(palma.id);
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
    } finally {
      setGuardandoPalma(null);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando precios de labores...
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                <Input
                  id="cosecha-precio"
                  type="number"
                  value={formCosecha.precio}
                  onChange={(e) => setFormCosecha((prev) => ({ ...prev, precio: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCosecha(false)} disabled={guardandoCosecha}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCosecha} disabled={guardandoCosecha}>
              {guardandoCosecha && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
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
              <Input
                id="abono-precio"
                type="number"
                value={formAbono.precio_palma}
                onChange={(e) => setFormAbono((prev) => ({ ...prev, precio_palma: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAbono(false)} disabled={guardandoAbono}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAbono} disabled={guardandoAbono}>
              {guardandoAbono && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!cosechaAEliminar}
        onOpenChange={(open) => !open && setCosechaAEliminar(null)}
        title="Eliminar precio de cosecha"
        description={`¿Eliminar el precio de "${cosechaAEliminar ? loteNombre(cosechaAEliminar) : ''}" (${cosechaAEliminar?.anio})? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDeleteCosecha}
      />

      <ConfirmDeleteDialog
        open={!!abonoAEliminar}
        onOpenChange={(open) => !open && setAbonoAEliminar(null)}
        title="Eliminar rango de abonada"
        description={`¿Eliminar el rango ${abonoAEliminar?.gramos_min} - ${abonoAEliminar?.gramos_max} gramos? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDeleteAbono}
      />

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
                              ${Number(item.precio).toLocaleString('es-CO')} /kg
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
                                  onClick={() => setCosechaAEliminar(item)}
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
                          <th className="text-left p-4 font-semibold w-1/4">Precio por Palma</th>
                          <th className="text-center p-4 font-semibold w-24"></th>
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
                                ${Number(rango.precio_palma).toLocaleString('es-CO')} /palma
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => handleOpenAbono(rango)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setAbonoAEliminar(rango)}
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

        {/* Secciones: Plateo / Poda / Control de Plagas / Otros (Precios de Palma) */}
        {preciosPalma.map((palma) => (
          <AccordionItem
            key={palma.id}
            value={PALMA_ACCORDION_VALUE[palma.tipo]}
            className="border-0"
          >
            <Card className="border-border">
              <CardHeader className={`border-b bg-gradient-to-r ${PALMA_GRADIENT[palma.tipo]}`}>
                <AccordionTrigger className="hover:no-underline py-0">
                  <div className="text-left">
                    <CardTitle>{PALMA_LABEL[palma.tipo]}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Precio por palma</p>
                  </div>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="p-6">
                  <div className="max-w-md space-y-3">
                    <Label htmlFor={`precio-${palma.id}`}>Valor por Palma</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        id={`precio-${palma.id}`}
                        type="number"
                        value={palmaInputs[palma.id] ?? ''}
                        onChange={(e) =>
                          setPalmaInputs((prev) => ({ ...prev, [palma.id]: e.target.value }))
                        }
                        className="text-lg font-semibold"
                        placeholder="0"
                      />
                      <span className="text-muted-foreground">/palma</span>
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => handleSavePalma(palma)}
                        disabled={guardandoPalma === palma.id}
                      >
                        {guardandoPalma === palma.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Guardar
                      </Button>
                    </div>
                    {palmaInputs[palma.id] && Number(palmaInputs[palma.id]) > 0 && (
                      <p className="text-sm text-success font-medium">
                        ${Number(palmaInputs[palma.id]).toLocaleString('es-CO')} / palma
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
  );
}
