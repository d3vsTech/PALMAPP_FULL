/**
 * Comprobante de vacaciones (API_LIQUIDACIONES §10.8 a §10.11).
 *
 * Se lee del comprobante persistido: nunca se recalcula. Lo que se pagó es
 * lo que quedó firmado el día de la liquidación, aunque hoy el salario o los
 * parámetros sean otros.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, User, CalendarDays, Banknote, Printer, Download, Loader2,
  AlertTriangle, Ban, RotateCcw, ShieldCheck, Info,
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
  ESTADO_VACACION_BADGE, ESTADO_VACACION_LABEL, MODO_PAGO_BADGE, ORIGEN_LABEL,
  descargarBlob, fmtCOP, fmtDias, getIniciales,
} from './vacaciones/comunes';
import PagoVacacionDialog from './vacaciones/PagoVacacionDialog';
import AnularVacacionDialog, { type ModoAnulacion } from './vacaciones/AnularVacacionDialog';

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

  const descargarPdf = async () => {
    if (!item) return;
    setDescargando(true);
    try {
      const blob = await vacacionesApi.comprobantePdf(item.id);
      descargarBlob(blob, `vacaciones_${item.empleado.documento}_${item.numero_comprobante}.pdf`);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo descargar el comprobante');
    } finally {
      setDescargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando comprobante...
      </div>
    );
  }

  if (!comprobante || !item) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/liquidaciones/vacaciones/historico"><ArrowLeft className="h-4 w-4" />Volver al histórico</Link>
        </Button>
        <p className="text-muted-foreground">Comprobante no encontrado.</p>
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
  const pagadoEnNomina = item.pago.total_pagado ?? 0;
  const saldoNomina = item.pago.pendiente ?? Math.max(item.valor_total - pagadoEnNomina, 0);
  const tramosNomina = item.pago.nominas ?? [];
  const saldoVencido = item.advertencias?.some(
    (a) => a.code === 'VACACIONES_PAGO_EN_NOMINA_PENDIENTE',
  ) ?? false;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/liquidaciones/vacaciones/historico"><ArrowLeft className="h-4 w-4" />Volver al histórico</Link>
        </Button>
      </div>

      {/* ── Encabezado ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">Comprobante de Vacaciones</h1>
            <Badge variant="outline" className={ESTADO_VACACION_BADGE[estado]}>
              {ESTADO_VACACION_LABEL[estado]}
            </Badge>
            {esHistorico && <Badge variant="outline">{ORIGEN_LABEL.HISTORICO}</Badge>}
            {/* PR-L15 - Quien pone la plata: el modulo o cada nomina. */}
            {!esHistorico && estado !== 'PENDIENTE' && (
              <Badge variant="outline" className={MODO_PAGO_BADGE[item.modo_pago ?? 'DIRECTO']}>
                {MODO_PAGO_LABEL[item.modo_pago ?? 'DIRECTO']}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">
            {item.numero_comprobante} · Liquidado el {formatFecha(comprobante.fechas.fecha_liquidacion)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={descargarPdf} disabled={descargando} className="gap-2">
            {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar PDF
          </Button>
          {estado === 'APROBADA' && !esHistorico && (
            <Button onClick={() => setPagoAbierto(true)} className="gap-2">
              <Banknote className="h-4 w-4" />
              {/* En NOMINA el giro solo cubre lo que las nominas no pagaron. */}
              {porNomina ? 'Pagar el saldo' : 'Registrar pago'}
            </Button>
          )}
          {/* El pago que completo una nomina cerrada no se devuelve desde
              aqui: hay que reabrir esa nomina (409 VACACION_PAGO_POR_NOMINA). */}
          {estado === 'PAGADA' && item.pago.metodo_pago !== 'NOMINA' && (
            <Button variant="outline" onClick={() => setModoAnular('pago')} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Anular pago
            </Button>
          )}
          {estado !== 'CANCELADA' && !(porNomina && pagadoEnNomina > 0) && (
            <Button
              variant="outline"
              onClick={() => setModoAnular('liquidacion')}
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Ban className="h-4 w-4" />
              Anular
            </Button>
          )}
        </div>
      </div>

      {/* ── Anulación ────────────────────────────────────────────────────── */}
      {estado === 'CANCELADA' && (
        <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <Ban className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Liquidación anulada. Los días volvieron al saldo del colaborador.
            {typeof comprobante.anulacion?.motivo === 'string' && ` Motivo: ${comprobante.anulacion.motivo}`}
          </p>
        </div>
      )}

      {/* ── Advertencias ─────────────────────────────────────────────────── */}
      {comprobante.advertencias.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/30 dark:bg-amber-950/20">
          {comprobante.advertencias.map((a, i) => (
            <p key={`${a.code}-${i}`} className="flex gap-2 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {a.mensaje ?? a.code}
            </p>
          ))}
        </div>
      )}

      {/* ── Colaborador ──────────────────────────────────────────────────── */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
              {getIniciales(comprobante.empleado.nombre_completo)}
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-foreground">{comprobante.empleado.nombre_completo}</p>
              <p className="text-sm text-muted-foreground">
                {comprobante.empleado.cargo ?? 'Sin cargo'} · CC {comprobante.empleado.documento}
              </p>
            </div>
            <User className="h-5 w-5 shrink-0 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* ── Rango de disfrute ────────────────────────────────────────────── */}
      {cal && (
        <Card className="border-border">
          <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-5 py-3">
            <CalendarDays className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Rango de disfrute</p>
          </div>
          <CardContent className="space-y-3 p-5">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p className="font-semibold text-foreground">{formatFecha(cal.fecha_inicio)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fin</p>
                <p className="font-semibold text-foreground">{formatFecha(cal.fecha_fin)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Días hábiles</p>
                <p className="font-semibold text-foreground">{fmtDias(cal.dias_habiles)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Días calendario pagados</p>
                <p className="font-semibold text-foreground">{fmtDias(cal.dias_calendario)}</p>
              </div>
            </div>
            {cal.dias_no_habiles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                No hábiles en el rango:{' '}
                {cal.dias_no_habiles
                  .map((d) => `${formatFecha(d.fecha)} (${DIA_NO_HABIL_LABEL[d.motivo]})`)
                  .join(', ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Valores ──────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden border-border">
        <div className="border-b border-border bg-muted/20 px-5 py-3">
          <p className="text-sm font-semibold">Detalle de la liquidación</p>
        </div>
        <CardContent className="p-0">
          {comprobante.base && (
            <div className="grid gap-4 border-b border-border px-5 py-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Base mensual (art. 192)</p>
                <p className="font-semibold text-foreground">{fmtCOP(comprobante.base.base_mensual)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor día</p>
                <p className="font-semibold text-foreground">{fmtCOP(res.valor_dia)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha base</p>
                <p className="font-semibold text-foreground">{formatFecha(comprobante.fechas.fecha_base)}</p>
              </div>
            </div>
          )}

          {res.dias_calendario > 0 && (
            <div className="flex items-center justify-between border-b border-success/10 bg-success/5 px-5 py-3">
              <div>
                <p className="text-sm font-semibold text-success">Días de disfrute</p>
                <p className="text-xs text-muted-foreground">
                  {/* PR-L15 (D1) - Lo remunerado son dias comerciales, no
                      calendario: del 16 al 31 de octubre son 30, no 31. Solo
                      se nombra cuando difieren, para no ruidear. */}
                  {res.dias_pago != null && res.dias_pago !== res.dias_calendario
                    ? `${fmtDias(res.dias_pago)} días comerciales × ${fmtCOP(res.valor_dia)}`
                    : `${fmtDias(res.dias_calendario)} días calendario × ${fmtCOP(res.valor_dia)}`}
                  {' · '}equivalen a {fmtDias(res.dias_disfrute)} hábiles
                </p>
              </div>
              <p className="font-bold text-success">{fmtCOP(res.valor_disfrute)}</p>
            </div>
          )}

          {res.dias_dinero > 0 && (
            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/60 px-5 py-3 dark:border-amber-900/20 dark:bg-amber-950/10">
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Días en dinero</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDias(res.dias_dinero)} días × {fmtCOP(res.valor_dia)}
                  {res.acuerdo_escrito ? ' · con acuerdo escrito' : ''}
                </p>
              </div>
              <p className="font-bold text-amber-700 dark:text-amber-400">{fmtCOP(res.valor_dinero)}</p>
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-base font-bold">Total</p>
              <p className="text-xs text-muted-foreground">{res.formula_aplicada}</p>
            </div>
            <p className="text-2xl font-bold text-primary">{fmtCOP(res.valor_total)}</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Períodos consumidos ──────────────────────────────────────────── */}
      {comprobante.periodos_afectados.length > 0 && (
        <Card className="border-border">
          <div className="border-b border-border bg-muted/20 px-5 py-3">
            <p className="text-sm font-semibold">Períodos de causación consumidos</p>
          </div>
          <CardContent className="space-y-2 p-5">
            {comprobante.periodos_afectados.map((p) => (
              <div key={p.periodo} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <Badge variant="outline">Período {p.periodo}</Badge>
                <span className="text-muted-foreground">
                  {formatFecha(p.inicio)} al {formatFecha(p.fin)}
                </span>
                <span className="text-foreground">
                  {fmtDias(p.dias_disfrute)} disfrute · {fmtDias(p.dias_dinero)} dinero
                </span>
                <span className="text-muted-foreground">Queda {fmtDias(p.saldo_restante)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Seguridad social: informativa ────────────────────────────────── */}
      {comprobante.seguridad_social && (
        <Card className="border-border">
          <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-5 py-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Seguridad social</p>
          </div>
          <CardContent className="space-y-3 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">IBC</p>
                <p className="font-semibold text-foreground">{fmtCOP(comprobante.seguridad_social.ibc)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Salud trabajador</p>
                <p className="font-semibold text-foreground">{fmtCOP(comprobante.seguridad_social.salud_trabajador)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pensión trabajador</p>
                <p className="font-semibold text-foreground">{fmtCOP(comprobante.seguridad_social.pension_trabajador)}</p>
              </div>
            </div>
            <p className="flex gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {comprobante.seguridad_social.nota}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Pago ─────────────────────────────────────────────────────────── */}
      <Card className="border-border">
        <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-5 py-3">
          <Banknote className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Pago</p>
        </div>
        <CardContent className="space-y-4 p-5">
          {item.pago.fecha_pago ? (
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="font-semibold text-foreground">{formatFecha(item.pago.fecha_pago)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Método</p>
                <p className="font-semibold text-foreground">
                  {item.pago.metodo_pago === 'NOMINA' ? 'Nómina' : item.pago.metodo_pago ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Referencia</p>
                <p className="font-semibold text-foreground">{item.pago.referencia_pago ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total pagado</p>
                <p className="font-semibold text-foreground">{fmtCOP(item.pago.total_pagado ?? 0)}</p>
              </div>
            </div>
          ) : porNomina ? (
            /* PR-L15 - En NOMINA no hay fecha de pago hasta que cierra el
               ultimo tramo, pero si hay plata pagada: se muestra el avance. */
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Pagado por nómina</p>
                <p className="font-semibold text-foreground">{fmtCOP(pagadoEnNomina)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                <p className="font-semibold text-foreground">{fmtCOP(saldoNomina)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total liquidado</p>
                <p className="font-semibold text-foreground">{fmtCOP(item.valor_total)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {esHistorico
                ? 'Registro histórico: no genera pago en el sistema.'
                : 'Sin pago registrado todavía.'}
            </p>
          )}

          {/* Una fila por nomina cerrada que pago un tramo del disfrute. */}
          {tramosNomina.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border bg-muted/20 px-4 py-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Tramos pagados en nómina
                </p>
              </div>
              {tramosNomina.map((t) => (
                <div
                  key={t.nomina_empleado_id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t.etiqueta ?? `NOM-${t.nomina_id}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFecha(t.fecha_desde)} a {formatFecha(t.fecha_hasta)}
                      {' · '}{fmtDias(t.dias)} días
                      {t.dias_dinero > 0 && ` · ${fmtDias(t.dias_dinero)} en dinero`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{fmtCOP(t.total)}</p>
                </div>
              ))}
            </div>
          )}

          {porNomina && saldoNomina > 0 && (
            <p className={`flex gap-2 text-xs ${saldoVencido ? 'text-destructive' : 'text-muted-foreground'}`}>
              {saldoVencido
                ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
              {saldoVencido
                ? ADVERTENCIA_PAGO_NOMINA_LABEL.VACACIONES_PAGO_EN_NOMINA_PENDIENTE
                : 'Cada nómina que cubre el disfrute paga su tramo al cerrarse.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Método legal ─────────────────────────────────────────────────── */}
      {comprobante.metodo_liquidacion && (
        <Card className="border-border">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">{comprobante.metodo_liquidacion.texto}</p>
            {comprobante.metodo_liquidacion.normas.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {comprobante.metodo_liquidacion.normas.join(' · ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {comprobante.observacion && (
        <Card className="border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Observación</p>
            <p className="mt-1 text-sm text-foreground">{comprobante.observacion}</p>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
