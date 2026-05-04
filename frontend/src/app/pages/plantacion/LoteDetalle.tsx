/**
 * LoteDetalle.tsx
 * §2.2 GET /lotes/{id}
 * §3.5 DELETE /sublotes/{id}
 * §4.1 GET /palmas — paginada per_page=50
 * §4.5 DELETE /palmas/masivo
 * §5.1 GET /lineas?sublote_id=X
 * §5.5 DELETE /lineas/{id}
 */
import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
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
        <p className="text-sm font-medium text-muted-foreground">
          Palmas {lineaId ? `de la Línea` : 'del Sublote'}
          {enSel && <span className="ml-2 text-primary font-semibold">({selIds.size} seleccionadas)</span>}
        </p>
        <div className="flex gap-2 flex-wrap">
          {enSel ? (
            <>
              <Button size="sm" variant="outline" onClick={() => onSelTodas(palmasKey)} className="gap-2">
                <CheckSquare className="h-3.5 w-3.5" /> Seleccionar Todas
              </Button>
              {selIds.size > 0 && (
                <Button size="sm" variant="destructive"
                  onClick={() => onEliminarMasivo(subId, lineaId, palmasKey, params)} className="gap-2">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar ({selIds.size})
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onCancelarSel}>Cancelar</Button>
            </>
          ) : (
            <>
              {ps.total > 1 && (
                <Button size="sm" variant="outline" onClick={() => onActivarSel(palmasKey)} className="gap-2">
                  <CheckSquare className="h-3.5 w-3.5" /> Selección Masiva
                </Button>
              )}
              <Button size="sm" onClick={() => onNavegar(agregarUrl)}
                className="gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary">
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
                      : 'bg-destructive/5 border-destructive/30 hover:border-destructive',
                    enSel ? 'hover:shadow-lg' : 'hover:shadow-md',
                  ].filter(Boolean).join(' ')}>
                  {enSel && (
                    <div className="absolute top-2 left-2 z-10">
                      {sel
                        ? <CheckSquare className="h-5 w-5 text-primary" />
                        : <Square className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  )}
                  <div className={`text-center ${enSel ? 'mt-4' : ''}`}>
                    <div className={`text-xs font-mono font-semibold mb-1 ${palma.estado ? 'text-success' : 'text-destructive'}`}>
                      {palma.codigo}
                    </div>
                    <div className={`text-xs ${palma.estado ? 'text-muted-foreground' : 'text-destructive/70'}`}>
                      {palma.estado ? 'Activa' : 'Inactiva'}
                    </div>
                  </div>
                  {!enSel && (
                    <button
                      onClick={() => onEliminar(pid, subId, lineaId, palmasKey, params)}
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Paginación */}
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
        <div className="text-center py-8 text-sm text-muted-foreground">
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

  const [subloteOpen, setSubloteOpen] = useState('');
  const [lineaOpen, setLineaOpen]     = useState<Record<string, string>>({});

  const [selKey, setSelKey]     = useState<string | null>(null);
  const [selIds, setSelIds]     = useState<Set<string>>(new Set());
  const [elimItem, setElimItem] = useState<any>(null);
  const [elimOpen, setElimOpen] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await lotesApi.ver(Number(id));
      const d   = res.data;
      setLote(d);
      const subs: any[] = d.sublotes ?? [];
      setSublotes(subs);

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
      setPalmasPag({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar lote');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

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

  const handleSubloteChange = (val: string) => {
    setSubloteOpen(val);
    if (!val) return;
    const lineas      = lineasMap[val] ?? [];
    const tieneLineas = lineas.length > 0;
    if (!tieneLineas) {
      cargarPalmas(`sub_${val}`, { sublote_id: Number(val) });
    } else {
      cargarPalmas(`sinlinea_${val}`, { sublote_id: Number(val), sin_linea: true });
    }
  };

  const handleLineaChange = (subId: string, val: string) => {
    setLineaOpen(prev => ({ ...prev, [subId]: val }));
    if (!val) return;
    cargarPalmas(`linea_${val}`, { sublote_id: Number(subId), linea_id: Number(val) });
  };

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

  // Estado basado en fecha de siembra
  const añosDesdeSiembra = lote.fecha_siembra
    ? Math.max(0, new Date().getFullYear() - new Date(lote.fecha_siembra.split('T')[0] + 'T12:00:00').getFullYear())
    : 0;
  const estado = añosDesdeSiembra >= 3 ? 'Activo' : 'En desarrollo';

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
      {/* Alert Dialog */}
      <AlertDialog open={elimOpen} onOpenChange={setElimOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {elimItem?.tipo === 'sublote' && (
                <div>
                  <p>Esto eliminará el sublote y todas sus líneas y palmas.</p>
                  <p className="text-primary font-medium mt-2">• Los contadores del lote se actualizarán automáticamente</p>
                </div>
              )}
              {elimItem?.tipo === 'linea' && (
                <div>
                  <p>Esto eliminará la línea. Las palmas quedan en el sublote sin línea.</p>
                  <p className="text-primary font-medium mt-2">• Los contadores del sublote se actualizarán automáticamente</p>
                </div>
              )}
              {elimItem?.tipo === 'palma' && (
                <div>
                  <p>Esto eliminará la palma permanentemente.</p>
                  <p className="text-primary font-medium mt-2">• Los contadores de la línea y del sublote se actualizarán automáticamente</p>
                </div>
              )}
              {elimItem?.tipo === 'masiva' && (
                <div>
                  <p>Esto eliminará <strong>{selIds.size}</strong> {selIds.size === 1 ? 'palma' : 'palmas'} seleccionadas permanentemente.</p>
                  <p className="text-primary font-medium mt-2">• Los contadores de la línea y del sublote se actualizarán automáticamente</p>
                </div>
              )}
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

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/plantacion" className="hover:text-primary transition-colors">Mi Plantación</Link>
        <span>›</span>
        <span className="text-foreground font-medium">{predio.nombre}</span>
        <span>›</span>
        <span className="text-foreground font-medium">{lote.nombre}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/plantacion')}
            className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">{lote.nombre}</h1>
            <p className="text-muted-foreground">
              Predio: {predio.nombre}
              {(lote.variedad || semillas.length > 0) && (
                <> • {lote.variedad || semillas[0]?.nombre || semillas[0]}</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Información del lote */}
      <Card className="glass-subtle border-border shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Información del Lote</CardTitle>
              <CardDescription className="mt-1">Datos generales y estado actual</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Fecha Siembra */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Fecha de Siembra</span>
              </div>
              <p className="text-2xl font-bold">
                {lote.fecha_siembra
                  ? (() => {
                      const d = new Date(lote.fecha_siembra.includes('T') ? lote.fecha_siembra : lote.fecha_siembra + 'T12:00:00');
                      return isNaN(d.getTime()) ? lote.fecha_siembra : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    })()
                  : '—'}
              </p>
              {añosDesdeSiembra > 0 && (
                <p className="text-xs text-muted-foreground">
                  Hace {añosDesdeSiembra} {añosDesdeSiembra === 1 ? 'año' : 'años'}
                </p>
              )}
            </div>

            {/* Hectáreas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Hectáreas Sembradas</span>
              </div>
              <p className="text-2xl font-bold">{Number(lote.hectareas_sembradas ?? 0).toFixed(2)} ha</p>
              {predio.hectareas_totales && (
                <p className="text-xs text-muted-foreground">
                  {((Number(lote.hectareas_sembradas ?? 0) / Number(predio.hectareas_totales)) * 100).toFixed(1)}% del predio
                </p>
              )}
            </div>

            {/* Sublotes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sprout className="h-4 w-4" />
                <span className="text-sm font-medium">Sublotes</span>
              </div>
              <p className="text-2xl font-bold text-primary">{sublotes.length}</p>
              <p className="text-xs text-muted-foreground">{sublotes.length} registrados</p>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Leaf className="h-4 w-4" />
                <span className="text-sm font-medium">Estado</span>
              </div>
              <Badge
                variant={estado === 'Activo' ? 'default' : 'secondary'}
                className={`text-sm px-3 py-1 ${
                  estado === 'Activo'
                    ? 'bg-success text-white'
                    : 'bg-accent/10 text-accent border border-accent/20'
                }`}
              >
                {estado}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {estado === 'Activo' ? 'Producción óptima' : 'Fase de crecimiento'}
              </p>
            </div>

            {/* Total Palmas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Leaf className="h-4 w-4" />
                <span className="text-sm font-medium">Total Palmas</span>
              </div>
              <p className="text-2xl font-bold text-success">{totalPalmas.toLocaleString('es-CO')}</p>
              {Number(lote.hectareas_sembradas) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {(totalPalmas / Number(lote.hectareas_sembradas)).toFixed(0)} palmas/ha
                </p>
              )}
            </div>

            {/* Semillas */}
            {semillas.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sprout className="h-4 w-4" />
                  <span className="text-sm font-medium">Semillas Asociadas</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {semillas.map((s: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
                      {s.nombre ?? s.tipo ?? s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sección Sublotes */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Sublotes</h2>
            <p className="text-muted-foreground mt-1">
              Gestiona los sublotes, líneas y palmas de <strong className="text-primary">{lote.nombre}</strong>
            </p>
          </div>
          <Button onClick={() => navigate(`/plantacion/sublote/nuevo?loteId=${id}`)}
            className="gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20">
            <Plus className="h-4 w-4" /> Nuevo Sublote
          </Button>
        </div>

        {sublotes.length === 0 ? (
          <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 mb-4">
                <Sprout className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold mb-2">No hay sublotes registrados</p>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Comienza creando el primer sublote para organizar mejor tu lote
              </p>
              <Button onClick={() => navigate(`/plantacion/sublote/nuevo?loteId=${id}`)}
                className="gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary">
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
              const lineas      = lineasMap[subId] ?? [];
              const tieneLineas = lineas.length > 0;
              const cantPalmas  = Number(sublote.cantidad_palmas ?? sublote.palmas_count ?? 0);
              const abierto     = subloteOpen === subId;

              return (
                <AccordionItem key={sublote.id} value={subId}
                  className="rounded-2xl border-0 bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all overflow-hidden">
                  <div className="relative">
                    <AccordionTrigger className="px-8 py-6 hover:no-underline relative z-10 [&>svg]:hidden">
                      <div className="flex w-full items-center gap-6 pr-20">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-success/20 to-success/10 shadow-lg shadow-success/10 border border-success/20">
                          <Sprout className="h-8 w-8 text-success" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="text-2xl font-bold mb-2">{sublote.nombre}</div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                              <Leaf className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-primary">{lineas.length} {lineas.length === 1 ? 'línea' : 'líneas'}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                              <Leaf className="h-4 w-4 text-success" />
                              <span className="font-semibold text-success">{cantPalmas.toLocaleString('es-CO')} palmas</span>
                            </div>
                            <Badge className={sublote.estado ? 'bg-success' : ''}>
                              {sublote.estado ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <div className="absolute right-20 top-1/2 -translate-y-1/2 flex gap-2 z-20">
                      <Button variant="ghost" size="icon"
                        onClick={e => {
                          e.stopPropagation();
                          setElimItem({ tipo: 'sublote', itemId: subId });
                          setElimOpen(true);
                        }}
                        className="h-10 w-10 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 shadow-md">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <ChevronDown className={`h-5 w-5 text-primary transition-transform duration-300 ${abierto ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>

                  <AccordionContent>
                    <div className="space-y-6 px-8 pb-8 pt-2">

                      {/* CASO A: Sublote CON líneas */}
                      {tieneLineas && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pt-4 pb-2 border-t border-border/30">
                            <div>
                              <h3 className="text-lg font-semibold">Líneas del Sublote</h3>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {lineas.length} {lineas.length === 1 ? 'línea registrada' : 'líneas registradas'}
                              </p>
                            </div>
                            <Button
                              onClick={() => navigate(
                                `/plantacion/linea/nuevo?loteId=${id}&subloteId=${sublote.id}` +
                                `&nombreSublote=${encodeURIComponent(sublote.nombre)}`
                              )}
                              className="gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20">
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
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                                          <Leaf className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="text-left flex-1">
                                          <div className="text-lg font-bold">Línea {linea.numero}</div>
                                          <div className="flex items-center gap-3 text-sm mt-1">
                                            <span className="text-muted-foreground">
                                              {cantReal.toLocaleString('es-CO')} palmas
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
                                    <div className="absolute right-14 top-1/2 -translate-y-1/2 flex gap-2 z-20">
                                      <Button variant="ghost" size="icon"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setElimItem({ tipo: 'linea', itemId: lineaId, subId, lineaId });
                                          setElimOpen(true);
                                        }}
                                        className="h-8 w-8 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 text-destructive hover:bg-destructive/10 hover:border-destructive/30">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                      <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                                        <ChevronDown className={`h-4 w-4 text-primary transition-transform duration-300 ${lineaAb ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                                      </div>
                                    </div>
                                  </div>
                                  <AccordionContent>
                                    <div className="space-y-4 px-6 pb-6 pt-2">
                                      <div className="pt-2 pb-2 border-t border-border/30">
                                        <p className="text-sm font-medium text-muted-foreground">
                                          Palmas de la Línea {linea.numero}
                                        </p>
                                      </div>
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

                          {/* Palmas huérfanas */}
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

                      {/* CASO B: Sublote SIN líneas */}
                      {!tieneLineas && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pt-4 pb-2 border-t border-border/30">
                            <div>
                              <h3 className="text-lg font-semibold">Palmas del Sublote</h3>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                Sin líneas definidas — Total de palmas en el sublote
                              </p>
                            </div>
                            <Button size="sm" variant="outline"
                              onClick={() => navigate(
                                `/plantacion/linea/nuevo?loteId=${id}` +
                                `&subloteId=${sublote.id}` +
                                `&nombreSublote=${encodeURIComponent(sublote.nombre)}`
                              )} className="gap-2">
                              <Plus className="h-3.5 w-3.5" /> Añadir Líneas
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