/**
 * Pantalla 5 — Detalle de una liquidación final (API_LIQUIDACIONES §11.8).
 *
 * El detalle ES el comprobante: el backend lo lee de lo persistido y nunca
 * recalcula, así que cambiar el salario o cerrar una nómina después no mueve
 * lo que aquí se muestra. Esta vista solo pinta.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Banknote,
  CheckCircle,
  Download,
  FileText,
  Info,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Printer,
  RotateCcw,
  Scale,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  liquidacionFinalApi,
  type ComprobanteLiquidacionFinal,
  type ConceptoLiquidacion,
  ESTADO_LIQUIDACION_LABEL,
  TIPO_CONTRATO_LABEL,
} from '../../../api/liquidacionFinal';
import {
  descargarBlob,
  ESTADO_BADGE,
  fmtCOP,
  fmtDias,
  fmtFecha,
  mensajeErrorLiquidacion,
  nombrePdfLiquidacion,
} from './final/comunes';
import {
  AnularLiquidacionDialog,
  AprobarLiquidacionDialog,
  PagoLiquidacionDialog,
  type ModoAnulacion,
} from './final/DialogosLiquidacion';

/** Una fila de concepto. El signo lo decide el lado de la tabla, no el valor. */
function FilaConcepto({ c, negativo = false }: { c: ConceptoLiquidacion; negativo?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{c.nombre}</p>
        {c.detalle_texto && <p className="text-xs text-muted-foreground">{c.detalle_texto}</p>}
        {c.formula_aplicada && (
          <p className="font-mono text-xs text-muted-foreground">{c.formula_aplicada}</p>
        )}
        {c.norma && <p className="text-xs text-muted-foreground/70">{c.norma}</p>}
      </div>
      <span
        className={`shrink-0 text-sm font-medium ${negativo ? 'text-destructive' : 'text-foreground'}`}
      >
        {negativo && c.valor > 0 ? '−' : ''}
        {fmtCOP(c.valor)}
      </span>
    </div>
  );
}

export default function LiquidacionFinalDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermiso } = useAuth();

  const [liq, setLiq] = useState<ComprobanteLiquidacionFinal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const [aprobando, setAprobando] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [anulando, setAnulando] = useState<ModoAnulacion | null>(null);

  const liquidacionId = Number(id);

  const cargar = useCallback(async () => {
    if (!Number.isFinite(liquidacionId)) return;
    setCargando(true);
    try {
      setLiq(await liquidacionFinalApi.ver(liquidacionId));
    } catch (e) {
      toast.error(mensajeErrorLiquidacion(e, 'No se pudo cargar la liquidación'));
      setLiq(null);
    } finally {
      setCargando(false);
    }
  }, [liquidacionId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirPdf = useCallback(
    async (inline: boolean) => {
      if (!liq?.id) return;
      setDescargando(true);
      try {
        const blob = await liquidacionFinalApi.comprobantePdf(liq.id, inline);
        if (inline) {
          // Imprimir: se abre en una pestaña y el usuario manda a la impresora.
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank', 'noopener');
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } else {
          descargarBlob(blob, nombrePdfLiquidacion(liq));
        }
      } catch (e) {
        toast.error(mensajeErrorLiquidacion(e, 'No se pudo generar el PDF'));
      } finally {
        setDescargando(false);
      }
    },
    [liq],
  );

  const eliminar = useCallback(async () => {
    if (!liq?.id) return;
    setEliminando(true);
    try {
      await liquidacionFinalApi.eliminar(liq.id);
      toast.success('Borrador eliminado');
      navigate('/liquidaciones');
    } catch (e) {
      toast.error(mensajeErrorLiquidacion(e, 'No se pudo eliminar el borrador'));
    } finally {
      setEliminando(false);
    }
  }, [liq, navigate]);

  if (cargando) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!liq) {
    return (
      <div className="space-y-4 py-12 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">No se encontró la liquidación</p>
        <Button variant="outline" onClick={() => navigate('/liquidaciones')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Liquidaciones
        </Button>
      </div>
    );
  }

  const estado = liq.estado ?? 'BORRADOR';
  const esBorrador = estado === 'BORRADOR';
  const esAprobada = estado === 'APROBADA';
  const esPagada = estado === 'PAGADA';
  const esAnulada = estado === 'ANULADA';

  const puedeEditar = hasPermiso('liquidaciones.editar');
  const puedeEliminar = hasPermiso('liquidaciones.eliminar');
  const puedeLiquidar = hasPermiso('liquidaciones.liquidar');
  const puedePagar = hasPermiso('liquidaciones.pagar');

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="space-y-4 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Liquidaciones
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-primary">{liq.titulo}</h1>
              <Badge variant="outline" className={ESTADO_BADGE[estado]}>
                {ESTADO_LIQUIDACION_LABEL[estado]}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {liq.numero_comprobante} · {liq.empleado.nombre_completo}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {esBorrador && puedeEditar && (
              <Button
                variant="outline"
                onClick={() => navigate(`/liquidaciones/liquidacion-final/${liq.id}/editar`)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Volver a editar
              </Button>
            )}

            {esBorrador && puedeLiquidar && (
              <Button onClick={() => setAprobando(true)} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Aceptar
              </Button>
            )}

            {esAprobada && puedePagar && (
              <Button onClick={() => setPagando(true)} className="gap-2">
                <Banknote className="h-4 w-4" />
                Registrar pago
              </Button>
            )}

            <Button
              variant="outline"
              disabled={descargando}
              onClick={() => void abrirPdf(true)}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>

            <Button
              variant="outline"
              disabled={descargando}
              onClick={() => void abrirPdf(false)}
              className="gap-2"
            >
              {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF
            </Button>

            {liq.compartir && (
              <Button
                variant="outline"
                onClick={() => window.open(liq.compartir!.whatsapp_url, '_blank', 'noopener')}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            )}

            {(esBorrador || esAprobada || esPagada) && (puedeLiquidar || puedePagar || puedeEliminar) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="px-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {esPagada && puedePagar && (
                    <DropdownMenuItem onClick={() => setAnulando('pago')} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Anular pago
                    </DropdownMenuItem>
                  )}
                  {(esBorrador || esAprobada) && puedeLiquidar && (
                    <DropdownMenuItem
                      onClick={() => setAnulando('liquidacion')}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Ban className="h-4 w-4" />
                      Anular liquidación
                    </DropdownMenuItem>
                  )}
                  {esBorrador && puedeEliminar && (
                    <DropdownMenuItem
                      onClick={() => void eliminar()}
                      disabled={eliminando}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar borrador
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {liq.marca && (
          <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            <Info className="h-4 w-4" />
            {liq.marca}
          </p>
        )}

        {esAnulada && liq.anulacion && (
          <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <Ban className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Anulada el {fmtFecha(liq.anulacion.anulado_at)}
              {liq.anulacion.anulado_por ? ` por ${liq.anulacion.anulado_por}` : ''}:{' '}
              {liq.anulacion.motivo}
            </span>
          </p>
        )}

        {liq.bloqueantes.map((b, i) => (
          <p
            key={`${b.code}-${i}`}
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-400"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {b.mensaje}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Colaborador y contrato */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Datos del trabajador
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Cédula</p>
                  <p className="font-medium">{liq.empleado.documento}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cargo</p>
                  <p className="font-medium">{liq.empleado.cargo ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de contrato</p>
                  <p className="font-medium">
                    {liq.contrato.tipo_contrato_etiqueta ??
                      TIPO_CONTRATO_LABEL[liq.contrato.tipo_contrato]}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ingreso</p>
                  <p className="font-medium">{fmtFecha(liq.contrato.fecha_inicio)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Retiro</p>
                  <p className="font-medium">{fmtFecha(liq.retiro.fecha_retiro)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tiempo de servicio</p>
                  <p className="font-medium">{liq.retiro.tiempo_servicio.texto}</p>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-xs text-muted-foreground">Causa de terminación</p>
                  <p className="font-medium">
                    {liq.retiro.motivo_etiqueta ?? '—'}
                    {liq.retiro.indemniza && (
                      <span className="ml-2 text-xs text-amber-600">genera indemnización</span>
                    )}
                  </p>
                </div>
              </div>

              {liq.contrato.tipo_contrato_origen === 'MANUAL' && (
                <p className="mt-4 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  El tipo de contrato se cambió a mano en esta liquidación.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Conceptos */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Detalle de la liquidación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Conceptos devengados
                </h3>
                <div className="space-y-1">
                  {liq.conceptos.devengados.map((c) => (
                    <FilaConcepto key={`${c.codigo}-${c.ref_id ?? 0}`} c={c} />
                  ))}
                  <div className="flex items-center justify-between py-2 font-bold">
                    <span>Total devengado</span>
                    <span className="text-success">{fmtCOP(liq.totales.total_devengado)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Conceptos deducidos
                </h3>
                {liq.conceptos.deducciones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin deducciones.</p>
                ) : (
                  <div className="space-y-1">
                    {liq.conceptos.deducciones.map((c) => (
                      <FilaConcepto key={`${c.codigo}-${c.ref_id ?? 0}`} c={c} negativo />
                    ))}
                    <div className="flex items-center justify-between py-2 font-bold">
                      <span>Total deducciones</span>
                      <span className="text-destructive">
                        {liq.totales.total_deducciones > 0 ? '−' : ''}
                        {fmtCOP(liq.totales.total_deducciones)}
                      </span>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{liq.seguridad_social.nota}</p>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">Neto a pagar</span>
                  <span className="text-3xl font-bold text-primary">
                    {fmtCOP(liq.totales.total_neto)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Método de liquidación */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Cómo se liquidó
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {liq.metodo_liquidacion.texto}
              </p>
              {liq.metodo_liquidacion.normas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {liq.metodo_liquidacion.normas.map((n) => (
                    <Badge key={n} variant="outline" className="text-xs font-normal">
                      {n}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {liq.observaciones && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Observaciones</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">{liq.observaciones}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Devengado</span>
                  <span className="font-medium">{fmtCOP(liq.totales.total_devengado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deducciones</span>
                  <span className="font-medium text-destructive">
                    {liq.totales.total_deducciones > 0 ? '−' : ''}
                    {fmtCOP(liq.totales.total_deducciones)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span>Neto</span>
                  <span className="text-primary">{fmtCOP(liq.totales.total_neto)}</span>
                </div>
              </div>

              {liq.vacaciones.saldo_dias > 0 && (
                <div className="border-t border-border pt-3 text-sm">
                  <p className="text-xs text-muted-foreground">Vacaciones compensadas</p>
                  <p className="font-medium">{fmtDias(liq.vacaciones.saldo_dias)} días</p>
                </div>
              )}

              {liq.pago.fecha_pago && (
                <div className="space-y-1 border-t border-border pt-3 text-sm">
                  <p className="text-xs text-muted-foreground">Pago</p>
                  <p className="font-medium">{fmtFecha(liq.pago.fecha_pago)}</p>
                  {liq.pago.metodo_pago && (
                    <p className="text-xs text-muted-foreground">{liq.pago.metodo_pago}</p>
                  )}
                  {liq.pago.referencia_pago && (
                    <p className="text-xs text-muted-foreground">Ref. {liq.pago.referencia_pago}</p>
                  )}
                </div>
              )}

              {liq.compartir && (
                <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                  El enlace que se envía por WhatsApp abre sin contraseña y vence el{' '}
                  {fmtFecha(liq.compartir.expires_at)}.
                </p>
              )}

              <div className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                {liq.auditoria.creado_por && <p>Creada por {liq.auditoria.creado_por}</p>}
                {liq.auditoria.aprobado_por && (
                  <p>
                    Aprobada por {liq.auditoria.aprobado_por} el{' '}
                    {fmtFecha(liq.auditoria.aprobado_at)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {liq.advertencias.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Avisos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-6">
                {liq.advertencias.map((a, i) => (
                  <p
                    key={`${a.code}-${i}`}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {a.mensaje}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {liq.retencion.aplica && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Retención en la fuente</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground">{liq.retencion.nota}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {aprobando && (
        <AprobarLiquidacionDialog
          liquidacion={liq}
          onCerrar={() => setAprobando(false)}
          onAprobada={setLiq}
          onDesactualizada={() => void cargar()}
        />
      )}

      {pagando && (
        <PagoLiquidacionDialog
          liquidacion={liq}
          onCerrar={() => setPagando(false)}
          onPagada={setLiq}
        />
      )}

      {anulando && (
        <AnularLiquidacionDialog
          liquidacion={liq}
          modo={anulando}
          onCerrar={() => setAnulando(null)}
          onAnulada={setLiq}
        />
      )}
    </div>
  );
}
