/**
 * Comprobante de vacaciones (API_LIQUIDACIONES §10.8 a §10.11).
 *
 * Se lee del comprobante persistido: nunca se recalcula. Lo que se pagó es
 * lo que quedó firmado el día de la liquidación, aunque hoy el salario o los
 * parámetros sean otros.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Banknote, Printer, Download, Loader2, AlertTriangle, Ban, RotateCcw, Info, Scissors, CalendarX, FileText, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  vacacionesApi,
  VacacionesErrorCodes,
  ADVERTENCIA_PAGO_NOMINA_LABEL,
  DIA_NO_HABIL_LABEL,
  MODO_PAGO_LABEL,
  type ComprobanteVacaciones,
  type VacacionItem,
} from '../../../api/vacaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';
import {
  ESTADO_VACACION_LABEL, ESTADO_VACACION_VARIANTE, MODO_PAGO_VARIANTE, ORIGEN_LABEL,
  descargarBlob, fmtCOP, fmtDias,
} from './vacaciones/comunes';
import { imprimirPdf } from '../../lib/pdf/imprimirPdf';
import PagoVacacionDialog from './vacaciones/PagoVacacionDialog';
import AnularVacacionDialog, { type ModoAnulacion } from './vacaciones/AnularVacacionDialog';
import {
  InterrumpirVacacionDialog,
  montoDeducciones,
} from '../../components/vacaciones/InterrumpirVacacionDialog';
import { MarcarReintegroDialog } from '../../components/vacaciones/MarcarReintegroDialog';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import SeccionCard from '../../components/liquidaciones/SeccionCard';
import DatoLista from '../../components/liquidaciones/DatoLista';
import ConceptosTabla, { type Concepto } from '../../components/liquidaciones/ConceptosTabla';
import VacioCard from '../../components/liquidaciones/VacioCard';
import { METODO_PAGO_LABEL } from './periodo/textos';

const VOLVER = '/liquidaciones/vacaciones/historico';

export default function VacacionesDetalle() {
  const { id } = useParams<{ id: string }>();
  const vacacionId = Number(id) || 0;

  const [comprobante, setComprobante] = useState<ComprobanteVacaciones | null>(null);
  const [item, setItem] = useState<VacacionItem | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [pagoAbierto, setPagoAbierto] = useState(false);
  /** `null` = ningún diálogo de anulación abierto. */
  const [modoAnular, setModoAnular] = useState<ModoAnulacion | null>(null);
  /** CST art. 188: el colaborador volvió antes y el disfrute se acorta. */
  const [interrumpirAbierto, setInterrumpirAbierto] = useState(false);
  const [reintegroAbierto, setReintegroAbierto] = useState(false);
  /** Como el diseño: abre en resumen de una columna; "Ver detalle" abre la vista completa. */
  const [verDetalle, setVerDetalle] = useState(false);
  const reqIdRef = useRef(0);

  const cargar = () => {
    if (!vacacionId) { setCargando(false); return; }
    const reqId = ++reqIdRef.current;
    setCargando(true);
    Promise.all([vacacionesApi.comprobante(vacacionId), vacacionesApi.ver(vacacionId)])
      .then(([comp, ver]) => {
        if (reqId !== reqIdRef.current) return;
        setComprobante(comp.data);
        setItem(ver.data);
      })
      .catch((err) => {
        if (reqId !== reqIdRef.current) return;
        const e = err as ApiError;
        if (e.code === VacacionesErrorCodes.VACACION_NO_ENCONTRADA) {
          toast.error('Esa liquidación de vacaciones no existe');
        } else {
          toast.error(e.message ?? 'No se pudo cargar el comprobante');
        }
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setCargando(false);
      });
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacacionId]);

  /**
   * El mismo PDF sirve para bajar y para imprimir: `accion` decide si se
   * guarda como archivo o si va al diálogo de impresión.
   */
  const pedirPdf = async (accion: 'descargar' | 'imprimir') => {
    if (!item) return;
    setDescargando(true);
    try {
      const blob = await vacacionesApi.comprobantePdf(item.id);
      if (accion === 'imprimir') {
        imprimirPdf(blob);
        return;
      }
      descargarBlob(blob, `vacaciones_${item.empleado.documento}_${item.numero_comprobante}.pdf`);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo obtener el comprobante');
    } finally {
      setDescargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="space-y-6">
        <PageHeader title="Liquidación de vacaciones" backTo={VOLVER} />
        <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando comprobante...
        </Card>
      </div>
    );
  }

  if (!comprobante || !item) {
    return (
      <div className="space-y-6">
        <PageHeader title="Liquidación de vacaciones" backTo={VOLVER} />
        <VacioCard
          icon={CalendarX}
          title="No se encontró la información de vacaciones"
          description="El registro no existe o ya no está disponible."
          action={
            <Button variant="outline" asChild>
              <Link to={VOLVER}>Volver al histórico</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const estado = item.estado;
  const res = comprobante.resultado;
  const cal = comprobante.calendario;
  const esHistorico = item.origen === 'HISTORICO';

  /*
   * PR-L15 - En `modo_pago = NOMINA` el modulo no gira nada: cada nomina que
   * cubre el disfrute paga su tramo al cerrarse, `total_pagado` va subiendo y
   * `pendiente` es lo que falta. Con tramos ya pagados la liquidacion deja de
   * ser anulable desde aqui.
   */
  const porNomina = item.modo_pago === 'NOMINA';

  /*
   * v1.11 (ajuste A) - En DIRECTO el comprobante descuenta salud, pension y
   * FSP sobre el disfrute y gira el neto; `valor_total` sigue siendo el bruto
   * (lo que entra a nomina, cesantias, prima y liquidacion final). En NOMINA
   * y en lo liquidado antes de v1.11 las deducciones llegan en cero.
   */
  const totalDeducciones = res.deducciones?.total ?? 0;
  const valorNeto = res.valor_neto ?? res.valor_total;
  const pagadoEnNomina = item.pago.total_pagado ?? 0;

  /*
   * v1.14 (§10.16) - Se interrumpe una vacación del sistema con disfrute,
   * APROBADA o PAGADA, y una sola vez. Sin disfrute (solo dinero), histórica,
   * pendiente o cancelada, no hay nada que acortar.
   */
  const interrupcion = item.interrupcion ?? null;
  const fueInterrumpida = Boolean(item.interrumpida);
  const sePuedeInterrumpir = !esHistorico
    && !fueInterrumpida
    && item.fecha_inicio != null
    && (estado === 'APROBADA' || estado === 'PAGADA');
  const reintegro = interrupcion?.reintegro ?? null;
  const puedePagar = estado === 'APROBADA' && !esHistorico;
  // El pago que completo una nomina cerrada no se devuelve desde aqui: hay
  // que reabrir esa nomina (409 VACACION_PAGO_POR_NOMINA).
  const puedeAnularPago = estado === 'PAGADA' && item.pago.metodo_pago !== 'NOMINA';
  const puedeAnular = estado !== 'CANCELADA' && !(porNomina && pagadoEnNomina > 0);

  const encabezado = (
    <PageHeader
      eyebrow="Vacaciones"
      title={comprobante.empleado.nombre_completo}
      description={verDetalle ? 'Detalle de la liquidación de vacaciones.' : 'Resumen de la liquidación de vacaciones.'}
      backTo={VOLVER}
    />
  );

  const alertas = (
        <div className="space-y-4 empty:hidden">
          {estado === 'CANCELADA' && (
            <div className="flex gap-2 rounded-lg bg-destructive-soft p-3">
              <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
              <p className="text-sm text-foreground">
                Liquidación anulada. Los días volvieron al saldo del colaborador.
                {typeof comprobante.anulacion?.motivo === 'string' && ` Motivo: ${comprobante.anulacion.motivo}`}
              </p>
            </div>
          )}

          {fueInterrumpida && interrupcion && (
            <AvisoInterrupcion
              interrupcion={interrupcion}
              onMarcarReintegro={() => setReintegroAbierto(true)}
            />
          )}

          {comprobante.advertencias.length > 0 && (
            <div className="space-y-1.5 rounded-lg bg-warning-soft p-3">
              {comprobante.advertencias.map((a, i) => (
                <p key={`${a.code}-${i}`} className="flex gap-2 text-sm text-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                  {a.mensaje ?? a.code}
                </p>
              ))}
            </div>
          )}
        </div>
  );

  /*
   * El contrato no trae un campo "tipo de vacaciones": lo dice la mezcla de
   * días. Solo dinero es compensación (CST 189); solo calendario, disfrute.
   */
  const tipoLiquidacion = res.dias_calendario > 0
    ? (res.dias_dinero > 0 ? 'Disfrute y compensación en dinero' : 'Vacaciones laborales')
    : 'Vacaciones compensadas en dinero';

  const tarjetaColaborador = (
    <SeccionCard
      title={verDetalle ? 'Colaborador y período' : 'Colaborador'}
      description={verDetalle ? 'Datos tomados del comprobante de vacaciones.' : undefined}
    >
      <div className="space-y-6">
        <DatoLista
          items={[
            { label: 'Nombre completo', value: comprobante.empleado.nombre_completo },
            { label: 'Cédula', value: comprobante.empleado.documento },
            { label: 'Cargo', value: comprobante.empleado.cargo ?? 'Sin cargo' },
            { label: 'Fecha de ingreso', value: formatFecha(comprobante.empleado.fecha_ingreso) },
            { label: 'Tipo', value: tipoLiquidacion },
            { label: 'Comprobante', value: item.numero_comprobante },
            { label: 'Fecha de liquidación', value: formatFecha(comprobante.fechas.fecha_liquidacion) },
            { label: 'Estado', value: <Badge variant={ESTADO_VACACION_VARIANTE[estado]}>{ESTADO_VACACION_LABEL[estado]}</Badge> },
            {
              label: 'Período',
              value: cal ? `${formatFecha(cal.fecha_inicio)} – ${formatFecha(cal.fecha_fin)}` : 'Sin disfrute',
            },
          ]}
        />
        {cal && cal.dias_no_habiles.length > 0 && (
          <p className="text-xs text-muted-foreground">
            No hábiles en el rango:{' '}
            {cal.dias_no_habiles
              .map((d) => `${formatFecha(d.fecha)} (${DIA_NO_HABIL_LABEL[d.motivo]})`)
              .join(', ')}
          </p>
        )}
      </div>
    </SeccionCard>
  );

  /*
   * Los cuatro indicadores van siempre, también en una compensación solo en
   * dinero: un cero dice más que una tarjeta que desaparece. El saldo que
   * queda después solo lo trae el comprobante de las liquidadas aquí.
   */
  const estadisticas = (
    <StatStrip
      items={[
        { label: 'Días de disfrute', value: fmtDias(res.dias_disfrute), unit: 'hábiles' },
        { label: 'Días calendario pagados', value: fmtDias(res.dias_calendario), unit: 'días' },
        { label: 'Días en dinero', value: fmtDias(res.dias_dinero), unit: 'días' },
        {
          label: 'Días pendientes',
          value: comprobante.saldo ? fmtDias(comprobante.saldo.dias_disponibles_exigibles_despues) : '—',
          unit: comprobante.saldo ? 'días' : undefined,
          note: comprobante.saldo ? 'Saldo exigible después de esta liquidación' : undefined,
        },
      ]}
    />
  );

  const calculo = (
    <SeccionCard
      title={verDetalle ? 'Componentes salariales' : 'Cálculo de la compensación'}
      description={res.formula_aplicada || 'Base para el cálculo de la compensación.'}
    >
      <DetalleValores comprobante={comprobante} />
    </SeccionCard>
  );

  const dialogos = (
    <>
    {/* ── Diálogos ─────────────────────────────────────────────────────── */}
    <PagoVacacionDialog
      vacacion={pagoAbierto ? item : null}
      onCerrar={() => setPagoAbierto(false)}
      onPagada={() => cargar()}
    />

    <AnularVacacionDialog
      vacacion={modoAnular ? item : null}
      modo={modoAnular ?? 'pago'}
      onCerrar={() => setModoAnular(null)}
      onAnulada={() => cargar()}
    />

    <InterrumpirVacacionDialog
      vacacionId={interrumpirAbierto ? item.id : null}
      comprobante={item.numero_comprobante}
      onClose={() => setInterrumpirAbierto(false)}
      onInterrumpida={() => cargar()}
    />

    <MarcarReintegroDialog
      vacacionId={reintegroAbierto ? item.id : null}
      neto={reintegro?.neto}
      onClose={() => setReintegroAbierto(false)}
      onMarcado={() => cargar()}
    />
    </>
  );

  // Vista inicial, como el diseño: una columna y las acciones al pie.
  if (!verDetalle) {
    return (
      <div className="space-y-6">
        {encabezado}
        {alertas}
        {tarjetaColaborador}
        {estadisticas}
        {calculo}
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end print:hidden">
          <Button variant="ghost" className="sm:mr-auto" onClick={() => setVerDetalle(true)}>
            <FileText strokeWidth={2} />
            Ver detalle
          </Button>
          <Button variant="outline" onClick={() => void pedirPdf('imprimir')} disabled={descargando}>
            <Printer strokeWidth={2} />
            Imprimir
          </Button>
          <Button variant="outline" onClick={() => void pedirPdf('descargar')} disabled={descargando}>
            {descargando ? <Loader2 className="animate-spin" /> : <Download strokeWidth={2} />}
            Descargar PDF
          </Button>
          {puedePagar && (
            <Button onClick={() => setPagoAbierto(true)}>
              <Banknote strokeWidth={2} />
              {porNomina ? 'Pagar el saldo' : 'Registrar pago'}
            </Button>
          )}
        </div>
        {dialogos}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {encabezado}
      {alertas}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {tarjetaColaborador}

          {estadisticas}

          {calculo}

          {comprobante.periodos_afectados.length > 0 && (
            <SeccionCard title="Períodos de causación consumidos" contentClassName="px-0 py-0 sm:px-0">
              <PeriodosConsumidos periodos={comprobante.periodos_afectados} />
            </SeccionCard>
          )}

          {comprobante.seguridad_social && (
            <SeccionCard title="Seguridad social" description="Informativa: no cambia el valor liquidado.">
              <div className="space-y-4">
                <DatoLista
                  className="sm:grid-cols-3"
                  items={[
                    { label: 'IBC', value: fmtCOP(comprobante.seguridad_social.ibc) },
                    { label: 'Salud trabajador', value: fmtCOP(comprobante.seguridad_social.salud_trabajador) },
                    { label: 'Pensión trabajador', value: fmtCOP(comprobante.seguridad_social.pension_trabajador) },
                  ]}
                />
                <div className="flex gap-2 rounded-lg bg-info-soft p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={2} />
                  <p className="text-sm text-foreground">{comprobante.seguridad_social.nota}</p>
                </div>
              </div>
            </SeccionCard>
          )}

          <SeccionCard title="Pago">
            <DetallePago item={item} esHistorico={esHistorico} />
          </SeccionCard>

          {(comprobante.metodo_liquidacion || comprobante.observacion) && (
            <div className="space-y-2 text-sm text-muted-foreground">
              {comprobante.metodo_liquidacion && (
                <>
                  <p>{comprobante.metodo_liquidacion.texto}</p>
                  {comprobante.metodo_liquidacion.normas.length > 0 && (
                    <p className="text-xs">{comprobante.metodo_liquidacion.normas.join(' · ')}</p>
                  )}
                </>
              )}
              {comprobante.observacion && (
                <p>
                  <span className="font-medium text-foreground">Observación: </span>
                  {comprobante.observacion}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <SeccionCard title="Resumen" className="lg:sticky lg:top-6">
            <div className="space-y-5">
              <ConceptosTabla
                items={[
                  /* Las dos líneas de días van siempre, como en el diseño. */
                  { label: 'Días de disfrute', valor: `${fmtDias(res.dias_disfrute)} hábiles` },
                  { label: 'Días calendario pagados', valor: `${fmtDias(res.dias_calendario)} días` },
                  { label: 'Días en dinero', valor: `${fmtDias(res.dias_dinero)} días` },
                  { label: totalDeducciones > 0 ? 'Total devengado' : 'Total', valor: fmtCOP(res.valor_total), total: totalDeducciones === 0 },
                  ...(totalDeducciones > 0
                    ? [
                        { label: 'Deducciones', valor: fmtCOP(totalDeducciones), negativo: true },
                        { label: 'Neto a pagar', valor: fmtCOP(valorNeto), total: true },
                      ]
                    : []),
                ]}
              />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant={ESTADO_VACACION_VARIANTE[estado]}>{ESTADO_VACACION_LABEL[estado]}</Badge>
                </div>
                {esHistorico && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Origen</span>
                    <Badge variant="outline">{ORIGEN_LABEL.HISTORICO}</Badge>
                  </div>
                )}
                {/* PR-L15 - Quien pone la plata: el modulo o cada nomina. */}
                {!esHistorico && estado !== 'PENDIENTE' && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Pago</span>
                    <Badge variant={MODO_PAGO_VARIANTE[item.modo_pago ?? 'DIRECTO']}>
                      {MODO_PAGO_LABEL[item.modo_pago ?? 'DIRECTO']}
                    </Badge>
                  </div>
                )}
                {fueInterrumpida && interrupcion && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Interrumpida</span>
                    <Badge variant="warning">{formatFecha(interrupcion.fecha_reintegro)}</Badge>
                  </div>
                )}
              </div>
              <div className="space-y-2 border-t border-border pt-4 print:hidden">
                <Button variant="outline" onClick={() => setVerDetalle(false)} className="w-full">
                  <ArrowLeft strokeWidth={2} />
                  Ver resumen
                </Button>
                {puedePagar && (
                  <Button onClick={() => setPagoAbierto(true)} className="w-full">
                    <Banknote strokeWidth={2} />
                    {/* En NOMINA el giro solo cubre lo que las nominas no pagaron. */}
                    {porNomina ? 'Pagar el saldo' : 'Registrar pago'}
                  </Button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => void pedirPdf('descargar')} disabled={descargando} aria-label="Descargar PDF">
                    {descargando ? <Loader2 className="animate-spin" /> : <Download strokeWidth={2} />}
                    <span className="hidden sm:inline lg:hidden xl:inline">PDF</span>
                  </Button>
                  <Button variant="outline" onClick={() => void pedirPdf('imprimir')} disabled={descargando} aria-label="Imprimir">
                    <Printer strokeWidth={2} />
                    <span className="hidden sm:inline lg:hidden xl:inline">Imprimir</span>
                  </Button>
                </div>
                {sePuedeInterrumpir && (
                  <Button variant="outline" onClick={() => setInterrumpirAbierto(true)} className="w-full">
                    <Scissors strokeWidth={2} />
                    Interrumpir disfrute
                  </Button>
                )}
                {puedeAnularPago && (
                  <Button variant="ghost" onClick={() => setModoAnular('pago')} className="w-full">
                    <RotateCcw strokeWidth={2} />
                    Anular pago
                  </Button>
                )}
                {puedeAnular && (
                  <Button
                    variant="ghost"
                    onClick={() => setModoAnular('liquidacion')}
                    className="w-full text-muted-foreground hover:text-destructive"
                  >
                    <Ban strokeWidth={2} />
                    Anular liquidación
                  </Button>
                )}
              </div>
            </div>
          </SeccionCard>
        </div>
      </div>

      {dialogos}
    </div>
  );
}

type Interrupcion = NonNullable<VacacionItem['interrupcion']>;

/** CST art. 188: el disfrute terminó antes y vuelven días al saldo. */
function AvisoInterrupcion({ interrupcion, onMarcarReintegro }: { interrupcion: Interrupcion; onMarcarReintegro: () => void }) {
  const reintegro = interrupcion.reintegro ?? null;
  const reintegroPendiente = reintegro?.estado === 'PENDIENTE';
  return (
    <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
      <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
      <div className="min-w-0 flex-1 space-y-2 text-sm text-foreground">
        <p className="font-medium">
          El disfrute terminó antes: volvió a trabajar el {formatFecha(interrupcion.fecha_reintegro)}
        </p>
        <p>
          Vuelven {fmtDias(interrupcion.dias_devueltos)} día(s) hábil(es) al saldo
          {interrupcion.fechas_devueltas
            && ` (${formatFecha(interrupcion.fechas_devueltas.desde)} a ${formatFecha(interrupcion.fechas_devueltas.hasta)})`}
          . Antes terminaba el{' '}
          {interrupcion.original.fecha_fin ? formatFecha(interrupcion.original.fecha_fin) : 'sin fecha'}
          {' '}con {interrupcion.original.dias_habiles} día(s) hábil(es) y{' '}
          {fmtCOP(interrupcion.original.valor_total)}.
        </p>
        {interrupcion.motivo && <p>Motivo: {interrupcion.motivo}</p>}
        {/* El dinero pagado de más no se recupera solo: se descuenta en la
            nómina del reintegro (con autorización escrita) o se condona. */}
        {reintegro && reintegro.estado !== 'NO_APLICA' && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-3 py-2">
            <p>
              {reintegroPendiente
                ? `Reintegro pendiente: ${fmtCOP(reintegro.neto)} pagados por días no disfrutados `
                  + `(bruto ${fmtCOP(reintegro.bruto)}, aportes devueltos `
                  + `${fmtCOP(montoDeducciones(reintegro.deducciones))}).`
                : reintegro.estado === 'CONDONADO'
                  ? `Reintegro condonado${reintegro.motivo ? `: ${reintegro.motivo}` : ''}.`
                  : 'Reintegro descontado en nómina.'}
            </p>
            {reintegroPendiente && (
              <Button size="sm" variant="outline" onClick={onMarcarReintegro}>
                Marcar reintegro
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Base, días y valores del comprobante. Sin deducciones queda el total de siempre. */
function DetalleValores({ comprobante }: { comprobante: ComprobanteVacaciones }) {
  const res = comprobante.resultado;
  const deducciones = res.deducciones ?? null;
  const totalDeducciones = deducciones?.total ?? 0;
  const tasas = comprobante.seguridad_social?.tasas ?? null;
  const conceptos: Concepto[] = [];

  // PR-L15 (D1) - Lo remunerado son dias comerciales, no calendario: del 16
  // al 31 de octubre son 30, no 31. Solo se nombra cuando difieren.
  const diasPagados = res.dias_pago != null && res.dias_pago !== res.dias_calendario
    ? `${fmtDias(res.dias_pago)} días comerciales × ${fmtCOP(res.valor_dia)}`
    : `${fmtDias(res.dias_calendario)} días calendario × ${fmtCOP(res.valor_dia)}`;
  // Los dos conceptos se listan siempre: en cero también son información.
  conceptos.push({
    label: 'Días de disfrute',
    detalle: `${diasPagados} · equivalen a ${fmtDias(res.dias_disfrute)} hábiles`,
    valor: fmtCOP(res.valor_disfrute),
  });
  conceptos.push({
    label: 'Días en dinero',
    detalle: `${fmtDias(res.dias_dinero)} días × ${fmtCOP(res.valor_dia)}${res.acuerdo_escrito ? ' · con acuerdo escrito' : ''}`,
    valor: fmtCOP(res.valor_dinero),
  });
  conceptos.push({ label: totalDeducciones > 0 ? 'Total devengado' : 'Total', valor: fmtCOP(res.valor_total), total: true });

  if (deducciones && totalDeducciones > 0) {
    if (deducciones.salud > 0) {
      conceptos.push({ label: `Salud del trabajador${tasas ? ` (${tasas.salud} %)` : ''}`, valor: fmtCOP(deducciones.salud), negativo: true });
    }
    if (deducciones.pension > 0) {
      conceptos.push({ label: `Pensión del trabajador${tasas ? ` (${tasas.pension} %)` : ''}`, valor: fmtCOP(deducciones.pension), negativo: true });
    }
    if (deducciones.fsp > 0) {
      conceptos.push({ label: `Fondo de Solidaridad Pensional${tasas?.fsp ? ` (${tasas.fsp} %)` : ''}`, valor: fmtCOP(deducciones.fsp), negativo: true });
    }
    conceptos.push({
      label: 'Neto a pagar',
      detalle: 'La compensación en dinero no cotiza (CST art. 189)',
      valor: fmtCOP(res.valor_neto ?? res.valor_total),
      total: true,
    });
  }

  return (
    <div className="space-y-4">
      {/* La base va siempre: un registro histórico no la trae y se dice. */}
      <DatoLista
        className="sm:grid-cols-2 lg:grid-cols-4"
        items={[
          { label: 'Salario básico', value: comprobante.base ? fmtCOP(comprobante.base.salario_basico) : '—' },
          { label: 'Base mensual (art. 192)', value: comprobante.base ? fmtCOP(comprobante.base.base_mensual) : '—' },
          { label: 'Valor día', value: fmtCOP(res.valor_dia) },
          { label: 'Fecha base', value: formatFecha(comprobante.fechas.fecha_base) },
        ]}
      />
      <ConceptosTabla items={conceptos} />
    </div>
  );
}

function PeriodosConsumidos({ periodos }: { periodos: ComprobanteVacaciones['periodos_afectados'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="whitespace-nowrap bg-muted/60 text-[13px] font-medium text-muted-foreground">
          <tr>
            <th className="px-5 py-2.5 text-left font-semibold">Período</th>
            <th className="px-4 py-2.5 text-left font-semibold">Rango</th>
            <th className="px-4 py-2.5 text-right font-semibold">Disfrute</th>
            <th className="px-4 py-2.5 text-right font-semibold">Dinero</th>
            <th className="px-5 py-2.5 text-right font-semibold">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {periodos.map((p) => (
            <tr key={p.periodo}>
              <td className="px-5 py-2.5 font-medium text-foreground">{p.periodo}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                {formatFecha(p.inicio)} al {formatFecha(p.fin)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{fmtDias(p.dias_disfrute)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{fmtDias(p.dias_dinero)}</td>
              <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{fmtDias(p.saldo_restante)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetallePago({ item, esHistorico }: { item: VacacionItem; esHistorico: boolean }) {
  const porNomina = item.modo_pago === 'NOMINA';
  const pagadoEnNomina = item.pago.total_pagado ?? 0;
  const saldoNomina = item.pago.pendiente ?? Math.max(item.valor_total - pagadoEnNomina, 0);
  const tramosNomina = item.pago.nominas ?? [];
  const saldoVencido = item.advertencias?.some(
    (a) => a.code === 'VACACIONES_PAGO_EN_NOMINA_PENDIENTE',
  ) ?? false;

  return (
    <div className="space-y-4">
      {item.pago.fecha_pago ? (
        <DatoLista
          className="sm:grid-cols-4"
          items={[
            { label: 'Fecha', value: formatFecha(item.pago.fecha_pago) },
            { label: 'Método', value: item.pago.metodo_pago === 'NOMINA' ? 'Nómina' : (item.pago.metodo_pago ? METODO_PAGO_LABEL[item.pago.metodo_pago] ?? item.pago.metodo_pago : '—') },
            { label: 'Referencia', value: item.pago.referencia_pago ?? '—' },
            {
              // `total_pagado` es el bruto; `neto_pagado` es lo que se giró.
              label: item.pago.neto_pagado != null ? 'Neto girado' : 'Total pagado',
              value: (
                <>
                  {fmtCOP(item.pago.neto_pagado ?? item.pago.total_pagado ?? 0)}
                  {item.pago.neto_pagado != null && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Devengado {fmtCOP(item.pago.total_pagado ?? 0)}
                    </span>
                  )}
                </>
              ),
            },
          ]}
        />
      ) : porNomina ? (
        /* PR-L15 - En NOMINA no hay fecha de pago hasta que cierra el ultimo
           tramo, pero si hay plata pagada: se muestra el avance. */
        <DatoLista
          className="sm:grid-cols-3"
          items={[
            { label: 'Pagado por nómina', value: fmtCOP(pagadoEnNomina) },
            { label: 'Saldo pendiente', value: fmtCOP(saldoNomina) },
            { label: 'Total liquidado', value: fmtCOP(item.valor_total) },
          ]}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {esHistorico ? 'Registro histórico: no genera pago en el sistema.' : 'Sin pago registrado todavía.'}
        </p>
      )}

      {/* Una fila por nomina cerrada que pago un tramo del disfrute. */}
      {tramosNomina.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <p className="bg-muted/60 px-4 py-2 text-[13px] font-medium text-muted-foreground">Tramos pagados en nómina</p>
          <div className="divide-y divide-border">
            {tramosNomina.map((t) => (
              <div key={t.nomina_empleado_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.etiqueta ?? `NOM-${t.nomina_id}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFecha(t.fecha_desde)} a {formatFecha(t.fecha_hasta)}
                    {' · '}{fmtDias(t.dias)} días
                    {t.dias_dinero > 0 && ` · ${fmtDias(t.dias_dinero)} en dinero`}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-foreground">{fmtCOP(t.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {porNomina && saldoNomina > 0 && (
        <div className={`flex gap-2 rounded-lg p-3 ${saldoVencido ? 'bg-destructive-soft' : 'bg-info-soft'}`}>
          {saldoVencido
            ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
            : <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={2} />}
          <p className="text-sm text-foreground">
            {saldoVencido
              ? ADVERTENCIA_PAGO_NOMINA_LABEL.VACACIONES_PAGO_EN_NOMINA_PENDIENTE
              : 'Cada nómina que cubre el disfrute paga su tramo al cerrarse.'}
          </p>
        </div>
      )}
    </div>
  );
}
