import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  MapPin,
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  Plus,
  Trash2,
  Trees,
  Grid3x3,
  GitBranch,
  Leaf,
  Calendar,
} from 'lucide-react';
import { prediosApi, lotesApi, sublotesApi, palmasApi, getDepartamentos, getMunicipios } from '../../../api/plantacion';
import { toast } from 'sonner';

// Tipos
interface Predio {
  nombre: string;
  ubicacion: string;
  direccion: string;
  hectareas: number;
}

interface Lote {
  id: string;
  nombre: string;
  fechaSiembra: string;
  hectareasSembradas: number;
  variedad: string;
}

interface Sublote {
  id: string;
  nombre: string;
  loteId: string;
  estado: 'Activo' | 'Inactivo';
}

interface Linea {
  id: string;
  numero: number;
  subloteId: string;
  estado: 'Activo' | 'Inactivo';
}

interface Palma {
  id: string;
  codigo: string;
  subloteId: string;
  lineaId?: string; // Opcional - las palmas NO dependen de líneas
  estado: 'Activo' | 'Inactivo';
}

// Etapas del wizard
const ETAPAS = [
  { numero: 1, nombre: 'Predio' },
  { numero: 2, nombre: 'Lotes' },
  { numero: 3, nombre: 'Sublotes' },
  { numero: 4, nombre: 'Líneas' },
  { numero: 5, nombre: 'Palmas' },
];

export default function NuevoPredioWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [etapaActual, setEtapaActual] = useState(1);

  // Estado del Predio
  const [predio, setPredio] = useState<Predio>({
    nombre: '',
    ubicacion: '',
    direccion: '',
    hectareas: 0,
  });

  // Estados de Lotes
  const [departamentos, setDepartamentos] = useState<{codigo:string;nombre:string}[]>([]);
  const [municipios, setMunicipios] = useState<{codigo:string;nombre:string}[]>([]);
  const [deptoSel, setDeptoSel] = useState('');
  const [munSel, setMunSel] = useState('');

  const [lotes, setLotes] = useState<Lote[]>([]);

  // Estados de Sublotes
  const [sublotes, setSublotes] = useState<Sublote[]>([]);

  // Estados de Líneas (OPCIONALES)
  const [lineas, setLineas] = useState<Linea[]>([]);

  // Estados de Palmas (NO DEPENDEN DE LÍNEAS)
  const [palmas, setPalmas] = useState<Palma[]>([]);

  // Estados para formularios inline
  const [mostrandoFormLote, setMostrandoFormLote] = useState(false);
  const [mostrandoFormSublote, setMostrandoFormSublote] = useState(false);
  const [mostrandoFormLinea, setMostrandoFormLinea] = useState<string | null>(null);
  const [mostrandoFormPalmas, setMostrandoFormPalmas] = useState<string | null>(null);
  const [cantidadPalmas, setCantidadPalmas] = useState<string>('');

  // Cargar datos cuando se está editando
  useEffect(() => {
    if (!editId) return;
    const cargar = async () => {
      try {
        // Cargar predio
        const predioRes = await prediosApi.ver(Number(editId));
        const d = predioRes.data;
        setPredio({
          nombre: d.nombre ?? '',
          ubicacion: d.ubicacion ?? '',
          direccion: d.direccion ?? '',
          hectareas: parseFloat(d.hectareas_totales ?? 0),
        });

        // Cargar lotes del predio
        const lotesRes = await lotesApi.listar({ predio_id: Number(editId), per_page: 100 });
        const lotesData = lotesRes.data ?? [];
        setLotes(lotesData.map((l: any) => ({
          id: String(l.id),
          nombre: l.nombre,
          fechaSiembra: l.fecha_siembra ?? '',
          hectareasSembradas: parseFloat(l.hectareas_sembradas ?? 0),
          variedad: l.semillas?.[0]?.nombre ?? '',
        })));

        // Cargar sublotes de cada lote
        const todosLosSubloates: Sublote[] = [];
        const todasLasPalmas: Palma[] = [];
        for (const lote of lotesData) {
          const sublotesRes = await sublotesApi.listar({ lote_id: lote.id, per_page: 100 });
          const sublotesData = sublotesRes.data ?? [];
          sublotesData.forEach((s: any) => {
            todosLosSubloates.push({
              id: String(s.id),
              nombre: s.nombre,
              loteId: String(lote.id),
              estado: s.estado !== false ? 'Activo' : 'Inactivo',
            });
          });
          // Cargar palmas de cada sublote
          for (const sublote of sublotesData) {
            const palmasRes = await palmasApi.listar({ sublote_id: sublote.id, per_page: 999 });
            (palmasRes.data ?? []).forEach((p: any) => {
              todasLasPalmas.push({
                id: String(p.id),
                codigo: p.codigo,
                subloteId: String(sublote.id),
                estado: p.estado === 'ACTIVA' ? 'Activo' : 'Inactivo',
              });
            });
          }
        }
        setSublotes(todosLosSubloates);
        setPalmas(todasLasPalmas);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar datos del predio');
      }
    };
    cargar();
  }, [editId]);

  // Cargar departamentos al montar
  useEffect(() => {
    getDepartamentos().then(r => setDepartamentos(r.data ?? [])).catch(() => {});
  }, []);

  // Cargar municipios cuando cambia el departamento
  useEffect(() => {
    if (!deptoSel) { setMunicipios([]); setMunSel(''); return; }
    getMunicipios(deptoSel).then(r => setMunicipios(r.data ?? [])).catch(() => {});
  }, [deptoSel]);

  // Sincronizar ubicacion con departamento + municipio seleccionados
  useEffect(() => {
    if (deptoSel || munSel) {
      const deptoNombre = departamentos.find(d => d.codigo === deptoSel)?.nombre ?? '';
      const munNombre = municipios.find(m => m.codigo === munSel)?.nombre ?? '';
      const ubicacion = [munNombre, deptoNombre].filter(Boolean).join(', ');
      setPredio(prev => ({ ...prev, ubicacion }));
    }
  }, [deptoSel, munSel, departamentos, municipios]);

  

  // === FUNCIONES DE NAVEGACIÓN ===
  const siguienteEtapa = () => {
    if (etapaActual < ETAPAS.length) {
      setEtapaActual(etapaActual + 1);
    }
  };

  const etapaAnterior = () => {
    if (etapaActual > 1) {
      setEtapaActual(etapaActual - 1);
    }
  };

  const irAEtapa = (numero: number) => {
    setEtapaActual(numero);
  };

  // === FUNCIONES DE LOTES ===
  const agregarLote = () => {
    setMostrandoFormLote(true);
  };

  const guardarLote = (lote: Partial<Lote>) => {
    const nuevoLote: Lote = {
      id: `lote-${Date.now()}`,
      nombre: lote.nombre || '',
      fechaSiembra: lote.fechaSiembra || '',
      hectareasSembradas: lote.hectareasSembradas || 0,
      variedad: lote.variedad || '',
    };
    setLotes([...lotes, nuevoLote]);
    setMostrandoFormLote(false);
  };

  const eliminarLote = (id: string) => {
    if (!confirm('¿Eliminar este lote y todos sus sublotes y palmas?')) return;
    setLotes(lotes.filter((l) => l.id !== id));
    const subIds = sublotes.filter((s) => s.loteId === id).map((s) => s.id);
    setSublotes(sublotes.filter((s) => s.loteId !== id));
    setLineas(lineas.filter((ln) => !subIds.includes(ln.subloteId)));
    setPalmas(palmas.filter((p) => !subIds.includes(p.subloteId)));
  };

  // === FUNCIONES DE SUBLOTES ===
  const agregarSublote = (loteId: string) => {
    setMostrandoFormSublote(true);
  };

  const guardarSublote = (loteId: string, nombre: string) => {
    const nuevoSublote: Sublote = {
      id: `sublote-${Date.now()}`,
      nombre,
      loteId,
      estado: 'Activo',
    };
    setSublotes([...sublotes, nuevoSublote]);
    setMostrandoFormSublote(false);
  };

  const eliminarSublote = (id: string) => {
    if (!confirm('¿Eliminar este sublote y todas sus palmas?')) return;
    setSublotes(sublotes.filter((s) => s.id !== id));
    setLineas(lineas.filter((ln) => ln.subloteId !== id));
    setPalmas(palmas.filter((p) => p.subloteId !== id));
  };

  // === FUNCIONES DE LÍNEAS (OPCIONALES) ===
  const agregarLinea = (subloteId: string) => {
    const lineasDelSublote = lineas.filter((ln) => ln.subloteId === subloteId);
    const nuevoNumero = lineasDelSublote.length + 1;

    const nuevaLinea: Linea = {
      id: `linea-${Date.now()}`,
      numero: nuevoNumero,
      subloteId,
      estado: 'Activo',
    };
    setLineas([...lineas, nuevaLinea]);
  };

  const eliminarLinea = (id: string) => {
    if (!confirm('¿Eliminar esta línea?')) return;
    setLineas(lineas.filter((ln) => ln.id !== id));
  };

  // === FUNCIONES DE PALMAS (NO DEPENDEN DE LÍNEAS) ===
  const agregarPalmas = (subloteId: string, cantidad: number, lineaId?: string) => {
    const sublote = sublotes.find((s) => s.id === subloteId);
    if (!sublote) return;

    const palmasExistentes = palmas.filter((p) => p.subloteId === subloteId);
    const numeroInicial = palmasExistentes.length + 1;

    const nuevasPalmas: Palma[] = [];
    for (let i = 0; i < cantidad; i++) {
      const codigo = `${sublote.nombre}-P${numeroInicial + i}`;
      nuevasPalmas.push({
        id: `palma-${Date.now()}-${i}`,
        codigo,
        subloteId,
        lineaId, // Opcional
        estado: 'Activo',
      });
    }

    setPalmas([...palmas, ...nuevasPalmas]);
    setMostrandoFormPalmas(null);
    setCantidadPalmas('');
  };

  const eliminarPalma = (id: string) => {
    setPalmas(palmas.filter((p) => p.id !== id));
  };

  // === FUNCIONES DE GUARDADO ===
  const guardarTodo = async () => {
    if (!predio.nombre.trim()) { toast.error('El nombre del predio es obligatorio'); return; }
    if (!predio.ubicacion.trim()) { toast.error('Selecciona departamento y municipio'); return; }
    if (!predio.hectareas || predio.hectareas <= 0) { toast.error('Las hectáreas son obligatorias'); return; }
    try {
      if (editId) {
        // Actualizar datos del predio
        await prediosApi.editar(Number(editId), {
          nombre: predio.nombre,
          ubicacion: predio.ubicacion,
          ...(predio.direccion ? { direccion: predio.direccion } : {}),
          hectareas_totales: predio.hectareas,
        });
        toast.success('Plantación actualizada correctamente');
      } else {
        // Crear predio nuevo
        const predioRes = await prediosApi.crear({
          nombre: predio.nombre,
          ubicacion: predio.ubicacion,
          ...(predio.direccion ? { direccion: predio.direccion } : {}),
          hectareas_totales: predio.hectareas,
        });
        const nuevoPredioId = predioRes.data?.id ?? (predioRes as any)?.id;
        if (!nuevoPredioId) throw new Error('No se recibió el ID del predio creado');
        // Crear lotes
        for (const lote of lotes) {
          const loteRes = await lotesApi.crear({
            predio_id: nuevoPredioId,
            nombre: lote.nombre,
            fecha_siembra: lote.fechaSiembra || undefined,
            hectareas_sembradas: lote.hectareasSembradas || undefined,
          });
          const nuevoLoteId = loteRes.data?.id ?? (loteRes as any)?.id;
          // Crear sublotes del lote
          const sublotesDelLote = sublotes.filter(s => s.loteId === lote.id);
          for (const sublote of sublotesDelLote) {
            const palmasDelSublote = palmas.filter(p => p.subloteId === sublote.id);
            await sublotesApi.crear({
              lote_id: nuevoLoteId,
              nombre: sublote.nombre,
              cantidad_palmas: palmasDelSublote.length || undefined,
            });
          }
        }
        toast.success('Plantación creada correctamente');
      }
      navigate('/plantacion');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la plantación');
    }
  };

  // === VALIDACIONES ===
  const puedeAvanzarEtapa1 = predio.nombre && predio.hectareas > 0 && predio.ubicacion.trim().length > 0;
  const puedeAvanzarEtapa2 = lotes.length > 0;
  const puedeAvanzarEtapa3 = sublotes.length > 0;
  const puedeAvanzarEtapa4 = true; // Las líneas son opcionales
  const puedeAvanzarEtapa5 = true; // Las palmas son opcionales, se crean con los sublotes

  // Calcular hectáreas disponibles
  const hectareasUsadas = lotes.reduce((acc, l) => acc + l.hectareasSembradas, 0);
  const hectareasDisponibles = predio.hectareas - hectareasUsadas;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/plantacion')}
              className="rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold text-foreground">{editId ? 'Editar Plantación' : 'Crear Nueva Plantación'}</h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Configura tu plantación paso a paso
          </p>
        </div>
      </div>

      {/* Layout principal: 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: Wizard (2/3) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Stepper horizontal */}
          <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center">
            {ETAPAS.map((etapa, index) => {
              const estaCompleta = etapaActual > etapa.numero;
              const estaActiva = etapaActual === etapa.numero;

              return (
                <div key={etapa.numero} className="flex items-center flex-1">
                  {/* Círculo de etapa */}
                  <div className="flex-1 flex justify-center">
                    <button
                      onClick={() => irAEtapa(etapa.numero)}
                      className={`flex flex-col items-center gap-2 ${
                        estaActiva || estaCompleta || editId ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                      }`}
                      disabled={!editId && !estaActiva && !estaCompleta}
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                          estaCompleta
                            ? 'bg-primary border-primary text-white'
                            : estaActiva
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        {estaCompleta ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <span className="font-bold">{etapa.numero}</span>
                        )}
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-sm font-semibold whitespace-nowrap ${
                            estaActiva || estaCompleta ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {etapa.nombre}
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Línea conectora */}
                  {index < ETAPAS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 bg-border relative">
                      <div
                        className={`absolute inset-0 bg-primary transition-all ${
                          estaCompleta ? 'w-full' : 'w-0'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

          {/* Contenido de las etapas */}
          <div className="space-y-6">
        {/* ETAPA 1: PREDIO */}
        {etapaActual === 1 && (
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
                  <Input
                    id="nombre"
                    placeholder="Ej: Predio Norte"
                    value={predio.nombre}
                    onChange={(e) => setPredio({ ...predio, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <select
                    value={deptoSel}
                    onChange={e => { setDeptoSel(e.target.value); setMunSel(''); }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Seleccionar departamento...</option>
                    {departamentos.map(d => (
                      <option key={d.codigo} value={d.codigo}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Municipio</Label>
                  <select
                    value={munSel}
                    onChange={e => setMunSel(e.target.value)}
                    disabled={!deptoSel}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                  >
                    <option value="">Seleccionar municipio...</option>
                    {municipios.map(m => (
                      <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                  <Input
                    id="direccion"
                    placeholder="Ej: Km 5 vía Villavicencio, Vereda La Esperanza"
                    value={predio.direccion}
                    onChange={(e) => setPredio({ ...predio, direccion: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hectareas">Hectáreas Totales *</Label>
                  <Input
                    id="hectareas"
                    type="number"
                    placeholder="0"
                    value={predio.hectareas || ''}
                    onChange={(e) =>
                      setPredio({ ...predio, hectareas: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ETAPA 2: LOTES */}
        {etapaActual === 2 && (
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
                      Hectáreas disponibles: {hectareasDisponibles.toFixed(2)} ha
                    </p>
                  </div>
                </div>
                <Button onClick={agregarLote} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Lote
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {lotes.map((lote) => (
                <LoteCard
                  key={lote.id}
                  lote={lote}
                  onEliminar={() => eliminarLote(lote.id)}
                />
              ))}

              {mostrandoFormLote && (
                <FormLote
                  hectareasDisponibles={hectareasDisponibles}
                  onGuardar={guardarLote}
                  onCancelar={() => setMostrandoFormLote(false)}
                />
              )}

              {lotes.length === 0 && !mostrandoFormLote && (
                <div className="text-center py-12 text-muted-foreground">
                  <Grid3x3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No hay lotes registrados</p>
                  <p className="text-sm">Agrega tu primer lote para continuar</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ETAPA 3: SUBLOTES */}
        {etapaActual === 3 && (
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
              {lotes.map((lote) => {
                const sublotesDelLote = sublotes.filter((s) => s.loteId === lote.id);
                return (
                  <div key={lote.id} className="border border-border rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{lote.nombre}</h3>
                        <p className="text-sm text-muted-foreground">
                          {sublotesDelLote.length} sublotes
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => agregarSublote(lote.id)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar Sublote
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {sublotesDelLote.map((sublote) => (
                        <SubloteCard
                          key={sublote.id}
                          sublote={sublote}
                          palmasCount={palmas.filter((p) => p.subloteId === sublote.id).length}
                          onEliminar={() => eliminarSublote(sublote.id)}
                        />
                      ))}
                    </div>

                    {mostrandoFormSublote && (
                      <FormSublote
                        onGuardar={(nombre) => guardarSublote(lote.id, nombre)}
                        onCancelar={() => setMostrandoFormSublote(false)}
                      />
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

        {/* ETAPA 4: LÍNEAS (OPCIONAL) */}
        {etapaActual === 4 && (
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
              {sublotes.map((sublote) => {
                const lote = lotes.find((l) => l.id === sublote.loteId);
                const lineasDelSublote = lineas.filter((ln) => ln.subloteId === sublote.id);

                return (
                  <div key={sublote.id} className="border border-border rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{sublote.nombre}</h3>
                        <p className="text-sm text-muted-foreground">
                          {lote?.nombre} • {lineasDelSublote.length} líneas
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => agregarLinea(sublote.id)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar Línea
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                      {lineasDelSublote.map((linea) => (
                        <LineaCard
                          key={linea.id}
                          linea={linea}
                          onEliminar={() => eliminarLinea(linea.id)}
                        />
                      ))}
                    </div>

                    {lineasDelSublote.length === 0 && (
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

        {/* ETAPA 5: PALMAS */}
        {etapaActual === 5 && (
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Leaf className="h-6 w-6 text-success" />
                </div>
                <div>
                  <CardTitle>Registrar Palmas</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Total de palmas: {palmas.length}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {sublotes.map((sublote) => {
                const lote = lotes.find((l) => l.id === sublote.loteId);
                const palmasDelSublote = palmas.filter((p) => p.subloteId === sublote.id);
                const lineasDelSublote = lineas.filter((ln) => ln.subloteId === sublote.id);

                return (
                  <div key={sublote.id} className="border border-border rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{sublote.nombre}</h3>
                        <p className="text-sm text-muted-foreground">
                          {lote?.nombre} • {palmasDelSublote.length} palmas
                        </p>
                      </div>
                      {editId && (
                        <Button
                          onClick={() => setMostrandoFormPalmas(sublote.id)}
                          className="gap-2 bg-success hover:bg-success/90"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar Palmas
                        </Button>
                      )}
                    </div>

                    {/* MODO CREACIÓN: Mostrar formulario directamente */}
                    {!editId && palmasDelSublote.length === 0 && (
                      <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Cantidad de palmas</Label>
                          <Input
                            type="number"
                            placeholder="Ej: 50"
                            value={cantidadPalmas}
                            onChange={(e) => setCantidadPalmas(e.target.value)}
                          />
                        </div>

                        {lineasDelSublote.length > 0 && (
                          <div className="space-y-2">
                            <Label>Línea (opcional)</Label>
                            <select
                              className="w-full h-10 px-3 rounded-md border border-input bg-background"
                              onChange={(e) => {
                                // Puedes guardar la línea seleccionada aquí
                              }}
                            >
                              <option value="">Sin línea</option>
                              {lineasDelSublote.map((linea) => (
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
                              const cantidad = parseInt(cantidadPalmas);
                              if (cantidad > 0) {
                                agregarPalmas(sublote.id, cantidad);
                              }
                            }}
                            disabled={!cantidadPalmas || parseInt(cantidadPalmas) <= 0}
                          >
                            Guardar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setCantidadPalmas('');
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Formulario en modo edición cuando se hace clic en "Agregar Palmas" */}
                    {editId && mostrandoFormPalmas === sublote.id && (
                      <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Cantidad de palmas</Label>
                          <Input
                            type="number"
                            placeholder="Ej: 50"
                            value={cantidadPalmas}
                            onChange={(e) => setCantidadPalmas(e.target.value)}
                          />
                        </div>

                        {lineasDelSublote.length > 0 && (
                          <div className="space-y-2">
                            <Label>Línea (opcional)</Label>
                            <select
                              className="w-full h-10 px-3 rounded-md border border-input bg-background"
                              onChange={(e) => {
                                // Puedes guardar la línea seleccionada aquí
                              }}
                            >
                              <option value="">Sin línea</option>
                              {lineasDelSublote.map((linea) => (
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
                              const cantidad = parseInt(cantidadPalmas);
                              if (cantidad > 0) {
                                agregarPalmas(sublote.id, cantidad);
                              }
                            }}
                            disabled={!cantidadPalmas || parseInt(cantidadPalmas) <= 0}
                          >
                            Agregar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setMostrandoFormPalmas(null);
                              setCantidadPalmas('');
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* MODO EDICIÓN: Mostrar palmas individuales con opción de eliminar */}
                    {editId && (
                      <>
                        <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-6">
                          {palmasDelSublote.map((palma) => (
                            <PalmaCard
                              key={palma.id}
                              palma={palma}
                              onEliminar={() => eliminarPalma(palma.id)}
                            />
                          ))}
                        </div>

                        {palmasDelSublote.length === 0 && mostrandoFormPalmas !== sublote.id && (
                          <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">No hay palmas registradas</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* MODO CREACIÓN: Solo mostrar resumen sin tarjetas individuales */}
                    {!editId && palmasDelSublote.length > 0 && (
                      <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Leaf className="h-5 w-5 text-success" />
                            <span className="font-semibold">
                              {palmasDelSublote.length} palmas registradas
                            </span>
                          </div>
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            Completado
                          </Badge>
                        </div>
                      </div>
                    )}
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

        {/* Botones de navegación */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={etapaAnterior}
            disabled={etapaActual === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {etapaActual < ETAPAS.length ? (
              <Button
                onClick={siguienteEtapa}
                disabled={
                  (etapaActual === 1 && !puedeAvanzarEtapa1) ||
                  (etapaActual === 2 && !puedeAvanzarEtapa2) ||
                  (etapaActual === 3 && !puedeAvanzarEtapa3)
                }
                className="gap-2"
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={guardarTodo}
                disabled={!puedeAvanzarEtapa5}
                className="gap-2 bg-success hover:bg-success/90"
              >
                <Save className="h-4 w-4" />
                {editId ? 'Guardar Cambios' : 'Guardar Plantación'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Columna derecha: Panel de resumen (1/3) - sticky */}
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
                {/* Progreso general */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-semibold">{etapaActual} de {ETAPAS.length}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(etapaActual / ETAPAS.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Información del predio */}
                {predio.nombre && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Predio
                    </h4>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Nombre</span>
                        <span className="font-semibold text-sm">{predio.nombre}</span>
                      </div>
                      {predio.ubicacion && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Ubicación</span>
                          <span className="font-semibold text-sm truncate ml-2 max-w-[150px]" title={predio.ubicacion}>
                            {predio.ubicacion}{predio.direccion ? ` - ${predio.direccion}` : ''}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Hectáreas</span>
                        <span className="font-semibold text-sm">{predio.hectareas} ha</span>
                      </div>
                      {lotes.length > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">Disponibles</span>
                          <span className="font-semibold text-xs text-accent">{hectareasDisponibles.toFixed(2)} ha</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {predio.nombre && <div className="h-px bg-border" />}

                {/* Totales con Detalle */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Resumen Detallado
                  </h4>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {/* Detalle por Lote */}
                    {lotes.map((lote) => {
                      const sublotesDelLote = sublotes.filter((s) => s.loteId === lote.id);
                      const lineasDelLote = lineas.filter((ln) =>
                        sublotesDelLote.some((s) => s.id === ln.subloteId)
                      );
                      const palmasDelLote = palmas.filter((p) =>
                        sublotesDelLote.some((s) => s.id === p.subloteId)
                      );

                      return (
                        <div key={lote.id} className="border border-border rounded-lg p-3 space-y-2 bg-card">
                          {/* Lote Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-border/50">
                            <div className="flex items-center gap-2">
                              <Grid3x3 className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-sm">{lote.nombre}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground">{lote.hectareasSembradas} ha</span>
                            </div>
                          </div>

                          {/* Sublotes del Lote */}
                          {sublotesDelLote.length > 0 ? (
                            <div className="space-y-2 pl-3">
                              {sublotesDelLote.map((sublote) => {
                                const lineasDelSublote = lineas.filter((ln) => ln.subloteId === sublote.id);
                                const palmasDelSublote = palmas.filter((p) => p.subloteId === sublote.id);

                                return (
                                  <div key={sublote.id} className="space-y-1">
                                    <div className="flex items-center justify-between py-1">
                                      <div className="flex items-center gap-2">
                                        <Trees className="h-3 w-3 text-primary/70" />
                                        <span className="text-xs">{sublote.nombre}</span>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs">
                                        {lineasDelSublote.length > 0 && (
                                          <span className="text-muted-foreground flex items-center gap-1">
                                            <GitBranch className="h-3 w-3" />
                                            {lineasDelSublote.length}
                                          </span>
                                        )}
                                        <span className="text-success flex items-center gap-1 font-semibold">
                                          <Leaf className="h-3 w-3" />
                                          {palmasDelSublote.length}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic pl-3">Sin sublotes</p>
                          )}

                          {/* Totales del Lote */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <span className="text-xs font-medium">Totales del lote</span>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground">
                                {sublotesDelLote.length} sublotes
                              </span>
                              {lineasDelLote.length > 0 && (
                                <span className="text-muted-foreground">
                                  {lineasDelLote.length} líneas
                                </span>
                              )}
                              <span className="text-success font-semibold">
                                {palmasDelLote.length} palmas
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Totales Generales */}
                    {lotes.length > 0 && (
                      <div className="border-2 border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
                        <h5 className="font-semibold text-sm flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          Totales Generales
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
                          {lineas.length > 0 && (
                            <div className="flex items-center justify-between p-2 rounded bg-background/50">
                              <span className="text-muted-foreground">Líneas</span>
                              <span className="font-bold">{lineas.length}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between p-2 rounded bg-success/10">
                            <span className="text-muted-foreground">Palmas</span>
                            <span className="font-bold text-success">{palmas.length}</span>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// === COMPONENTES AUXILIARES ===

function FormLote({
  hectareasDisponibles,
  onGuardar,
  onCancelar,
}: {
  hectareasDisponibles: number;
  onGuardar: (lote: Partial<Lote>) => void;
  onCancelar: () => void;
}) {
  const [lote, setLote] = useState<Partial<Lote>>({
    nombre: '',
    fechaSiembra: '',
    hectareasSembradas: 0,
    variedad: '',
  });

  const variedades = [
    'Elaeis Guineensis',
    'Híbrido OxG',
    'Compacta E3',
  ];

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-lg">Nuevo Lote</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nombre del Lote *</Label>
          <Input
            placeholder="Ej: Lote Norte"
            value={lote.nombre}
            onChange={(e) => setLote({ ...lote, nombre: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha de Siembra</Label>
          <Input
            type="date"
            value={lote.fechaSiembra}
            onChange={(e) => setLote({ ...lote, fechaSiembra: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Hectáreas Sembradas *</Label>
          <Input
            type="number"
            placeholder="0"
            max={hectareasDisponibles}
            value={lote.hectareasSembradas || ''}
            onChange={(e) =>
              setLote({ ...lote, hectareasSembradas: parseFloat(e.target.value) || 0 })
            }
          />
          <p className="text-xs text-muted-foreground">
            Disponibles: {hectareasDisponibles.toFixed(2)} ha
          </p>
        </div>
        <div className="space-y-2">
          <Label>Variedad *</Label>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
            value={lote.variedad}
            onChange={(e) => setLote({ ...lote, variedad: e.target.value })}
          >
            <option value="">Seleccionar variedad</option>
            {variedades.map((variedad) => (
              <option key={variedad} value={variedad}>
                {variedad}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => onGuardar(lote)}
          disabled={!lote.nombre || !lote.hectareasSembradas || !lote.variedad}
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

function LoteCard({
  lote,
  onEliminar,
}: {
  lote: Lote;
  onEliminar: () => void;
}) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{lote.nombre}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {lote.fechaSiembra
                ? new Date(lote.fechaSiembra).toLocaleDateString('es-CO')
                : 'Sin fecha'}
            </span>
            <span>•</span>
            <span>{lote.hectareasSembradas} ha</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEliminar}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {lote.variedad && (
        <Badge variant="secondary" className="text-xs">
          {lote.variedad}
        </Badge>
      )}
    </div>
  );
}

function FormSublote({
  onGuardar,
  onCancelar,
}: {
  onGuardar: (nombre: string) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState('');

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
      <div className="space-y-2">
        <Label>Nombre del Sublote *</Label>
        <Input
          placeholder="Ej: Sector A"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onGuardar(nombre)} disabled={!nombre}>
          Guardar
        </Button>
        <Button variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function SubloteCard({
  sublote,
  palmasCount,
  onEliminar,
}: {
  sublote: Sublote;
  palmasCount: number;
  onEliminar: () => void;
}) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold">{sublote.nombre}</h4>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEliminar}
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {palmasCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Leaf className="h-3 w-3" />
          <span>{palmasCount} palmas</span>
        </div>
      )}
      <Badge
        variant={sublote.estado === 'Activo' ? 'default' : 'secondary'}
        className="mt-2 text-xs"
      >
        {sublote.estado}
      </Badge>
    </div>
  );
}

function LineaCard({ linea, onEliminar }: { linea: Linea; onEliminar: () => void }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-accent" />
          <span className="font-semibold text-sm">Línea {linea.numero}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEliminar}
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <Badge
        variant={linea.estado === 'Activo' ? 'default' : 'secondary'}
        className="mt-2 text-xs"
      >
        {linea.estado}
      </Badge>
    </div>
  );
}

function PalmaCard({ palma, onEliminar }: { palma: Palma; onEliminar: () => void }) {
  return (
    <div className="border border-border rounded-lg p-2 bg-card group hover:border-success/50 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <Leaf className="h-3 w-3 text-success" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onEliminar}
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-xs font-mono font-semibold truncate" title={palma.codigo}>
        {palma.codigo}
      </p>
      {palma.lineaId && (
        <p className="text-xs text-muted-foreground mt-1">Con línea</p>
      )}
    </div>
  );
}