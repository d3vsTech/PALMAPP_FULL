/**
 * MiPlantacion.tsx
 * §1.1   GET /predios            → listado paginado con lotes_count/palmas_count por predio
 * §1.1.1 GET /predios/totales    → totales globales del tenant (cache 60s)
 * §1.5   DELETE /predios/{id}    → recursivo
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import EmptyState from '../../components/common/EmptyState';
import { num } from '../../lib/formato';
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
import { ChevronRight, Loader2, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  prediosApi, type PredioLoteAnidado, type PrediosTotales,
} from '../../../api/plantacion';
import { toast } from 'sonner';
import { useRefrescoAlVolver, useVengoDeGuardar } from './refresco';

export default function MiPlantacion() {
  const navigate = useNavigate();
  const [predios, setPredios]   = useState<any[]>([]);
  const [totales, setTotales]   = useState<PrediosTotales | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [elimId, setElimId]     = useState<number | null>(null);
  const [elimOpen, setElimOpen] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const searchMounted = useRef(false);
  const reqRef = useRef(0);

  const location = useLocation();
  const vengoDeGuardar = useVengoDeGuardar(location);

  /**
   * `fresco` se salta las cachés; se usa al volver de guardar y al recuperar
   * el foco. `silencioso` no toca el spinner: refrescar en segundo plano no
   * puede vaciar la pantalla que el usuario está mirando.
   */
  const cargar = useCallback(async (
    q?: string,
    opts?: { fresco?: boolean; silencioso?: boolean },
  ) => {
    // Contador de petición: si mientras esta viaja se dispara otra (buscar,
    // recuperar el foco), la que llegue tarde no puede pisar a la más nueva.
    // En un equipo lento esa respuesta vieja es justo la que borraba de la
    // pantalla el predio recién creado.
    const reqId = ++reqRef.current;
    if (!opts?.silencioso) setLoading(true);
    try {
      // §1.1 + §1.1.1 en paralelo. El bundle anterior hacía 1 + N requests
      // (uno por predio vía `/resumen`); ahora son 2 fijos. El backend cachea
      // ambos 60s e invalida con cualquier mutación de la jerarquía.
      const [resLista, resTot] = await Promise.all([
        prediosApi.listar(
          { search: q?.trim() || undefined, per_page: 50, incluir_lotes: true },
          opts?.fresco,
        ),
        prediosApi.totales(opts?.fresco).catch(() => null), // totales no es crítico para el listado
      ]);
      if (reqId !== reqRef.current) return;
      setPredios(resLista.data ?? []);
      if (resTot?.data) setTotales(resTot.data);
    } catch (err) {
      if (reqId !== reqRef.current) return;
      toast.error(err instanceof Error ? err.message : 'Error al cargar predios');
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(undefined, { fresco: vengoDeGuardar }); }, [cargar, vengoDeGuardar]);

  useEffect(() => {
    if (!searchMounted.current) { searchMounted.current = true; return; }
    const t = setTimeout(() => cargar(search), 350);
    return () => clearTimeout(t);
  }, [search, cargar]);

  const refrescar = useCallback(
    // Sin `fresco`: volver a la pestaña no se salta la caché de 60s del
    // backend. Esa caché existe porque los totales son caros de calcular y
    // quien vuelve casi siempre estuvo fuera más de un minuto. Saltársela en
    // cada foco sería pagar la consulta completa sin ganar nada.
    () => { cargar(search, { silencioso: true }); },
    [cargar, search],
  );
  useRefrescoAlVolver(refrescar);

  const confirmarEliminar = async () => {
    if (!elimId) return;
    setEliminando(true);
    try {
      const res = await prediosApi.eliminar(elimId);
      toast.success(res.message ?? 'Predio eliminado');
      setElimOpen(false);
      setElimId(null);
      await cargar(search, { fresco: true });
    } catch (err: any) {
      console.error('[predios.eliminar]', {
        status: err?.status,
        code: err?.code,
        message: err?.message,
        errors: err?.errors,
        body: err?.body,
      });
      let msg = err?.message ?? 'Error al eliminar el predio';
      if (err?.status === 401 || err?.status === 403) {
        msg = `Sin permiso para eliminar predios (${err.status})`;
      } else if (err?.status === 404) {
        msg = 'El predio ya no existe (404)';
      } else if (err?.status === 500) {
        msg = `Error interno del servidor (500): ${err.message ?? ''}`;
      } else if (err?.status) {
        msg = `${err.message} [HTTP ${err.status}${err.code ? ` · ${err.code}` : ''}]`;
      }
      toast.error(msg);
    } finally {
      setEliminando(false);
    }
  };

  // KPIs globales: priorizamos el endpoint `/predios/totales` (datos exactos
  // del tenant completo); si todavía no llegó, sumamos lo que tengamos del
  // listado actual como fallback inmediato.
  const totalHa     = totales ? Number(totales.hectareas_totales) : predios.reduce((s, p) => s + Number(p.hectareas_totales ?? 0), 0);
  const totalLotes  = totales ? totales.lotes_count                : predios.reduce((s, p) => s + Number(p.lotes_count ?? 0), 0);
  const totalPalmas = totales ? totales.palmas_count               : predios.reduce((s, p) => s + Number(p.palmas_count ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* AlertDialog eliminar */}
      <AlertDialog open={elimOpen} onOpenChange={(o) => !eliminando && setElimOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar predio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmarEliminar(); }}
              disabled={eliminando}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageHeader
        title="Mi plantación"
        description="Predios, lotes, sublotes, líneas y palmas de la finca."
        actions={
          <Button onClick={() => navigate('/plantacion/predio/nuevo')}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            Nuevo predio
          </Button>
        }
      />

      {/* El endpoint `/predios/totales` manda las cifras exactas del tenant.
          Mientras llega, se suma lo que haya en el listado. */}
      <StatStrip
        loading={loading && predios.length === 0}
        items={[
          { label: 'Hectáreas', value: num(totalHa, 1), unit: 'ha', note: 'en toda la finca' },
          { label: 'Predios', value: num(totales?.predios_count ?? predios.length) },
          { label: 'Lotes', value: num(totalLotes) },
          { label: 'Palmas', value: num(totalPalmas), note: 'sembradas' },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2>Predios</h2>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <Input
            type="search"
            placeholder="Buscar por nombre o ubicación"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <Card className="gap-0">
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando predios…
          </div>
        </Card>
      ) : predios.length === 0 ? (
        <Card className="gap-0">
          <EmptyState
            title={search ? 'No se encontraron predios' : 'Todavía no hay predios'}
            description={search
              ? 'Ningún predio coincide con la búsqueda.'
              : 'Crea el primer predio para empezar a organizar lotes, sublotes, líneas y palmas.'}
            action={search
              ? { label: 'Limpiar búsqueda', onClick: () => setSearch('') }
              : { label: 'Crear primer predio', onClick: () => navigate('/plantacion/predio/nuevo') }}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {predios.map((predio) => {
            const lotes: PredioLoteAnidado[] = predio.lotes ?? [];
            return (
              <Card key={predio.id} className="gap-0 overflow-hidden">
                {/* La banda del predio va en tinte de marca: con muchos predios,
                    es lo que separa un bloque del siguiente de un vistazo. */}
                <div className="flex flex-col gap-3 bg-primary-soft/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <MapPin className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate">{predio.nombre}</h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {num(Number(predio.hectareas_totales ?? 0), 1)} ha
                        {predio.ubicacion && <> · {predio.ubicacion}</>}
                        {' · '}
                        {num(Number(predio.lotes_count ?? 0))} {Number(predio.lotes_count) === 1 ? 'lote' : 'lotes'}
                        {' · '}
                        {num(Number(predio.palmas_count ?? 0))} palmas
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/plantacion/lote/nuevo?predioId=${predio.id}`)}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} />
                      Nuevo lote
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar predio"
                      className="text-muted-foreground"
                      onClick={() => navigate(`/plantacion/predio/nuevo?edit=${predio.id}`)}
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar predio"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => { setElimId(Number(predio.id)); setElimOpen(true); }}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </Button>
                  </div>
                </div>

                {lotes.length > 0 ? (
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-[13px] text-muted-foreground">
                        <tr>
                          <th className="px-5 py-2.5 text-left font-semibold">Lote</th>
                          <th className="hidden px-4 py-2.5 text-left font-semibold md:table-cell">Variedad</th>
                          <th className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Siembra</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Hectáreas</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Palmas</th>
                          <th className="hidden px-4 py-2.5 text-right font-semibold lg:table-cell">Sublotes</th>
                          <th className="w-10 px-2 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {lotes.map((lote) => (
                          <tr key={lote.id} className="transition-colors hover:bg-muted/40">
                            <td className="px-5 py-3">
                              <Link
                                to={`/plantacion/lote/${lote.id}`}
                                className="font-semibold text-foreground hover:text-primary hover:underline"
                              >
                                {lote.nombre}
                              </Link>
                              {lote.variedad && (
                                <span className="block text-xs text-muted-foreground md:hidden">{lote.variedad}</span>
                              )}
                            </td>
                            <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                              {lote.variedad ?? '—'}
                            </td>
                            {/* `anio_siembra` ya viene resuelto: parsear la fecha
                                la correría un día por la zona horaria. */}
                            <td className="hidden px-4 py-3 text-right text-muted-foreground sm:table-cell">
                              {lote.anio_siembra ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-foreground">
                              {lote.hectareas_sembradas == null ? '—' : num(Number(lote.hectareas_sembradas), 1)}
                            </td>
                            <td className="px-4 py-3 text-right text-foreground">{num(lote.palmas_count)}</td>
                            <td className="hidden px-4 py-3 text-right text-foreground lg:table-cell">
                              {num(lote.sublotes_count)}
                            </td>
                            <td className="px-2 py-3 text-right">
                              <Link
                                to={`/plantacion/lote/${lote.id}`}
                                aria-label={`Abrir ${lote.nombre}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <ChevronRight className="h-4 w-4" strokeWidth={2} />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="border-t border-border px-5 py-3 text-sm text-muted-foreground">
                    Este predio todavía no tiene lotes.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}