/**
 * Liquidación de Terceros — conectada a la API v2 (doc §7).
 *
 * Vista de resumen: una tarjeta por empresa contratista con tabla solo-lectura
 * de operarios (nombre + cargo + jornales + cosecha + descuentos + subtotal).
 * Para editar descuentos por operario, el usuario navega a
 * `/nomina/{id}/tercero/{terceroId}/liquidar` (`LiquidarTerceroDetalle`).
 *
 * Endpoints usados:
 *  - GET  /nominas/{id}/terceros-actas                    → listar resumen (§7.1)
 *  - GET  /nominas/{id}/terceros/{terceroId}              → detalle acta + operarios (§7.2)
 *  - POST /nominas/{id}/terceros/{terceroId}/liquidar     → calcular acta (§7.3)
 *  - POST .../registrar-pago                              → marcar PAGADO (§7.7)
 *  - GET  .../acta/pdf                                    → descargar PDF (§7.8)
 *
 * El pago se puede registrar aunque la nómina esté CERRADA — excepción
 * documentada al patrón "CERRADA = inmutable".
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { periodoLabel } from '../../utils/periodoNomina';
import { useParams, useNavigate } from 'react-router';
import { sortByFirstName } from '../../utils/personas';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Check, Download, AlertCircle, Loader2, FileText, RefreshCw, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  nominaApi,
  NominaTerceroActaResumen,
  NominaTerceroActaDetalle,
  MetodoPagoTercero,
  NominaErrorCodes,
} from '../../../api/nomina';
import type { ApiError } from '../../../api/client';
import { Eyebrow, FilaMonto, thead, th, td } from '../../components/nomina/piezas';

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

export default function LiquidarTerceros() {
  const { nominaId: nominaIdParam } = useParams();
  const navigate = useNavigate();
  const nominaId = nominaIdParam ? parseInt(nominaIdParam) : null;

  /**
   * Listado resumen (§7.1) — una fila por contratista con totales y estado.
   * NO trae operarios ni datos bancarios; para eso usamos `detalles`.
   */
  const [actas, setActas] = useState<NominaTerceroActaResumen[]>([]);
  /** Período de la nómina para el encabezado. Si no carga, queda el número. */
  const [periodo, setPeriodo] = useState<string | null>(null);

  useEffect(() => {
    if (!nominaId) return;
    nominaApi.ver(nominaId)
      .then((res) => setPeriodo(periodoLabel(res.data)))
      .catch(() => setPeriodo(null));
  }, [nominaId]);
  /**
   * Detalle completo del acta (§7.2) indexado por `tercero_id`. Se carga en
   * paralelo tras el listado para poder renderizar la tabla de operarios y
   * los datos del tercero (banco, contacto, etc.) sin cambiar la UI.
   */
  const [detalles, setDetalles] = useState<Map<number, NominaTerceroActaDetalle>>(new Map());
  const [cargando, setCargando] = useState(true);

  const [modalPagoTerceroId, setModalPagoTerceroId] = useState<number | null>(null);
  const [pagandoForm, setPagandoForm] = useState<{
    metodo_pago: MetodoPagoTercero;
    referencia_pago: string;
    orden_pago_numero: string;
    observacion: string;
  }>({
    metodo_pago: 'TRANSFERENCIA',
    referencia_pago: '',
    orden_pago_numero: '',
    observacion: '',
  });
  const [registrandoPago, setRegistrandoPago] = useState(false);

  // Guard contra respuestas fuera de orden si cambia la nómina rápido:
  // solo la carga más reciente puede setear estado.
  const reqIdRef = useRef(0);

  const cargar = async () => {
    if (!nominaId) return;
    const reqId = ++reqIdRef.current;
    setCargando(true);
    try {
      const listRes = await nominaApi.terceros.listar(nominaId);
      if (reqId !== reqIdRef.current) return;
      const actasResumen = listRes.data ?? [];
      setActas(actasResumen);

      // Fase 2 — para cada acta pedimos el detalle (con operarios + tercero).
      // Se hace en paralelo para no bloquear la UI.
      const detallesPares = await Promise.all(
        actasResumen.map((a) =>
          nominaApi.terceros
            .ver(nominaId, a.tercero_id)
            .then((r) => ({ terceroId: a.tercero_id, detalle: r.data }))
            .catch(() => null),
        ),
      );
      if (reqId !== reqIdRef.current) return;
      const map = new Map<number, NominaTerceroActaDetalle>();
      for (const par of detallesPares) {
        if (!par) continue;
        map.set(par.terceroId, par.detalle);
      }
      setDetalles(map);
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      const e = err as ApiError;
      if (e.status !== 404) {
        toast.error(e.message ?? 'Error al cargar terceros');
      }
    } finally {
      if (reqId === reqIdRef.current) setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nominaId]);

  const totalGeneral = useMemo(
    () => actas.reduce((s, a) => s + toNumber(a.total_a_transferir), 0),
    [actas],
  );
  const todasPagadas = actas.length > 0 && actas.every((a) => a.estado_pago === 'PAGADO');

  // Edición de descuentos vive en la pantalla dedicada
  // `/nomina/{id}/tercero/{terceroId}/liquidar` (§7.5 / §7.6).

  /** Recalcula la acta de un tercero — útil tras ajustar varios operarios. */
  const reliquidarActa = async (terceroId: number) => {
    if (!nominaId) return;
    try {
      await nominaApi.terceros.liquidar(nominaId, terceroId);
      toast.success('Acta recalculada');
      cargar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.TERCERO_LABOR_SIN_PRECIO) {
        toast.error('Hay labores sin precio configurado para este tercero');
      } else {
        toast.error(e.message ?? 'Error al recalcular acta');
      }
    }
  };

  const abrirModalPago = (terceroId: number) => {
    setPagandoForm({
      metodo_pago: 'TRANSFERENCIA',
      referencia_pago: '',
      orden_pago_numero: '',
      observacion: '',
    });
    setModalPagoTerceroId(terceroId);
  };

  const confirmarPago = async () => {
    if (!nominaId || !modalPagoTerceroId) return;
    setRegistrandoPago(true);
    try {
      await nominaApi.terceros.registrarPago(nominaId, modalPagoTerceroId, {
        metodo_pago: pagandoForm.metodo_pago,
        referencia_pago: pagandoForm.referencia_pago || undefined,
        orden_pago_numero: pagandoForm.orden_pago_numero || undefined,
        observacion: pagandoForm.observacion || undefined,
      });
      toast.success('Pago registrado');
      setModalPagoTerceroId(null);
      cargar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.TERCERO_SIN_DATOS_BANCARIOS) {
        toast.error('Falta configurar los datos bancarios del tercero para transferencias');
      } else {
        toast.error(e.message ?? 'No se pudo registrar el pago');
      }
    } finally {
      setRegistrandoPago(false);
    }
  };

  const descargarPdf = async (terceroId: number, razonSocial: string) => {
    if (!nominaId) return;
    try {
      const blob = await nominaApi.terceros.actaPdf(nominaId, terceroId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acta_tercero_${razonSocial.replace(/\s+/g, '_')}_${nominaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo descargar el PDF');
    }
  };

  const etiquetaPeriodo = periodo ?? `Nómina #${nominaId}`;
  const terceroSeleccionadoPago = modalPagoTerceroId
    ? actas.find((a) => a.tercero_id === modalPagoTerceroId)
    : null;
  /** Detalle del tercero seleccionado en el modal — trae banco/nit/etc. */
  const detallePagoSeleccionado = modalPagoTerceroId
    ? detalles.get(modalPagoTerceroId)
    : null;
  /**
   * Datos bancarios completos = los 4 campos requeridos por §7.5 cuando
   * `metodo_pago=TRANSFERENCIA`. Sirve para pintar el warning inline.
   */
  const datosBancariosCompletos = !!(
    detallePagoSeleccionado
    && detallePagoSeleccionado.tercero.banco
    && detallePagoSeleccionado.tercero.tipo_cuenta
    && detallePagoSeleccionado.tercero.numero_cuenta
    && detallePagoSeleccionado.tercero.titular_cuenta
  );

  return (
    <div className="space-y-6">
      <PageHeader
        backTo={`/nomina/${nominaId}`}
        eyebrow={etiquetaPeriodo}
        title="Liquidación de terceros"
        description="Revisa las labores de cada operario, agrega descuentos y registra el pago de la orden por empresa."
      />

      {/* Alerta informativa */}
      <div className="flex gap-2 rounded-lg bg-info-soft p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={2} />
        <p className="text-sm text-foreground">
          El pago se realiza a la empresa prestadora de servicios, no al colaborador individual.
          Los descuentos se agregan desde el detalle de cada empresa, antes de registrar el pago.
        </p>
      </div>

      {/* Lista de actas */}
      {cargando ? (
        <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando actas...
        </Card>
      ) : actas.length === 0 ? (
        <Card className="items-center px-6 py-10 text-center">
          <div className="max-w-md">
            <p className="font-semibold text-foreground">Sin actas de terceros</p>
            <p className="text-sm text-muted-foreground">
              Agrega los terceros a la nómina en el paso 2 del asistente. Luego, desde el detalle,
              presiona Liquidar terceros para calcular los totales.
            </p>
          </div>
        </Card>
      ) : (
        actas.map((acta) => {
          const detalle = detalles.get(acta.tercero_id);
          const estaPagada = acta.estado_pago === 'PAGADO';
          const razonSocial = detalle?.tercero.nombre
            ?? acta.tercero_nombre
            ?? `Tercero #${acta.tercero_id}`;
          const nit = detalle?.tercero.nit ?? detalle?.tercero.cedula ?? '—';
          const contacto = detalle?.tercero.representante ?? detalle?.tercero.email ?? '';
          const telefono = detalle?.tercero.telefono ?? '';
          const operarios = detalle?.operarios ?? [];
          const subtotalAcatual = toNumber(acta.total_a_transferir);

          return (
            <Card key={acta.id} className="gap-0 overflow-hidden">
              {/* Cabecera de la empresa. Sin fondo de color: el estado lo
                  dice la etiqueta, no el recuadro entero. */}
              <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
                    {razonSocial.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words">{razonSocial}</h3>
                      <Badge variant={estaPagada ? 'success' : 'warning'}>
                        {estaPagada ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="break-words text-xs text-muted-foreground">
                      NIT {nit}
                      {contacto && ` · ${contacto}`}
                      {telefono && ` · ${telefono}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end md:gap-4">
                  <div className="md:text-right">
                    <Eyebrow>Total a pagar</Eyebrow>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      ${subtotalAcatual.toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      aria-label="Descargar PDF"
                      title="Descargar PDF"
                      onClick={() => descargarPdf(acta.tercero_id, razonSocial)}
                    >
                      <Download strokeWidth={2} />
                    </Button>
                    {!estaPagada && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        aria-label="Recalcular"
                        title="Recalcular"
                        onClick={() => reliquidarActa(acta.tercero_id)}
                      >
                        <RefreshCw strokeWidth={2} />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/nomina/${nominaId}/tercero/${acta.tercero_id}/liquidar`)
                      }
                    >
                      <FileText strokeWidth={2} />
                      Ver detalle
                    </Button>
                    {!estaPagada ? (
                      <Button onClick={() => abrirModalPago(acta.tercero_id)}>
                        <FileText strokeWidth={2} />
                        Registrar pago
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        <Check strokeWidth={2} />
                        Pagado
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabla detalle operarios (solo-lectura — edición vive en la
                  pantalla dedicada). */}
              {operarios.length === 0 ? (
                <p className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
                  No hay operarios en esta acta todavía.
                </p>
              ) : (
                <div className="overflow-x-auto border-t border-border">
                  <table className="w-full text-sm">
                    <thead className={thead}>
                      <tr>
                        <th className={`${th} pl-5 text-left`}>Operario</th>
                        <th className={`${th} text-left`}>Cargo</th>
                        <th className={`${th} text-right`}>Jornales</th>
                        <th className={`${th} text-right`}>Cosecha</th>
                        <th className={`${th} text-right`}>Descuentos</th>
                        <th className={`${th} pr-5 text-right`}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortByFirstName(operarios).map((op) => {
                        const totalJornales = toNumber(op.total_jornales);
                        const totalCosecha = toNumber(op.total_cosecha);
                        const totalDescuentos = toNumber(op.total_descuentos);
                        const subtotal = toNumber(op.subtotal);
                        return (
                          <tr key={op.id}>
                            <td className={`${td} pl-5`}>
                              <p className="font-semibold text-foreground">{op.nombre_completo || `Operario #${op.operario_id}`}</p>
                              <p className="text-xs text-muted-foreground">{op.cedula || '—'}</p>
                            </td>
                            <td className={`${td} text-muted-foreground`}>{op.cargo || '—'}</td>
                            <td className={`${td} text-right tabular-nums text-foreground`}>
                              ${totalJornales.toLocaleString('es-CO')}
                            </td>
                            <td className={`${td} text-right tabular-nums text-foreground`}>
                              ${totalCosecha.toLocaleString('es-CO')}
                            </td>
                            <td className={`${td} text-right tabular-nums text-foreground`}>
                              {totalDescuentos > 0 ? `−$${totalDescuentos.toLocaleString('es-CO')}` : '$0'}
                            </td>
                            <td className={`${td} pr-5 text-right font-semibold tabular-nums text-foreground`}>
                              ${subtotal.toLocaleString('es-CO')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total de la orden, como la barra del diseño. */}
              <div className="flex flex-col gap-1 border-t border-border bg-muted/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                <span className="text-sm font-semibold text-foreground">Total orden de pago a {razonSocial}</span>
                <span className="text-lg font-bold tabular-nums text-foreground">
                  ${subtotalAcatual.toLocaleString('es-CO')}
                </span>
              </div>
            </Card>
          );
        })
      )}

      {/* Resumen final */}
      {actas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Resumen
              {todasPagadas && <Badge variant="success">Todas las empresas pagadas</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* El resumen §7.1 no trae la lista de operarios; solo se cuentan empresas. */}
            <FilaMonto label="Empresas" value={actas.length} />
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
              <span className="font-semibold text-foreground">Total a transferir</span>
              <span className="text-2xl font-bold tabular-nums text-foreground">
                ${totalGeneral.toLocaleString('es-CO')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal confirmación pago */}
      {modalPagoTerceroId && terceroSeleccionadoPago && (
        <Dialog open onOpenChange={() => setModalPagoTerceroId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Registrar pago a {detallePagoSeleccionado?.tercero.nombre ?? terceroSeleccionadoPago.tercero_nombre}
              </DialogTitle>
              <DialogDescription>
                Confirma el pago de la orden a esta empresa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2 rounded-lg bg-muted/60 p-4">
                <FilaMonto
                  label="Empresa"
                  value={detallePagoSeleccionado?.tercero.nombre ?? terceroSeleccionadoPago.tercero_nombre}
                />
                <FilaMonto
                  label="NIT"
                  value={detallePagoSeleccionado?.tercero.nit ?? detallePagoSeleccionado?.tercero.cedula ?? '—'}
                />
                <FilaMonto label="Operarios" value={`${detallePagoSeleccionado?.operarios.length ?? 0} personas`} />
                <div className="flex items-baseline justify-between border-t border-border pt-2">
                  <span className="font-semibold text-foreground">Total a pagar</span>
                  <span className="text-lg font-bold tabular-nums text-foreground">
                    ${toNumber(terceroSeleccionadoPago.total_a_transferir).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="liquidarte-metodo-pago">Método de pago</Label>
                <Select
                  value={pagandoForm.metodo_pago}
                  onValueChange={(v) =>
                    setPagandoForm((prev) => ({ ...prev, metodo_pago: v as MetodoPagoTercero }))
                  }
                >
                  <SelectTrigger id="liquidarte-metodo-pago">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFERENCIA">Transferencia bancaria</SelectItem>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {pagandoForm.metodo_pago === 'TRANSFERENCIA' && (
                <div className="space-y-2">
                  <Label htmlFor="liquidarte-referencia-n-de-transferencia">Referencia de la transferencia *</Label>
                  <Input id="liquidarte-referencia-n-de-transferencia"
                    value={pagandoForm.referencia_pago}
                    onChange={(e) =>
                      setPagandoForm((prev) => ({ ...prev, referencia_pago: e.target.value }))
                    }
                    placeholder="Ej: TRF-2026-001"
                  />
                  {detallePagoSeleccionado && !datosBancariosCompletos && (
                    <div className="flex gap-2 rounded-lg bg-destructive-soft p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
                      <p className="text-sm text-foreground">
                        Falta configurar los datos bancarios del tercero.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="liquidarte-n-orden-de-pago-opcional">N.º de orden de pago (opcional)</Label>
                <Input id="liquidarte-n-orden-de-pago-opcional"
                  value={pagandoForm.orden_pago_numero}
                  onChange={(e) =>
                    setPagandoForm((prev) => ({ ...prev, orden_pago_numero: e.target.value }))
                  }
                  placeholder="Ej: OP-2026-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="liquidarte-observacion-opcional">Observación (opcional)</Label>
                <Input id="liquidarte-observacion-opcional"
                  value={pagandoForm.observacion}
                  onChange={(e) =>
                    setPagandoForm((prev) => ({ ...prev, observacion: e.target.value }))
                  }
                  placeholder="Notas internas..."
                />
              </div>

              <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                <p className="text-sm text-foreground">
                  Al confirmar, la orden quedará marcada como pagada. Revisa todos los valores antes de continuar.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setModalPagoTerceroId(null)}
                disabled={registrandoPago}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarPago}
                disabled={
                  registrandoPago ||
                  (pagandoForm.metodo_pago === 'TRANSFERENCIA' && !pagandoForm.referencia_pago)
                }
              >
                {registrandoPago ? (
                  <Loader2 className="animate-spin" strokeWidth={2} />
                ) : (
                  <Check strokeWidth={2} />
                )}
                Confirmar pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
