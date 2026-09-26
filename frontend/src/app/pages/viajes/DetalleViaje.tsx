import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
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
  ArrowLeft, ArrowRight, Check, Truck, Leaf, Trash2, Edit, X,
  CheckCircle, Clock, FileText, Sparkles, Image as ImageIcon, Upload, Loader2,
  AlertTriangle, Download, Settings, Calendar, MapPin, User, Package, Weight, Save,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';
import {
  viajesApi, strField, empresasTransportadorasApi, extractorasApi, ViajesErrorCodes,
  type Viaje, type EstadoViajeApi, type EstadoOcrDocumento,
  type TransportadorSelect, type ExtractoraSelect,
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
  // La pantalla abre en el resumen del viaje (tarjetas de solo lectura +
  // acciones). "Gestionar Viaje" cambia al wizard de etapas.
  /**
   * La vista vive en la URL y no en un estado local, para que el botón
   * "atrás" del navegador funcione entre modos en vez de sacarte de la
   * pantalla. Tres modos:
   *
   *  - sin `?vista`        → Detalle del Viaje (solo lectura, 2/3 + sidebar).
   *  - `?vista=editar`     → Editar Viaje (formulario a ancho completo).
   *  - `?vista=gestion`    → Carga Remisión (wizard del soporte de extractora).
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const vista = searchParams.get('vista');
  const vistaResumen = vista !== 'gestion';
  const modoGestion = vista === 'editar';
  const irAVista = useCallback(
    (destino: null | 'editar' | 'gestion', opts?: { replace?: boolean }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (destino) next.set('vista', destino);
          else next.delete('vista');
          return next;
        },
        { replace: opts?.replace ?? false },
      );
    },
    [setSearchParams],
  );
  const primeraCarga = useRef(true);
  const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false);

  // Edición en línea de la etapa 1 (solo en estado CREADO).
  // Placa y conductor son snapshot del transportador: se rellenan solos al
  // cambiar el transportador, igual que en el formulario de creación.
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [generandoEnlace, setGenerandoEnlace] = useState(false);
  const [datosViaje, setDatosViaje] = useState({
    fecha: '', horaSalida: '', transportadorId: '', extractoraId: '',
    placaVehiculo: '', conductor: '',
  });
  const [transportadores, setTransportadores] = useState<
    Array<TransportadorSelect & { empresaRazonSocial: string }>
  >([]);
  const [extractoras, setExtractoras] = useState<ExtractoraSelect[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);


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
      // Un viaje EN_VALIDACION está esperando el formulario de la extractora:
      // abrir en el resumen obligaba a pasar por "Gestionar Viaje" para llegar
      // a la carga del soporte. En ese estado entramos directo al wizard.
      // Solo en la primera carga, para no anular el toggle del usuario.
      if (primeraCarga.current) {
        primeraCarga.current = false;
        // `replace` para no dejar una entrada extra en el historial: el
        // "atrás" desde aquí debe llevar a la lista de viajes.
        if (res.data.estado === 'EN_VALIDACION') irAVista('gestion', { replace: true });
      }
    } catch { navigate('/viajes'); }
    finally { setLoading(false); }
  }, [id, navigate, irAVista]);

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

  // ── handlers
  /**
   * Editar abre el formulario completo de `/viajes/editar/:id`, el mismo que
   * crea el viaje. Antes esta pantalla tenía su propio modo edición en
   * línea, pero solo servía para la fecha y la hora: transportador y
   * extractora viajan por id y aquí no había de dónde sacarlos, así que los
   * cuatro campos restantes se veían editables y no aceptaban nada.
   */
  /**
   * Hidrata el formulario con el viaje cargado y trae los selects. Se llama
   * tanto al pulsar "Gestionar Viaje" como al entrar directo por URL con
   * `?vista=editar` desde el botón Editar de la lista.
   *
   * Los selects se piden solo aquí, no en cada visita de solo lectura.
   */
  const prepararEdicion = useCallback(async () => {
    const v: any = viaje ?? {};
    const horaRaw = String(v.hora_salida ?? '');
    setDatosViaje({
      fecha: String(v.fecha_viaje ?? '').slice(0, 10),
      horaSalida: horaRaw.includes('T') ? horaRaw.slice(11, 16) : horaRaw.slice(0, 5),
      transportadorId: String(v.transportador?.id ?? v.transportador_id ?? ''),
      extractoraId: String(v.extractora?.id ?? v.extractora_id ?? ''),
      placaVehiculo: String(v.placa_vehiculo ?? ''),
      conductor: String(v.nombre_conductor ?? ''),
    });
    try {
      const [empR, extR] = await Promise.all([
        empresasTransportadorasApi.select(),
        extractorasApi.select(),
      ]);
      const emps = empR.data ?? [];
      setExtractoras(extR.data ?? []);
      const transResults = await Promise.all(
        emps.map((e) =>
          empresasTransportadorasApi
            .transportadoresDe(Number(e.id))
            .then((r) => (r.data ?? []).map((t) => ({ ...t, empresaRazonSocial: e.razon_social })))
            .catch(() => [] as Array<TransportadorSelect & { empresaRazonSocial: string }>)
        )
      );
      setTransportadores(transResults.flat());
    } catch {
      toast.error('No se pudieron cargar transportadores y extractoras');
    }
  }, [viaje]);

  const habilitarEdicion = () => {
    void prepararEdicion();
    irAVista('editar');
  };

  // Entrada directa por URL (`/viajes/:id?vista=editar`): sin esto el
  // formulario saldría vacío y los dropdowns sin opciones.
  const edicionPreparada = useRef(false);
  useEffect(() => {
    if (!modoGestion) { edicionPreparada.current = false; return; }
    if (!viaje || edicionPreparada.current) return;
    edicionPreparada.current = true;
    void prepararEdicion();
  }, [modoGestion, viaje, prepararEdicion]);

  const cancelarEdicion = () => irAVista(null);

  const cambiarTransportador = (transportadorId: string) => {
    const t = transportadores.find((x) => String(x.id) === transportadorId);
    setDatosViaje((prev) => ({
      ...prev,
      transportadorId,
      conductor: t ? `${t.nombres ?? ''} ${t.apellidos ?? ''}`.trim() : prev.conductor,
      placaVehiculo: t?.placa_vehiculo ?? prev.placaVehiculo,
    }));
  };

  const guardarEdicion = async () => {
    if (!id) return;
    if (!datosViaje.fecha || !datosViaje.horaSalida || !datosViaje.transportadorId || !datosViaje.extractoraId) {
      toast.error('Completa fecha, hora, transportador y extractora');
      return;
    }
    setGuardandoEdicion(true);
    try {
      await viajesApi.editar(Number(id), {
        fecha_viaje: datosViaje.fecha,
        hora_salida: datosViaje.horaSalida,
        transportador_id: Number(datosViaje.transportadorId),
        extractora_id: Number(datosViaje.extractoraId),
        observaciones: null,
      });
      toast.success('Viaje actualizado');
      irAVista(null);
      await cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar los cambios');
    } finally {
      setGuardandoEdicion(false);
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
        } else if (e2?.code === 'FECHA_VIAJE_ANTERIOR_A_COSECHA' || msg.includes('FECHA_VIAJE_ANTERIOR_A_COSECHA')) {
          // §6.5 — el viaje figura saliendo antes de que se cortara la fruta
          // que transporta. El message del backend trae las fechas exactas.
          toast.error(e2?.message ?? 'La fecha del viaje es anterior a la de una cosecha que transporta. Corrige la fecha antes de finalizar.', { duration: 8000 });
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

  // §14.1 — el `show` devuelve los documentos de báscula cargados. El hito
  // "Soporte Extractora" se cumple cuando ya subieron al menos uno, sin
  // esperar a que el viaje cierre; la fecha es la del primero.
  const documentosBascula = (viaje.documentos_bascula ?? []) as Array<{ created_at: string }>;
  const fechaSoporte = documentosBascula.length > 0
    ? documentosBascula
        .map((d) => d.created_at)
        .filter(Boolean)
        .sort()[0] ?? null
    : null;
  const tieneSoporte = documentosBascula.length > 0 || estadoActual === 'Finalizado';

  // Pasos del Timeline
  const timelineSteps = [
    { estado: 'Creado',        label: 'Info. Viaje',        icon: FileText,    fecha: fechaCreado,                                                          completado: ['Creado', 'En Validación', 'Finalizado'].includes(estadoActual) },
    { estado: 'En Validación', label: 'Cosecha',            icon: Clock,       fecha: ['En Validación', 'Finalizado'].includes(estadoActual) ? fechaValidacion : null, completado: ['En Validación', 'Finalizado'].includes(estadoActual) },
    { estado: 'Finalizado',    label: 'Soporte Extractora', icon: CheckCircle, fecha: tieneSoporte ? (fechaSoporte ?? fechaFinalizado) : null,              completado: tieneSoporte },
  ];

  const badgeClass =
    estadoActual === 'Creado'        ? 'bg-muted text-muted-foreground border-muted' :
    estadoActual === 'En Validación' ? 'bg-primary/10 text-primary dark:text-primary border-blue-500/30' :
    'bg-success/10 text-success border-success/30';

  // ── Filas y totales de cosecha para el resumen y el PDF ────────────────────
  // `gajos_en_viaje` es el split de la cosecha en ESTE viaje (§5.5). Cuando
  // viene null el viaje se lleva todo lo disponible de esa cosecha.
  const filasCosecha = detalles.map((d) => ({
    id: d.id,
    lote: d.cosecha?.lote?.nombre ?? '—',
    sublote: d.cosecha?.sublote?.nombre ?? '—',
    gajos: Number(d.gajos_en_viaje ?? d.cosecha?.gajos_reconteo ?? d.cosecha?.gajos_reportados ?? 0),
    pesoKg: Number(d.cosecha?.peso_confirmado ?? 0),
  }));
  const totalGajos = filasCosecha.reduce((s, f) => s + f.gajos, 0);
  const totalKg    = filasCosecha.reduce((s, f) => s + f.pesoKg, 0);
  const lotesSummary = [...new Set(filasCosecha.map((f) => f.lote))];

  // Peso definitivo: el reportado por la extractora cuando ya existe; si no,
  // el estimado de las cosechas.
  const pesoExtractora = viaje.peso_viaje != null ? Number(viaje.peso_viaje) : 0;
  const numFmt = (n: number, dec = 0) =>
    n.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  // ── Desprendible (lo genera el backend, con el membrete de la finca) ───────
  //
  // Solo se emite en FINALIZADO (D4). En los otros estados el backend
  // responde 409 VIAJE_ESTADO_INVALIDO, por eso los botones se ocultan.
  const puedeDesprendible = estadoActual === 'Finalizado';

  const descargarDesprendible = async () => {
    if (!id) return;
    setDescargandoPdf(true);
    try {
      const blob = await viajesApi.desprendiblePdf(Number(id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `remision_${remisionId}_${fechaViaje}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Desprendible descargado');
    } catch (e: any) {
      if (e?.code === ViajesErrorCodes.VIAJE_ESTADO_INVALIDO) {
        toast.error('La remisión solo se puede emitir con el viaje finalizado');
      } else {
        toast.error(e?.message ?? 'No se pudo generar el desprendible');
      }
    } finally {
      setDescargandoPdf(false);
    }
  };

  /**
   * El backend devuelve solo la URL firmada (7 días) a la ruta pública del
   * PDF; el mensaje lo arma el usuario en WhatsApp (D7).
   */
  const enviarPorWhatsApp = async () => {
    if (!id) return;
    setGenerandoEnlace(true);
    try {
      const res = await viajesApi.desprendibleWhatsapp(Number(id));
      window.open(`https://wa.me/?text=${encodeURIComponent(res.data.url)}`, '_blank');
    } catch (e: any) {
      if (e?.code === ViajesErrorCodes.VIAJE_ESTADO_INVALIDO) {
        toast.error('La remisión solo se puede compartir con el viaje finalizado');
      } else {
        toast.error(e?.message ?? 'No se pudo generar el enlace para compartir');
      }
    } finally {
      setGenerandoEnlace(false);
    }
  };

  // ── Vista Resumen (por defecto) ────────────────────────────────────────────
  if (vistaResumen) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/viajes')} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Viajes
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-primary">
                {modoGestion ? 'Editar Viaje' : 'Detalle del Viaje'}
              </h1>
              <Badge variant="outline" className={badgeClass}>{estadoActual}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{remisionId}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna principal — a ancho completo mientras se edita */}
          <div className={modoGestion ? 'lg:col-span-3 space-y-6' : 'lg:col-span-2 space-y-6'}>
            {/* Info del viaje */}
            <Card className="border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4 text-primary" />
                  Información del Viaje
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {modoGestion ? (
                  /* Formulario de edición. Solo fecha, hora, transportador y
                     extractora viajan en el PUT; placa y conductor son
                     snapshot del transportador y los rellena el select. */
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fecha del Viaje</Label>
                        <Input
                          type="date"
                          value={datosViaje.fecha}
                          onChange={(e) => setDatosViaje({ ...datosViaje, fecha: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hora de Salida</Label>
                        <Input
                          type="time"
                          value={datosViaje.horaSalida}
                          onChange={(e) => setDatosViaje({ ...datosViaje, horaSalida: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Transportador</Label>
                        <Select value={datosViaje.transportadorId} onValueChange={cambiarTransportador}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar transportador..." />
                          </SelectTrigger>
                          <SelectContent>
                            {transportadores.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.empresaRazonSocial}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Extractora Destino</Label>
                        <Select
                          value={datosViaje.extractoraId}
                          onValueChange={(v) => setDatosViaje({ ...datosViaje, extractoraId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar extractora..." />
                          </SelectTrigger>
                          <SelectContent>
                            {extractoras.map((ext) => (
                              <SelectItem key={ext.id} value={String(ext.id)}>
                                {ext.razon_social}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Placa del Vehículo</Label>
                        <Input value={datosViaje.placaVehiculo} disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>Conductor</Label>
                        <Input value={datosViaje.conductor} disabled className="bg-muted" />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button onClick={guardarEdicion} disabled={guardandoEdicion} className="gap-2">
                        <Save className="h-4 w-4" />
                        {guardandoEdicion ? 'Guardando...' : 'Guardar'}
                      </Button>
                      <Button variant="outline" onClick={cancelarEdicion} className="gap-2">
                        <X className="h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                      <Calendar className="h-3.5 w-3.5" />
                      Fecha del Viaje
                    </div>
                    <p className="font-semibold text-foreground">
                      {formatFecha(fechaViaje, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                      <Clock className="h-3.5 w-3.5" />
                      Hora de Salida
                    </div>
                    <p className="font-semibold text-foreground">{horaSalida ? formatHora(horaSalida) : '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                      <Truck className="h-3.5 w-3.5" />
                      Placa del Vehículo
                    </div>
                    <p className="font-semibold text-foreground">{placa || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                      <User className="h-3.5 w-3.5" />
                      Conductor
                    </div>
                    <p className="font-semibold text-foreground">{conductor || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                      <Package className="h-3.5 w-3.5" />
                      Transportador
                    </div>
                    <p className="font-semibold text-foreground">{transporte || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                      <MapPin className="h-3.5 w-3.5" />
                      Extractora Destino
                    </div>
                    <p className="font-semibold text-foreground">{extractora || '—'}</p>
                  </div>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen de cosecha — no aplica mientras se edita, ni con el
                viaje en CREADO: ahí las cosechas todavía se están contando
                y los totales no significan nada. */}
            {!modoGestion && estadoActual !== 'Creado' && (
            <Card className="border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Leaf className="h-4 w-4 text-primary" />
                  Resumen de Cosecha
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl bg-primary/5 p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{numFmt(totalGajos)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Gajos Totales</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{(totalKg / 1000).toFixed(1)}t</p>
                    <p className="text-xs text-muted-foreground mt-1">Toneladas</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{lotesSummary.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lotes</p>
                  </div>
                </div>

                {filasCosecha.length > 0 ? (
                  <div className="rounded-lg border border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-primary/5 border-b border-border">
                          <th className="text-left px-4 py-2.5 font-semibold text-foreground">Lote</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-foreground">Sublote</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-foreground">Gajos</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-foreground">Peso (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filasCosecha.map((f, i) => (
                          <tr key={f.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/30' : ''}`}>
                            <td className="px-4 py-2.5 text-foreground">{f.lote}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{f.sublote}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{numFmt(f.gajos)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{numFmt(f.pesoKg, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-primary text-white">
                          <td colSpan={2} className="px-4 py-2.5 font-bold">Total</td>
                          <td className="px-4 py-2.5 text-right font-bold tabular-nums">{numFmt(totalGajos)}</td>
                          <td className="px-4 py-2.5 text-right font-bold tabular-nums">{numFmt(totalKg, 2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Leaf className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No hay cosechas asociadas a este viaje</p>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Datos extractora (si finalizado) */}
            {!modoGestion && estadoActual === 'Finalizado' && pesoExtractora > 0 && (
              <Card className="border-border">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Weight className="h-4 w-4 text-primary" />
                    Datos Recibidos en Extractora
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">N° Remisión Extractora</p>
                      <p className="font-semibold">{viaje.numero_remision_extractora || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha / Hora Llegada</p>
                      <p className="font-semibold">
                        {viaje.fecha_llegada ? formatFecha(String(viaje.fecha_llegada).slice(0, 10)) : '—'}
                        {viaje.hora_llegada ? ` · ${formatHora(String(viaje.hora_llegada))}` : ''}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Peso Recibido</p>
                      <p className="font-semibold">{numFmt(pesoExtractora, 2)} kg</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Fruto Verde</p>
                      <p className="font-semibold">{numFmt(Number(viaje.fruto_verde ?? 0), 2)} %</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Sobre Maduro</p>
                      <p className="font-semibold">{numFmt(Number(viaje.sobre_maduro ?? 0), 2)} %</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Podrido</p>
                      <p className="font-semibold">{numFmt(Number(viaje.podrido ?? 0), 2)} %</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Pedúnculo Largo</p>
                      <p className="font-semibold">{numFmt(Number(viaje.pedunculo_largo ?? 0), 2)} %</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Mal Formado</p>
                      <p className="font-semibold">{numFmt(Number(viaje.mal_formado ?? 0), 2)} %</p>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Observaciones</p>
                      <p className="font-semibold">{viaje.observaciones_extractora || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Columna derecha: Acciones + Timeline */}
          {!modoGestion && <div className="lg:col-span-1 space-y-6">
            <Card className="border-border">
              <CardContent className="p-4 space-y-2">
                {/* La remisión solo existe con el viaje finalizado (D4). */}
                {puedeDesprendible && (
                <Button onClick={descargarDesprendible} disabled={descargandoPdf} className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  {descargandoPdf ? 'Generando...' : 'Descargar Desprendible'}
                </Button>
                )}
                {puedeDesprendible && (
                <Button variant="outline" onClick={enviarPorWhatsApp} disabled={generandoEnlace} className="w-full gap-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {generandoEnlace ? 'Generando enlace...' : 'Enviar por WhatsApp'}
                </Button>
                )}
                {/* CREADO entra al formulario de edición; EN_VALIDACION al
                    wizard de carga de la remisión de extractora. FINALIZADO
                    no muestra ninguno: ya no admite cambios. */}
                {estadoActual === 'Creado' && (
                  <Button variant="outline" onClick={habilitarEdicion} className="w-full gap-2">
                    <Settings className="h-4 w-4" />
                    Gestionar Viaje
                  </Button>
                )}
                {estadoActual === 'En Validación' && (
                  <Button variant="outline" onClick={() => irAVista('gestion')} className="w-full gap-2">
                    <Upload className="h-4 w-4" />
                    Soporte de Extractora
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-primary" />
                  Timeline del Viaje
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative space-y-6">
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
                  {timelineSteps.map((step) => {
                    const Icon = step.icon;
                    const isCompleted = step.completado;
                    const isActive = step.estado === estadoActual;
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
                          {step.fecha ? (
                            <p className="text-xs text-muted-foreground">
                              {formatFechaHora(step.fecha, {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Pendiente</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>}
        </div>
      </div>
    );
  }

  // ── Vista Gestión (wizard de etapas) ───────────────────────────────────────
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/viajes')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Viajes
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-primary">Carga Remisión</h1>
          <Badge variant="outline" className={badgeClass}>
            {estadoActual}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{remisionId}</p>
      </div>

      {/* Una sola columna a ancho completo: la carga de la remisión no
          convive con el timeline ni con las acciones del detalle. */}
      <div className="space-y-8">
        <div className="space-y-8">
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
                        /* Sin "Siguiente" en el pie, el círculo del stepper es
                           la única forma de llegar a la etapa de Cosecha. */
                        className={`flex flex-col items-center gap-2 cursor-pointer ${estaActiva || estaCompleta ? '' : 'opacity-50'}`}
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
                  {/* Solo lectura: la edición vive en la vista Detalle del
                      Viaje (`?vista=editar`), que es la única que alcanza un
                      viaje en estado CREADO. */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fecha del Viaje</Label>
                      <Input type="date" value={fechaViaje} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Placa del Vehículo</Label>
                      <Input value={placa} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Conductor</Label>
                      <Input value={conductor} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Transportador</Label>
                      <Input value={transporte} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Extractora Destino</Label>
                      <Input value={extractora} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora de Salida</Label>
                      <Input type="time" value={horaSalida} disabled />
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
                              <Label>Gajos en Viaje</Label>
                              {/* §5.5: `gajos_en_viaje` es el split de esta
                                  cosecha en este viaje. `cosecha.gajos_reconteo`
                                  suma todos los splits — no sirve aca porque
                                  mostraria el total de todos los viajes. */}
                              <Input
                                value={d.gajos_en_viaje ?? d.cosecha?.gajos_reconteo ?? d.cosecha?.gajos_reportados ?? '—'}
                                disabled
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Peso (kg)</Label>
                              {/* §9 — el backend ahora serializa a 4 decimales
                                  ("1800.5000"). Formateamos a 2 para mostrar. */}
                              <Input
                                value={
                                  d.cosecha?.peso_confirmado != null
                                    ? Number(d.cosecha.peso_confirmado).toLocaleString('es-CO', { maximumFractionDigits: 2 })
                                    : '—'
                                }
                                disabled
                              />
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
                            {/* §9 — el backend serializa a 4 decimales; se
                                muestra formateado a máximo 2. */}
                            <Input
                              value={
                                viaje?.peso_viaje != null && viaje.peso_viaje !== ''
                                  ? Number(viaje.peso_viaje).toLocaleString('es-CO', { maximumFractionDigits: 2 })
                                  : ''
                              }
                              disabled
                            />
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
                          {/* §9 API_NOMINA — `peso_viaje` valida decimal:0,4. */}
                          <Input type="number" step="0.0001" value={datosExtractora.pesoRecibido}
                            onChange={(e) => {
                              const raw = parseFloat(e.target.value);
                              const val = isNaN(raw) ? 0 : Math.round(raw * 10000) / 10000;
                              setDatosExtractora({ ...datosExtractora, pesoRecibido: val });
                            }}
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
                  <>
                    <Button variant="outline" onClick={eliminarViaje} className="gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                    <Button onClick={habilitarEdicion} className="gap-2">
                      <Edit className="h-4 w-4" /> Editar
                    </Button>
                  </>
                ) : estadoActual === 'Finalizado' && etapaActual < 3 ? (
                  <Button onClick={siguienteEtapa} className="gap-2">
                    Siguiente <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : estadoActual === 'En Validación' && etapaActual === 3 ? (
                  <Button onClick={guardarValidacion} disabled={!imagenFormulario || procesandoIA || procesando}
                    className="gap-2">
                    <Check className="h-4 w-4" />
                    {procesando ? 'Procesando...' : 'Guardar y Finalizar'}
                  </Button>
                ) : null}
              </div>
            </div>
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