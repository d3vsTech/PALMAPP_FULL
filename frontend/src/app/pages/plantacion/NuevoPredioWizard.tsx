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
    page = 1
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
          data:     res.data ?? [],
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
          fechaSiembra: l.fecha_siembra ?? '',
          hectareasSembradas: Number(l.hectareas_sembradas ?? 0),
          semillasIds: (l.semillas ?? []).map((s: any) => Number(s.id)),
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
          const cantForm = parseInt(cantPalmasForm[sub.id] ?? '');
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
    if (editId && resumen) {
      // §1.6 Usar datos del API en modo edición
      const pr = resumen.predio ?? {};
      const tg = resumen.totales_generales ?? {};
      const ls = resumen.lotes ?? [];
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-muted-foreground uppercase">Predio</p>
            <p className="font-bold">{pr.nombre}</p>
            <p className="text-xs text-muted-foreground">{pr.ubicacion}</p>
            <div className="flex gap-3 text-xs mt-1">
              <span>{Number(pr.hectareas_totales ?? 0).toFixed(1)} ha totales</span>
              <span className="text-success">{Number(pr.hectareas_disponibles ?? 0).toFixed(1)} ha disponibles</span>
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { label: 'Lotes', val: tg.lotes ?? 0 },
              { label: 'Sublotes', val: tg.sublotes ?? 0 },
              { label: 'Palmas', val: (tg.palmas ?? 0).toLocaleString('es-CO') },
            ].map(({ label, val }) => (
              <div key={label} className="border border-border rounded-lg p-2">
                <p className="text-muted-foreground">{label}</p>
                <p className="font-bold text-lg">{val}</p>
              </div>
            ))}
          </div>
          {ls.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Por Lote</p>
              {ls.map((l: any) => (
                <div key={l.id} className="border border-border rounded-lg p-2 text-xs">
                  <div className="flex justify-between font-medium mb-1">
                    <span>{l.nombre}</span>
                    <span className="text-muted-foreground">{Number(l.hectareas_sembradas ?? 0).toFixed(1)} ha</span>
                  </div>
                  <div className="flex gap-3 text-muted-foreground">
                    <span>{l.totales?.sublotes ?? 0} sublotes</span>
                    <span className="text-success">{(l.totales?.palmas ?? 0).toLocaleString('es-CO')} palmas</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Modo creación: estado local
    return (
      <div className="space-y-4">
        {predioNombre && (
          <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Predio</p>
              <p className="font-bold">{predioNombre}</p>
              {predioUbicacion && <p className="text-xs text-muted-foreground">{predioUbicacion}</p>}
              {predioHectareas && (
                <div className="flex gap-3 text-xs mt-1">
                  <span>{Number(predioHectareas).toFixed(1)} ha totales</span>
                  {lotes.length > 0 && (
                    <span className="text-success">{haDisponibles.toFixed(1)} ha disponibles</span>
                  )}
                </div>
              )}
            </div>
            <div className="h-px bg-border" />
          </>
        )}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {[
            { label: 'Lotes', val: lotes.length },
            { label: 'Sublotes', val: sublotes.length },
            { label: 'Líneas', val: lineas.length },
          ].map(({ label, val }) => (
            <div key={label} className="border border-border rounded-lg p-2">
              <p className="text-muted-foreground">{label}</p>
              <p className="font-bold text-lg">{val}</p>
            </div>
          ))}
        </div>
        {lotes.map(lote => {
          const subls = sublotes.filter(s => s.loteId === lote.id);
          return (
            <div key={lote.id} className="border border-border rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between font-medium">
                <span>{lote.nombre}</span>
                <span className="text-muted-foreground">{lote.hectareasSembradas} ha</span>
              </div>
              {subls.map(s => (
                <div key={s.id} className="pl-2 flex justify-between text-muted-foreground">
                  <span>{s.nombre}</span>
                  <span className="text-success">{s.cantidadPalmas} palmas</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/plantacion')} className="rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold">{editId ? 'Editar Plantación' : 'Crear Nueva Plantación'}</h1>
          <p className="text-muted-foreground">Configura tu plantación paso a paso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Columna izquierda: wizard ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

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
                          <span className={`text-sm font-semibold ${activa || completa ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {e.nombre}
                          </span>
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
                    <p className="text-sm text-muted-foreground">Datos básicos</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input placeholder="Ej: Finca La Esperanza" maxLength={50}
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
                    <Label>Hectáreas Totales *</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0"
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
                        Disponibles: {haDisponibles.toFixed(2)} ha
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
                  <div key={l.id} className="border border-border rounded-lg p-4 flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{l.nombre}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        {l.fechaSiembra && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{l.fechaSiembra}</span>}
                        <span>{l.hectareasSembradas} ha</span>
                        {l.semillasIds.length > 0 && (
                          <span>{l.semillasIds.length} semilla{l.semillasIds.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => eliminarLote(l.id)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {lotes.length === 0 && !showFormLote && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Grid3x3 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>Agrega tu primer lote</p>
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
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Trees className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Sublotes</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {lotes.map(lote => {
                  const subls = sublotes.filter(s => s.loteId === lote.id);
                  return (
                    <div key={lote.id} className="border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{lote.nombre}</p>
                          <p className="text-sm text-muted-foreground">{subls.length} sublotes</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowFormSublote(lote.id)}>
                          <Plus className="h-4 w-4 mr-1" /> Agregar
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {subls.map(s => (
                          <div key={s.id} className="border border-border rounded-lg p-3 flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">{s.nombre}</p>
                              {s.cantidadPalmas > 0 && (
                                <p className="text-xs text-success">{s.cantidadPalmas} palmas</p>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => eliminarSublote(s.id)}
                              className="h-6 w-6 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
                  <div className="flex items-center gap-2">
                    <CardTitle>Líneas</CardTitle>
                    <Badge variant="secondary" className="bg-accent/10 text-accent">Opcional</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">
                    💡 Las líneas son metadata organizacional opcional. Puedes saltarte este paso.
                  </p>
                </div>
                {sublotes.map(sub => {
                  const linSub = lineas.filter(ln => ln.subloteId === sub.id);
                  const lote   = lotes.find(l => l.id === sub.loteId);
                  return (
                    <div key={sub.id} className="border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{sub.nombre}</p>
                          <p className="text-xs text-muted-foreground">{lote?.nombre} · {linSub.length} líneas</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => agregarLinea(sub.id)}>
                          <Plus className="h-4 w-4 mr-1" /> Agregar Línea
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {linSub.map(ln => (
                          <div key={ln.id} className="flex items-center gap-1 border border-border rounded-lg px-3 py-1.5 text-sm">
                            <GitBranch className="h-3.5 w-3.5 text-accent" />
                            <span>Línea {ln.numero}</span>
                            <button onClick={() => eliminarLinea(ln.id)}
                              className="ml-1 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {linSub.length === 0 && <p className="text-xs text-muted-foreground">Sin líneas</p>}
                      </div>
                    </div>
                  );
                })}
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
                    <CardTitle>Palmas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {editId ? 'Revisa y agrega palmas por sublote' : 'Define la cantidad inicial de palmas'}
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
                    <div key={sub.id} className="border border-border rounded-xl overflow-hidden">
                      {/* Cabecera del sublote */}
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                        <div>
                          <p className="font-semibold">{sub.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {lote?.nombre}
                            {' · '}
                            <span className="text-success font-medium">
                              {sub.cantidadPalmas.toLocaleString('es-CO')} palmas
                            </span>
                            {tieneLineas && ` · ${linSub.length} línea${linSub.length !== 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">

                        {/* ── MODO EDICIÓN ──────────────────────────────── */}
                        {editId && (
                          <>
                            {/* CASO A: Sublote CON líneas → palmas por línea paginadas */}
                            {tieneLineas && (
                              <div className="space-y-3">
                                {linSub.map(ln => {
                                  const lineaKey = `linea_${ln.id}`;
                                  const ps       = wizardPag[lineaKey];
                                  const abierta  = (wizardLineaOpen[sub.id] ?? '') === ln.id;

                                  return (
                                    <div key={ln.id} className="border border-border rounded-lg overflow-hidden">
                                      {/* Header de línea — click carga palmas */}
                                      <button
                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                                        onClick={() => {
                                          const estaAbierta = (wizardLineaOpen[sub.id] ?? '') === ln.id;
                                          setWizardLineaOpen(prev => ({
                                            ...prev,
                                            [sub.id]: estaAbierta ? '' : ln.id,
                                          }));
                                          if (!estaAbierta) {
                                            cargarWizardPalmas(lineaKey, {
                                              sublote_id: Number(sub.id),
                                              linea_id: Number(ln.id),
                                            });
                                          }
                                        }}>
                                        <div className="flex items-center gap-3">
                                          <Leaf className="h-4 w-4 text-primary" />
                                          <span className="font-medium text-sm">Línea {ln.numero}</span>
                                          {ps && !ps.loading && (
                                            <span className="text-xs text-muted-foreground">
                                              {ps.total.toLocaleString('es-CO')} palmas
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {/* Botón agregar palmas a esta línea */}
                                          <Button
                                            size="sm"
                                            onClick={e => {
                                              e.stopPropagation();
                                              const cant = parseInt(cantPalmasForm[`${sub.id}_${ln.id}`] ?? '');
                                              if (isNaN(cant) || cant < 1) { toast.error('Ingresa una cantidad válida'); return; }
                                              agregarPalmas(sub.id, cant, ln.id);
                                            }}
                                            className="h-7 px-2 text-xs bg-success hover:bg-success/90 text-primary">
                                            <Plus className="h-3 w-3 mr-1" /> Agregar
                                          </Button>
                                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${abierta ? 'rotate-180' : ''}`} />
                                        </div>
                                      </button>

                                      {/* Input cantidad inline */}
                                      <div className="px-4 pb-2 pt-1 border-t border-border/30 bg-muted/10 flex items-center gap-3">
                                        <Label className="text-xs whitespace-nowrap">Agregar palmas:</Label>
                                        <Input
                                          type="number" min="1" max="99999"
                                          placeholder="Cantidad"
                                          value={cantPalmasForm[`${sub.id}_${ln.id}`] ?? ''}
                                          onChange={e => setCantPalmasForm(prev => ({
                                            ...prev, [`${sub.id}_${ln.id}`]: e.target.value,
                                          }))}
                                          className="h-7 text-xs w-32"
                                        />
                                      </div>

                                      {/* Palmas de la línea paginadas */}
                                      {abierta && (
                                        <div className="px-4 pb-4 pt-2 space-y-3">
                                          {!ps || ps.loading ? (
                                            <div className="flex items-center gap-2 py-4 text-muted-foreground justify-center">
                                              <Loader2 className="h-4 w-4 animate-spin" /> Cargando palmas...
                                            </div>
                                          ) : ps.data.length === 0 ? (
                                            <p className="text-sm text-center text-muted-foreground py-4">
                                              No hay palmas en esta línea
                                            </p>
                                          ) : (
                                            <>
                                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                                {ps.data.map((palma: any) => (
                                                  <div key={palma.id}
                                                    className={`rounded-md border p-2 text-center ${palma.estado ? 'bg-success/5 border-success/30' : 'bg-muted border-border'}`}>
                                                    <p className="text-xs font-mono font-semibold truncate" title={palma.codigo}>
                                                      {palma.codigo}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                              {/* Paginación §4.1 */}
                                              {ps.lastPage > 1 && (
                                                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                                  <p className="text-xs text-muted-foreground">
                                                    {((ps.page - 1) * PER) + 1}–{Math.min(ps.page * PER, ps.total)} de {ps.total.toLocaleString('es-CO')}
                                                  </p>
                                                  <div className="flex gap-1">
                                                    <Button size="sm" variant="outline"
                                                      disabled={ps.page <= 1}
                                                      onClick={() => cargarWizardPalmas(lineaKey, { sublote_id: Number(sub.id), linea_id: Number(ln.id) }, ps.page - 1)}>
                                                      <ChevronLeft className="h-3 w-3" />
                                                    </Button>
                                                    <span className="text-xs px-2 py-1 border border-border rounded">
                                                      {ps.page} / {ps.lastPage}
                                                    </span>
                                                    <Button size="sm" variant="outline"
                                                      disabled={ps.page >= ps.lastPage}
                                                      onClick={() => cargarWizardPalmas(lineaKey, { sublote_id: Number(sub.id), linea_id: Number(ln.id) }, ps.page + 1)}>
                                                      <ChevronRight className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* CASO B: Sublote SIN líneas → solo muestra el número total */}
                            {!tieneLineas && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between rounded-lg bg-success/5 border border-success/20 px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <Leaf className="h-5 w-5 text-success" />
                                    <div>
                                      <p className="font-semibold text-success text-lg">
                                        {sub.cantidadPalmas.toLocaleString('es-CO')}
                                      </p>
                                      <p className="text-xs text-muted-foreground">palmas registradas en este sublote</p>
                                    </div>
                                  </div>
                                </div>
                                {/* Formulario para agregar más */}
                                <div className="flex items-center gap-3">
                                  <Input
                                    type="number" min="1" max="99999"
                                    placeholder="Agregar más palmas..."
                                    value={cantPalmasForm[sub.id] ?? ''}
                                    onChange={e => setCantPalmasForm(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                    className="h-9 text-sm"
                                  />
                                  <Button size="sm"
                                    onClick={() => {
                                      const cant = parseInt(cantPalmasForm[sub.id] ?? '');
                                      if (isNaN(cant) || cant < 1) { toast.error('Ingresa una cantidad válida'); return; }
                                      agregarPalmas(sub.id, cant, undefined);
                                    }}
                                    className="h-9 px-3 bg-success hover:bg-success/90 text-primary whitespace-nowrap">
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* ── MODO CREACIÓN → solo campo de cantidad ────── */}
                        {!editId && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Cantidad de palmas a crear en este sublote
                            </Label>
                            <Input type="number" min="0" max="99999"
                              placeholder="0 (dejar sin palmas por ahora)"
                              value={cantPalmasForm[sub.id] ?? ''}
                              onChange={e => setCantPalmasForm(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                              Más de 5.000 se procesarán en segundo plano.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trees className="h-5 w-5 text-primary" /> Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {/* Barra de progreso del wizard */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Paso {etapa} de {ETAPAS.length}</span>
                    <span>{Math.round((etapa / ETAPAS.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(etapa / ETAPAS.length) * 100}%` }} />
                  </div>
                </div>
                <div className="h-px bg-border mb-4" />
                <PanelResumen />
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
  const [nombre, setNombre]         = useState('');
  const [fecha, setFecha]           = useState('');
  const [ha, setHa]                 = useState('');
  const [semillasIds, setSemillas]  = useState<number[]>([]);

  const toggle = (id: number, v: boolean) =>
    setSemillas(prev => v ? [...prev, id] : prev.filter(x => x !== id));

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
      <h3 className="font-semibold">Nuevo Lote</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Nombre *</Label>
          <Input placeholder="Ej: Lote Norte" maxLength={100}
            value={nombre} onChange={e => setNombre(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fecha Siembra</Label>
          <Input type="date" value={fecha}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setFecha(e.target.value)} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Hectáreas Sembradas *</Label>
          <Input type="number" min="0" step="0.01" max={haDisponibles}
            placeholder="0" value={ha} onChange={e => setHa(e.target.value)} />
          <p className="text-xs text-muted-foreground">Disponibles: {haDisponibles.toFixed(2)} ha</p>
        </div>
        {semillasCatalogo.length > 0 && (
          <div className="md:col-span-2 space-y-2">
            <Label className="text-xs">Semillas</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {semillasCatalogo.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox"
                    checked={semillasIds.includes(Number(s.id))}
                    onChange={e => toggle(Number(s.id), e.target.checked)} />
                  {s.nombre} <span className="text-muted-foreground text-xs">({s.tipo})</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onGuardar({ nombre, fechaSiembra: fecha, hectareasSembradas: Number(ha) || 0, semillasIds })}
          disabled={!nombre || !ha}>
          Guardar Lote
        </Button>
        <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
      </div>
    </div>
  );
}

function FormSublote({ onGuardar, onCancelar }: { onGuardar: (n: string) => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState('');
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-3">
      <Label className="text-xs">Nombre del Sublote *</Label>
      <Input placeholder="Ej: Sector A" maxLength={50}
        value={nombre} onChange={e => setNombre(e.target.value)} />
      <div className="flex gap-2">
        <Button onClick={() => onGuardar(nombre)} disabled={!nombre.trim()} size="sm">Guardar</Button>
        <Button variant="outline" onClick={onCancelar} size="sm">Cancelar</Button>
      </div>
    </div>
  );
}