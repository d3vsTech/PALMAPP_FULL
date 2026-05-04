import { useState, useEffect, useCallback } from 'react';
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
import { operacionesApi, selectsApi, Planilla } from '../../../api/operaciones';
import { useAuth } from '../../contexts/AuthContext';

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
  gajosRecogidos: number;
  kilos: number;
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

interface TrabajoOtros {
  id: string;
  colaboradores: string[];
  lotes: string[];
  sublotes: string;
  nombre: string;
  laborRealizada: string;
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

interface HoraExtraItem {
  id: string;
  colaborador: string;
  tipoHora: string;
  numeroHoras: number;
  observacion: string;
  valor: number;
}

const ETAPAS = [
  { numero: 1, nombre: 'Info. General' },
  { numero: 2, nombre: 'Labores de Palma' },
  { numero: 3, nombre: 'Labores de Finca' },
  { numero: 4, nombre: 'Finalización' },
];

export default function VerPlanilla() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [etapaActual, setEtapaActual] = useState(1);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Datos de colaboradores y lotes desde API
  const [colaboradores, setColaboradores] = useState<Array<{id: string; nombres: string; apellidos: string; nombre_completo: string}>>([]);
  const [lotesData, setLotesData] = useState<Array<{id: string; nombre: string}>>([]);
  // Sublotes desde API para resolver el nombre por id en cards de jornales
  const [sublotesData, setSublotesData] = useState<Array<{id: string; nombre: string}>>([]);

  // Información General - DATOS DE LA API (se cargan en useEffect)
  const [fecha, setFecha] = useState('');
  const [elaboradoPor, setElaboradoPor] = useState('');
  const [huboLluvia, setHuboLluvia] = useState<'si' | 'no' | ''>('');
  const [lluvia, setLluvia] = useState('');
  const [inicioLabores, setInicioLabores] = useState('');
  
  // Observaciones y Ausentes (Final)
  const [observaciones, setObservaciones] = useState('');
  const [ausentes, setAusentes] = useState('');
  
  // Estados de trabajos - se cargan desde API
  const [trabajosCosecha, setTrabajosCosecha] = useState<TrabajoCosecha[]>([]);
  const [trabajosPlateo, setTrabajosPlateo] = useState<TrabajoPlateo[]>([]);
  const [trabajosPoda, setTrabajosPoda] = useState<TrabajoPoda[]>([]);
  const [trabajosFertilizacion, setTrabajosFertilizacion] = useState<TrabajoFertilizacion[]>([]);
  const [trabajosSanidad, setTrabajosSanidad] = useState<TrabajoSanidad[]>([]);
  const [trabajosOtros, setTrabajosOtros] = useState<TrabajoOtros[]>([]);
  const [trabajosAuxiliares, setTrabajosAuxiliares] = useState<TrabajoAuxiliar[]>([]);
  const [horasExtraItems, setHorasExtraItems] = useState<HoraExtraItem[]>([]);

  // ── Helper: formatea fechas defensivamente para evitar "Invalid Date" ─────
  const formatearFecha = (raw: string, opts: Intl.DateTimeFormatOptions): string => {
    if (!raw) return '—';
    // Aceptar tanto YYYY-MM-DD como ISO con timestamp
    const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '—';
    // Construir Date local (sin problemas de timezone)
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CO', opts);
  };

  // ── Cargar planilla desde API ──────────────────────────────────────────────
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

      // Campos generales
      setFecha(p.fecha || '');
      // Elaborado por: el API puede devolver el campo con varios nombres distintos.
      // Si la planilla la creó el usuario actualmente logueado, usamos su nombre como fallback.
      const elaborado =
        p.creado_por_rel?.name ??
        p.creado_por_rel?.nombre ??
        p.creado_por_rel?.full_name ??
        p.creado_por_rel?.nombre_completo ??
        p.creadoPor?.name ??
        p.creado_por?.name ??
        p.creado_por?.nombre ??
        p.elaborado_por ??
        p.user?.name ??
        // Fallback: si el creado_por (id) coincide con el usuario logueado, usar su nombre
        (p.creado_por && user?.id && Number(p.creado_por) === Number(user.id) ? user.nombre : null) ??
        // Último recurso: si no hay info, mostrar el nombre del usuario actual
        user?.nombre ??
        '';
      setElaboradoPor(elaborado);

      // hubo_lluvia: el API puede devolver true/false, 0/1, "0"/"1", "true"/"false".
      // Convertimos a booleano de forma robusta antes de mapear a 'si' / 'no'.
      const lluviaRaw = p.hubo_lluvia;
      const lluviaBool =
        lluviaRaw === true || lluviaRaw === 1 || lluviaRaw === '1' ||
        (typeof lluviaRaw === 'string' && lluviaRaw.toLowerCase() === 'true');
      setHuboLluvia(lluviaBool ? 'si' : 'no');

      // Cantidad de lluvia (mm) — guardar solo si hay valor numérico > 0
      if (p.cantidad_lluvia != null) {
        const n = parseFloat(String(p.cantidad_lluvia));
        setLluvia(Number.isFinite(n) && n > 0 ? String(n) : '');
      } else {
        setLluvia('');
      }

      setInicioLabores(p.hora_inicio ? String(p.hora_inicio).slice(0, 5) : '');
      setObservaciones(p.observaciones || '');

      // Colaboradores: aceptar todas las variantes de campo (primer_nombre, nombres, nombre_completo, etc.)
      setColaboradores((colRes.data || []).map((c: any) => {
        const nombres   = c.primer_nombre   ?? c.nombres   ?? c.nombre   ?? c.first_name ?? '';
        const apellidos = c.primer_apellido ?? c.apellidos ?? c.apellido ?? c.last_name  ?? '';
        const nombre_completo = c.nombre_completo ?? c.full_name ?? c.name ??
          ((nombres || apellidos) ? `${nombres} ${apellidos}`.trim() : `Colab. ${c.id}`);
        return { id: String(c.id), nombres, apellidos, nombre_completo };
      }));
      const lotesArr = (lotRes.data || []).map((l: any) => ({ id: String(l.id), nombre: l.nombre }));
      setLotesData(lotesArr);

      // Cargar sublotes en paralelo por cada lote para poder resolver nombres en cards
      const sublotesPromises = lotesArr.map(async (l) => {
        try {
          const sr = await selectsApi.sublotes({ lote_id: Number(l.id) });
          return (sr.data || []).map((s: any) => ({ id: String(s.id), nombre: s.nombre }));
        } catch { return []; }
      });
      const allSubs = (await Promise.all(sublotesPromises)).flat();
      setSublotesData(allSubs);

      // Mapear cosechas de API → estado local (incluyendo gajos y kilos)
      setTrabajosCosecha(
        (p.cosechas || []).map((c: any) => ({
          id: String(c.id),
          colaboradores: (c.cuadrilla || []).map((q: any) => String(q.empleado_id)),
          lotes: c.lote_id ? [String(c.lote_id)] : [],
          sublotes: c.sublote?.nombre ?? (c.sublote_id ? String(c.sublote_id) : ''),
          gajosRecogidos: Number(c.gajos_reportados ?? 0),
          kilos: c.peso_confirmado != null ? Number(c.peso_confirmado) : 0,
        }))
      );

      // Mapear jornales por tipo
      const jornales = p.jornales || [];
      setTrabajosPlateo(
        jornales.filter((j: any) => j.tipo === 'PLATEO').map((j: any) => ({
          id: String(j.id),
          colaboradores: [String(j.empleado_id)],
          lotes: j.lote_id ? [String(j.lote_id)] : [],
          sublotes: j.sublote?.nombre ?? (j.sublote_id ? String(j.sublote_id) : ''),
          numeroPalmas: Number(j.cantidad_palmas ?? 0),
        }))
      );
      setTrabajosPoda(
        jornales.filter((j: any) => j.tipo === 'PODA').map((j: any) => ({
          id: String(j.id),
          colaboradores: [String(j.empleado_id)],
          lotes: j.lote_id ? [String(j.lote_id)] : [],
          sublotes: j.sublote?.nombre ?? (j.sublote_id ? String(j.sublote_id) : ''),
          numeroPalmas: Number(j.cantidad_palmas ?? 0),
        }))
      );
      setTrabajosFertilizacion(
        jornales.filter((j: any) => j.tipo === 'FERTILIZACION').map((j: any) => ({
          id: String(j.id),
          colaboradores: [String(j.empleado_id)],
          lotes: j.lote_id ? [String(j.lote_id)] : [],
          sublotes: j.sublote?.nombre ?? (j.sublote_id ? String(j.sublote_id) : ''),
          palmas: Number(j.cantidad_palmas ?? 0),
          tipoFertilizante: j.insumo?.nombre || '',
          cantidadGramos: Number(j.gramos_por_palma ?? 0),
        }))
      );
      setTrabajosSanidad(
        jornales.filter((j: any) => j.tipo === 'SANIDAD').map((j: any) => ({
          id: String(j.id),
          colaboradores: [String(j.empleado_id)],
          lotes: j.lote_id ? [String(j.lote_id)] : [],
          sublotes: j.sublote?.nombre ?? (j.sublote_id ? String(j.sublote_id) : ''),
          trabajoRealizado: j.descripcion || '',
        }))
      );
      setTrabajosOtros(
        jornales.filter((j: any) => j.tipo === 'OTROS').map((j: any) => ({
          id: String(j.id),
          colaboradores: [String(j.empleado_id)],
          lotes: j.lote_id ? [String(j.lote_id)] : [],
          sublotes: j.sublote?.nombre ?? (j.sublote_id ? String(j.sublote_id) : ''),
          nombre: j.nombre_trabajo || '',
          laborRealizada: j.descripcion || '',
        }))
      );
      setTrabajosAuxiliares(
        jornales.filter((j: any) => j.categoria === 'FINCA').map((j: any) => ({
          id: String(j.id),
          nombre: j.empleado
            ? `${j.empleado.primer_nombre ?? ''} ${j.empleado.primer_apellido ?? ''}`.trim()
            : '',
          labor: j.labor?.nombre || '',
          lugar: j.ubicacion || '',
          total: parseFloat(j.valor_total || '0'),
          horasExtra: 0,
          tipoJornada: 'FIJO' as const,
        }))
      );

      // Horas Extras como items detallados
      setHorasExtraItems(
        (p.horas_extra || p.horasExtra || []).map((h: any) => {
          const emp = h.empleado
            ? `${h.empleado.primer_nombre ?? ''} ${h.empleado.primer_apellido ?? ''}`.trim()
            : `Colab. ${h.empleado_id}`;
          return {
            id: String(h.id),
            colaborador: emp,
            tipoHora: h.tipoHoraExtra?.nombre ?? h.tipo_hora_extra?.nombre ?? '',
            numeroHoras: Number(h.cantidad_horas ?? 0),
            observacion: h.observacion ?? '',
            valor: parseFloat(h.valor_calculado ?? '0'),
          };
        })
      );

      // Ausencias como texto descriptivo
      const ausenciasTexto = (p.ausencias || [])
        .map((a: any) => {
          const emp = a.empleado
            ? `${a.empleado.primer_nombre ?? ''} ${a.empleado.primer_apellido ?? ''}`.trim()
            : '';
          const mot = a.motivo_ausencia?.nombre || a.motivo || '';
          return `${emp} — ${mot}`;
        })
        .join('\n');
      setAusentes(ausenciasTexto);

    } catch (err: any) {
      setErrorCarga(err?.message ?? 'Error al cargar la planilla');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargarPlanilla(); }, [cargarPlanilla]);

  // ────────────────────────────────────────────────────────────────────────────
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

  // Botón "Editar" → ir al wizard de edición que usa la misma UI que creación.
  const activarEdicion = () => {
    if (!id) return;
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
      setModoEdicion(false);
      await cargarPlanilla();
    } catch (err: any) {
      alert(err?.message ?? 'Error al guardar cambios');
    }
  };

  const aprobarPlanilla = async () => {
    if (!id) return;
    try {
      await operacionesApi.aprobar(Number(id));
      navigate('/operaciones');
    } catch (err: any) {
      alert(err?.message ?? 'Error al aprobar planilla');
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
                          {formatearFecha(fecha, { year: 'numeric', month: 'long', day: 'numeric' })}
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
                        <div className="text-sm font-medium py-2">{elaboradoPor || '—'}</div>
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
                                              {col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}
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
                                              <span>{col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}</span>
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
                                    {trabajo.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return (
                                        <Badge key={colId} variant="secondary">
                                          {col?.nombre_completo || (col ? `${col.nombres} ${col.apellidos}`.trim() : '') || `Colaborador ${colId}`}
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
                                  <div className="text-sm py-2">{trabajo.sublotes || '—'}</div>
                                )}
                              </div>
                              {/* Gajos y Kilos (read-only) */}
                              <div className="space-y-2">
                                <Label>Gajos recogidos</Label>
                                <div className="text-sm py-2 font-semibold">{trabajo.gajosRecogidos || 0}</div>
                              </div>
                              <div className="space-y-2">
                                <Label>Kilos confirmados</Label>
                                <div className="text-sm py-2 font-semibold">
                                  {trabajo.kilos > 0 ? `${trabajo.kilos.toLocaleString('es-CO')} kg` : '— (pendiente de pesaje)'}
                                </div>
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
                                          {col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}
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
                                          <span>{col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}</span>
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
                                {trabajo.colaboradores.map((colId) => {
                                  const col = colaboradores.find(c => c.id === colId);
                                  return col ? (
                                    <Badge key={colId} variant="secondary">
                                      {col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}
                                    </Badge>
                                  ) : null;
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
                                          {col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}
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
                                          <span>{col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}</span>
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
                                {trabajo.colaboradores.map((colId) => {
                                  const col = colaboradores.find(c => c.id === colId);
                                  return col ? (
                                    <Badge key={colId} variant="secondary">
                                      {col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}
                                    </Badge>
                                  ) : null;
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
                                          {col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}
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
                                          <span>{col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}</span>
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
                                {trabajo.colaboradores.map((colId) => {
                                  const col = colaboradores.find(c => c.id === colId);
                                  return col ? (
                                    <Badge key={colId} variant="secondary">
                                      {col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}
                                    </Badge>
                                  ) : null;
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
                                          {col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}
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
                                          <span>{col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}</span>
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
                                {trabajo.colaboradores.map((colId) => {
                                  const col = colaboradores.find(c => c.id === colId);
                                  return col ? (
                                    <Badge key={colId} variant="secondary">
                                      {col.nombre_completo || `${col.nombres} ${col.apellidos}`.trim() || `Colaborador ${col.id}`}
                                    </Badge>
                                  ) : null;
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

            {/* ETAPA 4: FINALIZACIÓN */}
            {etapaActual === 4 && (
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
                  Resumen de Planilla
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
                    Datos
                  </h4>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fecha</span>
                      <span className="font-semibold text-sm">
                        {formatearFecha(fecha, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cosecha</span>
                      <span className="font-semibold text-sm">
                        {totalColaboradoresCosecha} colab.
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Plateo</span>
                      <span className="font-semibold text-sm">
                        {totalPalmasPlateo} palmas
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Poda</span>
                      <span className="font-semibold text-sm">
                        {totalPalmasPoda} palmas
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fertilización</span>
                      <span className="font-semibold text-sm">
                        {totalPalmasFertilizacion} palmas
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auxiliares</span>
                      <span className="font-semibold text-sm text-success">
                        ${(totalAuxiliares / 1000).toFixed(0)}k
                      </span>
                    </div>
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