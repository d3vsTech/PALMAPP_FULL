import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
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
import { ArrowLeft, MapPin, Calendar, Sprout, Leaf, Plus, Edit, Trash2, AlertCircle, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { lotesApi, sublotesApi, palmasApi, lineasApi } from '../../../api/plantacion';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Tipos
interface Palma {
  id: string;
  codigo: string;
  activa: boolean;
}

interface Linea {
  id: string;
  numero: number;
  palmas: Palma[];
  activa: boolean;
}

interface Sublote {
  id: string;
  nombre: string;
  lineas: Linea[];
  activo: boolean;
}

export default function LoteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { token } = useAuth();
  const [lote, setLote] = useState<any>(null);
  const [predio, setPredio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados para sublotes, líneas y palmas
  const [sublotes, setSublotes] = useState<Sublote[]>([
  ]);


  // Estados para modales
  const [alertDialog, setAlertDialog] = useState(false);
  const [subloteExpandido, setSubloteExpandido] = useState<string>('');
  const [palmasSeleccionadas, setPalmasSeleccionadas] = useState<Set<string>>(new Set());
  const [modoSeleccionMasiva, setModoSeleccionMasiva] = useState<{ activo: boolean; subloteId: string; lineaId: string } | null>(null);

  // Formularios
  const [itemAEliminar, setItemAEliminar] = useState<{ tipo: 'sublote' | 'linea' | 'palma' | 'palmas-masivas'; id: string; subloteId?: string; lineaId?: string; cantidad?: number } | null>(null);

  if (!lote || !predio) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Lote no encontrado</h2>
            <p className="text-muted-foreground mb-4">
              El lote que buscas no existe o ha sido eliminado
            </p>
            <Button onClick={() => navigate('/plantacion')}>
              Volver a Mi Plantación
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formatear fecha de siembra
  const fechaSiembra = lote.fechaSiembra 
    ? new Date(lote.fechaSiembra).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : `${lote.anoSiembra}`;

  const cargarLote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await lotesApi.ver(Number(id));
      const d = res.data;
      setLote(d);
      // Cargar sublotes
      const sublotesRes = await sublotesApi.listar({ lote_id: Number(id), per_page: 100 });
      // Map sublotes to include lineas/palmas structure
      const sublotesMapped: Sublote[] = await Promise.all(
        (sublotesRes.data ?? []).map(async (s: any) => {
          try {
            const lineasRes = await lineasApi.listar({ sublote_id: s.id });
            const lineas: Linea[] = await Promise.all(
              (lineasRes.data ?? []).map(async (l: any) => {
                const palmasRes = await palmasApi.listar({ sublote_id: s.id, per_page: 999 });
                const palmas: Palma[] = (palmasRes.data ?? []).map((p: any) => ({
                  id: String(p.id), codigo: p.codigo, activa: p.estado === 'ACTIVA',
                }));
                return { id: String(l.id), numero: l.numero ?? 1, palmas, activa: l.estado !== false };
              })
            );
            return { id: String(s.id), nombre: s.nombre, lineas, activo: s.estado !== false };
          } catch {
            return { id: String(s.id), nombre: s.nombre, lineas: [], activo: true };
          }
        })
      );
      setSublotes(sublotesMapped);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar lote');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargarLote(); }, [cargarLote]);

  // Estado del lote (basado en año de siembra)
  const añosDesdeSiembra = new Date().getFullYear() - lote.anoSiembra;
  const estado = añosDesdeSiembra >= 3 ? 'Activo' : 'En desarrollo';

  // Calcular totales
  const calcularTotalesSublote = (sublote: Sublote) => {
    const totalLineas = sublote.lineas.length;
    const totalPalmas = sublote.lineas.reduce((sum, linea) => sum + linea.palmas.length, 0);
    return { totalLineas, totalPalmas };
  };

  // Funciones para selección masiva de palmas
  const toggleSeleccionMasiva = (subloteId: string, lineaId: string) => {
    if (modoSeleccionMasiva?.activo && modoSeleccionMasiva.subloteId === subloteId && modoSeleccionMasiva.lineaId === lineaId) {
      // Desactivar modo
      setModoSeleccionMasiva(null);
      setPalmasSeleccionadas(new Set());
    } else {
      // Activar modo
      setModoSeleccionMasiva({ activo: true, subloteId, lineaId });
      setPalmasSeleccionadas(new Set());
    }
  };

  const togglePalmaSeleccion = (palmaId: string) => {
    const nuevasSelecciones = new Set(palmasSeleccionadas);
    if (nuevasSelecciones.has(palmaId)) {
      nuevasSelecciones.delete(palmaId);
    } else {
      nuevasSelecciones.add(palmaId);
    }
    setPalmasSeleccionadas(nuevasSelecciones);
  };

  const seleccionarTodasPalmas = (palmas: Palma[]) => {
    const todasIds = new Set(palmas.map(p => p.id));
    setPalmasSeleccionadas(todasIds);
  };

  const eliminarPalmasSeleccionadas = (subloteId: string, lineaId: string) => {
    if (palmasSeleccionadas.size > 0) {
      handleEliminar('palmas-masivas', 'multiple', subloteId, lineaId, palmasSeleccionadas.size);
    }
  };

  // Eliminar
  const handleEliminar = (tipo: 'sublote' | 'linea' | 'palma' | 'palmas-masivas', id: string, subloteId?: string, lineaId?: string, cantidad?: number) => {
    setItemAEliminar({ tipo, id, subloteId, lineaId, cantidad });
    setAlertDialog(true);
  };

  const confirmarEliminar = async () => {
    if (!itemAEliminar) return;

    if (itemAEliminar.tipo === 'sublote') {
      try {
        await sublotesApi.eliminar(Number(itemAEliminar.id));
        toast.success('Sublote eliminado');
        await cargarLote();
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Error al eliminar'); }
    } else if (itemAEliminar.tipo === 'linea') {
      const sublotesActualizados = sublotes.map(s => {
        if (s.id === itemAEliminar.subloteId) {
          return {
            ...s,
            lineas: s.lineas.filter(l => l.id !== itemAEliminar.id)
          };
        }
        return s;
      });
      setSublotes(sublotesActualizados);
    } else if (itemAEliminar.tipo === 'palma') {
      const sublotesActualizados = sublotes.map(s => {
        if (s.id === itemAEliminar.subloteId) {
          return {
            ...s,
            lineas: s.lineas.map(l => {
              if (l.id === itemAEliminar.lineaId) {
                return {
                  ...l,
                  palmas: l.palmas.filter(p => p.id !== itemAEliminar.id)
                };
              }
              return l;
            })
          };
        }
        return s;
      });
      setSublotes(sublotesActualizados);
    } else if (itemAEliminar.tipo === 'palmas-masivas') {
      const sublotesActualizados = sublotes.map(s => {
        if (s.id === itemAEliminar.subloteId) {
          return {
            ...s,
            lineas: s.lineas.map(l => {
              if (l.id === itemAEliminar.lineaId) {
                return {
                  ...l,
                  palmas: l.palmas.filter(p => !palmasSeleccionadas.has(p.id))
                };
              }
              return l;
            })
          };
        }
        return s;
      });
      setSublotes(sublotesActualizados);
      setPalmasSeleccionadas(new Set());
      setModoSeleccionMasiva(null);
    }

    setAlertDialog(false);
    setItemAEliminar(null);
  };

  return (
    <div className="space-y-8">
      {/* Modales */}
      {/* Alert Dialog Eliminar */}
      <AlertDialog open={alertDialog} onOpenChange={setAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {itemAEliminar?.tipo === 'sublote' && (
                <div>
                  <p>Esto eliminará el sublote y todas sus líneas y palmas.</p>
                  <p className="text-primary font-medium mt-2">• Los contadores del lote se actualizarán automáticamente</p>
                </div>
              )}
              {itemAEliminar?.tipo === 'linea' && (
                <div>
                  <p>Esto eliminará la línea y todas sus palmas.</p>
                  <p className="text-primary font-medium mt-2">• Los contadores del sublote se actualizarán automáticamente</p>
                </div>
              )}
              {itemAEliminar?.tipo === 'palma' && (
                <div>
                  <p>Esto eliminará la palma permanentemente.</p>
                  <p className="text-primary font-medium mt-2">• Los contadores de la línea y del sublote se actualizarán automáticamente</p>
                </div>
              )}
              {itemAEliminar?.tipo === 'palmas-masivas' && (
                <div>
                  <p>Esto eliminará <strong>{itemAEliminar.cantidad}</strong> {itemAEliminar.cantidad === 1 ? 'palma' : 'palmas'} seleccionadas permanentemente.</p>
                  <p className="text-primary font-medium mt-2">• Los contadores de la línea y del sublote se actualizarán automáticamente</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminar}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/plantacion" className="hover:text-primary transition-colors">
          Mi Plantación
        </Link>
        <span>›</span>
        <span className="text-foreground font-medium">{predio.nombre}</span>
        <span>›</span>
        <span className="text-foreground font-medium">{lote.nombre}</span>
      </nav>

      {/* Header con botón de volver */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/plantacion')}
            className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">{lote.nombre}</h1>
            <p className="text-muted-foreground">
              Predio: {predio.nombre} • {lote.variedad}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta de información del lote */}
      <Card className="glass-subtle border-border shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Información del Lote</CardTitle>
              <CardDescription className="mt-1">
                Datos generales y estado actual
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Fecha de Siembra */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Fecha de Siembra</span>
              </div>
              <p className="text-2xl font-bold">{fechaSiembra}</p>
              <p className="text-xs text-muted-foreground">
                Hace {añosDesdeSiembra} {añosDesdeSiembra === 1 ? 'año' : 'años'}
              </p>
            </div>

            {/* Hectáreas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Hectáreas Sembradas</span>
              </div>
              <p className="text-2xl font-bold">{lote.hectareas} ha</p>
              <p className="text-xs text-muted-foreground">
                {((lote.hectareas / predio.hectareas) * 100).toFixed(1)}% del predio
              </p>
            </div>

            {/* Cantidad de Sublotes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sprout className="h-4 w-4" />
                <span className="text-sm font-medium">Sublotes</span>
              </div>
              <p className="text-2xl font-bold text-primary">{sublotes.length}</p>
              <p className="text-xs text-muted-foreground">
                {sublotes.length} registrados
              </p>
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
              <p className="text-2xl font-bold text-success">{lote.totalPalmas}</p>
              <p className="text-xs text-muted-foreground">
                {(lote.totalPalmas / lote.hectareas).toFixed(0)} palmas/ha
              </p>
            </div>

            {/* Semillas Asociadas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sprout className="h-4 w-4" />
                <span className="text-sm font-medium">Semillas Asociadas</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {lote.semillas.map((semilla, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="text-xs px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20"
                  >
                    {semilla}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de Sublotes con acordeón */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Sublotes</h2>
            <p className="text-muted-foreground mt-1">
              Gestiona los sublotes, líneas y palmas de <strong className="text-primary">{lote.nombre}</strong>
            </p>
          </div>
          <Button onClick={() => navigate(`/plantacion/sublote/nuevo?loteId=${id}`)} className="gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20">
            <Plus className="h-4 w-4" />
            Nuevo Sublote
          </Button>
        </div>

        {sublotes.length > 0 ? (
          <Accordion type="single" collapsible className="space-y-4" value={subloteExpandido} onValueChange={setSubloteExpandido}>
            {sublotes.map((sublote) => {
              const { totalLineas, totalPalmas } = calcularTotalesSublote(sublote);
              const estaExpandido = subloteExpandido === sublote.id;
              
              return (
                <AccordionItem
                  key={sublote.id}
                  value={sublote.id}
                  className="rounded-2xl border-0 bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all overflow-hidden"
                >
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
                              <span className="font-semibold text-primary">{totalLineas} líneas</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                              <Leaf className="h-4 w-4 text-success" />
                              <span className="font-semibold text-success">{totalPalmas} palmas</span>
                            </div>
                            <Badge variant={sublote.activo ? 'default' : 'secondary'} className={sublote.activo ? 'bg-success' : ''}>
                              {sublote.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    {/* Botones de acción - CENTRADOS VERTICALMENTE */}
                    <div className="absolute right-20 top-1/2 -translate-y-1/2 flex gap-2 z-20">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminar('sublote', sublote.id);
                        }}
                        className="h-10 w-10 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 shadow-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Flecha del acordeón - MÁS ELEGANTE Y SUTIL */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <ChevronDown 
                          className={`h-5 w-5 text-primary transition-transform duration-300 ${estaExpandido ? 'rotate-180' : ''}`}
                          strokeWidth={2.5}
                        />
                      </div>
                    </div>
                  </div>

                  <AccordionContent>
                    <div className="space-y-6 px-8 pb-8 pt-2">
                      {/* Header de líneas */}
                      <div className="flex items-center justify-between pt-4 pb-2 border-t border-border/30">
                        <div>
                          <h3 className="text-lg font-semibold">Líneas del Sublote</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {totalLineas} {totalLineas === 1 ? 'línea registrada' : 'líneas registradas'}
                          </p>
                        </div>
                        <Button
                          onClick={() => navigate(`/plantacion/linea/nuevo?loteId=${id}&subloteId=${sublote.id}&nombreSublote=${encodeURIComponent(sublote.nombre)}`)}
                          className="gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20"
                        >
                          <Plus className="h-4 w-4" />
                          Nueva Línea
                        </Button>
                      </div>

                      {/* Acordeón de líneas */}
                      {sublote.lineas.length > 0 ? (
                        <Accordion type="single" collapsible className="space-y-3">
                          {sublote.lineas.map((linea) => (
                            <AccordionItem
                              key={linea.id}
                              value={linea.id}
                              className="rounded-xl bg-muted/30 border border-border/50 overflow-hidden"
                            >
                              <div className="relative">
                                <AccordionTrigger className="px-6 py-4 hover:no-underline [&>svg]:hidden">
                                  <div className="flex w-full items-center gap-4 pr-24">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                                      <Leaf className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="text-left flex-1">
                                      <div className="text-lg font-bold">Línea {linea.numero}</div>
                                      <div className="flex items-center gap-3 text-sm mt-1">
                                        <span className="text-muted-foreground">{linea.palmas.length} palmas</span>
                                        <Badge variant={linea.activa ? 'default' : 'secondary'} className={`text-xs ${linea.activa ? 'bg-success' : ''}`}>
                                          {linea.activa ? 'Activa' : 'Inactiva'}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </AccordionTrigger>

                                {/* Botón eliminar línea */}
                                <div className="absolute right-14 top-1/2 -translate-y-1/2 flex gap-2 z-20">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEliminar('linea', linea.id, sublote.id);
                                    }}
                                    className="h-8 w-8 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>

                                {/* Flecha del acordeón */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                                    <ChevronDown 
                                      className="h-4 w-4 text-primary transition-transform duration-300"
                                      strokeWidth={2.5}
                                    />
                                  </div>
                                </div>
                              </div>

                              <AccordionContent>
                                <div className="space-y-4 px-6 pb-6 pt-2">
                                  {/* Header de palmas */}
                                  <div className="flex items-center justify-between pt-2 pb-2 border-t border-border/30">
                                    <p className="text-sm font-medium text-muted-foreground">
                                      Palmas de la Línea {linea.numero}
                                      {modoSeleccionMasiva?.activo && modoSeleccionMasiva.subloteId === sublote.id && modoSeleccionMasiva.lineaId === linea.id && (
                                        <span className="ml-2 text-primary font-semibold">
                                          ({palmasSeleccionadas.size} seleccionadas)
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex gap-2">
                                      {modoSeleccionMasiva?.activo && modoSeleccionMasiva.subloteId === sublote.id && modoSeleccionMasiva.lineaId === linea.id ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => seleccionarTodasPalmas(linea.palmas)}
                                            className="gap-2"
                                          >
                                            <CheckSquare className="h-3.5 w-3.5" />
                                            Seleccionar Todas
                                          </Button>
                                          {palmasSeleccionadas.size > 0 && (
                                            <Button
                                              size="sm"
                                              variant="destructive"
                                              onClick={() => eliminarPalmasSeleccionadas(sublote.id, linea.id)}
                                              className="gap-2"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                              Eliminar ({palmasSeleccionadas.size})
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => toggleSeleccionMasiva(sublote.id, linea.id)}
                                            className="gap-2"
                                          >
                                            Cancelar
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          {linea.palmas.length > 1 && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => toggleSeleccionMasiva(sublote.id, linea.id)}
                                              className="gap-2"
                                            >
                                              <CheckSquare className="h-3.5 w-3.5" />
                                              Selección Masiva
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            onClick={() => navigate(`/plantacion/palmas/nuevo?loteId=${id}&subloteId=${sublote.id}&lineaId=${linea.id}&numeroLinea=${linea.numero}&nombreSublote=${encodeURIComponent(sublote.nombre)}&palmasExistentes=${linea.palmas.length}`)}
                                            className="gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary"
                                          >
                                            <Plus className="h-3.5 w-3.5" />
                                            Agregar Palmas
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Grid de palmas */}
                                  {linea.palmas.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                      {linea.palmas.map((palma) => {
                                        const esModoSeleccion = modoSeleccionMasiva?.activo && modoSeleccionMasiva.subloteId === sublote.id && modoSeleccionMasiva.lineaId === linea.id;
                                        const estaSeleccionada = palmasSeleccionadas.has(palma.id);
                                        
                                        return (
                                          <div
                                            key={palma.id}
                                            onClick={() => esModoSeleccion && togglePalmaSeleccion(palma.id)}
                                            className={`relative group rounded-lg border-2 p-3 transition-all ${
                                              esModoSeleccion ? 'cursor-pointer' : ''
                                            } ${
                                              estaSeleccionada ? 'ring-2 ring-primary ring-offset-2' : ''
                                            } ${
                                              palma.activa
                                                ? 'bg-success/5 border-success/30 hover:border-success'
                                                : 'bg-destructive/5 border-destructive/30 hover:border-destructive'
                                            } ${
                                              esModoSeleccion ? 'hover:shadow-lg' : 'hover:shadow-md'
                                            }`}
                                          >
                                            {/* Checkbox en modo selección */}
                                            {esModoSeleccion && (
                                              <div className="absolute top-2 left-2 z-10">
                                                {estaSeleccionada ? (
                                                  <CheckSquare className="h-5 w-5 text-primary" />
                                                ) : (
                                                  <Square className="h-5 w-5 text-muted-foreground" />
                                                )}
                                              </div>
                                            )}

                                            <div className={`text-center ${esModoSeleccion ? 'mt-4' : ''}`}>
                                              <div className={`text-xs font-mono font-semibold mb-1 ${palma.activa ? 'text-success' : 'text-destructive'}`}>
                                                {palma.codigo}
                                              </div>
                                              <div className={`text-xs ${palma.activa ? 'text-muted-foreground' : 'text-destructive/70'}`}>
                                                {palma.activa ? 'Activa' : 'Inactiva'}
                                              </div>
                                            </div>
                                            
                                            {/* Botón eliminar palma (solo visible si no está en modo selección masiva) */}
                                            {!esModoSeleccion && (
                                              <button
                                                onClick={() => handleEliminar('palma', palma.id, sublote.id, linea.id)}
                                                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-sm text-muted-foreground">
                                      No hay palmas en esta línea
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <Card className="bg-muted/10 border-dashed border-2">
                          <CardContent className="flex flex-col items-center justify-center py-8">
                            <Leaf className="h-12 w-12 text-muted-foreground mb-3" />
                            <p className="text-sm font-medium mb-2">No hay líneas en este sublote</p>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/plantacion/linea/nuevo?loteId=${id}&subloteId=${sublote.id}&nombreSublote=${encodeURIComponent(sublote.nombre)}`)}
                              className="gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Crear Primera Línea
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 mb-4">
                <Sprout className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold mb-2">No hay sublotes registrados</p>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Comienza creando el primer sublote para organizar mejor tu lote
              </p>
              <Button onClick={() => navigate(`/plantacion/sublote/nuevo?loteId=${id}`)} className="gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary">
                <Plus className="h-4 w-4" />
                Crear Primer Sublote
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}