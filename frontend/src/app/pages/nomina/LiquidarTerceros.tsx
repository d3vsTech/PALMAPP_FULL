/**
 * Liquidación de Terceros — conectada a la API (doc API_NOMINA.md §6).
 *
 * Permite ver las actas agrupadas por empresa contratista, ajustar días/tarifa/
 * ajuste/observación por operario, registrar el pago de cada acta y descargar
 * el PDF.
 *
 * Endpoints usados:
 *  - GET  /nominas/{id}/terceros                          → listar todas las actas
 *  - POST /nominas/{id}/terceros/{terceroId}/liquidar     → calcular acta
 *  - PUT  .../operarios/{op}                              → ajustar fila
 *  - POST .../registrar-pago                              → marcar pagado
 *  - GET  .../acta/pdf                                    → descargar PDF
 *
 * El pago se puede registrar aunque la nómina esté CERRADA — es excepción
 * documentada al patrón "CERRADA = inmutable".
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  ArrowLeft, Building2, Check, Download, AlertCircle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  nominaApi, NominaTercero, NominaTerceroOperario, MetodoPagoTercero,
  NominaErrorCodes,
} from '../../../api/nomina';
import type { ApiError } from '../../../api/client';

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

/**
 * Estado local por operario para ediciones todavía no persistidas.
 * Las ediciones se aplican con `nominaApi.terceros.actualizarOperario` al
 * salir del input (onBlur).
 */
interface OperarioEditState {
  dias: number;
  tarifa_dia: number;
  ajuste: number;
  observacion: string;
}

export default function LiquidarTerceros() {
  const { nominaId: nominaIdParam } = useParams();
  const navigate = useNavigate();
  const nominaId = nominaIdParam ? parseInt(nominaIdParam) : null;

  const [actas, setActas] = useState<NominaTercero[]>([]);
  const [cargando, setCargando] = useState(true);
  const [edits, setEdits] = useState<Record<number, OperarioEditState>>({});

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

  const cargar = () => {
    if (!nominaId) return;
    setCargando(true);
    nominaApi.terceros
      .listar(nominaId)
      .then((res) => {
        setActas(res.data ?? []);
        // Inicializar estado de edición con valores actuales
        const init: Record<number, OperarioEditState> = {};
        (res.data ?? []).forEach((acta) => {
          (acta.operarios ?? []).forEach((op) => {
            init[op.id] = {
              dias: op.dias,
              tarifa_dia: toNumber(op.tarifa_dia),
              ajuste: toNumber(op.ajuste),
              observacion: op.observacion ?? '',
            };
          });
        });
        setEdits(init);
      })
      .catch((err: ApiError) => {
        if (err.status !== 404) {
          toast.error(err.message ?? 'Error al cargar terceros');
        }
      })
      .finally(() => setCargando(false));
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

  const updateLocal = (operarioId: number, campo: keyof OperarioEditState, valor: any) => {
    setEdits((prev) => ({
      ...prev,
      [operarioId]: { ...prev[operarioId], [campo]: valor },
    }));
  };

  /** Persiste cambios del operario al hacer blur. Solo manda el campo modificado. */
  const persistirOperario = async (terceroId: number, operario: NominaTerceroOperario) => {
    if (!nominaId) return;
    const edit = edits[operario.id];
    if (!edit) return;
    // Detectar qué cambió
    const payload: { dias?: number; tarifa_dia?: number; ajuste?: number; observacion?: string } = {};
    if (edit.dias !== operario.dias) payload.dias = edit.dias;
    if (edit.tarifa_dia !== toNumber(operario.tarifa_dia)) payload.tarifa_dia = edit.tarifa_dia;
    if (edit.ajuste !== toNumber(operario.ajuste)) payload.ajuste = edit.ajuste;
    if (edit.observacion !== (operario.observacion ?? '')) payload.observacion = edit.observacion;
    if (Object.keys(payload).length === 0) return;

    try {
      await nominaApi.terceros.actualizarOperario(nominaId, terceroId, operario.id, payload);
      cargar();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo actualizar el operario');
    }
  };

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

  const periodoLabel = `Nómina #${nominaId}`;
  const terceroSeleccionadoPago = modalPagoTerceroId
    ? actas.find((a) => a.tercero_id === modalPagoTerceroId)
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/nomina">Pagos</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to={`/nomina/${nominaId}`}>{periodoLabel}</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Liquidar Terceros</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/nomina/${nominaId}`)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />Volver
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Liquidación de Terceros</h1>
            <p className="text-muted-foreground mt-1">{periodoLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total a transferir</p>
              <p className="text-2xl font-bold text-amber-600">
                ${totalGeneral.toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta informativa */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 p-4">
        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-400">
          El pago se realiza a la <strong>empresa prestadora de servicios</strong>, no al colaborador individual.
          Puedes ajustar días, tarifa o agregar un ajuste antes de registrar el pago. Los cambios se guardan al salir de cada campo.
        </p>
      </div>

      {/* Lista de actas */}
      {cargando ? (
        <Card className="border-border">
          <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando actas...
          </CardContent>
        </Card>
      ) : actas.length === 0 ? (
        <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No hay actas de terceros aún</p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Para crear las actas, los terceros deben estar agregados a la nómina (paso 2 del wizard).
              Luego, desde el detalle, presiona "Liquidar Terceros" para calcular los totales.
            </p>
          </CardContent>
        </Card>
      ) : (
        actas.map((acta) => {
          const estaPagada = acta.estado_pago === 'PAGADO';
          const razonSocial = acta.tercero?.razon_social ?? `Tercero #${acta.tercero_id}`;
          const nit = acta.tercero?.nit ?? '—';
          const contacto = acta.tercero?.contacto ?? '';
          const telefono = acta.tercero?.telefono ?? '';
          const operarios = acta.operarios ?? [];
          const subtotalAcatual = toNumber(acta.total_a_transferir);

          return (
            <Card key={acta.id} className="border-border overflow-hidden">
              <div className={`flex items-center justify-between px-5 py-4 border-b border-border ${estaPagada ? 'bg-success/5' : 'bg-amber-50/50 dark:bg-amber-950/20'}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${estaPagada ? 'bg-success/10 text-success' : 'bg-amber-500/10 text-amber-700'}`}>
                    {razonSocial.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{razonSocial}</p>
                      <Badge className={`text-xs ${estaPagada ? 'bg-success/10 text-success border-success/20' : 'bg-amber-500/10 text-amber-700 border-amber-300'}`}>
                        {estaPagada ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      NIT {nit}
                      {contacto && ` · ${contacto}`}
                      {telefono && ` · ${telefono}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Orden de pago</p>
                    <p className="text-xl font-bold text-foreground">
                      ${subtotalAcatual.toLocaleString('es-CO')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => descargarPdf(acta.tercero_id, razonSocial)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                  {!estaPagada && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => reliquidarActa(acta.tercero_id)}
                    >
                      Recalcular
                    </Button>
                  )}
                  {!estaPagada ? (
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => abrirModalPago(acta.tercero_id)}
                    >
                      Registrar Pago
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-1.5 text-success border-success/30">
                      <Check className="h-3.5 w-3.5" />
                      Pagado
                    </Button>
                  )}
                </div>
              </div>

              {/* Tabla detalle operarios */}
              {operarios.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No hay operarios en esta acta todavía.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
                        <th className="text-left p-3 pl-5 font-semibold">Colaborador</th>
                        <th className="text-left p-3 font-semibold">Cargo</th>
                        <th className="text-right p-3 font-semibold">Días</th>
                        <th className="text-right p-3 font-semibold">Tarifa/día</th>
                        <th className="text-right p-3 font-semibold">Ajuste</th>
                        <th className="text-right p-3 font-semibold">Subtotal</th>
                        <th className="text-left p-3 font-semibold">Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operarios.map((op, idx) => {
                        const edit = edits[op.id] ?? {
                          dias: op.dias,
                          tarifa_dia: toNumber(op.tarifa_dia),
                          ajuste: toNumber(op.ajuste),
                          observacion: op.observacion ?? '',
                        };
                        const subtotal = edit.dias * edit.tarifa_dia + edit.ajuste;
                        const iniciales = ((op.operario?.nombre_completo ?? '').split(' ').slice(0, 2).map((n) => n[0] ?? '').join('')).toUpperCase() || '?';
                        return (
                          <tr
                            key={op.id}
                            className={`border-b border-border/60 last:border-0 ${
                              idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                            }`}
                          >
                            <td className="p-3 pl-5">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {iniciales}
                                </div>
                                <div>
                                  <p className="font-medium">{op.operario?.nombre_completo ?? `Operario #${op.operario_id}`}</p>
                                  <p className="text-xs text-muted-foreground">{op.operario?.cedula ?? '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{op.operario?.cargo ?? '—'}</td>
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                className="w-16 h-7 text-right text-xs"
                                value={edit.dias}
                                disabled={estaPagada}
                                onChange={(e) => updateLocal(op.id, 'dias', parseInt(e.target.value) || 0)}
                                onBlur={() => persistirOperario(acta.tercero_id, op)}
                              />
                            </td>
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                className="w-24 h-7 text-right text-xs"
                                value={edit.tarifa_dia}
                                disabled={estaPagada}
                                onChange={(e) => updateLocal(op.id, 'tarifa_dia', parseInt(e.target.value) || 0)}
                                onBlur={() => persistirOperario(acta.tercero_id, op)}
                              />
                            </td>
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                className="w-24 h-7 text-right text-xs"
                                value={edit.ajuste || ''}
                                placeholder="0"
                                disabled={estaPagada}
                                onChange={(e) => updateLocal(op.id, 'ajuste', parseInt(e.target.value) || 0)}
                                onBlur={() => persistirOperario(acta.tercero_id, op)}
                              />
                            </td>
                            <td className="p-3 text-right font-semibold">
                              ${subtotal.toLocaleString('es-CO')}
                            </td>
                            <td className="p-3">
                              <Input
                                className="h-7 text-xs w-40"
                                value={edit.observacion}
                                placeholder="Opcional..."
                                disabled={estaPagada}
                                onChange={(e) => updateLocal(op.id, 'observacion', e.target.value)}
                                onBlur={() => persistirOperario(acta.tercero_id, op)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t border-border font-semibold">
                        <td colSpan={5} className="p-3 pl-5 text-right text-muted-foreground">
                          Total a transferir a {razonSocial}
                        </td>
                        <td className="p-3 text-right text-lg font-bold text-primary">
                          ${subtotalAcatual.toLocaleString('es-CO')}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          );
        })
      )}

      {/* Resumen final */}
      {actas.length > 0 && (
        <Card className={`border-border overflow-hidden ${todasPagadas ? 'border-success/30' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total a transferir a empresas terceras
                </p>
                <p className="text-3xl font-bold text-amber-600 mt-1">
                  ${totalGeneral.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {actas.length} empresa{actas.length !== 1 ? 's' : ''} ·{' '}
                  {actas.reduce((s, a) => s + (a.operarios?.length ?? 0), 0)} operario(s)
                </p>
              </div>
              {todasPagadas && (
                <div className="flex items-center gap-2 text-success">
                  <Check className="h-5 w-5" />
                  <span className="font-semibold">Todas las empresas pagadas</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal confirmación pago */}
      {modalPagoTerceroId && terceroSeleccionadoPago && (
        <Dialog open onOpenChange={() => setModalPagoTerceroId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Registrar Pago — {terceroSeleccionadoPago.tercero?.razon_social}
              </DialogTitle>
              <DialogDescription>
                Confirma que se realizó la transferencia a la empresa
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Empresa</span>
                  <span className="font-medium">{terceroSeleccionadoPago.tercero?.razon_social}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NIT</span>
                  <span>{terceroSeleccionadoPago.tercero?.nit ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operarios</span>
                  <span>{terceroSeleccionadoPago.operarios?.length ?? 0} personas</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-semibold">Total a transferir</span>
                  <span className="font-bold text-lg text-primary">
                    ${toNumber(terceroSeleccionadoPago.total_a_transferir).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select
                  value={pagandoForm.metodo_pago}
                  onValueChange={(v) =>
                    setPagandoForm((prev) => ({ ...prev, metodo_pago: v as MetodoPagoTercero }))
                  }
                >
                  <SelectTrigger>
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
                  <Label>Referencia / N° de transferencia *</Label>
                  <Input
                    value={pagandoForm.referencia_pago}
                    onChange={(e) =>
                      setPagandoForm((prev) => ({ ...prev, referencia_pago: e.target.value }))
                    }
                    placeholder="Ej: TRF-2026-001"
                  />
                  {terceroSeleccionadoPago.tercero &&
                    terceroSeleccionadoPago.tercero.datos_bancarios_completos === false && (
                      <p className="text-xs text-destructive">
                        Falta configurar los datos bancarios del tercero.
                      </p>
                    )}
                </div>
              )}

              <div className="space-y-2">
                <Label>N° orden de pago (opcional)</Label>
                <Input
                  value={pagandoForm.orden_pago_numero}
                  onChange={(e) =>
                    setPagandoForm((prev) => ({ ...prev, orden_pago_numero: e.target.value }))
                  }
                  placeholder="Ej: OP-2026-001"
                />
              </div>

              <div className="space-y-2">
                <Label>Observación (opcional)</Label>
                <Input
                  value={pagandoForm.observacion}
                  onChange={(e) =>
                    setPagandoForm((prev) => ({ ...prev, observacion: e.target.value }))
                  }
                  placeholder="Notas internas..."
                />
              </div>

              <div className="rounded-lg border border-amber-400/40 bg-amber-50/60 p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Esta acción registra el pago como completado. Asegúrate de haber realizado la
                  transferencia antes de confirmar.
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
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                {registrandoPago ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Confirmar Pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
