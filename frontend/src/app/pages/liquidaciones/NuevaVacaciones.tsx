/**
 * Liquidación de vacaciones, un colaborador a la vez
 * (API_LIQUIDACIONES §10.2 a §10.5).
 *
 * Tres llamadas encadenadas:
 *   1. /colaboradores/{id}  → causación, saldo, base y tope de compensación.
 *   2. /calendario          → dónde termina el disfrute y cuántos días
 *                             calendario se pagan. El backend sabe qué es
 *                             festivo y si el sábado cuenta como hábil.
 *   3. /preview             → el comprobante completo y su `calculo_hash`.
 *
 * Dos reglas que NO se calculan aquí a propósito:
 *  - Se pagan los días CALENDARIO del disfrute, no los hábiles (CST 192).
 *  - La compensación en dinero se topa en la mitad de cada período causado
 *    (CST 189), que llega como `dias_dinero_max`, y exige acuerdo escrito.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Plane, Info, AlertCircle, AlertTriangle, Check, Loader2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SeccionCard from '../../components/liquidaciones/SeccionCard';
import VacioCard from '../../components/liquidaciones/VacioCard';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import {
  vacacionesApi,
  VacacionesErrorCodes,
  NO_ELEGIBLE_LABEL,
  ADVERTENCIA_PAGO_NOMINA_LABEL,
  type CalendarioVacaciones,
  type ComprobanteVacaciones,
  type DetalleColaboradorVacaciones,
  type MetodoPagoVacacion,
  type ModoPagoVacacion,
  type VacacionItem,
  normalizarBloqueante,
} from '../../../api/vacaciones';
import { BLOQUEANTE_LABEL } from '../../../api/liquidaciones';
import type { ApiError } from '../../../api/client';
import { fmtCOP, fmtDias } from './vacaciones/comunes';
import FichaColaboradorVacacion, { AjusteBase } from './vacaciones/FichaColaboradorVacacion';
import {
  Aviso, ConsumoSaldo, DatosPagoAnticipado, PlanDePago, RangoCalendario, Segmentado,
} from './vacaciones/PiezasNuevaVacacion';
import { ResumenVacacion, SaldoVacacion } from './vacaciones/ResumenNuevaVacacion';

const VOLVER = '/liquidaciones?tab=vacaciones';

/** Solo la cobertura incompleta se puede forzar, y con motivo. */
const FORZABLE = VacacionesErrorCodes.LIQUIDACION_COBERTURA_INCOMPLETA;

/**
 * Los bloqueantes de base que una base manual deja sin efecto (§10.4). Son
 * justamente los que el ajuste viene a resolver, así que mientras el ajuste
 * esté activo no pueden seguir congelando el formulario.
 */
const RESUELVE_AJUSTE = new Set<string>([
  'SIN_DEVENGADO',
  VacacionesErrorCodes.LIQUIDACION_COBERTURA_INCOMPLETA,
]);

export default function NuevaVacaciones() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  /**
   * PR-N4 — Dos formas de entrar: `?col=` desde los turnos pendientes, o
   * `?solicitud=` al aprobar una solicitud creada en Novedades. En el segundo
   * caso el colaborador y las fechas los trae la solicitud, y el `solicitud_id`
   * viaja en el confirmar para que el backend la convierta en liquidación en
   * lugar de crear una fila nueva que chocaría consigo misma.
   */
  const solicitudId = Number(searchParams.get('solicitud')) || 0;
  const [solicitud, setSolicitud] = useState<VacacionItem | null>(null);
  const colParam = Number(searchParams.get('col')) || 0;
  const empleadoId = colParam || solicitud?.empleado.id || 0;

  const [detalle, setDetalle] = useState<DetalleColaboradorVacaciones | null>(null);
  const [cargando, setCargando] = useState(true);

  const [fechaInicio, setFechaInicio] = useState('');
  const [diasDisfrute, setDiasDisfrute] = useState('');
  const [diasDinero, setDiasDinero] = useState('');
  const [acuerdoEscrito, setAcuerdoEscrito] = useState(false);
  const [observacion, setObservacion] = useState('');

  /**
   * Forma de pago. Liquidar y pagar son dos llamadas distintas en el backend:
   * `crear` deja la vacación APROBADA y `registrarPago` la pasa a PAGADA.
   * "Pago en nómina" es simplemente no llamar la segunda: queda pendiente y
   * entra en la nómina del período.
   */
  /**
   * PR-L15 — Cómo se paga la vacación, no cuándo. Con `NOMINA` cada nómina
   * que cubre el disfrute paga su tramo como devengado; con `DIRECTO` la
   * paga el módulo, que es lo de siempre.
   */
  const [modoPago, setModoPago] = useState<ModoPagoVacacion>('DIRECTO');
  /**
   * Solo aplica en `DIRECTO`: si el giro se registra ya o queda pendiente.
   * En `NOMINA` no hay giro que registrar (lo haría el saldo manual y
   * desarmaría el motivo de escoger el modo), así que se fuerza a pendiente.
   */
  const [tipoPago, setTipoPago] = useState<'pendiente' | 'anticipado'>('pendiente');
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState<MetodoPagoVacacion>('TRANSFERENCIA');
  const [referenciaPago, setReferenciaPago] = useState('');

  const [calendario, setCalendario] = useState<CalendarioVacaciones | null>(null);
  const [calculandoCalendario, setCalculandoCalendario] = useState(false);
  const [preview, setPreview] = useState<ComprobanteVacaciones | null>(null);
  const [calculandoPreview, setCalculandoPreview] = useState(false);
  const [errorPreview, setErrorPreview] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [forzarDialog, setForzarDialog] = useState<string | null>(null);
  const [motivoForzado, setMotivoForzado] = useState('');

  /*
   * v1.13 — Base mensual manual del art. 192. El "modo manual" es estado de
   * esta pantalla, no un parámetro de la API: manual = el preview viaja con
   * `ajuste[base_mensual]`. Exige el permiso `liquidaciones.ajustar_base`.
   */
  const [modoBaseManual, setModoBaseManual] = useState(false);
  const [baseManual, setBaseManual] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');

  const calRef = useRef(0);
  const prevRef = useRef(0);

  const nDisfrute = Number(diasDisfrute) || 0;
  const nDinero = Number(diasDinero) || 0;

  const { hasPermiso } = useAuth();
  const puedeAjustarBase = hasPermiso('liquidaciones.ajustar_base');
  const nBaseManual = Number(baseManual) || 0;

  /**
   * v1.13 — El ajuste viaja solo si el bloque está abierto, hay base y es
   * distinta de la que calcula el sistema. El motivo es opcional para ver el
   * recálculo y obligatorio para confirmar (422 `AJUSTE_SIN_MOTIVO`).
   */
  const baseSistema = Number(
    preview?.base?.base_mensual_sistema
    ?? detalle?.base?.base_mensual_sistema
    ?? detalle?.base?.base_mensual
    ?? 0,
  );
  const ajusteActivo = puedeAjustarBase
    && modoBaseManual
    && nBaseManual > 0
    && nBaseManual !== baseSistema;

  // ── 0. Solicitud a aprobar (PR-N4) ─────────────────────────────────────────
  useEffect(() => {
    if (!solicitudId) return;
    let vivo = true;
    setCargando(true);
    vacacionesApi
      .ver(solicitudId)
      .then((res) => {
        if (!vivo) return;
        const v = res.data;
        if (v.estado !== 'PENDIENTE') {
          toast.error('Esta solicitud ya se resolvió.');
          navigate('/liquidaciones/vacaciones/historico');
          return;
        }
        setSolicitud(v);
        // Lo que pidió el colaborador es el punto de partida, no una
        // imposición: el liquidador puede ajustar días y agregar compensación.
        if (v.fecha_inicio) setFechaInicio(String(v.fecha_inicio).slice(0, 10));
        if (v.dias_habiles > 0) setDiasDisfrute(String(v.dias_habiles));
        if (v.observacion) setObservacion(v.observacion);
      })
      .catch((err) => {
        if (!vivo) return;
        toast.error((err as ApiError).message ?? 'No se pudo cargar la solicitud');
        setCargando(false);
      });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId]);

  // ── 1. Colaborador ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!empleadoId) { setCargando(false); return; }
    let vivo = true;
    setCargando(true);
    vacacionesApi
      .detalleColaborador(empleadoId)
      .then((res) => { if (vivo) setDetalle(res.data); })
      .catch((err) => {
        if (!vivo) return;
        const e = err as ApiError;
        toast.error(e.message ?? 'No se pudo cargar el colaborador');
      })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [empleadoId]);

  // ── 2. Calendario ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fechaInicio || nDisfrute <= 0) { setCalendario(null); return; }
    const reqId = ++calRef.current;
    setCalculandoCalendario(true);
    const t = setTimeout(() => {
      vacacionesApi
        .calendario(fechaInicio, nDisfrute)
        .then((res) => { if (reqId === calRef.current) setCalendario(res.data); })
        .catch((err) => {
          if (reqId !== calRef.current) return;
          setCalendario(null);
          const e = err as ApiError;
          if (e.code === VacacionesErrorCodes.VACACIONES_INICIO_NO_HABIL) {
            toast.error('Las vacaciones no pueden empezar en domingo o festivo');
          } else if (e.code === VacacionesErrorCodes.CALENDARIO_FESTIVOS_AUSENTE) {
            toast.error('Falta el calendario de festivos de ese año. Revisa Configuración.');
          }
        })
        .finally(() => { if (reqId === calRef.current) setCalculandoCalendario(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [fechaInicio, nDisfrute]);

  // ── 3. Preview ─────────────────────────────────────────────────────────────
  const cargarPreview = useCallback(() => {
    if (!empleadoId || nDisfrute + nDinero <= 0) {
      setPreview(null);
      setErrorPreview(null);
      return Promise.resolve();
    }
    const reqId = ++prevRef.current;
    setCalculandoPreview(true);
    return vacacionesApi
      .preview(
        empleadoId,
        {
          solicitud_id: solicitudId || undefined,
          fecha_inicio: nDisfrute > 0 ? fechaInicio || undefined : undefined,
          dias_disfrute: nDisfrute,
          dias_dinero: nDinero || undefined,
          modo_pago: modoPago,
        },
        // Una base igual a la del sistema no es un ajuste: así abrir el bloque
        // sin cambiar nada no deja la liquidación como MANUAL.
        ajusteActivo
          ? { base_mensual: nBaseManual, motivo: motivoAjuste.trim() || undefined }
          : undefined,
      )
      .then((res) => {
        if (reqId !== prevRef.current) return;
        setPreview(res.data);
        setErrorPreview(null);
      })
      .catch((err) => {
        if (reqId !== prevRef.current) return;
        setPreview(null);
        const e = err as ApiError;
        // v1.13 — Sin `liquidaciones.ajustar_base` la petición con ajuste
        // responde 403 antes de validar: se vuelve a la base del sistema.
        if (e.status === 403 && modoBaseManual) {
          setModoBaseManual(false);
          setBaseManual('');
          setMotivoAjuste('');
          toast.error(e.message ?? 'No tiene permiso para ajustar la base');
          return;
        }
        setErrorPreview(mensajeError(e));
      })
      .finally(() => { if (reqId === prevRef.current) setCalculandoPreview(false); });
  }, [empleadoId, solicitudId, fechaInicio, nDisfrute, nDinero, modoPago,
    ajusteActivo, nBaseManual, motivoAjuste, modoBaseManual]);

  useEffect(() => {
    if (nDisfrute > 0 && !fechaInicio) { setPreview(null); return; }
    const t = setTimeout(() => { void cargarPreview(); }, 400);
    return () => clearTimeout(t);
  }, [cargarPreview, fechaInicio, nDisfrute]);

  // ── Confirmar ──────────────────────────────────────────────────────────────
  const confirmar = async (forzar = false) => {
    if (!preview?.calculo_hash) { toast.error('Espera a que termine el cálculo'); return; }
    if (forzar && motivoForzado.trim().length < 5) {
      toast.error('Escribe el motivo para forzar la liquidación');
      return;
    }
    setConfirmando(true);
    try {
      const res = await vacacionesApi.crear({
        empleado_id: empleadoId,
        solicitud_id: solicitudId || undefined,
        fecha_inicio: nDisfrute > 0 ? fechaInicio : undefined,
        dias_disfrute: nDisfrute,
        dias_dinero: nDinero || undefined,
        acuerdo_escrito: nDinero > 0 ? acuerdoEscrito : undefined,
        modo_pago: modoPago,
        observacion: observacion.trim() || undefined,
        calculo_hash: preview.calculo_hash,
        // El ajuste no entra al hash: el mismo preview firma con y sin él.
        ajuste: ajusteActivo
          ? { base_mensual: nBaseManual, motivo: motivoAjuste.trim() }
          : undefined,
        forzar: forzar || undefined,
        motivo_forzado: forzar ? motivoForzado.trim() : undefined,
      });
      setForzarDialog(null);

      // El pago anticipado es una segunda llamada. Si falla, la liquidación ya
      // existe: se avisa y se sigue al detalle, donde se puede reintentar.
      if (modoPago === 'DIRECTO' && tipoPago === 'anticipado') {
        try {
          await vacacionesApi.registrarPago(res.data.id, {
            fecha_pago: fechaPago,
            metodo_pago: metodoPago,
            referencia_pago: referenciaPago.trim() || undefined,
          });
          toast.success('Vacaciones liquidadas y pago registrado');
        } catch (errPago) {
          const ep = errPago as ApiError;
          toast.warning(
            `Se liquidaron las vacaciones, pero el pago no quedó registrado: ${ep.message ?? 'error desconocido'}. Regístralo desde el detalle.`,
            { duration: 9000 },
          );
        }
      } else {
        toast.success(res.message ?? 'Vacaciones liquidadas');
      }

      navigate(`/liquidaciones/vacaciones/${res.data.id}`);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === VacacionesErrorCodes.LIQUIDACION_DESACTUALIZADA) {
        toast.warning('Los datos cambiaron desde el cálculo. Se recalculó: revisa y confirma de nuevo.', { duration: 8000 });
        await cargarPreview();
      } else if (e.code === FORZABLE) {
        setForzarDialog(mensajeError(e));
      } else {
        toast.error(mensajeError(e));
      }
    } finally {
      setConfirmando(false);
    }
  };

  // ── Estados de carga y guardas ─────────────────────────────────────────────
  if (cargando) {
    return (
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando colaborador...
      </Card>
    );
  }

  if (!empleadoId || !detalle) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Vacaciones" title="Liquidación de vacaciones" backTo={VOLVER} />
        <VacioCard
          icon={Plane}
          title="Sin colaborador"
          description="Elige un colaborador desde la lista de turnos pendientes para liquidar sus vacaciones."
          action={
            <Button variant="outline" asChild>
              <Link to={VOLVER}>Volver a liquidaciones</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const maxDisfrute = detalle.causacion.dias_disponibles_exigibles;
  const maxDinero = detalle.dias_dinero_max;
  const totalPedido = nDisfrute + nDinero;
  const excedeSaldo = totalPedido > maxDisfrute;
  const excedeDinero = nDinero > maxDinero;
  const faltaAcuerdo = nDinero > 0 && !acuerdoEscrito;
  /*
   * Con base manual el motor deja de responder SIN_DEVENGADO y cobertura
   * incompleta. Dejarlos bloqueando aquí cerraba el formulario antes de que
   * el usuario pudiera capturar los días, y sin días no hay preview que
   * recalcular.
   */
  const bloqueantesBase = detalle.bloqueantes_base.map(normalizarBloqueante);
  const bloqueantesBaseVigentes = ajusteActivo
    ? bloqueantesBase.filter((b) => !RESUELVE_AJUSTE.has(b.code))
    : bloqueantesBase;
  const ajusteLevantaBloqueo = bloqueantesBase.length > bloqueantesBaseVigentes.length;
  const bloqueado = !detalle.elegible || bloqueantesBaseVigentes.length > 0;

  // El consumo es FIFO: se liquida contra el período completo más viejo con
  // saldo, que es el que el backend va a imputar.
  const periodoALiquidar = detalle.causacion.periodos.find((p) => p.saldo > 0) ?? null;
  /*
   * El preview es la fuente cuando existe: ya recalculó con la base manual.
   * Sin él (todavía no hay días) se pinta lo que trajo el colaborador.
   */
  const baseVigente = preview?.base ?? detalle.base;
  const mesesBase = baseVigente.meses_base;

  /*
   * Lo único que confirma el ajuste es el preview de vuelta con
   * `metodo_base: 'MANUAL'`. Mientras no llegue, la ficha pinta la base
   * capturada: dejar el salario del sistema ahí contradecía el campo de
   * abajo y nadie sabía qué base iba a usar el comprobante.
   */
  const ajusteAplicado = ajusteActivo && baseVigente.metodo_base === 'MANUAL';
  const ajustePendiente = ajusteActivo && !ajusteAplicado;

  const baseMensual = ajustePendiente ? nBaseManual : baseVigente.base_mensual;
  const valorDiaVigente = ajustePendiente
    ? nBaseManual / baseVigente.dias_mes
    : (baseVigente.valor_dia ?? detalle.valor_dia);
  const etiquetaBase = ajusteActivo || baseVigente.metodo_base === 'MANUAL'
    ? 'Base manual'
    : baseVigente.metodo_base === 'PROMEDIO'
      ? 'Salario promedio'
      : 'Último salario';
  const subtextoBase = ajustePendiente
    ? `Sin recalcular · sistema ${fmtCOP(baseSistema)}`
    : ajusteAplicado || baseVigente.metodo_base === 'MANUAL'
      ? `Reemplaza la del sistema: ${fmtCOP(baseSistema)}`
      : baseVigente.metodo_base === 'PROMEDIO'
        ? `Promedio de ${mesesBase} meses · nóminas cerradas al ${baseVigente.cobertura_nominas_pct} %`
        : 'Salario contractual vigente';
  const auxilio = detalle.base.componentes.excluido_192.auxilio;

  // §1.2 — El preview trae sus propios `bloqueantes[]`. Solo la cobertura
  // incompleta se puede forzar con motivo; el resto cierra la confirmación.
  const bloqueantesPreview = preview?.bloqueantes ?? [];
  const bloqueantesDuros = bloqueantesPreview.filter((b) => b.forzable !== true);

  // D1: los días que de verdad se pagan. `null` solo si el backend todavía no
  // los manda (una liquidación anterior a v1.10 pagaba los calendario).
  const diasPago = preview?.resultado.dias_pago ?? null;

  /**
   * Fuerza el recálculo con la base capturada. El preview ya sale solo al
   * teclear, pero sin botón no había nada que oprimir ni nada que dijera
   * qué falta. La base no se guarda aparte: viaja con el confirmar.
   */
  const aplicarBaseManual = () => {
    if (nBaseManual <= 0) {
      toast.error('Indique la base mensual');
      return;
    }
    if (nBaseManual === baseSistema) {
      toast.error('Esa es la base que ya calcula el sistema');
      return;
    }
    if (!motivoAjuste.trim()) {
      toast.error('Indique el motivo del ajuste');
      return;
    }
    if (totalPedido <= 0) {
      toast.error('Capture los días a liquidar para ver el recálculo');
      return;
    }
    if (nDisfrute > 0 && !fechaInicio) {
      toast.error('Indique la fecha de inicio del disfrute');
      return;
    }
    void cargarPreview();
  };

  const alternarBaseManual = () => {
    const abriendo = !modoBaseManual;
    setModoBaseManual(abriendo);
    setBaseManual(abriendo && baseSistema > 0 ? String(Math.round(baseSistema)) : '');
    setMotivoAjuste('');
  };

  /** En NOMINA no hay giro que registrar: lo pagan las nóminas. */
  const cambiarModoPago = (modo: ModoPagoVacacion) => {
    setModoPago(modo);
    if (modo === 'NOMINA') setTipoPago('pendiente');
  };

  const puedeConfirmar =
    !bloqueado && !!preview && !calculandoPreview && totalPedido > 0 &&
    !excedeSaldo && !excedeDinero && !faltaAcuerdo &&
    bloqueantesDuros.length === 0 &&
    (nDisfrute === 0 || !!fechaInicio) &&
    (modoPago === 'NOMINA' || tipoPago === 'pendiente' || !!fechaPago) &&
    // v1.13 — Con base manual el motivo es obligatorio para confirmar: sin él
    // el backend responde 422 `AJUSTE_SIN_MOTIVO`.
    (!ajusteActivo || motivoAjuste.trim().length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vacaciones"
        title={solicitud ? 'Aprobar solicitud de vacaciones' : 'Liquidación de vacaciones'}
        description={solicitud
          ? 'Al liquidar queda aprobada la solicitud que el colaborador pidió desde Novedades.'
          : 'Registra el disfrute y la compensación en dinero de las vacaciones.'}
        backTo={VOLVER}
      />

      {/* PR-N4 — Lo que pidió el colaborador, para que el liquidador vea de
          dónde salen los campos prellenados y qué cambió si los ajusta. */}
      {solicitud && (
        <Aviso tono="warning" icono={Info}>
          <p className="font-semibold">Solicitud {solicitud.numero_comprobante}</p>
          <p>
            Pidió {solicitud.dias_habiles} días hábiles
            {solicitud.fecha_inicio && ` desde el ${String(solicitud.fecha_inicio).slice(0, 10)}`}.
            Puedes ajustar los días antes de liquidar; lo que guardes es lo que queda.
          </p>
          {solicitud.observacion && (
            <p className="text-xs text-muted-foreground">Observación: {solicitud.observacion}</p>
          )}
        </Aviso>
      )}

      <FichaColaboradorVacacion
        detalle={detalle}
        periodo={periodoALiquidar}
        maxDisfrute={maxDisfrute}
        base={{
          etiqueta: etiquetaBase,
          subtexto: subtextoBase,
          mensual: baseMensual,
          valorDia: valorDiaVigente,
          diasMes: baseVigente.dias_mes,
          mesesBase,
          auxilio,
        }}
      >
        {puedeAjustarBase && (
          <AjusteBase
            abierto={modoBaseManual}
            onAlternar={alternarBaseManual}
            base={baseManual}
            onBase={setBaseManual}
            motivo={motivoAjuste}
            onMotivo={setMotivoAjuste}
            baseSistema={baseSistema}
            diasMes={baseVigente.dias_mes}
            activo={ajusteActivo}
            aplicado={ajusteAplicado}
            levantaBloqueo={ajusteLevantaBloqueo}
            calculando={calculandoPreview}
            sinDias={totalPedido <= 0}
            conError={!!errorPreview}
            onAplicar={aplicarBaseManual}
          />
        )}
      </FichaColaboradorVacacion>

      {/* ── Bloqueos ─────────────────────────────────────────────────────── */}
      {!detalle.elegible && (
        <Aviso tono="destructive" icono={AlertCircle}>
          <p>
            {detalle.motivo_no_elegible
              ? NO_ELEGIBLE_LABEL[detalle.motivo_no_elegible]
              : 'Este colaborador no puede liquidar vacaciones.'}
          </p>
        </Aviso>
      )}

      {bloqueantesBaseVigentes.length > 0 && (
        <Aviso tono="destructive" icono={AlertCircle}>
          {bloqueantesBaseVigentes.map((b, i) => (
            <p key={`${b.code}-${i}`}>{b.mensaje ?? BLOQUEANTE_LABEL[b.code] ?? b.code}</p>
          ))}
        </Aviso>
      )}

      {/* ── Formulario ───────────────────────────────────────────────────── */}
      <SeccionCard title="Datos de la liquidación" description="Ingresa las fechas y los días a liquidar.">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fechaInicioVac">Fecha de inicio de vacaciones *</Label>
              <Input
                id="fechaInicioVac"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                disabled={bloqueado}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaFinVac">Fecha de fin de vacaciones</Label>
              {/* Solo lectura: la resuelve `/calendario` en el backend, que es
                  quien sabe qué días son festivos y si el sábado es hábil. */}
              <Input
                id="fechaFinVac"
                type="date"
                value={calendario?.fecha_fin ?? ''}
                readOnly
                className="cursor-not-allowed bg-muted/60 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                {calculandoCalendario ? 'Calculando…' : 'Se calcula según los días de disfrute.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="diasDisfrute">
                Días de disfrute <span className="font-normal text-muted-foreground">(descanso efectivo, hábiles)</span>
              </Label>
              <Input
                id="diasDisfrute"
                type="number" min={0} step={1} placeholder="0"
                value={diasDisfrute}
                onChange={(e) => setDiasDisfrute(e.target.value)}
                disabled={bloqueado}
                aria-invalid={excedeSaldo || undefined}
              />
              <p className="text-xs text-muted-foreground">Máximo: {fmtDias(maxDisfrute)} días disponibles</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diasDinero">
                Días en dinero <span className="font-normal text-muted-foreground">(compensación, opcional)</span>
              </Label>
              <Input
                id="diasDinero"
                type="number" min={0} step={0.5} max={maxDinero} placeholder="0"
                value={diasDinero}
                onChange={(e) => setDiasDinero(e.target.value)}
                disabled={bloqueado || maxDinero <= 0}
                aria-invalid={excedeDinero || undefined}
              />
              <p className="text-xs text-muted-foreground">
                Máximo: {fmtDias(maxDinero)} días, la mitad del período causado (art. 189 CST)
              </p>
            </div>
          </div>

          {/* Forma de pago (PR-L15): quién paga y, si es directo, cuándo. */}
          <div className="space-y-2">
            <Label>Forma de pago *</Label>
            <Segmentado<ModoPagoVacacion>
              ariaLabel="Forma de pago"
              valor={modoPago}
              onCambio={cambiarModoPago}
              opciones={[
                { valor: 'DIRECTO', label: 'Pago directo', disabled: bloqueado },
                {
                  valor: 'NOMINA',
                  label: 'En nómina',
                  disabled: bloqueado || nDisfrute <= 0,
                  title: nDisfrute <= 0 ? 'En nómina solo se puede pagar un disfrute, no una compensación suelta' : undefined,
                },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              {modoPago === 'DIRECTO'
                ? 'La paga este módulo, con su propio comprobante.'
                : 'Cada nómina que cubre el disfrute paga su tramo como devengado, con las deducciones de salud y pensión de esa nómina. La compensación en dinero va con la nómina del inicio.'}
            </p>
          </div>

          {modoPago === 'DIRECTO' && (
            <div className="space-y-2">
              <Label>¿Cuándo se paga?</Label>
              <Segmentado<'pendiente' | 'anticipado'>
                ariaLabel="Cuándo se paga"
                valor={tipoPago}
                onCambio={setTipoPago}
                opciones={[
                  { valor: 'pendiente', label: 'Pagar después', disabled: bloqueado },
                  { valor: 'anticipado', label: 'Pago anticipado', disabled: bloqueado },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                {tipoPago === 'pendiente'
                  ? 'Queda aprobada y el pago se registra después desde el histórico.'
                  : 'Se registra el pago de inmediato y la vacación queda pagada.'}
              </p>
            </div>
          )}

          {modoPago === 'NOMINA' && <PlanDePago preview={preview} />}

          {modoPago === 'DIRECTO' && tipoPago === 'anticipado' && (
            <DatosPagoAnticipado
              fecha={fechaPago}
              onFecha={setFechaPago}
              metodo={metodoPago}
              onMetodo={setMetodoPago}
              referencia={referenciaPago}
              onReferencia={setReferenciaPago}
              disabled={bloqueado}
            />
          )}

          {nDisfrute > 0 && fechaInicio && (
            <RangoCalendario calendario={calendario} calculando={calculandoCalendario} diasPago={diasPago} />
          )}

          {/* Acuerdo escrito: sin él la compensación no es válida */}
          {nDinero > 0 && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-warning-soft px-4 py-3">
              <Checkbox
                checked={acuerdoEscrito}
                onCheckedChange={(v) => setAcuerdoEscrito(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-semibold text-foreground">Hay acuerdo escrito con el trabajador</span>
                <span className="mt-0.5 block text-muted-foreground">
                  El artículo 189 del CST exige que la compensación en dinero se pacte por escrito.
                  Sin el documento firmado la liquidación no se puede confirmar.
                </span>
              </span>
            </label>
          )}

          {totalPedido > 0 && maxDisfrute > 0 && (
            <ConsumoSaldo disfrute={nDisfrute} dinero={nDinero} disponibles={maxDisfrute} />
          )}

          {(excedeSaldo || excedeDinero) && (
            <Aviso tono="destructive" icono={AlertCircle}>
              <p>
                {excedeSaldo
                  ? `El total (${fmtDias(totalPedido)} días) supera el saldo disponible (${fmtDias(maxDisfrute)}).`
                  : `Los días en dinero (${fmtDias(nDinero)}) superan el máximo permitido (${fmtDias(maxDinero)}).`}
              </p>
            </Aviso>
          )}

          <div className="space-y-2">
            <Label htmlFor="observacionVac">
              Observación <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="observacionVac"
              rows={2} placeholder="Notas internas de esta liquidación."
              value={observacion} onChange={(e) => setObservacion(e.target.value)}
            />
          </div>

          <Aviso tono="muted" icono={Info}>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Art. 186 CST:</strong> 15 días hábiles por año de
              servicio. <strong className="text-foreground">Art. 189 CST:</strong> los días compensados
              en dinero no pueden superar la mitad del período causado.{' '}
              <strong className="text-foreground">Art. 192 CST:</strong> el disfrute se paga por días
              calendario. El sistema aplica los tres topes.
            </p>
          </Aviso>
        </div>
      </SeccionCard>

      {/* ── Resultado del preview ────────────────────────────────────────── */}
      {calculandoPreview && (
        <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando la liquidación
        </Card>
      )}

      {!calculandoPreview && errorPreview && totalPedido > 0 && (
        <Aviso tono="destructive" icono={AlertCircle}>
          <p>{errorPreview}</p>
        </Aviso>
      )}

      {!calculandoPreview && preview && (
        <>
          {bloqueantesPreview.length > 0 && (
            <Aviso tono="destructive" icono={AlertCircle}>
              {bloqueantesPreview.map((b, i) => (
                <p key={`${b.code}-${i}`}>
                  {b.mensaje ?? BLOQUEANTE_LABEL[b.code] ?? b.code}
                  {b.forzable === true && (
                    <span className="ml-1 text-muted-foreground">
                      Se puede liquidar igual dejando el motivo por escrito.
                    </span>
                  )}
                </p>
              ))}
            </Aviso>
          )}

          {preview.advertencias.length > 0 && (
            <Aviso tono="warning" icono={AlertTriangle}>
              {preview.advertencias.map((a, i) => (
                <p key={`${a.code}-${i}`}>{a.mensaje ?? ADVERTENCIA_PAGO_NOMINA_LABEL[a.code] ?? a.code}</p>
              ))}
            </Aviso>
          )}

          <ResumenVacacion preview={preview} calendario={calendario} listo={puedeConfirmar} />
          <SaldoVacacion preview={preview} />
        </>
      )}

      {/* ── Acciones ─────────────────────────────────────────────────────── */}
      <div className="barra-acciones flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" asChild>
          <Link to={VOLVER}>Cancelar</Link>
        </Button>
        <Button onClick={() => confirmar(false)} disabled={!puedeConfirmar || confirmando}>
          {confirmando ? <Loader2 className="animate-spin" /> : <Check strokeWidth={2} />}
          Confirmar liquidación
        </Button>
      </div>

      {/* ── Forzar con motivo ────────────────────────────────────────────── */}
      <AlertDialog open={forzarDialog !== null} onOpenChange={(v) => { if (!v) setForzarDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cobertura de nóminas incompleta</AlertDialogTitle>
            <AlertDialogDescription>
              {forzarDialog} Puedes liquidar igual, pero queda registrado quién lo autorizó y por qué.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nuevavacac-motivo">Motivo</Label>
            <Textarea id="nuevavacac-motivo"
              rows={3} placeholder="Explica por qué se liquida con la información disponible."
              value={motivoForzado} onChange={(e) => setMotivoForzado(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmando}>Cancelar</AlertDialogCancel>
            <Button onClick={() => confirmar(true)} disabled={confirmando}>
              {confirmando && <Loader2 className="animate-spin" />}
              Liquidar de todos modos
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Traduce los códigos del contrato a algo que el usuario pueda accionar. */
function mensajeError(e: ApiError): string {
  switch (e.code) {
    case VacacionesErrorCodes.VACACIONES_SALDO_INSUFICIENTE:
      return 'Los días pedidos superan el saldo disponible del colaborador.';
    case VacacionesErrorCodes.VACACIONES_COMPENSACION_EXCEDE_MITAD:
      return 'La compensación en dinero no puede pasar de la mitad del período causado.';
    case VacacionesErrorCodes.VACACIONES_COMPENSACION_SIN_ACUERDO:
      return 'Falta marcar el acuerdo escrito para compensar días en dinero.';
    case VacacionesErrorCodes.VACACIONES_INICIO_NO_HABIL:
      return 'Las vacaciones no pueden empezar en domingo o festivo.';
    case VacacionesErrorCodes.VACACIONES_DIAS_INVALIDOS:
      return 'Los días indicados no son válidos. Los días en dinero van de medio en medio.';
    case VacacionesErrorCodes.VACACIONES_FUERA_DE_CONTRATO:
      return 'El rango de vacaciones cae fuera del contrato del colaborador.';
    case VacacionesErrorCodes.VACACIONES_CON_AUSENCIA_EN_RANGO:
      return 'El colaborador tiene una ausencia registrada dentro de esas fechas.';
    case VacacionesErrorCodes.VACACIONES_SOLAPADAS:
      // §10.14: una solicitud PENDIENTE bloquea por esta vía cuando no se
      // liquida con su `solicitud_id`. El backend lo dice en el `message`.
      return e.message
        ?? 'Ya hay vacaciones registradas que se cruzan con ese rango. Si es una solicitud, liquídala desde el histórico o recházala.';
    case VacacionesErrorCodes.VACACION_SOLICITUD_NO_PENDIENTE:
      return 'Esta solicitud ya se aprobó o se rechazó. Vuelve al histórico y recárgalo.';
    case VacacionesErrorCodes.VACACION_SOLICITUD_DIFIERE:
      return 'Los días o la fecha no son los que pidió el colaborador. Edita la solicitud en Novedades o liquídala como está.';
    case VacacionesErrorCodes.VACACION_SOLICITUD_EMPLEADO_DISTINTO:
      return 'Esa solicitud es de otro colaborador.';
    case VacacionesErrorCodes.CALENDARIO_FESTIVOS_AUSENTE:
      return 'Falta el calendario de festivos de ese año. Revisa Configuración.';
    case VacacionesErrorCodes.VACACION_MODO_PAGO_INVALIDO:
      // §10.15: `NOMINA` exige disfrute, y un disfrute de un solo día 31
      // vale 0 días comerciales, así que ninguna nómina lo pagaría.
      return (e as { motivo?: string }).motivo === 'DIA_31'
        ? 'Un disfrute de un solo día 31 no se puede pagar en nómina: ese día vale 0 en el mes comercial.'
        : 'Para pagar en nómina la liquidación tiene que incluir días de disfrute. Una compensación solo en dinero se paga desde el módulo.';
    case VacacionesErrorCodes.EMPLEADO_NO_ELEGIBLE:
      return 'Este colaborador no puede liquidar vacaciones.';
    case VacacionesErrorCodes.CONFIG_LEGAL_INCOMPLETA:
      return 'Faltan constantes legales del año. Complétalas en Configuración.';
    case VacacionesErrorCodes.LIQUIDACION_COBERTURA_INCOMPLETA:
      return e.message ?? 'No hay nóminas cerradas suficientes para calcular el promedio.';
    default:
      return e.message ?? 'No se pudo calcular la liquidación.';
  }
}
