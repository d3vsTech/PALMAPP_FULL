/**
 * Pantalla detalle de Nómina — diseño portado de V.15.
 *
 * Funcionalidades:
 *  - Selector visual de tabs (Colaboradores Internos | Terceros).
 *  - KPIs dinámicos por tab:
 *      · Colaboradores: 4 cards (Devengado, Deducciones, Neto, Avance liquidación).
 *      · Terceros: 3 cards (Empresas, Total a transferir, Avance pago).
 *  - Tabla de colaboradores con columnas Jornales y Cosechas.
 *  - Sección de empresas terceras con UI placeholder hasta tener API.
 *  - Botón "Exportar" y "Cerrar Nómina" (BORRADOR).
 *  - Flujo de liquidación: navega a `/nomina/{id}/liquidar/{empId}`
 *    (pantalla LiquidarColaborador.tsx tiene la lógica completa).
 *
 * Conexiones API mantenidas: `nominaApi.ver`, `nominaApi.cerrar`,
 * `nominaApi.quitarEmpleado`.
 *
 * Pendiente conectar API:
 *  - Endpoint que devuelva el detalle de TERCEROS por nómina
 *    (empresas, operarios, labores, kg, total a transferir, estado).
 *  - Endpoint para exportar la nómina a Excel/PDF.
 */
import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useParams, Link, useNavigate } from 'react-router';
import { comparePersonaByFirstName } from '../../utils/personas';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, Calculator, Lock, DollarSign, TrendingUp, TrendingDown,
  FileText, Eye, Loader2, Trash2, Download, Users, Building2, Check,
  Pencil, Printer, AlertCircle,
} from 'lucide-react';
import { AdvertenciasBanner } from '../../components/nomina/AdvertenciasBanner';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import {
  nominaApi, Nomina, NominaEmpleado, NominaTercero, Periodicidad,
  NominaErrorCodes, NominaTerceroActaDetalle, MetodoPagoTercero,
  DetalleLaboresOperario,
} from '../../../api/nomina';
// `operacionesApi` y `PlanillaDetalle` se removieron tras el refactor a
// endpoints dedicados de nómina (§7.4). El listado de terceros ya no
// consulta el módulo de planillas para armar el desglose.
import type { ApiError } from '../../../api/client';

const MESES_NOMBRE: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

function periodoLabel(n: Nomina): string {
  const mes = MESES_NOMBRE[n.mes] ?? String(n.mes);
  if (n.tipo_pago_snapshot === 'QUINCENAL' && n.quincena) {
    const q = n.quincena === 1 ? 'Primera' : 'Segunda';
    return `${mes} ${n.anio} - ${q} quincena`;
  }
  return `${mes} ${n.anio}`;
}

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

/** Formatea YYYY-MM-DD o ISO completo a dd/mm/yyyy. Sin desfase por TZ. */
function fmtFecha(s: string | null | undefined): string {
  if (!s) return '—';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const [, y, mes, d] = m;
  return `${d}/${mes}/${y}`;
}

function getIniciales(nombre: string): string {
  const partes = nombre.trim().split(' ').filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

// ── Tipos y catálogo compartidos para el desglose por tercero ──────────────
// Se declaran a nivel de módulo para poder tiparlos en el useState del mapa.
type FilaLabor = {
  lote: string;
  sublote: string;
  cantidad: number;
  unidad: 'gajos' | 'palmas';
  promedio_kg: number | null;
  peso_kg: number | null;
  precio: number;
  precio_unidad: string;
  total: number;
};
type CategoriaLabor = {
  key: 'cosecha' | 'poda' | 'fertilizacion' | 'plateo' | 'sanidad' | 'otros' | 'finca';
  titulo: string;
  color: 'amber' | 'green' | 'blue' | 'purple' | 'red' | 'gray';
  filas: FilaLabor[];
  subtotal: number;
};
const CATS: Array<{ key: CategoriaLabor['key']; titulo: string; color: CategoriaLabor['color'] }> = [
  { key: 'cosecha', titulo: 'COSECHA', color: 'amber' },
  { key: 'poda', titulo: 'PODA', color: 'green' },
  { key: 'fertilizacion', titulo: 'FERTILIZACIÓN', color: 'blue' },
  { key: 'plateo', titulo: 'PLATEO', color: 'green' },
  { key: 'sanidad', titulo: 'SANIDAD', color: 'red' },
  { key: 'otros', titulo: 'OTROS', color: 'purple' },
  { key: 'finca', titulo: 'FINCA', color: 'gray' },
];

/**
 * Consolida el desglose de labores para un tercero a partir de los
 * `DetalleLaboresOperario[]` que devuelve `GET .../operarios/{op}/detalle`
 * (doc §7.4). Reemplaza la agregación manual anterior sobre `planillasPeriodo`
 * (que hacía N+1 sobre `/operaciones/{id}` con relaciones eager-loaded).
 *
 * El backend ya trae los totales por operario × labor × lote/sublote, así que
 * solo hay que agrupar y sumar por (categoría, lote, sublote).
 */
function consolidarDesdeDetalles(detalles: DetalleLaboresOperario[]): CategoriaLabor[] {
  const cats: CategoriaLabor[] = CATS.map((c) => ({ ...c, filas: [], subtotal: 0 }));
  const acc: Record<string, Record<string, FilaLabor & { pesoTotal: number; kgAcc: number }>> = {};
  for (const c of CATS) acc[c.key] = {};

  const getRow = (
    key: CategoriaLabor['key'],
    loteName: string,
    subloteName: string,
    esCosecha: boolean,
  ) => {
    const k = `${loteName}|${subloteName}`;
    if (!acc[key][k]) {
      acc[key][k] = {
        lote: loteName,
        sublote: subloteName,
        cantidad: 0,
        unidad: esCosecha ? 'gajos' : 'palmas',
        promedio_kg: esCosecha ? 0 : null,
        peso_kg: esCosecha ? 0 : null,
        precio: 0,
        precio_unidad: esCosecha ? '/kg' : '/palma',
        total: 0,
        pesoTotal: 0,
        kgAcc: 0,
      };
    }
    return acc[key][k];
  };

  const categoriaDeJornal = (categoria: 'PALMA' | 'FINCA', laborNombre: string): CategoriaLabor['key'] => {
    if (categoria === 'FINCA') return 'finca';
    // Heurística por nombre — el endpoint §7.4 no envía `tipo` como sí lo
    // hacía `/operaciones/{id}`. Se mapea por el `labor_nombre` snapshot.
    const n = laborNombre.toLowerCase();
    if (n.includes('plateo')) return 'plateo';
    if (n.includes('poda')) return 'poda';
    if (n.includes('fertiliza') || n.includes('abon')) return 'fertilizacion';
    if (n.includes('sanidad') || n.includes('plaga') || n.includes('insect')) return 'sanidad';
    return 'otros';
  };

  detalles.forEach((det) => {
    // ── COSECHAS ──
    (det.cosecha ?? []).forEach((c) => {
      const row = getRow('cosecha', c.lote, c.sublote ?? '—', true);
      row.cantidad += Number(c.gajos ?? 0);
      const peso = Number(c.peso_kg ?? 0);
      const precio = Number(c.precio_unit_kg ?? 0);
      const promedio = Number(c.promedio_kg_gajo ?? 0);
      row.peso_kg = (row.peso_kg ?? 0) + peso;
      row.total += Number(c.total ?? 0);
      if (peso > 0 && promedio > 0) {
        row.kgAcc += promedio * peso;
        row.pesoTotal += peso;
      }
      if (precio > 0) row.precio = precio;
    });
    // ── JORNALES ──
    (det.jornales ?? []).forEach((j) => {
      const key = categoriaDeJornal(j.categoria, j.labor_nombre);
      const loteName = key === 'finca'
        ? (j.labor_nombre || 'Trabajo de finca')
        : (j.lote ?? '—');
      const subloteName = key === 'finca' ? '—' : (j.sublote ?? '—');
      const row = getRow(key, loteName, subloteName, false);
      row.cantidad += Number(j.unidades ?? 0);
      row.total += Number(j.total ?? 0);
      if (Number(j.precio_unit) > 0) row.precio = Number(j.precio_unit);
    });
  });

  CATS.forEach((c, idx) => {
    const rows = Object.values(acc[c.key]);
    rows.forEach((r) => {
      if (c.key === 'cosecha' && r.pesoTotal > 0) {
        r.promedio_kg = r.kgAcc / r.pesoTotal;
      }
    });
    cats[idx].filas = rows;
    cats[idx].subtotal = rows.reduce((s, r) => s + r.total, 0);
  });

  return cats.filter((c) => c.filas.length > 0);
}

export default function NominaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const nominaId = id ? parseInt(id) : null;

  const [nomina, setNomina] = useState<Nomina | null>(null);
  const [empleados, setEmpleados] = useState<NominaEmpleado[]>([]);
  const [cargando, setCargando] = useState(true);

  const [empleadoAQuitar, setEmpleadoAQuitar] = useState<NominaEmpleado | null>(null);
  const [confirmarCerrar, setConfirmarCerrar] = useState(false);
  // §4.4 — datos de gajos pendientes precargados al abrir el diálogo de
  // cerrar, para que el usuario decida CON la info a la vista antes del POST
  // /cerrar (que es irreversible).
  const [alertaGajosPreCierre, setAlertaGajosPreCierre] = useState<{
    cosechas_con_gajos_pendientes: number;
    total_gajos_pendientes_enviar: number;
  } | null>(null);
  const [cargandoValidacionPreCierre, setCargandoValidacionPreCierre] = useState(false);
  // §3.6 — Domingos/festivos que ninguna nómina del mes cubre (por cortes
  // personalizados que dejan huecos). Se lee del paso-4-checklist antes de
  // cerrar. Aviso, NO bloqueo — el hueco puede ser deliberado.
  const [descansosHuerfanosPreCierre, setDescansosHuerfanosPreCierre] = useState<
    Array<{ fecha: string; tipo: 'DOMINICAL' | 'FESTIVO'; nombre: string }>
  >([]);
  // §3.6 — También lo cargamos AL ABRIR la nómina (no solo antes de cerrar)
  // para que el liquidador sepa antes de entrar a liquidar que hay días de
  // descanso en un hueco entre nóminas por cortes personalizados.
  const [descansosHuerfanos, setDescansosHuerfanos] = useState<
    Array<{ fecha: string; tipo: 'DOMINICAL' | 'FESTIVO'; nombre: string }>
  >([]);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [accionando, setAccionando] = useState(false);

  // ── Editar nómina (mes/quincena/observación) ──────────────────────────────
  const [editarOpen, setEditarOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    mes: string;
    periodicidad: Periodicidad;
    quincena: '1' | '2' | '';
    observacion: string;
  }>({ mes: '', periodicidad: 'QUINCENAL', quincena: '', observacion: '' });
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // ── Selector visual de tabs ──────────────────────────────────────────────
  const [tabActivo, setTabActivo] = useState<'colaboradores' | 'terceros'>('colaboradores');

  // ── Datos de terceros — endpoint /nominas/{id}/terceros (doc §6) ─────────
  const [terceros, setTerceros] = useState<NominaTercero[]>([]);
  const [cargandoTerceros, setCargandoTerceros] = useState(false);
  /** Detalle acta indexado por tercero_id (nit, representante, operarios). */
  const [detallesTerceros, setDetallesTerceros] = useState<Map<number, NominaTerceroActaDetalle>>(new Map());
  /** Resumen-trabajo por nomina_empleado.id de cada operario. */
  // Nota: `resumenesOperarios` se removió — el endpoint `/nomina-empleados/{id}/resumen-trabajo`
  // solo funciona con empleados internos (backend requiere `empleado_id` int,
  // no null). Para operarios el consolidado se arma desde `planillasPeriodo`
  // que ya trae cosechas[].cuadrilla y jornales[] eager-loaded.
  /**
   * Desglose por lote/labor por tercero — resultado ya consolidado desde el
   * endpoint dedicado `GET /nominas/{n}/terceros/{t}/operarios/{op}/detalle`
   * (doc §7.4). Reemplaza al antiguo `planillasPeriodo` que hacía N+1 sobre
   * `/operaciones/{id}`. Clave: `tercero_id`.
   */
  const [detallesPorTercero, setDetallesPorTercero] = useState<Map<number, CategoriaLabor[]>>(new Map());

  // Nota: `tercerosLookup` se eliminó — solo era un fallback defensivo
  // para `nombre_display`, pero el backend siempre eager-loadea el tercero
  // en `operario.tercero.razon_social` y en `acta.tercero_nombre`, así que
  // el lookup nunca se usaba en la práctica.

  // ── Modal Registrar Pago ────────────────────────────────────────────────
  const [modalPagoTerceroId, setModalPagoTerceroId] = useState<number | null>(null);
  const [pagandoForm, setPagandoForm] = useState<{
    metodo_pago: MetodoPagoTercero;
    referencia_pago: string;
    orden_pago_numero: string;
    observacion: string;
  }>({
    metodo_pago: 'TRANSFERENCIA',
    referencia_pago: '',
    orden_pago_numero: '',
    observacion: '',
  });
  const [registrandoPago, setRegistrandoPago] = useState(false);

  // ── Modal Liquidar Tercero (con descuentos manuales) ────────────────────
  interface DescuentoTercero {
    concepto: string;
    valor: number;
  }
  const [modalLiquidarTerceroId, setModalLiquidarTerceroId] = useState<number | null>(null);
  const [descuentosTercero, setDescuentosTercero] = useState<DescuentoTercero[]>([]);
  const [liquidandoTercero, setLiquidandoTercero] = useState(false);

  // Cache de netos reales (recalculados vía preview) por empleado.
  // Estrategia mixta:
  //   1. Al montar hidratamos desde localStorage (TTL 1h) → 0 requests si el
  //      usuario visitó la pantalla recientemente.
  //   2. Los que no estén en cache se piden en batches de 6 en paralelo (mismo
  //      límite HTTP del navegador). Cada fila cambia en cuanto llega.
  //   3. AbortController cancela los pendientes al desmontar el componente
  //      (por ejemplo al abrir "Liquidar") → libera conexiones para el editor.
  const [previewsPorEmpleado, setPreviewsPorEmpleado] = useState<Map<number, number>>(new Map());

  const PREVIEW_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
  const PREVIEW_BATCH_SIZE = 6;
  const previewCacheKey = (empleadoId: number) => `nomina_preview_neto_${empleadoId}`;
  // Controller compartido — se aborta en el cleanup del useEffect principal
  // y se renueva al re-cargar. Marca todas las requests en vuelo como
  // canceladas y libera las conexiones HTTP inmediatamente.
  const abortRef = useRef<AbortController | null>(null);

  // Hidrata desde localStorage (persiste entre sesiones). Devuelve el set
  // de ids con entrada válida — el caller lo usa para NO re-pedir preview.
  const hidratarCacheLocal = (empleadoIds: number[]): Set<number> => {
    const mapa = new Map<number, number>();
    const yaCacheados = new Set<number>();
    const ahora = Date.now();
    for (const id of empleadoIds) {
      try {
        const raw = localStorage.getItem(previewCacheKey(id));
        if (!raw) continue;
        const parsed = JSON.parse(raw) as { total: number; at: number };
        if (parsed.at && ahora - parsed.at < PREVIEW_CACHE_TTL_MS) {
          mapa.set(id, Number(parsed.total ?? 0));
          yaCacheados.add(id);
        }
      } catch { /* ignora entradas corruptas */ }
    }
    setPreviewsPorEmpleado(mapa);
    return yaCacheados;
  };

  // Batch en tandas de PREVIEW_BATCH_SIZE en paralelo. Cada preview:
  //   - Guarda el neto en state (fila se actualiza incremental).
  //   - Persiste en localStorage con TTL 1h.
  //   - Es cancelable vía AbortController.
  const precargarNetosEnBatches = async (ids: number[], signal: AbortSignal) => {
    for (let i = 0; i < ids.length; i += PREVIEW_BATCH_SIZE) {
      if (signal.aborted) return;
      const batch = ids.slice(i, i + PREVIEW_BATCH_SIZE);
      await Promise.all(
        batch.map((id) =>
          nominaApi
            .preview(id, signal)
            .then((r) => {
              if (signal.aborted) return;
              const total = Number(r.data.total_neto_propuesto ?? 0);
              setPreviewsPorEmpleado((prev) => {
                const nuevo = new Map(prev);
                nuevo.set(id, total);
                return nuevo;
              });
              try {
                localStorage.setItem(
                  previewCacheKey(id),
                  JSON.stringify({ total, at: Date.now() }),
                );
              } catch { /* localStorage puede estar lleno */ }
            })
            .catch(() => { /* aborted o falló — no rompe */ }),
        ),
      );
    }
  };

  const cargar = () => {
    if (!nominaId) return;
    setCargando(true);
    // Renovar AbortController: si había uno anterior de esta pantalla, se
    // aborta para que sus previews no compitan con los nuevos.
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    nominaApi
      .ver(nominaId)
      .then((res) => {
        if (signal.aborted) return;
        setNomina(res.data);
        const emps = res.data.empleados ?? [];
        setEmpleados(emps);
        // Paso 1: hidratar desde localStorage (0 requests). Los que abrieron
        // el editor recientemente aparecen con su neto real al instante.
        const yaCacheados = hidratarCacheLocal(emps.map((e) => e.id));
        // Paso 2: disparar previews de los PENDIENTES que faltan, en batches
        // de 6 para no saturar el navegador. Cancelables si el usuario navega
        // (ej. abre "Liquidar" antes de que terminen).
        if (res.data.estado === 'BORRADOR') {
          const faltan = emps
            .filter((e) => e.estado === 'PENDIENTE' && !yaCacheados.has(e.id))
            .map((e) => e.id);
          if (faltan.length > 0) precargarNetosEnBatches(faltan, signal);
        }
      })
      .catch((err: ApiError) => {
        if (signal.aborted) return;
        toast.error(err.message ?? 'Error al cargar nómina');
      })
      .finally(() => setCargando(false));
    // §3.6 — En paralelo, el checklist para saber si hay descansos huérfanos
    // por cortes personalizados. No es bloqueante: si falla, no rompe nada.
    nominaApi
      .pasoCuatroChecklist(nominaId)
      .then((res) => setDescansosHuerfanos(res.data.dias_descanso_fuera_de_rango ?? []))
      .catch(() => setDescansosHuerfanos([]));
  };

  // Al desmontar (por ejemplo al navegar al editor), abortamos los previews
  // pendientes para liberar las conexiones HTTP. Sin esto, el preview del
  // editor tenía que esperar a que se vaciara la cola de los 19 del listado.
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const cargarTerceros = async () => {
    if (!nominaId) return;
    setCargandoTerceros(true);
    try {
      const res = await nominaApi.terceros.listar(nominaId);
      const actas = res.data ?? [];
      setTerceros(actas);

      // Fase 2: detalle de cada acta (para nit + representante + operarios)
      const detallesPares = await Promise.all(
        actas.map((a) =>
          nominaApi.terceros
            .ver(nominaId, a.tercero_id)
            .then((r) => ({ terceroId: a.tercero_id, detalle: r.data }))
            .catch(() => null),
        ),
      );
      const detMap = new Map<number, NominaTerceroActaDetalle>();
      for (const p of detallesPares) if (p) detMap.set(p.terceroId, p.detalle);
      setDetallesTerceros(detMap);
    } catch (err) {
      const e = err as ApiError;
      if (e.status !== 404) {
        toast.error(e.message ?? 'Error al cargar terceros');
      }
    } finally {
      setCargandoTerceros(false);
    }
  };

  useEffect(() => {
    cargar();
    cargarTerceros();
    // Se eliminaron los pre-fetch de `/lotes/select` y `/sublotes/select`.
    // Los nombres de lote/sublote ya vienen eager-loaded en cada cosecha
    // y jornal de `GET /operaciones/{id}` (ver API_OPERACIONES.md §3.4).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nominaId]);

  // Nota: se eliminó el useEffect que disparaba `resumen-trabajo` por cada
  // operario — el endpoint solo acepta empleados internos y el resultado
  // no se consumía (state huérfano). El consolidado por operario se arma
  // desde `planillasPeriodo` que ya trae los eager-loads necesarios.

  /**
   * Carga del desglose por tercero usando los endpoints DEDICADOS de nómina
   * (doc §7.4). Reemplaza el N+1 anterior que hacía `GET /operaciones` +
   * N × `GET /operaciones/{id}` (una petición por planilla del período con
   * TODAS las relaciones eager-loaded — cientos de kB para pintar 5 filas).
   *
   * Nuevo flujo:
   *   1. Por cada tercero en `terceros[]`, y por cada operario del tercero:
   *   2. `GET /nominas/{n}/terceros/{t}/operarios/{op}/detalle` (§7.4) →
   *      { cosecha[], jornales[] } con exactamente las columnas de la tabla.
   *   3. Si alguno responde 404 ACTA_NO_CALCULADA, disparar `liquidar` una vez
   *      y reintentar los detalles del tercero (idempotente).
   *
   * Resultado: 2-3 peticiones ligeras en vez de 15+ pesadas.
   *
   * Se dispara al entrar al tab "Terceros" y solo re-carga si cambian los
   * `terceros` o los `empleados` (nuevos operarios agregados).
   */
  const detallesTerceroCacheRef = useRef<string | null>(null);
  useEffect(() => {
    if (tabActivo !== 'terceros') return;
    if (!nomina || !nominaId) return;
    if (terceros.length === 0) return;

    // Key de caché por (nomina, terceros, operarios). Si nada cambió, no
    // repetimos las peticiones al re-abrir el tab.
    const opsPorTercero = terceros
      .map((t) => {
        const ops = empleados
          .filter((e) => e.tercero_id === t.tercero_id && e.operario_id != null)
          .map((e) => e.operario_id!)
          .sort((a, b) => a - b);
        return `${t.tercero_id}:${ops.join(',')}`;
      })
      .join('|');
    const key = `${nominaId}::${opsPorTercero}`;
    if (detallesTerceroCacheRef.current === key) return;
    detallesTerceroCacheRef.current = key;

    (async () => {
      const nuevoMapa = new Map<number, CategoriaLabor[]>();
      // Helper: pedir todos los detalles de un tercero. Devuelve la lista de
      // exitosos y una bandera de si alguno falló por ACTA_NO_CALCULADA.
      const pedirDetalles = async (terceroId: number, operarioIds: number[]) => {
        const resultados = await Promise.allSettled(
          operarioIds.map((opId) =>
            nominaApi.terceros.detalleOperario(nominaId, terceroId, opId).then((r) => r.data),
          ),
        );
        const okList: DetalleLaboresOperario[] = [];
        let necesitaLiquidar = false;
        for (const r of resultados) {
          if (r.status === 'fulfilled') {
            okList.push(r.value);
          } else if ((r.reason as ApiError | undefined)?.code === 'ACTA_NO_CALCULADA') {
            necesitaLiquidar = true;
          }
        }
        return { okList, necesitaLiquidar };
      };

      await Promise.all(
        terceros.map(async (t) => {
          const operariosDelTercero = empleados
            .filter((e) => e.tercero_id === t.tercero_id && e.operario_id != null)
            .map((e) => e.operario_id!);
          if (operariosDelTercero.length === 0) return;

          let { okList, necesitaLiquidar } = await pedirDetalles(t.tercero_id, operariosDelTercero);

          // Si el acta aún no fue liquidada, la calculamos y reintentamos
          // UNA vez. Idempotente por doc §7.3.
          if (necesitaLiquidar) {
            try {
              await nominaApi.terceros.liquidar(nominaId, t.tercero_id);
              ({ okList } = await pedirDetalles(t.tercero_id, operariosDelTercero));
            } catch {
              /* silencio — el mapa quedará vacío para este tercero */
            }
          }

          nuevoMapa.set(t.tercero_id, consolidarDesdeDetalles(okList));
        }),
      );
      setDetallesPorTercero(nuevoMapa);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActivo, nominaId, terceros, empleados]);

  const esBorrador = nomina?.estado === 'BORRADOR';
  // Los operarios NO van en la tabla de "Liquidación de Colaboradores" — se
  // gestionan por acta en el tab Terceros. Aquí filtramos solo internos.
  const empleadosInternos = empleados.filter((e) => e.empleado_id != null);
  const empleadosOperarios = empleados.filter((e) => e.operario_id != null);
  const empleadosMostrar = esBorrador
    ? empleadosInternos
    : empleadosInternos.filter((e) => e.estado === 'LIQUIDADO');

  const quitarEmpleado = async () => {
    if (!empleadoAQuitar) return;
    setAccionando(true);
    try {
      await nominaApi.quitarEmpleado(empleadoAQuitar.id);
      toast.success('Empleado quitado de la nómina');
      setEmpleadoAQuitar(null);
      cargar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === 'EMPLEADO_LIQUIDADO') {
        toast.error('No se puede quitar un empleado ya liquidado');
      } else {
        toast.error(e.message ?? 'Error al quitar empleado');
      }
    } finally {
      setAccionando(false);
    }
  };

  const cerrarNomina = async () => {
    if (!nominaId) return;
    setAccionando(true);
    try {
      const res = await nominaApi.cerrar(nominaId);
      toast.success(res.message ?? 'Nómina cerrada');
      // §4.4 — advertencia post-cierre si había cosechas con gajos sin
      // despachar. Cierre irreversible: aviso importante.
      if (res.advertencia?.code === 'COSECHA_GAJOS_SIN_DESPACHAR') {
        toast.warning(res.advertencia.texto, { duration: 10000 });
      }
      setConfirmarCerrar(false);
      cargar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.NOMINA_CON_PENDIENTES) {
        toast.error('Hay empleados pendientes por liquidar');
      } else if (e.code === NominaErrorCodes.NOMINA_VALIDACION_COSECHA_REQUERIDA) {
        toast.error('Debes confirmar la validación de cosecha antes de cerrar');
      } else if (e.code === NominaErrorCodes.NOMINA_TERCERO_NO_LIQUIDADO) {
        toast.error('Hay terceros sin liquidar — calcula sus actas en "Liquidar Terceros"');
      } else {
        toast.error(e.message ?? 'Error al cerrar nómina');
      }
    } finally {
      setAccionando(false);
    }
  };

  /** Abre el modal de editar pre-poblado con los datos actuales. */
  const abrirEditar = () => {
    if (!nomina) return;
    setEditForm({
      mes: String(nomina.mes),
      periodicidad: nomina.tipo_pago_snapshot,
      quincena: nomina.quincena ? (String(nomina.quincena) as '1' | '2') : '',
      observacion: nomina.observacion ?? '',
    });
    setEditarOpen(true);
  };

  const guardarEdicion = async () => {
    if (!nominaId) return;
    if (!editForm.mes) {
      toast.error('El mes es requerido');
      return;
    }
    if (editForm.periodicidad === 'QUINCENAL' && !editForm.quincena) {
      toast.error('La quincena es requerida para periodicidad quincenal');
      return;
    }
    setGuardandoEdit(true);
    try {
      await nominaApi.editar(nominaId, {
        mes: parseInt(editForm.mes),
        periodicidad: editForm.periodicidad,
        quincena:
          editForm.periodicidad === 'QUINCENAL'
            ? (parseInt(editForm.quincena) as 1 | 2)
            : null,
        observacion: editForm.observacion || null,
      });
      toast.success('Nómina actualizada');
      setEditarOpen(false);
      cargar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.NOMINA_CON_LIQUIDADOS) {
        toast.error('No se puede editar: ya hay colaboradores liquidados');
      } else if (e.code === NominaErrorCodes.NOMINA_DUPLICADA) {
        toast.error('Ya existe otra nómina para ese período');
      } else if (e.code === NominaErrorCodes.NOMINA_CERRADA) {
        toast.error('No se puede editar una nómina cerrada');
      } else {
        toast.error(e.message ?? 'Error al editar nómina');
      }
    } finally {
      setGuardandoEdit(false);
    }
  };

  const abrirModalPago = (terceroId: number) => {
    setPagandoForm({
      metodo_pago: 'TRANSFERENCIA',
      referencia_pago: '',
      orden_pago_numero: '',
      observacion: '',
    });
    setModalPagoTerceroId(terceroId);
  };

  /**
   * Marca el acta como pagada directamente (sin modal) — usa TRANSFERENCIA
   * por defecto. El usuario prefiere el flujo rápido: click → pagado.
   */
  /**
   * Marca el acta como pagada directamente (sin modal) — usa TRANSFERENCIA
   * por defecto. Si al tercero le faltan datos bancarios, el backend rechaza
   * con `TERCERO_SIN_DATOS_BANCARIOS` y se muestra un toast pidiendo
   * completarlos antes de reintentar.
   */
  const registrarPagoDirecto = async (terceroId: number) => {
    if (!nominaId) return;
    setRegistrandoPago(true);
    try {
      await nominaApi.terceros.registrarPago(nominaId, terceroId, {
        metodo_pago: 'TRANSFERENCIA',
      });
      toast.success('Pago registrado');
      cargarTerceros();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.TERCERO_SIN_DATOS_BANCARIOS) {
        toast.error('Falta configurar los datos bancarios del tercero');
      } else if (e.code === NominaErrorCodes.ACTA_TERCERO_YA_PAGADA) {
        toast.error('El acta ya fue pagada');
      } else if (e.code === NominaErrorCodes.PERMISSION_DENIED) {
        toast.error('No tienes el permiso "nomina.pagar-tercero"');
      } else {
        toast.error(e.message ?? 'No se pudo registrar el pago');
      }
    } finally {
      setRegistrandoPago(false);
    }
  };

  /**
   * Abre el modal de "Liquidar" para un tercero. Permite al usuario agregar
   * descuentos (concepto + valor) antes de registrar el pago.
   */
  const abrirLiquidarTercero = (terceroId: number) => {
    setDescuentosTercero([]);
    setModalLiquidarTerceroId(terceroId);
  };

  const agregarDescuentoTercero = () => {
    setDescuentosTercero((prev) => [...prev, { concepto: '', valor: 0 }]);
  };

  const actualizarDescuentoTercero = (
    idx: number,
    campo: keyof DescuentoTercero,
    valor: string | number,
  ) => {
    setDescuentosTercero((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [campo]: valor } : d)),
    );
  };

  const quitarDescuentoTercero = (idx: number) => {
    setDescuentosTercero((prev) => prev.filter((_, i) => i !== idx));
  };

  /**
   * Confirma la liquidación del tercero: registra el pago e incluye los
   * descuentos como texto libre en la observación (el endpoint
   * `POST /registrar-pago` §7.5 no acepta descuentos estructurados, así que
   * los consolidamos en la observación para trazabilidad).
   */
  const confirmarLiquidarTercero = async () => {
    if (!nominaId || !modalLiquidarTerceroId) return;
    // Validar filas
    const descuentosValidos = descuentosTercero.filter(
      (d) => d.concepto.trim() && d.valor > 0,
    );
    if (descuentosTercero.some(
      (d) => (d.concepto.trim() && d.valor <= 0)
        || (!d.concepto.trim() && d.valor > 0),
    )) {
      toast.error('Completa concepto y valor en los descuentos agregados');
      return;
    }
    setLiquidandoTercero(true);
    try {
      const observacion = descuentosValidos.length > 0
        ? `Descuentos: ${descuentosValidos
            .map((d) => `${d.concepto} $${d.valor.toLocaleString('es-CO')}`)
            .join(', ')}`
        : undefined;
      await nominaApi.terceros.registrarPago(nominaId, modalLiquidarTerceroId, {
        metodo_pago: 'TRANSFERENCIA',
        observacion,
      });
      toast.success('Tercero liquidado');
      setModalLiquidarTerceroId(null);
      setDescuentosTercero([]);
      cargarTerceros();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.TERCERO_SIN_DATOS_BANCARIOS) {
        toast.error('Falta configurar los datos bancarios del tercero');
      } else if (e.code === NominaErrorCodes.ACTA_TERCERO_YA_PAGADA) {
        toast.error('El acta ya fue pagada');
      } else if (e.code === NominaErrorCodes.PERMISSION_DENIED) {
        toast.error('No tienes el permiso "nomina.pagar-tercero"');
      } else {
        toast.error(e.message ?? 'No se pudo liquidar el tercero');
      }
    } finally {
      setLiquidandoTercero(false);
    }
  };

  const confirmarPago = async () => {
    if (!nominaId || !modalPagoTerceroId) return;
    setRegistrandoPago(true);
    try {
      await nominaApi.terceros.registrarPago(nominaId, modalPagoTerceroId, {
        metodo_pago: pagandoForm.metodo_pago,
        referencia_pago: pagandoForm.referencia_pago || undefined,
        orden_pago_numero: pagandoForm.orden_pago_numero || undefined,
        observacion: pagandoForm.observacion || undefined,
      });
      toast.success('Pago registrado');
      setModalPagoTerceroId(null);
      cargarTerceros();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.TERCERO_SIN_DATOS_BANCARIOS) {
        toast.error('Falta configurar los datos bancarios del tercero');
      } else if (e.code === NominaErrorCodes.ACTA_TERCERO_YA_PAGADA) {
        toast.error('El acta ya fue pagada');
      } else if (e.code === NominaErrorCodes.PERMISSION_DENIED) {
        toast.error('No tienes el permiso "nomina.pagar-tercero". Pide al administrador que te lo asigne.');
      } else {
        toast.error(e.message ?? 'No se pudo registrar el pago');
      }
    } finally {
      setRegistrandoPago(false);
    }
  };

  /**
   * Genera el comprobante de pago del tercero EN EL CLIENTE con jsPDF.
   * NO usa `GET /acta/pdf` del backend porque ese endpoint lee
   * `nomina_tercero.total_a_transferir` que llega en 0 (bug documentado del
   * motor de acta). Aquí reutilizamos el desglose consolidado desde las
   * planillas (`consolidarPorTercero`) que sí trae los valores correctos.
   */
  const descargarPdfTercero = (terceroId: number, razonSocial: string) => {
    if (!nomina) return;
    const grupo = tercerosAgrupados.find((g) => g.tercero_id === terceroId);
    if (!grupo) return toast.error('No se encontró el tercero');
    const det = detallesTerceros.get(terceroId);
    const categorias = consolidarPorTercero(grupo.operarios);
    const totalEstimado = categorias.reduce((s, c) => s + c.subtotal, 0);
    const totalActa = toNumber(grupo.acta?.total_a_transferir);
    const total = totalActa > 0 ? totalActa : totalEstimado;

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const width = doc.internal.pageSize.getWidth();
    const marginX = 40;
    let y = 50;

    // ── Header: razón social + comprobante ─────────────────────────────
    doc.setTextColor(30, 86, 49); // verde primary
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(razonSocial, marginX, y);

    doc.setTextColor(120);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    y += 16;
    const nit = det?.tercero.nit ?? det?.tercero.cedula ?? '—';
    doc.text(`NIT: ${nit}`, marginX, y);
    if (det?.tercero.telefono) {
      y += 12;
      doc.text(`Tel: ${det.tercero.telefono}`, marginX, y);
    }

    // Bloque comprobante en la esquina derecha
    const comprobanteId = `COMP-N${nomina.id}-ET${terceroId}`;
    doc.setDrawColor(30, 86, 49);
    doc.setLineWidth(1);
    doc.roundedRect(width - marginX - 200, 40, 200, 40, 4, 4);
    doc.setTextColor(120);
    doc.setFontSize(8);
    doc.text('COMPROBANTE DE PAGO', width - marginX - 190, 55);
    doc.setTextColor(0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`No. ${comprobanteId}`, width - marginX - 190, 72);

    y = 100;
    doc.setDrawColor(30, 86, 49);
    doc.setLineWidth(1.5);
    doc.line(marginX, y, width - marginX, y);
    y += 20;

    // ── Período + Fecha de pago ────────────────────────────────────────
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const periodoTexto = `${MESES[(nomina.mes ?? 1) - 1]} ${nomina.anio}`
      + (nomina.tipo_pago_snapshot === 'QUINCENAL' && nomina.quincena
        ? ` – ${nomina.quincena === 1 ? 'Primera' : 'Segunda'} quincena`
        : '');
    const fechaPago = grupo.acta?.pagado_at ? fmtFecha(grupo.acta.pagado_at.slice(0, 10)) : fmtFecha(new Date().toISOString().slice(0, 10));

    doc.setDrawColor(220);
    doc.setLineWidth(0.5);
    doc.roundedRect(marginX, y, (width - 2 * marginX - 10) / 2, 45, 3, 3);
    doc.roundedRect(marginX + (width - 2 * marginX - 10) / 2 + 10, y, (width - 2 * marginX - 10) / 2, 45, 3, 3);

    doc.setTextColor(120); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('PERÍODO', marginX + 10, y + 15);
    doc.text('FECHA DE PAGO', marginX + (width - 2 * marginX - 10) / 2 + 20, y + 15);
    doc.setTextColor(0); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(periodoTexto, marginX + 10, y + 33);
    doc.text(fechaPago, marginX + (width - 2 * marginX - 10) / 2 + 20, y + 33);

    y += 60;

    // ── Señores (beneficiario) ─────────────────────────────────────────
    doc.setTextColor(0); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('SEÑORES (BENEFICIARIO)', marginX, y);
    y += 8;

    const halfW = (width - 2 * marginX - 10) / 2;
    doc.setDrawColor(220);
    doc.roundedRect(marginX, y, halfW, 40, 3, 3);
    doc.roundedRect(marginX + halfW + 10, y, halfW, 40, 3, 3);
    doc.setTextColor(120); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('EMPRESA / RAZÓN SOCIAL', marginX + 8, y + 14);
    doc.text('NIT', marginX + halfW + 18, y + 14);
    doc.setTextColor(0); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(razonSocial, marginX + 8, y + 30);
    doc.text(nit, marginX + halfW + 18, y + 30);
    y += 45;

    if (det?.tercero.representante || det?.tercero.telefono) {
      doc.roundedRect(marginX, y, halfW, 40, 3, 3);
      doc.roundedRect(marginX + halfW + 10, y, halfW, 40, 3, 3);
      doc.setTextColor(120); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text('CONTACTO', marginX + 8, y + 14);
      doc.text('TELÉFONO', marginX + halfW + 18, y + 14);
      doc.setTextColor(0); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text(det?.tercero.representante ?? '—', marginX + 8, y + 30);
      doc.text(det?.tercero.telefono ?? '—', marginX + halfW + 18, y + 30);
      y += 55;
    } else {
      y += 15;
    }

    // ── Detalle por labor/lote ──────────────────────────────────────────
    doc.setTextColor(0); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('DETALLE POR LABOR', marginX, y);
    y += 6;

    const rows: any[] = [];
    categorias.forEach((cat) => {
      // Fila título categoría
      rows.push([
        {
          content: cat.titulo,
          colSpan: 7,
          styles: { fontStyle: 'bold', fillColor: [245, 245, 245], textColor: [30, 86, 49] },
        },
      ]);
      cat.filas.forEach((f) => {
        rows.push([
          f.lote,
          f.sublote,
          `${f.cantidad.toLocaleString('es-CO')} ${f.unidad}`,
          f.promedio_kg && f.promedio_kg > 0 ? f.promedio_kg.toFixed(1) : '—',
          f.peso_kg && f.peso_kg > 0 ? f.peso_kg.toLocaleString('es-CO') : '—',
          `$${f.precio.toLocaleString('es-CO')} ${f.precio_unidad}`,
          `$${f.total.toLocaleString('es-CO')}`,
        ]);
      });
      // Subtotal categoría
      rows.push([
        {
          content: `Subtotal ${cat.titulo.charAt(0) + cat.titulo.slice(1).toLowerCase()}`,
          colSpan: 6,
          styles: { halign: 'right', fontStyle: 'bold', fillColor: [250, 250, 250] },
        },
        {
          content: `$${cat.subtotal.toLocaleString('es-CO')}`,
          styles: { halign: 'right', fontStyle: 'bold', fillColor: [250, 250, 250], textColor: [30, 86, 49] },
        },
      ]);
    });

    autoTable(doc, {
      startY: y + 4,
      head: [['Lote', 'Sublote', 'Cantidad', 'Prom.', 'Peso (kg)', 'Precio Unit.', 'Total']],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 86, 49], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
      margin: { left: marginX, right: marginX },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;

    // ── Total a pagar ──────────────────────────────────────────────────
    doc.setFillColor(30, 86, 49);
    doc.rect(marginX, finalY, width - 2 * marginX, 32, 'F');
    doc.setTextColor(255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL ORDEN DE PAGO A ${razonSocial.toUpperCase()}`, marginX + 10, finalY + 20);
    doc.setFontSize(13);
    doc.text(`$${total.toLocaleString('es-CO')}`, width - marginX - 10, finalY + 20, { align: 'right' });
    finalY += 45;

    // ── Firmas ──────────────────────────────────────────────────────────
    doc.setDrawColor(180);
    doc.setLineWidth(0.5);
    const firmaW = (width - 2 * marginX - 40) / 2;
    doc.line(marginX + 20, finalY + 40, marginX + 20 + firmaW, finalY + 40);
    doc.line(marginX + firmaW + 60, finalY + 40, marginX + firmaW * 2 + 60, finalY + 40);
    doc.setTextColor(120); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('ELABORADO POR', marginX + 20 + firmaW / 2, finalY + 55, { align: 'center' });
    doc.text('RECIBIDO POR', marginX + firmaW + 60 + firmaW / 2, finalY + 55, { align: 'center' });

    // ── Footer ──────────────────────────────────────────────────────────
    doc.setTextColor(150); doc.setFontSize(7);
    doc.text(
      `PalmApp · Nómina #${nomina.id} · Comprobante ${comprobanteId}`,
      width / 2,
      doc.internal.pageSize.getHeight() - 30,
      { align: 'center' },
    );

    doc.save(`comprobante_${razonSocial.replace(/\s+/g, '_')}_N${nomina.id}.pdf`);
    toast.success('Comprobante descargado');
  };

  const eliminarNomina = async () => {
    if (!nominaId) return;
    setAccionando(true);
    try {
      await nominaApi.eliminar(nominaId);
      toast.success('Nómina eliminada');
      navigate('/nomina');
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.NOMINA_CON_LIQUIDADOS) {
        toast.error('No se puede eliminar: hay colaboradores liquidados');
      } else if (e.code === NominaErrorCodes.NOMINA_CERRADA) {
        toast.error('No se puede eliminar una nómina cerrada');
      } else {
        toast.error(e.message ?? 'Error al eliminar nómina');
      }
    } finally {
      setAccionando(false);
      setConfirmarEliminar(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando nómina...
      </div>
    );
  }

  if (!nomina || !nominaId) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Nómina no encontrada.
      </div>
    );
  }

  // ── KPIs Colaboradores (solo INTERNOS) ──────────────────────────────────
  const totalNeto = toNumber(nomina.total_general);
  const totalDeducciones = toNumber(nomina.total_deducciones);
  const totalDevengado = totalNeto + totalDeducciones;
  const liquidados = empleadosInternos.filter((e) => e.estado === 'LIQUIDADO').length;
  const totalColabs = empleadosInternos.length;
  const pendientesInternos = empleadosInternos.filter((e) => e.estado !== 'LIQUIDADO').length;
  const pendientesOperarios = empleadosOperarios.filter((e) => e.estado !== 'LIQUIDADO').length;
  // Para deshabilitar "Cerrar" — cualquier pendiente (interno o operario) bloquea.
  const pendientes = pendientesInternos + pendientesOperarios;

  // ── Agrupación de operarios por tercero (para tab Terceros aún sin acta) ─
  type TerceroAgrupado = {
    tercero_id: number;
    tercero_nombre: string;
    operarios: NominaEmpleado[];
    acta: NominaTercero | undefined;
  };
  const tercerosAgrupados: TerceroAgrupado[] = (() => {
    const map = new Map<number, TerceroAgrupado>();
    empleadosOperarios.forEach((emp) => {
      const tid = emp.tercero_id ?? emp.operario?.tercero?.id ?? 0;
      if (!tid) return;
      if (!map.has(tid)) {
        map.set(tid, {
          tercero_id: tid,
          tercero_nombre: emp.operario?.tercero?.razon_social ?? `Tercero #${tid}`,
          operarios: [],
          acta: terceros.find((t) => t.tercero_id === tid),
        });
      }
      map.get(tid)!.operarios.push(emp);
    });
    // Incluir actas que puedan venir sin operarios embebidos.
    terceros.forEach((t) => {
      if (!map.has(t.tercero_id)) {
        map.set(t.tercero_id, {
          tercero_id: t.tercero_id,
          tercero_nombre: t.tercero_nombre ?? `Tercero #${t.tercero_id}`,
          operarios: [],
          acta: t,
        });
      }
    });
    return Array.from(map.values());
  })();

  // ── KPIs Terceros ───────────────────────────────────────────────────────
  const totalServiciosTerceros = terceros.reduce(
    (s, t) => s + toNumber(t.total_a_transferir),
    0,
  );
  const empresasPagadas = terceros.filter((t) => t.estado_pago === 'PAGADO').length;
  const totalOperarios = empleadosOperarios.length;

  // ── Consolidación de labores por lote+sublote para el desglose por acta ─
  // Los tipos FilaLabor / CategoriaLabor y el catálogo CATS ahora viven a
  // nivel de módulo (arriba del archivo) para poder tiparlos en el useState
  // del mapa `detallesPorTercero`.

  /**
   * Los helpers `nombreLote` / `nombreSublote` / `catDeJornal` se eliminaron
   * junto con el consolidado legacy. El endpoint dedicado (§7.4) ya entrega
   * los nombres de lote/sublote como strings y no necesita re-mapear la
   * categoría desde tipos internos de `operaciones`.
   */

  /**
   * Desglose por labor/lote/sublote para un tercero — LEE del mapa
   * `detallesPorTercero` que se llena una vez desde los endpoints dedicados
   * (§7.4). Mantiene la firma `(operariosDelTercero)` para no tocar los 4
   * sitios de llamada; el `tercero_id` se infiere del primer operario.
   *
   * El código antiguo que hacía el consolidado desde `planillasPeriodo` fue
   * removido — el backend ya devuelve los totales por lote/labor. Ver el
   * refactor de rendimiento (N+1 → 2-3 requests) más arriba en el useEffect.
   */
  const consolidarPorTercero = (operariosDelTercero: NominaEmpleado[]): CategoriaLabor[] => {
    if (operariosDelTercero.length === 0) return [];
    const terceroId = operariosDelTercero[0].tercero_id;
    if (terceroId == null) return [];
    return detallesPorTercero.get(terceroId) ?? [];
  };
  // (código legacy del consolidado desde `planillasPeriodo` eliminado tras
  // el refactor a los endpoints dedicados §7.4)

  // Colores por categoría (mismo esquema visual de V.16):
  //  - cosecha  → amber
  //  - poda     → primary (verde)
  //  - fertilizacion → info (azul)
  //  - plateo   → purple
  //  - sanidad  → success (verde éxito)
  //  - otros/finca → gris
  // Paleta V.19 por labor:
  //  Cosecha       → amber-600
  //  Poda / Plateo → #1E5631 (verde oscuro finca)
  //  Fertilización → blue-600
  //  Abonada       → purple-600
  //  Sanidad       → rose-600
  //  Finca / Otros → zinc-700
  const acumCategoria = (color: CategoriaLabor['color']) => {
    switch (color) {
      case 'amber':  return { header: 'text-amber-600',   total: 'text-amber-600' };
      case 'green':  return { header: 'text-[#1E5631]',   total: 'text-[#1E5631]' };
      case 'blue':   return { header: 'text-blue-600',    total: 'text-blue-600' };
      case 'purple': return { header: 'text-purple-600',  total: 'text-purple-600' };
      case 'red':    return { header: 'text-rose-600',    total: 'text-rose-600' };
      default:       return { header: 'text-zinc-700 dark:text-zinc-300', total: 'text-foreground' };
    }
  };

  const terceroSeleccionadoPago = modalPagoTerceroId
    ? terceros.find((a) => a.tercero_id === modalPagoTerceroId)
    : null;
  const detallePagoSeleccionado = modalPagoTerceroId
    ? detallesTerceros.get(modalPagoTerceroId)
    : null;
  const datosBancariosCompletos = !!(
    detallePagoSeleccionado
    && detallePagoSeleccionado.tercero.banco
    && detallePagoSeleccionado.tercero.tipo_cuenta
    && detallePagoSeleccionado.tercero.numero_cuenta
    && detallePagoSeleccionado.tercero.titular_cuenta
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/nomina">Pagos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{periodoLabel(nomina)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 gap-2">
          <Link to="/nomina">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-primary">{periodoLabel(nomina)}</h1>
              <StatusBadge status={nomina.estado as any} />
            </div>
            <p className="text-muted-foreground">
              {nomina.mes}/{nomina.anio}
              {nomina.quincena ? ` - Quincena ${nomina.quincena}` : ''}
            </p>
          </div>

          <div className="flex gap-2">
            {esBorrador && (() => {
              const puedeCerrar = totalColabs > 0 && liquidados === totalColabs;
              return (
                <Button
                  className="gap-2 bg-primary hover:bg-primary/90"
                  onClick={async () => {
                    // §4.4 — Precargamos el bundle de validar-cosecha para
                    // saber si hay gajos sin despachar ANTES de abrir el
                    // diálogo. El cierre es irreversible: si continuamos con
                    // gajos pendientes, esa fruta queda fuera de la
                    // liquidación de forma permanente.
                    if (!nominaId) return;
                    setCargandoValidacionPreCierre(true);
                    try {
                      // §4.4 + §3.6 — dos precargas en paralelo. Si alguna
                      // falla, seguimos con lo que sí cargó; ninguna bloquea.
                      const [validRes, checkRes] = await Promise.allSettled([
                        nominaApi.validarCosecha(nominaId),
                        nominaApi.pasoCuatroChecklist(nominaId),
                      ]);
                      if (validRes.status === 'fulfilled') {
                        const pendientes = validRes.value.data.cosechas_con_gajos_pendientes ?? 0;
                        const totalGajos = validRes.value.data.total_gajos_pendientes_enviar ?? 0;
                        setAlertaGajosPreCierre(
                          pendientes > 0
                            ? { cosechas_con_gajos_pendientes: pendientes, total_gajos_pendientes_enviar: totalGajos }
                            : null,
                        );
                      } else {
                        setAlertaGajosPreCierre(null);
                      }
                      if (checkRes.status === 'fulfilled') {
                        setDescansosHuerfanosPreCierre(
                          checkRes.value.data.dias_descanso_fuera_de_rango ?? [],
                        );
                      } else {
                        setDescansosHuerfanosPreCierre([]);
                      }
                    } catch {
                      setAlertaGajosPreCierre(null);
                      setDescansosHuerfanosPreCierre([]);
                    } finally {
                      setCargandoValidacionPreCierre(false);
                      setConfirmarCerrar(true);
                    }
                  }}
                  disabled={accionando || !puedeCerrar || cargandoValidacionPreCierre}
                  title={!puedeCerrar ? 'Liquida todos los colaboradores antes de cerrar' : undefined}
                >
                  <Check className="h-4 w-4" />
                  {cargandoValidacionPreCierre ? 'Verificando…' : 'Cerrar Nómina'}
                </Button>
              );
            })()}
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* §9.9 — Advertencias del snapshot del calendario (200 ⚠). No bloquean
          la operación pero avisan si el calendario congelado quedó obsoleto
          respecto a la fuente externa o si el recargo dominical se desactualizó
          por Ley posterior. */}
      <AdvertenciasBanner items={nomina.advertencias} size="md" />

      {/* §3.6 — Aviso de descansos huérfanos por CORTES PERSONALIZADOS que
          dejan huecos DENTRO del rango de esta nómina. El backend devuelve
          todos los descansos del mes que ninguna nómina cubre, pero un día
          del 24 no le compete a la nómina del 1 al 15 — le corresponde a
          la Q2 (aún no creada). Filtramos por rango local para no confundir. */}
      {(() => {
        const inicio = nomina?.fecha_inicio ?? '';
        const fin = nomina?.fecha_fin ?? '';
        const enRango = descansosHuerfanos.filter(
          (d) => !!inicio && !!fin && d.fecha >= inicio && d.fecha <= fin,
        );
        if (enRango.length === 0) return null;
        return (
          <div className="rounded-lg border-2 border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 text-amber-700 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                  {enRango.length} día{enRango.length !== 1 ? 's' : ''} de descanso dentro del rango de esta nómina sin cubrir
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mb-2">
                  Con cortes personalizados hay días de descanso que caen en el hueco entre dos nóminas y no se están pagando en ninguna. Puede ser deliberado.
                </p>
                <ul className="text-xs text-amber-900/90 dark:text-amber-100/90 space-y-0.5">
                  {enRango.slice(0, 6).map((d) => (
                    <li key={d.fecha}>
                      <span className="font-mono">{d.fecha}</span> · {d.nombre}
                    </li>
                  ))}
                  {enRango.length > 6 && (
                    <li className="italic">+ {enRango.length - 6} más</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Selector de vista (tabs visuales V.15) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setTabActivo('colaboradores')}
          className={`relative flex items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
            tabActivo === 'colaboradores'
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
          }`}
        >
          <div className={`h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center ${
            tabActivo === 'colaboradores' ? 'bg-primary/15' : 'bg-muted'
          }`}>
            <Users className={`h-6 w-6 ${tabActivo === 'colaboradores' ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-base ${tabActivo === 'colaboradores' ? 'text-primary' : 'text-foreground'}`}>
              Colaboradores Internos
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Colaboradores directos de la finca</p>
          </div>
          <span className={`text-2xl font-bold flex-shrink-0 ${tabActivo === 'colaboradores' ? 'text-primary' : 'text-muted-foreground'}`}>
            {totalColabs}
          </span>
          {tabActivo === 'colaboradores' && (
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setTabActivo('terceros')}
          className={`relative flex items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
            tabActivo === 'terceros'
              ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 shadow-sm'
              : 'border-border bg-card hover:border-amber-400/40 hover:bg-muted/40'
          }`}
        >
          <div className={`h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center ${
            tabActivo === 'terceros' ? 'bg-amber-500/15' : 'bg-muted'
          }`}>
            <Building2 className={`h-6 w-6 ${tabActivo === 'terceros' ? 'text-amber-600' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-base ${tabActivo === 'terceros' ? 'text-amber-700' : 'text-foreground'}`}>
              Terceros
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Contratistas y empresas externas</p>
          </div>
          <span className={`text-2xl font-bold flex-shrink-0 ${tabActivo === 'terceros' ? 'text-amber-700' : 'text-muted-foreground'}`}>
            {tercerosAgrupados.length}
          </span>
          {tabActivo === 'terceros' && (
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500" />
          )}
        </button>
      </div>

      {/* KPIs dinámicos según tab */}
      {tabActivo === 'colaboradores' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Total Devengado</p>
                  <p className="text-2xl font-bold text-success">${totalDevengado.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Lo que ganaron en el período</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Deducciones</p>
                  <p className="text-2xl font-bold text-destructive">${totalDeducciones.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Salud + Pensión + Otros</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Neto a Pagar</p>
                  <p className="text-2xl font-bold text-primary">${totalNeto.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Lo que recibe cada colaborador</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Avance de Liquidación</p>
                  <p className="text-2xl font-bold text-foreground">
                    {liquidados} <span className="text-base font-normal text-muted-foreground">de {totalColabs}</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{ width: `${totalColabs ? (liquidados / totalColabs) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Colaboradores liquidados</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Empresas Contratistas</p>
                  <p className="text-2xl font-bold text-foreground">{tercerosAgrupados.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{totalOperarios} operario{totalOperarios !== 1 ? 's' : ''} en campo</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Total a Transferir</p>
                  <p className="text-2xl font-bold text-primary">${totalServiciosTerceros.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">A empresas contratistas</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Avance de Pago</p>
                  <p className="text-2xl font-bold text-foreground">
                    {empresasPagadas} <span className="text-base font-normal text-muted-foreground">de {tercerosAgrupados.length}</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{ width: `${tercerosAgrupados.length ? (empresasPagadas / tercerosAgrupados.length) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Empresas pagadas</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB TERCEROS ── */}
      {tabActivo === 'terceros' && (
        <div className="space-y-4">

          {cargandoTerceros ? (
            <Card className="border-border">
              <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando terceros...
              </CardContent>
            </Card>
          ) : tercerosAgrupados.length === 0 ? (
            <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No hay terceros en este período</p>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  {esBorrador
                    ? 'Agrega operarios de empresas contratistas en el wizard de nómina para verlos aquí.'
                    : 'No se liquidaron empresas contratistas en este período.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            tercerosAgrupados.map((grupo) => {
              const acta = grupo.acta;
              const detalle = detallesTerceros.get(grupo.tercero_id);
              const pagado = acta?.estado_pago === 'PAGADO';
              const calculada = acta != null;
              const nit = detalle?.tercero.nit ?? detalle?.tercero.cedula ?? null;
              const representante = detalle?.tercero.representante ?? null;
              const categorias = consolidarPorTercero(grupo.operarios);
              const totalEstimado = categorias.reduce((s, c) => s + c.subtotal, 0);
              // Si el acta ya fue calculada usamos ese total, PERO si el
              // backend lo dejó en 0 (bug: `valor_calculado` de la cuadrilla
              // llega null) caemos al estimado sumando los subtotales de la
              // tabla desglosada.
              const totalActa = toNumber(acta?.total_a_transferir);
              const total = calculada && totalActa > 0 ? totalActa : totalEstimado;
              return (
                <Card key={grupo.tercero_id} className="border-border overflow-hidden">
                  {/* Header acta */}
                  <div className={`flex items-center justify-between px-5 py-4 border-b border-border ${pagado ? 'bg-success/5' : 'bg-amber-50/60 dark:bg-amber-950/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold ${pagado ? 'bg-success/10 text-success' : 'bg-amber-500/10 text-amber-700'}`}>
                        {grupo.tercero_nombre.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{grupo.tercero_nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {nit && <>NIT {nit}</>}
                          {nit && representante && ' · '}
                          {representante}
                          {!nit && !representante && `${grupo.operarios.length} operario(s)`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {calculada ? 'Total a pagar' : 'Estimado'}
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          {total > 0 ? `$${total.toLocaleString('es-CO')}` : '—'}
                        </p>
                      </div>
                      <Badge className={`text-xs ${
                        pagado
                          ? 'bg-success/10 text-success border-success/20'
                          : calculada
                            ? 'bg-amber-500/10 text-amber-700 border-amber-300'
                            : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {pagado ? 'Pagado' : calculada ? 'Pendiente' : 'Sin calcular'}
                      </Badge>
                      {pagado ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => navigate(
                              `/nomina/${nominaId}/tercero/${grupo.tercero_id}/liquidar`,
                              { state: { totalEstimado: total, categorias } },
                            )}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Ver detalle
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => descargarPdfTercero(grupo.tercero_id, grupo.tercero_nombre)}
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Generar Comprobante
                          </Button>
                        </>
                      ) : calculada && (
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 gap-1.5"
                          onClick={() => navigate(
                            `/nomina/${nominaId}/tercero/${grupo.tercero_id}/liquidar`,
                            {
                              state: {
                                // Pasamos el total ya calculado desde el
                                // desglose de labores para evitar el 0 del
                                // acta cuando el motor del backend no lo
                                // calculó bien (bug conocido).
                                totalEstimado: total,
                                categorias,
                              },
                            },
                          )}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Liquidar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tabla de labores agrupadas — mismo layout que V.16.
                      FINCA sale en su propia tabla debajo porque no tiene
                      lote/sublote/promedio/peso. El "Total orden de pago" va
                      al final después de ambas tablas. */}
                  {categorias.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      {detallesPorTercero.size === 0
                        ? 'Cargando desglose por labor...'
                        : 'Sin registros de campo en el período para los operarios de esta empresa.'}
                    </div>
                  ) : (
                    <>
                      {categorias.filter((c) => c.key !== 'finca').length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                                <th className="text-left p-3 pl-5 font-semibold">Lote</th>
                                <th className="text-left p-3 font-semibold">Sublote</th>
                                <th className="text-right p-3 font-semibold">Cantidad</th>
                                <th className="text-right p-3 font-semibold">Prom.</th>
                                <th className="text-right p-3 font-semibold">Peso (kg)</th>
                                <th className="text-right p-3 font-semibold">Precio Unit.</th>
                                <th className="text-right p-3 pr-5 font-semibold">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categorias.filter((c) => c.key !== 'finca').map((cat) => {
                                const col = acumCategoria(cat.color);
                                return (
                                  <React.Fragment key={cat.key}>
                                    {/* Encabezado de grupo */}
                                    <tr className="bg-muted/40 border-b border-border">
                                      <td colSpan={7} className={`px-5 py-1.5 text-xs font-bold uppercase tracking-wide ${col.header}`}>
                                        {cat.titulo}
                                      </td>
                                    </tr>
                                    {cat.filas.map((f, idx) => (
                                      <tr
                                        key={`${cat.key}-${idx}`}
                                        className={`border-b border-border/40 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                                      >
                                        <td className="p-3 pl-5 font-semibold">{f.lote}</td>
                                        <td className="p-3 text-muted-foreground">{f.sublote}</td>
                                        <td className="p-3 text-right font-semibold">
                                          {f.cantidad.toLocaleString('es-CO')}
                                          <span className="text-xs text-muted-foreground ml-1">{f.unidad}</span>
                                        </td>
                                        <td className="p-3 text-right text-muted-foreground">
                                          {f.promedio_kg != null && f.promedio_kg > 0
                                            ? f.promedio_kg.toFixed(1)
                                            : '—'}
                                        </td>
                                        <td className="p-3 text-right font-semibold">
                                          {f.peso_kg != null && f.peso_kg > 0
                                            ? f.peso_kg.toLocaleString('es-CO')
                                            : '—'}
                                        </td>
                                        <td className="p-3 text-right text-muted-foreground">
                                          ${f.precio.toLocaleString('es-CO')}
                                          <span className="text-xs ml-1">{f.precio_unidad}</span>
                                        </td>
                                        <td className={`p-3 pr-5 text-right font-bold ${col.total}`}>
                                          ${f.total.toLocaleString('es-CO')}
                                        </td>
                                      </tr>
                                    ))}
                                    {/* Subtotal por grupo */}
                                    <tr className="border-b border-border bg-muted/10">
                                      <td colSpan={6} className="p-2 pl-5 text-right text-xs text-muted-foreground">
                                        Subtotal {cat.titulo.charAt(0) + cat.titulo.slice(1).toLowerCase()}
                                      </td>
                                      <td className={`p-2 pr-5 text-right text-sm font-bold ${col.total}`}>
                                        ${cat.subtotal.toLocaleString('es-CO')}
                                      </td>
                                    </tr>
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tabla aparte para labores de FINCA — mismo estilo
                          visual que V.16 pero con columnas propias porque
                          finca no tiene lote/sublote/promedio/peso. */}
                      {categorias.filter((c) => c.key === 'finca').map((cat) => {
                        const col = acumCategoria(cat.color);
                        return (
                          <div key={cat.key} className="overflow-x-auto border-t border-border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                                  <th className={`text-left p-3 pl-5 font-bold uppercase tracking-wide ${col.header}`}>
                                    Trabajos de finca
                                  </th>
                                  <th className="text-right p-3 font-semibold">Precio Unit.</th>
                                  <th className="text-right p-3 pr-5 font-semibold">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cat.filas.map((f, idx) => (
                                  <tr
                                    key={`finca-${idx}`}
                                    className={`border-b border-border/40 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                                  >
                                    <td className="p-3 pl-5 font-semibold">
                                      {f.lote !== '—' ? f.lote : 'Trabajo de finca'}
                                    </td>
                                    <td className="p-3 text-right text-muted-foreground">
                                      ${f.precio.toLocaleString('es-CO')}
                                    </td>
                                    <td className={`p-3 pr-5 text-right font-bold ${col.total}`}>
                                      ${f.total.toLocaleString('es-CO')}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="border-b border-border bg-muted/10">
                                  <td colSpan={2} className="p-2 pl-5 text-right text-xs text-muted-foreground">
                                    Subtotal Finca
                                  </td>
                                  <td className={`p-2 pr-5 text-right text-sm font-bold ${col.total}`}>
                                    ${cat.subtotal.toLocaleString('es-CO')}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })}

                      {/* Total orden de pago — al final después de ambas
                          tablas (campo + finca). Estilo tfoot de V.16. */}
                      <div className="border-t-2 border-primary/20 bg-muted/20 flex items-center justify-between px-5 py-3">
                        <p className="text-sm font-bold text-primary uppercase tracking-wide">
                          Total orden de pago a {grupo.tercero_nombre}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          ${total.toLocaleString('es-CO')}
                        </p>
                      </div>
                    </>
                  )}
                </Card>
              );
            })
          )}

          {/* Total general terceros — igual que V.16, card amber flotante
              al final del listado. */}
          {tercerosAgrupados.length > 0 && (
            <div className="flex justify-end">
              <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/20 px-6 py-3 flex items-center gap-6">
                <p className="text-sm text-muted-foreground">
                  Total a transferir a empresas terceras
                </p>
                <p className="text-2xl font-bold text-amber-700">
                  ${tercerosAgrupados
                    .reduce((s, g) => {
                      const cats = consolidarPorTercero(g.operarios);
                      const est = cats.reduce((a, c) => a + c.subtotal, 0);
                      const actaTot = toNumber(g.acta?.total_a_transferir);
                      return s + (actaTot > 0 ? actaTot : est);
                    }, 0)
                    .toLocaleString('es-CO')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB COLABORADORES ── */}
      {tabActivo === 'colaboradores' && (
        <div className="space-y-4">
          <div>
            <h2 className="mb-2">
              {esBorrador ? 'Liquidación de Colaboradores' : 'Detalle por Colaborador'}
            </h2>
            <p className="text-muted-foreground">
              {esBorrador
                ? `${totalColabs} colaboradores - ${liquidados} liquidados, ${pendientesInternos} pendientes`
                : `${empleadosMostrar.length} colaboradores liquidados en este período`}
            </p>
          </div>

          <Card className="border-border">
            <CardContent className="p-0">
              {empleadosMostrar.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {esBorrador
                    ? 'No hay empleados en esta nómina. Edita la nómina para agregar.'
                    : 'No hay empleados liquidados.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Colaborador</th>
                        <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Tipo</th>
                        <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Salario Base</th>
                        {!esBorrador && (
                          <>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Jornales</th>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Cosechas</th>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Devengado</th>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Deducciones</th>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Neto</th>
                          </>
                        )}
                        {esBorrador && (
                          <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                        )}
                        <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...empleadosMostrar].sort((a, b) => {
                        // Orden alfabetico por primer nombre. Cada fila puede
                        // ser empleado interno u operario de tercero (XOR).
                        const pA = a.operario ?? a.empleado ?? {};
                        const pB = b.operario ?? b.empleado ?? {};
                        return comparePersonaByFirstName(pA, pB);
                      }).map((emp, index) => {
                        const liquidado = emp.estado === 'LIQUIDADO';
                        // XOR empleado_id vs operario_id: cada fila es uno u otro.
                        const esOperario = emp.operario_id != null;
                        const nombre = esOperario
                          ? (emp.operario?.nombre_completo?.trim()
                              || `Operario #${emp.operario_id}`)
                          : (emp.empleado?.nombre_completo?.trim()
                              || `${emp.empleado?.primer_nombre ?? ''} ${emp.empleado?.primer_apellido ?? ''}`.trim()
                              || `Empleado #${emp.empleado_id}`);
                        const cargo = esOperario
                          ? emp.operario?.cargo
                          : emp.empleado?.cargo;
                        const terceroNombre = esOperario
                          ? emp.operario?.tercero?.razon_social
                          : null;
                        const jornales = toNumber((emp as any).total_jornales);
                        const cosechas = toNumber((emp as any).total_cosechas);
                        return (
                          <tr
                            key={emp.id}
                            className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                              index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                            }`}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                                  esOperario
                                    ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                }`}>
                                  <span className="text-sm font-bold">{getIniciales(nombre)}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-sm">{nombre}</span>
                                  {cargo && (
                                    <p className="text-xs text-muted-foreground">{cargo}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              {esOperario ? (
                                <Badge className="text-xs bg-amber-500/10 text-amber-700 border-amber-300">
                                  {terceroNombre ?? 'Tercero'}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  {emp.salario_tipo ?? '—'}
                                </Badge>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {/* Prioridad: LIQUIDADO usa total_devengado
                                  congelado. Si el usuario abrió el editor de
                                  este colaborador durante la sesión, mostramos
                                  el valor real cacheado. En cualquier otro
                                  caso mostramos el snapshot proyectado (rápido,
                                  sin request). Al abrir el editor y volver, la
                                  fila se actualiza sola con el valor real. */}
                              {(() => {
                                // Muestra siempre el TOTAL NETO real que cobra
                                // el colaborador (mismo valor que "Total Neto"
                                // del editor). Se calcula automáticamente al
                                // abrir el detalle vía previews en batches de 6.
                                if (emp.estado === 'LIQUIDADO') {
                                  return (
                                    <span className="text-sm font-medium">
                                      ${toNumber(emp.total_neto).toLocaleString('es-CO')}
                                    </span>
                                  );
                                }
                                const enCache = previewsPorEmpleado.get(emp.id);
                                if (enCache != null) {
                                  return (
                                    <span
                                      className="text-sm font-medium"
                                      title="Neto real que va a cobrar"
                                    >
                                      ${enCache.toLocaleString('es-CO')}
                                    </span>
                                  );
                                }
                                // Aún no llegó su preview — skeleton mientras
                                // carga (no mostramos snapshot para no confundir).
                                return (
                                  <span
                                    className="inline-block h-4 w-24 rounded bg-muted animate-pulse"
                                    title="Calculando neto real..."
                                  />
                                );
                              })()}
                            </td>
                            {!esBorrador && (
                              <>
                                <td className="p-4 text-right">
                                  <span className="text-sm font-medium">${jornales.toLocaleString('es-CO')}</span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-sm font-medium">${cosechas.toLocaleString('es-CO')}</span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-sm font-semibold text-success">
                                    ${toNumber(emp.total_devengado).toLocaleString('es-CO')}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-sm font-medium text-destructive">
                                    ${toNumber(emp.total_deducciones).toLocaleString('es-CO')}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-sm font-bold text-primary">
                                    ${toNumber(emp.total_neto).toLocaleString('es-CO')}
                                  </span>
                                </td>
                              </>
                            )}
                            {esBorrador && (
                              <td className="p-4 text-center">
                                <Badge
                                  className={`text-xs ${
                                    liquidado
                                      ? 'bg-success/10 text-success border-success/20'
                                      : 'bg-amber-500/10 text-amber-600 border-amber-200'
                                  }`}
                                >
                                  {emp.estado}
                                </Badge>
                              </td>
                            )}
                            <td className="p-4">
                              <div className="flex gap-2 justify-end">
                                {esBorrador && !liquidado && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => navigate(`/nomina/${nominaId}/liquidar/${emp.id}`)}
                                      className="gap-1 bg-primary hover:bg-primary/90"
                                      title="Liquidar"
                                    >
                                      <Calculator className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEmpleadoAQuitar(emp)}
                                      className="text-destructive hover:bg-destructive/10"
                                      title="Quitar de la nómina"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {liquidado && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate(`/nomina/${nominaId}/ver/${emp.id}`)}
                                      className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                                      title="Ver liquidación"
                                    >
                                      {esBorrador ? <Eye className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                    </Button>
                                    {esBorrador && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => navigate(`/nomina/${nominaId}/liquidar/${emp.id}?reliquidar=1`)}
                                        className="gap-1 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                                        title="Re-liquidar"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmar quitar empleado */}
      <AlertDialog
        open={!!empleadoAQuitar}
        onOpenChange={(o) => !o && setEmpleadoAQuitar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitar empleado de la nómina</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no podrá deshacerse. El empleado dejará de estar en este período.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accionando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={quitarEmpleado}
              disabled={accionando}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {accionando ? 'Quitando...' : 'Quitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar cerrar nómina */}
      <AlertDialog open={confirmarCerrar} onOpenChange={setConfirmarCerrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertaGajosPreCierre
                ? `Cerrar con ${alertaGajosPreCierre.total_gajos_pendientes_enviar} gajos sin despachar`
                : 'Cerrar nómina'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Al cerrar la nómina los valores quedan inmutables. Las ausencias y horas extras del período
              quedarán LIQUIDADAS y no podrán editarse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* §4.4 — Aviso de gajos sin despachar. Es la única forma en que
              la nómina paga de menos. El backend NO bloquea el cierre, pero
              debe requerir confirmación explícita. */}
          {alertaGajosPreCierre && (
            <div className="rounded-lg border-2 border-orange-500/40 bg-orange-50/60 dark:bg-orange-950/20 p-3 my-2">
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                Vas a cerrar con {alertaGajosPreCierre.total_gajos_pendientes_enviar} gajos sin despachar en {alertaGajosPreCierre.cosechas_con_gajos_pendientes} cosecha{alertaGajosPreCierre.cosechas_con_gajos_pendientes !== 1 ? 's' : ''}.
              </p>
              <p className="text-xs text-orange-800/80 dark:text-orange-200/80 mt-1">
                Esos gajos quedarán fuera de la liquidación de forma permanente: la cosecha pertenece a este período por fecha de operación, así que la nómina siguiente no los va a tomar.
              </p>
            </div>
          )}
          {/* §3.6 — Filtramos igual que arriba: solo mostramos los huérfanos
              que caen DENTRO del rango de esta nómina. Los que caen fuera le
              corresponden a otra quincena. */}
          {(() => {
            const inicio = nomina?.fecha_inicio ?? '';
            const fin = nomina?.fecha_fin ?? '';
            const enRango = descansosHuerfanosPreCierre.filter(
              (d) => !!inicio && !!fin && d.fecha >= inicio && d.fecha <= fin,
            );
            if (enRango.length === 0) return null;
            return (
              <div className="rounded-lg border-2 border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 p-3 my-2">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {enRango.length} descanso{enRango.length !== 1 ? 's' : ''} del rango de esta nómina sin cubrir
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-1">
                  Estos días caen en un hueco entre nóminas y no se están pagando en ninguna. Puede ser deliberado.
                </p>
                <ul className="text-xs text-amber-900/90 dark:text-amber-100/90 mt-2 space-y-0.5">
                  {enRango.slice(0, 6).map((d) => (
                    <li key={d.fecha}>
                      <span className="font-mono">{d.fecha}</span> · {d.nombre}
                    </li>
                  ))}
                  {enRango.length > 6 && (
                    <li className="italic">+ {enRango.length - 6} más</li>
                  )}
                </ul>
              </div>
            );
          })()}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accionando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={cerrarNomina}
              disabled={accionando}
              className={alertaGajosPreCierre ? 'bg-orange-600 hover:bg-orange-700' : undefined}
            >
              {accionando
                ? 'Cerrando...'
                : alertaGajosPreCierre
                  ? 'Cerrar de todas formas'
                  : 'Cerrar nómina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminar nómina */}
      <AlertDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar nómina</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la nómina y todos sus colaboradores pendientes. No podrá deshacerse.
              {liquidados > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  No se puede eliminar: hay {liquidados} colaborador(es) ya liquidados.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accionando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarNomina}
              disabled={accionando || liquidados > 0}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {accionando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Editar nómina */}
      <Dialog open={editarOpen} onOpenChange={setEditarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar período de la nómina
            </DialogTitle>
            <DialogDescription>
              Modifica el mes, periodicidad o quincena. Las fechas se recalculan automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-mes">Mes *</Label>
              <Select
                value={editForm.mes}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, mes: v }))}
              >
                <SelectTrigger id="edit-mes">
                  <SelectValue placeholder="Selecciona un mes" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MESES_NOMBRE).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-periodicidad">Periodicidad *</Label>
              <Select
                value={editForm.periodicidad}
                onValueChange={(v) => setEditForm((prev) => ({
                  ...prev,
                  periodicidad: v as Periodicidad,
                  quincena: v === 'MENSUAL' ? '' : prev.quincena,
                }))}
              >
                <SelectTrigger id="edit-periodicidad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                  <SelectItem value="MENSUAL">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.periodicidad === 'QUINCENAL' && (
              <div className="space-y-2">
                <Label htmlFor="edit-quincena">Quincena *</Label>
                <Select
                  value={editForm.quincena}
                  onValueChange={(v) => setEditForm((prev) => ({ ...prev, quincena: v as '1' | '2' }))}
                >
                  <SelectTrigger id="edit-quincena">
                    <SelectValue placeholder="Selecciona quincena" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Primera Quincena (1-15)</SelectItem>
                    <SelectItem value="2">Segunda Quincena (16-fin de mes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-obs">Observación</Label>
              <Input
                id="edit-obs"
                value={editForm.observacion}
                onChange={(e) => setEditForm((prev) => ({ ...prev, observacion: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditarOpen(false)}
              disabled={guardandoEdit}
            >
              Cancelar
            </Button>
            <Button onClick={guardarEdicion} disabled={guardandoEdit} className="gap-2">
              {guardandoEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Liquidar Tercero — reemplazado por pantalla dedicada
          `/nomina/:id/tercero/:terceroId/liquidar`. El modal se dejó como
          fallback opcional detrás de un flag inaccesible. */}
      {false && modalLiquidarTerceroId != null && (() => {
        const grupo = tercerosAgrupados.find(
          (g) => g.tercero_id === modalLiquidarTerceroId,
        );
        if (!grupo) return null;
        const categorias = consolidarPorTercero(grupo.operarios);
        const totalEstimado = categorias.reduce((s, c) => s + c.subtotal, 0);
        const totalActa = toNumber(grupo.acta?.total_a_transferir);
        const totalBruto = totalActa > 0 ? totalActa : totalEstimado;
        const totalDescuentos = descuentosTercero.reduce(
          (s, d) => s + (Number(d.valor) || 0),
          0,
        );
        const totalNeto = totalBruto - totalDescuentos;
        return (
          <Dialog open onOpenChange={() => setModalLiquidarTerceroId(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Liquidar — {grupo.tercero_nombre}
                </DialogTitle>
                <DialogDescription>
                  Agrega descuentos si aplica. Al confirmar, el acta queda pagada.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/20 p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Total bruto</span>
                  <span className="font-semibold">${totalBruto.toLocaleString('es-CO')}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Descuentos</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={agregarDescuentoTercero}
                      className="h-7 gap-1"
                    >
                      <span className="text-base leading-none">+</span>
                      Agregar
                    </Button>
                  </div>
                  {descuentosTercero.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-md">
                      Sin descuentos.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {descuentosTercero.map((d, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-6">
                            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Concepto
                            </Label>
                            <Input
                              value={d.concepto}
                              onChange={(e) => actualizarDescuentoTercero(i, 'concepto', e.target.value)}
                              placeholder="Ej: Herramienta extraviada"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-5">
                            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Valor
                            </Label>
                            <Input
                              type="number" step="0.001"
                              value={d.valor || ''}
                              onChange={(e) => actualizarDescuentoTercero(i, 'valor', Number(e.target.value))}
                              className="h-8 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => quitarDescuentoTercero(i)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
                  {totalDescuentos > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total descuentos</span>
                      <span className="font-semibold text-destructive">
                        -${totalDescuentos.toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-primary/20 pt-2">
                    <span className="font-bold">Total a pagar</span>
                    <span className="font-bold text-xl text-primary">
                      ${totalNeto.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setModalLiquidarTerceroId(null)}
                  disabled={liquidandoTercero}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarLiquidarTercero}
                  disabled={liquidandoTercero}
                  className="bg-primary hover:bg-primary/90 gap-2"
                >
                  {liquidandoTercero
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Check className="h-4 w-4" />}
                  Confirmar liquidación
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Registrar Pago Tercero */}
      {modalPagoTerceroId && terceroSeleccionadoPago && (
        <Dialog open onOpenChange={() => setModalPagoTerceroId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Registrar Pago — {detallePagoSeleccionado?.tercero.nombre ?? terceroSeleccionadoPago.tercero_nombre}
              </DialogTitle>
              <DialogDescription>
                Confirma que se realizó la transferencia a la empresa
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Empresa</span>
                  <span className="font-medium">
                    {detallePagoSeleccionado?.tercero.nombre ?? terceroSeleccionadoPago.tercero_nombre}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NIT</span>
                  <span>
                    {detallePagoSeleccionado?.tercero.nit
                      ?? detallePagoSeleccionado?.tercero.cedula
                      ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operarios</span>
                  <span>{detallePagoSeleccionado?.operarios.length ?? 0} personas</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-semibold">Total a transferir</span>
                  <span className="font-bold text-lg text-primary">
                    ${toNumber(terceroSeleccionadoPago.total_a_transferir).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select
                  value={pagandoForm.metodo_pago}
                  onValueChange={(v) =>
                    setPagandoForm((prev) => ({ ...prev, metodo_pago: v as MetodoPagoTercero }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFERENCIA">Transferencia bancaria</SelectItem>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {pagandoForm.metodo_pago === 'TRANSFERENCIA' && (
                <div className="space-y-2">
                  <Label>Referencia / N° de transferencia *</Label>
                  <Input
                    value={pagandoForm.referencia_pago}
                    onChange={(e) =>
                      setPagandoForm((prev) => ({ ...prev, referencia_pago: e.target.value }))
                    }
                    placeholder="Ej: TRF-2026-001"
                  />
                  {detallePagoSeleccionado && !datosBancariosCompletos && (
                    <p className="text-xs text-destructive">
                      Falta configurar los datos bancarios del tercero.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>N° orden de pago (opcional)</Label>
                <Input
                  value={pagandoForm.orden_pago_numero}
                  onChange={(e) =>
                    setPagandoForm((prev) => ({ ...prev, orden_pago_numero: e.target.value }))
                  }
                  placeholder="Ej: OP-2026-001"
                />
              </div>

              <div className="space-y-2">
                <Label>Observación (opcional)</Label>
                <Input
                  value={pagandoForm.observacion}
                  onChange={(e) =>
                    setPagandoForm((prev) => ({ ...prev, observacion: e.target.value }))
                  }
                  placeholder="Notas internas..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setModalPagoTerceroId(null)}
                disabled={registrandoPago}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarPago}
                disabled={
                  registrandoPago
                  || (pagandoForm.metodo_pago === 'TRANSFERENCIA' && !pagandoForm.referencia_pago)
                }
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                {registrandoPago ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmar Pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
