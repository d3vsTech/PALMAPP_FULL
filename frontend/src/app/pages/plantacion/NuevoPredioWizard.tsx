/**
 * NuevoPredioWizard.tsx — Wizard "Crear / Editar Plantación"
 *
 * MODO CREACIÓN (sin ?edit):
 *   Paso 1: POST /predios (§1.3)
 *   Paso 2: POST /lotes   (§2.3) con semillas_ids[]
 *   Paso 3: POST /sublotes (§3.3) — pueden crear palmas automáticamente
 *   Paso 4: POST /lineas  (§5.3) — opcional
 *   Paso 5: POST /palmas  (§4.3) — opcional, si no se crearon en paso 3
 *   Panel: estado local
 *
 * MODO EDICIÓN (?edit=predioId):
 *   Carga datos con §1.2, §2.1, §3.1, §5.1
 *   Cada acción llama al API inmediatamente
 *   Panel: §1.6 GET /predios/{id}/resumen — se refresca tras cada operación
 */
import React, { useState, useEffect, useRef } from 'react';
// @ts-expect-error react-dom no expone tipos a través del export "react-dom" en este setup
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  MapPin, ArrowLeft, ArrowRight, Save, Check, Plus, Trash2, Pencil,
  Trees, Grid3x3, GitBranch, Leaf, Calendar, Loader2,
  ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';
import {
  prediosApi, lotesApi, sublotesApi, lineasApi, palmasApi,
} from '../../../api/plantacion';
import { fetchConToken } from '../../../api/request';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

// ── Tipos locales ────────────────────────────────────────────────────────────
interface LoteLocal {
  id: string;
  nombre: string;
  fechaSiembra: string;
  hectareasSembradas: number;
  semillasIds: number[];
  variedad?: string;
}
interface SubloteLocal {
  id: string;
  nombre: string;
  loteId: string;
  cantidadPalmas: number;
}
interface LineaLocal {
  id: string;
  numero: number;
  subloteId: string;
  /** Total de palmas asignadas a la línea (viene del bundle wizard-init) */
  cantidadPalmas?: number;
}

const ETAPAS = [
  { numero: 1, nombre: 'Predio' },
  { numero: 2, nombre: 'Lotes' },
  { numero: 3, nombre: 'Sublotes' },
  { numero: 4, nombre: 'Líneas' },
  { numero: 5, nombre: 'Palmas' },
];

export default function NuevoPredioWizard() {
  const navigate      = useNavigate();
  const [sp]          = useSearchParams();
  const editId        = sp.get('edit');
  const pasoUrl       = parseInt(sp.get('paso') ?? '1', 10);
  const { token }     = useAuth();

  // Inicializamos la etapa leyendo el query param `paso` para que al
  // recargar o al regresar mediante `back` se restaure la posición.
  const [etapa, setEtapa] = useState(
    Number.isFinite(pasoUrl) && pasoUrl >= 1 && pasoUrl <= 5 ? pasoUrl : 1,
  );
  const [guardando, setGuardando] = useState(false);
  // Overlay de carga mientras se hidrata el predio en modo edición.
  const [cargandoPredio, setCargandoPredio] = useState<boolean>(!!editId);
  // Contador de mutaciones en curso (agregar/eliminar/editar). Cuando >0
  // mostramos el overlay y bloqueamos toda interacción.
  const [procesando, setProcesando] = useState(0);
  const [procesandoMsg, setProcesandoMsg] = useState<string>('Procesando...');
  /**
   * Envuelve una operación asíncrona: incrementa el contador `procesando`
   * (lo que dispara el overlay full-page), pone el mensaje y al final
   * decrementa el contador. Pasa una función `update(msg)` para que la
   * operación pueda ir actualizando el texto del overlay (ej. progreso).
   */
  const withProc = async <T,>(
    msg: string,
    fn: (update: (msg: string) => void) => Promise<T>,
  ): Promise<T> => {
    setProcesandoMsg(msg);
    setProcesando(p => p + 1);
    try {
      return await fn(setProcesandoMsg);
    } finally {
      setProcesando(p => Math.max(0, p - 1));
    }
  };

  // Bloquear scroll global mientras el overlay esté visible (carga inicial,
  // mutación en curso o guardado del wizard).
  useEffect(() => {
    const overlayActivo = cargandoPredio || procesando > 0 || guardando;
    if (!overlayActivo) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [cargandoPredio, procesando, guardando]);

  // ── Estado paso 1: Predio ──────────────────────────────────────────────────
  const [predioNombre, setPredioNombre]     = useState('');
  const [predioUbicacion, setPredioUbicacion] = useState('');
  const [predioHectareas, setPredioHectareas] = useState('');
  const [departamentos, setDepartamentos]   = useState<{codigo:string;nombre:string}[]>([]);
  const [municipios, setMunicipios]         = useState<{codigo:string;nombre:string}[]>([]);
  const [deptoSel, setDeptoSel]             = useState('');
  const [munSel, setMunSel]                 = useState('');
  // Pendientes (modo edición): nombres del depto/municipio que vinieron del API,
  // se aplican cuando los catálogos terminen de cargar.
  const [pendingDepto, setPendingDepto]     = useState<string | null>(null);
  const [pendingMunicipio, setPendingMunicipio] = useState<string | null>(null);

  // ── Estado paso 2: Lotes ───────────────────────────────────────────────────
  const [semillasCatalogo, setSemillasCatalogo] = useState<{id:number;tipo:string;nombre:string}[]>([]);
  const [lotes, setLotes]               = useState<LoteLocal[]>([]);
  const [showFormLote, setShowFormLote] = useState(false);
  // Edición de lote inline: id del lote que se está editando (null = creando)
  const [editingLoteId, setEditingLoteId] = useState<string | null>(null);

  // ── Estado paso 3: Sublotes ────────────────────────────────────────────────
  const [sublotes, setSublotes]               = useState<SubloteLocal[]>([]);
  const [showFormSublote, setShowFormSublote] = useState<string | null>(null); // loteId
  // Edición de sublote inline: id del sublote que se está editando (null = creando)
  const [editingSubloteId, setEditingSubloteId] = useState<string | null>(null);

  // ── Estado paso 4: Líneas ──────────────────────────────────────────────────
  const [lineas, setLineas]             = useState<LineaLocal[]>([]);

  // ── Estado paso 5 ──────────────────────────────────────────────────────────
  const [cantPalmasForm, setCantPalmasForm] = useState<Record<string, string>>({});
  const [lineaSelForm, setLineaSelForm]     = useState<Record<string, string>>({});
  // Entradas confirmadas de palmas en modo creación, separadas por línea.
  // palmasEntries[sub.id] = [{lineaId: '', cantidad: 50}, {lineaId: 'l2', cantidad: 30}]
  // lineaId vacío ('') significa "sin línea" (sublote sin líneas o entrada general).
  type PalmasEntry = { lineaId: string; cantidad: number };
  const [palmasEntries, setPalmasEntries] = useState<Record<string, PalmasEntry[]>>({});

  // Estados para confirmación de eliminación
  type PendienteEliminar =
    | { tipo: 'lote'; id: string; nombre: string }
    | { tipo: 'sublote'; id: string; nombre: string }
    | { tipo: 'linea'; id: string; numero: number }
    | { tipo: 'palma'; id: string; codigo: string; key: string; subloteId: string; lineaId: string; page: number };
  const [pendienteEliminar, setPendienteEliminar] = useState<PendienteEliminar | null>(null);
  // Diálogo "Nueva línea": pregunta cuántas palmas asignar al crearla.
  const [nuevaLineaPrompt, setNuevaLineaPrompt] = useState<{
    subloteId: string;
    subloteNombre: string;
    disponibles: number;
    cantidadInput: string;
  } | null>(null);
  const [eliminandoItem, setEliminandoItem] = useState(false);
  // Índice de la entrada que se está editando por sublote (null = ninguna, formulario crea nueva)
  const [editingEntryIdx, setEditingEntryIdx] = useState<Record<string, number | null>>({});
  // Helper: total de palmas confirmadas para un sublote (suma de todas las entradas)
  const totalPalmasSublote = (subId: string): number =>
    (palmasEntries[subId] ?? []).reduce((acc, e) => acc + (e.cantidad || 0), 0);
  // Paginación de palmas en wizard (edit mode):
  //   clave "linea_{lineaId}"  → palmas de esa línea
  //   clave "sub_{subloteId}"  → palmas del sublote sin líneas (solo conteo, no se cargan)
  const [wizardPag, setWizardPag] = useState<Record<string, {
    data: any[]; total: number; page: number; lastPage: number; loading: boolean;
  }>>({});
  const [wizardLineaOpen, setWizardLineaOpen] = useState<Record<string, string>>({});
  const [mostrandoFormPalmas, setMostrandoFormPalmas] = useState<string | null>(null);
  const [visiblePalmas, setVisiblePalmas] = useState<Record<string, number>>({});

  // ── Refs para auto-scroll a formularios al abrirlos ────────────────────────
  // Cuando el usuario tiene una lista larga de lotes/sublotes y abre el form
  // de creación, queremos llevarlo automáticamente al formulario que aparece
  // al final, en lugar de dejarlo viendo la lista.
  const formLoteRef = useRef<HTMLDivElement>(null);
  const formSubloteRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const formPalmasRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (showFormLote) {
      // Esperar al próximo frame para que el form ya esté renderizado
      requestAnimationFrame(() => {
        formLoteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [showFormLote]);

  useEffect(() => {
    if (showFormSublote) {
      requestAnimationFrame(() => {
        const el = formSubloteRefs.current[showFormSublote];
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [showFormSublote]);

  // Scroll al form de edición de sublote cuando el usuario hace click en lápiz
  useEffect(() => {
    if (editingSubloteId) {
      requestAnimationFrame(() => {
        const el = formSubloteRefs.current[`edit-${editingSubloteId}`];
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [editingSubloteId]);

  useEffect(() => {
    if (mostrandoFormPalmas) {
      requestAnimationFrame(() => {
        const el = formPalmasRefs.current[mostrandoFormPalmas];
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [mostrandoFormPalmas]);

  // ── Panel resumen: en edición usa API; en creación usa estado local ────────
  const [resumen, setResumen] = useState<any>(null);

  // ── Departamentos: hidratación instantánea desde sessionStorage ───────────
  // El catálogo real llega luego por wizard-init.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cache_departamentos');
      if (raw) setDepartamentos(JSON.parse(raw));
    } catch { /* ignorar */ }
  }, []);

  // ── Municipios condicional (cuando cambia deptoSel) ───────────────────────
  useEffect(() => {
    if (!deptoSel) { setMunicipios([]); setMunSel(''); return; }
    const cacheKey = `cache_municipios_${deptoSel}`;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) setMunicipios(JSON.parse(raw));
    } catch { /* ignorar */ }
    fetchConToken(`/api/v1/auth/departamentos/${deptoSel}/municipios`, token)
      .then(r => r.json())
      .then(d => {
        const lista = d.data ?? [];
        setMunicipios(lista);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(lista)); } catch { /* */ }
      })
      .catch(() => {});
  }, [deptoSel, token]);

  // Sincronizar ubicacion con depto+municipio
  useEffect(() => {
    if (!deptoSel && !munSel) return;
    const dn = departamentos.find(d => d.codigo === deptoSel)?.nombre ?? '';
    const mn = municipios.find(m => m.codigo === munSel)?.nombre ?? '';
    setPredioUbicacion([mn, dn].filter(Boolean).join(', '));
  }, [deptoSel, munSel, departamentos, municipios]);

  // Helper: normalizar texto (sin acentos, en minúsculas, sin espacios extra)
  // para comparar nombres de departamento/municipio aunque el backend devuelva
  // distinto casing o con/sin tildes.
  const normalizar = (s: string) =>
    String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  // Resolver depto pendiente (modo edición): cuando el catálogo de departamentos
  // ya está cargado y aún no hay deptoSel, busca por nombre y lo aplica.
  useEffect(() => {
    if (!pendingDepto || departamentos.length === 0 || deptoSel) return;
    const target = normalizar(pendingDepto);
    // Match exacto primero
    let match = departamentos.find(d => normalizar(d.nombre) === target);
    // Fallback: contains (por si el ubicacion trae texto extra)
    if (!match) {
      match = departamentos.find(d => normalizar(d.nombre).includes(target) || target.includes(normalizar(d.nombre)));
    }
    if (match) setDeptoSel(match.codigo);
  }, [pendingDepto, departamentos, deptoSel]);

  // Resolver municipio pendiente: cuando los municipios del depto cargan,
  // busca por nombre y aplica el munSel.
  useEffect(() => {
    if (!pendingMunicipio || municipios.length === 0 || munSel) return;
    const target = normalizar(pendingMunicipio);
    let match = municipios.find(m => normalizar(m.nombre) === target);
    if (!match) {
      match = municipios.find(m => normalizar(m.nombre).includes(target) || target.includes(normalizar(m.nombre)));
    }
    if (match) {
      setMunSel(match.codigo);
      setPendingMunicipio(null);
    }
  }, [pendingMunicipio, municipios, munSel]);

  // ── Semillas: hidratación instantánea desde sessionStorage ────────────────
  // El catálogo real llega vía wizard-init.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cache_semillas');
      if (raw) setSemillasCatalogo(JSON.parse(raw));
    } catch { /* ignorar */ }
  }, []);

  // ── §1.6 Refrescar panel (solo edición) ────────────────────────────────────
  const refrescarResumen = async (predioId: string | number) => {
    try {
      const r = await prediosApi.resumen(Number(predioId));
      setResumen(r.data);
    } catch { /* silent */ }
  };

  // ── Polling tolerante de batch (§4.7) con barra de progreso suavizada ─────
  // Backend reporta `progress` típicamente binario (0 ó 100, porque la cola
  // dispatch un Job con total_jobs=1). Para que el usuario vea movimiento real
  // mezclamos backend con un estimado de tiempo (~1ms por palma).
  //
  // No intentamos detectar "worker caído" por contadores: con total_jobs=1, los
  // valores processed=0/pending=1 son indistinguibles entre "job corriendo" y
  // "worker apagado". Solo confiamos en `finished` y en el timeout final.
  //
  // Tolerante a errores transitorios (red, 404 puntual): falla solo tras varios
  // errores consecutivos. Distingue: ok / failed / timeout.
  const pollBatch = async (
    batchId: string,
    cantidad: number,
    verbo: 'Creando' | 'Eliminando',
    onProgress: (msg: string) => void,
  ): Promise<'ok' | 'failed' | 'timeout'> => {
    const start = Date.now();
    const expectedMs = Math.max(5_000, Math.min(90_000, cantidad));
    const TIMEOUT_MS = 600_000;
    const MAX_ERR = 5;
    let errores = 0;
    let lastPct = 0;
    onProgress(`${verbo} ${cantidad.toLocaleString('es-CO')} palmas... 0%`);

    while (Date.now() - start < TIMEOUT_MS) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const br = await palmasApi.getBatch(batchId);
        errores = 0;
        const elapsed = Date.now() - start;
        const backendPct = Math.max(0, Math.min(100, Number(br.data.progress ?? 0)));
        const tiempoPct = Math.min(95, (elapsed / expectedMs) * 100);
        const pct = Math.max(lastPct, Math.round(Math.max(backendPct, tiempoPct)));
        lastPct = pct;
        onProgress(`${verbo} ${cantidad.toLocaleString('es-CO')} palmas... ${pct}%`);

        if (br.data.finished) {
          if (br.data.has_failures) return 'failed';
          onProgress(`${verbo} ${cantidad.toLocaleString('es-CO')} palmas... 100%`);
          return 'ok';
        }
      } catch {
        errores++;
        if (errores >= MAX_ERR) return 'failed';
      }
    }
    return 'timeout';
  };
  // ── §4.1 Cargar palmas paginadas para paso 5 (edit mode) ─────────────────
  const cargarWizardPalmas = async (
    key: string,
    params: { sublote_id: number; linea_id?: number },
    page = 1,
    append = false
  ) => {
    const PER = 50;
    setWizardPag(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? { data: [], total: 0, page: 1, lastPage: 1 }), loading: true },
    }));
    try {
      const res = await palmasApi.listar({ ...params, per_page: PER, page });
      setWizardPag(prev => ({
        ...prev,
        [key]: {
          data:     append ? [...(prev[key]?.data ?? []), ...(res.data ?? [])] : (res.data ?? []),
          total:    res.meta?.total        ?? 0,
          page:     res.meta?.current_page ?? page,
          lastPage: res.meta?.last_page    ?? 1,
          loading:  false,
        },
      }));
    } catch {
      setWizardPag(prev => ({
        ...prev,
        [key]: { data: [], total: 0, page: 1, lastPage: 1, loading: false },
      }));
    }
  };

  // ── §1.7 Bundle init: 1 sola petición reemplaza 14+ requests ──────────────
  // Carga predio + lotes + sublotes + lineas + paramétricas (semillas, deptos).
  // Sirve tanto modo edición como creación.
  useEffect(() => {
    if (editId) setCargandoPredio(true);
    let cancelled = false;

    prediosApi.wizardInit(editId ?? undefined)
      .then(({ data }) => {
        if (cancelled) return;

        // 1) Paramétricas → estado + caché de sesión
        const semillas = data.parametricas?.semillas ?? [];
        const departamentos = data.parametricas?.departamentos ?? [];
        setSemillasCatalogo(semillas);
        setDepartamentos(departamentos);
        try {
          sessionStorage.setItem('cache_semillas', JSON.stringify(semillas));
          sessionStorage.setItem('cache_departamentos', JSON.stringify(departamentos));
        } catch { /* cuota llena */ }

        // 2) Hidratar predio (solo edición)
        if (data.predio) {
          const p = data.predio;
          setPredioNombre(p.nombre ?? '');
          setPredioUbicacion(p.ubicacion ?? '');
          setPredioHectareas(p.hectareas_totales != null ? String(Number(p.hectareas_totales)) : '');

          if (p.ubicacion) {
            const partes = String(p.ubicacion).split(',').map((s: string) => s.trim()).filter(Boolean);
            if (partes.length >= 2) {
              setPendingMunicipio(partes[0]);
              setPendingDepto(partes[partes.length - 1]);
            } else if (partes.length === 1) {
              setPendingDepto(partes[0]);
            }
          }
        }

        // 3) Lotes → LoteLocal
        const lotesData = data.lotes ?? [];
        setLotes(lotesData.map(l => ({
          id: String(l.id),
          nombre: l.nombre,
          // El bundle no expone fecha_siembra. Si se necesita en algún flujo,
          // se puede traer puntualmente con lotesApi.ver(id).
          fechaSiembra: '',
          hectareasSembradas: Number(l.hectareas_sembradas ?? 0),
          semillasIds: (l.semillas ?? []).map(s => Number(s.id)),
          variedad: (l.semillas ?? [])[0]?.nombre ?? '',
        })));

        // 4) Sublotes — bundle.sublotes está indexado por lote_id
        const todosSubl: SubloteLocal[] = [];
        Object.entries(data.sublotes ?? {}).forEach(([loteId, lista]) => {
          (lista ?? []).forEach(s => {
            todosSubl.push({
              id: String(s.id),
              nombre: s.nombre,
              loteId: String(loteId),
              cantidadPalmas: Number(s.cantidad_palmas ?? 0),
            });
          });
        });
        setSublotes(todosSubl);

        // 5) Líneas — bundle.lineas está indexado por sublote_id
        const todasLineas: LineaLocal[] = [];
        Object.entries(data.lineas ?? {}).forEach(([subloteId, lista]) => {
          (lista ?? []).forEach(ln => {
            todasLineas.push({
              id: String(ln.id),
              numero: ln.numero,
              subloteId: String(subloteId),
              cantidadPalmas: Number(ln.cantidad_palmas ?? 0),
            });
          });
        });
        setLineas(todasLineas);

        // 6) Panel resumen (solo edición)
        if (editId) {
          refrescarResumen(editId).catch(() => { /* silent */ });
        }
      })
      .catch(err => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : 'Error al cargar la plantación');
      })
      .finally(() => {
        if (!cancelled) setCargandoPredio(false);
      });

    return () => { cancelled = true; };
  }, [editId]);

  // ── Auto-cargar palmas al entrar al paso 5 en modo edición ─────────────
  // - Sublote SIN líneas → carga todas sus palmas en clave "sub_{subId}"
  // - Sublote CON líneas → carga las palmas de cada línea en clave "linea_{lineaId}"
  const VISIBLE_STEP = 24;
  useEffect(() => {
    if (etapa !== 5 || !editId) return;
    sublotes.forEach(sub => {
      const linSub = lineas.filter(ln => ln.subloteId === sub.id);
      if (linSub.length > 0) {
        // Cargar palmas por línea
        linSub.forEach(ln => {
          const key = `linea_${ln.id}`;
          if (!wizardPag[key]) {
            cargarWizardPalmas(key, {
              sublote_id: Number(sub.id),
              linea_id: Number(ln.id),
            });
          }
        });
      } else {
        // Sin líneas: carga todas las palmas del sublote
        const key = `sub_${sub.id}`;
        if (!wizardPag[key]) {
          cargarWizardPalmas(key, { sublote_id: Number(sub.id) });
        }
      }
    });
    // Reset visible count when entering step
    setVisiblePalmas({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, editId, sublotes, lineas]);

  // ── Helpers locales (modo creación) ──────────────────────────────────────
  /**
   * Agrega un lote.
   *  - Si el wizard ya está en modo edición (`editId` viene en la URL), persistimos
   *    el lote en backend para que sobreviva a refresh/back y aparezca en el
   *    resumen detallado del API.
   *  - Si todavía no hay predio creado (no debería pasar tras el paso 1), lo
   *    guardamos en estado local hasta el "Guardar Plantación" final.
   */
  const agregarLote = async (lote: Omit<LoteLocal, 'id'>) => withProc('Creando lote...', async () => {
    if (editId) {
      try {
        const body: any = { predio_id: Number(editId), nombre: lote.nombre };
        if (lote.fechaSiembra)                  body.fecha_siembra        = lote.fechaSiembra;
        if (lote.hectareasSembradas > 0)        body.hectareas_sembradas  = lote.hectareasSembradas;
        if (lote.semillasIds && lote.semillasIds.length > 0) body.semillas_ids = lote.semillasIds;
        const res = await lotesApi.crear(body);
        const realId = res.data?.id;
        if (!realId) throw new Error('No se recibió ID del lote');
        setLotes(prev => [...prev, { ...lote, id: String(realId) }]);
        setShowFormLote(false);
        toast.success('Lote creado');
        await refrescarResumen(editId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al crear el lote');
      }
      return;
    }
    setLotes(prev => [...prev, { ...lote, id: `l-${Date.now()}` }]);
    setShowFormLote(false);
  });
  const actualizarLote = async (id: string, datos: Omit<LoteLocal, 'id'>) => withProc('Actualizando lote...', async () => {
    // En modo edición y con id real (no local "l-..."): persistir via API.
    if (editId && !id.startsWith('l-')) {
      try {
        const body: any = { nombre: datos.nombre };
        if (datos.fechaSiembra)         body.fecha_siembra = datos.fechaSiembra;
        if (datos.hectareasSembradas > 0) body.hectareas_sembradas = datos.hectareasSembradas;
        if (datos.semillasIds && datos.semillasIds.length > 0) body.semillas_ids = datos.semillasIds;
        await lotesApi.editar(Number(id), body);
        toast.success('Lote actualizado');
        await refrescarResumen(editId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al actualizar lote');
        return;
      }
    }
    setLotes(prev => prev.map(l => (l.id === id ? { ...l, ...datos } : l)));
    setEditingLoteId(null);
  });
  const eliminarLote = async (id: string) => withProc('Eliminando lote...', async () => {
    if (editId && !id.startsWith('lt-')) {
      try {
        await lotesApi.eliminar(Number(id));
        toast.success('Lote eliminado');
        await refrescarResumen(editId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar lote');
        return;
      }
    }
    setLotes(prev => prev.filter(l => l.id !== id));
    const subIds = sublotes.filter(s => s.loteId === id).map(s => s.id);
    setSublotes(prev => prev.filter(s => s.loteId !== id));
    setLineas(prev => prev.filter(ln => !subIds.includes(ln.subloteId)));
  });
  const agregarSublote = async (loteId: string, nombre: string) => withProc('Creando sublote...', async () => {
    // Si estamos en modo edición y el lote tiene id real (no local "l-..."),
    // persistir el sublote en backend inmediatamente.
    if (editId && !loteId.startsWith('l-')) {
      try {
        const res = await sublotesApi.crear({ lote_id: Number(loteId), nombre });
        const realId = res.data?.id;
        if (!realId) throw new Error('No se recibió ID del sublote');
        setSublotes(prev => [...prev, { id: String(realId), nombre, loteId, cantidadPalmas: 0 }]);
        setShowFormSublote(null);
        toast.success('Sublote creado');
        await refrescarResumen(editId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al crear el sublote');
      }
      return;
    }
    setSublotes(prev => [...prev, { id: `s-${Date.now()}`, nombre, loteId, cantidadPalmas: 0 }]);
    setShowFormSublote(null);
  });
  const actualizarSublote = async (id: string, nombre: string) => withProc('Actualizando sublote...', async () => {
    // En modo edición y con id real (no local "s-..."): persistir via API.
    if (editId && !id.startsWith('s-')) {
      try {
        await sublotesApi.editar(Number(id), { nombre });
        toast.success('Sublote actualizado');
        await refrescarResumen(editId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al actualizar sublote');
        return;
      }
    }
    setSublotes(prev => prev.map(s => (s.id === id ? { ...s, nombre } : s)));
    setEditingSubloteId(null);
  });
  const eliminarSublote = async (id: string) => withProc('Eliminando sublote...', async () => {
    if (editId && !id.startsWith('s-')) {
      try {
        await sublotesApi.eliminar(Number(id));
        toast.success('Sublote eliminado');
        await refrescarResumen(editId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar sublote');
        return;
      }
    }
    setSublotes(prev => prev.filter(s => s.id !== id));
    setLineas(prev => prev.filter(ln => ln.subloteId !== id));
  });

  const confirmarEliminarItem = async () => {
    if (!pendienteEliminar) return;
    setEliminandoItem(true);
    await withProc('Eliminando...', async () => {
      try {
        if (pendienteEliminar.tipo === 'lote') {
          await eliminarLote(pendienteEliminar.id);
        } else if (pendienteEliminar.tipo === 'sublote') {
          await eliminarSublote(pendienteEliminar.id);
        } else if (pendienteEliminar.tipo === 'linea') {
          await eliminarLinea(pendienteEliminar.id);
        } else if (pendienteEliminar.tipo === 'palma') {
          try {
            await palmasApi.eliminar([Number(pendienteEliminar.id)]);
            await cargarWizardPalmas(
              pendienteEliminar.key,
              { sublote_id: Number(pendienteEliminar.subloteId), linea_id: Number(pendienteEliminar.lineaId) },
              pendienteEliminar.page,
            );
            setSublotes(prev => prev.map(s =>
              s.id === pendienteEliminar.subloteId ? { ...s, cantidadPalmas: Math.max(0, s.cantidadPalmas - 1) } : s
            ));
            if (editId) refrescarResumen(editId);
            toast.success('Palma eliminada');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al eliminar palma');
          }
        }
      } finally {
        setEliminandoItem(false);
        setPendienteEliminar(null);
      }
    });
  };

  // ── Líneas: en edición llama API; en creación guarda local ────────────────
  /**
   * Crea una línea en el sublote. Si `cantidadAsignar > 0`, reasigna ese
   * número de palmas existentes (sin línea) a la nueva línea via §4.5.
   * Esto se llama desde el diálogo "Nueva línea" que pregunta la cantidad.
   */
  const agregarLinea = async (subloteId: string, cantidadAsignar: number = 0) =>
    withProc('Creando línea...', async (update) => {
      const existentes = lineas.filter(ln => ln.subloteId === subloteId).map(ln => ln.numero);
      let nuevoNumero = 1;
      while (existentes.includes(nuevoNumero)) nuevoNumero++;

      if (editId) {
        try {
          // §5.3 POST /lineas
          const res = await lineasApi.crear({ sublote_id: Number(subloteId), numero: nuevoNumero });
          const nuevaLineaId = String(res.data?.id);
          let asignadas = 0;

          // Reasignar palmas existentes sin línea a esta nueva línea (§4.5).
          // Optimización por API:
          // - Si cantidadAsignar >= sin_linea total → omitir palmas_ids
          //   (un solo UPDATE WHERE en backend, ~10ms incluso para 100k palmas).
          // - Si es parcial → fetch específico de IDs y mandarlos.
          if (cantidadAsignar > 0 && nuevaLineaId) {
            update(`Asignando ${cantidadAsignar.toLocaleString('es-CO')} palmas a la línea...`);
            try {
              const probe = await palmasApi.listar({
                sublote_id: Number(subloteId),
                sin_linea: true,
                per_page: 1,
              });
              const sinLineaTotal = probe.meta?.total ?? 0;

              if (cantidadAsignar >= sinLineaTotal && sinLineaTotal > 0) {
                // §4.5 sin palmas_ids → asigna todas las sin línea del sublote
                const asig = await palmasApi.asignarLineaMasivo({
                  sublote_id: Number(subloteId),
                  linea_id: Number(nuevaLineaId),
                });
                asignadas = asig.cantidad_asignadas ?? sinLineaTotal;
              } else if (cantidadAsignar > 0 && sinLineaTotal > 0) {
                // Parcial: traer solo los IDs que necesitamos
                const PER = 1000;
                const totalPaginas = Math.ceil(cantidadAsignar / PER);
                const fetches = Array.from({ length: totalPaginas }, (_, i) =>
                  palmasApi.listar({
                    sublote_id: Number(subloteId),
                    sin_linea: true,
                    per_page: PER,
                    page: i + 1,
                  }),
                );
                const listados = await Promise.all(fetches);
                const palmas_ids = listados
                  .flatMap(r => r.data ?? [])
                  .slice(0, cantidadAsignar)
                  .map((p: any) => Number(p.id))
                  .filter((n: number) => Number.isFinite(n));

                if (palmas_ids.length > 0) {
                  const asig = await palmasApi.asignarLineaMasivo({
                    sublote_id: Number(subloteId),
                    linea_id: Number(nuevaLineaId),
                    palmas_ids,
                  });
                  asignadas = asig.cantidad_asignadas ?? palmas_ids.length;
                }
              }
            } catch (err) {
              toast.warning(
                err instanceof Error
                  ? `Línea creada pero falló asignación: ${err.message}`
                  : 'Línea creada pero falló la asignación de palmas',
              );
            }
          }

          setLineas(prev => [
            ...prev,
            {
              id: nuevaLineaId,
              numero: nuevoNumero,
              subloteId,
              cantidadPalmas: asignadas,
            },
          ]);
          if (asignadas > 0) {
            toast.success(
              `Línea ${nuevoNumero} creada con ${asignadas.toLocaleString('es-CO')} palmas asignadas`,
            );
          } else {
            toast.success(res.message ?? 'Línea creada');
          }
          await refrescarResumen(editId);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Error');
        }
      } else {
        setLineas(prev => [...prev, { id: `ln-${Date.now()}`, numero: nuevoNumero, subloteId }]);
      }
    });
  const eliminarLinea = async (id: string) => withProc('Eliminando línea...', async () => {
    if (editId && !id.startsWith('ln-')) {
      try {
        // §5.5 DELETE /lineas/{id}
        await lineasApi.eliminar(Number(id));
        toast.success('Línea eliminada');
        await refrescarResumen(editId);
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); return; }
    }
    setLineas(prev => prev.filter(ln => ln.id !== id));
  });

  // ── Palmas (paso 5, solo modo edición): §4.3 POST /palmas ─────────────────
  // §4.3 POST /palmas — cant y lineaId vienen del formulario del paso 5
  /**
   * Crea palmas para un sublote (o línea). Maneja sync (<= 5000) y async (> 5000).
   * En el path async ESPERA el polling antes de resolver, de modo que el caller
   * (guardarTodo/Finalizar) pueda navegar con seguridad cuando todas las palmas
   * existan realmente en el backend.
   */
  const agregarPalmas = async (subloteId: string, cant: number, lineaId: string | undefined) => withProc(`Procesando ${cant.toLocaleString('es-CO')} palmas...`, async (update) => {
    try {
      // ── Si se eligió una línea: reasignar primero las palmas existentes
      //    sin línea de ese sublote (§4.5). Sólo crear las que falten.
      //    Esto evita que el contador del sublote crezca cuando solo se quiere
      //    organizar palmas ya existentes en una línea recién creada.
      let reasignadas = 0;
      let aCrear = cant;
      if (lineaId) {
        update('Buscando palmas sin línea...');
        const probe = await palmasApi.listar({
          sublote_id: Number(subloteId),
          sin_linea: true,
          per_page: 1,
        });
        const sinLineaTotal = probe.meta?.total ?? 0;
        const aReasignar = Math.min(cant, sinLineaTotal);

        if (aReasignar > 0) {
          update(`Asignando ${aReasignar.toLocaleString('es-CO')} palmas a la línea...`);
          // §4.5: si reasignamos TODAS las sin_linea del sublote, podemos omitir
          // palmas_ids (un solo UPDATE WHERE en backend). Si es parcial, fetch IDs.
          if (aReasignar >= sinLineaTotal) {
            const asig = await palmasApi.asignarLineaMasivo({
              sublote_id: Number(subloteId),
              linea_id: Number(lineaId),
            });
            reasignadas = asig.cantidad_asignadas ?? sinLineaTotal;
          } else {
            const PER = 1000;
            const totalPaginas = Math.ceil(aReasignar / PER);
            const fetches = Array.from({ length: totalPaginas }, (_, i) =>
              palmasApi.listar({
                sublote_id: Number(subloteId),
                sin_linea: true,
                per_page: PER,
                page: i + 1,
              })
            );
            const listados = await Promise.all(fetches);
            const palmas_ids = listados
              .flatMap(r => r.data ?? [])
              .slice(0, aReasignar)
              .map((p: any) => Number(p.id))
              .filter((n: number) => Number.isFinite(n));

            if (palmas_ids.length > 0) {
              const asig = await palmasApi.asignarLineaMasivo({
                sublote_id: Number(subloteId),
                linea_id: Number(lineaId),
                palmas_ids,
              });
              reasignadas = asig.cantidad_asignadas ?? palmas_ids.length;
            }
          }
          if (reasignadas > 0) {
            aCrear = Math.max(0, cant - reasignadas);
            // El total del sublote NO cambia (solo se reasigna), pero el de la
            // línea SÍ. Actualizamos local para que el resumen lo refleje YA.
            setLineas(prev => prev.map(ln =>
              ln.id === lineaId
                ? { ...ln, cantidadPalmas: (ln.cantidadPalmas ?? 0) + reasignadas }
                : ln,
            ));
          }
        }
      }

      // ── Crear nuevas palmas sólo si quedan después de reasignar (o si no hay línea)
      if (aCrear > 0) {
        const body: any = { sublote_id: Number(subloteId), cantidad_palmas: aCrear };
        if (lineaId) body.linea_id = Number(lineaId);
        const res = await palmasApi.crear(body);

        if (res.async === true) {
          // >5000 palmas → async, polling §4.7 con progreso suavizado.
          // Optimismo: actualizamos el contador local AL INSTANTE para que la
          // UI no quede congelada en el valor viejo durante el polling.
          setSublotes(prev => prev.map(s =>
            s.id === subloteId ? { ...s, cantidadPalmas: s.cantidadPalmas + aCrear } : s
          ));

          const resultado = await pollBatch(res.batch_id, aCrear, 'Creando', update);
          if (resultado !== 'ok') {
            // Revertir optimismo local.
            setSublotes(prev => prev.map(s =>
              s.id === subloteId ? { ...s, cantidadPalmas: Math.max(0, s.cantidadPalmas - aCrear) } : s
            ));
            const errMsg = resultado === 'timeout'
              ? 'El proceso tardó demasiado. Puede seguir en segundo plano; recarga en unos minutos.'
              : 'No se pudieron crear las palmas. Intenta de nuevo.';
            toast.error(errMsg);
            // Lanzamos para que el caller (guardarTodo) sepa que falló y no
            // muestre "Cambios guardados" engañosamente.
            throw new Error(errMsg);
          }
          // Actualizar contador de la línea (si aplica) tras éxito del job
          if (lineaId) {
            setLineas(prev => prev.map(ln =>
              ln.id === lineaId
                ? { ...ln, cantidadPalmas: (ln.cantidadPalmas ?? 0) + aCrear }
                : ln,
            ));
          }
        } else {
          // <=5000 → sync
          const creadas = res.cantidad_creada ?? aCrear;
          setSublotes(prev => prev.map(s =>
            s.id === subloteId ? { ...s, cantidadPalmas: s.cantidadPalmas + creadas } : s
          ));
          // Contador de la línea también
          if (lineaId) {
            setLineas(prev => prev.map(ln =>
              ln.id === lineaId
                ? { ...ln, cantidadPalmas: (ln.cantidadPalmas ?? 0) + creadas }
                : ln,
            ));
          }
        }
      }

      // ── Mensaje final unificado ──────────────────────────────────────────
      if (reasignadas > 0 && aCrear > 0) {
        toast.success(
          `${reasignadas.toLocaleString('es-CO')} palmas reasignadas + ${aCrear.toLocaleString('es-CO')} creadas en la línea`,
        );
      } else if (reasignadas > 0) {
        toast.success(`${reasignadas.toLocaleString('es-CO')} palmas asignadas a la línea`);
      } else {
        toast.success(`${aCrear.toLocaleString('es-CO')} palmas creadas`);
      }

      if (editId) await refrescarResumen(editId);
      if (lineaId) {
        setWizardPag(prev => { const n = { ...prev }; delete n[`linea_${lineaId}`]; return n; });
        // Refrescar palmas de la línea afectada para que se vean inmediatamente
        cargarWizardPalmas(`linea_${lineaId}`, {
          sublote_id: Number(subloteId),
          linea_id: Number(lineaId),
        });
      }

      // Limpiar input
      if (lineaId) {
        setCantPalmasForm(prev => ({ ...prev, [`${subloteId}_${lineaId}`]: '' }));
      } else {
        setCantPalmasForm(prev => ({ ...prev, [subloteId]: '' }));
      }
    } catch (err) {
      // Si el error vino del polling (ya mostró su propio toast), no duplicar.
      // Errores de otro origen sí necesitan toast genérico.
      const mensajeYaMostrado =
        err instanceof Error && (
          err.message.includes('procesando trabajos') ||
          err.message.includes('tardó demasiado') ||
          err.message.includes('No se pudieron crear')
        );
      if (!mensajeYaMostrado) {
        toast.error(err instanceof Error ? err.message : 'Error al asignar/crear palmas');
      }
      // CRÍTICO: re-lanzar para que el caller (guardarTodo) cuente el fallo
      // y no muestre "Cambios guardados" engañosamente.
      throw err;
    }
  });

  // ── Guardar todo (modo creación) ──────────────────────────────────────────
  /**
   * Guarda todos los cambios.
   * - `redirigir = false` (default) → permanece en el wizard (botón "Guardar cambios").
   * - `redirigir = true`            → navega a `/plantacion` al terminar (botón "Finalizar").
   */
  const guardarTodo = async (redirigir = false) => {
    if (guardando) return;
    if (!predioNombre.trim()) { toast.error('El nombre del predio es obligatorio'); return; }
    if (!predioUbicacion.trim()) { toast.error('La ubicación es obligatoria'); return; }
    if (!predioHectareas || Number(predioHectareas) <= 0) { toast.error('Las hectáreas son obligatorias'); return; }

    setGuardando(true);
    try {
      if (editId) {
        // §1.4 Actualizar datos del predio
        await prediosApi.editar(Number(editId), {
          nombre: predioNombre.trim().slice(0, 50),
          ubicacion: predioUbicacion.trim().slice(0, 100),
          hectareas_totales: Number(predioHectareas),
        });

        // ── Persistir palmas pendientes (sublotes sin líneas) ────────────────
        // El usuario pudo haber editado el "Número de Palmas" en el paso 5.
        // Solo se aceptan deltas POSITIVOS (crear palmas nuevas). Para reducir
        // hay que eliminar palmas individuales desde la grilla (cuando hay líneas).
        const sublotesPendientes = sublotes
          .filter(sub => {
            const linSub = lineas.filter(ln => ln.subloteId === sub.id);
            const tieneLineas = linSub.length > 0;
            if (tieneLineas) return false; // CASO A se maneja inline
            const raw = cantPalmasForm[sub.id];
            if (raw === undefined || raw === '') return false;
            const target = parseInt(raw);
            if (!Number.isFinite(target)) return false;
            return target !== sub.cantidadPalmas;
          })
          .map(sub => ({
            sub,
            target: parseInt(cantPalmasForm[sub.id] ?? ''),
            delta:  parseInt(cantPalmasForm[sub.id] ?? '') - sub.cantidadPalmas,
          }));

        // Procesa cada sublote pendiente: incrementos crean palmas, reducciones
        // ajustan el total vía PUT /sublotes/{id} (el backend elimina las palmas
        // con los códigos más altos — ver API §3.4).
        let fallosBatch = 0;
        for (const { sub, target, delta } of sublotesPendientes) {
          if (delta === 0) continue;
          if (delta > 0) {
            try {
              await agregarPalmas(sub.id, delta, undefined);
            } catch {
              fallosBatch++;
              // agregarPalmas ya mostró su propio toast de error específico.
            }
          } else {
            // Reducción: PUT /sublotes/{id} con target = nuevo total.
            // El backend (§3.4) elimina las palmas con los códigos más altos.
            // - <= 5.000 → sync (rápido).
            // - >  5.000 → async (respuesta trae palmas_async + batch_id).
            //   Polling con palmasApi.getBatch hasta finished.
            const aEliminar = Math.abs(delta);
            setProcesando(p => p + 1);
            setProcesandoMsg(`Eliminando ${aEliminar.toLocaleString('es-CO')} palmas de "${sub.nombre}"...`);
            try {
              const res = await sublotesApi.editar(Number(sub.id), { cantidad_palmas: target });

              if (res.palmas_async && res.batch_id) {
                // Path async: polling tolerante con barra de progreso suavizada.
                const resultado = await pollBatch(
                  res.batch_id, aEliminar, 'Eliminando', setProcesandoMsg,
                );
                if (resultado !== 'ok') {
                  toast.error(
                    resultado === 'timeout'
                      ? `Tardó demasiado en "${sub.nombre}". Puede seguir en segundo plano.`
                      : `No se pudieron eliminar palmas en "${sub.nombre}". Intenta de nuevo.`,
                  );
                  throw new Error('Batch fallido');
                }
              }

              setSublotes(prev => prev.map(s =>
                s.id === sub.id ? { ...s, cantidadPalmas: target } : s,
              ));
              toast.success(`${aEliminar.toLocaleString('es-CO')} palmas eliminadas en "${sub.nombre}"`);
            } catch (err: any) {
              fallosBatch++;
              if (err?.code === 'BATCH_EN_CURSO') {
                toast.error(`Hay un proceso en curso en "${sub.nombre}". Espera unos segundos.`);
              } else if (err?.message !== 'Batch fallido') {
                toast.error(err instanceof Error ? err.message : `No se pudieron eliminar palmas del sublote "${sub.nombre}"`);
              }
            } finally {
              setProcesando(p => Math.max(0, p - 1));
            }
          }
        }

        // Limpiar inputs y recargar resumen
        if (sublotesPendientes.length > 0) {
          setCantPalmasForm(prev => {
            const n = { ...prev };
            sublotesPendientes.forEach(({ sub }) => { delete n[sub.id]; });
            return n;
          });
          await refrescarResumen(editId);
        }

        if (fallosBatch === 0) {
          toast.success('Cambios guardados');
        } else {
          toast.error(`Algunos cambios fallaron (${fallosBatch}). Revisa los mensajes anteriores.`);
        }
        // Refresco final para reflejar todo lo persistido y dejar al usuario
        // en la misma etapa del wizard.
        await refrescarResumen(editId);

        // Si vino del botón "Finalizar" y todo salió bien, salimos al listado.
        if (redirigir && fallosBatch === 0) {
          navigate('/plantacion');
        }
        return;
      }

      // §1.3 Crear predio
      const predioRes = await prediosApi.crear({
        nombre: predioNombre.trim().slice(0, 50),
        ubicacion: predioUbicacion.trim().slice(0, 100),
        hectareas_totales: Number(predioHectareas),
      });
      const predioId = predioRes.data?.id;
      if (!predioId) throw new Error('No se recibió ID del predio');

      // §2.3 Crear lotes
      for (const lote of lotes) {
        const loteBody: any = { predio_id: predioId, nombre: lote.nombre };
        if (lote.fechaSiembra)         loteBody.fecha_siembra = lote.fechaSiembra;
        if (lote.hectareasSembradas > 0) loteBody.hectareas_sembradas = lote.hectareasSembradas;
        if (lote.semillasIds.length > 0) loteBody.semillas_ids = lote.semillasIds;
        const loteRes = await lotesApi.crear(loteBody);
        const loteIdReal = loteRes.data?.id;
        if (!loteIdReal) throw new Error(`Sin ID para lote ${lote.nombre}`);

        // §3.3 Crear sublotes del lote
        const sublotesDelLote = sublotes.filter(s => s.loteId === lote.id);
        for (const sub of sublotesDelLote) {
          const lineasDelSublote = lineas.filter(ln => ln.subloteId === sub.id);
          const tieneLineasSub = lineasDelSublote.length > 0;
          const entries = palmasEntries[sub.id] ?? [];

          const subBody: any = { lote_id: loteIdReal, nombre: sub.nombre };

          // Si NO tiene líneas, podemos enviar cantidad_palmas en el POST de sublote
          // (el backend crea las palmas automáticamente sin línea).
          if (!tieneLineasSub) {
            const totalSinLinea = entries.reduce((acc, e) => acc + e.cantidad, 0);
            const cantFinal = sub.cantidadPalmas > 0 ? sub.cantidadPalmas : totalSinLinea;
            if (cantFinal > 0) subBody.cantidad_palmas = cantFinal;
          }

          const subRes = await sublotesApi.crear(subBody);
          const subloteIdReal = subRes.data?.id;

          // §5.3 Crear líneas del sublote y mapear su id local → id real
          const lineaIdMap: Record<string, number> = {};
          if (subloteIdReal && tieneLineasSub) {
            for (const ln of lineasDelSublote) {
              const lineaRes = await lineasApi.crear({
                sublote_id: Number(subloteIdReal),
                numero: ln.numero,
              });
              if (lineaRes.data?.id) lineaIdMap[ln.id] = Number(lineaRes.data.id);
            }
          }

          // §4.3 Crear palmas según las entradas del paso 5 (cuando hay líneas o entradas sin línea)
          if (subloteIdReal && tieneLineasSub && entries.length > 0) {
            for (const entry of entries) {
              if (entry.cantidad <= 0) continue;
              const body: any = {
                sublote_id: Number(subloteIdReal),
                cantidad_palmas: entry.cantidad,
              };
              if (entry.lineaId && lineaIdMap[entry.lineaId]) {
                body.linea_id = lineaIdMap[entry.lineaId];
              }
              try { await palmasApi.crear(body); } catch (e) {
                console.warn(`Error creando palmas del sublote ${sub.nombre}:`, e);
              }
            }
          }
        }
      }

      toast.success(`Plantación creada: ${lotes.length} lote(s), ${sublotes.length} sublote(s), ${lineas.length} línea(s)`);
      navigate('/plantacion');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally { setGuardando(false); }
  };

  // ── Hectáreas disponibles (local, para validación) ─────────────────────────
  const haUsadas = lotes.reduce((s, l) => s + l.hectareasSembradas, 0);
  const haDisponibles = (Number(predioHectareas) || 0) - haUsadas;

  // ── Validaciones por etapa ─────────────────────────────────────────────────
  const puedeSiguiente = [
    predioNombre.trim() && predioUbicacion.trim() && Number(predioHectareas) > 0,
    lotes.length > 0,
    sublotes.length > 0,
    true,  // líneas opcionales
    true,  // palmas opcionales
  ][etapa - 1];

  // ── Avance entre etapas con persistencia en backend ───────────────────────
  // Cuando el usuario pasa del paso 1 (Predio) al 2 en modo creación,
  // creamos el predio en backend y convertimos el wizard a modo edición
  // mediante ?edit=<id>. Así, si el usuario regresa al paso 1 los datos
  // siguen ahí y los pasos 2-5 ya pueden persistir contra el predio real.
  const [avanzando, setAvanzando] = useState(false);
  const siguienteEtapa = async () => {
    if (avanzando) return;
    if (!puedeSiguiente) return;

    // Solo el paso 1 en modo creación requiere guardado previo.
    if (etapa === 1 && !editId) {
      // Validaciones (mismas que guardarTodo)
      if (!predioNombre.trim())                       { toast.error('El nombre del predio es obligatorio'); return; }
      if (!predioUbicacion.trim())                    { toast.error('La ubicación es obligatoria'); return; }
      if (!predioHectareas || Number(predioHectareas) <= 0) { toast.error('Las hectáreas son obligatorias'); return; }

      setAvanzando(true);
      try {
        const res = await prediosApi.crear({
          nombre: predioNombre.trim().slice(0, 50),
          ubicacion: predioUbicacion.trim().slice(0, 100),
          hectareas_totales: Number(predioHectareas),
        });
        const nuevoId = res.data?.id;
        if (!nuevoId) throw new Error('No se recibió ID del predio');
        toast.success('Predio guardado. Continúa con los lotes.');
        // Conmutar a modo edición y avanzar al paso 2. Ambos viajan en la URL
        // para sobrevivir a refresh/back del navegador.
        setEtapa(2);
        navigate(`/plantacion/predio/nuevo?edit=${nuevoId}&paso=2`, { replace: true });
        return;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo guardar el predio');
        return;
      } finally {
        setAvanzando(false);
      }
    }

    setEtapa(e => e + 1);
  };

  // ── Panel resumen (derecha) ────────────────────────────────────────────────
  // SIEMPRE se calcula desde el estado local (lotes, sublotes, lineas) para
  // que cualquier cambio del wizard (crear/editar/eliminar/agregar palmas)
  // se refleje al instante sin esperar al cache del backend.
  const PanelResumen = () => {
    if (false as boolean) {
      // Dead code (era la rama que leía del backend resumen). Se conserva
      // para no romper el cierre del componente; el render real está abajo.
      const pr: any = resumen?.predio ?? {};
      const tg: any = resumen?.totales_generales ?? {};
      const ls: any[] = resumen?.lotes ?? [];
      return (
        <div className="space-y-6">
          {/* Progreso */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progreso</span>
              <span className="font-semibold">{etapa} de {ETAPAS.length}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(etapa / ETAPAS.length) * 100}%` }} />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Predio */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Predio</h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Nombre</span>
                <span className="font-semibold text-sm">{pr.nombre}</span>
              </div>
              {pr.ubicacion && (
                <div className="flex items-center justify-between">
                  <span className="text-sm shrink-0">Ubicación</span>
                  <span className="font-semibold text-sm ml-2 text-right break-words">{pr.ubicacion}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm">Hectáreas</span>
                <span className="font-semibold text-sm">{Number(pr.hectareas_totales ?? 0).toFixed(1)} ha</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Disponibles</span>
                <span className="font-semibold text-xs text-accent">{Number(pr.hectareas_disponibles ?? 0).toFixed(2)} ha</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Resumen detallado */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Resumen Detallado</h4>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {ls.map((l: any) => (
                <div key={l.id} className="border border-border rounded-lg p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span className="font-semibold text-sm">{l.nombre}</span>
                    <span className="text-xs text-muted-foreground">{Number(l.hectareas_sembradas ?? 0).toFixed(1)} ha</span>
                  </div>
                  {(l.sublotes ?? []).length > 0 ? (
                    <div className="space-y-1">
                      {(l.sublotes ?? []).map((s: any) => {
                        // Palmas: backend a veces devuelve s.totales.palmas en 0.
                        // Fallback: cantidad_palmas del propio sublote o el sublote local.
                        const palmasSublote =
                          s.totales?.palmas ??
                          s.cantidad_palmas ??
                          sublotes.find(loc => loc.id === String(s.id))?.cantidadPalmas ??
                          0;
                        const linCount = s.totales?.lineas ?? lineas.filter(ln => ln.subloteId === String(s.id)).length;
                        return (
                          <div key={s.id} className="flex items-center justify-between py-1 text-xs">
                            <span className="text-left">{s.nombre}</span>
                            <div className="flex items-center gap-3 text-xs">
                              {linCount > 0 && (
                                <span className="text-muted-foreground">{linCount} líneas</span>
                              )}
                              <span className="text-success font-semibold">{Number(palmasSublote).toLocaleString('es-CO')} palmas</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin sublotes</p>
                  )}
                  {(() => {
                    // Totales del lote: prioriza backend, sino suma localmente
                    const subCount   = l.totales?.sublotes ?? (l.sublotes ?? []).length;
                    const lineCount  = l.totales?.lineas ?? (l.sublotes ?? []).reduce(
                      (acc: number, s: any) => acc + (s.totales?.lineas ?? lineas.filter(ln => ln.subloteId === String(s.id)).length),
                      0,
                    );
                    const palmasLote = l.totales?.palmas ?? l.cantidad_palmas ?? (l.sublotes ?? []).reduce(
                      (acc: number, s: any) => acc + Number(
                        s.totales?.palmas ??
                        s.cantidad_palmas ??
                        sublotes.find(loc => loc.id === String(s.id))?.cantidadPalmas ??
                        0,
                      ),
                      0,
                    );
                    return (
                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                        <span className="font-medium">Totales del lote</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{subCount} sublotes</span>
                          {lineCount > 0 && (
                            <span className="text-muted-foreground">{lineCount} líneas</span>
                          )}
                          <span className="text-success font-semibold">{Number(palmasLote).toLocaleString('es-CO')} palmas</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}

              {ls.length > 0 && (() => {
                // Totales generales: prioriza backend, sino calcula desde los lotes.
                const lotesTotal    = tg.lotes    ?? ls.length;
                const sublotesTotal = tg.sublotes ?? ls.reduce(
                  (acc: number, l: any) => acc + (l.totales?.sublotes ?? (l.sublotes ?? []).length),
                  0,
                );
                const lineasTotal   = tg.lineas   ?? ls.reduce(
                  (acc: number, l: any) => acc + (l.sublotes ?? []).reduce(
                    (a2: number, s: any) => a2 + (s.totales?.lineas ?? lineas.filter(ln => ln.subloteId === String(s.id)).length),
                    0,
                  ),
                  0,
                );
                const palmasTotal   = tg.palmas ?? ls.reduce(
                  (acc: number, l: any) => acc + (l.totales?.palmas ?? l.cantidad_palmas ?? (l.sublotes ?? []).reduce(
                    (a2: number, s: any) => a2 + Number(
                      s.totales?.palmas ??
                      s.cantidad_palmas ??
                      sublotes.find(loc => loc.id === String(s.id))?.cantidadPalmas ??
                      0,
                    ),
                    0,
                  )),
                  0,
                );
                return (
                  <div className="border-2 border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
                    <h5 className="font-semibold text-sm flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" /> Totales Generales
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded bg-background/50">
                        <span className="text-muted-foreground">Lotes</span>
                        <span className="font-bold">{lotesTotal}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-background/50">
                        <span className="text-muted-foreground">Sublotes</span>
                        <span className="font-bold">{sublotesTotal}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-background/50">
                        <span className="text-muted-foreground">Líneas</span>
                        <span className="font-bold">{lineasTotal}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-success/10">
                        <span className="text-muted-foreground">Palmas</span>
                        <span className="font-bold text-success">{Number(palmasTotal).toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {ls.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Grid3x3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aún no hay lotes registrados</p>
                  <p className="text-xs">Agrega tu primer lote en el paso actual</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Modo creación: estado local
    const totalPalmasCreacion = sublotes.reduce((sum, s) => {
      const cant = totalPalmasSublote(s.id) || s.cantidadPalmas || 0;
      return sum + cant;
    }, 0);

    return (
      <div className="space-y-6">
        {/* Progreso */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-semibold">{etapa} de {ETAPAS.length}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(etapa / ETAPAS.length) * 100}%` }} />
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Predio */}
        {predioNombre && (
          <>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Predio</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Nombre</span>
                  <span className="font-semibold text-sm">{predioNombre}</span>
                </div>
                {predioUbicacion && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm shrink-0">Ubicación</span>
                    <span className="font-semibold text-sm ml-2 text-right break-words">{predioUbicacion}</span>
                  </div>
                )}
                {predioHectareas && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Hectáreas</span>
                    <span className="font-semibold text-sm">{Number(predioHectareas).toFixed(1)} ha</span>
                  </div>
                )}
                {lotes.length > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Disponibles</span>
                    <span className="font-semibold text-xs text-accent">{haDisponibles.toFixed(2)} ha</span>
                  </div>
                )}
              </div>
            </div>
            <div className="h-px bg-border" />
          </>
        )}

        {/* Resumen Detallado */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Resumen Detallado</h4>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {lotes.map(lote => {
              const sublotesDelLote = sublotes.filter(s => s.loteId === lote.id);
              const lineasDelLote   = lineas.filter(ln => sublotesDelLote.some(s => s.id === ln.subloteId));
              const palmasDelLote   = sublotesDelLote.reduce((sum, s) => {
                return sum + (totalPalmasSublote(s.id) || s.cantidadPalmas || 0);
              }, 0);

              return (
                <div key={lote.id} className="border border-border rounded-lg p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span className="font-semibold text-sm">{lote.nombre}</span>
                    <span className="text-xs text-muted-foreground">{lote.hectareasSembradas} ha</span>
                  </div>

                  {sublotesDelLote.length > 0 ? (
                    <div className="space-y-1">
                      {sublotesDelLote.map(s => {
                        const linSub = lineas.filter(ln => ln.subloteId === s.id);
                        const palSub = totalPalmasSublote(s.id) || s.cantidadPalmas || 0;
                        return (
                          <div key={s.id} className="flex items-center justify-between py-1 text-xs">
                            <span className="text-left">{s.nombre}</span>
                            <div className="flex items-center gap-3 text-xs">
                              {linSub.length > 0 && (
                                <span className="text-muted-foreground">{linSub.length} líneas</span>
                              )}
                              <span className="text-success font-semibold">{palSub} palmas</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin sublotes</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <span className="font-medium">Totales del lote</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{sublotesDelLote.length} sublotes</span>
                      {lineasDelLote.length > 0 && (
                        <span className="text-muted-foreground">{lineasDelLote.length} líneas</span>
                      )}
                      <span className="text-success font-semibold">{palmasDelLote} palmas</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {lotes.length > 0 && (
              <div className="border-2 border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
                <h5 className="font-semibold text-sm">Totales Generales</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Lotes</span>
                    <span className="font-bold">{lotes.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Sublotes</span>
                    <span className="font-bold">{sublotes.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Líneas</span>
                    <span className="font-bold">{lineas.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-success/10">
                    <span className="text-muted-foreground">Palmas</span>
                    <span className="font-bold text-success">{totalPalmasCreacion}</span>
                  </div>
                </div>
              </div>
            )}

            {lotes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Grid3x3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aún no hay lotes registrados</p>
                <p className="text-xs">Agrega tu primer lote en el paso actual</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 relative">
      {/* Overlay full-page con pill centrada (estilo toast loading).
          Bloquea toda la pantalla para:
            - carga inicial del predio,
            - mutaciones puntuales (lote/sublote/línea),
            - agregar/eliminar palmas con progreso en vivo,
            - guardar/finalizar el wizard. */}
      {(cargandoPredio || procesando > 0 || guardando) && createPortal(
        <div
          className="flex items-center justify-center"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-3 shadow-xl">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm font-medium">
              {cargandoPredio
                ? 'Cargando datos de la plantación...'
                : (procesando > 0 ? procesandoMsg : 'Guardando cambios...')}
            </span>
          </div>
        </div>,
        document.body,
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/plantacion')} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold text-foreground">{editId ? 'Editar Plantación' : 'Crear Nueva Plantación'}</h1>
          </div>
          <p className="text-muted-foreground ml-14">Configura tu plantación paso a paso</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Columna izquierda: wizard ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Stepper horizontal — exacto al diseño del .zip */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {ETAPAS.map((e, idx) => {
                  const completa = etapa > e.numero;
                  const activa   = etapa === e.numero;
                  return (
                    <React.Fragment key={e.numero}>
                      {/* Círculo de etapa */}
                      <button
                        onClick={() => (editId || completa || activa) && setEtapa(e.numero)}
                        className={`flex flex-col items-center gap-2 ${
                          activa || completa || editId ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}
                        disabled={!editId && !activa && !completa}
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                            completa
                              ? 'bg-primary border-primary text-white'
                              : activa
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-muted border-border text-muted-foreground'
                          }`}
                        >
                          {completa ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <span className="font-bold">{e.numero}</span>
                          )}
                        </div>
                        <div className="text-center">
                          <div
                            className={`text-sm font-semibold whitespace-nowrap ${
                              activa || completa ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {e.nombre}
                          </div>
                        </div>
                      </button>

                      {/* Línea conectora */}
                      {idx < ETAPAS.length - 1 && (
                        <div className="flex-1 h-0.5 bg-border relative mx-4">
                          <div
                            className={`absolute inset-0 bg-primary transition-all ${
                              completa ? 'w-full' : 'w-0'
                            }`}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Paso 1: Predio ──────────────────────────────────────── */}
          {etapa === 1 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Información del Predio</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ingresa los datos básicos de tu predio
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Predio *</Label>
                    <Input id="nombre" placeholder="Ej: Predio Norte" maxLength={50}
                      value={predioNombre} onChange={e => setPredioNombre(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Select
                      value={deptoSel || undefined}
                      onValueChange={(v) => { setDeptoSel(v); setMunSel(''); }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map(d => (
                          <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Municipio</Label>
                    <Select
                      value={munSel || undefined}
                      onValueChange={setMunSel}
                      disabled={!deptoSel}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {municipios.map(m => (
                          <SelectItem key={m.codigo} value={m.codigo}>{m.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hectareas">Hectáreas Totales *</Label>
                    <Input id="hectareas" type="number" min="0" step="0.01" placeholder="0"
                      value={predioHectareas} onChange={e => setPredioHectareas(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Paso 2: Lotes ───────────────────────────────────────── */}
          {etapa === 2 && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lotes del Predio</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Hectáreas disponibles: {haDisponibles.toFixed(2)} ha
                    </p>
                  </div>
                  <Button onClick={() => setShowFormLote(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Agregar Lote
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {lotes.map(l => (
                  <div key={l.id} className="border border-border rounded-lg p-4 bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{l.nombre}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {l.fechaSiembra
                              ? (() => { const s = l.fechaSiembra; const d = new Date(s.includes('T') ? s : s + 'T00:00:00'); return isNaN(d.getTime()) ? s : d.toLocaleDateString('es-CO'); })()
                              : 'Sin fecha'}
                          </span>
                          <span>•</span>
                          <span>{l.hectareasSembradas} ha</span>
                          {l.semillasIds.length > 0 && (
                            <span className="flex items-center gap-1">• {l.semillasIds.length} semilla{l.semillasIds.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon"
                          onClick={() => {
                            setEditingLoteId(l.id);
                            setShowFormLote(false); // cerrar form de creación si estaba abierto
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Editar lote">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setPendienteEliminar({ tipo: 'lote', id: l.id, nombre: l.nombre })}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Eliminar lote">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {(l.variedad || l.semillasIds.length > 0) && (
                      <Badge variant="secondary" className="text-xs">
                        {l.variedad || `${l.semillasIds.length} semilla${l.semillasIds.length !== 1 ? 's' : ''}`}
                      </Badge>
                    )}
                    {/* Form inline de edición del lote */}
                    {editingLoteId === l.id && (
                      <div className="mt-4">
                        <FormLote
                          semillasCatalogo={semillasCatalogo}
                          haDisponibles={haDisponibles + l.hectareasSembradas}
                          loteInicial={l}
                          onGuardar={(datos) => actualizarLote(l.id, datos as Omit<LoteLocal, 'id'>)}
                          onCancelar={() => setEditingLoteId(null)} />
                      </div>
                    )}
                  </div>
                ))}
                {lotes.length === 0 && !showFormLote && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Grid3x3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No hay lotes registrados</p>
                    <p className="text-sm">Agrega tu primer lote para continuar</p>
                  </div>
                )}
                {showFormLote && (
                  <div ref={formLoteRef} className="scroll-mt-24">
                    <FormLote
                      semillasCatalogo={semillasCatalogo}
                      haDisponibles={haDisponibles}
                      onGuardar={agregarLote}
                      onCancelar={() => setShowFormLote(false)} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Paso 3: Sublotes ────────────────────────────────────── */}
          {etapa === 3 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Sublotes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Organiza tus lotes en sublotes
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {lotes.map(lote => {
                  const subls = sublotes.filter(s => s.loteId === lote.id);
                  return (
                    <div key={lote.id} className="border border-border rounded-xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{lote.nombre}</h3>
                          <p className="text-sm text-muted-foreground">{subls.length} sublotes</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowFormSublote(lote.id)} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Agregar Sublote
                        </Button>
                      </div>
                      {/* Form de edición de sublote — ARRIBA del grid para no deformar las cards */}
                      {(() => {
                        const subEditando = subls.find(s => s.id === editingSubloteId);
                        if (!subEditando) return null;
                        return (
                          <div
                            ref={(el) => { formSubloteRefs.current[`edit-${subEditando.id}`] = el; }}
                            className="scroll-mt-24"
                          >
                            <FormSublote
                              nombreInicial={subEditando.nombre}
                              onGuardar={nombre => actualizarSublote(subEditando.id, nombre)}
                              onCancelar={() => setEditingSubloteId(null)} />
                          </div>
                        );
                      })()}
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {subls
                          .filter(s => s.id !== editingSubloteId)
                          .map(s => (
                          <div key={s.id} className="border border-border rounded-lg p-4 bg-card">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold">{s.nombre}</h4>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon"
                                  onClick={() => {
                                    setEditingSubloteId(s.id);
                                    setShowFormSublote(null);
                                  }}
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  title="Editar sublote">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setPendienteEliminar({ tipo: 'sublote', id: s.id, nombre: s.nombre })}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  title="Eliminar sublote">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            {s.cantidadPalmas > 0 && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Leaf className="h-3 w-3" />
                                <span>{s.cantidadPalmas} palmas</span>
                              </div>
                            )}
                            <Badge variant="default" className="mt-2 text-xs">Activo</Badge>
                          </div>
                        ))}
                      </div>
                      {showFormSublote === lote.id && (
                        <div
                          ref={(el) => { formSubloteRefs.current[lote.id] = el; }}
                          className="scroll-mt-24"
                        >
                          <FormSublote
                            onGuardar={nombre => agregarSublote(lote.id, nombre)}
                            onCancelar={() => setShowFormSublote(null)} />
                        </div>
                      )}
                    </div>
                  );
                })}
              {lotes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Trees className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Primero debes crear al menos un lote</p>
                </div>
              )}
              </CardContent>
            </Card>
          )}

          {/* ── Paso 4: Líneas (opcional) ───────────────────────────── */}
          {etapa === 4 && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Líneas</CardTitle>
                  <Badge variant="secondary" className="bg-accent/10 text-accent">
                    Opcional
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Las líneas son opcionales. Las palmas se pueden agregar directamente a los sublotes.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {sublotes.map(sub => {
                  const linSub = lineas.filter(ln => ln.subloteId === sub.id);
                  const lote   = lotes.find(l => l.id === sub.loteId);
                  return (
                    <div key={sub.id} className="border border-border rounded-xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{sub.nombre}</h3>
                          <p className="text-sm text-muted-foreground">{lote?.nombre} • {linSub.length} líneas</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // En edición con palmas → preguntar cuántas asignar.
                            const palmasEnLineas = linSub.reduce(
                              (s, ln) => s + (ln.cantidadPalmas ?? 0), 0,
                            );
                            const disponibles = Math.max(0, sub.cantidadPalmas - palmasEnLineas);
                            if (editId && disponibles > 0) {
                              setNuevaLineaPrompt({
                                subloteId: sub.id,
                                subloteNombre: sub.nombre,
                                disponibles,
                                cantidadInput: '',
                              });
                            } else {
                              // En creación o sin palmas para asignar → línea vacía
                              agregarLinea(sub.id, 0);
                            }
                          }}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar Línea
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                        {linSub.map(ln => (
                          <div key={ln.id} className="border border-border rounded-lg p-3 bg-card">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <GitBranch className="h-4 w-4 text-accent" />
                                <span className="font-semibold text-sm">Línea {ln.numero}</span>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => setPendienteEliminar({ tipo: 'linea', id: ln.id, numero: ln.numero })}
                                className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <Badge variant="default" className="mt-2 text-xs">Activo</Badge>
                          </div>
                        ))}
                      </div>
                      {linSub.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">No hay líneas en este sublote</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              {sublotes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Primero debes crear sublotes</p>
                </div>
              )}

              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <p className="text-sm text-muted-foreground text-center">
                  💡 <strong>Tip:</strong> Puedes omitir este paso y agregar palmas directamente a los sublotes en la siguiente etapa.
                </p>
              </div>
              </CardContent>
            </Card>
          )}

          {/* ── Paso 5: Palmas ──────────────────────────────────────── */}
          {etapa === 5 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Registrar Palmas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {sublotes.map(sub => {
                  const lote   = lotes.find(l => l.id === sub.loteId);
                  const linSub = lineas.filter(ln => ln.subloteId === sub.id);
                  const tieneLineas = linSub.length > 0;
                  const PER = 50;

                  // Form a nivel de sublote (modo edición con líneas).
                  // Permite elegir cantidad + línea desde un único botón en la
                  // cabecera del sublote, en lugar de uno por línea.
                  const subFormKey = `sub_form_${sub.id}`;
                  const subFormAbierto = mostrandoFormPalmas === subFormKey;
                  const cantField = `edit_${subFormKey}`;
                  const lineaField = `edit_${subFormKey}_linea`;
                  const cantValue = cantPalmasForm[cantField] ?? '';
                  const lineaSel = cantPalmasForm[lineaField] ?? '';
                  // Cuántas palmas del sublote NO están asignadas a ninguna línea.
                  // Estas son las que se pueden "asignar" (reusar) a una línea.
                  const palmasEnLineas = linSub.reduce(
                    (s, ln) => s + (ln.cantidadPalmas ?? 0), 0,
                  );
                  const disponiblesSinLinea = Math.max(0, sub.cantidadPalmas - palmasEnLineas);

                  return (
                    <div key={sub.id} className="border border-border rounded-xl p-6 space-y-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-lg">{sub.nombre}</h3>
                          <p className="text-sm text-muted-foreground">
                            {lote?.nombre}
                          </p>
                        </div>
                        {editId && tieneLineas && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setMostrandoFormPalmas(subFormAbierto ? null : subFormKey);
                              setCantPalmasForm(prev => ({
                                ...prev,
                                [cantField]: '',
                                [lineaField]: '',
                              }));
                            }}
                            className="gap-1 bg-success hover:bg-success/90 text-primary hover:text-primary"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar Palmas
                          </Button>
                        )}
                      </div>

                      {/* Form de "Agregar palmas" a nivel de sublote (cantidad + línea) */}
                      {editId && tieneLineas && subFormAbierto && (
                        <div
                          ref={(el) => { formPalmasRefs.current[subFormKey] = el; }}
                          className="bg-muted/10 border border-border rounded-lg p-4 space-y-3 scroll-mt-24"
                        >
                          <div className="space-y-2">
                            <Label className="text-sm">Cantidad de palmas</Label>
                            <Input
                              type="number" step="0.001"
                              placeholder="Ej: 50"
                              min="0"
                              max={disponiblesSinLinea > 0 ? disponiblesSinLinea : undefined}
                              value={cantValue}
                              onChange={e => {
                                const v = e.target.value;
                                const safe = v === '' ? '' : (Number(v) < 0 ? '0' : v);
                                setCantPalmasForm(prev => ({ ...prev, [cantField]: safe }));
                              }}
                              autoFocus
                            />
                            {disponiblesSinLinea > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Disponibles sin línea: <span className="font-semibold text-foreground">{disponiblesSinLinea.toLocaleString('es-CO')}</span> palmas.
                                Se reasignarán de las ya existentes en el sublote.
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                No hay palmas sin línea. Las que ingreses se crearán nuevas.
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Línea</Label>
                            <select
                              value={lineaSel}
                              onChange={e => setCantPalmasForm(prev => ({ ...prev, [lineaField]: e.target.value }))}
                              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="">Seleccionar línea...</option>
                              {linSub.map(ln => (
                                <option key={ln.id} value={ln.id}>Línea {ln.numero}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                const cant = parseInt(cantValue);
                                if (!cant || cant < 1) { toast.error('Ingresa una cantidad válida'); return; }
                                if (!lineaSel) { toast.error('Selecciona una línea'); return; }
                                // Si hay palmas sin línea, NO permitir crear nuevas:
                                // sólo reasignar de las ya existentes.
                                if (disponiblesSinLinea > 0 && cant > disponiblesSinLinea) {
                                  toast.error(
                                    `No pueden ser más de ${disponiblesSinLinea.toLocaleString('es-CO')} (palmas disponibles sin línea en este sublote)`,
                                  );
                                  return;
                                }
                                agregarPalmas(sub.id, cant, lineaSel);
                                setCantPalmasForm(prev => {
                                  const n = { ...prev };
                                  delete n[cantField];
                                  delete n[lineaField];
                                  return n;
                                });
                                setMostrandoFormPalmas(null);
                              }}
                              disabled={!cantValue || parseInt(cantValue || '0') <= 0 || !lineaSel}
                            >
                              Agregar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setMostrandoFormPalmas(null);
                                setCantPalmasForm(prev => {
                                  const n = { ...prev };
                                  delete n[cantField];
                                  delete n[lineaField];
                                  return n;
                                });
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">

                        {/* ── MODO EDICIÓN: palmas agrupadas POR LÍNEA (cuando el sublote tiene líneas) ──
                             Cada línea muestra su contador y su grilla de palmas.
                             El botón "Agregar Palmas" vive en el header del sublote
                             y deja al usuario elegir cantidad + línea de una vez. */}
                        {editId && tieneLineas && (
                          <div className="space-y-5">
                            {linSub
                              // Solo mostrar líneas que ya tienen palmas asignadas.
                              // Si está cargando aún (ps undefined) usamos el contador del bundle.
                              .filter(ln => {
                                const ps = wizardPag[`linea_${ln.id}`];
                                const total = ps?.total ?? ln.cantidadPalmas ?? 0;
                                return total > 0;
                              })
                              .map(ln => {
                              const key = `linea_${ln.id}`;
                              const ps  = wizardPag[key];
                              return (
                                <div key={ln.id} className="border border-border/50 rounded-lg p-4 bg-muted/10 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <GitBranch className="h-4 w-4 text-accent" />
                                      <span className="font-semibold text-sm">Línea {ln.numero}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {(ps?.total ?? ln.cantidadPalmas ?? 0).toLocaleString('es-CO')} palmas
                                      </Badge>
                                    </div>
                                  </div>

                                  {!ps || ps.loading ? (
                                    <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
                                      <Loader2 className="h-4 w-4 animate-spin" /> Cargando palmas...
                                    </div>
                                  ) : ps.data.length === 0 ? (
                                    <p className="text-center py-4 text-xs text-muted-foreground italic">
                                      Sin palmas registradas en esta línea
                                    </p>
                                  ) : (
                                    <>
                                      <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-6">
                                        {ps.data.map((palma: any) => (
                                          <div key={palma.id}
                                            className="border border-border rounded-lg p-2 bg-card group hover:border-success/50 transition-colors">
                                            <div className="flex items-center justify-between mb-1">
                                              <Leaf className="h-3 w-3 text-success" />
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setPendienteEliminar({
                                                  tipo: 'palma',
                                                  id: String(palma.id),
                                                  codigo: palma.codigo,
                                                  key,
                                                  subloteId: sub.id,
                                                  lineaId: ln.id,
                                                  page: ps.page ?? 1,
                                                })}
                                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                            <p className="text-xs font-mono font-semibold truncate" title={palma.codigo}>
                                              {palma.codigo}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                      {ps.page < ps.lastPage && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full mt-2 gap-2"
                                          onClick={() => cargarWizardPalmas(
                                            key,
                                            { sublote_id: Number(sub.id), linea_id: Number(ln.id) },
                                            ps.page + 1, true
                                          )}
                                        >
                                          Ver más ({(ps.total - ps.data.length).toLocaleString('es-CO')} palmas restantes)
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* CASO B SIN LÍNEAS — modo edición.
                             Solo el input. Las palmas se persisten al pulsar
                             "Guardar Cambios" (bulk save) en el botón inferior del wizard. */}
                        {editId && !tieneLineas && (
                          <div className="bg-muted/10 border border-border/50 rounded-lg p-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Número de palmas</Label>
                              <Input
                                type="number" step="0.001"
                                placeholder="Ej: 170"
                                value={cantPalmasForm[sub.id] ?? String(sub.cantidadPalmas ?? '')}
                                onChange={e => setCantPalmasForm(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                min="0"
                                className="h-12 text-base max-w-xs"
                              />
                            </div>
                          </div>
                        )}

                        {/* ── MODO CREACIÓN: formulario inline (siempre visible para agregar/editar) ── */}
                        {!editId && (() => {
                          const editingIdx = editingEntryIdx[sub.id] ?? null;
                          const isEditing = editingIdx !== null;
                          // Líneas que ya tienen entrada (para filtrar del dropdown).
                          // Si estamos editando, conservamos la línea de la entrada en edición.
                          const usedLineaIds = new Set(
                            (palmasEntries[sub.id] ?? [])
                              .map((e, i) => (i === editingIdx ? null : e.lineaId))
                              .filter((x): x is string => !!x)
                          );
                          const lineasDisponibles = linSub.filter(l => !usedLineaIds.has(l.id));
                          // Si NO estamos editando y todas las líneas ya tienen entrada → ocultar el form completo
                          const todasLasLineasUsadas =
                            !isEditing && linSub.length > 0 && lineasDisponibles.length === 0;
                          // Sublote SIN líneas que ya tiene una entrada → solo permite editar
                          const sinLineasYaTieneEntrada =
                            !isEditing && linSub.length === 0 && (palmasEntries[sub.id] ?? []).length > 0;

                          if (todasLasLineasUsadas || sinLineasYaTieneEntrada) {
                            return (
                              <div className="bg-muted/20 border border-border/40 rounded-lg p-3 text-xs text-muted-foreground text-center">
                                {sinLineasYaTieneEntrada
                                  ? 'Ya hay palmas registradas en este sublote. Edita la entrada para modificarla.'
                                  : 'Todas las líneas tienen palmas registradas. Edita una entrada para modificarla.'}
                              </div>
                            );
                          }

                          return (
                            <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                              {isEditing && (
                                <div className="text-xs font-medium text-primary">
                                  Editando entrada de {(palmasEntries[sub.id] ?? [])[editingIdx!]?.lineaId
                                    ? `Línea ${linSub.find(l => l.id === (palmasEntries[sub.id] ?? [])[editingIdx!].lineaId)?.numero ?? '?'}`
                                    : 'Sin línea'}
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label>Cantidad de palmas</Label>
                                <Input
                                  type="number" step="0.001"
                                  placeholder="Ej: 50"
                                  min="0"
                                  value={cantPalmasForm[sub.id] ?? ''}
                                  onChange={e => {
                                    const v = e.target.value;
                                    // Bloquear negativos: si llega < 0, lo dejamos en '0'
                                    const safe = v === '' ? '' : (Number(v) < 0 ? '0' : v);
                                    setCantPalmasForm(prev => ({ ...prev, [sub.id]: safe }));
                                  }}
                                />
                              </div>
                              {linSub.length > 0 && (
                                <div className="space-y-2">
                                  <Label>Línea (selecciona)</Label>
                                  <select
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={cantPalmasForm[`linea_${sub.id}`] ?? ''}
                                    onChange={e => setCantPalmasForm(prev => ({ ...prev, [`linea_${sub.id}`]: e.target.value }))}
                                  >
                                    <option value="">Selecciona una línea</option>
                                    {lineasDisponibles.map(linea => (
                                      <option key={linea.id} value={linea.id}>
                                        Línea {linea.numero}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    const cant = parseInt(cantPalmasForm[sub.id] ?? '');
                                    if (!cant || cant <= 0) return;
                                    const lineaId = cantPalmasForm[`linea_${sub.id}`] ?? '';
                                    if (isEditing) {
                                      // Actualizar entrada existente
                                      setPalmasEntries(prev => ({
                                        ...prev,
                                        [sub.id]: (prev[sub.id] ?? []).map((e, i) =>
                                          i === editingIdx ? { lineaId, cantidad: cant } : e
                                        ),
                                      }));
                                      setEditingEntryIdx(prev => ({ ...prev, [sub.id]: null }));
                                    } else {
                                      // Agregar nueva entrada
                                      setPalmasEntries(prev => ({
                                        ...prev,
                                        [sub.id]: [...(prev[sub.id] ?? []), { lineaId, cantidad: cant }],
                                      }));
                                    }
                                    // Limpiar inputs
                                    setCantPalmasForm(prev => ({
                                      ...prev,
                                      [sub.id]: '',
                                      [`linea_${sub.id}`]: '',
                                    }));
                                  }}
                                  disabled={
                                    !cantPalmasForm[sub.id] ||
                                    parseInt(cantPalmasForm[sub.id] ?? '0') <= 0 ||
                                    (linSub.length > 0 && !cantPalmasForm[`linea_${sub.id}`])
                                  }
                                >
                                  {isEditing ? 'Actualizar' : 'Guardar'}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setCantPalmasForm(prev => ({
                                      ...prev,
                                      [sub.id]: '',
                                      [`linea_${sub.id}`]: '',
                                    }));
                                    setEditingEntryIdx(prev => ({ ...prev, [sub.id]: null }));
                                  }}
                                >
                                  {isEditing ? 'Cancelar' : 'Limpiar'}
                                </Button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* MODO CREACIÓN: lista de entradas guardadas (separadas por línea) */}
                        {!editId && (palmasEntries[sub.id]?.length ?? 0) > 0 && (
                          <div className="bg-success/5 border border-success/20 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Leaf className="h-5 w-5 text-success" />
                                <span className="font-semibold">
                                  {totalPalmasSublote(sub.id).toLocaleString('es-CO')} palmas registradas
                                </span>
                              </div>
                              <Badge variant="secondary" className="bg-success/10 text-success">
                                {(palmasEntries[sub.id] ?? []).length} entrada(s)
                              </Badge>
                            </div>
                            <div className="space-y-1.5">
                              {(palmasEntries[sub.id] ?? []).map((entry, idx) => {
                                const linea = linSub.find(l => l.id === entry.lineaId);
                                const lineaLabel = entry.lineaId
                                  ? `Línea ${linea?.numero ?? '?'}`
                                  : 'Sin línea';
                                return (
                                  <div
                                    key={`${sub.id}-entry-${idx}`}
                                    className="flex items-center justify-between bg-background/60 border border-border/40 rounded-md px-3 py-2 text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-foreground">{lineaLabel}</span>
                                      <span className="text-muted-foreground">·</span>
                                      <span className="text-foreground">
                                        {entry.cantidad.toLocaleString('es-CO')} palmas
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {/* Botón Editar */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          // Cargar la entrada en el formulario y marcar como editing
                                          setCantPalmasForm(prev => ({
                                            ...prev,
                                            [sub.id]: String(entry.cantidad),
                                            [`linea_${sub.id}`]: entry.lineaId,
                                          }));
                                          setEditingEntryIdx(prev => ({ ...prev, [sub.id]: idx }));
                                        }}
                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                        title="Editar entrada"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      {/* Botón Eliminar */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setPalmasEntries(prev => ({
                                            ...prev,
                                            [sub.id]: (prev[sub.id] ?? []).filter((_, i) => i !== idx),
                                          }));
                                          // Si estábamos editando esa entrada, salir del modo edición
                                          if ((editingEntryIdx[sub.id] ?? null) === idx) {
                                            setEditingEntryIdx(prev => ({ ...prev, [sub.id]: null }));
                                            setCantPalmasForm(prev => ({
                                              ...prev,
                                              [sub.id]: '',
                                              [`linea_${sub.id}`]: '',
                                            }));
                                          }
                                        }}
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        title="Eliminar entrada"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              {sublotes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Leaf className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Primero debes crear sublotes</p>
                </div>
              )}
              </CardContent>
            </Card>
          )}

          {/* ── Navegación ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setEtapa(e => Math.max(1, e - 1))}
              disabled={etapa === 1} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Anterior
            </Button>
            <div className="flex gap-2">
              {/* En modo edición: el botón "Guardar cambios" aparece SIEMPRE,
                   en todas las etapas, para no obligar al usuario a navegar
                   hasta el final si solo modificó info del predio. */}
              {editId && (
                <>
                  <Button onClick={() => guardarTodo(false)} disabled={guardando}
                    variant="outline" className="gap-2">
                    {guardando
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
                      : <><Save className="h-4 w-4" />Guardar cambios</>}
                  </Button>
                  <Button onClick={() => guardarTodo(true)} disabled={guardando}
                    className="gap-2 bg-success hover:bg-success/90">
                    {guardando
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
                      : <><Check className="h-4 w-4" />Finalizar</>}
                  </Button>
                </>
              )}
              {etapa < ETAPAS.length ? (
                <Button onClick={siguienteEtapa}
                  disabled={!puedeSiguiente || avanzando} className="gap-2">
                  {avanzando
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
                    : <>Siguiente <ArrowRight className="h-4 w-4" /></>}
                </Button>
              ) : (
                // En modo creación: el botón final crea la plantación.
                !editId && (
                  <Button onClick={() => guardarTodo(false)} disabled={guardando}
                    className="gap-2 bg-success hover:bg-success/90">
                    {guardando
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
                      : <><Save className="h-4 w-4" />Guardar Plantación</>}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── Columna derecha: panel resumen ─────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {PanelResumen()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!pendienteEliminar}
        onOpenChange={(o) => !eliminandoItem && !o && setPendienteEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendienteEliminar?.tipo === 'lote' && 'Eliminar lote'}
              {pendienteEliminar?.tipo === 'sublote' && 'Eliminar sublote'}
              {pendienteEliminar?.tipo === 'linea' && 'Eliminar línea'}
              {pendienteEliminar?.tipo === 'palma' && 'Eliminar palma'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminandoItem}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmarEliminarItem(); }}
              disabled={eliminandoItem}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {eliminandoItem ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo "Nueva línea": pregunta cuántas palmas asignar a la línea
          que se va a crear. Solo aparece en modo edición y cuando hay palmas
          sin asignar en el sublote. */}
      <AlertDialog
        open={!!nuevaLineaPrompt}
        onOpenChange={(o) => { if (!o) setNuevaLineaPrompt(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nueva línea en {nuevaLineaPrompt?.subloteNombre}</AlertDialogTitle>
            <AlertDialogDescription>
              Hay <strong>{nuevaLineaPrompt?.disponibles.toLocaleString('es-CO')}</strong> palmas
              sin línea en este sublote. ¿Cuántas quieres asignar a esta nueva línea?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-sm">Cantidad de palmas</Label>
            <Input
              type="number" step="0.001"
              min={0}
              max={nuevaLineaPrompt?.disponibles ?? 0}
              placeholder={`Máx ${nuevaLineaPrompt?.disponibles ?? 0}`}
              value={nuevaLineaPrompt?.cantidadInput ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                const safe = v === '' ? '' : (Number(v) < 0 ? '0' : v);
                setNuevaLineaPrompt(p => p ? { ...p, cantidadInput: safe } : p);
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Puedes dejar 0 para crear la línea vacía y asignar palmas después.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                const p = nuevaLineaPrompt;
                if (!p) return;
                const cant = parseInt(p.cantidadInput || '0', 10) || 0;
                if (cant < 0) { toast.error('La cantidad no puede ser negativa'); return; }
                if (cant > p.disponibles) {
                  toast.error(`No pueden ser más de ${p.disponibles.toLocaleString('es-CO')} palmas`);
                  return;
                }
                agregarLinea(p.subloteId, cant);
                setNuevaLineaPrompt(null);
              }}
            >
              Crear línea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function FormLote({
  semillasCatalogo, haDisponibles, onGuardar, onCancelar, loteInicial,
}: {
  semillasCatalogo: {id:number;tipo:string;nombre:string}[];
  haDisponibles: number;
  onGuardar: (l: Omit<any, 'id'>) => void;
  onCancelar: () => void;
  loteInicial?: LoteLocal;
}) {
  const isEditing = !!loteInicial;
  const [nombre, setNombre]        = useState(loteInicial?.nombre ?? '');
  const [fecha, setFecha]          = useState(loteInicial?.fechaSiembra ?? '');
  const [ha, setHa]                = useState(loteInicial ? String(loteInicial.hectareasSembradas) : '');
  // Precarga de variedad al editar:
  //  1. Si el lote tiene semilla del catálogo → usarla directamente.
  //  2. Si no tiene semilla pero sí `variedad` texto libre (creada como "Otros"
  //     en el pasado) → preseleccionar "Otros" y precargar el input.
  const [semillaId, setSemillaId]  = useState(
    loteInicial?.semillasIds?.[0]
      ? String(loteInicial.semillasIds[0])
      : (loteInicial?.variedad?.trim() ? '__otros__' : '')
  );
  const [otraVariedad, setOtraVariedad] = useState(
    (!loteInicial?.semillasIds?.[0] && loteInicial?.variedad?.trim())
      ? loteInicial.variedad
      : ''
  );

  const esOtros = semillaId === '__otros__';
  const variedadFinal = esOtros ? otraVariedad : (semillasCatalogo.find(s => String(s.id) === semillaId)?.nombre ?? semillaId);

  // Validación: no permitir más hectáreas que las disponibles del predio.
  const haNum = Number(ha);
  const haInvalid = ha !== '' && (!Number.isFinite(haNum) || haNum <= 0 || haNum > haDisponibles);
  const haExcede = ha !== '' && Number.isFinite(haNum) && haNum > haDisponibles;

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-lg">{isEditing ? 'Editar Lote' : 'Nuevo Lote'}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nombre del Lote *</Label>
          <Input
            placeholder="Ej: Lote Norte"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha de Siembra</Label>
          <Input
            type="date"
            value={fecha}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setFecha(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Hectáreas Sembradas *</Label>
          <Input
            type="number" step="0.001"
            placeholder="0"
            min={0}
            max={haDisponibles}
            step="0.01"
            value={ha}
            onChange={e => setHa(e.target.value)}
            className={haExcede ? 'border-destructive focus-visible:ring-destructive/40' : ''}
          />
          <p className={`text-xs ${haExcede ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            Disponibles: {haDisponibles.toFixed(2)} ha
          </p>
        </div>
        <div className="space-y-2">
          <Label>Variedad / Semilla</Label>
          <Select
            value={semillaId || '__ninguna__'}
            onValueChange={(v) => {
              if (v === '__ninguna__') {
                setSemillaId('');
                setOtraVariedad('');
              } else {
                setSemillaId(v);
                setOtraVariedad('');
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar variedad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ninguna__">
                <span className="text-muted-foreground">Sin variedad</span>
              </SelectItem>
              {semillasCatalogo.length > 0
                ? semillasCatalogo.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nombre}
                    </SelectItem>
                  ))
                : ['Elaeis Guineensis', 'Híbrido OxG', 'Compacta E3'].map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))
              }
              <SelectItem value="__otros__">Otros</SelectItem>
            </SelectContent>
          </Select>
          {esOtros && (
            <Input
              placeholder="Escribe la variedad..."
              value={otraVariedad}
              onChange={e => setOtraVariedad(e.target.value)}
              autoFocus
            />
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => {
            // Validar contra hectáreas disponibles del predio antes de guardar.
            // Aplica tanto al crear como al editar (el caller suma de vuelta
            // las hectáreas del lote en edición al pasar haDisponibles).
            if (haNum > haDisponibles) {
              toast.error(
                `No puedes sembrar más de ${haDisponibles.toFixed(2)} ha disponibles en el predio.`,
              );
              return;
            }
            if (haNum <= 0) {
              toast.error('Las hectáreas sembradas deben ser mayores a 0');
              return;
            }
            const semillasIds = semillaId && !isNaN(Number(semillaId)) ? [Number(semillaId)] : [];
            onGuardar({ nombre, fechaSiembra: fecha, hectareasSembradas: haNum, semillasIds, variedad: variedadFinal });
          }}
          disabled={!nombre || !ha || (esOtros && !otraVariedad.trim()) || haInvalid}
        >
          {isEditing ? 'Actualizar Lote' : 'Guardar Lote'}
        </Button>
        <Button variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function FormSublote({
  onGuardar, onCancelar, nombreInicial,
}: {
  onGuardar: (n: string) => void;
  onCancelar: () => void;
  nombreInicial?: string;
}) {
  const isEditing = nombreInicial !== undefined;
  const [nombre, setNombre] = useState(nombreInicial ?? '');
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
      <div className="space-y-2">
        <Label>Nombre del Sublote *</Label>
        <Input
          placeholder="Ej: Sector A"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onGuardar(nombre)} disabled={!nombre.trim()}>
          {isEditing ? 'Actualizar' : 'Guardar'}
        </Button>
        <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
      </div>
    </div>
  );
}