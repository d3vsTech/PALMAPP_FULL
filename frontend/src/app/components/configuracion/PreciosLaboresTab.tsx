import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
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
import { lotesApi, sublotesApi } from '../../../api/plantacion';
import { formatCOP, formatThousands, parseCOP } from '../lib/format';

type LoteOption = { id: number; nombre: string };
type SubloteOption = { id: number; nombre: string; lote_id: number };

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


// Cache simple en sessionStorage por tenant (TTL 60s). Hace que volver a esta
// pantalla en la misma sesión sea instantáneo.
// `v3` invalida cachés previas que no traían `sublotes`.
const CACHE_KEY = 'palmapp.preciosLabores.cache.v3';
const CACHE_TTL_MS = 60_000;

type CacheShape = {
  ts: number;
  tenant: string | null;
  cosecha: PrecioCosecha[];
  abono: PrecioAbono[];
  palma: PrecioPalma[];
  palmaCustom: Labor[];
  finca: Labor[];
  lotes: LoteOption[];
  sublotes: SubloteOption[];
};

function readCache(): CacheShape | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    const tenantActual = localStorage.getItem('palmapp_tenant_id');
    if (parsed.tenant !== tenantActual) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(payload: Omit<CacheShape, 'ts' | 'tenant'>) {
  try {
    const tenantActual = localStorage.getItem('palmapp_tenant_id');
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      tenant: tenantActual,
      ...payload,
    }));
  } catch { /* cuota llena, ignorar */ }
}

export function PreciosLaboresTab() {
  // Hidratación desde cache: si hay snapshot reciente, mostramos los datos al
  // instante (no parpadea el "Cargando..."). Cada fetch sigue corriendo en
  // background y reescribe los valores reales cuando llegue.
  const cached = readCache();

  // Cosecha
  const [preciosCosecha, setPreciosCosecha] = useState<PrecioCosecha[]>(cached?.cosecha ?? []);
  const [lotes, setLotes] = useState<LoteOption[]>(cached?.lotes ?? []);
  const [sublotes, setSublotes] = useState<SubloteOption[]>(cached?.sublotes ?? []);
  // Inputs inline por lote (año actual). Keyed por lote.id como string.
  // El precio_cosecha en backend sigue siendo por (lote_id, anio); varios
  // sublotes del mismo lote comparten el mismo input (todas las filas leen
  // del mismo key del mapa, así se ven sincronizadas).
  const [cosechaInputs, setCosechaInputs] = useState<Record<string, string>>({});

  // El año del que se gestiona el precio inline. Calculado una sola vez
  // por render — usamos `new Date().getFullYear()`.
  const anioActual = new Date().getFullYear();

  // Abonada — edición inline
  const [rangosAbono, setRangosAbono] = useState<PrecioAbono[]>(cached?.abono ?? []);
  /** Estado por rango guardado (keyed por id) — copia editable de los 3 campos.
   *  Se hidrata cuando entra `rangosAbono`. Al `onBlur` se hace PUT si algo cambió. */
  type RangoEditable = { gramos_min: string; gramos_max: string; precio_palma: string };
  const [abonoInputs, setAbonoInputs] = useState<Record<number, RangoEditable>>(
    Object.fromEntries(
      (cached?.abono ?? []).map((r) => [
        r.id,
        {
          // Gramos viene del backend como decimal (ej. "200.00"); lo normalizamos
          // a entero con separador de miles para mantener formato consistente.
          gramos_min: formatThousands(r.gramos_min),
          gramos_max: formatThousands(r.gramos_max),
          precio_palma: formatThousands(r.precio_palma),
        },
      ]),
    ),
  );
  /** Filas nuevas sin guardar (creadas con "Agregar Rango").
   *  Cuando el usuario llena los 3 campos + onBlur → POST y al éxito mueve el
   *  registro a `rangosAbono` y quita el tempId de aquí. */
  type RangoNuevo = { tempId: string } & RangoEditable;
  const [nuevosRangos, setNuevosRangos] = useState<RangoNuevo[]>([]);

  // Precios de Palma — labores fijas (es_sistema=true)
  const [preciosPalma, setPreciosPalma] = useState<PrecioPalma[]>(cached?.palma ?? []);
  const [palmaInputs, setPalmaInputs] = useState<Record<number, string>>(
    Object.fromEntries(
      (cached?.palma ?? []).map((p) => [p.id, p.precio_palma != null ? formatThousands(p.precio_palma) : '']),
    ),
  );

  // Labores de Palma custom (es_sistema=false, tipo=null). El admin las crea
  // desde "Configuración → Operaciones → Trabajos / Labores".
  const [laboresPalmaCustom, setLaboresPalmaCustom] = useState<Labor[]>(cached?.palmaCustom ?? []);
  const [palmaCustomInputs, setPalmaCustomInputs] = useState<Record<number, string>>(
    Object.fromEntries(
      (cached?.palmaCustom ?? []).map((l) => [l.id, l.precio_palma != null ? formatThousands(l.precio_palma) : '']),
    ),
  );

  // Labores de Finca (precio = precio_palma plano según §4 unificado)
  const [laboresFinca, setLaboresFinca] = useState<Labor[]>(cached?.finca ?? []);
  const [laborInputs, setLaborInputs] = useState<Record<number, string>>(
    Object.fromEntries(
      (cached?.finca ?? []).map((l) => [l.id, l.precio_palma != null ? formatThousands(l.precio_palma) : '']),
    ),
  );

  // Loading sólo cuando NO hay caché — primer arranque del día / nuevo tenant.
  const [loading, setLoading] = useState(!cached);

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    let cancelled = false;

    /**
     * Aplica los datasets a los estados del componente (snapshot completo).
     * Centralizado en un helper porque viene del bundle (§17) o del fallback
     * de 6 fetches — la lógica de "hidratar inputs inline" es la misma.
     */
    const aplicar = (datos: {
      cosecha: PrecioCosecha[];
      rangos: PrecioAbono[];
      palma: PrecioPalma[];
      palmaCustom: Labor[];
      finca: Labor[];
      ls: LoteOption[];
      subs: SubloteOption[];
    }) => {
      setPreciosCosecha(datos.cosecha);
      setCosechaInputs(
        Object.fromEntries(
          datos.cosecha
            .filter((p) => p.anio === anioActual)
            .map((p) => [String(p.lote_id), formatThousands(p.precio)]),
        ),
      );
      setRangosAbono(datos.rangos);
      setAbonoInputs(
        Object.fromEntries(
          datos.rangos.map((rr) => [rr.id, {
            gramos_min: formatThousands(rr.gramos_min),
            gramos_max: formatThousands(rr.gramos_max),
            precio_palma: formatThousands(rr.precio_palma),
          }]),
        ),
      );
      setPreciosPalma(datos.palma);
      setPalmaInputs(
        Object.fromEntries(
          datos.palma.map((p) => [p.id, p.precio_palma != null ? formatThousands(p.precio_palma) : '']),
        ),
      );
      setLaboresPalmaCustom(datos.palmaCustom);
      setPalmaCustomInputs(
        Object.fromEntries(
          datos.palmaCustom.map((l) => [l.id, l.precio_palma != null ? formatThousands(l.precio_palma) : '']),
        ),
      );
      setLaboresFinca(datos.finca);
      setLaborInputs(
        Object.fromEntries(
          datos.finca.map((l) => [l.id, l.precio_palma != null ? formatThousands(l.precio_palma) : '']),
        ),
      );
      setLotes(datos.ls);
      setSublotes(datos.subs);
      writeCache({
        cosecha: datos.cosecha,
        abono: datos.rangos,
        palma: datos.palma,
        palmaCustom: datos.palmaCustom,
        finca: datos.finca,
        lotes: datos.ls,
        sublotes: datos.subs,
      });
    };

    /**
     * Path A (preferido): §17 bundle endpoint — 1 request server-side cacheado.
     * Si devuelve 404 (backend aún no lo desplegó) caemos al path B.
     */
    const intentarBundle = async (): Promise<boolean> => {
      try {
        const [bundleRes, sublotesRes] = await Promise.all([
          configuracionApi.preciosLaboresBundle.obtener({ per_page_cosecha: 100 }),
          sublotesApi.select(),
        ]);
        if (cancelled) return true;
        const b = bundleRes.data;
        aplicar({
          cosecha: b.precios_cosecha ?? [],
          rangos: b.precios_abono ?? [],
          palma: b.labores_palma_fijas ?? [],
          palmaCustom: b.labores_palma_custom ?? [],
          finca: b.labores_finca ?? [],
          ls: (b.lotes ?? []).map((l) => ({ id: l.id, nombre: l.nombre })),
          subs: (sublotesRes.data ?? []).map((s) => ({ id: s.id, nombre: s.nombre, lote_id: s.lote_id })),
        });
        return true;
      } catch (e: any) {
        // 404 = endpoint no desplegado todavía. Cualquier otro error también
        // lo tratamos como "intentar fallback" — el fallback aislará el problema real.
        const status = e?.status ?? e?.response?.status;
        if (status === 404 || /could not be found|no encontrad/i.test(String(e?.message ?? ''))) {
          return false;
        }
        throw e;
      }
    };

    /**
     * Path B (fallback): los 6 fetches individuales que usábamos antes del §17.
     * Mantiene la misma estructura y persiste el cache igual.
     */
    const fallback6Fetches = async () => {
      const [cosechaR, abonoR, palmaR, palmaCustomR, fincaR, lotesR, sublotesR] = await Promise.all([
        configuracionApi.preciosCosecha.listar({ per_page: 100 }),
        configuracionApi.preciosAbono.listar(),
        configuracionApi.labores.listar({ categoria: 'PALMA', es_sistema: true, per_page: 10 }),
        configuracionApi.labores.listar({ categoria: 'PALMA', es_sistema: false, per_page: 100 }),
        configuracionApi.labores.listar({ categoria: 'FINCA', per_page: 100 }),
        lotesApi.select(),
        sublotesApi.select(),
      ]);
      if (cancelled) return;
      aplicar({
        cosecha: cosechaR.data ?? [],
        rangos: abonoR.data ?? [],
        palma: palmaR.data ?? [],
        palmaCustom: palmaCustomR.data ?? [],
        finca: fincaR.data ?? [],
        ls: (lotesR.data ?? []).map((l) => ({ id: l.id, nombre: l.nombre })),
        subs: (sublotesR.data ?? []).map((s) => ({ id: s.id, nombre: s.nombre, lote_id: s.lote_id })),
      });
    };

    (async () => {
      try {
        const ok = await intentarBundle();
        if (!ok) await fallback6Fetches();
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message ?? 'No se pudieron cargar los precios y labores');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Cosecha (edición inline por lote, año actual) ─────────────────────────
  /**
   * Save inline del precio de cosecha de un lote. Decide POST vs PUT según si
   * ya existe registro para `(lote_id, anioActual)`. Si el input quedó vacío
   * y había un registro, lo elimina (UX: borrar el input = quitar el precio).
   */
  const handleSaveCosechaInline = async (lote: LoteOption) => {
    const raw = cosechaInputs[String(lote.id)] ?? '';
    const limpio = parseCOP(raw);
    const valor = limpio ? Number(limpio) : 0;
    const existente = preciosCosecha.find(
      (p) => Number(p.lote_id) === lote.id && p.anio === anioActual,
    );

    // Mismo valor: no-op (evita un PUT innecesario al salir del input sin tocar nada).
    if (existente && Number(existente.precio) === valor && valor > 0) return;

    try {
      if (existente && valor > 0) {
        // PUT actualiza el precio.
        const res = await configuracionApi.preciosCosecha.editar(existente.id, {
          precio: valor,
          anio: anioActual,
        });
        setPreciosCosecha((prev) => prev.map((p) => (p.id === existente.id ? res.data : p)));
        toast.success('Guardado');
      } else if (!existente && valor > 0) {
        // POST crea el precio.
        const res = await configuracionApi.preciosCosecha.crear({
          lote_id: lote.id,
          precio: valor,
          anio: anioActual,
        });
        setPreciosCosecha((prev) => [...prev, res.data]);
        toast.success('Guardado');
      } else if (existente && valor === 0) {
        // DELETE: el usuario vació el input → quita el precio del lote.
        await configuracionApi.preciosCosecha.eliminar(existente.id);
        setPreciosCosecha((prev) => prev.filter((p) => p.id !== existente.id));
        toast.success('Eliminado');
      }
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

  // ── Abonada (edición inline + nueva fila al click "Agregar Rango") ────────
  /**
   * Incrementa/decrementa el valor de un campo de gramos manteniendo el formato
   * de miles. Clampea a 0 mínimo (no se permiten negativos).
   *  - `currentStr`: valor display actual (con separadores, ej. "1.000")
   *  - `delta`: cuánto sumar (+1) o restar (-1).
   *  - Devuelve el nuevo valor display.
   */
  const adjustGramos = (currentStr: string, delta: number): string => {
    const n = Number(parseCOP(currentStr)) || 0;
    const next = Math.max(0, n + delta);
    return formatThousands(next);
  };

  /** Helper: mapea un error de validación del API a un toast amigable. */
  const reportarErrorRango = (e: any) => {
    if (e?.code === ConfiguracionErrorCodes.RANGO_SOLAPADO) {
      toast.error('El rango de gramos se solapa con un rango existente');
    } else if (e?.errors) {
      const primero = Object.values(e.errors).flat()[0];
      toast.error(typeof primero === 'string' ? primero : 'Error de validación');
    } else {
      toast.error(e?.message ?? 'No se pudo guardar el rango');
    }
  };

  /** PUT del rango ya guardado cuando alguno de los 3 inputs pierde foco y
   *  detectamos cambio respecto al valor original. */
  const handleSaveAbonoInline = async (rango: PrecioAbono) => {
    const edit = abonoInputs[rango.id];
    if (!edit) return;
    // Quitamos puntos de miles antes de mandar el número al backend.
    const payload = {
      gramos_min: Number(parseCOP(edit.gramos_min)),
      gramos_max: Number(parseCOP(edit.gramos_max)),
      precio_palma: Number(parseCOP(edit.precio_palma)),
    };
    if (!Number.isFinite(payload.gramos_min) || !Number.isFinite(payload.gramos_max) || !Number.isFinite(payload.precio_palma)) {
      return;
    }
    // No-op si no cambió nada (evita PUT innecesario).
    if (
      payload.gramos_min === Number(rango.gramos_min) &&
      payload.gramos_max === Number(rango.gramos_max) &&
      payload.precio_palma === Number(rango.precio_palma)
    ) return;
    try {
      const res = await configuracionApi.preciosAbono.editar(rango.id, payload);
      setRangosAbono((prev) => prev.map((r) => (r.id === rango.id ? res.data : r)));
      // Re-hidratar el input con el formato canónico (con miles).
      setAbonoInputs((prev) => ({
        ...prev,
        [rango.id]: {
          gramos_min: formatThousands(res.data.gramos_min),
          gramos_max: formatThousands(res.data.gramos_max),
          precio_palma: formatThousands(res.data.precio_palma),
        },
      }));
      toast.success('Guardado');
    } catch (e: any) { reportarErrorRango(e); }
  };

  /** Elimina un rango guardado. Sin modal de confirmación — el trash es
   *  acción directa para alinear con el resto de la UI inline. */
  const handleDeleteAbonoInline = async (rango: PrecioAbono) => {
    try {
      await configuracionApi.preciosAbono.eliminar(rango.id);
      setRangosAbono((prev) => prev.filter((r) => r.id !== rango.id));
      setAbonoInputs((prev) => {
        const next = { ...prev };
        delete next[rango.id];
        return next;
      });
      toast.success('Eliminado');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo eliminar el rango');
    }
  };

  /** "+ Agregar Rango": empuja una fila vacía con tempId al estado de nuevos.
   *  Pre-rellena gramos_min como `(último gramos_max) + 1` para evitar solapes. */
  const agregarNuevoRango = () => {
    const ultimo = rangosAbono[rangosAbono.length - 1];
    // Mostrar el sugerido con separador de miles si aplica (ej. "1.001").
    const minSugerido = ultimo ? formatThousands(Number(ultimo.gramos_max) + 1) : '0';
    setNuevosRangos((prev) => [
      ...prev,
      {
        tempId: `tmp-${Date.now()}-${Math.floor(Number(prev.length))}`,
        gramos_min: minSugerido,
        gramos_max: '',
        precio_palma: '',
      },
    ]);
  };

  /** POST: al perder foco, si los 3 campos están llenos creamos. Si éxito,
   *  movemos el item de `nuevosRangos` a `rangosAbono`. */
  const handleSaveNuevoRango = async (tempId: string) => {
    const nr = nuevosRangos.find((x) => x.tempId === tempId);
    if (!nr) return;
    // Parseamos los 3 campos quitando los puntos de miles del display.
    const min = Number(parseCOP(nr.gramos_min));
    const max = Number(parseCOP(nr.gramos_max));
    const precio = Number(parseCOP(nr.precio_palma));
    // Esperamos a que los 3 campos sean válidos antes de disparar el POST.
    if (!nr.gramos_min || !nr.gramos_max || !nr.precio_palma) return;
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(precio)) return;
    try {
      const res = await configuracionApi.preciosAbono.crear({
        gramos_min: min,
        gramos_max: max,
        precio_palma: precio,
      });
      setRangosAbono((prev) => [...prev, res.data]);
      setAbonoInputs((prev) => ({
        ...prev,
        [res.data.id]: {
          gramos_min: formatThousands(res.data.gramos_min),
          gramos_max: formatThousands(res.data.gramos_max),
          precio_palma: formatThousands(res.data.precio_palma),
        },
      }));
      setNuevosRangos((prev) => prev.filter((x) => x.tempId !== tempId));
      toast.success('Guardado');
    } catch (e: any) { reportarErrorRango(e); }
  };

  /** Trash de una fila NUEVA (sin id de backend) — solo splice local. */
  const eliminarNuevoRango = (tempId: string) =>
    setNuevosRangos((prev) => prev.filter((x) => x.tempId !== tempId));

  // ── Labor Palma custom (precio_palma según tipo_pago) ────────────────────
  const handleSaveLaborPalmaCustom = async (labor: Labor) => {
    const raw = palmaCustomInputs[labor.id] ?? '';
    const limpio = parseCOP(raw);
    const valor = limpio ? Number(limpio) : 0;
    const actual = labor.precio_palma != null ? Number(parseCOP(formatThousands(labor.precio_palma))) : 0;
    if (actual === valor) return;
    try {
      const res = await configuracionApi.labores.editar(labor.id, { precio_palma: valor });
      setLaboresPalmaCustom((prev) => prev.map((l) => (l.id === labor.id ? res.data : l)));
      toast.success('Guardado');
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el precio');
      }
    }
  };

  // ── Labor Finca (precio_palma plano = "valor por jornal") ─────────────────
  // §4 unificado: las labores de finca tienen `tipo_pago='JORNAL_FIJO'` y
  // `precio_palma` es el valor por jornal. Inline edit con onBlur.
  const handleSaveLaborFinca = async (labor: Labor) => {
    const raw = laborInputs[labor.id] ?? '';
    const limpio = parseCOP(raw);
    const valor = limpio ? Number(limpio) : 0;
    const actual = labor.precio_palma != null ? Number(parseCOP(formatThousands(labor.precio_palma))) : 0;
    if (actual === valor) return;
    try {
      const res = await configuracionApi.labores.editar(labor.id, { precio_palma: valor });
      setLaboresFinca((prev) => prev.map((l) => (l.id === labor.id ? res.data : l)));
      toast.success('Guardado');
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el precio');
      }
    }
  };

  // ── Palma (PLATEO/PODA/SANIDAD/COSECHA/FERTILIZACION fijas) ───────────────
  // PUT /labores/{id} con precio_palma. El wrapper preciosPalma.editar lo
  // redirige al endpoint unificado §4.
  const handleSavePalma = async (palma: PrecioPalma) => {
    const raw = palmaInputs[palma.id];
    const limpio = parseCOP(raw);
    const precio = !limpio ? null : Number(limpio);
    try {
      const res = await configuracionApi.labores.editar(palma.id, { precio_palma: precio });
      setPreciosPalma((prev) => prev.map((p) => (p.id === palma.id ? res.data : p)));
      toast.success('Guardado');
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

      {/* Mientras la primera carga está en vuelo (y no hay cache), mostramos
          SOLO el spinner. La UI completa aparece cuando todos los fetches
          terminan (Promise.allSettled → setLoading(false)). */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando precios y labores…</span>
        </div>
      )}

      {/* (Modales Cosecha y Abono removidos: ambas tablas son edición inline.) */}

      {/* LABORES PALMA */}
      <div className="space-y-4" hidden={loading}>
        <div className="border-l-4 border-primary pl-4 py-2">
          <h3 className="text-xl font-bold">Labores Palma</h3>
          <p className="text-sm text-muted-foreground">Labores estándar de palma</p>
        </div>

        {/* Por default todos los acordeones cerrados; el usuario los abre cuando quiera. */}
        <Accordion type="multiple" defaultValue={[]} className="space-y-4">
          {/* "Precios de Cosecha" siempre visible: la tabla por lote+año vive
              independiente del tipo_pago de la labor. Si la labor está en
              JORNAL_FIJO se SUMA un acordeón aparte (más abajo). */}
          <AccordionItem value="cosecha" className="border-0">
            <Card className="border-border">
              <CardHeader className="border-b bg-gradient-to-r from-green-50/50 to-green-50/10 dark:from-green-950/20 dark:to-green-950/5">
                <AccordionTrigger className="hover:no-underline py-0">
                  <div className="text-left">
                    <CardTitle>Precios de Cosecha</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Precio por kg de fruto cosechado por lote y sublote
                    </p>
                  </div>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="p-6">
                  {/* Tabla inline: una fila por SUBLOTE del tenant.
                      Como el precio_cosecha del backend es por (lote_id, anio),
                      varios sublotes del mismo lote leen del mismo input — al
                      editar cualquiera se sincronizan. El año actual se usa
                      implícito (no hay columna). */}
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full table-fixed">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-4 font-semibold w-2/5">Lote</th>
                          <th className="text-left p-4 font-semibold w-1/4">Sublote</th>
                          <th className="text-right p-4 font-semibold">Precio por Kg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sublotes.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-6 text-center text-sm text-muted-foreground">
                              No hay sublotes creados. Crea predios, lotes y sublotes en "Mi Plantación".
                            </td>
                          </tr>
                        ) : (
                          sublotes.map((sub) => {
                            const lote = lotes.find((l) => l.id === sub.lote_id);
                            return (
                              <tr key={sub.id} className="border-t border-border">
                                <td className="p-4 font-medium">{lote?.nombre ?? `Lote ${sub.lote_id}`}</td>
                                <td className="p-4 text-sm text-muted-foreground">{sub.nombre}</td>
                                <td className="p-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-muted-foreground text-sm">$</span>
                                    <Input
                                      inputMode="numeric"
                                      value={cosechaInputs[String(sub.lote_id)] ?? ''}
                                      onChange={(e) =>
                                        setCosechaInputs((prev) => ({
                                          ...prev,
                                          [String(sub.lote_id)]: formatThousands(parseCOP(e.target.value)),
                                        }))
                                      }
                                      onBlur={() => {
                                        if (lote) handleSaveCosechaInline(lote);
                                      }}
                                      placeholder="0"
                                      className="w-32 text-right"
                                    />
                                    <span className="text-muted-foreground text-sm">/kg</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* "Escala de Abonada" siempre visible (mismo criterio que Cosecha). */}
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
                      <Button onClick={agregarNuevoRango} size="sm" variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Agregar Rango
                      </Button>
                    </div>

                    {/* Tabla inline. Filas guardadas → PUT onBlur. Filas nuevas
                        (tempId) → POST onBlur cuando los 3 campos están llenos. */}
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
                          {rangosAbono.length === 0 && nuevosRangos.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                                No hay rangos de abonada. Haz clic en "Agregar Rango" para crear el primero.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {rangosAbono.map((rango) => {
                                const edit = abonoInputs[rango.id] ?? {
                                  gramos_min: formatThousands(rango.gramos_min),
                                  gramos_max: formatThousands(rango.gramos_max),
                                  precio_palma: formatThousands(rango.precio_palma),
                                };
                                return (
                                  <tr key={rango.id} className="border-t border-border">
                                    <td className="p-4">
                                      <div className="relative group">
                                        <Input
                                          inputMode="numeric"
                                          value={edit.gramos_min}
                                          onChange={(e) =>
                                            setAbonoInputs((prev) => ({
                                              ...prev,
                                              [rango.id]: { ...edit, gramos_min: formatThousands(parseCOP(e.target.value)) },
                                            }))
                                          }
                                          onBlur={() => handleSaveAbonoInline(rango)}
                                          className="w-full pr-7"
                                        />
                                        {/* Spinners. `onMouseDown preventDefault` evita que el input pierda foco. */}
                                        <div className="absolute right-1 top-1 bottom-1 flex flex-col opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                          <button type="button" tabIndex={-1}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => setAbonoInputs((prev) => ({
                                              ...prev,
                                              [rango.id]: { ...edit, gramos_min: adjustGramos(edit.gramos_min, 1) },
                                            }))}
                                            className="flex-1 px-1 hover:bg-muted rounded-t text-muted-foreground hover:text-foreground"
                                          >
                                            <ChevronUp className="h-3 w-3" />
                                          </button>
                                          <button type="button" tabIndex={-1}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => setAbonoInputs((prev) => ({
                                              ...prev,
                                              [rango.id]: { ...edit, gramos_min: adjustGramos(edit.gramos_min, -1) },
                                            }))}
                                            className="flex-1 px-1 hover:bg-muted rounded-b text-muted-foreground hover:text-foreground"
                                          >
                                            <ChevronDown className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="relative group">
                                        <Input
                                          inputMode="numeric"
                                          value={edit.gramos_max}
                                          onChange={(e) =>
                                            setAbonoInputs((prev) => ({
                                              ...prev,
                                              [rango.id]: { ...edit, gramos_max: formatThousands(parseCOP(e.target.value)) },
                                            }))
                                          }
                                          onBlur={() => handleSaveAbonoInline(rango)}
                                          className="w-full pr-7"
                                        />
                                        <div className="absolute right-1 top-1 bottom-1 flex flex-col opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                          <button type="button" tabIndex={-1}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => setAbonoInputs((prev) => ({
                                              ...prev,
                                              [rango.id]: { ...edit, gramos_max: adjustGramos(edit.gramos_max, 1) },
                                            }))}
                                            className="flex-1 px-1 hover:bg-muted rounded-t text-muted-foreground hover:text-foreground"
                                          >
                                            <ChevronUp className="h-3 w-3" />
                                          </button>
                                          <button type="button" tabIndex={-1}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => setAbonoInputs((prev) => ({
                                              ...prev,
                                              [rango.id]: { ...edit, gramos_max: adjustGramos(edit.gramos_max, -1) },
                                            }))}
                                            className="flex-1 px-1 hover:bg-muted rounded-b text-muted-foreground hover:text-foreground"
                                          >
                                            <ChevronDown className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-sm">$</span>
                                        <Input
                                          inputMode="numeric"
                                          value={edit.precio_palma}
                                          onChange={(e) =>
                                            setAbonoInputs((prev) => ({
                                              ...prev,
                                              [rango.id]: {
                                                ...edit,
                                                precio_palma: formatThousands(parseCOP(e.target.value)),
                                              },
                                            }))
                                          }
                                          onBlur={() => handleSaveAbonoInline(rango)}
                                          className="w-32"
                                        />
                                        <span className="text-muted-foreground text-sm">/palma</span>
                                      </div>
                                    </td>
                                    <td className="p-4 text-center">
                                      <Button
                                        onClick={() => handleDeleteAbonoInline(rango)}
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 mx-auto"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* Filas nuevas (sin guardar): mismo layout, tempId como key. */}
                              {nuevosRangos.map((nr) => (
                                <tr key={nr.tempId} className="border-t border-border bg-primary/5">
                                  <td className="p-4">
                                    <div className="relative group">
                                      <Input
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={nr.gramos_min}
                                        onChange={(e) =>
                                          setNuevosRangos((prev) =>
                                            prev.map((x) =>
                                              x.tempId === nr.tempId
                                                ? { ...x, gramos_min: formatThousands(parseCOP(e.target.value)) }
                                                : x,
                                            ),
                                          )
                                        }
                                        onBlur={() => handleSaveNuevoRango(nr.tempId)}
                                        className="w-full pr-7"
                                      />
                                      <div className="absolute right-1 top-1 bottom-1 flex flex-col opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                        <button type="button" tabIndex={-1}
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => setNuevosRangos((prev) =>
                                            prev.map((x) =>
                                              x.tempId === nr.tempId
                                                ? { ...x, gramos_min: adjustGramos(x.gramos_min, 1) }
                                                : x,
                                            ),
                                          )}
                                          className="flex-1 px-1 hover:bg-muted rounded-t text-muted-foreground hover:text-foreground"
                                        >
                                          <ChevronUp className="h-3 w-3" />
                                        </button>
                                        <button type="button" tabIndex={-1}
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => setNuevosRangos((prev) =>
                                            prev.map((x) =>
                                              x.tempId === nr.tempId
                                                ? { ...x, gramos_min: adjustGramos(x.gramos_min, -1) }
                                                : x,
                                            ),
                                          )}
                                          className="flex-1 px-1 hover:bg-muted rounded-b text-muted-foreground hover:text-foreground"
                                        >
                                          <ChevronDown className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="relative group">
                                      <Input
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={nr.gramos_max}
                                        onChange={(e) =>
                                          setNuevosRangos((prev) =>
                                            prev.map((x) =>
                                              x.tempId === nr.tempId
                                                ? { ...x, gramos_max: formatThousands(parseCOP(e.target.value)) }
                                                : x,
                                            ),
                                          )
                                        }
                                        onBlur={() => handleSaveNuevoRango(nr.tempId)}
                                        className="w-full pr-7"
                                      />
                                      <div className="absolute right-1 top-1 bottom-1 flex flex-col opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                        <button type="button" tabIndex={-1}
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => setNuevosRangos((prev) =>
                                            prev.map((x) =>
                                              x.tempId === nr.tempId
                                                ? { ...x, gramos_max: adjustGramos(x.gramos_max, 1) }
                                                : x,
                                            ),
                                          )}
                                          className="flex-1 px-1 hover:bg-muted rounded-t text-muted-foreground hover:text-foreground"
                                        >
                                          <ChevronUp className="h-3 w-3" />
                                        </button>
                                        <button type="button" tabIndex={-1}
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => setNuevosRangos((prev) =>
                                            prev.map((x) =>
                                              x.tempId === nr.tempId
                                                ? { ...x, gramos_max: adjustGramos(x.gramos_max, -1) }
                                                : x,
                                            ),
                                          )}
                                          className="flex-1 px-1 hover:bg-muted rounded-b text-muted-foreground hover:text-foreground"
                                        >
                                          <ChevronDown className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground text-sm">$</span>
                                      <Input
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={nr.precio_palma}
                                        onChange={(e) =>
                                          setNuevosRangos((prev) =>
                                            prev.map((x) =>
                                              x.tempId === nr.tempId
                                                ? { ...x, precio_palma: formatThousands(parseCOP(e.target.value)) }
                                                : x,
                                            ),
                                          )
                                        }
                                        onBlur={() => handleSaveNuevoRango(nr.tempId)}
                                        className="w-32"
                                      />
                                      <span className="text-muted-foreground text-sm">/palma</span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <Button
                                      onClick={() => eliminarNuevoRango(nr.tempId)}
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 mx-auto"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* COSECHA / FERTILIZACION en JORNAL_FIJO: acordeón EXTRA con input
              plano de precio_palma. Se SUMA a las secciones por lote/escala
              (no las reemplaza) cuando el admin cambió el tipo_pago desde
              Operaciones → Trabajos / Labores. */}
          {preciosPalma
            .filter((p) => (p.tipo === 'COSECHA' || p.tipo === 'FERTILIZACION') && p.tipo_pago === 'JORNAL_FIJO')
            .map((labor) => (
            <AccordionItem key={`jornal-${labor.id}`} value={`palma-jornal-${labor.id}`} className="border-0">
              <Card className="border-border">
                <CardHeader className={`border-b bg-gradient-to-r ${labor.tipo === 'COSECHA'
                  ? 'from-green-50/50 to-green-50/10 dark:from-green-950/20 dark:to-green-950/5'
                  : 'from-emerald-50/50 to-emerald-50/10 dark:from-emerald-950/20 dark:to-emerald-950/5'}`}>
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="text-left">
                      <CardTitle>{labor.tipo === 'COSECHA' ? 'Precio Cosecha' : 'Precio Fertilización'}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Precio por jornal fijo</p>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="p-6">
                    <div className="max-w-md space-y-3">
                      <Label htmlFor={`precio-jornal-${labor.id}`}>Valor por Jornal</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id={`precio-jornal-${labor.id}`}
                          inputMode="numeric"
                          value={palmaInputs[labor.id] ?? ''}
                          onChange={(e) =>
                            setPalmaInputs((prev) => ({ ...prev, [labor.id]: formatThousands(parseCOP(e.target.value)) }))
                          }
                          onBlur={() => handleSavePalma(labor)}
                          className="text-lg font-semibold"
                          placeholder="0"
                        />
                        <span className="text-muted-foreground">/jornal</span>
                      </div>
                      {palmaInputs[labor.id] && Number(parseCOP(palmaInputs[labor.id])) > 0 && (
                        <p className="text-sm text-success font-medium">
                          {formatCOP(parseCOP(palmaInputs[labor.id]))} /jornal
                        </p>
                      )}
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}

          {/* Secciones: solo Plateo y Poda — las únicas labores fijas de palma
              que tienen "Precio por palma / jornal" en la UI.
              Excluimos:
                · COSECHA       → "Precios de Cosecha" (siempre) + acordeón extra si JORNAL_FIJO.
                · FERTILIZACION → "Escala de Abonada" (siempre) + acordeón extra si JORNAL_FIJO.
                · SANIDAD       → no se gestiona en esta finca como labor estándar.
                · OTROS         → el §4 unificado ya no usa este tipo. */}
          {preciosPalma
            .filter((p) => p.tipo === 'PLATEO' || p.tipo === 'PODA')
            .map((palma) => (
            <AccordionItem key={`fija-${palma.id}`} value={PALMA_VALUE[palma.tipo]} className="border-0">
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

          {/* Custom Palma — mismo formato visual que las fijas. Las trae el fetch
              `categoria=PALMA, es_sistema=false`. Título = nombre que el admin
              escribió en "Operaciones → Trabajos / Labores". */}
          {laboresPalmaCustom.map((labor) => (
            <AccordionItem key={`custom-${labor.id}`} value={`palma-custom-${labor.id}`} className="border-0">
              <Card className="border-border">
                <CardHeader className="border-b bg-gradient-to-r from-amber-50/50 to-amber-50/10 dark:from-amber-950/20 dark:to-amber-950/5">
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="text-left">
                      <CardTitle>{labor.nombre}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{palmaSubLabel(labor)}</p>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="p-6">
                    <div className="max-w-md space-y-3">
                      <Label htmlFor={`precio-custom-${labor.id}`}>{palmaLabelInput(labor)}</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id={`precio-custom-${labor.id}`}
                          inputMode="numeric"
                          value={palmaCustomInputs[labor.id] ?? ''}
                          onChange={(e) =>
                            setPalmaCustomInputs((prev) => ({
                              ...prev,
                              [labor.id]: formatThousands(parseCOP(e.target.value)),
                            }))
                          }
                          onBlur={() => handleSaveLaborPalmaCustom(labor)}
                          className="text-lg font-semibold"
                          placeholder="0"
                        />
                        <span className="text-muted-foreground">{palmaUnidad(labor)}</span>
                      </div>
                      {palmaCustomInputs[labor.id] && Number(parseCOP(palmaCustomInputs[labor.id])) > 0 && (
                        <p className="text-sm text-success font-medium">
                          {formatCOP(parseCOP(palmaCustomInputs[labor.id]))} {palmaUnidad(labor)}
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
      <div className="space-y-4" hidden={loading}>
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
