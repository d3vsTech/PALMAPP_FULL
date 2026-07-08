/**
 * Pantalla dedicada para liquidar un tercero — reemplaza al modal.
 *
 * Ruta: `/nomina/:nominaId/tercero/:terceroId/liquidar`
 *
 * Diseño replica el de V.16 (tabla plana por operario editable). En vez de
 * mostrar desglose por labor/lote, se muestra una fila por operario con
 * inputs para días, tarifa/día, ajuste y descuento (concepto + valor).
 *
 * Flujo:
 *  1. Carga el detalle del acta via `nominaApi.terceros.ver()`.
 *  2. El usuario ajusta días/tarifa/ajuste/descuentos por operario.
 *  3. Al confirmar, se persisten los cambios (PUT operarios) y luego se
 *     registra el pago consolidando los descuentos en la observación.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
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
  ArrowLeft, Check, Loader2, AlertCircle, Building2, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  nominaApi,
  NominaTerceroActaDetalle,
  NominaConcepto,
  NominaErrorCodes,
} from '../../../api/nomina';
import type { ApiError } from '../../../api/client';

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

/** Estado local editable por operario. El descuento va estructurado según
 *  doc §7.4: concepto (id del catálogo) + valor + observación. */
interface FilaOperario {
  id: number;
  operario_id: number;
  nombre_completo: string;
  cedula: string;
  cargo: string;
  labores: string;
  dias: number;
  tarifa_dia: number;
  ajuste: number;
  descuento_concepto_id: number | null;
  descuento_valor: number;
  descuento_observacion: string;
}

export default function LiquidarTerceroDetalle() {
  const { nominaId: nominaIdParam, terceroId: terceroIdParam } = useParams();
  const navigate = useNavigate();
  const nominaId = nominaIdParam ? parseInt(nominaIdParam) : null;
  const terceroId = terceroIdParam ? parseInt(terceroIdParam) : null;

  const [detalle, setDetalle] = useState<NominaTerceroActaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filas, setFilas] = useState<FilaOperario[]>([]);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  /** Observación general de la orden de pago — viaja en el body de
   *  `POST /registrar-pago` (doc §7.5) para dejar trazabilidad. */
  const [observacion, setObservacion] = useState('');
  /** Catálogo de conceptos DEDUCCION_VOLUNTARIA para el dropdown de descuento
   *  (doc §7.4 → doc §8.2 `GET /nomina-conceptos/select?tipo=DEDUCCION_VOLUNTARIA`). */
  const [conceptosDescuento, setConceptosDescuento] = useState<NominaConcepto[]>([]);

  // Helper: mapea el detalle del acta al estado local editable.
  const hidratarFilas = (data: NominaTerceroActaDetalle) => {
    setDetalle(data);
    setObservacion(data.acta.observacion ?? '');
    setFilas(
      (data.operarios ?? []).map((o) => ({
        id: o.id,
        operario_id: o.operario_id,
        nombre_completo: o.nombre_completo,
        cedula: o.cedula,
        cargo: o.cargo || '—',
        labores: (o.labores_realizadas ?? []).join(', '),
        dias: toNumber(o.dias),
        tarifa_dia: toNumber(o.tarifa_dia),
        ajuste: toNumber(o.ajuste),
        descuento_concepto_id: o.descuento_concepto?.id ?? null,
        descuento_valor: toNumber(o.descuento_valor),
        descuento_observacion: o.descuento_observacion ?? '',
      })),
    );
  };

  useEffect(() => {
    if (!nominaId || !terceroId) return;
    setCargando(true);
    // Estrategia:
    //  1. GET /terceros/{id} para conocer el estado del acta.
    //  2. Si está PENDIENTE (BORRADOR), llamar POST /liquidar para que el
    //     backend calcule días/tarifa/labores/subtotal desde las planillas
    //     y liquidaciones individuales del período (doc §7.3). Es idempotente
    //     y preserva `ajuste`/`descuento` manuales.
    //  3. Si ya está PAGADA o la nómina CERRADA, mostrar tal cual (no
    //     recalcular).
    nominaApi.terceros
      .ver(nominaId, terceroId)
      .then(async (res) => {
        const acta = res.data;
        const estadoNomina = acta.nomina.estado;
        const estadoPago = acta.acta.estado_pago;
        if (estadoNomina === 'BORRADOR' && estadoPago === 'PENDIENTE') {
          try {
            const liq = await nominaApi.terceros.liquidar(nominaId, terceroId);
            hidratarFilas(liq.data);
            return;
          } catch (err) {
            // Si liquidar falla, caemos a mostrar lo que trajo el `ver`
            // original (pre-hidratado en 0) y avisamos al usuario.
            const e = err as ApiError;
            toast.error(
              e.message ?? 'No se pudieron calcular los totales del acta',
            );
          }
        }
        hidratarFilas(acta);
      })
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar acta'))
      .finally(() => setCargando(false));
  }, [nominaId, terceroId]);

  // Cargar catálogo de conceptos de deducción voluntaria (doc §8.2).
  useEffect(() => {
    nominaApi.conceptos
      .select({ tipo: 'DEDUCCION_VOLUNTARIA' })
      .then((res) => setConceptosDescuento(res.data ?? []))
      .catch(() => setConceptosDescuento([]));
  }, []);

  const updateFila = <K extends keyof FilaOperario>(
    id: number,
    campo: K,
    valor: FilaOperario[K],
  ) => {
    setFilas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)),
    );
  };

  const subtotalFila = (f: FilaOperario): number =>
    f.dias * f.tarifa_dia + (f.ajuste || 0) - (f.descuento_valor || 0);

  const totalGeneral = filas.reduce((s, f) => s + subtotalFila(f), 0);

  const registrarPago = async () => {
    if (!nominaId || !terceroId || !detalle) return;

    // Validación local del descuento estructurado (doc §7.4):
    // si hay valor > 0 debe haber concepto seleccionado.
    const filaSinConcepto = filas.find(
      (f) => f.descuento_valor > 0 && f.descuento_concepto_id == null,
    );
    if (filaSinConcepto) {
      toast.error(
        `Selecciona el concepto de descuento para ${filaSinConcepto.nombre_completo}`,
      );
      return;
    }

    setConfirmando(true);
    try {
      // Detectar cambios por operario y persistir con PUT (doc §7.4).
      // Enviar solo los campos que cambiaron para evitar sobreescrituras.
      const cambios = filas
        .map((f) => {
          const original = detalle.operarios.find((o) => o.id === f.id);
          if (!original) return null;
          const payload: Parameters<
            typeof nominaApi.terceros.actualizarOperario
          >[3] = {};
          if (f.dias !== toNumber(original.dias)) payload.dias = f.dias;
          if (f.tarifa_dia !== toNumber(original.tarifa_dia)) payload.tarifa_dia = f.tarifa_dia;
          if (f.ajuste !== toNumber(original.ajuste)) payload.ajuste = f.ajuste;

          const origConceptoId = original.descuento_concepto?.id ?? null;
          const origValor = toNumber(original.descuento_valor);
          const origObs = original.descuento_observacion ?? '';
          const cambioDescuento =
            f.descuento_concepto_id !== origConceptoId
            || f.descuento_valor !== origValor
            || f.descuento_observacion !== origObs;
          if (cambioDescuento) {
            payload.descuento_valor = f.descuento_valor;
            // Regla del backend (doc §7.4): valor=0 limpia el concepto y la obs.
            if (f.descuento_valor > 0) {
              payload.descuento_concepto_id = f.descuento_concepto_id;
              payload.descuento_observacion = f.descuento_observacion || null;
            } else {
              payload.descuento_concepto_id = null;
              payload.descuento_observacion = null;
            }
          }
          return Object.keys(payload).length > 0 ? { id: f.id, payload } : null;
        })
        .filter(Boolean) as Array<{
          id: number;
          payload: Parameters<typeof nominaApi.terceros.actualizarOperario>[3];
        }>;

      if (cambios.length > 0) {
        await Promise.all(
          cambios.map((c) =>
            nominaApi.terceros.actualizarOperario(nominaId, terceroId, c.id, c.payload),
          ),
        );
      }

      // Registrar el pago — body opcional según doc §7.5.
      await nominaApi.terceros.registrarPago(nominaId, terceroId, {
        metodo_pago: 'TRANSFERENCIA',
        observacion: observacion.trim() || undefined,
      });
      toast.success('Tercero liquidado');
      navigate(`/nomina/${nominaId}`);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.DESCUENTO_CONCEPTO_INVALIDO) {
        toast.error('El concepto de descuento seleccionado no es válido');
      } else if (e.code === NominaErrorCodes.ACTA_TERCERO_YA_PAGADA) {
        toast.error('El acta ya fue pagada');
      } else if (e.code === NominaErrorCodes.PERMISSION_DENIED) {
        toast.error('No tienes el permiso "nomina.pagar-tercero"');
      } else {
        toast.error(e.message ?? 'No se pudo liquidar el tercero');
      }
    } finally {
      setConfirmando(false);
      setModalPagoAbierto(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando acta...
      </div>
    );
  }

  if (!detalle) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No se pudo cargar el acta del tercero.
      </div>
    );
  }

  const nombre = detalle.tercero.nombre;
  const nit = detalle.tercero.nit ?? detalle.tercero.cedula ?? '—';
  const contacto = detalle.tercero.representante ?? '';
  const telefono = detalle.tercero.telefono ?? '';
  const estaPagada = detalle.acta.estado_pago === 'PAGADO';

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/nomina">Pagos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/nomina/${nominaId}`}>{detalle.nomina.periodo_label}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Liquidar — {nombre}</BreadcrumbPage>
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
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Liquidar — {nombre}</h1>
            <p className="text-muted-foreground mt-1">{detalle.nomina.periodo_label}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total a transferir</p>
            <p className="text-2xl font-bold text-amber-600">
              ${totalGeneral.toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      </div>

      {/* Alerta informativa */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 p-4">
        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-400">
          El pago se realiza a la <strong>empresa prestadora de servicios</strong>, no al
          colaborador individual. Puedes ajustar días, tarifa o agregar un ajuste antes
          de registrar el pago.
        </p>
      </div>

      {/* Card empresa */}
      <Card className="border-border overflow-hidden">
        {/* Header empresa */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-border ${
          estaPagada ? 'bg-[#1E5631]/5' : 'bg-amber-50/50 dark:bg-amber-950/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
              estaPagada ? 'bg-[#1E5631]/10 text-[#1E5631]' : 'bg-amber-500/10 text-amber-700'
            }`}>
              {nombre.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{nombre}</p>
                <Badge className={`text-xs ${
                  estaPagada
                    ? 'bg-[#1E5631]/10 text-[#1E5631] border-[#1E5631]/20'
                    : 'bg-amber-500/10 text-amber-700 border-amber-300'
                }`}>
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
                ${totalGeneral.toLocaleString('es-CO')}
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
            {!estaPagada ? (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => setModalPagoAbierto(true)}
              >
                Registrar Pago
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-[#1E5631] border-[#1E5631]/30"
              >
                <Check className="h-3.5 w-3.5" />
                Pagado
              </Button>
            )}
          </div>
        </div>

        {/* Tabla detalle colaboradores */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
                <th className="text-left p-3 pl-5 font-semibold">Operario</th>
                <th className="text-left p-3 font-semibold">Cargo</th>
                <th className="text-left p-3 font-semibold">Labores</th>
                <th className="text-left p-3 font-semibold">Días</th>
                <th className="text-left p-3 font-semibold">Tarifa/día</th>
                <th className="text-left p-3 font-semibold">Ajuste</th>
                <th className="text-left p-3 font-semibold">Descuento</th>
                <th className="text-left p-3 font-semibold">Desc. Valor</th>
                <th className="text-right p-3 pr-5 font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, idx) => {
                const sub = subtotalFila(f);
                const iniciales = f.nombre_completo
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p.charAt(0))
                  .join('')
                  .toUpperCase();
                return (
                  <tr
                    key={f.id}
                    className={`border-b border-border/60 last:border-0 ${
                      idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                    }`}
                  >
                    <td className="p-3 pl-5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {iniciales || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{f.nombre_completo}</p>
                          <p className="text-xs text-muted-foreground">{f.cedula}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{f.cargo}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {f.labores
                          ? f.labores.split(', ').filter(Boolean).map((l) => (
                              <span
                                key={l}
                                className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground"
                              >
                                {l}
                              </span>
                            ))
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <Input
                        type="number"
                        className="w-16 h-7 text-right text-xs"
                        value={f.dias || ''}
                        disabled={estaPagada}
                        onChange={(e) =>
                          updateFila(f.id, 'dias', parseInt(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-3 text-right">
                      <Input
                        type="number"
                        className="w-24 h-7 text-right text-xs"
                        value={f.tarifa_dia || ''}
                        disabled={estaPagada}
                        onChange={(e) =>
                          updateFila(f.id, 'tarifa_dia', parseInt(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-3 text-right">
                      <Input
                        type="number"
                        className="w-20 h-7 text-right text-xs"
                        value={f.ajuste || ''}
                        placeholder="0"
                        disabled={estaPagada}
                        onChange={(e) =>
                          updateFila(f.id, 'ajuste', parseInt(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-3">
                      {/* Descuento estructurado (doc §7.4): concepto del
                          catálogo DEDUCCION_VOLUNTARIA. */}
                      <Select
                        value={f.descuento_concepto_id?.toString() ?? ''}
                        disabled={estaPagada}
                        onValueChange={(v) =>
                          updateFila(
                            f.id,
                            'descuento_concepto_id',
                            v ? parseInt(v) : null,
                          )
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-40">
                          <SelectValue placeholder="Concepto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {conceptosDescuento.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-right">
                      <Input
                        type="number"
                        className="w-24 h-7 text-right text-xs"
                        value={f.descuento_valor || ''}
                        placeholder="0"
                        disabled={estaPagada}
                        onChange={(e) =>
                          updateFila(f.id, 'descuento_valor', parseInt(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-3 pr-5 text-right font-semibold text-primary">
                      ${sub.toLocaleString('es-CO')}
                    </td>
                  </tr>
                );
              })}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    Este tercero no tiene operarios en la nómina.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 border-t border-border font-semibold">
                <td colSpan={8} className="p-3 pl-5 text-right text-muted-foreground">
                  Total a transferir a {nombre}
                </td>
                <td className="p-3 pr-5 text-right text-lg font-bold text-primary">
                  ${totalGeneral.toLocaleString('es-CO')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Observación general de la orden — se persiste en el acta al
            registrar el pago (doc §7.5 body opcional). */}
        <div className="px-5 py-3 border-t border-border bg-muted/5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Observación:
            </span>
            <Input
              className="h-8 text-xs"
              placeholder="Observación general para esta orden de pago..."
              value={observacion}
              disabled={estaPagada}
              onChange={(e) => setObservacion(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Resumen final */}
      <Card className={`border-border overflow-hidden ${estaPagada ? 'border-[#1E5631]/30' : ''}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total a transferir a {nombre} en este período
              </p>
              <p className="text-3xl font-bold text-amber-600 mt-1">
                ${totalGeneral.toLocaleString('es-CO')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filas.length} colaborador{filas.length !== 1 ? 'es' : ''} tercero
                {filas.length !== 1 ? 's' : ''}
              </p>
            </div>
            {estaPagada && (
              <div className="flex items-center gap-2 text-[#1E5631]">
                <Check className="h-5 w-5" />
                <span className="font-semibold">Empresa pagada</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal confirmación pago */}
      <Dialog open={modalPagoAbierto} onOpenChange={setModalPagoAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Registrar Pago — {nombre}
            </DialogTitle>
            <DialogDescription>
              Confirma que se realizó la transferencia a la empresa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Empresa</span>
                <span className="font-medium">{nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">NIT</span>
                <span>{nit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Colaboradores</span>
                <span>{filas.length} personas</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-semibold">Total a transferir</span>
                <span className="font-bold text-lg text-primary">
                  ${totalGeneral.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-400/40 bg-amber-50/60 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Esta acción registra el pago como completado. Asegúrate de haber
                realizado la transferencia bancaria antes de confirmar.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalPagoAbierto(false)}
              disabled={confirmando}
            >
              Cancelar
            </Button>
            <Button
              onClick={registrarPago}
              disabled={confirmando}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
