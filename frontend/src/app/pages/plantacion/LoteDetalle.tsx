/**
 * LoteDetalle.tsx
 * §2.2 GET /lotes/{id}       → sublotes[]{cantidad_palmas, palmas_count}, semillas[]
 * §3.5 DELETE /sublotes/{id} → recursivo
 * §4.1 GET /palmas            → SIEMPRE paginada, per_page=50, meta.{current_page,last_page,total}
 *   Con líneas:   ?sublote_id=X&linea_id=Y
 *   Sin líneas:   ?sublote_id=X
 *   Huérfanas:    ?sublote_id=X&sin_linea=1
 * §4.5 DELETE /palmas/masivo → { palmas_ids: [] }
 * §5.1 GET /lineas?sublote_id=X
 * §5.5 DELETE /lineas/{id}   → palmas quedan con linea_id=null
 *
 * CONDICIONAL:
 *   sublote CON líneas  → Caso A: acordeón de líneas + sección de palmas huérfanas
 *   sublote SIN líneas  → Caso B: palmas directo del sublote
 */
import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '../../components/ui/accordion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowLeft, MapPin, Calendar, Sprout, Leaf, Plus, Trash2,
  ChevronDown, CheckSquare, Square, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { lotesApi, sublotesApi, palmasApi, lineasApi } from '../../../api/plantacion';
import { toast } from 'sonner';

const PER_PAGE = 50;

interface PageState {
  data: any[];
  total: number;
  page: number;
  lastPage: number;
  loading: boolean;
}

// ─── PalmasSection ────────────────────────────────────────────────────────────
// FUERA de LoteDetalle para que React no lo desmonte/remonte en cada render
// (si estuviera dentro, cambiaría de tipo en cada render → bug de paginación)
interface PalmasSectionProps {
  palmasKey: string;
  params: { sublote_id?: number; linea_id?: number; sin_linea?: boolean };
  subId: string;
  lineaId: string | null;
  agregarUrl: string;
  palmasPag: Record<string, PageState>;
  selKey: string | null;
  selIds: Set<string>;
  onCargar: (key: string, params: any, page: number) => void;
  onActivarSel: (key: string) => void;
  onCancelarSel: () => void;
  onToggle: (pid: string) => void;
  onSelTodas: (key: string) => void;
  onEliminar: (pid: string, subId: string, lineaId: string | null, key: string, params: any) => void;
  onEliminarMasivo: (subId: string, lineaId: string | null, key: string, params: any) => void;
  onNavegar: (url: string) => void;
}

const PalmasSection = memo(({
  palmasKey, params, subId, lineaId, agregarUrl,
  palmasPag, selKey, selIds,
  onCargar, onActivarSel, onCancelarSel, onToggle, onSelTodas,
  onEliminar, onEliminarMasivo, onNavegar,
}: PalmasSectionProps) => {
  const ps    = palmasPag[palmasKey];
  const enSel = selKey === palmasKey;

  if (!ps || ps.loading) return (
    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" /> Cargando palmas...
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {ps.total.toLocaleString('es-CO')} palmas
          {ps.lastPage > 1 && <span> · página {ps.page} / {ps.lastPage}</span>}
          {enSel && <span className="ml-2 text-primary font-semibold">({selIds.size} sel.)</span>}
        </p>
        <div className="flex gap-2 flex-wrap">
          {enSel ? (
            <>
              <Button size="sm" variant="outline" onClick={() => onSelTodas(palmasKey)}>
                <CheckSquare className="h-3.5 w-3.5 mr-1" /> Todas ({ps.data.length})
              </Button>
              {selIds.size > 0 && (
                <Button size="sm" variant="destructive"
                  onClick={() => onEliminarMasivo(subId, lineaId, palmasKey, params)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar ({selIds.size})
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onCancelarSel}>Cancelar</Button>
            </>
          ) : (
            <>
              {ps.total > 1 && (
                <Button size="sm" variant="outline" onClick={() => onActivarSel(palmasKey)}>
                  <CheckSquare className="h-3.5 w-3.5 mr-1" /> Selección Masiva
                </Button>
              )}
              <Button size="sm" onClick={() => onNavegar(agregarUrl)}
                className="gap-1 bg-success hover:bg-success/90 text-primary">
                <Plus className="h-3.5 w-3.5" /> Agregar Palmas
              </Button>
            </>
          )}
        </div>
      </div>

      {ps.data.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {ps.data.map((palma: any) => {
              const pid = String(palma.id);
              const sel = selIds.has(pid);
              return (
                <div key={palma.id}
                  onClick={() => enSel && onToggle(pid)}
                  className={[
                    'relative group rounded-lg border-2 p-3 transition-all',
                    enSel ? 'cursor-pointer' : '',
                    sel ? 'ring-2 ring-primary ring-offset-2' : '',
                    palma.estado
                      ? 'bg-success/5 border-success/30 hover:border-success'
                      : 'bg-destructive/5 border-destructive/30',
                  ].filter(Boolean).join(' ')}>
                  {enSel && (
                    <div className="absolute top-2 left-2">
                      {sel
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  )}
                  <div className={`text-center ${enSel ? 'mt-3' : ''}`}>
                    <p className={`text-xs font-mono font-semibold mb-1 ${palma.estado ? 'text-success' : 'text-destructive'}`}>
                      {palma.codigo}
                    </p>
                    <p className="text-xs text-muted-foreground">{palma.estado ? 'Activa' : 'Inactiva'}</p>
                  </div>
                  {!enSel && (
                    <button
                      onClick={() => onEliminar(pid, subId, lineaId, palmasKey, params)}
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-all">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* §4.1 Paginación */}
          {ps.lastPage > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                {((ps.page - 1) * PER_PAGE) + 1}–{Math.min(ps.page * PER_PAGE, ps.total)} de {ps.total.toLocaleString('es-CO')}
              </p>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={ps.page <= 1}
                  onClick={() => onCargar(palmasKey, params, ps.page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const start = Math.max(1, Math.min(ps.page - 2, ps.lastPage - 4));
                  const end   = Math.min(ps.lastPage, start + 4);
                  return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => (
                    <Button key={p} size="sm" variant={p === ps.page ? 'default' : 'outline'}
                      className="h-8 w-8 p-0"
                      onClick={() => onCargar(palmasKey, params, p)}>
                      {p}
                    </Button>
                  ));
                })()}
                <Button size="sm" variant="outline" disabled={ps.page >= ps.lastPage}
                  onClick={() => onCargar(palmasKey, params, ps.page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6 text-sm text-muted-foreground">
          No hay palmas {lineaId ? 'en esta línea' : 'en este sublote'}
        </div>
      )}
    </div>
  );
});
PalmasSection.displayName = 'PalmasSection';

// ─── LoteDetalle ─────────────────────────────────────────────────────────────
export default function LoteDetalle() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [lote, setLote]           = useState<any>(null);
  const [sublotes, setSublotes]   = useState<any[]>([]);
  const [lineasMap, setLineasMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading]     = useState(true);
  const [palmasPag, setPalmasPag] = useState<Record<string, PageState>>({});

  // Acordeones: subloteOpen no se resetea al recargar para que el usuario no pierda su lugar
  const [subloteOpen, setSubloteOpen] = useState('');
  const [lineaOpen, setLineaOpen]     = useState<Record<string, string>>({});

  const [selKey, setSelKey]     = useState<string | null>(null);
  const [selIds, setSelIds]     = useState<Set<string>>(new Set());
  const [elimItem, setElimItem] = useState<any>(null);
  const [elimOpen, setElimOpen] = useState(false);

  // ── Carga principal ──────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await lotesApi.ver(Number(id));
      const d   = res.data;
      setLote(d);
      const subs: any[] = d.sublotes ?? [];
      setSublotes(subs);

      // §5.1 Cargar líneas de cada sublote
      const lmap: Record<string, any[]> = {};
      await Promise.all(subs.map(async (s: any) => {
        try {
          const lr = await lineasApi.listar({ sublote_id: Number(s.id), per_page: 100 });
          lmap[String(s.id)] = lr.data ?? [];
        } catch {
          lmap[String(s.id)] = [];
        }
      }));
      setLineasMap(lmap);
      // Limpiar palmas para forzar recarga fresca (no reseteamos acordeones)
      setPalmasPag({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar lote');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Auto-expandir sublote al volver de CrearLinea / CrearPalmas ──────────
  // CrearLinea navega con state: { openSubloteId }
  useEffect(() => {
    if (loading) return;
    const autoOpen = location.state?.openSubloteId;
    if (!autoOpen) return;

    const subId = String(autoOpen);
    setSubloteOpen(subId);

    const lineas      = lineasMap[subId] ?? [];
    const tieneLineas = lineas.length > 0;

    if (!tieneLineas) {
      cargarPalmas(`sub_${subId}`, { sublote_id: Number(subId) });
    } else {
      cargarPalmas(`sinlinea_${subId}`, { sublote_id: Number(subId), sin_linea: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lineasMap]);

  // ── §4.1 Cargar página de palmas (SIEMPRE paginada) ───────────────────────
  const cargarPalmas = useCallback(async (
    key: string,
    params: { sublote_id?: number; linea_id?: number; sin_linea?: boolean },
    page = 1
  ) => {
    setPalmasPag(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? { data: [], total: 0, page: 1, lastPage: 1 }), loading: true },
    }));
    try {
      const res = await palmasApi.listar({ ...params, per_page: PER_PAGE, page });
      setPalmasPag(prev => ({
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
      setPalmasPag(prev => ({
        ...prev,
        [key]: { data: [], total: 0, page: 1, lastPage: 1, loading: false },
      }));
    }
  }, []);

  // ── Recargar datos parciales ──────────────────────────────────────────────
  const recargarConteos = useCallback(async () => {
    if (!id) return;
    try {
      const res = await lotesApi.ver(Number(id));
      setSublotes(res.data?.sublotes ?? []);
    } catch { /* silent */ }
  }, [id]);

  const recargarLineas = useCallback(async (subId: string) => {
    try {
      const lr = await lineasApi.listar({ sublote_id: Number(subId), per_page: 100 });
      setLineasMap(prev => ({ ...prev, [subId]: lr.data ?? [] }));
    } catch { /* silent */ }
  }, []);

  // ── onValueChange para acordeón de sublotes ───────────────────────────────
  // Leer lineasMap directamente en el momento de apertura para evitar stale closure
  const handleSubloteChange = (val: string) => {
    setSubloteOpen(val);
    if (!val) return;

    // lineasMap siempre es el estado más reciente (esta función se recrea en cada render)
    const lineas      = lineasMap[val] ?? [];
    const tieneLineas = lineas.length > 0;

    if (!tieneLineas) {
      cargarPalmas(`sub_${val}`, { sublote_id: Number(val) });
    } else {
      cargarPalmas(`sinlinea_${val}`, { sublote_id: Number(val), sin_linea: true });
    }
  };

  // ── onValueChange para acordeón de líneas ─────────────────────────────────
  const handleLineaChange = (subId: string, val: string) => {
    setLineaOpen(prev => ({ ...prev, [subId]: val }));
    if (!val) return;
    cargarPalmas(`linea_${val}`, { sublote_id: Number(subId), linea_id: Number(val) });
  };

  // ── Callbacks estables para PalmasSection ────────────────────────────────
  const cbActivarSel    = useCallback((key: string) => { setSelKey(key); setSelIds(new Set()); }, []);
  const cbCancelarSel   = useCallback(() => { setSelKey(null); setSelIds(new Set()); }, []);
  const cbToggle        = useCallback((pid: string) => {
    setSelIds(prev => { const n = new Set(prev); n.has(pid) ? n.delete(pid) : n.add(pid); return n; });
  }, []);
  const cbSelTodas      = useCallback((key: string) => {
    setSelIds(new Set((palmasPag[key]?.data ?? []).map((p: any) => String(p.id))));
  }, [palmasPag]);
  const cbNavegar       = useCallback((url: string) => navigate(url), [navigate]);
  const cbEliminar      = useCallback((pid: string, subId: string, lineaId: string | null, key: string, params: any) => {
    setElimItem({ tipo: 'palma', itemId: pid, subId, lineaId, palmasKey: key, palmasParams: params });
    setElimOpen(true);
  }, []);
  const cbEliminarMasivo = useCallback((subId: string, lineaId: string | null, key: string, params: any) => {
    setElimItem({ tipo: 'masiva', subId, lineaId, palmasKey: key, palmasParams: params });
    setElimOpen(true);
  }, []);

  // ── Confirmar eliminación ─────────────────────────────────────────────────
  const confirmarEliminar = async () => {
    if (!elimItem) return;
    const { tipo, itemId, subId, lineaId, palmasKey, palmasParams } = elimItem;
    try {
      if (tipo === 'sublote') {
        await sublotesApi.eliminar(Number(itemId));
        toast.success('Sublote eliminado');
        setSubloteOpen('');
        await cargar();

      } else if (tipo === 'linea') {
        await lineasApi.eliminar(Number(itemId));
        toast.success('Línea eliminada — palmas quedan en el sublote sin línea');
        await recargarLineas(subId);
        setPalmasPag(prev => { const n = { ...prev }; delete n[`linea_${lineaId}`]; return n; });
        setLineaOpen(prev => ({ ...prev, [subId]: '' }));
        cargarPalmas(`sinlinea_${subId}`, { sublote_id: Number(subId), sin_linea: true });

      } else if (tipo === 'palma') {
        await palmasApi.eliminar([Number(itemId)]);
        toast.success('Palma eliminada');
        const ps = palmasPag[palmasKey];
        cargarPalmas(palmasKey, palmasParams, ps?.page ?? 1);
        recargarConteos();

      } else if (tipo === 'masiva') {
        await palmasApi.eliminar(Array.from(selIds).map(Number));
        toast.success(`${selIds.size} palmas eliminadas`);
        setSelIds(new Set());
        setSelKey(null);
        const ps = palmasPag[palmasKey];
        cargarPalmas(palmasKey, palmasParams, ps?.page ?? 1);
        recargarConteos();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
    setElimOpen(false);
    setElimItem(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
      <Loader2 className="w-5 h-5 animate-spin" /> Cargando lote...
    </div>
  );

  if (!lote) return (
    <Card><CardContent className="p-12 text-center">
      <h2 className="text-2xl font-bold mb-2">Lote no encontrado</h2>
      <Button onClick={() => navigate('/plantacion')}>Volver</Button>
    </CardContent></Card>
  );

  const predio      = lote.predio ?? {};
  const semillas    = lote.semillas ?? [];
  const totalPalmas = sublotes.reduce(
    (s: number, sub: any) => s + Number(sub.cantidad_palmas ?? sub.palmas_count ?? 0), 0
  );

  // Props comunes para PalmasSection
  const pProps = {
    palmasPag, selKey, selIds,
    onCargar: cargarPalmas,
    onActivarSel: cbActivarSel,
    onCancelarSel: cbCancelarSel,
    onToggle: cbToggle,
    onSelTodas: cbSelTodas,
    onNavegar: cbNavegar,
    onEliminar: cbEliminar,
    onEliminarMasivo: cbEliminarMasivo,
  };

  return (
    <div className="space-y-8">
      <AlertDialog open={elimOpen} onOpenChange={setElimOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {elimItem?.tipo === 'sublote' && 'Elimina el sublote y todas sus palmas.'}
              {elimItem?.tipo === 'linea'   && 'Elimina la línea. Las palmas quedan en el sublote sin línea (no se borran).'}
              {elimItem?.tipo === 'palma'   && 'Elimina esta palma permanentemente.'}
              {elimItem?.tipo === 'masiva'  && `Elimina ${selIds.size} palmas permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/plantacion" className="hover:text-primary">Mi Plantación</Link>
        <span>›</span>
        <span className="font-medium text-foreground">{predio.nombre}</span>
        <span>›</span>
        <span className="font-medium text-foreground">{lote.nombre}</span>
      </nav>

      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/plantacion')}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold">{lote.nombre}</h1>
          <p className="text-muted-foreground">Predio: {predio.nombre}</p>
        </div>
      </div>

      <Card className="border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Información del Lote</CardTitle>
          <CardDescription>Datos generales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                <Calendar className="h-4 w-4" /> Fecha Siembra
              </p>
              <p className="text-2xl font-bold">
                {lote.fecha_siembra
                  ? new Date(lote.fecha_siembra + 'T12:00:00').toLocaleDateString('es-CO')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin className="h-4 w-4" /> Hectáreas
              </p>
              <p className="text-2xl font-bold">{Number(lote.hectareas_sembradas ?? 0).toFixed(2)} ha</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                <Sprout className="h-4 w-4" /> Sublotes
              </p>
              <p className="text-2xl font-bold text-primary">{sublotes.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                <Leaf className="h-4 w-4" /> Total Palmas
              </p>
              <p className="text-2xl font-bold text-success">{totalPalmas.toLocaleString('es-CO')}</p>
            </div>
            {semillas.length > 0 && (
              <div className="col-span-full">
                <p className="text-sm font-medium text-muted-foreground mb-2">Semillas</p>
                <div className="flex flex-wrap gap-1.5">
                  {semillas.map((s: any, i: number) => (
                    <Badge key={i} className="text-xs bg-primary/10 text-primary border border-primary/20">
                      {s.nombre ?? s.tipo ?? s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Sublotes</h2>
            <p className="text-muted-foreground mt-1">Gestiona sublotes, líneas y palmas</p>
          </div>
          <Button onClick={() => navigate(`/plantacion/sublote/nuevo?loteId=${id}`)}
            className="gap-2 bg-success hover:bg-success/90 text-primary shadow-lg shadow-success/20">
            <Plus className="h-4 w-4" /> Nuevo Sublote
          </Button>
        </div>

        {sublotes.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center py-12">
              <Sprout className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No hay sublotes</p>
              <Button onClick={() => navigate(`/plantacion/sublote/nuevo?loteId=${id}`)}
                className="gap-2 bg-success hover:bg-success/90 text-primary">
                <Plus className="h-4 w-4" /> Crear Primer Sublote
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-4"
            value={subloteOpen}
            onValueChange={handleSubloteChange}>

            {sublotes.map((sublote: any) => {
              const subId       = String(sublote.id);
              // lineasMap cargado en cargar() para CADA sublote
              const lineas      = lineasMap[subId] ?? [];
              const tieneLineas = lineas.length > 0;
              const cantPalmas  = Number(sublote.cantidad_palmas ?? sublote.palmas_count ?? 0);
              const abierto     = subloteOpen === subId;

              return (
                <AccordionItem key={sublote.id} value={subId}
                  className="rounded-2xl border-0 bg-gradient-to-br from-card/60 to-card/40 border border-border/50 shadow-lg overflow-hidden">
                  <div className="relative">
                    <AccordionTrigger className="px-8 py-6 hover:no-underline [&>svg]:hidden">
                      <div className="flex w-full items-center gap-6 pr-20">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 border border-success/20">
                          <Sprout className="h-8 w-8 text-success" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-2xl font-bold mb-2">{sublote.nombre}</p>
                          <div className="flex items-center gap-3 flex-wrap text-sm">
                            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold">
                              {lineas.length} {lineas.length === 1 ? 'línea' : 'líneas'}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-success/10 border border-success/20 text-success font-semibold">
                              {cantPalmas.toLocaleString('es-CO')} palmas
                            </span>
                            <Badge className={sublote.estado ? 'bg-success' : ''}>
                              {sublote.estado ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <div className="absolute right-20 top-1/2 -translate-y-1/2 z-20">
                      <Button variant="ghost" size="icon"
                        onClick={e => {
                          e.stopPropagation();
                          setElimItem({ tipo: 'sublote', itemId: subId });
                          setElimOpen(true);
                        }}
                        className="h-10 w-10 rounded-xl border border-border/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <ChevronDown className={`h-5 w-5 text-primary transition-transform ${abierto ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>

                  <AccordionContent>
                    <div className="px-8 pb-8 pt-4 space-y-8">

                      {/* ── CASO A: Sublote CON líneas ──────────────────── */}
                      {tieneLineas && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-border/30">
                            <div>
                              <h3 className="text-lg font-semibold">Líneas</h3>
                              <p className="text-sm text-muted-foreground">
                                {lineas.length} {lineas.length === 1 ? 'línea' : 'líneas'} — expande una para ver sus palmas
                              </p>
                            </div>
                            <Button
                              onClick={() => navigate(
                                `/plantacion/linea/nuevo` +
                                `?loteId=${id}&subloteId=${sublote.id}` +
                                `&nombreSublote=${encodeURIComponent(sublote.nombre)}`
                              )}
                              className="gap-2 bg-success hover:bg-success/90 text-primary">
                              <Plus className="h-4 w-4" /> Nueva Línea
                            </Button>
                          </div>

                          <Accordion type="single" collapsible className="space-y-3"
                            value={lineaOpen[subId] ?? ''}
                            onValueChange={val => handleLineaChange(subId, val)}>

                            {lineas.map((linea: any) => {
                              const lineaId  = String(linea.id);
                              const cantReal = Number(linea.palmas_count ?? 0);
                              const cantTeo  = Number(linea.cantidad_palmas ?? 0);
                              const lineaAb  = (lineaOpen[subId] ?? '') === lineaId;

                              return (
                                <AccordionItem key={linea.id} value={lineaId}
                                  className="rounded-xl bg-muted/30 border border-border/50 overflow-hidden">
                                  <div className="relative">
                                    <AccordionTrigger className="px-6 py-4 hover:no-underline [&>svg]:hidden">
                                      <div className="flex w-full items-center gap-4 pr-24">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                                          <Leaf className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="text-left flex-1">
                                          <p className="text-lg font-bold">Línea {linea.numero}</p>
                                          <div className="flex items-center gap-3 text-sm mt-1">
                                            <span className="text-muted-foreground">
                                              {cantReal.toLocaleString('es-CO')} palmas reales
                                              {cantTeo !== cantReal && (
                                                <span className="ml-1 opacity-50 text-xs">(teórico: {cantTeo.toLocaleString('es-CO')})</span>
                                              )}
                                            </span>
                                            <Badge variant={linea.estado ? 'default' : 'secondary'}
                                              className={`text-xs ${linea.estado ? 'bg-success' : ''}`}>
                                              {linea.estado ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <div className="absolute right-14 top-1/2 -translate-y-1/2 z-20">
                                      <Button variant="ghost" size="icon"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setElimItem({ tipo: 'linea', itemId: lineaId, subId, lineaId });
                                          setElimOpen(true);
                                        }}
                                        className="h-8 w-8 rounded-lg border border-border/50 text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                      <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                                        <ChevronDown className={`h-4 w-4 text-primary transition-transform ${lineaAb ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                                      </div>
                                    </div>
                                  </div>
                                  <AccordionContent>
                                    <div className="px-6 pb-6 pt-4">
                                      <PalmasSection
                                        {...pProps}
                                        palmasKey={`linea_${lineaId}`}
                                        params={{ sublote_id: Number(subId), linea_id: Number(lineaId) }}
                                        subId={subId}
                                        lineaId={lineaId}
                                        agregarUrl={
                                          `/plantacion/palmas/nuevo?loteId=${id}` +
                                          `&subloteId=${subId}&lineaId=${lineaId}` +
                                          `&numeroLinea=${linea.numero}` +
                                          `&nombreSublote=${encodeURIComponent(sublote.nombre)}` +
                                          `&palmasExistentes=${cantReal}`
                                        }
                                      />
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>

                          {/* Palmas sin línea (huérfanas tras eliminar una línea) */}
                          {(() => {
                            const sinKey = `sinlinea_${subId}`;
                            const sinPs  = palmasPag[sinKey];
                            if (!sinPs || sinPs.loading || sinPs.total === 0) return null;
                            return (
                              <div className="border border-amber-200 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-800/30 rounded-xl p-4 space-y-3">
                                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                  ⚠ {sinPs.total.toLocaleString('es-CO')} palma{sinPs.total !== 1 ? 's' : ''} sin línea asignada
                                </p>
                                <PalmasSection
                                  {...pProps}
                                  palmasKey={sinKey}
                                  params={{ sublote_id: Number(subId), sin_linea: true }}
                                  subId={subId}
                                  lineaId={null}
                                  agregarUrl={
                                    `/plantacion/palmas/nuevo?loteId=${id}` +
                                    `&subloteId=${subId}` +
                                    `&nombreSublote=${encodeURIComponent(sublote.nombre)}` +
                                    `&palmasExistentes=${sinPs.total}`
                                  }
                                />
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* ── CASO B: Sublote SIN líneas ──────────────────── */}
                      {!tieneLineas && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-border/30">
                            <div>
                              <h3 className="text-lg font-semibold">Palmas del Sublote</h3>
                              <p className="text-sm text-muted-foreground">
                                Sin líneas — palmas directas en el sublote
                              </p>
                            </div>
                            <Button size="sm" variant="outline"
                              onClick={() => navigate(
                                `/plantacion/linea/nuevo?loteId=${id}` +
                                `&subloteId=${sublote.id}` +
                                `&nombreSublote=${encodeURIComponent(sublote.nombre)}`
                              )}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Crear Líneas
                            </Button>
                          </div>
                          <PalmasSection
                            {...pProps}
                            palmasKey={`sub_${subId}`}
                            params={{ sublote_id: Number(subId) }}
                            subId={subId}
                            lineaId={null}
                            agregarUrl={
                              `/plantacion/palmas/nuevo?loteId=${id}` +
                              `&subloteId=${subId}` +
                              `&nombreSublote=${encodeURIComponent(sublote.nombre)}` +
                              `&palmasExistentes=${cantPalmas}`
                            }
                          />
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}