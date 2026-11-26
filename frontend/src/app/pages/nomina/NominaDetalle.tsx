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
import { periodoLabel } from '../../utils/periodoNomina';
import { useParams, useNavigate } from 'react-router';
import { comparePersonaByFirstName } from '../../utils/personas';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import Avatar from '../../components/common/Avatar';
import StatStrip from '../../components/common/StatStrip';
import { Card } from '../../components/ui/card';
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
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import {
  Calculator,
  FileText, Eye, Loader2, Trash2, Download, Check,
  Lock, Pencil, Printer, AlertCircle,
  Banknote, MinusCircle, Wallet, UserCheck, Building2, Send, CircleCheck,
} from 'lucide-react';
import { AdvertenciasBanner } from '../../components/nomina/AdvertenciasBanner';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import { BloqueosCierre } from '../../components/nomina/BloqueosCierre';
import {
  nominaApi, Nomina, NominaEmpleado, NominaTercero, Periodicidad,
  NominaErrorCodes, NominaTerceroActaDetalle, MetodoPagoTercero,
  DetalleLaboresOperario,
  type BloqueoCierre,
  type VacacionTrabajadaEnNomina,
} from '../../../api/nomina';
import { InterrumpirVacacionDialog } from '../../components/vacaciones/InterrumpirVacacionDialog';
import { mensajeDeError } from '../../../api/errores';
// `operacionesApi` y `PlanillaDetalle` se removieron tras el refactor a
// endpoints dedicados de nómina (§7.4). El listado de terceros ya no
// consulta el módulo de planillas para armar el desglose.
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';
import { Eyebrow, SegmentedTabs, thead, th, td } from '../../components/nomina/piezas';

const MESES_NOMBRE: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

/**
 * Pesos con separador de miles y SIEMPRE dos decimales. Sin el minimo la
 * columna mezclaba `$71.557,1` con `$77.213,64` y las cifras no alineaban.
 */
function fmtPesos(v: number): string {
  return `$${v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

/** Formatea YYYY-MM-DD o ISO completo a dd/mm/yyyy. Sin desfase por TZ. */
const fmtFecha = (s: string | null | undefined): string => formatFecha(s, { day: '2-digit', month: '2-digit', year: 'numeric' });

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

/**
 * El contratista al que pertenece un operario.
 *
 * `tercero_id` viene plano en unas respuestas y anidado bajo `operario.tercero`
 * en otras. Leer solo el plano dejaba al operario huérfano: su grupo quedaba
 * sin desglose de labores y el encabezado caía al respaldo "Tercero #8".
 */
function idDeTercero(emp: NominaEmpleado): number | null {
  return emp.tercero_id ?? emp.operario?.tercero?.id ?? null;
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
  /**
   * PR-V2 — El 409 `NOMINA_CON_VACACION_TRABAJADA`: hay jornal en días de
   * una vacación del sistema. Se guarda el cuerpo para pintar a quién afecta
   * y ofrecer interrumpir, corregir la planilla o cerrar forzando.
   */
  const [vacacionTrabajada, setVacacionTrabajada] = useState<BloqueoCierre | null>(null);
  const [motivoForzado, setMotivoForzado] = useState('');
  const [vacacionAInterrumpir, setVacacionAInterrumpir] = useState<VacacionTrabajadaEnNomina | null>(null);

  /*
   * §6.1 — Liquidar la última fila PENDIENTE cierra la nómina sola y ya no
   * se puede reabrir. El aviso va aquí, que es donde se sabe cuántos quedan,
   * y no en la pantalla de liquidación, que tendría que pedir la nómina
   * entera solo para contar.
   */
  const [ultimoPendiente, setUltimoPendiente] = useState<number | null>(null);
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
  /**
   * §3.6 — Lo que hoy impediría cerrar, con el `code` del backend. Se lee
   * junto al resto de la precarga y se muestra en el diálogo: sin esto el
   * usuario pulsa "Cerrar" y recibe un 409 sin saber qué le falta.
   */
  const [bloqueosCierre, setBloqueosCierre] = useState<BloqueoCierre[]>([]);
  /**
   * PR-V2 — Solo `NOMINA_CON_VACACION_TRABAJADA` se puede saltar con motivo;
   * los demás hay que resolverlos antes.
   */
  const bloqueosForzablesCierre = bloqueosCierre.filter((b) => b.forzable);
  const bloqueosDurosCierre = bloqueosCierre.filter((b) => !b.forzable);
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
        if (res.data.estado !== 'CERRADA') {
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
   * Flujo:
   *   1. Por cada tercero en `terceros[]`, y por cada operario del tercero:
   *   2. `GET /nominas/{n}/terceros/{t}/operarios/{op}/detalle` (§7.4) →
   *      { cosecha[], jornales[] } con exactamente las columnas de la tabla.
   *   3. Si alguno responde 404 ACTA_NO_CALCULADA, NO se dispara nada: ver es
   *      solo lectura. El tercero entra a `actasSinCalcular` y la UI muestra
   *      un botón "Calcular acta" — solo con ese clic se llama POST /liquidar
   *      (que además auto-liquida los operarios PENDIENTES del tercero, por
   *      eso no puede ser automático).
   *
   * Resultado: 2-3 peticiones ligeras en vez de 15+ pesadas, y CERO
   * mutaciones sin acción explícita del usuario.
   */
  const detallesTerceroCacheRef = useRef<string | null>(null);
  /** Terceros cuyo detalle respondió ACTA_NO_CALCULADA — pintan CTA. */
  const [actasSinCalcular, setActasSinCalcular] = useState<Set<number>>(new Set());
  const [calculandoActa, setCalculandoActa] = useState<number | null>(null);
  useEffect(() => {
    if (tabActivo !== 'terceros') return;
    if (!nomina || !nominaId) return;
    if (terceros.length === 0) return;

    // Key de caché por (nomina, terceros, operarios). Si nada cambió, no
    // repetimos las peticiones al re-abrir el tab.
    const opsPorTercero = terceros
      .map((t) => {
        const ops = empleados
          .filter((e) => idDeTercero(e) === t.tercero_id && e.operario_id != null)
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
      const sinCalcular = new Set<number>();
      // Helper: pedir todos los detalles de un tercero. Devuelve la lista de
      // exitosos y una bandera de si alguno falló por ACTA_NO_CALCULADA.
      const pedirDetalles = async (terceroId: number, operarioIds: number[]) => {
        const resultados = await Promise.allSettled(
          operarioIds.map((opId) =>
            nominaApi.terceros.detalleOperario(nominaId, terceroId, opId).then((r) => r.data),
          ),
        );
        const okList: DetalleLaboresOperario[] = [];
        let actaNoCalculada = false;
        for (const r of resultados) {
          if (r.status === 'fulfilled') {
            okList.push(r.value);
          } else if ((r.reason as ApiError | undefined)?.code === 'ACTA_NO_CALCULADA') {
            actaNoCalculada = true;
          }
        }
        return { okList, actaNoCalculada };
      };

      await Promise.all(
        terceros.map(async (t) => {
          const operariosDelTercero = empleados
            .filter((e) => idDeTercero(e) === t.tercero_id && e.operario_id != null)
            .map((e) => e.operario_id!);
          if (operariosDelTercero.length === 0) return;

          const { okList, actaNoCalculada } = await pedirDetalles(t.tercero_id, operariosDelTercero);

          // Ver es SOLO LECTURA: si el acta no está calculada, NO se dispara
          // POST /liquidar (ese endpoint auto-liquida operarios PENDIENTES).
          // Se marca el tercero y la UI ofrece el botón "Calcular acta".
          if (actaNoCalculada) sinCalcular.add(t.tercero_id);

          nuevoMapa.set(t.tercero_id, consolidarDesdeDetalles(okList));
        }),
      );
      setDetallesPorTercero(nuevoMapa);
      setActasSinCalcular(sinCalcular);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActivo, nominaId, terceros, empleados]);

  /**
   * Acción EXPLÍCITA del usuario: POST /liquidar del acta del tercero
   * (doc §7.3 — calcula totales; además auto-liquida los operarios
   * PENDIENTES de ese tercero, por eso requiere el clic). Tras calcular,
   * recarga el desglose y las actas.
   */
  const calcularActaTercero = async (terceroId: number) => {
    if (!nominaId) return;
    setCalculandoActa(terceroId);
    try {
      await nominaApi.terceros.liquidar(nominaId, terceroId);
      toast.success('Acta calculada');
      // Invalida el cache del desglose y recarga todo (actas + detalle).
      detallesTerceroCacheRef.current = null;
      setActasSinCalcular((prev) => {
        const nuevo = new Set(prev);
        nuevo.delete(terceroId);
        return nuevo;
      });
      cargar();
      cargarTerceros();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'Error al calcular el acta');
    } finally {
      setCalculandoActa(null);
    }
  };

  /*
   * §10.1 — Tres estados desde el 2026-10-09. Lo que apaga la liquidación es
   * CERRADA, no "distinto de BORRADOR": una nómina EN_PROGRESO tiene filas
   * liquidadas y otras pendientes, y sigue siendo editable fila por fila.
   */
  const abierta = nomina?.estado !== 'CERRADA';
  // Los operarios NO van en la tabla de "Liquidación de Colaboradores" — se
  // gestionan por acta en el tab Terceros. Aquí filtramos solo internos.
  const empleadosInternos = empleados.filter((e) => e.empleado_id != null);
  const empleadosOperarios = empleados.filter((e) => e.operario_id != null);
  const empleadosMostrar = abierta
    ? empleadosInternos
    : empleadosInternos.filter((e) => e.estado === 'LIQUIDADO');

  /**
   * Pie de la tabla. Solo se pinta con la nomina CERRADA, donde cada fila
   * ya tiene sus columnas congeladas; con la nomina abierta las pendientes
   * sumarian ceros y el total enganaria.
   */
  const totalesTabla = empleadosMostrar.reduce(
    (acc, e) => ({
      jornales: acc.jornales + toNumber(e.total_jornales),
      cosechas: acc.cosechas + toNumber(e.total_cosecha),
      devengado: acc.devengado + toNumber(e.total_devengado) + toNumber(e.subsidio_transporte),
      deducciones: acc.deducciones + toNumber(e.total_deducciones),
      neto: acc.neto + toNumber(e.total_neto),
    }),
    { jornales: 0, cosechas: 0, devengado: 0, deducciones: 0, neto: 0 },
  );

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

  const cerrarNomina = async (forzar = false) => {
    if (!nominaId) return;
    if (forzar && motivoForzado.trim().length < 5) {
      toast.error('Escriba el motivo para cerrar de todas formas');
      return;
    }
    setAccionando(true);
    try {
      const res = await nominaApi.cerrar(
        nominaId,
        forzar ? { forzar: true, motivo_forzado: motivoForzado.trim() } : undefined,
      );
      toast.success(res.message ?? 'Nómina cerrada');
      // PR-V2 — Lo forzado queda en la auditoría; decirlo también acá.
      if (res.forzado) {
        toast.warning('Se cerró forzando un bloqueo', {
          duration: 10000,
          description: res.forzado.motivo,
        });
      }
      setVacacionTrabajada(null);
      setMotivoForzado('');
      // §4.4 — advertencia post-cierre si había cosechas con gajos sin
      // despachar. Cierre irreversible: aviso importante.
      if (res.advertencia?.code === 'COSECHA_GAJOS_SIN_DESPACHAR') {
        toast.warning(res.advertencia.texto, { duration: 10000 });
      }
      /*
       * PR-L15 — El cierre acaba de pagar tramos de vacaciones `NOMINA`. Hay
       * que decirlo aquí: el usuario cerró una nómina y además movió plata en
       * Liquidaciones, y las que quedan con saldo necesitan otra nómina o un
       * giro manual. El cierre es irreversible, así que el aviso se queda.
       */
      const pagadas = res.data.vacaciones_pagadas ?? [];
      if (pagadas.length > 0) {
        const totalPagado = pagadas.reduce((acumulado, v) => acumulado + v.pagado_aqui, 0);
        const conSaldo = pagadas.filter((v) => v.pendiente > 0);
        toast.success(
          `Se pagaron ${pagadas.length} vacacion${pagadas.length !== 1 ? 'es' : ''} `
          + `por $${totalPagado.toLocaleString('es-CO')}`,
          {
            duration: 10000,
            description: conSaldo.length > 0
              ? `${conSaldo.length} queda${conSaldo.length !== 1 ? 'n' : ''} con saldo: `
                + conSaldo.map((v) => v.numero_comprobante).join(', ')
              : 'Ninguna quedó con saldo pendiente',
          },
        );
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
        toast.error('Hay terceros sin liquidar. Calcula sus actas en "Liquidar terceros"');
      } else if (e.code === NominaErrorCodes.NOMINA_CON_NOVEDADES_PENDIENTES) {
        // PR-N8 — La novedad se registró después de liquidar la fila, así que
        // esa liquidación quedó vieja: no basta con aprobarla, hay que volver
        // a liquidar a esa gente.
        toast.error('Hay novedades sin aprobar que cruzan el período', {
          duration: 12000,
          description: e.message
            ?? 'Apruebe o rechace las novedades en Novedades y vuelva a liquidar a esos colaboradores.',
        });
      } else if (e.code === NominaErrorCodes.NOMINA_CON_VACACION_TRABAJADA) {
        /*
         * PR-V2 — Hay jornal o cosecha en días de una vacación del sistema:
         * o el colaborador volvió antes y hay que interrumpirla (CST art.
         * 188), o la planilla está mal. Hay que resolverlo **antes** de
         * cerrar: después, los días devueltos quedan en una nómina inmutable
         * y la interrupción ya no es posible.
         */
        const cuerpo = e as unknown as Pick<BloqueoCierre, 'colaboradores' | 'forzable'>;
        setConfirmarCerrar(false);
        setMotivoForzado('');
        setVacacionTrabajada({
          code: NominaErrorCodes.NOMINA_CON_VACACION_TRABAJADA,
          message: e.message ?? 'Hay trabajo registrado en días de vacaciones',
          colaboradores: cuerpo.colaboradores,
          forzable: cuerpo.forzable ?? true,
        });
      } else if (e.code === NominaErrorCodes.VACACIONES_DESACTUALIZADAS_EN_NOMINA) {
        // PR-L15 — Alguna fila liquidó un tramo que ya no coincide con la
        // vacación viva. Re-liquidar esas filas y volver a cerrar.
        toast.error('Hay vacaciones que cambiaron después de liquidar', {
          duration: 10000,
          description: e.message
            ?? 'Vuelve a liquidar los colaboradores con vacaciones y cierra de nuevo.',
        });
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
   * Comprobante del contratista. Lo arma el backend (§7.8); aquí solo se
   * baja el blob. Antes el front dibujaba su propio PDF con jsPDF y quedaban
   * dos documentos distintos para lo mismo.
   */
  const [generandoActa, setGenerandoActa] = useState<number | null>(null);
  const generarComprobanteTercero = async (terceroId: number, nombre: string) => {
    if (!nominaId || !nomina) return;
    setGenerandoActa(terceroId);
    try {
      const blob = await nominaApi.terceros.actaPdf(nominaId, terceroId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const q = nomina.quincena ? `_Q${nomina.quincena}` : '';
      const mes = String(nomina.mes).padStart(2, '0');
      a.download = `acta_${nombre.replace(/\s+/g, '_')}_${nomina.anio}_${mes}${q}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo generar el comprobante'));
    } finally {
      setGenerandoActa(null);
    }
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
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando nómina...
      </Card>
    );
  }

  if (!nomina || !nominaId) {
    return (
      <div className="space-y-6">
        <PageHeader
          backTo="/nomina"
          title="Período no encontrado"
          description="El período que buscas no existe o fue eliminado."
        />
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
      const tid = idDeTercero(emp);
      if (!tid) return;
      if (!map.has(tid)) {
        const acta = terceros.find((t) => t.tercero_id === tid);
        // El nombre llega por dos vías y no siempre por la misma. El acta es
        // la fuente que sí lo trae siempre; el `#id` queda de último recurso.
        map.set(tid, {
          tercero_id: tid,
          tercero_nombre:
            emp.operario?.tercero?.razon_social
            ?? acta?.tercero_nombre
            ?? `Tercero #${tid}`,
          operarios: [],
          acta,
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
   * (§7.4). Recibe el id del contratista directo: inferirlo del primer
   * operario fallaba cuando ese operario traía el tercero anidado.
   *
   * El código antiguo que hacía el consolidado desde `planillasPeriodo` fue
   * removido — el backend ya devuelve los totales por lote/labor. Ver el
   * refactor de rendimiento (N+1 → 2-3 requests) más arriba en el useEffect.
   */
  const consolidarPorTercero = (terceroId: number): CategoriaLabor[] =>
    detallesPorTercero.get(terceroId) ?? [];
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
  //  Poda / Plateo → el verde de success
  //  Fertilización → blue-600
  //  Abonada       → purple-600
  //  Sanidad       → rose-600
  //  Finca / Otros → zinc-700

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
      <PageHeader
        backTo="/nomina"
        eyebrow={`Pagos · ${nomina.mes}/${nomina.anio}${nomina.quincena ? ` · Quincena ${nomina.quincena}` : ''}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {periodoLabel(nomina)}
            <StatusBadge status={nomina.estado as any} />
          </span>
        }
        actions={
          <>
            <Button variant="outline">
              <Download strokeWidth={2} />
              Exportar
            </Button>
            {/* §6.1 — La nómina se cierra sola al liquidar la última fila.
                Este botón es la salida cuando el automático se bloqueó y el
                bloqueo ya se resolvió por otra vía (p. ej. la validación de
                cosecha se confirmó después). */}
            {abierta && (() => {
              const puedeCerrar = totalColabs > 0 && liquidados === totalColabs;
              return (
                <Button
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
                        setBloqueosCierre(checkRes.value.data.bloqueos_cierre ?? []);
                      } else {
                        setDescansosHuerfanosPreCierre([]);
                        setBloqueosCierre([]);
                      }
                    } catch {
                      setAlertaGajosPreCierre(null);
                      setDescansosHuerfanosPreCierre([]);
                      setBloqueosCierre([]);
                    } finally {
                      setCargandoValidacionPreCierre(false);
                      setConfirmarCerrar(true);
                    }
                  }}
                  disabled={accionando || !puedeCerrar || cargandoValidacionPreCierre}
                  title={!puedeCerrar ? 'Liquida todos los colaboradores antes de cerrar' : undefined}
                >
                  <Lock strokeWidth={2} />
                  {cargandoValidacionPreCierre ? 'Verificando…' : 'Cerrar nómina'}
                </Button>
              );
            })()}
          </>
        }
      />

      {/* §9.9 — Advertencias del snapshot del calendario (200 con aviso). No bloquean
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
          <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
            <div className="min-w-0 flex-1 text-sm text-foreground">
              <p className="font-medium">
                {enRango.length} día{enRango.length !== 1 ? 's' : ''} de descanso dentro del rango de esta nómina sin cubrir
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Con cortes personalizados hay días de descanso que caen en el hueco entre dos nóminas y no se están pagando en ninguna. Puede ser deliberado.
              </p>
              <p className="mt-1 tabular-nums">
                {enRango.slice(0, 6).map((d) => `${d.fecha} · ${d.nombre}`).join('; ')}
                {enRango.length > 6 && `; y ${enRango.length - 6} más`}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Selector de vista. El del diseño: una barrita, no dos cajones. */}
      <SegmentedTabs
        value={tabActivo}
        onChange={setTabActivo}
        options={[
          { value: 'colaboradores', label: 'Colaboradores internos', count: totalColabs },
          { value: 'terceros', label: 'Terceros', count: tercerosAgrupados.length },
        ]}
      />

      {/* Indicadores del tab activo */}
      {tabActivo === 'colaboradores' ? (
        <StatStrip
          items={[
            {
              label: 'Total devengado',
              value: `$${totalDevengado.toLocaleString('es-CO')}`,
              note: 'Lo que ganaron en el período',
              icon: Banknote,
              tone: 'green',
            },
            {
              label: 'Deducciones',
              value: `$${totalDeducciones.toLocaleString('es-CO')}`,
              note: 'Salud, pensión y otros',
              icon: MinusCircle,
              tone: 'neutral',
            },
            {
              label: 'Neto a pagar',
              value: `$${totalNeto.toLocaleString('es-CO')}`,
              note: 'Lo que recibe cada colaborador',
              icon: Wallet,
              tone: 'green',
            },
            {
              label: 'Avance de liquidación',
              value: liquidados,
              unit: `de ${totalColabs}`,
              note: 'Colaboradores liquidados',
              icon: UserCheck,
              tone: 'amber',
            },
          ]}
        />
      ) : (
        <StatStrip
          items={[
            {
              label: 'Total a transferir',
              value: `$${totalServiciosTerceros.toLocaleString('es-CO')}`,
              note: 'A empresas contratistas',
              icon: Send,
              tone: 'green',
            },
            {
              label: 'Empresas contratistas',
              value: tercerosAgrupados.length,
              note: `${totalOperarios} operario${totalOperarios !== 1 ? 's' : ''} en campo`,
              icon: Building2,
              tone: 'blue',
            },
            {
              label: 'Avance de pago',
              value: empresasPagadas,
              unit: `de ${tercerosAgrupados.length}`,
              note: 'Empresas pagadas',
              icon: CircleCheck,
              tone: 'amber',
            },
          ]}
        />
      )}

      {/* ── TAB TERCEROS ── */}
      {tabActivo === 'terceros' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2>Órdenes de pago a terceros</h2>
              <p className="text-sm text-muted-foreground">Labores registradas por empresa contratista</p>
            </div>
            {/* Sin "Liquidar terceros": se quitó a propósito (d2c80cc). */}
          </div>

          {cargandoTerceros ? (
            <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando terceros...
            </Card>
          ) : tercerosAgrupados.length === 0 ? (
            <Card className="items-center py-12 text-center">
              <div className="max-w-md space-y-1 px-6">
                <h3 className="text-base font-semibold text-foreground">No hay terceros en este período</h3>
                <p className="text-sm text-muted-foreground">
                  {abierta
                    ? 'Agrega operarios de empresas contratistas en el wizard de nómina para verlos aquí.'
                    : 'No se liquidaron empresas contratistas en este período.'}
                </p>
              </div>
            </Card>
          ) : (
            tercerosAgrupados.map((grupo) => {
              const acta = grupo.acta;
              const detalle = detallesTerceros.get(grupo.tercero_id);
              const pagado = acta?.estado_pago === 'PAGADO';
              // La fila del acta existe desde que se agregan los operarios,
              // así que su presencia no dice nada: lo que cuenta es si pasó
              // por `POST /liquidar` (doc §7.1).
              const calculada = acta?.calculada === true;
              const nit = detalle?.tercero.nit ?? detalle?.tercero.cedula ?? null;
              const representante = detalle?.tercero.representante ?? null;
              const categorias = consolidarPorTercero(grupo.tercero_id);
              // El desglose se calcula en vivo desde las planillas (§7.4) y no
              // es el acta. Sirve de referencia antes de liquidar, rotulado
              // como estimado; el total que se paga sale siempre del acta.
              const totalEstimado = categorias.reduce((s, c) => s + c.subtotal, 0);
              const total = toNumber(acta?.total_a_transferir);
              return (
                <Card key={grupo.tercero_id} className="gap-0 overflow-hidden">
                  {/* Cabecera de la empresa */}
                  <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
                        {grupo.tercero_nombre.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words">{grupo.tercero_nombre}</h3>
                          <Badge variant={pagado ? 'success' : 'warning'}>
                            {pagado ? 'Pagado' : 'Pendiente'}
                          </Badge>
                        </div>
                        <p className="break-words text-xs text-muted-foreground">
                          {nit && <>NIT {nit}</>}
                          {nit && representante && ' · '}
                          {representante}
                          {!nit && !representante && `${grupo.operarios.length} operario(s)`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4 md:justify-end">
                      <div className="text-left md:text-right">
                        <Eyebrow>Total a pagar</Eyebrow>
                        <p className="text-lg font-semibold tabular-nums text-foreground">
                          ${(calculada ? total : totalEstimado).toLocaleString('es-CO')}
                        </p>
                      </div>
                      {!pagado && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(
                            `/nomina/${nominaId}/tercero/${grupo.tercero_id}/liquidar`,
                            { state: { totalEstimado, categorias } },
                          )}
                        >
                          {calculada ? <FileText strokeWidth={2} /> : <Calculator strokeWidth={2} />}
                          {calculada ? 'Ver acta' : 'Liquidar'}
                        </Button>
                      )}
                      {/* El comprobante sale del acta: sin liquidar no hay
                          nada que imprimir y el backend responde 409. */}
                      {calculada && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={generandoActa === grupo.tercero_id}
                          onClick={() =>
                            generarComprobanteTercero(grupo.tercero_id, grupo.tercero_nombre)
                          }
                        >
                          <Printer strokeWidth={2} />
                          {generandoActa === grupo.tercero_id
                            ? 'Generando...'
                            : 'Generar comprobante'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tabla de labores agrupadas — mismo layout que V.16.
                      FINCA sale en su propia tabla debajo porque no tiene
                      lote/sublote/promedio/peso. El "Total orden de pago" va
                      al final después de ambas tablas. */}
                  {categorias.length === 0 ? (
                    actasSinCalcular.has(grupo.tercero_id) ? (
                      /* §7.3 — El acta no está calculada y VER no debe mutar
                         nada (el POST /liquidar auto-liquida operarios
                         PENDIENTES). El cálculo solo corre con este clic. */
                      <div className="flex flex-col items-center gap-3 border-t border-border px-6 py-10 text-center">
                        <p className="max-w-md text-sm text-muted-foreground">
                          El acta de este contratista aún no está calculada. Para ver el
                          desglose por labor hay que calcularla. Esto también liquida a
                          sus operarios pendientes con los valores del período.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => calcularActaTercero(grupo.tercero_id)}
                          disabled={calculandoActa === grupo.tercero_id}
                        >
                          {calculandoActa === grupo.tercero_id
                            ? <Loader2 className="animate-spin" />
                            : <Calculator strokeWidth={2} />}
                          {calculandoActa === grupo.tercero_id
                            ? 'Calculando...'
                            : 'Calcular acta'}
                        </Button>
                      </div>
                    ) : (
                      <div className="border-t border-border px-6 py-10 text-center text-sm text-muted-foreground">
                        {detallesPorTercero.size === 0
                          ? 'Cargando desglose por labor...'
                          : 'Sin registros de campo en el período para los operarios de esta empresa.'}
                      </div>
                    )
                  ) : (
                    <div className="overflow-x-auto border-t border-border">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead className={thead}>
                          <tr>
                            <th className={`${th} pl-5 text-left`}>Lote</th>
                            <th className={`${th} text-left`}>Sublote</th>
                            <th className={`${th} text-right`}>Cantidad</th>
                            <th className={`${th} text-right`}>Prom.</th>
                            <th className={`${th} text-right`}>Peso (kg)</th>
                            <th className={`${th} text-right`}>Precio unit.</th>
                            <th className={`${th} pr-5 text-right`}>Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {categorias.filter((c) => c.key !== 'finca').map((cat) => (
                            <React.Fragment key={cat.key}>
                              <tr className="bg-muted/30">
                                <td colSpan={7} className="px-5 py-1.5 text-[13px] font-medium text-muted-foreground">
                                  {cat.titulo.charAt(0) + cat.titulo.slice(1).toLowerCase()}
                                </td>
                              </tr>
                              {cat.filas.map((f, idx) => (
                                <tr key={`${cat.key}-${idx}`}>
                                  <td className={`${td} pl-5 font-medium text-foreground`}>{f.lote}</td>
                                  <td className={`${td} text-muted-foreground`}>{f.sublote}</td>
                                  <td className={`${td} text-right tabular-nums`}>
                                    {f.cantidad.toLocaleString('es-CO')}
                                    <span className="ml-1 text-xs text-muted-foreground">{f.unidad}</span>
                                  </td>
                                  <td className={`${td} text-right tabular-nums text-muted-foreground`}>
                                    {f.promedio_kg != null && f.promedio_kg > 0
                                      ? f.promedio_kg.toFixed(4)
                                      : '—'}
                                  </td>
                                  <td className={`${td} text-right tabular-nums`}>
                                    {f.peso_kg != null && f.peso_kg > 0
                                      ? f.peso_kg.toLocaleString('es-CO')
                                      : '—'}
                                  </td>
                                  <td className={`${td} text-right tabular-nums text-muted-foreground`}>
                                    ${f.precio.toLocaleString('es-CO')}
                                    <span className="ml-1 text-xs">{f.precio_unidad}</span>
                                  </td>
                                  <td className={`${td} pr-5 text-right tabular-nums text-foreground`}>
                                    ${f.total.toLocaleString('es-CO')}
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td colSpan={6} className="px-5 py-2 text-right text-xs text-muted-foreground">
                                  Subtotal {cat.titulo.toLowerCase()}
                                </td>
                                <td className="px-4 py-2 pr-5 text-right font-semibold tabular-nums text-foreground">
                                  ${cat.subtotal.toLocaleString('es-CO')}
                                </td>
                              </tr>
                            </React.Fragment>
                          ))}
                          {/* Trabajos de finca: sin lote ni promedio, la
                              descripción ocupa esas columnas. */}
                          {categorias.filter((c) => c.key === 'finca').map((cat) => (
                            <React.Fragment key={cat.key}>
                              <tr className="bg-muted/30">
                                <td colSpan={7} className="px-5 py-1.5 text-[13px] font-medium text-muted-foreground">
                                  Trabajos de finca
                                </td>
                              </tr>
                              {cat.filas.map((f, idx) => (
                                <tr key={`finca-${idx}`}>
                                  <td className={`${td} pl-5 font-medium text-foreground`} colSpan={5}>
                                    {f.lote !== '—' ? f.lote : 'Trabajo de finca'}
                                  </td>
                                  <td className={`${td} text-right tabular-nums text-muted-foreground`}>
                                    ${f.precio.toLocaleString('es-CO')}
                                  </td>
                                  <td className={`${td} pr-5 text-right tabular-nums text-foreground`}>
                                    ${f.total.toLocaleString('es-CO')}
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td colSpan={6} className="px-5 py-2 text-right text-xs text-muted-foreground">
                                  Subtotal finca
                                </td>
                                <td className="px-4 py-2 pr-5 text-right font-semibold tabular-nums text-foreground">
                                  ${cat.subtotal.toLocaleString('es-CO')}
                                </td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border bg-muted/60">
                            <td colSpan={6} className="px-5 py-3 text-right text-sm font-semibold text-foreground">
                              Total orden de pago a {grupo.tercero_nombre}
                            </td>
                            <td className="px-4 py-3 pr-5 text-right text-base font-bold tabular-nums text-foreground">
                              ${total.toLocaleString('es-CO')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })
          )}

          {/* Total general terceros — igual que V.16, card amber flotante
              al final del listado. */}
          {tercerosAgrupados.length > 0 && (
            <Card className="flex-row items-center justify-between gap-4 px-5 py-4">
              <p className="text-sm text-muted-foreground">Total a transferir a empresas terceras</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                ${tercerosAgrupados
                  .reduce((s, g) => s + toNumber(g.acta?.total_a_transferir), 0)
                  .toLocaleString('es-CO')}
              </p>
            </Card>
          )}
        </section>
      )}

      {/* ── TAB COLABORADORES ── */}
      {tabActivo === 'colaboradores' && (
        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2>{abierta ? 'Liquidación de colaboradores' : 'Detalle por colaborador'}</h2>
              <p className="text-sm text-muted-foreground">
                {abierta
                  ? `${totalColabs} colaboradores · ${liquidados} liquidados, ${pendientesInternos} pendientes`
                  : `${empleadosMostrar.length} colaboradores liquidados en este período`}
              </p>
            </div>
          </div>

          <Card className="gap-0 overflow-hidden">
              {empleadosMostrar.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  {abierta
                    ? 'No hay empleados en esta nómina. Edita la nómina para agregar.'
                    : 'No hay empleados liquidados.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={thead}>
                      <tr>
                        <th className={`${th} pl-5 text-left`}>Colaborador</th>
                        <th className={`${th} hidden text-left sm:table-cell`}>Tipo</th>
                        <th className={`${th} hidden text-right lg:table-cell`}>Salario base</th>
                        {abierta && (
                          <>
                            <th className={`${th} text-right`} title="Lo que va a cobrar">
                              Neto proyectado
                            </th>
                            <th className={`${th} text-left`}>Estado</th>
                          </>
                        )}
                        {!abierta && (
                          <>
                            <th className={`${th} hidden text-right xl:table-cell`}>Jornales</th>
                            <th className={`${th} hidden text-right xl:table-cell`}>Cosechas</th>
                            <th className={`${th} hidden text-right md:table-cell`} title="Incluye auxilio de transporte">
                              Devengado
                            </th>
                            <th className={`${th} hidden text-right lg:table-cell`}>Deducciones</th>
                            <th className={`${th} text-right`}>Neto</th>
                          </>
                        )}
                        <th className={`${th} pr-5 text-right`}>
                          <span className="sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...empleadosMostrar].sort((a, b) => {
                        // Orden alfabetico por primer nombre. Cada fila puede
                        // ser empleado interno u operario de tercero (XOR).
                        const pA = a.operario ?? a.empleado ?? {};
                        const pB = b.operario ?? b.empleado ?? {};
                        return comparePersonaByFirstName(pA, pB);
                      }).map((emp) => {
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
                        // El campo del backend es `total_cosecha`, en
                        // singular. Con el plural la columna leia undefined y
                        // todas las filas mostraban cero.
                        const jornales = toNumber(emp.total_jornales);
                        const cosechas = toNumber(emp.total_cosecha);
                        // `total_devengado` es salario puro: el auxilio de
                        // transporte no cotiza y el backend lo deja afuera
                        // (API_NOMINA 9.4). La columna lo suma porque es lo
                        // que la persona devenga en el periodo.
                        const auxilio = toNumber(emp.subsidio_transporte);
                        const devengado = toNumber(emp.total_devengado) + auxilio;
                        return (
                          <tr key={emp.id} className="transition-colors hover:bg-muted/40">
                            <td className={`${td} min-w-[14rem] pl-5`}>
                              <div className="flex items-center gap-3">
                                <Avatar nombre={nombre} size="sm" className="hidden sm:inline-flex" />
                                <div className="min-w-0">
                                  <span className="font-semibold text-foreground">{nombre}</span>
                                  {cargo && (
                                    <span className="block text-xs text-muted-foreground">{cargo}</span>
                                  )}
                                  <span className="block text-xs text-muted-foreground sm:hidden">
                                    {esOperario ? (terceroNombre ?? 'Tercero') : (emp.salario_tipo ?? '—')}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className={`${td} hidden sm:table-cell`}>
                              {esOperario ? (
                                <Badge variant="warning">
                                  {terceroNombre ?? 'Tercero'}
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  {emp.salario_tipo ?? '—'}
                                </Badge>
                              )}
                            </td>
                            <td className={`${td} hidden text-right tabular-nums text-muted-foreground lg:table-cell`}>
                              {/* Operario de tercero: no tiene salario base propio. */}
                              {esOperario ? '—' : fmtPesos(toNumber(emp.salario_base))}
                            </td>
                            {abierta && (
                            <td className={`${td} text-right`}>
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
                                    <span className="font-medium tabular-nums">
                                      ${toNumber(emp.total_neto).toLocaleString('es-CO')}
                                    </span>
                                  );
                                }
                                const enCache = previewsPorEmpleado.get(emp.id);
                                if (enCache != null) {
                                  return (
                                    <span
                                      className="font-medium tabular-nums"
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
                            )}
                            {!abierta && (
                              <>
                                <td className={`${td} hidden text-right tabular-nums text-muted-foreground xl:table-cell`}>
                                  {fmtPesos(jornales)}
                                </td>
                                <td className={`${td} hidden text-right tabular-nums text-muted-foreground xl:table-cell`}>
                                  {fmtPesos(cosechas)}
                                </td>
                                <td className={`${td} hidden text-right tabular-nums md:table-cell`}>
                                  <span
                                    className="text-foreground"
                                    title={auxilio > 0
                                      ? `Salario ${fmtPesos(toNumber(emp.total_devengado))} + auxilio de transporte ${fmtPesos(auxilio)}`
                                      : 'Sin auxilio de transporte en el periodo'}
                                  >
                                    {fmtPesos(devengado)}
                                  </span>
                                </td>
                                <td className={`${td} hidden text-right tabular-nums lg:table-cell`}>
                                  {fmtPesos(toNumber(emp.total_deducciones))}
                                </td>
                                <td className={`${td} text-right font-semibold tabular-nums text-foreground`}>
                                  {fmtPesos(toNumber(emp.total_neto))}
                                </td>
                              </>
                            )}
                            {abierta && (
                              <td className={td}>
                                <Badge variant={liquidado ? 'success' : 'warning'}>
                                  {emp.estado.charAt(0) + emp.estado.slice(1).toLowerCase()}
                                </Badge>
                              </td>
                            )}
                            <td className={`${td} pr-5`}>
                              <div className="flex justify-end gap-1">
                                {abierta && !liquidado && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (liquidados === totalColabs - 1) {
                                          setUltimoPendiente(emp.id);
                                          return;
                                        }
                                        navigate(`/nomina/${nominaId}/liquidar/${emp.id}`);
                                      }}
                                    >
                                      <Calculator strokeWidth={2} />
                                      Liquidar
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setEmpleadoAQuitar(emp)}
                                      className="text-muted-foreground hover:text-destructive"
                                      title="Quitar de la nómina"
                                      aria-label="Quitar de la nómina"
                                    >
                                      <Trash2 strokeWidth={2} />
                                    </Button>
                                  </>
                                )}
                                {liquidado && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-muted-foreground"
                                      onClick={() => navigate(`/nomina/${nominaId}/ver/${emp.id}`)}
                                      title="Ver liquidación"
                                      aria-label="Ver liquidación"
                                    >
                                      {abierta ? <Eye strokeWidth={2} /> : <FileText strokeWidth={2} />}
                                    </Button>
                                    {abierta && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-muted-foreground"
                                        onClick={() => navigate(`/nomina/${nominaId}/liquidar/${emp.id}?reliquidar=1`)}
                                        title="Re-liquidar"
                                        aria-label="Re-liquidar"
                                      >
                                        <Pencil strokeWidth={2} />
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
                    {!abierta && (
                      <tfoot>
                        <tr className="border-t border-border bg-muted/60 font-semibold text-foreground">
                          <td className={`${td} pl-5`}>
                            Total {empleadosMostrar.length} colaborador{empleadosMostrar.length === 1 ? '' : 'es'}
                          </td>
                          <td className="hidden sm:table-cell" />
                          {/* Salario base: no se suma, es el dato de cada fila. */}
                          <td className="hidden lg:table-cell" />
                          <td className={`${td} hidden text-right tabular-nums xl:table-cell`}>
                            {fmtPesos(totalesTabla.jornales)}
                          </td>
                          <td className={`${td} hidden text-right tabular-nums xl:table-cell`}>
                            {fmtPesos(totalesTabla.cosechas)}
                          </td>
                          <td className={`${td} hidden text-right tabular-nums md:table-cell`}>
                            {fmtPesos(totalesTabla.devengado)}
                          </td>
                          <td className={`${td} hidden text-right tabular-nums lg:table-cell`}>
                            {fmtPesos(totalesTabla.deducciones)}
                          </td>
                          <td className={`${td} text-right tabular-nums`}>
                            {fmtPesos(totalesTabla.neto)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
          </Card>
        </section>
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
              className="bg-destructive hover:bg-destructive/90"
            >
              {accionando ? 'Quitando...' : 'Quitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar cerrar nómina */}
      {/* Antes del último: después del cierre no hay reabrir, así que los
          descuentos del acta de terceros y la validación de cosecha tienen
          que estar listos ya (§6.1, §7.5). */}
      <AlertDialog
        open={ultimoPendiente !== null}
        onOpenChange={(abierto) => { if (!abierto) setUltimoPendiente(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Es el último colaborador pendiente</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Al liquidarlo la nómina se finaliza sola y deja de poder modificarse:
                  no se puede reabrir, ni re-liquidar a nadie, ni agregar descuentos a
                  las actas de los contratistas.
                </p>
                <p>
                  Si falta algo de eso, resuélvalo antes de continuar.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = ultimoPendiente;
                setUltimoPendiente(null);
                if (id != null) navigate(`/nomina/${nominaId}/liquidar/${id}`);
              }}
            >
              Continuar y liquidar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              quedarán liquidadas y no podrán editarse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* §4.4 — Aviso de gajos sin despachar. Es la única forma en que
              la nómina paga de menos. El backend NO bloquea el cierre, pero
              debe requerir confirmación explícita. */}
          {alertaGajosPreCierre && (
            <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
              <div className="min-w-0 text-sm text-foreground">
                <p className="font-medium">
                  Vas a cerrar con {alertaGajosPreCierre.total_gajos_pendientes_enviar} gajos sin despachar en {alertaGajosPreCierre.cosechas_con_gajos_pendientes} cosecha{alertaGajosPreCierre.cosechas_con_gajos_pendientes !== 1 ? 's' : ''}.
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Esos gajos quedarán fuera de la liquidación de forma permanente: la cosecha pertenece a este período por fecha de operación, así que la nómina siguiente no los va a tomar.
                </p>
              </div>
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
              <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                <div className="min-w-0 text-sm text-foreground">
                  <p className="font-medium">
                    {enRango.length} descanso{enRango.length !== 1 ? 's' : ''} del rango de esta nómina sin cubrir
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Estos días caen en un hueco entre nóminas y no se están pagando en ninguna. Puede ser deliberado.
                  </p>
                  <p className="mt-1 tabular-nums">
                    {enRango.slice(0, 6).map((d) => `${d.fecha} · ${d.nombre}`).join('; ')}
                    {enRango.length > 6 && `; y ${enRango.length - 6} más`}
                  </p>
                </div>
              </div>
            );
          })()}
          {/* §3.6 — Lo que el backend va a rechazar. Con la lista vacía el
              cierre manual pasa; con algo aquí, el 409 ya está anunciado.
              PR-V2: el de la vacación trabajada sí se puede forzar. */}
          <BloqueosCierre bloqueos={bloqueosCierre} onInterrumpir={setVacacionAInterrumpir} />
          {/* El motivo del forzado queda en la auditoría, así que se pide
              aquí y no después. */}
          {bloqueosDurosCierre.length === 0 && bloqueosForzablesCierre.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="motivo-forzar-cierre">
                Motivo para cerrar de todas formas
              </Label>
              <Textarea
                id="motivo-forzar-cierre"
                value={motivoForzado}
                onChange={(e) => setMotivoForzado(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Por ejemplo: el 19 vino a recoger herramienta; las vacaciones sí terminaron el 22"
              />
              <p className="text-xs text-muted-foreground">
                Después de cerrar, esa vacación ya no se podrá interrumpir.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accionando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cerrarNomina(bloqueosForzablesCierre.length > 0)}
              disabled={accionando || bloqueosDurosCierre.length > 0}
              className={alertaGajosPreCierre || bloqueosForzablesCierre.length > 0
                ? 'bg-warning hover:bg-warning/90'
                : undefined}
            >
              {accionando
                ? 'Cerrando...'
                : alertaGajosPreCierre || bloqueosForzablesCierre.length > 0
                  ? 'Cerrar de todas formas'
                  : 'Cerrar nómina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PR-V2 — El cierre encontró trabajo en días de vacaciones. El
          checklist no lo había anticipado (la planilla cambió después), así
          que el 409 trae a quién afecta y qué hacer con cada vacación. */}
      <AlertDialog
        open={vacacionTrabajada != null}
        onOpenChange={(abierto) => { if (!abierto) setVacacionTrabajada(null); }}
      >
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Hay trabajo en días de vacaciones</AlertDialogTitle>
            <AlertDialogDescription>
              Si el colaborador se reintegró antes, interrumpa la vacación y vuelva a
              liquidarlo. Si la planilla está mal, corríjala. Después de cerrar ya no se
              podrá interrumpir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {vacacionTrabajada && (
            <BloqueosCierre
              bloqueos={[vacacionTrabajada]}
              onInterrumpir={setVacacionAInterrumpir}
            />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="motivo-forzar-409">Motivo para cerrar de todas formas</Label>
            <Textarea
              id="motivo-forzar-409"
              value={motivoForzado}
              onChange={(e) => setMotivoForzado(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Por qué se cierra con días de vacación trabajados"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accionando}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cerrarNomina(true)}
              disabled={accionando || motivoForzado.trim().length < 5}
              className="bg-warning hover:bg-warning/90"
            >
              {accionando ? 'Cerrando...' : 'Cerrar de todas formas'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* El modal de la interrupción es el mismo del detalle de la vacación. */}
      <InterrumpirVacacionDialog
        vacacionId={vacacionAInterrumpir?.vacacion_id ?? null}
        comprobante={vacacionAInterrumpir?.numero_comprobante}
        fechaSugerida={vacacionAInterrumpir?.fecha_reintegro_sugerida}
        onClose={() => setVacacionAInterrumpir(null)}
        onInterrumpida={() => {
          // D10: la fila del colaborador volvió a PENDIENTE y hay que
          // re-liquidarla; al hacerlo, la nómina cierra sola.
          setVacacionTrabajada(null);
          toast.info('Vuelva a liquidar a ese colaborador', {
            duration: 9000,
            description: 'Su fila volvió a pendiente con los días devueltos.',
          });
          cargar();
        }}
      />

      {/* Confirmar eliminar nómina */}
      <AlertDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar nómina</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la nómina y todos sus colaboradores pendientes. No podrá deshacerse.
              {liquidados > 0 && (
                <span className="mt-2 block font-medium text-destructive">
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
              className="bg-destructive hover:bg-destructive/90"
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
            <DialogTitle>Editar período de la nómina</DialogTitle>
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
                    <SelectItem value="1">Primera quincena (1-15)</SelectItem>
                    <SelectItem value="2">Segunda quincena (16-fin de mes)</SelectItem>
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
            <Button onClick={guardarEdicion} disabled={guardandoEdit}>
              {guardandoEdit ? <Loader2 className="animate-spin" /> : <Check strokeWidth={2} />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Registrar Pago Tercero */}
      {modalPagoTerceroId && terceroSeleccionadoPago && (
        <Dialog open onOpenChange={() => setModalPagoTerceroId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Registrar pago · {detallePagoSeleccionado?.tercero.nombre ?? terceroSeleccionadoPago.tercero_nombre}
              </DialogTitle>
              <DialogDescription>
                Confirma que se realizó la transferencia a la empresa
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2 rounded-lg bg-muted/60 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Empresa</span>
                  <span className="font-medium text-foreground">
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
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-semibold text-foreground">Total a transferir</span>
                  <span className="font-semibold tabular-nums text-foreground">
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
                  <Label htmlFor="nominadeta-referencia-n-de-transferencia">Referencia de la transferencia *</Label>
                  <Input id="nominadeta-referencia-n-de-transferencia"
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
                <Label htmlFor="nominadeta-n-orden-de-pago-opcional">Número de orden de pago (opcional)</Label>
                <Input id="nominadeta-n-orden-de-pago-opcional"
                  value={pagandoForm.orden_pago_numero}
                  onChange={(e) =>
                    setPagandoForm((prev) => ({ ...prev, orden_pago_numero: e.target.value }))
                  }
                  placeholder="Ej: OP-2026-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nominadeta-observacion-opcional">Observación (opcional)</Label>
                <Input id="nominadeta-observacion-opcional"
                  value={pagandoForm.observacion}
                  onChange={(e) =>
                    setPagandoForm((prev) => ({ ...prev, observacion: e.target.value }))
                  }
                  placeholder="Notas internas"
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
              >
                {registrandoPago ? <Loader2 className="animate-spin" /> : <Check strokeWidth={2} />}
                Confirmar pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
