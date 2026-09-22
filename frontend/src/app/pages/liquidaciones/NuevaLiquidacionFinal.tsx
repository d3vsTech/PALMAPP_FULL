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
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Calendar,
  Download,
  FileX,
  Info,
  Loader2,
  Save,
  User,
} from 'lucide-react';
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

/** Orden y textos de los cinco conceptos ajustables. */
const CONCEPTOS: Array<{ codigo: CodigoAjustable; titulo: string; descripcion: string }> = [
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
  },
  {
    codigo: 'VACACIONES',
    titulo: 'Vacaciones compensadas',
    descripcion: 'Todo el saldo, incluida la fracción del año en curso.',
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
        navigate('/liquidaciones');
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

  if (cargandoEdicion) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Paso 1: elegir el tipo ─────────────────────────────────────────────────
  if (!tipo) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Liquidaciones
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Nueva Liquidación</h1>
            <p className="mt-1 text-muted-foreground">Elija qué necesita hacer</p>
          </div>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Tipo de Liquidación</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setTipo('SIMULACION')}
                className="rounded-lg border-2 border-border p-6 text-left transition-all hover:border-primary hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Calculator className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-semibold">Estado de cuenta</h3>
                    <p className="text-sm text-muted-foreground">
                      Cuánto lleva causado un colaborador que sigue trabajando. Es una consulta:
                      no se guarda ni se paga.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipo('FINAL')}
                disabled={!puedeCrear}
                className="rounded-lg border-2 border-border p-6 text-left transition-all hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
                    <FileX className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-semibold">Liquidación final</h3>
                    <p className="text-sm text-muted-foreground">
                      Para quien se retira. Incluye la indemnización cuando el motivo la genera.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Pagarle cesantías a un colaborador activo está prohibido salvo los casos del
              Decreto 1562 de 2019, así que el estado de cuenta no genera ningún pago.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Paso 2: formulario ─────────────────────────────────────────────────────
  const totales = preview?.totales;
  const bloqueantesDuros = (preview?.bloqueantes ?? []).filter((b) => !esBloqueanteForzable(b));
  const puedeGuardar =
    !esSimulacion && Boolean(preview) && bloqueantesDuros.length === 0 && !guardando;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (modoEdicion) {
              navigate(`/liquidaciones/liquidacion-final/${liquidacionId}`);
              return;
            }
            setTipo('');
            setColaborador(null);
            setFicha(null);
            f.reiniciar();
          }}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {modoEdicion ? 'Volver al comprobante' : 'Cambiar tipo'}
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary">
            {esSimulacion
              ? 'Estado de cuenta'
              : modoEdicion
                ? 'Editar liquidación'
                : 'Liquidación final'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {esSimulacion
              ? 'Consulta a una fecha. No se guarda ni constituye pago.'
              : 'Los valores los calcula el sistema con las nóminas cerradas del período.'}
          </p>
        </div>
      </div>

      {/* Colaborador */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Colaborador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
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
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cédula</p>
                  <p className="font-medium">{ficha.empleado.documento}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cargo</p>
                  <p className="font-medium">{ficha.empleado.cargo ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ingreso</p>
                  <p className="font-medium">{fmtFecha(ficha.empleado.fecha_ingreso)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de contrato</p>
                  <p className="font-medium">
                    {ficha.contrato
                      ? TIPO_CONTRATO_LABEL[ficha.contrato.tipo_contrato]
                      : 'Sin contrato'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Vacaciones sin tomar</p>
                  <p className="font-medium">{fmtDias(ficha.vacaciones.saldo_dias)} días</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Préstamos vigentes</p>
                  <p className="font-medium">{ficha.prestamos.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última nómina</p>
                  <p className="font-medium">
                    {ficha.nomina.ultima_nomina
                      ? `${ficha.nomina.ultima_nomina.estado.toLowerCase()} · ${fmtFecha(
                          ficha.nomina.ultima_nomina.fecha_fin,
                        )}`
                      : 'Sin nóminas'}
                  </p>
                </div>
              </div>

              {ficha.empleado.fecha_retiro && (
                <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  La ficha ya registra el retiro el {fmtFecha(ficha.empleado.fecha_retiro)}. La
                  liquidación debe usar esa misma fecha.
                </p>
              )}

              {ficha.advertencias.map((a, i) => (
                <p
                  key={`${a.code}-${i}`}
                  className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {a.mensaje}
                </p>
              ))}
            </div>
          )}

          {/* Datos del retiro */}
          {ficha && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {esSimulacion ? (
                <div className="space-y-2">
                  <Label htmlFor="fechaCorte">
                    Fecha de corte <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fechaCorte"
                      type="date"
                      value={f.form.fechaCorte}
                      onChange={(e) => f.setCampo('fechaCorte', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fechaRetiro">
                      Fecha de retiro <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fechaRetiro"
                        type="date"
                        value={f.form.fechaRetiro}
                        onChange={(e) => f.setCampo('fechaRetiro', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motivoRetiro">
                      Motivo de retiro <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="motivoRetiro"
                      value={f.form.motivoRetiro}
                      onChange={(e) =>
                        f.setCampo('motivoRetiro', e.target.value as MotivoRetiroCodigo)
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Seleccione un motivo...</option>
                      {ficha.motivos.map((m) => (
                        <option key={m.codigo} value={m.codigo}>
                          {m.etiqueta}
                          {m.indemniza ? ' (con indemnización)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipoContrato">Tipo de contrato</Label>
                    <select
                      id="tipoContrato"
                      value={f.form.tipoContrato}
                      onChange={(e) => f.setCampo('tipoContrato', e.target.value as TipoContrato)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {(Object.keys(TIPO_CONTRATO_LABEL) as TipoContrato[]).map((t) => (
                        <option key={t} value={t}>
                          {TIPO_CONTRATO_LABEL[t]}
                        </option>
                      ))}
                    </select>
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
                      <Label htmlFor="motivoOverride">
                        Motivo del cambio de contrato <span className="text-destructive">*</span>
                      </Label>
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
        </CardContent>
      </Card>

      {/* Conceptos */}
      {ficha && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              Conceptos
              {cargandoPreview && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {errorPreview && (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {errorPreview}
              </p>
            )}

            {!preview && !errorPreview && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {esSimulacion
                  ? 'Elija la fecha de corte para ver el estado de cuenta.'
                  : 'Elija la fecha y el motivo del retiro para ver el cálculo.'}
              </p>
            )}

            {preview &&
              CONCEPTOS.map(({ codigo, titulo, descripcion }) => {
                const concepto = preview.conceptos.devengados.find((c) => c.codigo === codigo);
                // La indemnización solo existe con los motivos que la generan.
                const oculto = codigo === 'INDEMNIZACION' && !concepto;
                return (
                  <BloqueConcepto
                    key={codigo}
                    codigo={codigo}
                    titulo={titulo}
                    descripcion={descripcion}
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
          </CardContent>
        </Card>
      )}

      {/* Captura manual: solo en la liquidación real */}
      {ficha && !esSimulacion && (
        <>
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Devengados adicionales</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <PanelDevengadosManuales
                items={f.devengados}
                onAgregar={f.agregarDevengado}
                onEditar={f.editarDevengado}
                onQuitar={f.quitarDevengado}
                yaHaySalarioPendiente={f.devengados.some((d) => d.codigo === 'SALARIO_PENDIENTE')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Deducciones</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
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
            </CardContent>
          </Card>
        </>
      )}

      {/* Total y acciones */}
      {preview && totales && (
        <Card className="border-primary/30">
          <CardContent className="space-y-4 p-6">
            {preview.marca && (
              <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                <Info className="h-4 w-4" />
                {preview.marca}
              </p>
            )}

            {preview.bloqueantes.map((b, i) => (
              <p
                key={`${b.code}-${i}`}
                className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  esBloqueanteForzable(b)
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                    : 'border-destructive/30 bg-destructive/5 text-destructive'
                }`}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {b.mensaje}
                  {esBloqueanteForzable(b) && ' Se puede continuar al aprobar, con un motivo.'}
                </span>
              </p>
            ))}

            {preview.advertencias.map((a, i) => (
              <p
                key={`${a.code}-${i}`}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                {a.mensaje}
              </p>
            ))}

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total devengado</span>
                <span className="font-medium">{fmtCOP(totales.total_devengado)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total deducciones</span>
                <span className="font-medium text-destructive">
                  {totales.total_deducciones > 0 ? '−' : ''}
                  {fmtCOP(totales.total_deducciones)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold">Neto a pagar</span>
                <span className="text-2xl font-bold text-primary">{fmtCOP(totales.total_neto)}</span>
              </div>
            </div>

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

            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
              {esSimulacion ? (
                <Button onClick={() => void descargarSimulacion()} disabled={descargando} className="gap-2">
                  {descargando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Descargar estado de cuenta
                </Button>
              ) : (
                <Button onClick={() => void guardar()} disabled={!puedeGuardar} className="gap-2">
                  {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {modoEdicion ? 'Guardar cambios' : 'Guardar borrador'}
                </Button>
              )}
            </div>

            {!esSimulacion && bloqueantesDuros.length > 0 && (
              <p className="text-right text-xs text-muted-foreground">
                Resuelva los puntos en rojo para poder guardar.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
