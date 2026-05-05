import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  FileText,
  Leaf,
  Scissors,
  Droplets,
  Shield,
  Wrench,
  ClipboardList,
  Plus,
  Trash2,
  Pencil,
  CheckCircle,
  X,
} from 'lucide-react';
import { operacionesApi, selectsApi } from '../../../api/operaciones';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

// Tipos de fertilizantes
const fertilizantes = [
  'NPK 15-15-15',
  'Urea',
  'KCl (Cloruro de Potasio)',
  'Sulfato de Magnesio',
  'Boro',
  'Otro'
];

// Tipos de labor para auxiliares
const laboresAuxiliares = [
  'Mantenimiento de vías',
  'Limpieza de instalaciones',
  'Reparación de cercas',
  'Mantenimiento de equipos',
  'Transporte',
  'Otro'
];

interface TrabajoCosecha {
  id: string;
  colaboradores: string[];
  lotes: string[];
  sublotes: string;
}

interface TrabajoPlateo {
  id: string;
  colaboradores: string[];
  lotes: string[];
  sublotes: string;
  numeroPalmas: number;
}

interface TrabajoPoda {
  id: string;
  colaboradores: string[];
  lotes: string[];
  sublotes: string;
  numeroPalmas: number;
}

interface TrabajoFertilizacion {
  id: string;
  colaboradores: string[];
  lotes: string[];
  sublotes: string;
  palmas: number;
  tipoFertilizante: string;
  cantidadGramos: number;
}

interface TrabajoSanidad {
  id: string;
  colaboradores: string[];
  lotes: string[];
  sublotes: string;
  trabajoRealizado: string;
}

interface TrabajoAuxiliar {
  id: string;
  nombre: string;
  labor: string;
  lugar: string;
  total: number;
  horasExtra: number;
  tipoJornada: 'FIJO' | 'JORNAL';
}

interface HoraExtraRegistro {
  id: string;
  colaboradorId: string;
  tipoHora: string;
  numeroHoras: number;
  observacion: string;
}

const ETAPAS = [
  { numero: 1, nombre: 'Info. General' },
  { numero: 2, nombre: 'Labores de Palma' },
  { numero: 3, nombre: 'Labores de Finca' },
  { numero: 4, nombre: 'Horas Extras' },
  { numero: 5, nombre: 'Finalización' },
];

export default function VerPlanilla() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [etapaActual, setEtapaActual] = useState(1);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Helper defensivo para fechas
  const formatearFecha = (raw: string, opts: Intl.DateTimeFormatOptions): string => {
    if (!raw) return '—';
    const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '—';
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CO', opts);
  };

  // Catálogos cargados desde API (reemplazan al mockData del diseño)
  const [colaboradores, setColaboradores] = useState<Array<{id: string; nombres: string; apellidos: string; nombre_completo: string}>>([]);
  const [lotesData, setLotesData] = useState<Array<{id: string; nombre: string}>>([]);

  // Información General
  const [fecha, setFecha] = useState('');
  const [elaboradoPor, setElaboradoPor] = useState('');
  const [huboLluvia, setHuboLluvia] = useState<'si' | 'no' | ''>('');
  const [lluvia, setLluvia] = useState('');
  const [inicioLabores, setInicioLabores] = useState('');

  // Observaciones y Ausentes (Final)
  const [observaciones, setObservaciones] = useState('');
  const [ausentes, setAusentes] = useState('');

  // Estados de trabajos (se cargan del API)
  const [trabajosCosecha, setTrabajosCosecha] = useState<TrabajoCosecha[]>([]);
  const [trabajosPlateo, setTrabajosPlateo] = useState<TrabajoPlateo[]>([]);
  const [trabajosPoda, setTrabajosPoda] = useState<TrabajoPoda[]>([]);
  const [trabajosFertilizacion, setTrabajosFertilizacion] = useState<TrabajoFertilizacion[]>([]);
  const [trabajosSanidad, setTrabajosSanidad] = useState<TrabajoSanidad[]>([]);
  const [trabajosAuxiliares, setTrabajosAuxiliares] = useState<TrabajoAuxiliar[]>([]);
  const [horasExtras, setHorasExtras] = useState<HoraExtraRegistro[]>([]);

  // Carga inicial: planilla + catálogos
  const cargarPlanilla = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorCarga(null);
    try {
      const [planRes, colRes, lotRes] = await Promise.all([
        operacionesApi.ver(Number(id)),
        selectsApi.colaboradores(),
        selectsApi.lotes(),
      ]);
      const p: any = planRes.data;

      setFecha(p.fecha || '');
      const elaborado =
        p.creado_por_rel?.name ?? p.creado_por_rel?.nombre ??
        p.creadoPor?.name ?? p.creado_por?.name ??
        (user?.id && Number(p.creado_por) === Number(user.id) ? user.nombre : '') ?? '';
      setElaboradoPor(elaborado);
      const lluviaRaw = p.hubo_lluvia;
      const lluviaBool =
        lluviaRaw === true || lluviaRaw === 1 || lluviaRaw === '1' ||
        (typeof lluviaRaw === 'string' && lluviaRaw.toLowerCase() === 'true');
      setHuboLluvia(lluviaBool ? 'si' : 'no');
      if (p.cantidad_lluvia != null) {
        const n = parseFloat(String(p.cantidad_lluvia));
        setLluvia(Number.isFinite(n) && n > 0 ? String(n) : '');
      }
      setInicioLabores(p.hora_inicio ? String(p.hora_inicio).slice(0, 5) : '');
      setObservaciones(p.observaciones || '');

      setColaboradores((colRes.data || []).map((c: any) => {
        let nombres   = c.primer_nombre   ?? c.nombres   ?? c.nombre   ?? '';
        let apellidos = c.primer_apellido ?? c.apellidos ?? c.apellido ?? '';
        const nombreCompletoApi = c.nombre_completo ?? c.full_name ?? c.name ?? '';

        // Si no llegan separados pero sí llega el completo, partirlo en 2 mitades
        if ((!nombres && !apellidos) && nombreCompletoApi) {
          const partes = String(nombreCompletoApi).trim().split(/\s+/);
          const mid = Math.ceil(partes.length / 2);
          nombres   = partes.slice(0, mid).join(' ');
          apellidos = partes.slice(mid).join(' ');
        }

        // Última garantía
        if (!nombres && !apellidos) {
          nombres = `Colaborador`;
          apellidos = String(c.id);
        }

        const nombre_completo = nombreCompletoApi || `${nombres} ${apellidos}`.trim();
        return { id: String(c.id), nombres, apellidos, nombre_completo };
      }));
      setLotesData((lotRes.data || []).map((l: any) => ({ id: String(l.id), nombre: l.nombre })));

      setTrabajosCosecha((p.cosechas || []).map((c: any) => ({
        id: String(c.id),
        colaboradores: (c.cuadrilla || []).map((q: any) => String(q.empleado_id)),
        lotes: c.lote_id ? [String(c.lote_id)] : [],
        sublotes: c.sublote?.nombre || '',
      })));
      const jornales = p.jornales || [];
      setTrabajosPlateo(jornales.filter((j: any) => j.tipo === 'PLATEO').map((j: any) => ({
        id: String(j.id),
        colaboradores: [String(j.empleado_id)],
        lotes: j.lote_id ? [String(j.lote_id)] : [],
        sublotes: j.sublote?.nombre || '',
        numeroPalmas: Number(j.cantidad_palmas ?? 0),
      })));
      setTrabajosPoda(jornales.filter((j: any) => j.tipo === 'PODA').map((j: any) => ({
        id: String(j.id),
        colaboradores: [String(j.empleado_id)],
        lotes: j.lote_id ? [String(j.lote_id)] : [],
        sublotes: j.sublote?.nombre || '',
        numeroPalmas: Number(j.cantidad_palmas ?? 0),
      })));
      setTrabajosFertilizacion(jornales.filter((j: any) => j.tipo === 'FERTILIZACION').map((j: any) => ({
        id: String(j.id),
        colaboradores: [String(j.empleado_id)],
        lotes: j.lote_id ? [String(j.lote_id)] : [],
        sublotes: j.sublote?.nombre || '',
        palmas: Number(j.cantidad_palmas ?? 0),
        tipoFertilizante: j.insumo?.nombre || '',
        cantidadGramos: Number(j.gramos_por_palma ?? 0),
      })));
      setTrabajosSanidad(jornales.filter((j: any) => j.tipo === 'SANIDAD').map((j: any) => ({
        id: String(j.id),
        colaboradores: [String(j.empleado_id)],
        lotes: j.lote_id ? [String(j.lote_id)] : [],
        sublotes: j.sublote?.nombre || '',
        trabajoRealizado: j.descripcion || '',
      })));
      setTrabajosAuxiliares(jornales.filter((j: any) => j.categoria === 'FINCA').map((j: any) => ({
        id: String(j.id),
        nombre: j.empleado ? `${j.empleado.primer_nombre ?? ''} ${j.empleado.primer_apellido ?? ''}`.trim() : '',
        labor: j.labor?.nombre || '',
        lugar: j.ubicacion || '',
        total: parseFloat(j.valor_total || '0'),
        horasExtra: 0,
        tipoJornada: 'FIJO' as const,
      })));
      // Horas Extras
      const hExtras = (p.horas_extra ?? p.horasExtra ?? []) as any[];
      setHorasExtras(hExtras.map((h: any) => ({
        id: String(h.id),
        colaboradorId: String(h.empleado_id ?? ''),
        tipoHora: h.tipoHoraExtra?.nombre ?? h.tipo_hora_extra?.nombre ?? '',
        numeroHoras: Number(h.cantidad_horas ?? h.numero_horas ?? 0),
        observacion: h.observacion ?? '',
      })));
      const ausenciasTexto = (p.ausencias || []).map((a: any) => {
        const emp = a.empleado ? `${a.empleado.primer_nombre ?? ''} ${a.empleado.primer_apellido ?? ''}`.trim() : '';
        const mot = a.motivo_ausencia?.nombre || a.motivo || '';
        return `${emp} — ${mot}`;
      }).join('\n');
      setAusentes(ausenciasTexto);
    } catch (err: any) {
      setErrorCarga(err?.message ?? 'Error al cargar la planilla');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { cargarPlanilla(); }, [cargarPlanilla]);

  const irAEtapa = (numero: number) => {
    setEtapaActual(numero);
  };

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

  const activarEdicion = () => {
    if (!id) return;
    // Navega al wizard idéntico al de creación, pero con todos los datos
    // precargados desde el API por NuevaPlanillaWizard al detectar :id en la URL.
    navigate(`/operaciones/planilla/editar/${id}`);
  };

  const guardarCambios = async () => {
    if (!id) return;
    try {
      await operacionesApi.editar(Number(id), {
        fecha: fecha || undefined,
        hora_inicio: inicioLabores || undefined,
        hubo_lluvia: huboLluvia === 'si',
        cantidad_lluvia: huboLluvia === 'si' && lluvia ? parseFloat(lluvia) : null,
        observaciones: observaciones || null,
      });
      toast.success('Cambios guardados');
      setModoEdicion(false);
      await cargarPlanilla();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al guardar cambios');
    }
  };

  const aprobarPlanilla = async () => {
    if (!id) return;
    try {
      await operacionesApi.aprobar(Number(id));
      toast.success('Planilla aprobada');
      navigate('/operaciones');
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al aprobar planilla');
    }
  };

  // Funciones para agregar trabajos
  const agregarCosecha = () => {
    if (!modoEdicion) return;
    setTrabajosCosecha([...trabajosCosecha, {
      id: `cosecha-${Date.now()}`,
      colaboradores: [],
      lotes: [],
      sublotes: ''
    }]);
  };

  const agregarPlateo = () => {
    if (!modoEdicion) return;
    setTrabajosPlateo([...trabajosPlateo, {
      id: `plateo-${Date.now()}`,
      colaboradores: [],
      lotes: [],
      sublotes: '',
      numeroPalmas: 0
    }]);
  };

  const agregarPoda = () => {
    if (!modoEdicion) return;
    setTrabajosPoda([...trabajosPoda, {
      id: `poda-${Date.now()}`,
      colaboradores: [],
      lotes: [],
      sublotes: '',
      numeroPalmas: 0
    }]);
  };

  const agregarFertilizacion = () => {
    if (!modoEdicion) return;
    setTrabajosFertilizacion([...trabajosFertilizacion, {
      id: `fertilizacion-${Date.now()}`,
      colaboradores: [],
      lotes: [],
      sublotes: '',
      palmas: 0,
      tipoFertilizante: '',
      cantidadGramos: 0
    }]);
  };

  const agregarSanidad = () => {
    if (!modoEdicion) return;
    setTrabajosSanidad([...trabajosSanidad, {
      id: `sanidad-${Date.now()}`,
      colaboradores: [],
      lotes: [],
      sublotes: '',
      trabajoRealizado: ''
    }]);
  };

  const agregarAuxiliar = () => {
    if (!modoEdicion) return;
    setTrabajosAuxiliares([...trabajosAuxiliares, {
      id: `auxiliar-${Date.now()}`,
      nombre: '',
      labor: '',
      lugar: '',
      total: 0,
      horasExtra: 0,
      tipoJornada: 'FIJO'
    }]);
  };

  // Funciones para eliminar trabajos
  const eliminarCosecha = (idTrabajo: string) => {
    if (!modoEdicion) return;
    setTrabajosCosecha(trabajosCosecha.filter(t => t.id !== idTrabajo));
  };

  const eliminarPlateo = (idTrabajo: string) => {
    if (!modoEdicion) return;
    setTrabajosPlateo(trabajosPlateo.filter(t => t.id !== idTrabajo));
  };

  const eliminarPoda = (idTrabajo: string) => {
    if (!modoEdicion) return;
    setTrabajosPoda(trabajosPoda.filter(t => t.id !== idTrabajo));
  };

  const eliminarFertilizacion = (idTrabajo: string) => {
    if (!modoEdicion) return;
    setTrabajosFertilizacion(trabajosFertilizacion.filter(t => t.id !== idTrabajo));
  };

  const eliminarSanidad = (idTrabajo: string) => {
    if (!modoEdicion) return;
    setTrabajosSanidad(trabajosSanidad.filter(t => t.id !== idTrabajo));
  };

  const eliminarAuxiliar = (idTrabajo: string) => {
    if (!modoEdicion) return;
    setTrabajosAuxiliares(trabajosAuxiliares.filter(t => t.id !== idTrabajo));
  };

  // Funciones para manejar colaboradores en cosecha
  const agregarColaboradorACosecha = (trabajoId: string, colaboradorId: string) => {
    if (!modoEdicion) return;
    setTrabajosCosecha(trabajosCosecha.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDeCosecha = (trabajoId: string, colaboradorId: string) => {
    if (!modoEdicion) return;
    setTrabajosCosecha(trabajosCosecha.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };

  // Funciones para manejar lotes en cosecha
  const agregarLoteACosecha = (trabajoId: string, loteId: string) => {
    if (!modoEdicion) return;
    setTrabajosCosecha(trabajosCosecha.map(t => {
      if (t.id === trabajoId && !t.lotes.includes(loteId)) {
        return { ...t, lotes: [...t.lotes, loteId] };
      }
      return t;
    }));
  };

  const eliminarLoteDeCosecha = (trabajoId: string, loteId: string) => {
    if (!modoEdicion) return;
    setTrabajosCosecha(trabajosCosecha.map(t => {
      if (t.id === trabajoId) {
        return { ...t, lotes: t.lotes.filter(id => id !== loteId) };
      }
      return t;
    }));
  };

  // Funciones para plateo
  const agregarColaboradorAPlateo = (trabajoId: string, colaboradorId: string) => {
    if (!modoEdicion) return;
    setTrabajosPlateo(trabajosPlateo.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDePlateo = (trabajoId: string, colaboradorId: string) => {
    if (!modoEdicion) return;
    setTrabajosPlateo(trabajosPlateo.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };

  // Funciones para poda
  const agregarColaboradorAPoda = (trabajoId: string, colaboradorId: string) => {
    if (!modoEdicion) return;
    setTrabajosPoda(trabajosPoda.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDePoda = (trabajoId: string, colaboradorId: string) => {
    if (!modoEdicion) return;
    setTrabajosPoda(trabajosPoda.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };

  // Funciones para fertilización
  const agregarColaboradorAFertilizacion = (trabajoId: string, colaboradorId: string) => {
    if (!modoEdicion) return;
    setTrabajosFertilizacion(trabajosFertilizacion.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDeFertilizacion = (trabajoId: string, colaboradorId: string) => {
    if (!modoEdicion) return;
    setTrabajosFertilizacion(trabajosFertilizacion.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };

  // Funciones para sanidad
  const agregarColaboradorASanidad = (trabajoId: string, colaboradorId: string) => {
    if (!modoEdicion) return;
    setTrabajosSanidad(trabajosSanidad.map(t => {
      if (t.id === trabajoId && !t.colaboradores.includes(colaboradorId)) {
        return { ...t, colaboradores: [...t.colaboradores, colaboradorId] };
      }
      return t;
    }));
  };

  const eliminarColaboradorDeSanidad = (trabajoId: string, colaboradorId: string) => {
    if (!modoEdicion) return;
    setTrabajosSanidad(trabajosSanidad.map(t => {
      if (t.id === trabajoId) {
        return { ...t, colaboradores: t.colaboradores.filter(id => id !== colaboradorId) };
      }
      return t;
    }));
  };

  // Cálculos para el resumen
  const totalColaboradoresCosecha = trabajosCosecha.reduce((sum, t) => sum + t.colaboradores.length, 0);
  const totalPalmasPlateo = trabajosPlateo.reduce((sum, t) => sum + t.numeroPalmas, 0);
  const totalPalmasPoda = trabajosPoda.reduce((sum, t) => sum + t.numeroPalmas, 0);
  const totalPalmasFertilizacion = trabajosFertilizacion.reduce((sum, t) => sum + t.palmas, 0);
  const totalAuxiliares = trabajosAuxiliares.reduce((sum, t) => sum + t.total, 0);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/operaciones')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <h1>Ver Planilla del Día</h1>
          <p className="text-muted-foreground mt-1">
            Revisar y aprobar planilla
          </p>
        </div>
        
        {/* Botones en el header */}
        <div className="flex items-center gap-2 mt-10">
          {!modoEdicion ? (
            <>
              <Button 
                onClick={activarEdicion}
                variant="outline"
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              <Button 
                onClick={aprobarPlanilla}
                className="gap-2 bg-success hover:bg-success/90"
              >
                <CheckCircle className="h-5 w-5" />
                Aprobar Planilla
              </Button>
            </>
          ) : (
            <Button 
              onClick={guardarCambios}
              className="gap-2"
            >
              <Save className="h-5 w-5" />
              Guardar Planilla
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: Wizard (2/3) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Stepper horizontal */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {ETAPAS.map((etapa, index) => {
                  const estaCompleta = etapaActual > etapa.numero;
                  const estaActiva = etapaActual === etapa.numero;
                  return (
                    <div key={etapa.numero} className="flex items-center" style={{ flex: index < ETAPAS.length - 1 ? 1 : 'none' }}>
                      {/* Círculo de etapa */}
                      <button
                        onClick={() => irAEtapa(etapa.numero)}
                        className="flex flex-col items-center gap-2 cursor-pointer"
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

                      {/* Línea conectora */}
                      {index < ETAPAS.length - 1 && (
                        <div className="flex-1 h-0.5 mx-3 bg-border relative min-w-[20px]">
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
            {/* ETAPA 1: INFORMACIÓN GENERAL */}
            {etapaActual === 1 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Información General</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Datos básicos de la planilla
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fecha de la Planilla</Label>
                      {modoEdicion ? (
                        <Input
                          type="date"
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                        />
                      ) : (
                        <div className="text-sm font-medium py-2">
                          {new Date(fecha).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Elaborado por</Label>
                      {modoEdicion ? (
                        <Input
                          value={elaboradoPor}
                          onChange={(e) => setElaboradoPor(e.target.value)}
                        />
                      ) : (
                        <div className="text-sm font-medium py-2">{elaboradoPor}</div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>¿Hubo lluvia?</Label>
                      {modoEdicion ? (
                        <Select
                          value={huboLluvia}
                          onValueChange={(value) => {
                            setHuboLluvia(value as 'si' | 'no');
                            if (value === 'no') {
                              setLluvia('');
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="si">Sí</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-sm font-medium py-2">
                          {huboLluvia === 'si' ? 'Sí' : 'No'}
                        </div>
                      )}
                    </div>

                    {huboLluvia === 'si' && (
                      <div className="space-y-2">
                        <Label>Lluvia (mm)</Label>
                        {modoEdicion ? (
                          <Input
                            type="number"
                            value={lluvia}
                            onChange={(e) => setLluvia(e.target.value)}
                          />
                        ) : (
                          <div className="text-sm font-medium py-2">{lluvia} mm</div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Hora de Inicio de Labores</Label>
                      {modoEdicion ? (
                        <Input
                          type="time"
                          value={inicioLabores}
                          onChange={(e) => setInicioLabores(e.target.value)}
                        />
                      ) : (
                        <div className="text-sm font-medium py-2">{inicioLabores}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 2: LABORES DE PALMA */}
            {etapaActual === 2 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Labores de Palma</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Cosecha, plateo, poda, fertilización y sanidad
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Tabs defaultValue="cosecha" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="cosecha">Cosecha</TabsTrigger>
                      <TabsTrigger value="plateo">Plateo</TabsTrigger>
                      <TabsTrigger value="poda">Poda</TabsTrigger>
                      <TabsTrigger value="fertilizacion">Fertilización</TabsTrigger>
                      <TabsTrigger value="sanidad">Sanidad</TabsTrigger>
                    </TabsList>

                    {/* TAB: COSECHA */}
                    <TabsContent value="cosecha" className="space-y-4">
                      {modoEdicion && (
                        <div className="flex justify-end">
                          <Button onClick={agregarCosecha} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Agregar Cosecha
                          </Button>
                        </div>
                      )}
                      {trabajosCosecha.map((trabajo) => (
                        <Card key={trabajo.id} className="border-border">
                          <CardContent className="pt-6 space-y-4">
                            {modoEdicion && (
                              <div className="flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarCosecha(trabajo.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                {modoEdicion ? (
                                  <>
                                    <Select
                                      value=""
                                      onValueChange={(value) => {
                                        if (value) {
                                          agregarColaboradorACosecha(trabajo.id, value);
                                        }
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Agregar colaborador" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {colaboradores
                                          .filter(col => !trabajo.colaboradores.includes(col.id))
                                          .map((col) => (
                                            <SelectItem key={col.id} value={col.id}>
                                              {col.nombres} {col.apellidos}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                    {trabajo.colaboradores.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {trabajo.colaboradores.map((colId) => {
                                          const col = colaboradores.find(c => c.id === colId);
                                          return col ? (
                                            <Badge
                                              key={colId}
                                              variant="secondary"
                                              className="pl-2.5 pr-1 py-1 gap-1"
                                            >
                                              <span>{col.nombres} {col.apellidos}</span>
                                              <button
                                                type="button"
                                                onClick={() => eliminarColaboradorDeCosecha(trabajo.id, colId)}
                                                className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            </Badge>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {trabajo.colaboradores.length === 0 && (
                                      <span className="text-sm text-muted-foreground">Sin colaboradores</span>
                                    )}
                                    {trabajo.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      const label = col
                                        ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${colId}`)
                                        : `Colaborador ${colId}`;
                                      return (
                                        <Badge key={colId} variant="secondary">
                                          {label}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Lotes</Label>
                                {modoEdicion ? (
                                  <>
                                    <Select
                                      value=""
                                      onValueChange={(value) => {
                                        if (value) {
                                          agregarLoteACosecha(trabajo.id, value);
                                        }
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Agregar lote" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {lotesData
                                          .filter(lote => !trabajo.lotes.includes(lote.id))
                                          .map((lote) => (
                                            <SelectItem key={lote.id} value={lote.id}>
                                              {lote.nombre}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                    {trabajo.lotes.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {trabajo.lotes.map((loteId) => {
                                          const lote = lotesData.find(l => l.id === loteId);
                                          return lote ? (
                                            <Badge
                                              key={loteId}
                                              variant="secondary"
                                              className="pl-2.5 pr-1 py-1 gap-1"
                                            >
                                              <span>{lote.nombre}</span>
                                              <button
                                                type="button"
                                                onClick={() => eliminarLoteDeCosecha(trabajo.id, loteId)}
                                                className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            </Badge>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {trabajo.lotes.map((loteId) => {
                                      const lote = lotesData.find(l => l.id === loteId);
                                      return lote ? (
                                        <Badge key={loteId} variant="secondary">
                                          {lote.nombre}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Sublotes</Label>
                                {modoEdicion ? (
                                  <Input placeholder="Ej: A1, A2" value={trabajo.sublotes} onChange={(e) => {
                                    const updated = trabajosCosecha.map(t =>
                                      t.id === trabajo.id ? { ...t, sublotes: e.target.value } : t
                                    );
                                    setTrabajosCosecha(updated);
                                  }} />
                                ) : (
                                  <div className="text-sm py-2">{trabajo.sublotes}</div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {trabajosCosecha.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Leaf className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No hay registros de cosecha</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* TAB: PLATEO */}
                    <TabsContent value="plateo" className="space-y-4">
                      {modoEdicion && (
                        <div className="flex justify-end">
                          <Button onClick={agregarPlateo} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Agregar Plateo
                          </Button>
                        </div>
                      )}

{trabajosPlateo.map((trabajo) => (
                    <Card key={trabajo.id} className="border-border">
                      <CardContent className="pt-6 space-y-4">
                        {modoEdicion && (
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarPlateo(trabajo.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Colaboradores</Label>
                            {modoEdicion ? (
                              <>
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value) {
                                      agregarColaboradorAPlateo(trabajo.id, value);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !trabajo.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {col.nombres} {col.apellidos}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {trabajo.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {trabajo.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge
                                          key={colId}
                                          variant="secondary"
                                          className="pl-2.5 pr-1 py-1 gap-1"
                                        >
                                          <span>{col.nombres} {col.apellidos}</span>
                                          <button
                                            type="button"
                                            onClick={() => eliminarColaboradorDePlateo(trabajo.id, colId)}
                                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {trabajo.colaboradores.length === 0 && (
                                  <span className="text-sm text-muted-foreground">Sin colaboradores</span>
                                )}
                                {trabajo.colaboradores.map((colId) => {
                                  const col = colaboradores.find(c => c.id === colId);
                                  const label = col
                                    ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${colId}`)
                                    : `Colaborador ${colId}`;
                                  return (
                                    <Badge key={colId} variant="secondary">
                                      {label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Número de Palmas</Label>
                            {modoEdicion ? (
                              <Input type="number" value={trabajo.numeroPalmas} onChange={(e) => {
                                const updated = trabajosPlateo.map(t =>
                                  t.id === trabajo.id ? { ...t, numeroPalmas: Number(e.target.value) } : t
                                );
                                setTrabajosPlateo(updated);
                              }} />
                            ) : (
                              <div className="text-sm font-semibold py-2">{trabajo.numeroPalmas}</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {trabajosPlateo.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Scissors className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay registros de plateo</p>
                    </div>
                  )}
                    </TabsContent>

                    {/* TAB: PODA */}
                    <TabsContent value="poda" className="space-y-4">
                      {modoEdicion && (
                        <div className="flex justify-end">
                          <Button onClick={agregarPoda} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Agregar Poda
                          </Button>
                        </div>
                      )}
                      {trabajosPoda.map((trabajo) => (
                    <Card key={trabajo.id} className="border-border">
                      <CardContent className="pt-6 space-y-4">
                        {modoEdicion && (
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarPoda(trabajo.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Colaboradores</Label>
                            {modoEdicion ? (
                              <>
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value) {
                                      agregarColaboradorAPoda(trabajo.id, value);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !trabajo.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {col.nombres} {col.apellidos}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {trabajo.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {trabajo.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge
                                          key={colId}
                                          variant="secondary"
                                          className="pl-2.5 pr-1 py-1 gap-1"
                                        >
                                          <span>{col.nombres} {col.apellidos}</span>
                                          <button
                                            type="button"
                                            onClick={() => eliminarColaboradorDePoda(trabajo.id, colId)}
                                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {trabajo.colaboradores.length === 0 && (
                                  <span className="text-sm text-muted-foreground">Sin colaboradores</span>
                                )}
                                {trabajo.colaboradores.map((colId) => {
                                  const col = colaboradores.find(c => c.id === colId);
                                  const label = col
                                    ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${colId}`)
                                    : `Colaborador ${colId}`;
                                  return (
                                    <Badge key={colId} variant="secondary">
                                      {label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Número de Palmas</Label>
                            {modoEdicion ? (
                              <Input type="number" value={trabajo.numeroPalmas} onChange={(e) => {
                                const updated = trabajosPoda.map(t =>
                                  t.id === trabajo.id ? { ...t, numeroPalmas: Number(e.target.value) } : t
                                );
                                setTrabajosPoda(updated);
                              }} />
                            ) : (
                              <div className="text-sm font-semibold py-2">{trabajo.numeroPalmas}</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {trabajosPoda.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Scissors className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay registros de poda</p>
                    </div>
                  )}
                    </TabsContent>

                    {/* TAB: FERTILIZACIÓN */}
                    <TabsContent value="fertilizacion" className="space-y-4">
                      {modoEdicion && (
                        <div className="flex justify-end">
                          <Button onClick={agregarFertilizacion} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Agregar Fertilización
                          </Button>
                        </div>
                      )}
                      {trabajosFertilizacion.map((trabajo) => (
                    <Card key={trabajo.id} className="border-border">
                      <CardContent className="pt-6 space-y-4">
                        {modoEdicion && (
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarFertilizacion(trabajo.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Colaboradores</Label>
                            {modoEdicion ? (
                              <>
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value) {
                                      agregarColaboradorAFertilizacion(trabajo.id, value);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !trabajo.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {col.nombres} {col.apellidos}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {trabajo.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {trabajo.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge
                                          key={colId}
                                          variant="secondary"
                                          className="pl-2.5 pr-1 py-1 gap-1"
                                        >
                                          <span>{col.nombres} {col.apellidos}</span>
                                          <button
                                            type="button"
                                            onClick={() => eliminarColaboradorDeFertilizacion(trabajo.id, colId)}
                                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {trabajo.colaboradores.length === 0 && (
                                  <span className="text-sm text-muted-foreground">Sin colaboradores</span>
                                )}
                                {trabajo.colaboradores.map((colId) => {
                                  const col = colaboradores.find(c => c.id === colId);
                                  const label = col
                                    ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${colId}`)
                                    : `Colaborador ${colId}`;
                                  return (
                                    <Badge key={colId} variant="secondary">
                                      {label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo de Fertilizante</Label>
                            {modoEdicion ? (
                              <Select value={trabajo.tipoFertilizante} onValueChange={(val) => {
                                const updated = trabajosFertilizacion.map(t =>
                                  t.id === trabajo.id ? { ...t, tipoFertilizante: val } : t
                                );
                                setTrabajosFertilizacion(updated);
                              }}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fertilizantes.map((fert) => (
                                    <SelectItem key={fert} value={fert}>
                                      {fert}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="text-sm font-semibold py-2">{trabajo.tipoFertilizante}</div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Número de Palmas</Label>
                            {modoEdicion ? (
                              <Input type="number" value={trabajo.palmas} onChange={(e) => {
                                const updated = trabajosFertilizacion.map(t =>
                                  t.id === trabajo.id ? { ...t, palmas: Number(e.target.value) } : t
                                );
                                setTrabajosFertilizacion(updated);
                              }} />
                            ) : (
                              <div className="text-sm font-semibold py-2">{trabajo.palmas}</div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Cantidad (gramos)</Label>
                            {modoEdicion ? (
                              <Input type="number" value={trabajo.cantidadGramos} onChange={(e) => {
                                const updated = trabajosFertilizacion.map(t =>
                                  t.id === trabajo.id ? { ...t, cantidadGramos: Number(e.target.value) } : t
                                );
                                setTrabajosFertilizacion(updated);
                              }} />
                            ) : (
                              <div className="text-sm font-semibold py-2">{trabajo.cantidadGramos}g</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {trabajosFertilizacion.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Droplets className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay registros de fertilización</p>
                    </div>
                  )}
                    </TabsContent>

                    {/* TAB: SANIDAD */}
                    <TabsContent value="sanidad" className="space-y-4">
                      {modoEdicion && (
                        <div className="flex justify-end">
                          <Button onClick={agregarSanidad} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Agregar Sanidad
                          </Button>
                        </div>
                      )}
                      {trabajosSanidad.map((trabajo) => (
                    <Card key={trabajo.id} className="border-border">
                      <CardContent className="pt-6 space-y-4">
                        {modoEdicion && (
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarSanidad(trabajo.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Colaboradores</Label>
                            {modoEdicion ? (
                              <>
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value) {
                                      agregarColaboradorASanidad(trabajo.id, value);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Agregar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colaboradores
                                      .filter(col => !trabajo.colaboradores.includes(col.id))
                                      .map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {col.nombres} {col.apellidos}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {trabajo.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {trabajo.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge
                                          key={colId}
                                          variant="secondary"
                                          className="pl-2.5 pr-1 py-1 gap-1"
                                        >
                                          <span>{col.nombres} {col.apellidos}</span>
                                          <button
                                            type="button"
                                            onClick={() => eliminarColaboradorDeSanidad(trabajo.id, colId)}
                                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {trabajo.colaboradores.length === 0 && (
                                  <span className="text-sm text-muted-foreground">Sin colaboradores</span>
                                )}
                                {trabajo.colaboradores.map((colId) => {
                                  const col = colaboradores.find(c => c.id === colId);
                                  const label = col
                                    ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${colId}`)
                                    : `Colaborador ${colId}`;
                                  return (
                                    <Badge key={colId} variant="secondary">
                                      {label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Trabajo Realizado</Label>
                            {modoEdicion ? (
                              <Input value={trabajo.trabajoRealizado} onChange={(e) => {
                                const updated = trabajosSanidad.map(t =>
                                  t.id === trabajo.id ? { ...t, trabajoRealizado: e.target.value } : t
                                );
                                setTrabajosSanidad(updated);
                              }} placeholder="Descripción del trabajo" />
                            ) : (
                              <div className="text-sm py-2">{trabajo.trabajoRealizado}</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {trabajosSanidad.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay registros de sanidad vegetal</p>
                    </div>
                  )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 3: LABORES DE FINCA (AUXILIARES) */}
            {etapaActual === 3 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wrench className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Labores de Finca</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Auxiliares y trabajos complementarios
                        </p>
                      </div>
                    </div>
                    {modoEdicion && (
                      <Button
                        onClick={agregarAuxiliar}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trabajosAuxiliares.map((trabajo) => (
                    <Card key={trabajo.id} className="border-border">
                      <CardContent className="pt-6 space-y-4">
                        {modoEdicion && (
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarAuxiliar(trabajo.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Nombre</Label>
                            {modoEdicion ? (
                              <Input value={trabajo.nombre} onChange={(e) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, nombre: e.target.value } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }} placeholder="Nombre del colaborador" />
                            ) : (
                              <div className="text-sm py-2">{trabajo.nombre}</div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Labor</Label>
                            {modoEdicion ? (
                              <Select value={trabajo.labor} onValueChange={(val) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, labor: val } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar labor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {laboresAuxiliares.map((labor) => (
                                    <SelectItem key={labor} value={labor}>
                                      {labor}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="text-sm py-2">{trabajo.labor}</div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Lugar</Label>
                            {modoEdicion ? (
                              <Input value={trabajo.lugar} onChange={(e) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, lugar: e.target.value } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }} placeholder="Ubicación" />
                            ) : (
                              <div className="text-sm py-2">{trabajo.lugar}</div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Total</Label>
                            {modoEdicion ? (
                              <Input type="number" value={trabajo.total} onChange={(e) => {
                                const updated = trabajosAuxiliares.map(t =>
                                  t.id === trabajo.id ? { ...t, total: Number(e.target.value) } : t
                                );
                                setTrabajosAuxiliares(updated);
                              }} placeholder="0" />
                            ) : (
                              <div className="text-sm font-semibold py-2 text-success">
                                ${trabajo.total.toLocaleString('es-CO')}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {trabajosAuxiliares.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wrench className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay registros de trabajos auxiliares</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ETAPA 4: HORAS EXTRAS */}
            {etapaActual === 4 && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Horas Extras</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Registros de horas extras de los colaboradores
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {horasExtras.map((hora) => {
                    const col = colaboradores.find(c => c.id === hora.colaboradorId);
                    const colLabel = col
                      ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${hora.colaboradorId}`)
                      : `Colaborador ${hora.colaboradorId}`;
                    return (
                      <Card key={hora.id} className="border-border">
                        <CardContent className="pt-6 space-y-4">
                          {/* Colaborador (siempre primero) */}
                          <div className="space-y-2">
                            <Label>Colaborador</Label>
                            <div className="text-sm font-semibold py-2">{colLabel}</div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Tipo de Hora</Label>
                              <div className="text-sm font-medium py-2">{hora.tipoHora || '—'}</div>
                            </div>
                            <div className="space-y-2">
                              <Label>Número de Horas</Label>
                              <div className="text-sm font-medium py-2">{hora.numeroHoras}</div>
                            </div>
                            {hora.observacion && (
                              <div className="space-y-2 md:col-span-2">
                                <Label>Observación</Label>
                                <div className="text-sm py-2">{hora.observacion}</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {horasExtras.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No hay registros de horas extras</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ETAPA 5: FINALIZACIÓN */}
            {etapaActual === 5 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Finalización</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Observaciones y ausentes
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Observaciones</Label>
                    {modoEdicion ? (
                      <Textarea
                        placeholder="Notas o comentarios sobre la jornada..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        rows={4}
                      />
                    ) : (
                      <div className="text-sm py-2">{observaciones}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Ausentes</Label>
                    {modoEdicion ? (
                      <Textarea
                        placeholder="Colaboradores ausentes hoy..."
                        value={ausentes}
                        onChange={(e) => setAusentes(e.target.value)}
                        rows={4}
                      />
                    ) : (
                      <div className="text-sm py-2">{ausentes}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

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
                  className="gap-2"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                !modoEdicion ? (
                  <Button
                    onClick={aprobarPlanilla}
                    className="gap-2 bg-success hover:bg-success/90"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprobar Planilla
                  </Button>
                ) : (
                  <Button
                    onClick={guardarCambios}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Guardar Planilla
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: Panel de resumen (1/3) - sticky */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
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

                {/* RESUMEN DETALLADO */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Resumen Detallado
                  </h4>

                  {!fecha && !elaboradoPor ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No hay información para mostrar</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {fecha && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Fecha</span>
                          <span className="font-semibold text-sm">
                            {new Date(fecha).toLocaleDateString('es-CO')}
                          </span>
                        </div>
                      )}
                      {elaboradoPor && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Elaborado por</span>
                          <span className="font-semibold text-sm truncate ml-2 max-w-[150px]" title={elaboradoPor}>
                            {elaboradoPor}
                          </span>
                        </div>
                      )}
                      {huboLluvia && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Lluvia</span>
                          <span className="font-semibold text-sm">
                            {huboLluvia === 'si' && lluvia ? `${lluvia} mm` : 'No'}
                          </span>
                        </div>
                      )}
                      {inicioLabores && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Inicio Labores</span>
                          <span className="font-semibold text-sm">{inicioLabores}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="h-px bg-border" />

                {/* LABORES REGISTRADAS */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Labores Registradas
                  </h4>

                  {/* Cosecha */}
                  {trabajosCosecha.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Cosecha</span>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          {trabajosCosecha.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-success/20">
                        {trabajosCosecha.map((trabajo) => {
                          const loteNombre = (trabajo.lotes ?? []).map(loteId => lotesData.find(l => l.id === loteId)?.nombre).filter(Boolean).join(', ');
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="text-muted-foreground">
                                {loteNombre || '—'}{trabajo.sublotes ? ` · ${trabajo.sublotes}` : ''}
                              </div>
                              <div className="text-muted-foreground">
                                {trabajo.colaboradores?.length || 0} colaboradores
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Plateo */}
                  {trabajosPlateo.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Plateo</span>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {trabajosPlateo.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-primary/20">
                        {trabajosPlateo.map((trabajo) => {
                          const loteNombre = (trabajo.lotes ?? []).map(loteId => lotesData.find(l => l.id === loteId)?.nombre).filter(Boolean).join(', ');
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {loteNombre || '—'}{trabajo.sublotes ? ` · ${trabajo.sublotes}` : ''}
                                </span>
                                <span className="font-medium">{trabajo.numeroPalmas} palmas</span>
                              </div>
                              <div className="text-muted-foreground">
                                {trabajo.colaboradores?.length || 0} colaboradores
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-1 border-t border-border/50">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-xs">Total Plateo</span>
                            <span className="text-xs text-primary">
                              {totalPalmasPlateo.toLocaleString('es-CO')} palmas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Poda */}
                  {trabajosPoda.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Poda</span>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          {trabajosPoda.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-warning/20">
                        {trabajosPoda.map((trabajo) => {
                          const loteNombre = (trabajo.lotes ?? []).map(loteId => lotesData.find(l => l.id === loteId)?.nombre).filter(Boolean).join(', ');
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {loteNombre || '—'}{trabajo.sublotes ? ` · ${trabajo.sublotes}` : ''}
                                </span>
                                <span className="font-medium">{trabajo.numeroPalmas} palmas</span>
                              </div>
                              <div className="text-muted-foreground">
                                {trabajo.colaboradores?.length || 0} colaboradores
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-1 border-t border-border/50">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-xs">Total Poda</span>
                            <span className="text-xs text-warning">
                              {totalPalmasPoda.toLocaleString('es-CO')} palmas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fertilización */}
                  {trabajosFertilizacion.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Fertilización</span>
                        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                          {trabajosFertilizacion.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-accent/20">
                        {trabajosFertilizacion.map((trabajo) => {
                          const loteNombre = (trabajo.lotes ?? []).map(loteId => lotesData.find(l => l.id === loteId)?.nombre).filter(Boolean).join(', ');
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {loteNombre || '—'}{trabajo.sublotes ? ` · ${trabajo.sublotes}` : ''}
                                </span>
                                <span className="font-medium">{trabajo.palmas} palmas</span>
                              </div>
                              <div className="text-muted-foreground">
                                {trabajo.tipoFertilizante || '—'} · {trabajo.colaboradores?.length || 0} colab.
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sanidad */}
                  {trabajosSanidad.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Sanidad</span>
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          {trabajosSanidad.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-destructive/20">
                        {trabajosSanidad.map((trabajo) => {
                          const loteNombre = (trabajo.lotes ?? []).map(loteId => lotesData.find(l => l.id === loteId)?.nombre).filter(Boolean).join(', ');
                          return (
                            <div key={trabajo.id} className="text-xs space-y-0.5">
                              <div className="text-muted-foreground">
                                {loteNombre || '—'}{trabajo.sublotes ? ` · ${trabajo.sublotes}` : ''}
                              </div>
                              <div className="text-muted-foreground">
                                {trabajo.colaboradores?.length || 0} colaboradores
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Auxiliares */}
                  {trabajosAuxiliares.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Auxiliares</span>
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                          {trabajosAuxiliares.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-border">
                        {trabajosAuxiliares.map((trabajo) => (
                          <div key={trabajo.id} className="text-xs space-y-0.5">
                            <div className="text-muted-foreground">{trabajo.labor || trabajo.nombre || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Si no hay labores */}
                  {trabajosCosecha.length === 0 &&
                   trabajosPlateo.length === 0 &&
                   trabajosPoda.length === 0 &&
                   trabajosFertilizacion.length === 0 &&
                   trabajosSanidad.length === 0 &&
                   trabajosAuxiliares.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No hay labores registradas</p>
                    </div>
                  )}
                </div>

                {/* Horas Extras */}
                {horasExtras.length > 0 && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Horas Extras
                        </h4>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          {horasExtras.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {horasExtras.map((he) => {
                          const col = colaboradores.find(c => c.id === he.colaboradorId);
                          const colLabel = col
                            ? (col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${he.colaboradorId}`)
                            : `Colaborador ${he.colaboradorId}`;
                          return (
                            <div key={he.id} className="p-2 bg-muted/30 rounded-md">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">{colLabel}</span>
                                <span className="text-xs font-bold text-warning">{he.numeroHoras}h</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {he.tipoHora || '—'}
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-1 border-t border-border">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-xs">Total Horas</span>
                            <span className="text-xs text-warning">
                              {horasExtras.reduce((sum, he) => sum + (he.numeroHoras || 0), 0)} horas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}