/**
 * LoteDetalle.tsx
 * §2.2 GET /lotes/{id}
 * §3.5 DELETE /sublotes/{id}
 * §4.1 GET /palmas — paginada per_page=50
 * §4.5 DELETE /palmas/masivo
 * §5.1 GET /lineas?sublote_id=X
 * §5.5 DELETE /lineas/{id}
 */
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { comoBoton } from '../../hooks/comoBoton';
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
  Sprout, Leaf, Plus, Pencil, Trash2,
  ChevronDown, CheckSquare, Square, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { lotesApi, sublotesApi, palmasApi, lineasApi } from '../../../api/plantacion';
import { toast } from 'sonner';
import { useRefrescoAlVolver, useVengoDeGuardar, type EstadoNavegacion } from './refresco';
import PageHeader from '../../components/common/PageHeader';
import IlustracionPalma from '../../components/common/IlustracionPalma';

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
          Palmas {lineaId ? 'de la línea' : 'del sublote'}
          {enSel && <span className="ml-2 text-primary font-semibold">({selIds.size} seleccionadas)</span>}
        </p>
        <div className="flex gap-2 flex-wrap">
          {enSel ? (
            <>
              <Button size="sm" variant="outline" onClick={() => onSelTodas(palmasKey)} className="gap-2">
                <CheckSquare className="h-3.5 w-3.5" /> Seleccionar todas
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
                  <CheckSquare className="h-3.5 w-3.5" /> Seleccionar varias
                </Button>
              )}
              <Button size="sm" onClick={() => onNavegar(agregarUrl)} className="gap-2">
                <Plus className="h-3.5 w-3.5" /> Agregar palmas
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
                  {...comoBoton(() => onToggle(pid), enSel)}
                  className={[
                    'relative group rounded-md border px-3 py-2 transition-colors',
                    enSel ? 'cursor-pointer' : '',
                    sel ? 'ring-2 ring-primary ring-offset-1' : '',
                    palma.estado
                      ? 'border-border bg-card hover:border-success'
                      : 'border-destructive/30 bg-destructive-soft hover:border-destructive',
                  ].filter(Boolean).join(' ')}>
                  {enSel && (
                    <div className="absolute top-2 left-2 z-10">
                      {sel
                        ? <CheckSquare className="h-5 w-5 text-primary" />
                        : <Square className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  )}
                  <div className={`text-center ${enSel ? 'mt-4' : ''}`}>
                    <div className={`text-xs font-semibold tabular-nums ${palma.estado ? 'text-foreground' : 'text-destructive'}`}>
                      {palma.codigo}
                    </div>
                    <div className={`text-[11px] ${palma.estado ? 'text-muted-foreground' : 'text-destructive/80'}`}>
                      {palma.estado ? 'Activa' : 'Inactiva'}
                    </div>
                  </div>
                  {!enSel && (
                    <button aria-label="Eliminar"
                      onClick={() => onEliminar(pid, subId, lineaId, palmasKey, params)}
                      className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          {ps.lastPage > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-3">
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
  /** Sublotes sin líneas con la rejilla de palmas a la vista. */
  const [palmasALaVista, setPalmasALaVista] = useState<Record<string, boolean>>({});
  const [loading, setLoading]     = useState(true);
  const [palmasPag, setPalmasPag] = useState<Record<string, PageState>>({});

  const [subloteOpen, setSubloteOpen] = useState('');
  const [lineaOpen, setLineaOpen]     = useState<Record<string, string>>({});

  const [selKey, setSelKey]     = useState<string | null>(null);
  const [selIds, setSelIds]     = useState<Set<string>>(new Set());
  const [elimItem, setElimItem] = useState<any>(null);
  const [elimOpen, setElimOpen] = useState(false);

  const vengoDeGuardar = useVengoDeGuardar(location);
  const reqRef = useRef(0);

  /**
   * `fresco` se salta las cachés; se usa al volver de crear un sublote, una
   * línea o palmas. `silencioso` no toca el spinner, para que refrescar en
   * segundo plano no borre de la pantalla lo que ya está abierto.
   */
  const cargar = useCallback(async (opts?: { fresco?: boolean; silencioso?: boolean }) => {
    if (!id) return;
    // Igual que en el índice: la respuesta que llegue tarde no pisa a la
    // más nueva. Aquí importa más, porque cada carga dispara una petición
    // por sublote y en un equipo lento se cruzan con facilidad.
    const reqId = ++reqRef.current;
    if (!opts?.silencioso) setLoading(true);
    try {
      const res = await lotesApi.ver(Number(id), opts?.fresco);
      const d   = res.data;
      const subs: any[] = d.sublotes ?? [];

      const lmap: Record<string, any[]> = {};
      await Promise.all(subs.map(async (s: any) => {
        try {
          const lr = await lineasApi.listar({ sublote_id: Number(s.id), per_page: 100 }, opts?.fresco);
          lmap[String(s.id)] = lr.data ?? [];
        } catch {
          lmap[String(s.id)] = [];
        }
      }));

      if (reqId !== reqRef.current) return;
      setLote(d);
      setSublotes(subs);
      setLineasMap(lmap);
      setPalmasPag({});
    } catch (err) {
      if (reqId !== reqRef.current) return;
      toast.error(err instanceof Error ? err.message : 'Error al cargar lote');
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar({ fresco: vengoDeGuardar }); }, [cargar, vengoDeGuardar]);

  const refrescar = useCallback(
    // Sin `fresco`, igual que en el índice: volver a la pestaña usa la caché.
    // Aquí pesa más, porque cada carga dispara una petición por sublote.
    () => { cargar({ silencioso: true }); },
    [cargar],
  );
  useRefrescoAlVolver(refrescar);

  useEffect(() => {
    if (loading) return;
    const autoOpen = (location.state as EstadoNavegacion | null)?.openSubloteId;
    if (!autoOpen) return;
    const subId = String(autoOpen);
    setSubloteOpen(subId);
    const lineas      = lineasMap[subId] ?? [];
    const tieneLineas = lineas.length > 0;
    // Se viene de crear algo en este sublote: las palmas se leen sin caché.
    if (!tieneLineas) {
      cargarPalmas(`sub_${subId}`, { sublote_id: Number(subId) }, 1, vengoDeGuardar);
    } else {
      cargarPalmas(`sinlinea_${subId}`, { sublote_id: Number(subId), sin_linea: true }, 1, vengoDeGuardar);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lineasMap]);

  const cargarPalmas = useCallback(async (
    key: string,
    params: { sublote_id?: number; linea_id?: number; sin_linea?: boolean },
    page = 1,
    fresco = false,
  ) => {
    setPalmasPag(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? { data: [], total: 0, page: 1, lastPage: 1 }), loading: true },
    }));
    try {
      const res = await palmasApi.listar({ ...params, per_page: PER_PAGE, page }, fresco);
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
      const res = await lotesApi.ver(Number(id), true);
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
    const lineas = lineasMap[val] ?? [];
    // Sin líneas la rejilla arranca cerrada, así que no se pide todavía.
    if (lineas.length > 0) {
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
    setSelIds(prev => {
      const n = new Set(prev);
      if (n.has(pid)) n.delete(pid); else n.add(pid);
      return n;
    });
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
      <h2 className="mb-2">Lote no encontrado</h2>
      <Button onClick={() => navigate('/plantacion')}>Volver a mi plantación</Button>
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

  // La variedad y el año van en el subtítulo; si falta uno, no queda el separador suelto.
  const anioSiembra = lote.fecha_siembra ? lote.fecha_siembra.slice(0, 4) : null;
  const variedad = lote.variedad || semillas[0]?.nombre || semillas[0] || null;
  const subtitulo = [
    variedad,
    anioSiembra ? `sembrado en ${anioSiembra}` : null,
  ].filter(Boolean).join(' · ');

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

      <PageHeader
        backTo="/plantacion"
        eyebrow={<><Link to="/plantacion" className="hover:text-foreground">Mi plantación</Link> · {predio.nombre}</>}
        title={lote.nombre}
        description={subtitulo || undefined}
        actions={
          <Button variant="outline" onClick={() => navigate(`/plantacion/lote/nuevo?id=${id}`)}>
            <Pencil className="h-4 w-4" strokeWidth={2} />
            Editar lote
          </Button>
        }
      />

      {/* Información del lote */}
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Información del lote</CardTitle>
          <CardDescription>Datos generales y estado actual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-muted-foreground">Fecha de siembra</p>
              <p className="text-xl font-bold">
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

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-muted-foreground">Hectáreas sembradas</p>
              <p className="text-xl font-bold">{Number(lote.hectareas_sembradas ?? 0).toFixed(2)} ha</p>
              {predio.hectareas_totales && (
                <p className="text-xs text-muted-foreground">
                  {((Number(lote.hectareas_sembradas ?? 0) / Number(predio.hectareas_totales)) * 100).toFixed(1)}% del predio
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-muted-foreground">Sublotes</p>
              <p className="text-xl font-bold">{sublotes.length}</p>
              <p className="text-xs text-muted-foreground">{sublotes.length} registrados</p>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-muted-foreground">Estado</p>
              <Badge variant={estado === 'Activo' ? 'success' : 'warning'}>{estado}</Badge>
              <p className="text-xs text-muted-foreground">
                {estado === 'Activo' ? 'Producción óptima' : 'Fase de crecimiento'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-muted-foreground">Total palmas</p>
              <p className="text-xl font-bold">{totalPalmas.toLocaleString('es-CO')}</p>
              {Number(lote.hectareas_sembradas) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {(totalPalmas / Number(lote.hectareas_sembradas)).toFixed(0)} palmas/ha
                </p>
              )}
            </div>

            {semillas.length > 0 && (
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-muted-foreground">Semillas asociadas</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {semillas.map((semilla: any, i: number) => (
                    <Badge key={i}>{semilla.nombre ?? semilla.tipo ?? semilla}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sección Sublotes */}
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2>Sublotes</h2>
            <p className="text-sm text-muted-foreground">
              Sublotes, líneas y palmas de {lote.nombre}
            </p>
          </div>
          <Button onClick={() => navigate(`/plantacion/sublote/nuevo?loteId=${id}`)}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Nuevo sublote
          </Button>
        </div>

        {sublotes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IlustracionPalma variante="palma" className="mb-3" />
              <p className="mb-1 font-semibold">Todavía no hay sublotes</p>
              <p className="mb-4 max-w-md text-center text-sm text-muted-foreground">
                Crea el primer sublote para organizar las líneas y palmas de este lote.
              </p>
              <Button onClick={() => navigate(`/plantacion/sublote/nuevo?loteId=${id}`)}>
                <Plus className="h-4 w-4" strokeWidth={2} /> Crear primer sublote
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-3"
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
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                  <div className="relative">
                    <AccordionTrigger className="relative z-10 px-5 py-3.5 hover:no-underline [&>svg]:hidden">
                      <div className="flex w-full items-center gap-4 pr-24">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-soft text-success">
                          <Sprout className="h-[18px] w-[18px]" strokeWidth={2} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold text-foreground">{sublote.nombre}</span>
                            <Badge variant={sublote.estado ? 'success' : 'secondary'}>
                              {sublote.estado ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {lineas.length} {lineas.length === 1 ? 'línea' : 'líneas'} · {cantPalmas.toLocaleString('es-CO')} palmas
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <div className="absolute right-12 top-1/2 z-20 flex -translate-y-1/2 gap-1">
                      <Button variant="ghost" size="icon"
                        aria-label="Eliminar sublote"
                        onClick={e => {
                          e.stopPropagation();
                          setElimItem({ tipo: 'sublote', itemId: subId });
                          setElimOpen(true);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive-soft hover:text-destructive">
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </Button>
                    </div>
                    <div className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2">
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} strokeWidth={2} />
                    </div>
                  </div>

                  <AccordionContent>
                    <div className="space-y-4 border-t border-border bg-muted/30 px-5 pb-5 pt-4">

                      {/* CASO A: Sublote CON líneas */}
                      {tieneLineas && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold">Líneas del sublote</h3>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(
                                `/plantacion/linea/nuevo?loteId=${id}&subloteId=${sublote.id}` +
                                `&nombreSublote=${encodeURIComponent(sublote.nombre)}`
                              )}>
                              <Plus className="h-4 w-4" strokeWidth={2} /> Nueva línea
                            </Button>
                          </div>

                          <Accordion type="single" collapsible className="space-y-2"
                            value={lineaOpen[subId] ?? ''}
                            onValueChange={val => handleLineaChange(subId, val)}>

                            {lineas.map((linea: any) => {
                              const lineaId  = String(linea.id);
                              const cantReal = Number(linea.palmas_count ?? 0);
                              const cantTeo  = Number(linea.cantidad_palmas ?? 0);
                              const lineaAb  = (lineaOpen[subId] ?? '') === lineaId;

                              return (
                                <AccordionItem key={linea.id} value={lineaId}
                                  className="overflow-hidden rounded-lg border border-border bg-card">
                                  <div className="relative">
                                    <AccordionTrigger className="px-4 py-2.5 hover:no-underline [&>svg]:hidden">
                                      <div className="flex w-full items-center gap-3 pr-20">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
                                          <Leaf className="h-3.5 w-3.5" strokeWidth={2} />
                                        </div>
                                        <div className="flex-1 text-left">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold">Línea {linea.numero}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {cantReal.toLocaleString('es-CO')} palmas
                                              {cantTeo !== cantReal && (
                                                <span className="ml-1 opacity-70">(teórico: {cantTeo.toLocaleString('es-CO')})</span>
                                              )}
                                            </span>
                                            <Badge variant={linea.estado ? 'success' : 'secondary'}>
                                              {linea.estado ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <div className="absolute right-10 top-1/2 z-20 flex -translate-y-1/2 gap-1">
                                      <Button variant="ghost" size="icon"
                                        aria-label="Eliminar línea"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setElimItem({ tipo: 'linea', itemId: lineaId, subId, lineaId });
                                          setElimOpen(true);
                                        }}
                                        className="h-7 w-7 text-muted-foreground hover:bg-destructive-soft hover:text-destructive">
                                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                                      </Button>
                                    </div>
                                    <div className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2">
                                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${lineaAb ? 'rotate-180' : ''}`} strokeWidth={2} />
                                    </div>
                                  </div>
                                  <AccordionContent>
                                    <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
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
                              <div className="space-y-3 rounded-lg border border-warning/25 bg-warning-soft p-4">
                                <p className="text-sm font-semibold text-warning">
                                  {sinPs.total.toLocaleString('es-CO')} palma{sinPs.total !== 1 ? 's' : ''} sin línea asignada
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

                      {/* CASO B: Sublote SIN líneas.
                          Sin líneas no se lista palma por palma: con cientos de
                          palmas la rejilla tapaba el resto del lote. Se muestra
                          el conteo y se abre bajo petición. */}
                      {!tieneLineas && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold">Líneas del sublote</h3>
                            <Button size="sm" variant="outline"
                              onClick={() => navigate(
                                `/plantacion/linea/nuevo?loteId=${id}` +
                                `&subloteId=${sublote.id}` +
                                `&nombreSublote=${encodeURIComponent(sublote.nombre)}`
                              )}>
                              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Nueva línea
                            </Button>
                          </div>

                          <Card className="gap-0">
                            <CardContent className="space-y-4 py-5">
                              <div>
                                <p className="text-sm font-semibold text-foreground">Número de palmas</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Sin líneas definidas. Total de palmas en el sublote.
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <p className="text-2xl font-bold tabular-nums">
                                  {cantPalmas.toLocaleString('es-CO')}
                                </p>
                                <Button size="sm" variant="outline"
                                  onClick={() => navigate(
                                    `/plantacion/palmas/nuevo?loteId=${id}` +
                                    `&subloteId=${subId}` +
                                    `&nombreSublote=${encodeURIComponent(sublote.nombre)}` +
                                    `&palmasExistentes=${cantPalmas}`
                                  )}>
                                  <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Agregar palmas
                                </Button>
                                {cantPalmas > 0 && (
                                  <Button size="sm" variant="ghost"
                                    onClick={() => {
                                      const abrir = !palmasALaVista[subId];
                                      setPalmasALaVista(prev => ({ ...prev, [subId]: abrir }));
                                      if (abrir && !palmasPag[`sub_${subId}`]) {
                                        cargarPalmas(`sub_${subId}`, { sublote_id: Number(subId) });
                                      }
                                    }}>
                                    {palmasALaVista[subId] ? 'Ocultar palmas' : 'Ver palmas'}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {palmasALaVista[subId] && (
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
                          )}
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