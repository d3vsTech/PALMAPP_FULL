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

  const totalHa     = predios.reduce((s, p) => s + Number(p.hectareas_totales ?? 0), 0);
  const totalLotes  = predios.reduce((s, p) => s + Number(p.lotes_count ?? 0), 0);
  const totalPalmas = predios.reduce((s, p) => s + Number(p.palmas_count ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* AlertDialog eliminar */}
      <AlertDialog open={elimOpen} onOpenChange={setElimOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el predio y todos sus lotes.
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

      {/* Header */}
      <div className="space-y-1">
        <h1>Mi Plantación</h1>
        <p className="text-lead">
          Administra predios, lotes, sublotes, líneas y palmas de tu finca
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Hectáreas</p>
                <p className="text-2xl font-bold truncate">{totalHa.toFixed(1)} ha</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Grid3x3 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Lotes</p>
                <p className="text-2xl font-bold truncate">{totalLotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <Sprout className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Palmas</p>
                <p className="text-2xl font-bold truncate">{totalPalmas.toLocaleString('es-CO')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de predios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2>Predios</h2>
          <p className="text-sm text-muted-foreground">
            {predios.length} {predios.length === 1 ? 'predio registrado' : 'predios registrados'}
          </p>
        </div>

        {/* Buscador con botón */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre o ubicación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => navigate('/plantacion/predio/nuevo')}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus className="h-5 w-5" />
            Nuevo Predio
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
          </div>
        )}

        {/* Lista */}
        {!loading && (
          <div className="space-y-3">
            {predios.map((predio) => (
              <Card key={predio.id} className="border-border hover:border-primary/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold mb-0.5 truncate">{predio.nombre}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="font-medium">{Number(predio.hectareas_totales ?? 0).toFixed(1)} ha</span>
                          {predio.ubicacion && (
                            <>
                              <span>•</span>
                              <span className="truncate">{predio.ubicacion}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{Number(predio.lotes_count ?? 0)} {Number(predio.lotes_count) !== 1 ? 'lotes' : 'lote'}</span>
                          <span>•</span>
                          <span className="text-success font-medium">{Number(predio.palmas_count ?? 0).toLocaleString('es-CO')} palmas</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(`/plantacion/predio/nuevo?edit=${predio.id}`)}
                        className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => { setElimId(Number(predio.id)); setElimOpen(true); }}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state — sin resultados de búsqueda */}
        {!loading && predios.length === 0 && search && (
          <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontraron predios</p>
              <p className="text-sm text-muted-foreground mb-4">
                Intenta con otros términos de búsqueda
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty state — no hay predios */}
        {!loading && predios.length === 0 && !search && (
          <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 mb-6 shadow-inner">
                <MapPin className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No hay predios registrados</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Comienza creando tu primer predio para empezar a gestionar la estructura de tu finca
              </p>
              <Button
                onClick={() => navigate('/plantacion/predio/nuevo')}
                size="lg"
                className="gap-2 bg-success hover:bg-success/90 shadow-lg shadow-success/20"
              >
                <Plus className="h-5 w-5" />
                Crear Primer Predio
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}