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
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  MapPin, ArrowLeft, ArrowRight, Save, Check, Plus, Trash2,
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
  const { token }     = useAuth();

  const [etapa, setEtapa] = useState(1);
  const [guardando, setGuardando] = useState(false);

  // ── Estado paso 1: Predio ──────────────────────────────────────────────────
  const [predioNombre, setPredioNombre]     = useState('');
  const [predioUbicacion, setPredioUbicacion] = useState('');
  const [predioHectareas, setPredioHectareas] = useState('');
  const [departamentos, setDepartamentos]   = useState<{codigo:string;nombre:string}[]>([]);
  const [municipios, setMunicipios]         = useState<{codigo:string;nombre:string}[]>([]);
  const [deptoSel, setDeptoSel]             = useState('');
  const [munSel, setMunSel]                 = useState('');

  // ── Estado paso 2: Lotes ───────────────────────────────────────────────────
  const [semillasCatalogo, setSemillasCatalogo] = useState<{id:number;tipo:string;nombre:string}[]>([]);
  const [lotes, setLotes]               = useState<LoteLocal[]>([]);
  const [showFormLote, setShowFormLote] = useState(false);

  // ── Estado paso 3: Sublotes ────────────────────────────────────────────────
  const [sublotes, setSublotes]               = useState<SubloteLocal[]>([]);
  const [showFormSublote, setShowFormSublote] = useState<string | null>(null); // loteId

  // ── Estado paso 4: Líneas ──────────────────────────────────────────────────
  const [lineas, setLineas]             = useState<LineaLocal[]>([]);

  // ── Estado paso 5 ──────────────────────────────────────────────────────────
  const [cantPalmasForm, setCantPalmasForm] = useState<Record<string, string>>({});
  const [lineaSelForm, setLineaSelForm]     = useState<Record<string, string>>({});
  // Paginación de palmas en wizard (edit mode):
  //   clave "linea_{lineaId}"  → palmas de esa línea
  //   clave "sub_{subloteId}"  → palmas del sublote sin líneas (solo conteo, no se cargan)
  const [wizardPag, setWizardPag] = useState<Record<string, {
    data: any[]; total: number; page: number; lastPage: number; loading: boolean;
  }>>({});
  const [wizardLineaOpen, setWizardLineaOpen] = useState<Record<string, string>>({});
  const [mostrandoFormPalmas, setMostrandoFormPalmas] = useState<string | null>(null);
  const [visiblePalmas, setVisiblePalmas] = useState<Record<string, number>>({});

  // ── Panel resumen: en edición usa API; en creación usa estado local ────────
  const [resumen, setResumen] = useState<any>(null);

  // ── Cargar dept/municipios ─────────────────────────────────────────────────
  useEffect(() => {
    fetchConToken('/api/v1/auth/departamentos', token)
      .then(r => r.json()).then(d => setDepartamentos(d.data ?? [])).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!deptoSel) { setMunicipios([]); setMunSel(''); return; }
    fetchConToken(`/api/v1/auth/departamentos/${deptoSel}/municipios`, token)
      .then(r => r.json()).then(d => setMunicipios(d.data ?? [])).catch(() => {});
  }, [deptoSel, token]);

  // Sincronizar ubicacion con depto+municipio
  useEffect(() => {
    if (!deptoSel && !munSel) return;
    const dn = departamentos.find(d => d.codigo === deptoSel)?.nombre ?? '';
    const mn = municipios.find(m => m.codigo === munSel)?.nombre ?? '';
    setPredioUbicacion([mn, dn].filter(Boolean).join(', '));
  }, [deptoSel, munSel, departamentos, municipios]);

  // ── §2.0 Cargar semillas ───────────────────────────────────────────────────
  useEffect(() => {
    lotesApi.semillas().then(r => setSemillasCatalogo(r.data ?? [])).catch(() => {});
  }, []);

  // ── §1.6 Refrescar panel (solo edición) ────────────────────────────────────
  const refrescarResumen = async (predioId: string | number) => {
    try {
      const r = await prediosApi.resumen(Number(predioId));
      setResumen(r.data);
    } catch { /* silent */ }
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

  // ── Cargar datos en modo edición ──────────────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    const cargar = async () => {
      try {
        // §1.2 Ver predio
        const predioRes = await prediosApi.ver(Number(editId));
        const p = predioRes.data;
        setPredioNombre(p.nombre ?? '');
        setPredioUbicacion(p.ubicacion ?? '');
        setPredioHectareas(p.hectareas_totales != null ? String(Number(p.hectareas_totales)) : '');

        // §2.1 Lotes del predio
        const lotesRes = await lotesApi.listar({ predio_id: Number(editId), per_page: 100 });
        const lotesData = lotesRes.data ?? [];
        setLotes(lotesData.map((l: any) => ({
          id: String(l.id), nombre: l.nombre,
          fechaSiembra: (l.fecha_siembra ?? '').split('T')[0],
          hectareasSembradas: Number(l.hectareas_sembradas ?? 0),
          semillasIds: (l.semillas ?? []).map((s: any) => Number(s.id)),
          variedad: (l.semillas ?? [])[0]?.nombre ?? '',
        })));

        // §3.1 Sublotes + §5.1 Líneas
        const todosSubl: SubloteLocal[] = [];
        const todasLineas: LineaLocal[] = [];
        for (const l of lotesData) {
          const sublRes = await sublotesApi.listar({ lote_id: l.id, per_page: 100 });
          (sublRes.data ?? []).forEach((s: any) => {
            todosSubl.push({
              id: String(s.id), nombre: s.nombre,
              loteId: String(l.id),
              cantidadPalmas: Number(s.cantidad_palmas ?? 0),
            });
          });
          for (const s of (sublRes.data ?? [])) {
            const linRes = await lineasApi.listar({ sublote_id: s.id, per_page: 100 });
            (linRes.data ?? []).forEach((ln: any) => {
              todasLineas.push({ id: String(ln.id), numero: ln.numero, subloteId: String(s.id) });
            });
          }
        }
        setSublotes(todosSubl);
        setLineas(todasLineas);

        // §1.6 Panel resumen
        await refrescarResumen(editId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar plantación');
      }
    };
    cargar();
  }, [editId]);

  // ── Auto-cargar palmas al entrar al paso 5 en modo edición ─────────────
  const VISIBLE_STEP = 24;
  useEffect(() => {
    if (etapa !== 5 || !editId) return;
    sublotes.forEach(sub => {
      const key = `sub_${sub.id}`;
      if (!wizardPag[key]) {
        cargarWizardPalmas(key, { sublote_id: Number(sub.id) });
      }
    });
    // Reset visible count when entering step
    setVisiblePalmas({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, editId]);

  // ── Helpers locales (modo creación) ──────────────────────────────────────
  const agregarLote = (lote: Omit<LoteLocal, 'id'>) => {
    setLotes(prev => [...prev, { ...lote, id: `l-${Date.now()}` }]);
    setShowFormLote(false);
  };
  const eliminarLote = (id: string) => {
    setLotes(prev => prev.filter(l => l.id !== id));
    const subIds = sublotes.filter(s => s.loteId === id).map(s => s.id);
    setSublotes(prev => prev.filter(s => s.loteId !== id));
    setLineas(prev => prev.filter(ln => !subIds.includes(ln.subloteId)));
  };
  const agregarSublote = (loteId: string, nombre: string) => {
    setSublotes(prev => [...prev, { id: `s-${Date.now()}`, nombre, loteId, cantidadPalmas: 0 }]);
    setShowFormSublote(null);
  };
  const eliminarSublote = (id: string) => {
    setSublotes(prev => prev.filter(s => s.id !== id));
    setLineas(prev => prev.filter(ln => ln.subloteId !== id));
  };

  // ── Líneas: en edición llama API; en creación guarda local ────────────────
  const agregarLinea = async (subloteId: string) => {
    const existentes = lineas.filter(ln => ln.subloteId === subloteId).map(ln => ln.numero);
    let nuevoNumero = 1;
    while (existentes.includes(nuevoNumero)) nuevoNumero++;

    if (editId) {
      try {
        // §5.3 POST /lineas
        const res = await lineasApi.crear({ sublote_id: Number(subloteId), numero: nuevoNumero });
        setLineas(prev => [...prev, { id: String(res.data?.id), numero: nuevoNumero, subloteId }]);
        toast.success(res.message ?? 'Línea creada');
        await refrescarResumen(editId);
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    } else {
      setLineas(prev => [...prev, { id: `ln-${Date.now()}`, numero: nuevoNumero, subloteId }]);
    }
  };
  const eliminarLinea = async (id: string) => {
    if (editId && !id.startsWith('ln-')) {
      try {
        // §5.5 DELETE /lineas/{id}
        await lineasApi.eliminar(Number(id));
        toast.success('Línea eliminada');
        await refrescarResumen(editId);
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); return; }
    }
    setLineas(prev => prev.filter(ln => ln.id !== id));
  };

  // ── Palmas (paso 5, solo modo edición): §4.3 POST /palmas ─────────────────
  // §4.3 POST /palmas — cant y lineaId vienen del formulario del paso 5
  const agregarPalmas = async (subloteId: string, cant: number, lineaId: string | undefined) => {
    try {
      const body: any = { sublote_id: Number(subloteId), cantidad_palmas: cant };
      if (lineaId) body.linea_id = Number(lineaId);
      const res = await palmasApi.crear(body);

      if (res.async === true) {
        // >5000 palmas → async, polling §4.6
        toast.info('Palmas creándose en segundo plano...');
        const poll = async (batchId: string) => {
          const start = Date.now();
          while (Date.now() - start < 600_000) {
            await new Promise(r => setTimeout(r, 3000));
            try {
              const br = await palmasApi.getBatch(batchId);
              if (br.data.finished) {
                if (!br.data.has_failures) {
                  toast.success('Palmas creadas');
                  setSublotes(prev => prev.map(s =>
                    s.id === subloteId ? { ...s, cantidadPalmas: s.cantidadPalmas + cant } : s
                  ));
                  if (editId) await refrescarResumen(editId);
                  // Refrescar la línea si corresponde
                  if (lineaId) {
                    setWizardPag(prev => { const n = {...prev}; delete n[`linea_${lineaId}`]; return n; });
                  }
                } else toast.error('Error creando palmas en segundo plano');
                return;
              }
            } catch { break; }
          }
        };
        poll(res.batch_id);
      } else {
        // <=5000 → sync
        const creadas = res.cantidad_creada ?? cant;
        toast.success(res.message ?? `${creadas} palmas creadas`);
        setSublotes(prev => prev.map(s =>
          s.id === subloteId ? { ...s, cantidadPalmas: s.cantidadPalmas + creadas } : s
        ));
        if (editId) await refrescarResumen(editId);
        // Refrescar palmas de la línea afectada para que se vean inmediatamente
        if (lineaId) {
          cargarWizardPalmas(`linea_${lineaId}`, {
            sublote_id: Number(subloteId),
            linea_id: Number(lineaId),
          });
        }
      }
      // Limpiar input
      if (lineaId) {
        setCantPalmasForm(prev => ({ ...prev, [`${subloteId}_${lineaId}`]: '' }));
      } else {
        setCantPalmasForm(prev => ({ ...prev, [subloteId]: '' }));
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error al crear palmas'); }
  };

  // ── Guardar todo (modo creación) ──────────────────────────────────────────
  const guardarTodo = async () => {
    if (guardando) return;
    if (!predioNombre.trim()) { toast.error('El nombre del predio es obligatorio'); return; }
    if (!predioUbicacion.trim()) { toast.error('La ubicación es obligatoria'); return; }
    if (!predioHectareas || Number(predioHectareas) <= 0) { toast.error('Las hectáreas son obligatorias'); return; }

    setGuardando(true);
    try {
      if (editId) {
        // §1.4 Solo actualizar datos del predio
        await prediosApi.editar(Number(editId), {
          nombre: predioNombre.trim().slice(0, 50),
          ubicacion: predioUbicacion.trim().slice(0, 100),
          hectareas_totales: Number(predioHectareas),
        });
        toast.success('Plantación actualizada');
        navigate('/plantacion');
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
          const subBody: any = { lote_id: loteIdReal, nombre: sub.nombre };
          const cantForm = parseInt(cantPalmasForm[`confirmed_${sub.id}`] ?? cantPalmasForm[sub.id] ?? '');
          const cantFinal = sub.cantidadPalmas > 0
            ? sub.cantidadPalmas
            : (!isNaN(cantForm) && cantForm > 0 ? cantForm : 0);
          if (cantFinal > 0) subBody.cantidad_palmas = cantFinal;
          const subRes = await sublotesApi.crear(subBody);
          const subloteIdReal = subRes.data?.id;

          // §5.3 Crear líneas del sublote (si se agregaron en paso 4)
          if (subloteIdReal) {
            const lineasDelSublote = lineas.filter(ln => ln.subloteId === sub.id);
            for (const ln of lineasDelSublote) {
              await lineasApi.crear({ sublote_id: Number(subloteIdReal), numero: ln.numero });
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

  // ── Panel resumen (derecha) ────────────────────────────────────────────────
  const PanelResumen = () => {
    // En modo edición con datos del API (§1.6)
    if (editId && resumen) {
      const pr = resumen.predio ?? {};
      const tg = resumen.totales_generales ?? {};
      const ls = resumen.lotes ?? [];
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
                  <span className="text-sm">Ubicación</span>
                  <span className="font-semibold text-sm truncate ml-2 max-w-[140px]" title={pr.ubicacion}>{pr.ubicacion}</span>
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
                    <div className="flex items-center gap-2">
                      <Grid3x3 className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">{l.nombre}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{Number(l.hectareas_sembradas ?? 0).toFixed(1)} ha</span>
                  </div>
                  {(l.sublotes ?? []).length > 0 ? (
                    <div className="space-y-1 pl-3">
                      {(l.sublotes ?? []).map((s: any) => {
                        const linCount = s.totales?.lineas ?? lineas.filter(ln => ln.subloteId === String(s.id)).length;
                        return (
                          <div key={s.id} className="flex items-center justify-between py-1 text-xs">
                            <div className="flex items-center gap-2">
                              <Trees className="h-3 w-3 text-primary/70" />
                              <span>{s.nombre}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              {linCount > 0 && (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <GitBranch className="h-3 w-3" />{linCount}
                                </span>
                              )}
                              <span className="text-success font-semibold flex items-center gap-1">
                                <Leaf className="h-3 w-3" />{(s.totales?.palmas ?? 0).toLocaleString('es-CO')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-3">Sin sublotes</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <span className="font-medium">Totales del lote</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{l.totales?.sublotes ?? 0} sublotes</span>
                      {(l.totales?.lineas ?? 0) > 0 && (
                        <span className="text-muted-foreground">{l.totales?.lineas} líneas</span>
                      )}
                      <span className="text-success font-semibold">{(l.totales?.palmas ?? 0).toLocaleString('es-CO')} palmas</span>
                    </div>
                  </div>
                </div>
              ))}

              {ls.length > 0 && (
                <div className="border-2 border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> Totales Generales
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded bg-background/50">
                      <span className="text-muted-foreground">Lotes</span>
                      <span className="font-bold">{tg.lotes ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-background/50">
                      <span className="text-muted-foreground">Sublotes</span>
                      <span className="font-bold">{tg.sublotes ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-background/50">
                      <span className="text-muted-foreground">Líneas</span>
                      <span className="font-bold">{tg.lineas ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-success/10">
                      <span className="text-muted-foreground">Palmas</span>
                      <span className="font-bold text-success">{(tg.palmas ?? 0).toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                </div>
              )}

              {ls.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No hay información para mostrar</p>
                  <p className="text-xs">Completa las etapas anteriores</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Modo creación: estado local
    const totalPalmasCreacion = sublotes.reduce((sum, s) => {
      const cant = parseInt(cantPalmasForm[`confirmed_${s.id}`] ?? cantPalmasForm[s.id] ?? '0') || s.cantidadPalmas || 0;
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
                    <span className="text-sm">Ubicación</span>
                    <span className="font-semibold text-sm truncate ml-2 max-w-[140px]" title={predioUbicacion}>{predioUbicacion}</span>
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
                return sum + (parseInt(cantPalmasForm[`confirmed_${s.id}`] ?? cantPalmasForm[s.id] ?? '0') || s.cantidadPalmas || 0);
              }, 0);

              return (
                <div key={lote.id} className="border border-border rounded-lg p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <Grid3x3 className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">{lote.nombre}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{lote.hectareasSembradas} ha</span>
                  </div>

                  {sublotesDelLote.length > 0 ? (
                    <div className="space-y-1 pl-3">
                      {sublotesDelLote.map(s => {
                        const linSub = lineas.filter(ln => ln.subloteId === s.id);
                        const palSub = parseInt(cantPalmasForm[`confirmed_${s.id}`] ?? cantPalmasForm[s.id] ?? '0') || s.cantidadPalmas || 0;
                        return (
                          <div key={s.id} className="flex items-center justify-between py-1 text-xs">
                            <div className="flex items-center gap-2">
                              <Trees className="h-3 w-3 text-primary/70" />
                              <span>{s.nombre}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              {linSub.length > 0 && (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <GitBranch className="h-3 w-3" />{linSub.length}
                                </span>
                              )}
                              <span className="text-success font-semibold flex items-center gap-1">
                                <Leaf className="h-3 w-3" />{palSub}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-3">Sin sublotes</p>
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
                <h5 className="font-semibold text-sm flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> Totales Generales
                </h5>
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
                <p className="text-sm">No hay información para mostrar</p>
                <p className="text-xs">Completa las etapas anteriores</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
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

          {/* Stepper */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center">
                {ETAPAS.map((e, idx) => {
                  const completa = etapa > e.numero;
                  const activa   = etapa === e.numero;
                  return (
                    <div key={e.numero} className="flex items-center flex-1">
                      <div className="flex-1 flex justify-center">
                        <button onClick={() => (editId || completa || activa) && setEtapa(e.numero)}
                          className={`flex flex-col items-center gap-2 ${editId || completa || activa ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                          disabled={!editId && !completa && !activa}>
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${completa ? 'bg-primary border-primary text-white' : activa ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                            {completa ? <Check className="h-5 w-5" /> : <span className="font-bold">{e.numero}</span>}
                          </div>
                          <div className="text-center">
                            <div className={`text-sm font-semibold whitespace-nowrap ${activa || completa ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {e.nombre}
                            </div>
                          </div>
                        </button>
                      </div>
                      {idx < ETAPAS.length - 1 && (
                        <div className="flex-1 h-0.5 mx-2 bg-border relative">
                          <div className={`absolute inset-0 bg-primary transition-all ${completa ? 'w-full' : 'w-0'}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Paso 1: Predio ──────────────────────────────────────── */}
          {etapa === 1 && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Información del Predio</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ingresa los datos básicos de tu predio
                    </p>
                  </div>
                </div>
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
                    <select value={deptoSel} onChange={e => { setDeptoSel(e.target.value); setMunSel(''); }}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">Seleccionar...</option>
                      {departamentos.map(d => <option key={d.codigo} value={d.codigo}>{d.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Municipio</Label>
                    <select value={munSel} onChange={e => setMunSel(e.target.value)} disabled={!deptoSel}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50">
                      <option value="">Seleccionar...</option>
                      {municipios.map(m => <option key={m.codigo} value={m.codigo}>{m.nombre}</option>)}
                    </select>
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
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Grid3x3 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Lotes del Predio</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Hectáreas disponibles: {haDisponibles.toFixed(2)} ha
                      </p>
                    </div>
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
                      <Button variant="ghost" size="icon" onClick={() => eliminarLote(l.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {(l.variedad || l.semillasIds.length > 0) && (
                      <Badge variant="secondary" className="text-xs">
                        {l.variedad || `${l.semillasIds.length} semilla${l.semillasIds.length !== 1 ? 's' : ''}`}
                      </Badge>
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
                  <FormLote
                    semillasCatalogo={semillasCatalogo}
                    haDisponibles={haDisponibles}
                    onGuardar={agregarLote}
                    onCancelar={() => setShowFormLote(false)} />
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Paso 3: Sublotes ────────────────────────────────────── */}
          {etapa === 3 && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Trees className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Sublotes</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Organiza tus lotes en sublotes
                      </p>
                    </div>
                  </div>
                </div>
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
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {subls.map(s => (
                          <div key={s.id} className="border border-border rounded-lg p-4 bg-card">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold">{s.nombre}</h4>
                              <Button variant="ghost" size="icon" onClick={() => eliminarSublote(s.id)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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
                        <FormSublote
                          onGuardar={nombre => agregarSublote(lote.id, nombre)}
                          onCancelar={() => setShowFormSublote(null)} />
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
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <GitBranch className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>Líneas</CardTitle>
                      <Badge variant="secondary" className="bg-accent/10 text-accent">
                        Opcional
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Las líneas son opcionales. Las palmas se pueden agregar directamente a los sublotes.
                    </p>
                  </div>
                </div>
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
                        <Button variant="outline" size="sm" onClick={() => agregarLinea(sub.id)} className="gap-2">
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
                              <Button variant="ghost" size="icon" onClick={() => eliminarLinea(ln.id)}
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
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <CardTitle>Registrar Palmas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Total de palmas: {sublotes.reduce((s, sub) => s + (parseInt(cantPalmasForm[`confirmed_${sub.id}`] ?? cantPalmasForm[sub.id] ?? '0') || sub.cantidadPalmas || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {sublotes.map(sub => {
                  const lote   = lotes.find(l => l.id === sub.loteId);
                  const linSub = lineas.filter(ln => ln.subloteId === sub.id);
                  const tieneLineas = linSub.length > 0;
                  const PER = 50;

                  return (
                    <div key={sub.id} className="border border-border rounded-xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{sub.nombre}</h3>
                          <p className="text-sm text-muted-foreground">
                            {lote?.nombre} • {!tieneLineas
                              ? (cantPalmasForm[`confirmed_${sub.id}`] || sub.cantidadPalmas || 0)
                              : sub.cantidadPalmas} palmas
                          </p>
                        </div>
                        {/* Botón Agregar Palmas en modo edición (solo si tiene líneas) */}
                        {editId && tieneLineas && (
                          <Button
                            onClick={() => setMostrandoFormPalmas(
                              mostrandoFormPalmas === sub.id ? null : sub.id
                            )}
                            className="gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary"
                          >
                            <Plus className="h-4 w-4" />
                            Agregar Palmas
                          </Button>
                        )}
                      </div>

                      {/* Formulario agregar palmas en modo edición */}
                      {editId && mostrandoFormPalmas === sub.id && (
                        <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                          <div className="space-y-2">
                            <Label>Cantidad de palmas</Label>
                            <Input
                              type="number"
                              placeholder="Ej: 50"
                              value={cantPalmasForm[`edit_${sub.id}`] ?? ''}
                              onChange={e => setCantPalmasForm(prev => ({ ...prev, [`edit_${sub.id}`]: e.target.value }))}
                            />
                          </div>
                          {linSub.length > 0 && (
                            <div className="space-y-2">
                              <Label>Línea (opcional)</Label>
                              <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                value={cantPalmasForm[`editLinea_${sub.id}`] ?? ''}
                                onChange={e => setCantPalmasForm(prev => ({ ...prev, [`editLinea_${sub.id}`]: e.target.value }))}
                              >
                                <option value="">Sin línea</option>
                                {linSub.map(ln => (
                                  <option key={ln.id} value={ln.id}>Línea {ln.numero}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                const cant = parseInt(cantPalmasForm[`edit_${sub.id}`] ?? '');
                                if (!cant || cant < 1) { toast.error('Ingresa una cantidad válida'); return; }
                                const lineaSelId = cantPalmasForm[`editLinea_${sub.id}`] ?? '';
                                agregarPalmas(sub.id, cant, lineaSelId || undefined);
                                setCantPalmasForm(prev => {
                                  const n = { ...prev };
                                  delete n[`edit_${sub.id}`];
                                  delete n[`editLinea_${sub.id}`];
                                  return n;
                                });
                                setMostrandoFormPalmas(null);
                              }}
                              disabled={!cantPalmasForm[`edit_${sub.id}`] || parseInt(cantPalmasForm[`edit_${sub.id}`] ?? '0') <= 0}
                            >
                              Agregar
                            </Button>
                            <Button variant="outline" onClick={() => {
                              setMostrandoFormPalmas(null);
                              setCantPalmasForm(prev => {
                                const n = { ...prev };
                                delete n[`edit_${sub.id}`];
                                delete n[`editLinea_${sub.id}`];
                                return n;
                              });
                            }}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">

                        {/* ── MODO EDICIÓN: palmas en grid plano ────────── */}
                        {editId && (() => {
                          const key  = `sub_${sub.id}`;
                          const ps   = wizardPag[key];
                          if (!ps || ps.loading) return (
                            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" /> Cargando palmas...
                            </div>
                          );
                          if (ps.data.length === 0 && !tieneLineas) return null; // CASO B lo maneja abajo
                          if (ps.data.length === 0 && tieneLineas) return (
                            <p className="text-center py-6 text-sm text-muted-foreground">No hay palmas registradas</p>
                          );
                          return (
                            <div className="space-y-3">
                              {(() => {
                                return (
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
                                              onClick={async () => {
                                                try {
                                                  await palmasApi.eliminar([Number(palma.id)]);
                                                  const key = `sub_${sub.id}`;
                                                  const ps  = wizardPag[key];
                                                  cargarWizardPalmas(key, { sublote_id: Number(sub.id) }, ps?.page ?? 1);
                                                  setSublotes(prev => prev.map(s =>
                                                    s.id === sub.id ? { ...s, cantidadPalmas: Math.max(0, s.cantidadPalmas - 1) } : s
                                                  ));
                                                } catch { toast.error('Error al eliminar palma'); }
                                              }}
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
                                          key, { sublote_id: Number(sub.id) }, ps.page + 1, true
                                        )}
                                      >
                                        Ver más ({(ps.total - ps.data.length).toLocaleString('es-CO')} palmas restantes)
                                      </Button>
                                    )}
                                  </>
                                );
                              })()}

                            </div>
                          );
                        })()}

                        {/* CASO B SIN LÍNEAS */}
                        {editId && !tieneLineas && (
                              <div className="bg-muted/10 border border-border/50 rounded-lg p-4">
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-sm font-medium">Número de Palmas</Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Sin líneas definidas - Total de palmas en el sublote
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Input
                                      type="number"
                                      placeholder="Ej: 170"
                                      value={(cantPalmasForm[sub.id] ?? sub.cantidadPalmas) || ''}
                                      onChange={e => setCantPalmasForm(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                      min="0"
                                      className="h-12 text-base max-w-xs"
                                    />
                                    
                                  </div>
                                </div>
                              </div>
                            )}

                        {/* ── MODO CREACIÓN: formulario por sublote ──────── */}
                        {!editId && !cantPalmasForm[`confirmed_${sub.id}`] && (
                          <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                            <div className="space-y-2">
                              <Label>Cantidad de palmas</Label>
                              <Input
                                type="number"
                                placeholder="Ej: 50"
                                value={cantPalmasForm[sub.id] ?? ''}
                                onChange={e => setCantPalmasForm(prev => ({ ...prev, [sub.id]: e.target.value }))}
                              />
                            </div>
                            {linSub.length > 0 && (
                              <div className="space-y-2">
                                <Label>Línea (opcional)</Label>
                                <select
                                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                  value={cantPalmasForm[`linea_${sub.id}`] ?? ''}
                                  onChange={e => setCantPalmasForm(prev => ({ ...prev, [`linea_${sub.id}`]: e.target.value }))}
                                >
                                  <option value="">Sin línea</option>
                                  {linSub.map(linea => (
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
                                  if (cant > 0) {
                                    setCantPalmasForm(prev => ({ ...prev, [`confirmed_${sub.id}`]: String(cant) }));
                                  }
                                }}
                                disabled={!cantPalmasForm[sub.id] || parseInt(cantPalmasForm[sub.id] ?? '0') <= 0}
                              >
                                Guardar
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setCantPalmasForm(prev => ({ ...prev, [sub.id]: '' }))}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* MODO CREACIÓN: resumen tras confirmar */}
                        {!editId && cantPalmasForm[`confirmed_${sub.id}`] && (
                          <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Leaf className="h-5 w-5 text-success" />
                                <span className="font-semibold">
                                  {cantPalmasForm[`confirmed_${sub.id}`]} palmas registradas
                                </span>
                              </div>
                              <Badge variant="secondary" className="bg-success/10 text-success">
                                Completado
                              </Badge>
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
              {etapa < ETAPAS.length ? (
                <Button onClick={() => setEtapa(e => e + 1)}
                  disabled={!puedeSiguiente} className="gap-2">
                  Siguiente <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={guardarTodo} disabled={guardando}
                  className="gap-2 bg-success hover:bg-success/90">
                  {guardando
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
                    : <><Save className="h-4 w-4" />{editId ? 'Guardar Cambios' : 'Guardar Plantación'}</>}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Columna derecha: panel resumen ─────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <Trees className="h-5 w-5 text-primary" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {PanelResumen()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function FormLote({
  semillasCatalogo, haDisponibles, onGuardar, onCancelar,
}: {
  semillasCatalogo: {id:number;tipo:string;nombre:string}[];
  haDisponibles: number;
  onGuardar: (l: Omit<any, 'id'>) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre]        = useState('');
  const [fecha, setFecha]          = useState('');
  const [ha, setHa]                = useState('');
  const [semillaId, setSemillaId]  = useState('');
  const [otraVariedad, setOtraVariedad] = useState('');

  const esOtros = semillaId === '__otros__';
  const variedadFinal = esOtros ? otraVariedad : (semillasCatalogo.find(s => String(s.id) === semillaId)?.nombre ?? semillaId);

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-lg">Nuevo Lote</h3>
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
            type="number"
            placeholder="0"
            max={haDisponibles}
            value={ha}
            onChange={e => setHa(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Disponibles: {haDisponibles.toFixed(2)} ha
          </p>
        </div>
        <div className="space-y-2">
          <Label>Variedad / Semilla *</Label>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
            value={semillaId}
            onChange={e => { setSemillaId(e.target.value); setOtraVariedad(''); }}
          >
            <option value="">Seleccionar variedad</option>
            {semillasCatalogo.length > 0
              ? semillasCatalogo.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {s.nombre}
                  </option>
                ))
              : ['Elaeis Guineensis', 'Híbrido OxG', 'Compacta E3'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))
            }
            <option value="__otros__">Otros</option>
          </select>
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
            const semillasIds = semillaId && !isNaN(Number(semillaId)) ? [Number(semillaId)] : [];
            onGuardar({ nombre, fechaSiembra: fecha, hectareasSembradas: Number(ha) || 0, semillasIds, variedad: variedadFinal });
          }}
          disabled={!nombre || !ha || !semillaId || (esOtros && !otraVariedad.trim())}
        >
          Guardar Lote
        </Button>
        <Button variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function FormSublote({ onGuardar, onCancelar }: { onGuardar: (n: string) => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState('');
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
        <Button onClick={() => onGuardar(nombre)} disabled={!nombre.trim()}>Guardar</Button>
        <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
      </div>
    </div>
  );
}