/**
 * Pantalla dedicada para liquidar un tercero — conectada a la API v2 (doc §7).
 *
 * Ruta: `/nomina/:nominaId/tercero/:terceroId/liquidar`
 *
 * Modelo de datos (doc §7.2):
 *   Operario expone total_jornales, total_cosecha, descuentos[] y subtotal.
 *   No hay `dias`/`tarifa_dia`/`ajuste` editables — el subtotal se deriva de
 *   `total_jornales + total_cosecha − SUM(descuentos.valor)`.
 *
 * Flujo API:
 *   1. GET /nominas/{id}/terceros/{op} para conocer el estado (§7.2).
 *   2. Si PENDIENTE en BORRADOR, POST /liquidar (§7.3) para calcular totales.
 *   3. Al expandir un operario, GET /operarios/{op}/detalle (§7.4) para el
 *      desglose de labores (cosecha por lote + jornales por labor).
 *   4. Agregar descuento: POST /operarios/{op}/descuentos (§7.5).
 *   5. Eliminar descuento: DELETE /descuentos/{id} (§7.6).
 *   6. Registrar pago: POST /registrar-pago (§7.7).
 *   7. Descargar/imprimir PDF del acta (§7.8).
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import PageHeader from '../../components/common/PageHeader';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Check, ChevronDown, ChevronRight,
  FileText, AlertCircle, Loader2, Printer, Download,
  MessageCircle, Plus, Trash2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { avisarCierreAutomatico } from '../../utils/cierreAutomaticoNomina';
import {
  nominaApi,
  NominaTerceroActaDetalle,
  DetalleLaboresOperario,
  NominaConcepto,
  NominaErrorCodes,
} from '../../../api/nomina';
import type { ApiError } from '../../../api/client';
import { Eyebrow, FilaMonto, thead, th, td } from '../../components/nomina/piezas';

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

/** El acta sin liquidar no tiene comprobante que imprimir (doc §7.8). */
function avisarErrorDeActa(err: unknown, respaldo: string): void {
  const e = err as ApiError;
  if (e?.code === NominaErrorCodes.ACTA_NO_CALCULADA) {
    toast.error('Liquida el acta antes de generar el comprobante');
    return;
  }
  toast.error(e?.message ?? respaldo);
}

export default function LiquidarTerceroDetalle() {
  const { nominaId: nominaIdParam, terceroId: terceroIdParam } = useParams();
  const navigate = useNavigate();
  const nominaId = nominaIdParam ? parseInt(nominaIdParam) : null;
  const terceroId = terceroIdParam ? parseInt(terceroIdParam) : null;

  const [detalle, setDetalle] = useState<NominaTerceroActaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  /** Observación general enviada al registrar el pago (doc §7.7 body opcional). */
  const [observacionPago, setObservacionPago] = useState('');

  /** Modal éxito post-pago. */
  const [modalExitoAbierto, setModalExitoAbierto] = useState(false);
  const [totalLiquidado, setTotalLiquidado] = useState(0);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false);

  /** Set de operario_ids expandidos en la vista. */
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  /** Cache de desglose por operario_id (doc §7.4 — GET /operarios/{op}/detalle). */
  const [desglosePorOperario, setDesglosePorOperario] = useState<
    Map<number, DetalleLaboresOperario | 'cargando' | 'error'>
  >(new Map());

  /** Modal agregar descuento. Cuando se abre desde el bloque general del acta,
   *  `operarioId` viene null y el usuario elige a qué operario aplicar. */
  const [modalDescuento, setModalDescuento] = useState<{
    operarioId: number | null;
    operarioNombre: string;
  } | null>(null);
  const [conceptosDescuento, setConceptosDescuento] = useState<NominaConcepto[]>([]);
  const [nuevoDescuento, setNuevoDescuento] = useState<{
    operario_id: string;
    concepto_id: string;
    valor: string;
    observacion: string;
  }>({ operario_id: '', concepto_id: '', valor: '', observacion: '' });
  const [guardandoDescuento, setGuardandoDescuento] = useState(false);
  const [eliminandoDescuentoId, setEliminandoDescuentoId] = useState<number | null>(null);

  /**
   * `true` cuando `GET /terceros/{t}` respondió 404 ACTA_NO_CALCULADA.
   * Entrar a esta pantalla es SOLO LECTURA — el POST /liquidar (que calcula
   * el acta y ADEMÁS auto-liquida los operarios PENDIENTES del tercero,
   * doc §7.3) corre únicamente con el botón "Calcular acta".
   */
  const [actaSinCalcular, setActaSinCalcular] = useState(false);
  const [calculandoActa, setCalculandoActa] = useState(false);

  // ── Carga inicial: detalle del acta (solo lectura, sin mutaciones) ───────
  const cargarActa = () => {
    if (!nominaId || !terceroId) return;
    setCargando(true);
    nominaApi.terceros
      .ver(nominaId, terceroId)
      .then((res) => {
        setDetalle(res.data);
        setActaSinCalcular(false);
      })
      .catch((err: ApiError) => {
        if (err.code === 'ACTA_NO_CALCULADA') {
          // El acta existe pre-hidratada pero nunca se calculó. Mostramos el
          // CTA en vez de calcular en silencio.
          setActaSinCalcular(true);
        } else {
          toast.error(err.message ?? 'Error al cargar acta');
        }
      })
      .finally(() => setCargando(false));
  };
  useEffect(() => {
    cargarActa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nominaId, terceroId]);

  /** Acción explícita: calcular el acta (POST /liquidar, doc §7.3). */
  const calcularActa = async () => {
    if (!nominaId || !terceroId) return;
    setCalculandoActa(true);
    try {
      const liq = await nominaApi.terceros.liquidar(nominaId, terceroId);
      setDetalle(liq.data);
      setActaSinCalcular(false);
      toast.success('Acta calculada');
      /*
       * §7.3 — Calcular el acta también intenta el cierre. Si era lo último
       * pendiente, la nómina queda finalizada y el acta ya no admite
       * descuentos: por eso el aviso va aquí y no al salir de la pantalla.
       */
      if (avisarCierreAutomatico(liq.cierre_automatico)) {
        navigate('/nomina');
        return;
      }
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudieron calcular los totales del acta');
    } finally {
      setCalculandoActa(false);
    }
  };

  // Catálogo de conceptos DEDUCCION_VOLUNTARIA para el dropdown del modal
  // de descuento (doc §7.5 + §8.2).
  useEffect(() => {
    nominaApi.conceptos
      .select({ tipo: 'DEDUCCION_VOLUNTARIA' })
      .then((res) => setConceptosDescuento(res.data ?? []))
      .catch(() => setConceptosDescuento([]));
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  /**
   * Desglose de un operario (doc §7.4). Se pide una sola vez por operario y
   * queda cacheado: alimenta tanto el acordeón como el estimado que se
   * muestra mientras el acta sigue sin liquidar.
   */
  const cargarDesglose = async (operarioId: number, avisar: boolean) => {
    if (!nominaId || !terceroId) return;
    if (desglosePorOperario.has(operarioId)) return;
    setDesglosePorOperario((prev) => new Map(prev).set(operarioId, 'cargando'));
    try {
      const res = await nominaApi.terceros.detalleOperario(nominaId, terceroId, operarioId);
      setDesglosePorOperario((prev) => new Map(prev).set(operarioId, res.data));
    } catch (err) {
      const e = err as ApiError;
      if (avisar) toast.error(e.message ?? 'No se pudo cargar el desglose del operario');
      setDesglosePorOperario((prev) => new Map(prev).set(operarioId, 'error'));
    }
  };

  /*
   * El acta nace en ceros y solo `POST /liquidar` la llena, así que sin este
   * desglose la pantalla mostraría $0 en todas las cifras aunque el período
   * tenga trabajo. Se precarga en silencio: un fallo aquí no es un error que
   * el usuario deba ver, solo deja la fila sin estimado.
   */
  useEffect(() => {
    if (!detalle) return;
    detalle.operarios.forEach((o) => { void cargarDesglose(o.operario_id, false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalle?.acta.id, detalle?.operarios.length]);

  const toggleExpandido = async (operarioId: number) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(operarioId)) {
        next.delete(operarioId);
      } else {
        next.add(operarioId);
      }
      return next;
    });
    await cargarDesglose(operarioId, true);
  };

  const abrirModalDescuento = (_operarioId: number | null, terceroNombre: string) => {
    // API v2: los descuentos van a nivel del acta del tercero, no del operario.
    // Se conserva la firma con `operarioId` para no romper llamadas existentes,
    // pero se ignora — el modal ya no pide operario.
    setModalDescuento({ operarioId: null, operarioNombre: terceroNombre });
    setNuevoDescuento({
      operario_id: '',
      concepto_id: '',
      valor: '',
      observacion: '',
    });
  };

  const guardarDescuento = async () => {
    if (!nominaId || !terceroId || !modalDescuento) return;
    if (!nuevoDescuento.concepto_id) {
      toast.error('Selecciona un concepto');
      return;
    }
    const valor = parseFloat(nuevoDescuento.valor);
    if (Number.isNaN(valor) || valor <= 0) {
      toast.error('El valor debe ser mayor a 0');
      return;
    }
    setGuardandoDescuento(true);
    try {
      const res = await nominaApi.terceros.agregarDescuento(
        nominaId,
        terceroId,
        {
          concepto_id: parseInt(nuevoDescuento.concepto_id),
          valor,
          observacion: nuevoDescuento.observacion.trim() || undefined,
        },
      );
      setDetalle(res.data);
      setModalDescuento(null);
      toast.success('Descuento agregado');
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.DESCUENTO_CONCEPTO_INVALIDO) {
        toast.error('El concepto seleccionado no es válido');
      } else if (e.code === NominaErrorCodes.NOMINA_CERRADA) {
        toast.error('No se puede modificar una nómina cerrada');
      } else {
        toast.error(e.message ?? 'No se pudo agregar el descuento');
      }
    } finally {
      setGuardandoDescuento(false);
    }
  };

  const eliminarDescuento = async (descuentoId: number) => {
    if (!nominaId || !terceroId) return;
    setEliminandoDescuentoId(descuentoId);
    try {
      const res = await nominaApi.terceros.eliminarDescuento(
        nominaId,
        terceroId,
        descuentoId,
      );
      setDetalle(res.data);
      toast.success('Descuento eliminado');
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.DESCUENTO_NO_ENCONTRADO) {
        toast.error('El descuento ya no existe');
      } else if (e.code === NominaErrorCodes.NOMINA_CERRADA) {
        toast.error('No se puede modificar una nómina cerrada');
      } else {
        toast.error(e.message ?? 'No se pudo eliminar el descuento');
      }
    } finally {
      setEliminandoDescuentoId(null);
    }
  };

  const registrarPago = async (totalConfirmado: number) => {
    if (!nominaId || !terceroId || !detalle) return;
    setConfirmando(true);
    try {
      const res = await nominaApi.terceros.registrarPago(nominaId, terceroId, {
        metodo_pago: 'TRANSFERENCIA',
        observacion: observacionPago.trim() || undefined,
      });
      setDetalle(res.data);
      setTotalLiquidado(totalConfirmado);
      setModalPagoAbierto(false);
      setModalExitoAbierto(true);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.ACTA_TERCERO_YA_PAGADA) {
        toast.error('El acta ya fue pagada');
      } else if (e.code === NominaErrorCodes.ACTA_NO_CALCULADA) {
        toast.error('Liquida el acta antes de registrar el pago');
        cargarActa();
      } else if (e.code === NominaErrorCodes.PERMISSION_DENIED) {
        toast.error('No tienes el permiso "nomina.pagar-tercero"');
      } else {
        toast.error(e.message ?? 'No se pudo liquidar el tercero');
      }
      setModalPagoAbierto(false);
    } finally {
      setConfirmando(false);
    }
  };

  const descargarPdf = async () => {
    if (!nominaId || !terceroId || !detalle) return;
    setDescargandoPdf(true);
    try {
      const blob = await nominaApi.terceros.actaPdf(nominaId, terceroId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const idDoc = detalle.tercero.nit ?? detalle.tercero.cedula ?? terceroId;
      const q = detalle.nomina.quincena ? `_Q${detalle.nomina.quincena}` : '';
      a.download = `acta_tercero_${idDoc}_${detalle.nomina.anio}_${String(detalle.nomina.mes).padStart(2, '0')}${q}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      avisarErrorDeActa(err, 'No se pudo descargar el PDF');
    } finally {
      setDescargandoPdf(false);
    }
  };

  const imprimirPdf = async () => {
    if (!nominaId || !terceroId) return;
    try {
      const blob = await nominaApi.terceros.actaPdf(nominaId, terceroId);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', () => {
          try { win.print(); } catch { /* algunos navegadores lo bloquean */ }
        });
      }
      // El acta queda reservada en memoria hasta que se recargue la página si
      // nadie la suelta. Se le deja un minuto a la pestaña nueva para abrirla.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      avisarErrorDeActa(err, 'No se pudo abrir el PDF');
    }
  };

  const enviarWhatsapp = async () => {
    if (!detalle) return;
    setEnviandoWhatsapp(true);
    try {
      await descargarPdf();
      const mensaje = encodeURIComponent(
        `Hola, adjunto el acta de liquidación del período ${detalle.nomina.periodo_label} `
        + `por un total de $${totalLiquidado.toLocaleString('es-CO')}.`,
      );
      const tel = (detalle.tercero.telefono ?? '').replace(/\D/g, '');
      const base = tel ? `https://wa.me/${tel}` : 'https://wa.me/';
      window.open(`${base}?text=${mensaje}`, '_blank');
    } finally {
      setEnviandoWhatsapp(false);
    }
  };

  const cerrarModalExito = () => {
    setModalExitoAbierto(false);
    navigate(`/nomina/${nominaId}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando acta...
      </Card>
    );
  }

  if (actaSinCalcular) {
    // §7.3 — el acta existe pero nunca se calculó. Ver es solo lectura;
    // el cálculo (que además liquida a los operarios pendientes del
    // tercero) corre solo con este botón.
    return (
      <div className="space-y-6">
        <PageHeader
          backTo={`/nomina/${nominaId}`}
          eyebrow="Liquidar tercero"
          title="Acta sin calcular"
          description="Para ver los totales y el desglose por operario hay que calcularla. Esto también liquida a sus operarios pendientes con los valores del período. La nómina debe estar en borrador."
          actions={
            <>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Volver
              </Button>
              <Button onClick={calcularActa} disabled={calculandoActa}>
                {calculandoActa ? (
                  <Loader2 className="animate-spin" strokeWidth={2} />
                ) : (
                  <FileText strokeWidth={2} />
                )}
                {calculandoActa ? 'Calculando...' : 'Calcular acta'}
              </Button>
            </>
          }
        />
      </div>
    );
  }

  if (!detalle) {
    return (
      <div className="space-y-6">
        <PageHeader
          backTo={`/nomina/${nominaId}`}
          title="No se pudo cargar el acta"
          description="Vuelve al período e intenta de nuevo."
        />
      </div>
    );
  }

  const nombre = detalle.tercero.nombre;
  const nit = detalle.tercero.nit ?? detalle.tercero.cedula ?? '—';
  const contacto = detalle.tercero.representante ?? '';
  const estaPagada = detalle.acta.estado_pago === 'PAGADO';
  const nominaCerrada = detalle.nomina.estado === 'CERRADA';
  const puedeEditar = !nominaCerrada && !estaPagada;
  /*
   * El acta nace en ceros al agregar los operarios y solo `POST /liquidar`
   * la calcula (doc §7.1). Sin eso, el total no es real: pagar o imprimir
   * responde 409 y el comprobante saldría en $0. Los descuentos sí se
   * pueden registrar antes, y conviene hacerlo (§7.3).
   *
   * Un backend anterior a 2026-10-24 no manda `calculada`; ahí se cae a la
   * vieja señal de "todo en cero", que es lo que había antes del campo.
   */
  const sinLiquidar = detalle.acta.calculada != null
    ? detalle.acta.calculada === false
    : toNumber(detalle.acta.total_bruto) === 0 && toNumber(detalle.acta.total_dias) === 0;

  /*
   * Lo que el período dice que vale el trabajo de cada operario, calculado en
   * vivo desde las planillas (§7.4). No es el acta: sirve para que la
   * pantalla no muestre $0 donde hay seis millones de poda, y desaparece en
   * cuanto el acta se liquida.
   */
  const estimadoPorOperario = new Map<number, number>();
  for (const [operarioId, desglose] of desglosePorOperario) {
    if (desglose === 'cargando' || desglose === 'error') continue;
    const cosecha = desglose.cosecha.reduce((acc, c) => acc + c.total, 0);
    const jornales = desglose.jornales.reduce((acc, j) => acc + j.total, 0);
    estimadoPorOperario.set(operarioId, cosecha + jornales);
  }
  const estimadoBruto = detalle.operarios.reduce(
    (acc, o) => acc + (estimadoPorOperario.get(o.operario_id) ?? 0),
    0,
  );
  const estimadoEmpresa = estimadoBruto - toNumber(detalle.acta.total_descuentos);

  const totalEmpresa = sinLiquidar
    ? estimadoEmpresa
    : toNumber(detalle.acta.total_a_transferir);
  /** Bruto de labores antes de descuentos; con el acta liquidada, `total_bruto` (§7.2). */
  const subtotalLabores = sinLiquidar
    ? estimadoBruto
    : toNumber(detalle.acta.total_bruto);

  return (
    <div className="space-y-6">
      {/* Header con botón volver */}
      <PageHeader
        backTo={`/nomina/${nominaId}`}
        eyebrow={`Liquidar tercero · ${detalle.nomina.periodo_label}`}
        title={nombre}
        description="Revisa las labores de cada operario, agrega descuentos y liquida la orden de pago."
      />

      {/* La empresa y su acta. Es una tarjeta de la app, no un recuadro
          escrito a mano: asi sigue el borde y el radio del tema. */}
      <Card className="gap-0 overflow-hidden">
        {/* Encabezado de la empresa */}
        <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
              {nombre.charAt(0)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate">{nombre}</h3>
                <Badge variant={estaPagada ? 'success' : 'warning'}>
                  {estaPagada ? 'Liquidado' : 'Pendiente'}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                NIT {nit}
                {contacto && ` · ${contacto}`}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 md:justify-end">
            <div className="md:text-right">
              <Eyebrow>Total a pagar</Eyebrow>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                ${totalEmpresa.toLocaleString('es-CO')}
              </p>
            </div>
            {sinLiquidar ? (
              <Button onClick={calcularActa} disabled={calculandoActa}>
                {calculandoActa
                  ? <Loader2 className="animate-spin" strokeWidth={2} />
                  : <FileText strokeWidth={2} />}
                {calculandoActa ? 'Liquidando...' : 'Liquidar acta'}
              </Button>
            ) : !estaPagada ? (
              <div className="flex flex-wrap items-center gap-2">
                {/* El desglose de abajo se calcula en vivo; el acta solo
                    cambia al volver a liquidarla. */}
                <Button variant="outline" onClick={calcularActa} disabled={calculandoActa}>
                  {calculandoActa
                    ? <Loader2 className="animate-spin" strokeWidth={2} />
                    : <RefreshCw strokeWidth={2} />}
                  {calculandoActa ? 'Recalculando...' : 'Recalcular'}
                </Button>
                <Button onClick={() => setModalPagoAbierto(true)}>
                  <FileText strokeWidth={2} />
                  Registrar pago
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={descargarPdf}>
                <Download strokeWidth={2} />
                Descargar comprobante
              </Button>
            )}
          </div>
        </div>

        {/* Lista de operarios */}
        {detalle.operarios.length === 0 ? (
          <div className="border-t border-border px-6 py-10 text-center text-sm text-muted-foreground">
            Este tercero no tiene operarios en la nómina.
          </div>
        ) : (
          detalle.operarios.map((o) => {
            const abierto = expandidos.has(o.operario_id);
            const desglose = desglosePorOperario.get(o.operario_id);
            const vivo = desglose === 'cargando' || desglose === 'error' ? null : desglose;
            // Sin liquidar, la línea del acta está en ceros: se muestra lo que
            // dicen las planillas para que la cifra signifique algo.
            const totalJornales = sinLiquidar && vivo
              ? vivo.jornales.reduce((acc, j) => acc + j.total, 0)
              : toNumber(o.total_jornales);
            const totalCosecha = sinLiquidar && vivo
              ? vivo.cosecha.reduce((acc, c) => acc + c.total, 0)
              : toNumber(o.total_cosecha);
            const totalDescuentos = toNumber(o.total_descuentos);
            const subtotal = sinLiquidar
              ? estimadoPorOperario.get(o.operario_id) ?? 0
              : toNumber(o.subtotal);
            /*
             * `labores_realizadas` es un snapshot que escribe `POST /liquidar`,
             * así que antes de liquidar llega vacío y la fila quedaba sin
             * chips. Mientras tanto salen del desglose en vivo.
             */
            const labores = (o.labores_realizadas ?? []).length > 0 || !vivo
              ? (o.labores_realizadas ?? [])
              : [
                  ...(vivo.cosecha.length > 0 ? ['Cosecha'] : []),
                  ...new Set(vivo.jornales.map((j) =>
                    j.categoria === 'FINCA' ? 'Trabajos de finca' : j.labor_nombre)),
                ];
            return (
              <div key={o.id} className="border-t border-border">
                {/* Fila resumen operario — clickeable */}
                <button
                  type="button"
                  aria-expanded={abierto}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
                  onClick={() => toggleExpandido(o.operario_id)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {abierto
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />}
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-foreground">{o.nombre_completo}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.cargo || '—'} · {o.cedula}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {/* Labores realizadas en el período. */}
                    <div className="hidden max-w-md flex-wrap justify-end gap-1.5 md:flex">
                      {labores.map((labor, idx) => (
                        <Badge key={`${labor}-${idx}`} variant="secondary">{labor}</Badge>
                      ))}
                    </div>
                    <p className="w-28 text-right text-sm font-semibold tabular-nums text-foreground">
                      ${subtotal.toLocaleString('es-CO')}
                    </p>
                  </div>
                </button>

                {/* Detalle expandido */}
                {abierto && (
                  <div className="border-t border-border">
                    {/* Totales del operario */}
                    <div className="grid grid-cols-2 border-b border-border bg-muted/30 sm:grid-cols-4">
                      <div className="px-5 py-3">
                        <Eyebrow>Jornales</Eyebrow>
                        <p className="text-sm font-semibold tabular-nums text-foreground">${totalJornales.toLocaleString('es-CO')}</p>
                      </div>
                      <div className="px-5 py-3">
                        <Eyebrow>Cosecha</Eyebrow>
                        <p className="text-sm font-semibold tabular-nums text-foreground">${totalCosecha.toLocaleString('es-CO')}</p>
                      </div>
                      <div className="px-5 py-3">
                        <Eyebrow>Descuentos</Eyebrow>
                        <p className="text-sm font-semibold tabular-nums text-foreground">
                          {totalDescuentos > 0 ? `−$${totalDescuentos.toLocaleString('es-CO')}` : '$0'}
                        </p>
                      </div>
                      <div className="px-5 py-3">
                        <Eyebrow>Subtotal</Eyebrow>
                        <p className="text-sm font-semibold tabular-nums text-foreground">${subtotal.toLocaleString('es-CO')}</p>
                      </div>
                    </div>

                    {/* Desglose de labores del backend (§7.4) */}
                    {desglose === 'cargando' && (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando desglose...
                      </div>
                    )}
                    {desglose === 'error' && (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No se pudo cargar el desglose.
                      </div>
                    )}
                    {desglose && desglose !== 'cargando' && desglose !== 'error' && (() => {
                      // Layout unificado V.19: una sola tabla con 7 columnas y
                      // grupos por labor con header tintado + subtotal por grupo.
                      // Los jornales de PALMA se agrupan por labor_nombre; los
                      // de FINCA quedan agrupados como "TRABAJOS DE FINCA".
                      const jornalesPalma = desglose.jornales.filter((j) => j.categoria !== 'FINCA');
                      const jornalesFinca = desglose.jornales.filter((j) => j.categoria === 'FINCA');

                      const gruposPalma: Record<string, typeof jornalesPalma> = {};
                      for (const j of jornalesPalma) {
                        (gruposPalma[j.labor_nombre] ??= []).push(j);
                      }

                      const totalCosecha = desglose.cosecha.reduce((s, c) => s + c.total, 0);
                      const totalFinca = jornalesFinca.reduce((s, j) => s + j.total, 0);

                      const hayContenido =
                        desglose.cosecha.length > 0 ||
                        desglose.jornales.length > 0;

                      if (!hayContenido) {
                        return (
                          <div className="py-8 text-center text-sm text-muted-foreground">
                            Sin registros de labores en el período.
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] text-sm">
                            <thead className={thead}>
                              <tr>
                                <th className={`${th} pl-5 text-left`}>Lote</th>
                                <th className={`${th} text-left`}>Sublote</th>
                                <th className={`${th} text-right`}>Cantidad</th>
                                <th className={`${th} text-right`}>Prom.</th>
                                <th className={`${th} text-right`}>Peso (kg)</th>
                                <th className={`${th} text-right`}>Precio unit.</th>
                                <th className={`${th} pr-5 text-right`}>Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {/* ─── COSECHA ─── */}
                              {desglose.cosecha.length > 0 && (
                                <>
                                  <tr className="bg-muted/30">
                                    <td colSpan={7} className="px-5 py-1.5 text-[13px] font-medium text-muted-foreground">
                                      Cosecha
                                    </td>
                                  </tr>
                                  {desglose.cosecha.map((c, idx) => (
                                    <tr
                                      key={`cosecha-${idx}`}>
                                      <td className={`${td} pl-5 font-medium text-foreground`}>{c.lote}</td>
                                      <td className={`${td} text-muted-foreground`}>{c.sublote ?? '—'}</td>
                                      <td className={`${td} text-right tabular-nums`}>
                                        {c.gajos.toLocaleString('es-CO')}
                                        <span className="ml-1 text-xs text-muted-foreground">gajos</span>
                                      </td>
                                      <td className={`${td} text-right tabular-nums text-muted-foreground`}>
                                        {c.promedio_kg_gajo > 0 ? c.promedio_kg_gajo.toFixed(4) : '—'}
                                      </td>
                                      <td className={`${td} text-right tabular-nums`}>
                                        {c.peso_kg > 0 ? c.peso_kg.toLocaleString('es-CO') : '—'}
                                      </td>
                                      <td className={`${td} text-right tabular-nums text-muted-foreground`}>
                                        ${c.precio_unit_kg.toLocaleString('es-CO')}
                                        <span className="ml-0.5 text-xs">/kg</span>
                                      </td>
                                      <td className={`${td} pr-5 text-right tabular-nums text-foreground`}>
                                        ${c.total.toLocaleString('es-CO')}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr>
                                    <td colSpan={6} className="px-4 py-2 text-right text-xs text-muted-foreground">
                                      Subtotal cosecha
                                    </td>
                                    <td className="px-4 py-2 pr-5 text-right font-semibold tabular-nums text-foreground">
                                      ${totalCosecha.toLocaleString('es-CO')}
                                    </td>
                                  </tr>
                                </>
                              )}

                              {/* ─── PALMA (poda / fertilización / sanidad / abonada / plateo) ─── */}
                              {Object.entries(gruposPalma).map(([nombreLabor, filas]) => {
                                const subtotalGrupo = filas.reduce((s, j) => s + j.total, 0);
                                return (
                                  <React.Fragment key={`grupo-${nombreLabor}`}>
                                    <tr className="bg-muted/30">
                                      <td colSpan={7} className="px-5 py-1.5 text-[13px] font-medium text-muted-foreground">
                                        {nombreLabor}
                                      </td>
                                    </tr>
                                    {filas.map((j, idx) => (
                                      <tr
                                        key={`palma-${nombreLabor}-${idx}`}>
                                        <td className={`${td} pl-5 font-medium text-foreground`}>{j.lote ?? '—'}</td>
                                        <td className={`${td} text-muted-foreground`}>{j.sublote ?? '—'}</td>
                                        <td className={`${td} text-right tabular-nums`}>
                                          {j.unidades.toLocaleString('es-CO')}
                                          <span className="ml-1 text-xs text-muted-foreground">{j.unidad}</span>
                                        </td>
                                        <td className={`${td} text-right text-muted-foreground`}>—</td>
                                        <td className={`${td} text-right text-muted-foreground`}>—</td>
                                        <td className={`${td} text-right tabular-nums text-muted-foreground`}>
                                          ${j.precio_unit.toLocaleString('es-CO')}
                                          <span className="ml-0.5 text-xs">/{j.unidad}</span>
                                        </td>
                                        <td className={`${td} pr-5 text-right tabular-nums text-foreground`}>
                                          ${j.total.toLocaleString('es-CO')}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr>
                                      <td colSpan={6} className="px-4 py-2 text-right text-xs text-muted-foreground">
                                        Subtotal {nombreLabor.toLowerCase()}
                                      </td>
                                      <td className="px-4 py-2 pr-5 text-right font-semibold tabular-nums text-foreground">
                                        ${subtotalGrupo.toLocaleString('es-CO')}
                                      </td>
                                    </tr>
                                  </React.Fragment>
                                );
                              })}

                              {/* ─── TRABAJOS DE FINCA ─── */}
                              {jornalesFinca.length > 0 && (
                                <>
                                  <tr className="bg-muted/30">
                                    <td colSpan={7} className="px-5 py-1.5 text-[13px] font-medium text-muted-foreground">
                                      Trabajos de finca
                                    </td>
                                  </tr>
                                  {jornalesFinca.map((j, idx) => (
                                    <tr
                                      key={`finca-${idx}`}>
                                      <td className={`${td} pl-5 font-medium text-foreground`} colSpan={5}>
                                        {j.labor_nombre}
                                      </td>
                                      <td className={`${td} text-right tabular-nums text-muted-foreground`}>
                                        ${j.precio_unit.toLocaleString('es-CO')}
                                      </td>
                                      <td className={`${td} pr-5 text-right tabular-nums text-foreground`}>
                                        ${j.total.toLocaleString('es-CO')}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr>
                                    <td colSpan={6} className="px-4 py-2 text-right text-xs text-muted-foreground">
                                      Subtotal finca
                                    </td>
                                    <td className="px-4 py-2 pr-5 text-right font-semibold tabular-nums text-foreground">
                                      ${totalFinca.toLocaleString('es-CO')}
                                    </td>
                                  </tr>
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {/* Los descuentos se gestionan a nivel del acta,
                        no del operario — ver bloque general debajo. */}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Descuentos a nivel del acta del contratista (API v2 §7.5/§7.6). */}
        {(() => {
          const descuentosActa = detalle?.acta?.descuentos ?? [];
          const totalDescuentosActa = toNumber(detalle?.acta?.total_descuentos ?? 0)
            || descuentosActa.reduce((s, d) => s + toNumber(d.valor), 0);
          return (
            <div className="space-y-2 border-t border-border px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <Eyebrow>Descuentos</Eyebrow>
                {puedeEditar && (
                  <Button size="sm" variant="ghost" onClick={() => abrirModalDescuento(null, nombre)}>
                    <Plus strokeWidth={2} />
                    Agregar
                  </Button>
                )}
              </div>
              {descuentosActa.length === 0 && <p className="text-sm text-muted-foreground">$0</p>}
              {descuentosActa.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{d.concepto_nombre}</p>
                    {d.observacion && (
                      <p className="truncate text-xs text-muted-foreground">{d.observacion}</p>
                    )}
                  </div>
                  <span className="whitespace-nowrap font-medium tabular-nums text-foreground">
                    −${toNumber(d.valor).toLocaleString('es-CO')}
                  </span>
                  {puedeEditar && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => eliminarDescuento(d.id)}
                      disabled={eliminandoDescuentoId === d.id}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Quitar descuento"
                      title="Quitar descuento"
                    >
                      {eliminandoDescuentoId === d.id
                        ? <Loader2 className="animate-spin" strokeWidth={2} />
                        : <Trash2 strokeWidth={2} />}
                    </Button>
                  )}
                </div>
              ))}
              {totalDescuentosActa > 0 && (
                <div className="space-y-1 border-t border-border pt-2">
                  <FilaMonto label="Subtotal labores" value={`$${subtotalLabores.toLocaleString('es-CO')}`} />
                  <FilaMonto label="Descuentos" value={`−$${totalDescuentosActa.toLocaleString('es-CO')}`} />
                  <FilaMonto label="Neto" value={`$${totalEmpresa.toLocaleString('es-CO')}`} strong />
                </div>
              )}
            </div>
          );
        })()}

        {/* Observación de pago */}
        <div className="space-y-2 border-t border-border px-5 py-4">
          <Label htmlFor="liquidarte-observacion-pago">Observación</Label>
          <Input
            id="liquidarte-observacion-pago"
            placeholder="Observación general para esta orden de pago"
            value={observacionPago}
            disabled={estaPagada}
            onChange={(e) => setObservacionPago(e.target.value)}
          />
        </div>

        {/* Total de la orden */}
        <div className="flex flex-col gap-1 border-t border-border bg-muted/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <span className="text-sm font-semibold text-foreground">Total orden de pago a {nombre}</span>
          <span className="text-lg font-bold tabular-nums text-foreground">
            ${totalEmpresa.toLocaleString('es-CO')}
          </span>
        </div>
      </Card>

      {/* Modal confirmación liquidación */}
      <Dialog open={modalPagoAbierto} onOpenChange={setModalPagoAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Liquidar a {nombre}</DialogTitle>
            <DialogDescription>
              Confirma la liquidación de la orden de pago a esta empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg bg-muted/60 p-4">
              <FilaMonto label="Empresa" value={nombre} />
              <FilaMonto label="NIT" value={nit} />
              <FilaMonto label="Operarios" value={`${detalle.operarios.length} personas`} />
              <div className="flex items-baseline justify-between border-t border-border pt-2">
                <span className="font-semibold text-foreground">Total a pagar</span>
                <span className="text-lg font-bold tabular-nums text-foreground">
                  ${totalEmpresa.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
            <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
              <p className="text-sm text-foreground">
                Al confirmar, la orden quedará marcada como liquidada. Revisa todos los valores antes de continuar.
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
              onClick={() => registrarPago(totalEmpresa)}
              disabled={confirmando}
            >
              {confirmando ? <Loader2 className="animate-spin" strokeWidth={2} /> : <Check strokeWidth={2} />}
              Confirmar liquidación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal agregar descuento (§7.5) */}
      <Dialog open={!!modalDescuento} onOpenChange={(open) => !open && setModalDescuento(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar descuento</DialogTitle>
            <DialogDescription>
              Se aplicará al acta de {modalDescuento?.operarioNombre ?? 'la empresa'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="liquidarte-concepto">Concepto *</Label>
              <Select
                value={nuevoDescuento.concepto_id}
                onValueChange={(v) =>
                  setNuevoDescuento((prev) => ({ ...prev, concepto_id: v }))
                }
              >
                <SelectTrigger id="liquidarte-concepto">
                  <SelectValue placeholder="Selecciona un concepto" />
                </SelectTrigger>
                <SelectContent>
                  {conceptosDescuento.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="liquidarte-valor">Valor *</Label>
              <Input id="liquidarte-valor"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={nuevoDescuento.valor}
                onChange={(e) =>
                  setNuevoDescuento((prev) => ({ ...prev, valor: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="liquidarte-observacion-opcional">Observación (opcional)</Label>
              <Input id="liquidarte-observacion-opcional"
                placeholder="Ej: Herramienta extraviada"
                value={nuevoDescuento.observacion}
                onChange={(e) =>
                  setNuevoDescuento((prev) => ({ ...prev, observacion: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalDescuento(null)}
              disabled={guardandoDescuento}
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarDescuento}
              disabled={guardandoDescuento}
            >
              {guardandoDescuento ? <Loader2 className="animate-spin" strokeWidth={2} /> : <Check strokeWidth={2} />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal éxito post-liquidación */}
      <Dialog open={modalExitoAbierto} onOpenChange={(open) => !open && cerrarModalExito()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Liquidación registrada</DialogTitle>
            <DialogDescription>
              La orden de pago quedó liquidada.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-lg bg-success-soft p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-success">
              <Check className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{nombre}</p>
              <p className="text-sm text-muted-foreground">
                Total liquidado: <span className="font-semibold tabular-nums text-foreground">${totalLiquidado.toLocaleString('es-CO')}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={imprimirPdf}>
              <Printer strokeWidth={2} />
              Imprimir
            </Button>
            <Button variant="outline" onClick={enviarWhatsapp} disabled={enviandoWhatsapp}>
              {enviandoWhatsapp
                ? <Loader2 className="animate-spin" strokeWidth={2} />
                : <MessageCircle strokeWidth={2} />}
              WhatsApp
            </Button>
            <Button variant="outline" onClick={descargarPdf} disabled={descargandoPdf}>
              {descargandoPdf
                ? <Loader2 className="animate-spin" strokeWidth={2} />
                : <Download strokeWidth={2} />}
              Descargar PDF
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={cerrarModalExito}>
              <Check strokeWidth={2} />
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
