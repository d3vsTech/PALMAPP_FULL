import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowLeft, ArrowRight, Check, Truck, Leaf, Trash2, Edit, Save, X,
  CheckCircle, Clock, FileText, Sparkles, Image as ImageIcon, Upload, Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  viajesApi, strField,
  type Viaje, type EstadoViajeApi, type EstadoOcrDocumento,
} from '../../../api/viajes';
import { formatFecha, formatFechaHora, formatHora } from '../../utils/fecha';

// ─── tipos UI (3 estados compactos) ───────────────────────────────────────────
export type EstadoViaje = 'Creado' | 'En Validación' | 'Finalizado';

const ESTADO_API_TO_UI: Record<EstadoViajeApi, EstadoViaje> = {
  CREADO:        'Creado',
  EN_VALIDACION: 'En Validación',
  FINALIZADO:    'Finalizado',
};

const ETAPAS = [
  { numero: 1, nombre: 'Info. Viaje' },
  { numero: 2, nombre: 'Cosecha' },
  { numero: 3, nombre: 'Soporte Extractora' },
];

interface DatosExtractora {
  numeroRemision: string;
  fechaLlegada: string;
  horaLlegada: string;
  pesoRecibido: number;
  frutoVerde: number;
  sobreMaduro: number;
  podrido: number;
  pedunculoLargo: number;
  malFormado: number;
  observaciones: string;
}

export default function DetalleViaje() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [viaje, setViaje] = useState<any>(null);
  const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // Edición de datos del viaje
  const [modoEdicion, setModoEdicion] = useState(false);
  const [datosViaje, setDatosViaje] = useState({
    fecha: '', placaVehiculo: '', conductor: '',
    transportador: '', extractora: '', horaSalida: '',
  });

  // Validación con IA — flujo real OCR (API_VIAJES_OCR_BASCULA.md)
  const [imagenFormulario, setImagenFormulario] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [procesandoIA, setProcesandoIA] = useState(false);
  const [documentoOcrId, setDocumentoOcrId] = useState<number | null>(null);
  const [estadoOCR, setEstadoOCR] = useState<EstadoOcrDocumento | null>(null);
  const [confianzaOCR, setConfianzaOCR] = useState<number | null>(null);
  const [errorOCR, setErrorOCR] = useState<string | null>(null);
  const [datosExtractora, setDatosExtractora] = useState<DatosExtractora>({
    numeroRemision: '', fechaLlegada: '', horaLlegada: '',
    pesoRecibido: 0,
    frutoVerde: 0, sobreMaduro: 0, podrido: 0, pedunculoLargo: 0, malFormado: 0,
    observaciones: '',
  });

  // Alertas de cross-check del OCR (conductor/placa que llegó vs snapshot del viaje)
  const [validacionesCruzadas, setValidacionesCruzadas] = useState<{
    conductor: { extraido: string | null; esperado: string; coincide: boolean | null };
    placa: { extraido: string | null; esperado: string; coincide: boolean | null };
  } | null>(null);

  // ── carga
  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await viajesApi.ver(Number(id));
      setViaje(res.data);
    } catch { navigate('/viajes'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  // Estado UI derivado del viaje
  const estadoApi: EstadoViajeApi = (viaje?.estado as EstadoViajeApi) ?? 'CREADO';
  const estadoActual: EstadoViaje = ESTADO_API_TO_UI[estadoApi] ?? 'Creado';

  // Etapas disponibles según estado.
  // En "En Validación" la pantalla muestra solo el Formulario de Extractora,
  // sin stepper visible. Para los demás estados mostramos las etapas correspondientes.
  const etapasDisponibles = estadoActual === 'En Validación'
    ? [ETAPAS[2]]
    : estadoActual === 'Finalizado'
    ? ETAPAS
    : ETAPAS.filter(e => e.numero <= 2);

  // Etapa inicial: si "En Validación" → Soporte (3); si no → 1
  const [etapaActual, setEtapaActual] = useState(1);
  useEffect(() => {
    if (estadoActual === 'En Validación') setEtapaActual(3);
    else setEtapaActual(1);
  }, [estadoActual]);

  // Sincronizar form de edición cuando cambia el viaje
  useEffect(() => {
    if (!viaje) return;
    setDatosViaje({
      fecha:          String(viaje.fecha_viaje ?? ''),
      placaVehiculo:  String(viaje.placa_vehiculo ?? ''),
      conductor:      String(viaje.nombre_conductor ?? ''),
      transportador:  strField(viaje.empresa ?? viaje.empresa_transportadora),
      extractora:     strField(viaje.extractora),
      horaSalida:     String(viaje.hora_salida ?? '').slice(0, 5),
    });
  }, [viaje]);

  // ── handlers
  const habilitarEdicion = () => setModoEdicion(true);
  const cancelarEdicion  = () => {
    if (!viaje) return;
    setDatosViaje({
      fecha:         String(viaje.fecha_viaje ?? ''),
      placaVehiculo: String(viaje.placa_vehiculo ?? ''),
      conductor:     String(viaje.nombre_conductor ?? ''),
      transportador: strField(viaje.empresa ?? viaje.empresa_transportadora),
      extractora:    strField(viaje.extractora),
      horaSalida:    String(viaje.hora_salida ?? '').slice(0, 5),
    });
    setModoEdicion(false);
  };

  const guardarEdicion = async () => {
    if (!id) return;
    setProcesando(true);
    try {
      await viajesApi.editar(Number(id), {
        fecha_viaje: datosViaje.fecha,
        hora_salida: datosViaje.horaSalida,
      });
      toast.success('Viaje actualizado');
      setModoEdicion(false);
      await cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar cambios');
    } finally {
      setProcesando(false);
    }
  };

  const eliminarViaje = () => {
    if (!id) return;
    setConfirmEliminarOpen(true);
  };

  const confirmarEliminarViaje = async () => {
    if (!id) return;
    setConfirmEliminarOpen(false);
    try {
      await viajesApi.eliminar(Number(id));
      toast.success('Viaje eliminado');
      navigate('/viajes');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al eliminar el viaje');
    }
  };

  const handleImagenFormularioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset estado OCR si el usuario cambia la imagen
    setEstadoOCR(null);
    setConfianzaOCR(null);
    setErrorOCR(null);
    setDocumentoOcrId(null);
    setImagenFormulario(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagenPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  /**
   * Flujo OCR formulario de extractora (4 pasos) — API_VIAJES_OCR_BASCULA.md
   *  1. POST documento-bascula  → 202 + documento_id + poll_url
   *  2. Polling cada 2.5s al GET documento-bascula/{docId} hasta estado terminal (timeout 60s)
   *  3. Mapear datos_extraidos al form (sin sobrescribir campos ya editados)
   *  4. UI según estado: COMPLETADO / REVISION_MANUAL / FALLIDO
   */
  const transcribirConIA = async () => {
    if (!id || !imagenFormulario) return;
    setProcesandoIA(true);
    setEstadoOCR(null);
    setErrorOCR(null);
    setConfianzaOCR(null);

    try {
      // ── Paso 1: subir documento
      const upRes = await viajesApi.subirDocumentoBascula(Number(id), imagenFormulario);
      const docId = upRes.data.documento_id ?? upRes.data.id;
      if (!docId) throw new Error('No se recibió documento_id del servidor');
      setDocumentoOcrId(docId);
      setEstadoOCR(upRes.data.estado_ocr ?? 'PENDIENTE');

      // ── Paso 2: polling (cada 2.5s, timeout 60s)
      const inicio = Date.now();
      const TIMEOUT_MS = 60_000;
      const INTERVAL_MS = 2500;

      let final: any = null;
      while (Date.now() - inicio < TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, INTERVAL_MS));
        const polRes = await viajesApi.getDocumentoBasculaStatus(Number(id), docId);
        const d = polRes.data;
        setEstadoOCR(d.estado_ocr);
        if (d.estado_ocr === 'COMPLETADO' || d.estado_ocr === 'REVISION_MANUAL' || d.estado_ocr === 'FALLIDO') {
          final = d;
          break;
        }
      }

      if (!final) {
        toast.error('La transcripción tardó demasiado. Reintenta o digita los datos a mano.');
        return;
      }

      // ── Paso 3: mapear resultados (no sobrescribir campos ya editados)
      const conf = final.confianza != null ? Number(final.confianza) : null;
      setConfianzaOCR(conf);
      setErrorOCR(final.error_mensaje ?? null);

      const dx: Record<string, any> = final.datos_extraidos ?? {};
      // Debug visible en consola para diagnosticar campos faltantes
      console.log('[OCR] datos_extraidos:', dx);

      // Helpers: si el API devuelve algo válido lo usa; si no, conserva el valor previo.
      const pickStr = (apiVal: any, prev: string): string => {
        if (apiVal === undefined || apiVal === null) return prev;
        const s = String(apiVal).trim();
        return s.length > 0 ? s : prev;
      };
      const pickNum = (apiVal: any, prev: number): number => {
        if (apiVal === undefined || apiVal === null || apiVal === '') return prev;
        const n = typeof apiVal === 'number' ? apiVal : parseFloat(String(apiVal).replace(/[^\d.,-]/g, '').replace(',', '.'));
        return Number.isFinite(n) ? n : prev;
      };
      // Lee valor desde múltiples keys posibles (defensivo si el backend cambia naming)
      const firstDef = (...keys: string[]): any => {
        for (const k of keys) {
          if (dx[k] !== undefined && dx[k] !== null && dx[k] !== '') return dx[k];
        }
        return undefined;
      };

      setDatosExtractora((prev) => ({
        numeroRemision:  pickStr(firstDef(
          'numero_remision_extractora', 'numero_remision', 'remision_extractora',
          'nro_remision',
        ), prev.numeroRemision),
        fechaLlegada:    pickStr(firstDef('fecha_llegada', 'fecha'), prev.fechaLlegada),
        horaLlegada:     pickStr(firstDef('hora_llegada', 'hora'), prev.horaLlegada),
        pesoRecibido:    pickNum(firstDef('peso_viaje', 'peso_recibido', 'peso_neto', 'peso'), prev.pesoRecibido),
        frutoVerde:      pickNum(firstDef('fruto_verde', 'verdes', 'calificacion_verdes'), prev.frutoVerde),
        sobreMaduro:     pickNum(firstDef('sobre_maduro', 'sobremaduro', 'calificacion_sobremaduro'), prev.sobreMaduro),
        podrido:         pickNum(firstDef('podrido', 'calificacion_podrido'), prev.podrido),
        pedunculoLargo:  pickNum(firstDef('pedunculo_largo', 'calificacion_pedunculo_largo'), prev.pedunculoLargo),
        malFormado:      pickNum(firstDef('mal_formado', 'malformado', 'calificacion_mal_formado'), prev.malFormado),
        observaciones:   pickStr(firstDef('observaciones_extractora', 'observaciones'), prev.observaciones),
      }));

      // Cross-check: el GET del OCR devuelve `validaciones_cruzadas` cuando está
      // en estado terminal con datos. Solo guardamos para mostrar la alerta.
      if (final.validaciones_cruzadas) {
        setValidacionesCruzadas(final.validaciones_cruzadas);
      } else {
        setValidacionesCruzadas(null);
      }

      // ── Paso 4: UI feedback según estado terminal
      if (final.estado_ocr === 'COMPLETADO') {
        toast.success(
          conf != null
            ? `Datos extraídos con confianza ${(conf * 100).toFixed(0)}%`
            : 'Datos extraídos correctamente'
        );
      } else if (final.estado_ocr === 'REVISION_MANUAL') {
        toast.warning('Algunos datos requieren revisión manual', {
          description: final.error_mensaje ?? 'Verifica los campos marcados.',
        });
      } else if (final.estado_ocr === 'FALLIDO') {
        toast.error('No pudimos procesar el documento', {
          description: final.error_mensaje ?? 'Sube otra foto o digita a mano.',
        });
      }
    } catch (e: any) {
      const status = e?.status;
      const code = e?.code;
      if (status === 503 || code === 'ANTHROPIC_SIN_CONFIGURAR') {
        toast.error('OCR no disponible, contacte al admin');
      } else if (status === 409 || code === 'VIAJE_ESTADO_INVALIDO') {
        toast.error('Este viaje no acepta OCR en su estado actual');
      } else if (status === 422) {
        toast.error(e?.message ?? 'Archivo inválido (revisa formato/tamaño)');
      } else {
        toast.error(e?.message ?? 'Error al transcribir el documento');
      }
    } finally {
      setProcesandoIA(false);
    }
  };

  /**
   * Botón "Finalizar y guardar" — paso 4 del flujo OCR.
   *  4a. PATCH /viajes/{id}/validar  — hidrata los 10 campos editables (todos opcionales)
   *  4b. POST  /viajes/{id}/finalizar — cierra el viaje + dispara cálculos backend
   */
  const guardarValidacion = async () => {
    if (!id) return;
    setProcesando(true);
    try {
      // 4a — hidratar (solo manda los campos que el operador llenó; nullable lo demás)
      await viajesApi.validar(Number(id), {
        peso_viaje: datosExtractora.pesoRecibido || null,
        numero_remision_extractora: datosExtractora.numeroRemision || null,
        fecha_llegada: datosExtractora.fechaLlegada || null,
        hora_llegada: datosExtractora.horaLlegada || null,
        fruto_verde: datosExtractora.frutoVerde || null,
        sobre_maduro: datosExtractora.sobreMaduro || null,
        podrido: datosExtractora.podrido || null,
        pedunculo_largo: datosExtractora.pedunculoLargo || null,
        mal_formado: datosExtractora.malFormado || null,
        observaciones_extractora: datosExtractora.observaciones || null,
      });

      // 4b — finalizar (EN_VALIDACION → FINALIZADO)
      try {
        await viajesApi.finalizar(Number(id));
        toast.success('Viaje finalizado');
        navigate('/viajes');
      } catch (e2: any) {
        const msg = String(e2?.message ?? '');
        if (msg.includes('VIAJE_INCOMPLETO') || msg.toLowerCase().includes('incompleto')) {
          toast.error('Falta capturar el peso o el conteo de gajos antes de cerrar');
        } else {
          toast.error(e2?.message ?? 'Error al finalizar el viaje');
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar la validación');
    } finally {
      setProcesando(false);
    }
  };

  // Navegación de etapas
  const siguienteEtapa = () => {
    if (etapaActual < etapasDisponibles[etapasDisponibles.length - 1].numero) {
      const nextEtapa = etapasDisponibles.find(e => e.numero > etapaActual);
      if (nextEtapa) setEtapaActual(nextEtapa.numero);
    }
  };
  const etapaAnterior = () => {
    if (etapaActual > 1) {
      const prev = etapasDisponibles.filter(e => e.numero < etapaActual).pop();
      if (prev) setEtapaActual(prev.numero);
    }
  };
  const irAEtapa = (numero: number) => {
    if (etapasDisponibles.some(e => e.numero === numero)) setEtapaActual(numero);
  };

  // Render
  if (loading) {
    return (
      <div className="container mx-auto py-16 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando viaje...
      </div>
    );
  }
  if (!viaje) return null;

  const remisionId  = String(viaje.remision ?? viaje.id ?? '');
  // type="date" necesita YYYY-MM-DD. Si llega ISO completo, recortamos.
  const fechaViaje  = String(viaje.fecha_viaje ?? '').slice(0, 10);
  const placa       = String(viaje.placa_vehiculo ?? '');
  const conductor   = String(viaje.nombre_conductor ?? '');
  const transporte  = strField(viaje.empresa ?? viaje.empresa_transportadora);
  const extractora  = strField(viaje.extractora);
  // type="time" necesita HH:MM. La hora puede venir como ISO completo o "HH:MM:SS".
  const horaSalidaRaw = String(viaje.hora_salida ?? '');
  const horaSalida = horaSalidaRaw.includes('T')
    ? horaSalidaRaw.slice(11, 16)
    : horaSalidaRaw.slice(0, 5);
  const fechaCreado = viaje.created_at ?? null;
  // En el modelo nuevo, `validacion_at` es la fecha exacta de transición a EN_VALIDACION.
  // Mantenemos fallbacks a campos legacy por si el backend aún devuelve los antiguos.
  const fechaValidacion = viaje.validacion_at ?? viaje.fecha_despachado ?? viaje.fecha_en_camino ?? null;
  const fechaFinalizado = viaje.finalizado_at ?? viaje.fecha_finalizado ?? null;

  const detalles = (viaje.detalles ?? []) as any[];

  // Pasos del Timeline
  const timelineSteps = [
    { estado: 'Creado',         label: 'Creado',         icon: FileText,   fecha: fechaCreado,     completado: estadoActual !== 'Creado' },
    { estado: 'En Validación',  label: 'En Validación',  icon: Clock,      fecha: fechaValidacion, completado: estadoActual === 'Finalizado' },
    { estado: 'Finalizado',     label: 'Finalizado',     icon: CheckCircle, fecha: fechaFinalizado, completado: estadoActual === 'Finalizado' },
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/viajes')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Viajes
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-primary">Detalle del Viaje - {remisionId}</h1>
          <Badge variant="outline" className={
            estadoActual === 'Creado' ? 'bg-muted text-muted-foreground border-muted' :
            estadoActual === 'En Validación' ? 'bg-primary/10 text-primary dark:text-primary border-blue-500/30' :
            'bg-success/10 text-success border-success/30'
          }>
            {estadoActual}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">Visualiza y gestiona la información del viaje</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: Wizard (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stepper — oculto cuando el viaje está en validación (solo se muestra el formulario) */}
          {estadoActual !== 'En Validación' && (
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {etapasDisponibles.map((etapa, index) => {
                  const estaCompleta = etapaActual > etapa.numero;
                  const estaActiva = etapaActual === etapa.numero;
                  return (
                    <React.Fragment key={etapa.numero}>
                      <button
                        onClick={() => irAEtapa(etapa.numero)}
                        className={`flex flex-col items-center gap-2 ${estaActiva || estaCompleta ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                        disabled={!estaActiva && !estaCompleta}
                      >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                          estaCompleta ? 'bg-primary border-primary text-white'
                          : estaActiva ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted border-border text-muted-foreground'
                        }`}>
                          {estaCompleta ? <Check className="h-5 w-5" /> : <span className="font-bold">{etapa.numero}</span>}
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-semibold whitespace-nowrap ${estaActiva || estaCompleta ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {etapa.nombre}
                          </div>
                        </div>
                      </button>
                      {index < etapasDisponibles.length - 1 && (
                        <div className="flex-1 h-0.5 bg-border relative mx-4">
                          <div className={`absolute inset-0 bg-primary transition-all ${estaCompleta ? 'w-full' : 'w-0'}`} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Contenido de etapas */}
          <div className="space-y-6">
            {/* ETAPA 1: INFO VIAJE */}
            {etapaActual === 1 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Información del Viaje</CardTitle>
                      <p className="text-sm text-muted-foreground">Datos del viaje registrado</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fecha del Viaje</Label>
                      <Input type="date"
                        value={modoEdicion ? datosViaje.fecha : fechaViaje}
                        disabled={!modoEdicion}
                        onChange={(e) => setDatosViaje({ ...datosViaje, fecha: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Placa del Vehículo</Label>
                      <Input value={modoEdicion ? datosViaje.placaVehiculo : placa} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Conductor</Label>
                      <Input value={modoEdicion ? datosViaje.conductor : conductor} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Transportador</Label>
                      <Input value={modoEdicion ? datosViaje.transportador : transporte} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Extractora Destino</Label>
                      <Input value={modoEdicion ? datosViaje.extractora : extractora} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora de Salida</Label>
                      <Input type="time"
                        value={modoEdicion ? datosViaje.horaSalida : horaSalida}
                        disabled={!modoEdicion}
                        onChange={(e) => setDatosViaje({ ...datosViaje, horaSalida: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 2: COSECHA */}
            {etapaActual === 2 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Leaf className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Cosecha</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {estadoActual === 'Finalizado' ? 'Información de cosecha registrada' : 'Cosechas asociadas al viaje'}
                        </p>
                      </div>
                    </div>
                    {estadoActual === 'Creado' && (
                      <Button onClick={() => navigate(`/viajes/${id}/conteo`)} className="gap-2">
                        <Edit className="h-4 w-4" />
                        Ir a Conteo
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {detalles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Leaf className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay cosechas registradas</p>
                      {estadoActual === 'Creado' && (
                        <p className="text-sm">Haz clic en "Ir a Conteo" para agregar cosechas</p>
                      )}
                    </div>
                  ) : (
                    detalles.map((d) => (
                      <Card key={d.id} className="border-border">
                        <CardContent className="pt-6">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Lote</Label>
                              <Input value={d.cosecha?.lote?.nombre ?? '—'} disabled />
                            </div>
                            <div className="space-y-2">
                              <Label>Sublote</Label>
                              <Input value={d.cosecha?.sublote?.nombre ?? '—'} disabled />
                            </div>
                            <div className="space-y-2">
                              <Label>Número de Gajos</Label>
                              <Input value={d.cosecha?.gajos_reportados ?? 0} disabled />
                            </div>
                            <div className="space-y-2">
                              <Label>Reconteo de Gajos</Label>
                              <Input value={d.cosecha?.gajos_reconteo ?? '—'} disabled />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Peso (kg)</Label>
                              <Input value={d.cosecha?.peso_confirmado ?? '—'} disabled />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* ETAPA 3: VALIDACIÓN CON IA */}
            {etapaActual === 3 && (
              <div className="space-y-6">
                {/* Carga de imagen */}
                <Card className="border-border">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Formulario de Extractora</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {estadoActual === 'Finalizado'
                            ? 'Documento validado de la extractora'
                            : 'Carga el formulario enviado por la extractora para validación automática'}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {estadoActual !== 'Finalizado' && (
                      <>
                        <div className="space-y-2">
                          <Label>Imagen del Formulario</Label>
                          <div className="flex flex-col gap-3">
                            <Input type="file"
                              onChange={handleImagenFormularioChange}
                              accept="image/*,.pdf"
                              className="cursor-pointer"
                            />
                            <p className="text-xs text-muted-foreground">Formatos permitidos: JPG, PNG, PDF</p>
                          </div>
                        </div>

                        {imagenPreview && (
                          <div className="space-y-3">
                            <div className="relative border-2 border-border rounded-lg overflow-hidden bg-muted/20">
                              <img src={imagenPreview} alt="Preview del formulario" className="w-full h-auto max-h-[400px] object-contain" />
                              <Button variant="ghost" size="sm"
                                onClick={() => { setImagenFormulario(null); setImagenPreview(null); }}
                                className="absolute top-2 right-2 bg-background/80 hover:bg-background text-destructive hover:text-destructive">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button onClick={transcribirConIA} disabled={procesandoIA}
                              className="w-full gap-2 bg-primary hover:bg-primary/90" size="lg">
                              {procesandoIA ? (
                                <><Loader2 className="h-5 w-5 animate-spin" />Procesando con IA...</>
                              ) : (
                                <><Sparkles className="h-5 w-5" />Transcribir con IA</>
                              )}
                            </Button>
                          </div>
                        )}

                        {!imagenPreview && (
                          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                            <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">Carga una imagen del formulario</p>
                            <p className="text-sm text-muted-foreground">La IA extraerá automáticamente los datos</p>
                          </div>
                        )}
                      </>
                    )}
                    {estadoActual === 'Finalizado' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 p-4 bg-success/10 border border-success/20 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-success" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-success">Formulario validado exitosamente</p>
                            <p className="text-xs text-muted-foreground">Datos extraídos y verificados</p>
                          </div>
                        </div>

                        {validacionesCruzadas && (
                          validacionesCruzadas.conductor.coincide === false ||
                          validacionesCruzadas.placa.coincide === false
                        ) && (
                          <div className="flex items-start gap-3 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900">
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-semibold">El camión que llegó no coincide con el planeado</p>
                              <ul className="mt-1 space-y-0.5">
                                {validacionesCruzadas.conductor.coincide === false && (
                                  <li>
                                    Conductor: <strong>{validacionesCruzadas.conductor.extraido ?? '—'}</strong>
                                    {' '}vs planeado <strong>{validacionesCruzadas.conductor.esperado}</strong>
                                  </li>
                                )}
                                {validacionesCruzadas.placa.coincide === false && (
                                  <li>
                                    Placa: <strong>{validacionesCruzadas.placa.extraido ?? '—'}</strong>
                                    {' '}vs planeada <strong>{validacionesCruzadas.placa.esperado}</strong>
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Número de Remisión</Label>
                            <Input value={String(viaje?.numero_remision_extractora ?? '')} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Fecha de Llegada</Label>
                            <Input value={formatFecha(viaje?.fecha_llegada)} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Hora de Llegada</Label>
                            <Input value={formatHora(viaje?.hora_llegada)} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Peso Recibido (kg)</Label>
                            <Input value={String(viaje?.peso_viaje ?? '')} disabled />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-sm font-semibold">Calificación de fruto (%)</Label>
                          </div>
                          <div className="space-y-2">
                            <Label>Fruto verde</Label>
                            <Input value={String(viaje?.fruto_verde ?? 0)} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Sobre maduro</Label>
                            <Input value={String(viaje?.sobre_maduro ?? 0)} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Podrido</Label>
                            <Input value={String(viaje?.podrido ?? 0)} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Pedúnculo largo</Label>
                            <Input value={String(viaje?.pedunculo_largo ?? 0)} disabled />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Mal formado</Label>
                            <Input value={String(viaje?.mal_formado ?? 0)} disabled />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Observaciones</Label>
                            <Input value={String(viaje?.observaciones_extractora ?? '')} disabled />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Banner de estado OCR (REVISION_MANUAL / FALLIDO / confianza) */}
                {estadoOCR === 'REVISION_MANUAL' && (
                  <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <Sparkles className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-yellow-700 dark:text-yellow-300">
                        Revisa estos datos cuidadosamente
                      </p>
                      <p className="text-yellow-700/80 dark:text-yellow-300/80">
                        {errorOCR ?? 'Algunos campos tienen baja confianza o faltan. Verifica antes de guardar.'}
                        {confianzaOCR != null && ` (Confianza: ${(confianzaOCR * 100).toFixed(0)}%)`}
                      </p>
                    </div>
                  </div>
                )}
                {estadoOCR === 'FALLIDO' && (
                  <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <X className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-destructive">No pudimos procesar el documento</p>
                      <p className="text-destructive/80">
                        {errorOCR ?? 'Sube otra foto o digita los datos a mano.'}
                      </p>
                    </div>
                  </div>
                )}
                {estadoOCR === 'COMPLETADO' && confianzaOCR != null && (
                  <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-success">
                      Datos extraídos con confianza {(confianzaOCR * 100).toFixed(0)}%. Revisa y guarda.
                    </span>
                  </div>
                )}

                {/* Datos extraídos — solo visible después de subir el archivo */}
                {imagenFormulario && (
                  <Card className="border-border">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-success" />
                        </div>
                        <div>
                          <CardTitle>Datos de la Extractora</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {procesandoIA ? 'Transcribiendo formulario… esto toma 5-15 segundos' : 'Verifica y edita los datos extraídos'}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {validacionesCruzadas && (
                        validacionesCruzadas.conductor.coincide === false ||
                        validacionesCruzadas.placa.coincide === false
                      ) && (
                        <div className="flex items-start gap-3 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900">
                          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-semibold">El camión que llegó no coincide con el planeado</p>
                            <ul className="mt-1 space-y-0.5">
                              {validacionesCruzadas.conductor.coincide === false && (
                                <li>
                                  Conductor: <strong>{validacionesCruzadas.conductor.extraido ?? '—'}</strong>
                                  {' '}vs planeado <strong>{validacionesCruzadas.conductor.esperado}</strong>
                                </li>
                              )}
                              {validacionesCruzadas.placa.coincide === false && (
                                <li>
                                  Placa: <strong>{validacionesCruzadas.placa.extraido ?? '—'}</strong>
                                  {' '}vs planeada <strong>{validacionesCruzadas.placa.esperado}</strong>
                                </li>
                              )}
                            </ul>
                            <p className="mt-1 text-xs">Verifica antes de guardar. Puedes continuar si la diferencia es esperada.</p>
                          </div>
                        </div>
                      )}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Número de Remisión</Label>
                          <Input value={datosExtractora.numeroRemision}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, numeroRemision: e.target.value })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Fecha de Llegada</Label>
                          <Input type="date" value={datosExtractora.fechaLlegada}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, fechaLlegada: e.target.value })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Hora de Llegada</Label>
                          <Input type="time" value={datosExtractora.horaLlegada}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, horaLlegada: e.target.value })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Peso Recibido (kg)</Label>
                          <Input type="number" value={datosExtractora.pesoRecibido}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, pesoRecibido: parseFloat(e.target.value) || 0 })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-sm font-semibold">Calificación de fruto (%)</Label>
                          <p className="text-xs text-muted-foreground">
                            Porcentajes 0–100 según la remisión de la extractora.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Fruto verde</Label>
                          <Input type="number" step="0.01" max={100} value={datosExtractora.frutoVerde}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, frutoVerde: parseFloat(e.target.value) || 0 })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Sobre maduro</Label>
                          <Input type="number" step="0.01" max={100} value={datosExtractora.sobreMaduro}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, sobreMaduro: parseFloat(e.target.value) || 0 })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Podrido</Label>
                          <Input type="number" step="0.01" max={100} value={datosExtractora.podrido}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, podrido: parseFloat(e.target.value) || 0 })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2">
                          <Label>Pedúnculo largo</Label>
                          <Input type="number" step="0.01" max={100} value={datosExtractora.pedunculoLargo}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, pedunculoLargo: parseFloat(e.target.value) || 0 })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Mal formado</Label>
                          <Input type="number" step="0.01" max={100} value={datosExtractora.malFormado}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, malFormado: parseFloat(e.target.value) || 0 })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Observaciones</Label>
                          <Input value={datosExtractora.observaciones}
                            onChange={(e) => setDatosExtractora({ ...datosExtractora, observaciones: e.target.value })}
                            disabled={procesandoIA || estadoActual === 'Finalizado'}
                            placeholder="Observaciones adicionales..." />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Botones de navegación */}
            <div className="flex items-center justify-between pt-4">
              {estadoActual === 'Finalizado' && (
                <Button variant="outline" onClick={etapaAnterior} disabled={etapaActual === 1} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>
              )}
              {estadoActual === 'En Validación' && (
                <Button variant="outline" onClick={() => navigate('/viajes')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Volver a Viajes
                </Button>
              )}

              <div className="flex gap-2 ml-auto">
                {estadoActual === 'Creado' ? (
                  modoEdicion ? (
                    <>
                      <Button variant="outline" onClick={cancelarEdicion} disabled={procesando} className="gap-2">
                        <X className="h-4 w-4" /> Cancelar
                      </Button>
                      <Button onClick={guardarEdicion} disabled={procesando} className="gap-2 bg-success hover:bg-success/90">
                        <Save className="h-4 w-4" /> {procesando ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </>
                  ) : (
                    <>
                      {etapaActual === 1 && (
                        <>
                          <Button variant="outline" onClick={eliminarViaje} className="gap-2 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </Button>
                          <Button onClick={habilitarEdicion} className="gap-2">
                            <Edit className="h-4 w-4" /> Editar
                          </Button>
                          <Button onClick={siguienteEtapa} className="gap-2">
                            Siguiente <ArrowRight className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {etapaActual === 2 && (
                        <Button variant="outline" onClick={etapaAnterior} className="gap-2">
                          <ArrowLeft className="h-4 w-4" /> Anterior
                        </Button>
                      )}
                    </>
                  )
                ) : estadoActual === 'Finalizado' && etapaActual < 3 ? (
                  <Button onClick={siguienteEtapa} className="gap-2">
                    Siguiente <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : estadoActual === 'En Validación' && etapaActual === 3 ? (
                  <Button onClick={guardarValidacion} disabled={!imagenFormulario || procesandoIA || procesando}
                    className="gap-2 bg-success hover:bg-success/90">
                    <Check className="h-4 w-4" />
                    {procesando ? 'Procesando...' : 'Guardar y Finalizar'}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Timeline (1/3) - sticky */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-primary" />
                  Timeline del Viaje
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Progreso */}
                {estadoActual !== 'Finalizado' && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-semibold">
                          {etapasDisponibles.findIndex(e => e.numero === etapaActual) + 1} de {etapasDisponibles.length}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${((etapasDisponibles.findIndex(e => e.numero === etapaActual) + 1) / etapasDisponibles.length) * 100}%` }} />
                      </div>
                    </div>
                    <div className="h-px bg-border" />
                  </>
                )}

                <div className="relative space-y-6">
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
                  {timelineSteps.map((step) => {
                    const Icon = step.icon;
                    const isActive = step.estado === estadoActual;
                    const isCompleted = step.completado;
                    return (
                      <div key={step.estado} className="relative flex gap-3">
                        <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                          isCompleted ? 'bg-success border-success/20' : 'bg-muted border-border'
                        } ${isActive ? 'ring-2 ring-primary/30' : ''}`}>
                          {isCompleted ? <CheckCircle className="h-4 w-4 text-white" /> : <Icon className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 pb-2">
                          <h4 className={`text-sm font-semibold ${
                            isCompleted ? 'text-success' : isActive ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {step.label}
                          </h4>
                          {step.fecha && (
                            <p className="text-xs text-muted-foreground">
                              {formatFechaHora(step.fecha, {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          )}
                          {!step.fecha && !isCompleted && (
                            <p className="text-xs text-muted-foreground">Pendiente</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AlertDialog: confirmar eliminar viaje */}
      <AlertDialog open={confirmEliminarOpen} onOpenChange={setConfirmEliminarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará permanentemente este viaje. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminarViaje} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}