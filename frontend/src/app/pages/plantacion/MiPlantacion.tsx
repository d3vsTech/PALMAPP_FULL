/**
 * MiPlantacion.tsx
 * §1.1 GET /predios → lotes_count, palmas_count, hectareas_totales
 * §1.5 DELETE /predios/{id} → recursivo
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Plus, MapPin, Edit, Trash2, Sprout, Grid3x3, Search, Loader2 } from 'lucide-react';
import { prediosApi } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function MiPlantacion() {
  const navigate = useNavigate();
  const [predios, setPredios]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [elimId, setElimId]     = useState<number | null>(null);
  const [elimOpen, setElimOpen] = useState(false);

  // §1.1 Cargar predios con debounce en búsqueda
  const cargar = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await prediosApi.listar({ search: q?.trim() || undefined, per_page: 50 });
      setPredios(res.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar predios');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => cargar(search), 350);
    return () => clearTimeout(t);
  }, [search, cargar]);

  // §1.5 Eliminar predio (recursivo)
  const confirmarEliminar = async () => {
    if (!elimId) return;
    try {
      const res = await prediosApi.eliminar(elimId);
      toast.success(res.message ?? 'Predio eliminado');
      await cargar(search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
    setElimOpen(false);
    setElimId(null);
  };

  // KPIs desde §1.1 lotes_count, palmas_count, hectareas_totales
  const totalHa     = predios.reduce((s, p) => s + Number(p.hectareas_totales ?? 0), 0);
  const totalLotes  = predios.reduce((s, p) => s + Number(p.lotes_count ?? 0), 0);
  const totalPalmas = predios.reduce((s, p) => s + Number(p.palmas_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <AlertDialog open={elimOpen} onOpenChange={setElimOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar predio?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos sus lotes, sublotes y palmas. Esta acción no se puede deshacer.
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

      <div className="space-y-1">
        <h1>Mi Plantación</h1>
        <p className="text-lead">Administra predios, lotes, sublotes, líneas y palmas</p>
      </div>

      {/* KPIs §1.1 */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: MapPin, label: 'Hectáreas', value: `${totalHa.toFixed(1)} ha` },
          { icon: Grid3x3, label: 'Lotes', value: totalLotes },
          { icon: Sprout, label: 'Palmas', value: totalPalmas.toLocaleString('es-CO'), success: true },
        ].map(({ icon: Icon, label, value, success }) => (
          <Card key={label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${success ? 'bg-success/10' : 'bg-primary/10'}`}>
                  <Icon className={`h-5 w-5 ${success ? 'text-success' : 'text-primary'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar predios..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button onClick={() => navigate('/plantacion/predio/nuevo')}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="h-5 w-5" /> Nuevo Predio
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
          </div>
        )}

        {!loading && predios.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-16">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-bold mb-2">
                {search ? 'Sin resultados' : 'No hay predios registrados'}
              </h3>
              {!search && (
                <Button onClick={() => navigate('/plantacion/predio/nuevo')} size="lg"
                  className="mt-4 gap-2 bg-success hover:bg-success/90 shadow-lg">
                  <Plus className="h-5 w-5" /> Crear Primer Predio
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && predios.map(predio => (
          <Card key={predio.id} className="border-border hover:border-primary/30 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold truncate">{predio.nombre}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {/* §1.1: hectareas_totales, lotes_count */}
                      <span>{Number(predio.hectareas_totales ?? 0).toFixed(1)} ha</span>
                      {predio.ubicacion && <><span>·</span><span className="truncate">{predio.ubicacion}</span></>}
                      <span>·</span>
                      <span>{Number(predio.lotes_count ?? 0)} lote{Number(predio.lotes_count) !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      {/* §1.1: palmas_count */}
                      <span className="text-success font-medium">{Number(predio.palmas_count ?? 0).toLocaleString('es-CO')} palmas</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="outline" size="icon"
                    onClick={() => navigate(`/plantacion/predio/nuevo?edit=${predio.id}`)}
                    className="h-9 w-9 text-muted-foreground hover:text-primary hover:border-primary/30">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon"
                    onClick={() => { setElimId(Number(predio.id)); setElimOpen(true); }}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:border-destructive/30">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}