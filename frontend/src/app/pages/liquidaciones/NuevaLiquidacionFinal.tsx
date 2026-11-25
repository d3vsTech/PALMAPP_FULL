/**
 * Pantalla 5 — Nueva liquidación final (API_LIQUIDACIONES §11.4, §11.6, §11.9).
 *
 * Dos caminos desde la misma vista:
 *  - FINAL: liquida un retiro y se guarda como borrador.
 *  - SIMULACION: estado de cuenta a una fecha de corte. No se guarda ni se
 *    paga, porque pagarle cesantías a alguien activo está prohibido (CST 254).
 *
 * Todos los valores salen del preview del backend. Aquí no se multiplica nada.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  ChevronRight,
  Download,
  FileX,
  Info,
  Loader2,
  Save,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SeccionCard from '../../components/liquidaciones/SeccionCard';
import DatoLista from '../../components/liquidaciones/DatoLista';
import ConceptosTabla from '../../components/liquidaciones/ConceptosTabla';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  liquidacionFinalApi,
  esBloqueanteForzable,
  type CodigoAjustable,
  type ColaboradorLiquidable,
  type FichaColaboradorLiquidacion,
  type MotivoRetiroCodigo,
  type TipoContrato,
  type TipoLiquidacionFinal,
  TIPO_CONTRATO_LABEL,
} from '../../../api/liquidacionFinal';
import { descargarBlob, fmtCOP, fmtDias, fmtFecha, mensajeErrorLiquidacion } from './final/comunes';
import { BloqueConcepto, CAMPOS_AJUSTE } from './final/BloqueConcepto';
import { PanelDeducciones, PanelDevengadosManuales } from './final/PanelesCaptura';
import { TablaColaboradores } from './final/TablaColaboradores';
import { useFormularioLiquidacion } from './final/useFormularioLiquidacion';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';

/** Orden y textos de los cinco conceptos ajustables. */
const CONCEPTOS: Array<{
  codigo: CodigoAjustable;
  titulo: string;
  descripcion: string;
  unidadDias?: string;
}> = [
  {
    codigo: 'CESANTIAS',
    titulo: 'Cesantías',
    descripcion: 'Lo causado desde el último corte hasta el retiro.',
  },
  {
    codigo: 'INTERESES_CESANTIAS',
    titulo: 'Intereses de cesantías',
    descripcion: '12 % anual sobre la cesantía liquidada.',
  },
  {
    codigo: 'PRIMA',
    titulo: 'Prima de servicios',
    descripcion: 'Proporcional al semestre en curso, sea cual sea el motivo del retiro.',
    unidadDias: 'días del semestre',
  },
  {
    codigo: 'VACACIONES',
    titulo: 'Vacaciones compensadas',
    descripcion:
      'Días acumulados que se pagan en dinero, no días de descanso. Por eso llevan decimales.',
    unidadDias: 'días acumulados',
  },
  {
    codigo: 'INDEMNIZACION',
    titulo: 'Indemnización',
    descripcion: 'Solo con los motivos que la generan, según el tipo de contrato.',
  },
];

export default function NuevaLiquidacionFinal() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasPermiso } = useAuth();
  const puedeCrear = hasPermiso('liquidaciones.crear');

  // Con id en la ruta la pantalla edita un borrador; sin id, crea uno nuevo.
  const liquidacionId = id ? Number(id) : null;
  const modoEdicion = liquidacionId != null && Number.isFinite(liquidacionId);

  const [tipo, setTipo] = useState<TipoLiquidacionFinal | ''>(modoEdicion ? 'FINAL' : '');
  const [cargandoEdicion, setCargandoEdicion] = useState(modoEdicion);
  const [colaborador, setColaborador] = useState<ColaboradorLiquidable | null>(null);
  const [ficha, setFicha] = useState<FichaColaboradorLiquidacion | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [idCargando, setIdCargando] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const f = useFormularioLiquidacion(
    (tipo || 'FINAL') as TipoLiquidacionFinal,
    colaborador?.id ?? null,
  );
  const { preview, cargandoPreview, errorPreview } = f;
  const esSimulacion = tipo === 'SIMULACION';

  const seleccionar = useCallback(
    async (empleadoId: number) => {
      setIdCargando(empleadoId);
      setCargandoFicha(true);
      try {
        const data = await liquidacionFinalApi.ficha(empleadoId);

        // El estado de cuenta sí se puede consultar con una liquidación activa
        // (§11.9); la liquidación real no, porque es una por contrato.
        if (!esSimulacion && data.liquidacion_activa) {
          toast.error(
            `Este colaborador ya tiene la liquidación ${data.liquidacion_activa.numero_comprobante}. ` +
              'Anúlela si necesita rehacerla.',
          );
          return;
        }

        setColaborador({
          id: data.empleado.id,
          nombre_completo: data.empleado.nombre_completo,
          documento: data.empleado.documento,
          cargo: data.empleado.cargo,
          modalidad_pago: data.empleado.modalidad_pago,
          salario_base: data.empleado.salario_contractual ?? null,
          fecha_ingreso: data.empleado.fecha_ingreso ?? null,
          fecha_retiro: data.empleado.fecha_retiro,
          estado: true,
          contrato_vigente: null,
          liquidacion_activa: data.liquidacion_activa,
          elegible: true,
        });
        setFicha(data);
        f.precargarDesdeFicha(data);
      } catch (e) {
        toast.error(mensajeErrorLiquidacion(e, 'No se pudo cargar la ficha del colaborador'));
        setFicha(null);
      } finally {
        setCargandoFicha(false);
        setIdCargando(null);
      }
    },
    [f, esSimulacion],
  );

  // Modo edición: se carga el borrador, luego su ficha (préstamos y motivos)
  // y al final se rehidrata el formulario, en ese orden — la ficha reinicia
  // el estado y borraría lo guardado si llegara después.
  const hidratar = f.hidratarDesdeComprobante;
  const precargar = f.precargarDesdeFicha;
  useEffect(() => {
    if (!modoEdicion || liquidacionId == null) return;
    let vivo = true;
    (async () => {
      setCargandoEdicion(true);
      try {
        const guardada = await liquidacionFinalApi.ver(liquidacionId);
        if (!vivo) return;
        if (guardada.estado !== 'BORRADOR') {
          toast.error('Solo se puede editar una liquidación en borrador');
          navigate(`/liquidaciones/liquidacion-final/${liquidacionId}`);
          return;
        }
        const fichaGuardada = await liquidacionFinalApi.ficha(guardada.empleado.id);
        if (!vivo) return;
        setColaborador({
          id: guardada.empleado.id,
          nombre_completo: guardada.empleado.nombre_completo,
          documento: guardada.empleado.documento,
          cargo: guardada.empleado.cargo,
          modalidad_pago: guardada.empleado.modalidad_pago,
          salario_base: guardada.empleado.salario_contractual ?? null,
          fecha_ingreso: guardada.empleado.fecha_ingreso ?? null,
          fecha_retiro: guardada.retiro.fecha_retiro,
          estado: true,
          contrato_vigente: null,
          liquidacion_activa: null,
          elegible: true,
        });
        setFicha(fichaGuardada);
        precargar(fichaGuardada);
        hidratar(guardada);
      } catch (e) {
        if (!vivo) return;
        toast.error(mensajeErrorLiquidacion(e, 'No se pudo cargar la liquidación'));
        navigate('/liquidaciones?tab=liquidacion-final');
      } finally {
        if (vivo) setCargandoEdicion(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [modoEdicion, liquidacionId, navigate, precargar, hidratar]);

  const guardar = useCallback(async () => {
    const payload = f.construirPayload();
    if (!payload) return;
    setGuardando(true);
    try {
      const cuerpo = { ...payload, calculo_hash: preview?.calculo_hash ?? undefined };
      const res =
        modoEdicion && liquidacionId != null
          ? await liquidacionFinalApi.actualizar(liquidacionId, cuerpo)
          : await liquidacionFinalApi.crear(cuerpo);
      (res.advertencias ?? []).forEach((a) => toast.warning(a.mensaje));
      toast.success(modoEdicion ? 'Cambios guardados' : 'Liquidación guardada como borrador');
      navigate(`/liquidaciones/liquidacion-final/${res.data.id}`);
    } catch (e) {
      toast.error(mensajeErrorLiquidacion(e, 'No se pudo guardar la liquidación'));
    } finally {
      setGuardando(false);
    }
  }, [f, preview, navigate, modoEdicion, liquidacionId]);

  const descargarSimulacion = useCallback(async () => {
    const payload = f.construirPayload();
    if (!payload) return;
    setDescargando(true);
    try {
      const blob = await liquidacionFinalApi.simulacionPdf(payload);
      const doc = colaborador?.documento ?? 'colaborador';
      descargarBlob(blob, `estado_prestaciones_${doc}_${f.form.fechaCorte}.pdf`);
    } catch (e) {
      toast.error(mensajeErrorLiquidacion(e, 'No se pudo generar el PDF'));
    } finally {
      setDescargando(false);
    }
  }, [f, colaborador]);

  const volverListado = '/liquidaciones?tab=liquidacion-final';

  if (cargandoEdicion) {
    return (
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando la liquidación...
      </Card>
    );
  }

  // ── Paso 1: elegir el tipo ─────────────────────────────────────────────────
  if (!tipo) {
    const opciones = [
      {
        valor: 'SIMULACION' as const,
        icono: Calculator,
        titulo: 'Estado de cuenta',
        texto: 'Cuánto lleva causado un colaborador que sigue trabajando. Es una consulta: no se guarda ni se paga.',
        deshabilitado: false,
      },
      {
        valor: 'FINAL' as const,
        icono: FileX,
        titulo: 'Liquidación final',
        texto: 'Para quien se retira. Incluye la indemnización cuando el motivo la genera.',
        deshabilitado: !puedeCrear,
      },
    ];
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Liquidaciones"
          title="Nueva liquidación"
          description="Elija qué necesita hacer."
          backTo={volverListado}
        />

        <SeccionCard title="Tipo de liquidación">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {opciones.map(({ valor, icono: Icono, titulo, texto, deshabilitado }) => (
              <button
                key={valor}
                type="button"
                onClick={() => setTipo(valor)}
                disabled={deshabilitado}
                className="group flex items-start gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-transparent"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icono className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">{titulo}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{texto}</span>
                </span>
                <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" strokeWidth={2} />
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2 rounded-lg bg-info-soft p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={2} />
            <p className="text-sm text-foreground">
              Pagarle cesantías a un colaborador activo está prohibido salvo los casos del
              Decreto 1562 de 2019, así que el estado de cuenta no genera ningún pago.
            </p>
          </div>
        </SeccionCard>
      </div>
    );
  }

  // ── Paso 2: formulario ─────────────────────────────────────────────────────
  const totales = preview?.totales;
  const bloqueantesDuros = (preview?.bloqueantes ?? []).filter((b) => !esBloqueanteForzable(b));
  const puedeGuardar =
    !esSimulacion && Boolean(preview) && bloqueantesDuros.length === 0 && !guardando;
  const volverDesdeFormulario = modoEdicion
    ? `/liquidaciones/liquidacion-final/${liquidacionId}`
    : volverListado;

  const cambiarTipo = () => {
    setTipo('');
    setColaborador(null);
    setFicha(null);
    f.reiniciar();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={modoEdicion ? 'Liquidación final' : 'Nueva liquidación'}
        title={esSimulacion ? 'Estado de cuenta' : modoEdicion ? 'Editar liquidación' : 'Liquidación final'}
        description={
          esSimulacion
            ? 'Consulta a una fecha. No se guarda ni constituye pago.'
            : 'Los valores los calcula el sistema con las nóminas cerradas del período.'
        }
        backTo={volverDesdeFormulario}
        actions={
          modoEdicion ? undefined : (
            <Button variant="outline" onClick={cambiarTipo}>
              <ArrowLeft strokeWidth={2} />
              Cambiar tipo
            </Button>
          )
        }
      />

      <SeccionCard
        title="Colaborador"
        description={esSimulacion ? 'Elige el colaborador que vas a consultar.' : 'Elige el colaborador que vas a liquidar.'}
      >
        <div className="space-y-5">
          <TablaColaboradores
            seleccionado={colaborador}
            onSeleccionar={(empleadoId) => void seleccionar(empleadoId)}
            deshabilitado={modoEdicion}
            etiquetaAccion={esSimulacion ? 'Consultar' : 'Liquidar'}
            cargandoId={idCargando}
          />

          {cargandoFicha && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando la ficha...
            </div>
          )}

          {ficha && !cargandoFicha && (
            <div className="space-y-4 rounded-lg bg-muted/60 px-4 py-4">
              <DatoLista
                className="sm:grid-cols-4"
                items={[
                  { label: 'Cédula', value: ficha.empleado.documento },
                  { label: 'Cargo', value: ficha.empleado.cargo ?? '—' },
                  { label: 'Fecha de ingreso', value: fmtFecha(ficha.empleado.fecha_ingreso) },
                  {
                    label: 'Tipo de contrato',
                    value: ficha.contrato ? TIPO_CONTRATO_LABEL[ficha.contrato.tipo_contrato] : 'Sin contrato',
                  },
                ]}
              />
              <DatoLista
                className="border-t border-border pt-4 sm:grid-cols-3"
                items={[
                  { label: 'Vacaciones sin tomar', value: `${fmtDias(ficha.vacaciones.saldo_dias)} días` },
                  { label: 'Préstamos vigentes', value: ficha.prestamos.length },
                  {
                    label: 'Última nómina',
                    value: ficha.nomina.ultima_nomina
                      ? `${ficha.nomina.ultima_nomina.estado.toLowerCase()} · ${fmtFecha(ficha.nomina.ultima_nomina.fecha_fin)}`
                      : 'Sin nóminas',
                  },
                ]}
              />
            </div>
          )}

          {ficha && !cargandoFicha && (
            <div className="space-y-3 empty:hidden">
              {ficha.empleado.fecha_retiro && (
                <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                  <p className="text-sm text-foreground">
                    La ficha ya registra el retiro el {fmtFecha(ficha.empleado.fecha_retiro)}. La
                    liquidación debe usar esa misma fecha.
                  </p>
                </div>
              )}

              {ficha.advertencias.map((a, i) => (
                <div key={`${a.code}-${i}`} className="flex gap-2 rounded-lg bg-warning-soft p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                  <p className="text-sm text-foreground">{a.mensaje}</p>
                </div>
              ))}

              {/*
                * PR-L15 — Una vacación APROBADA sin pagar bloquea el retiro y
                * no es forzable. El mensaje del bloqueante no dice **cómo**
                * salir, y en `modo_pago = NOMINA` hay dos caminos: cerrar las
                * nóminas que cubren los tramos, o pagar el saldo a mano. Los
                * días que ninguna nómina cubre solo salen pagando el saldo.
                */}
              {(ficha.vacaciones.vacaciones_pendientes_pago ?? []).map((v) => (
                <div key={v.id} className="flex gap-2 rounded-lg bg-destructive-soft p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
                  <div className="space-y-1 text-sm text-foreground">
                    <p className="font-medium">
                      {v.numero_comprobante ?? `Vacación ${v.id}`} sin pagar
                      {v.pendiente != null && ` · falta ${fmtCOP(v.pendiente)}`}
                    </p>
                    {v.modo_pago === 'NOMINA' ? (
                      <div className="space-y-0.5 text-muted-foreground">
                        {(v.nominas_pendientes ?? []).map((n) => (
                          <p key={n.nomina_empleado_id ?? n.nomina_id}>
                            Cierre {n.etiqueta ?? `NOM-${n.nomina_id}`}
                            {n.estado_nomina && ` (${n.estado_nomina.toLowerCase()})`}
                          </p>
                        ))}
                        {(v.dias_sin_nomina ?? 0) > 0 && (
                          <p>
                            {v.dias_sin_nomina} día{v.dias_sin_nomina !== 1 ? 's' : ''} sin nómina
                            que los cubra: solo se resuelven pagando el saldo.
                          </p>
                        )}
                        {(v.nominas_pendientes?.length ?? 0) === 0 && (v.dias_sin_nomina ?? 0) === 0 && (
                          <p>Pague el saldo desde el histórico de vacaciones.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Páguela o anúlela antes de aprobar el retiro.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Datos del retiro */}
          {ficha && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {esSimulacion ? (
                <div className="space-y-2">
                  <Label htmlFor="fechaCorte">Fecha de corte *</Label>
                  <Input
                    id="fechaCorte"
                    type="date"
                    value={f.form.fechaCorte}
                    onChange={(e) => f.setCampo('fechaCorte', e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fechaRetiro">Fecha de retiro *</Label>
                    <Input
                      id="fechaRetiro"
                      type="date"
                      value={f.form.fechaRetiro}
                      onChange={(e) => f.setCampo('fechaRetiro', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motivoRetiro">Motivo de retiro *</Label>
                    <Select
                      value={f.form.motivoRetiro}
                      onValueChange={(valor) =>
                        f.setCampo('motivoRetiro', valor as MotivoRetiroCodigo)
                      }
                    >
                      <SelectTrigger id="motivoRetiro">
                        <SelectValue placeholder="Selecciona un motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {ficha.motivos.map((m) => (
                          <SelectItem key={m.codigo} value={m.codigo}>
                            {m.etiqueta}
                            {m.indemniza ? ' (con indemnización)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipoContrato">Tipo de contrato</Label>
                    <Select
                      value={f.form.tipoContrato}
                      onValueChange={(valor) => f.setCampo('tipoContrato', valor as TipoContrato)}
                    >
                      <SelectTrigger id="tipoContrato">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TIPO_CONTRATO_LABEL) as TipoContrato[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {TIPO_CONTRATO_LABEL[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Viene del contrato. Cambiarlo exige un motivo.
                    </p>
                  </div>

                  {f.form.tipoContrato === 'TERMINO_FIJO' && (
                    <div className="space-y-2">
                      <Label htmlFor="fechaFinPactada">Fecha de fin pactada</Label>
                      <Input
                        id="fechaFinPactada"
                        type="date"
                        value={f.form.fechaFinPactada}
                        onChange={(e) => f.setCampo('fechaFinPactada', e.target.value)}
                      />
                    </div>
                  )}

                  {f.form.tipoContrato !== (ficha.contrato?.tipo_contrato ?? 'INDEFINIDO') && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="motivoOverride">Motivo del cambio de contrato *</Label>
                      <Input
                        id="motivoOverride"
                        value={f.form.motivoOverride}
                        onChange={(e) => f.setCampo('motivoOverride', e.target.value)}
                        placeholder="Por qué el contrato registrado no corresponde"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="diasIndemnizacion">Días de indemnización</Label>
                    <Input
                      id="diasIndemnizacion"
                      type="number"
                      value={f.form.diasIndemnizacion}
                      onChange={(e) => f.setCampo('diasIndemnizacion', e.target.value)}
                      placeholder="Se calculan solos"
                    />
                    <p className="text-xs text-muted-foreground">
                      Solo hace falta en obra o labor, contrato vencido sin renovar, o vínculos
                      anteriores a 1993.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </SeccionCard>

      {/* Conceptos */}
      {ficha && (
        <SeccionCard
          title={
            <span className="flex items-center gap-2">
              Conceptos de liquidación
              {cargandoPreview && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </span>
          }
          description="El sistema calcula cada concepto. Ajústelo a mano solo si hace falta."
          contentClassName="space-y-6"
        >
          {errorPreview && (
            <div className="flex gap-2 rounded-lg bg-destructive-soft p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
              <p className="text-sm text-foreground">{errorPreview}</p>
            </div>
          )}

          {!preview && !errorPreview && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {esSimulacion
                ? 'Elija la fecha de corte para ver el estado de cuenta.'
                : 'Elija la fecha y el motivo del retiro para ver el cálculo.'}
            </p>
          )}

          {preview &&
            CONCEPTOS.map(({ codigo, titulo, descripcion, unidadDias }) => {
              const concepto = preview.conceptos.devengados.find((c) => c.codigo === codigo);
              // La indemnización solo existe con los motivos que la generan.
              const oculto = codigo === 'INDEMNIZACION' && !concepto;
              return (
                <BloqueConcepto
                  key={codigo}
                  codigo={codigo}
                  titulo={titulo}
                  descripcion={descripcion}
                  unidadDias={unidadDias}
                  campos={CAMPOS_AJUSTE[codigo]}
                  concepto={concepto}
                  ajuste={f.ajustes[codigo]}
                  onAjuste={(campo, valor) => f.setAjuste(codigo, campo, valor)}
                  onLimpiar={() => f.limpiarAjuste(codigo)}
                  oculto={oculto}
                  soloLectura={esSimulacion}
                />
              );
            })}
        </SeccionCard>
      )}

      {/* Captura manual: solo en la liquidación real */}
      {ficha && !esSimulacion && (
        <>
          <SeccionCard
            title="Devengados adicionales"
            description="El salario del último período lo paga la nómina. Agréguelo aquí solo si esa nómina no lo va a cubrir, o se pagaría dos veces."
          >
            <PanelDevengadosManuales
              items={f.devengados}
              onAgregar={f.agregarDevengado}
              onEditar={f.editarDevengado}
              onQuitar={f.quitarDevengado}
              yaHaySalarioPendiente={f.devengados.some((d) => d.codigo === 'SALARIO_PENDIENTE')}
            />
          </SeccionCard>

          <SeccionCard title="Deducciones">
            <PanelDeducciones
              seguridadSocial={f.form.seguridadSocial}
              onSeguridadSocial={(v) => f.setCampo('seguridadSocial', v)}
              prestamos={ficha.prestamos}
              seleccion={f.form.prestamos}
              onPrestamo={(id, descontar) =>
                f.setCampo('prestamos', { ...f.form.prestamos, [id]: descontar })
              }
              autorizacionEscrita={f.form.autorizacionEscrita}
              onAutorizacion={(v) => f.setCampo('autorizacionEscrita', v)}
              otras={f.otrasDeducciones}
              onAgregarOtra={f.agregarOtraDeduccion}
              onEditarOtra={f.editarOtraDeduccion}
              onQuitarOtra={f.quitarOtraDeduccion}
            />
          </SeccionCard>
        </>
      )}

      {/* Total y acciones */}
      {preview && totales && (
        <>
          {/* Bloqueantes y avisos solo en la liquidación real: son las
              barandas de aprobar. El estado de cuenta no aprueba nada. */}
          {!esSimulacion && (
            <div className="space-y-3 empty:hidden">
              {preview.bloqueantes.map((b, i) => {
                const forzable = esBloqueanteForzable(b);
                return (
                  <div
                    key={`${b.code}-${i}`}
                    className={`flex gap-2 rounded-lg p-3 ${forzable ? 'bg-warning-soft' : 'bg-destructive-soft'}`}
                  >
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${forzable ? 'text-warning' : 'text-destructive'}`}
                      strokeWidth={2}
                    />
                    <p className="text-sm text-foreground">
                      {b.mensaje}
                      {forzable && ' Se puede continuar al aprobar, con un motivo.'}
                    </p>
                  </div>
                );
              })}
              {preview.advertencias.map((a, i) => (
                <div key={`${a.code}-${i}`} className="flex gap-2 rounded-lg bg-muted/60 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                  <p className="text-sm text-foreground">{a.mensaje}</p>
                </div>
              ))}
            </div>
          )}

          <SeccionCard title="Resumen" contentClassName="space-y-5">
            <ConceptosTabla
              items={[
                { label: 'Total devengado', valor: fmtCOP(totales.total_devengado) },
                {
                  label: 'Total deducciones',
                  valor: fmtCOP(totales.total_deducciones),
                  negativo: totales.total_deducciones > 0,
                },
                { label: 'Neto a pagar', valor: fmtCOP(totales.total_neto), total: true },
              ]}
            />

            {!esSimulacion && (
              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={f.form.observaciones}
                  onChange={(e) => f.setCampo('observaciones', e.target.value)}
                  placeholder="Notas que quedan en el comprobante"
                  rows={2}
                />
              </div>
            )}
          </SeccionCard>

          <div className="space-y-2">
            <div className="barra-acciones flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => navigate(volverDesdeFormulario)}>
                Cancelar
              </Button>
              {esSimulacion ? (
                <Button onClick={() => void descargarSimulacion()} disabled={descargando}>
                  {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download strokeWidth={2} />}
                  Descargar estado de cuenta
                </Button>
              ) : (
                <Button onClick={() => void guardar()} disabled={!puedeGuardar}>
                  {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save strokeWidth={2} />}
                  {modoEdicion ? 'Guardar cambios' : 'Guardar borrador'}
                </Button>
              )}
            </div>

            {!esSimulacion && bloqueantesDuros.length > 0 && (
              <p className="text-right text-xs text-muted-foreground">
                Resuelva los puntos en rojo para poder guardar.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
