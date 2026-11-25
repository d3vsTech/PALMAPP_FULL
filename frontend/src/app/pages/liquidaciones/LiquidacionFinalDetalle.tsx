/**
 * Pantalla 5 — Detalle de una liquidación final (API_LIQUIDACIONES §11.8).
 *
 * El detalle ES el comprobante: el backend lo lee de lo persistido y nunca
 * recalcula, así que cambiar el salario o cerrar una nómina después no mueve
 * lo que aquí se muestra. Esta vista solo pinta.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  AlertTriangle,
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
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  liquidacionFinalApi,
  type ComprobanteLiquidacionFinal,
  type ConceptoLiquidacion,
  type EstadoLiquidacionFinal,
  ESTADO_LIQUIDACION_LABEL,
  TIPO_CONTRATO_LABEL,
} from '../../../api/liquidacionFinal';
import {
  descargarBlob,
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
import PageHeader from '../../components/common/PageHeader';
import SeccionCard from '../../components/liquidaciones/SeccionCard';
import DatoLista from '../../components/liquidaciones/DatoLista';
import ConceptosTabla, { type Concepto } from '../../components/liquidaciones/ConceptosTabla';
import VacioCard from '../../components/liquidaciones/VacioCard';
import { Eyebrow } from '../../components/nomina/piezas';

const VOLVER = '/liquidaciones?tab=liquidacion-final';

const ESTADO_VARIANTE: Record<EstadoLiquidacionFinal, 'secondary' | 'info' | 'success' | 'destructive'> = {
  BORRADOR: 'secondary',
  APROBADA: 'info',
  PAGADA: 'success',
  ANULADA: 'destructive',
};

/** Detalle bajo el concepto: texto, fórmula y norma, si vienen. */
function detalleConcepto(c: ConceptoLiquidacion) {
  if (!c.detalle_texto && !c.formula_aplicada && !c.norma) return undefined;
  return (
    <>
      {c.detalle_texto && <span className="block">{c.detalle_texto}</span>}
      {c.formula_aplicada && <span className="block font-mono">{c.formula_aplicada}</span>}
      {c.norma && <span className="block">{c.norma}</span>}
    </>
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
      toast.success(
        liq.origen === 'HISTORICO'
          ? 'Registro histórico eliminado'
          : 'Borrador eliminado',
      );
      navigate(VOLVER);
    } catch (e) {
      toast.error(mensajeErrorLiquidacion(e, 'No se pudo eliminar el borrador'));
    } finally {
      setEliminando(false);
    }
  }, [liq, navigate]);

  if (cargando) {
    return (
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando liquidación...
      </Card>
    );
  }

  if (!liq) {
    return (
      <div className="space-y-6">
        <PageHeader title="Liquidación final de contrato" backTo={VOLVER} />
        <VacioCard
          icon={FileText}
          title="No se encontró la liquidación final"
          description="El registro no existe o ya no está disponible."
          action={
            <Button variant="outline" onClick={() => navigate(VOLVER)}>
              Volver a liquidaciones finales
            </Button>
          }
        />
      </div>
    );
  }

  const estado = liq.estado ?? 'BORRADOR';
  /**
   * PR-L14 (§11.1) — Una liquidación cargada desde archivo es el registro de
   * un pago hecho antes del sistema: nace PAGADA y no pasa por el ciclo de
   * vida. Editar, aprobar, anular y tocar el pago responden 409
   * `LIQUIDACION_HISTORICA`, así que esos botones no se ofrecen. Lo único
   * que admite, además de verse e imprimirse, es eliminarse.
   */
  const esHistorica = liq.origen === 'HISTORICO';
  const esBorrador = estado === 'BORRADOR' && !esHistorica;
  const esAprobada = estado === 'APROBADA' && !esHistorica;
  const esPagada = estado === 'PAGADA' && !esHistorica;
  const esAnulada = estado === 'ANULADA';

  const puedeEditar = hasPermiso('liquidaciones.editar');
  const puedeEliminar = hasPermiso('liquidaciones.eliminar');
  const puedeLiquidar = hasPermiso('liquidaciones.liquidar');
  const puedePagar = hasPermiso('liquidaciones.pagar');

  const conMenu =
    (esBorrador || esAprobada || esPagada || esHistorica) && (puedeLiquidar || puedePagar || puedeEliminar);
  const totalDeducciones = liq.totales.total_deducciones;

  const devengados: Concepto[] = [
    ...liq.conceptos.devengados.map((c) => ({
      label: c.nombre,
      detalle: detalleConcepto(c),
      valor: fmtCOP(c.valor),
    })),
    { label: 'Total devengado', valor: fmtCOP(liq.totales.total_devengado), total: true },
  ];

  const deducidos: Concepto[] = [
    ...liq.conceptos.deducciones.map((c) => ({
      label: c.nombre,
      detalle: detalleConcepto(c),
      valor: fmtCOP(c.valor),
      negativo: c.valor > 0,
    })),
    { label: 'Total deducciones', valor: fmtCOP(totalDeducciones), negativo: totalDeducciones > 0, total: true },
  ];

  const estadoBadges = (
    <span className="flex flex-wrap items-center justify-end gap-1">
      <Badge variant={ESTADO_VARIANTE[estado]}>{ESTADO_LIQUIDACION_LABEL[estado]}</Badge>
      {esHistorica && <Badge variant="outline">Histórico</Badge>}
    </span>
  );

  const menu = conMenu && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Más acciones">
          <MoreHorizontal strokeWidth={2} />
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
        {(esBorrador || esHistorica) && puedeEliminar && (
          <DropdownMenuItem
            onClick={() => void eliminar()}
            disabled={eliminando}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {esHistorica ? 'Eliminar registro histórico' : 'Eliminar borrador'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Liquidación final de contrato · ${liq.numero_comprobante}`}
        title={liq.empleado.nombre_completo}
        description={liq.titulo}
        backTo={VOLVER}
        actions={menu || undefined}
        className="print:hidden"
      />

      <div className="space-y-3 empty:hidden print:hidden">
        {liq.marca && (
          <div className="flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
            <p>{liq.marca}</p>
          </div>
        )}

        {esAnulada && liq.anulacion && (
          <div className="flex gap-2 rounded-lg bg-destructive-soft p-3 text-sm text-foreground">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
            <p>
              Anulada el {fmtFecha(liq.anulacion.anulado_at)}
              {liq.anulacion.anulado_por ? ` por ${liq.anulacion.anulado_por}` : ''}:{' '}
              {liq.anulacion.motivo}
            </p>
          </div>
        )}

        {liq.bloqueantes.map((b, i) => (
          <div key={`${b.code}-${i}`} className="flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
            <p>{b.mensaje}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SeccionCard title="Colaborador" description="Datos del contrato y de la terminación.">
            <DatoLista
              items={[
                { label: 'Cédula', value: liq.empleado.documento },
                { label: 'Cargo', value: liq.empleado.cargo ?? '—' },
                {
                  label: 'Tipo de contrato',
                  value: liq.contrato.tipo_contrato_etiqueta ?? TIPO_CONTRATO_LABEL[liq.contrato.tipo_contrato],
                },
                { label: 'Fecha de ingreso', value: fmtFecha(liq.contrato.fecha_inicio) },
                { label: 'Fecha de retiro', value: fmtFecha(liq.retiro.fecha_retiro) },
                { label: 'Tiempo de servicio', value: liq.retiro.tiempo_servicio.texto },
                {
                  label: 'Causa de terminación',
                  value: (
                    <>
                      {liq.retiro.motivo_etiqueta ?? '—'}
                      {liq.retiro.indemniza && (
                        <span className="block text-xs font-normal text-muted-foreground">Genera indemnización</span>
                      )}
                    </>
                  ),
                },
              ]}
            />

            {liq.contrato.tipo_contrato_origen === 'MANUAL' && (
              <div className="mt-4 flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                <p>El tipo de contrato se cambió a mano en esta liquidación.</p>
              </div>
            )}
          </SeccionCard>

          <Card className="gap-0 overflow-hidden">
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h3>Detalle de la liquidación</h3>
            </div>
            <div className="space-y-6 px-5 py-5 sm:px-6">
              <div>
                <Eyebrow className="mb-1">Conceptos devengados</Eyebrow>
                <ConceptosTabla items={devengados} />
              </div>
              <div>
                <Eyebrow className="mb-1">Conceptos deducidos</Eyebrow>
                {liq.conceptos.deducciones.length === 0 ? (
                  <p className="py-2.5 text-sm text-muted-foreground">Sin deducciones.</p>
                ) : (
                  <ConceptosTabla items={deducidos} />
                )}
                <p className="mt-2 text-xs text-muted-foreground">{liq.seguridad_social.nota}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 border-t border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <div>
                <Eyebrow>Neto a pagar</Eyebrow>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fmtCOP(liq.totales.total_devengado)} devengado − {fmtCOP(totalDeducciones)} deducciones
                </p>
              </div>
              <p className="text-3xl font-bold tabular-nums text-foreground">{fmtCOP(liq.totales.total_neto)}</p>
            </div>
          </Card>

          <SeccionCard title="Cómo se liquidó">
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{liq.metodo_liquidacion.texto}</p>
              {liq.metodo_liquidacion.normas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {liq.metodo_liquidacion.normas.map((n) => (
                    <Badge key={n} variant="secondary">
                      {n}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </SeccionCard>

          {liq.observaciones && (
            <SeccionCard title="Observaciones">
              <p className="text-sm text-muted-foreground">{liq.observaciones}</p>
            </SeccionCard>
          )}
        </div>

        <div className="space-y-6">
          <SeccionCard title="Resumen" className="lg:sticky lg:top-6">
            <div className="space-y-5">
              <ConceptosTabla
                items={[
                  { label: 'Fecha de retiro', valor: fmtFecha(liq.retiro.fecha_retiro) },
                  { label: 'Causa', valor: liq.retiro.motivo_etiqueta ?? '—' },
                  { label: 'Total devengado', valor: fmtCOP(liq.totales.total_devengado) },
                  { label: 'Total deducciones', valor: fmtCOP(totalDeducciones), negativo: totalDeducciones > 0 },
                  { label: 'Neto a pagar', valor: fmtCOP(liq.totales.total_neto), total: true },
                ]}
              />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Estado</span>
                {estadoBadges}
              </div>

              {liq.vacaciones.saldo_dias > 0 && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Vacaciones compensadas</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {fmtDias(liq.vacaciones.saldo_dias)} días
                  </span>
                </div>
              )}

              {liq.pago.fecha_pago && (
                <div className="space-y-0.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Pago</span>
                    <span className="font-medium text-foreground">{fmtFecha(liq.pago.fecha_pago)}</span>
                  </div>
                  {liq.pago.metodo_pago && (
                    <p className="text-right text-xs text-muted-foreground">{liq.pago.metodo_pago}</p>
                  )}
                  {liq.pago.referencia_pago && (
                    <p className="text-right text-xs text-muted-foreground">Ref. {liq.pago.referencia_pago}</p>
                  )}
                </div>
              )}

              <div className="space-y-2 border-t border-border pt-4 print:hidden">
                {esBorrador && puedeLiquidar && (
                  <Button onClick={() => setAprobando(true)} className="w-full">
                    <CheckCircle strokeWidth={2} />
                    Aceptar
                  </Button>
                )}
                {esAprobada && puedePagar && (
                  <Button onClick={() => setPagando(true)} className="w-full">
                    <Banknote strokeWidth={2} />
                    Registrar pago
                  </Button>
                )}
                {esBorrador && puedeEditar && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/liquidaciones/liquidacion-final/${liq.id}/editar`)}
                  >
                    <Pencil strokeWidth={2} />
                    Volver a editar
                  </Button>
                )}
                <div className={`grid gap-2 ${liq.compartir ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <Button
                    variant="outline"
                    disabled={descargando}
                    onClick={() => void abrirPdf(false)}
                    aria-label="Descargar PDF"
                  >
                    {descargando ? <Loader2 className="animate-spin" /> : <Download strokeWidth={2} />}
                    <span className="hidden sm:inline lg:hidden xl:inline">PDF</span>
                  </Button>
                  <Button
                    variant="outline"
                    disabled={descargando}
                    onClick={() => void abrirPdf(true)}
                    aria-label="Imprimir"
                  >
                    <Printer strokeWidth={2} />
                    <span className="hidden sm:inline lg:hidden xl:inline">Imprimir</span>
                  </Button>
                  {liq.compartir && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(liq.compartir!.whatsapp_url, '_blank', 'noopener')}
                      aria-label="Compartir por WhatsApp"
                    >
                      <MessageCircle strokeWidth={2} />
                      <span className="hidden sm:inline lg:hidden xl:inline">WhatsApp</span>
                    </Button>
                  )}
                </div>
              </div>

              {liq.compartir && (
                <p className="text-xs text-muted-foreground">
                  El enlace que se envía por WhatsApp abre sin contraseña y vence el{' '}
                  {fmtFecha(liq.compartir.expires_at)}.
                </p>
              )}

              {(liq.auditoria.creado_por || liq.auditoria.aprobado_por) && (
                <div className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
                  {liq.auditoria.creado_por && <p>Creada por {liq.auditoria.creado_por}</p>}
                  {liq.auditoria.aprobado_por && (
                    <p>
                      Aprobada por {liq.auditoria.aprobado_por} el {fmtFecha(liq.auditoria.aprobado_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </SeccionCard>

          {liq.advertencias.length > 0 && (
            <SeccionCard title="Avisos">
              <ul className="space-y-2">
                {liq.advertencias.map((a, i) => (
                  <li key={`${a.code}-${i}`} className="flex gap-2 text-sm text-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                    {a.mensaje}
                  </li>
                ))}
              </ul>
            </SeccionCard>
          )}

          {liq.retencion.aplica && (
            <SeccionCard title="Retención en la fuente">
              <p className="text-sm text-muted-foreground">{liq.retencion.nota}</p>
            </SeccionCard>
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
