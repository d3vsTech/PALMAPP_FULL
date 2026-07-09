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
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
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
  ArrowLeft, Building2, Check, ChevronDown, ChevronRight,
  FileText, AlertCircle, Loader2, Printer, Download,
  MessageCircle, CheckCircle2, Plus, Trash2, Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  nominaApi,
  NominaTerceroActaDetalle,
  DetalleLaboresOperario,
  NominaConcepto,
  NominaErrorCodes,
} from '../../../api/nomina';
import type { ApiError } from '../../../api/client';

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

// ── Colores por labor (mismo esquema visual de V.18) ─────────────────────────
const LABOR_META_PALMA = {
  header: 'text-amber-600',
  bg: 'bg-amber-50/60 dark:bg-amber-950/20',
};
const LABOR_META_FINCA = {
  header: 'text-zinc-700 dark:text-zinc-300',
  bg: 'bg-zinc-100/80 dark:bg-zinc-800/40',
};

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

  /** Modal agregar descuento. */
  const [modalDescuento, setModalDescuento] = useState<{
    operarioId: number;
    operarioNombre: string;
  } | null>(null);
  const [conceptosDescuento, setConceptosDescuento] = useState<NominaConcepto[]>([]);
  const [nuevoDescuento, setNuevoDescuento] = useState<{
    concepto_id: string;
    valor: string;
    observacion: string;
  }>({ concepto_id: '', valor: '', observacion: '' });
  const [guardandoDescuento, setGuardandoDescuento] = useState(false);
  const [eliminandoDescuentoId, setEliminandoDescuentoId] = useState<number | null>(null);

  // ── Carga inicial: detalle del acta ───────────────────────────────────────
  useEffect(() => {
    if (!nominaId || !terceroId) return;
    setCargando(true);
    nominaApi.terceros
      .ver(nominaId, terceroId)
      .then(async (res) => {
        const acta = res.data;
        // Auto-liquidar si está pendiente en nómina BORRADOR (§7.3, idempotente).
        if (acta.nomina.estado === 'BORRADOR' && acta.acta.estado_pago === 'PENDIENTE') {
          try {
            const liq = await nominaApi.terceros.liquidar(nominaId, terceroId);
            setDetalle(liq.data);
            return;
          } catch (err) {
            const e = err as ApiError;
            toast.error(e.message ?? 'No se pudieron calcular los totales del acta');
          }
        }
        setDetalle(acta);
      })
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar acta'))
      .finally(() => setCargando(false));
  }, [nominaId, terceroId]);

  // Catálogo de conceptos DEDUCCION_VOLUNTARIA para el dropdown del modal
  // de descuento (doc §7.5 + §8.2).
  useEffect(() => {
    nominaApi.conceptos
      .select({ tipo: 'DEDUCCION_VOLUNTARIA' })
      .then((res) => setConceptosDescuento(res.data ?? []))
      .catch(() => setConceptosDescuento([]));
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    // Cargar el desglose la primera vez que se expande.
    if (!nominaId || !terceroId) return;
    if (desglosePorOperario.has(operarioId)) return;
    setDesglosePorOperario((prev) => new Map(prev).set(operarioId, 'cargando'));
    try {
      const res = await nominaApi.terceros.detalleOperario(nominaId, terceroId, operarioId);
      setDesglosePorOperario((prev) => new Map(prev).set(operarioId, res.data));
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo cargar el desglose del operario');
      setDesglosePorOperario((prev) => new Map(prev).set(operarioId, 'error'));
    }
  };

  const abrirModalDescuento = (operarioId: number, operarioNombre: string) => {
    setModalDescuento({ operarioId, operarioNombre });
    setNuevoDescuento({ concepto_id: '', valor: '', observacion: '' });
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
        modalDescuento.operarioId,
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

  const eliminarDescuento = async (operarioId: number, descuentoId: number) => {
    if (!nominaId || !terceroId) return;
    setEliminandoDescuentoId(descuentoId);
    try {
      const res = await nominaApi.terceros.eliminarDescuento(
        nominaId,
        terceroId,
        operarioId,
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
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo descargar el PDF');
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
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo abrir el PDF');
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
  const estaPagada = detalle.acta.estado_pago === 'PAGADO';
  const nominaCerrada = detalle.nomina.estado === 'CERRADA';
  const puedeEditar = !nominaCerrada && !estaPagada;
  const totalEmpresa = toNumber(detalle.acta.total_a_transferir);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
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

      {/* Header con botón volver */}
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
        <h1 className="text-3xl font-bold text-primary">Liquidar — {nombre}</h1>
        <p className="text-muted-foreground mt-1">{detalle.nomina.periodo_label}</p>
      </div>

      {/* Card empresa */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        {/* Header empresa */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-border ${
          estaPagada
            ? 'bg-[#1E5631]/5'
            : 'bg-amber-50/40 dark:bg-amber-950/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              estaPagada
                ? 'bg-[#1E5631]/10 text-[#1E5631]'
                : 'bg-amber-500/10 text-amber-700'
            }`}>
              {nombre.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-foreground">{nombre}</p>
              <p className="text-xs text-muted-foreground">
                NIT {nit}
                {contacto && ` · ${contacto}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total a pagar</p>
              <p className="text-xl font-bold text-foreground">
                ${totalEmpresa.toLocaleString('es-CO')}
              </p>
            </div>
            <Badge className={`text-xs ${
              estaPagada
                ? 'bg-[#1E5631]/10 text-[#1E5631] border-[#1E5631]/20'
                : 'bg-amber-500/10 text-amber-700 border-amber-300'
            }`}>
              {estaPagada ? 'Liquidado' : 'Pendiente'}
            </Badge>
            {!estaPagada ? (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 gap-1.5"
                onClick={() => setModalPagoAbierto(true)}
              >
                <FileText className="h-3.5 w-3.5" />
                Liquidar
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-[#1E5631] border-[#1E5631]/30"
              >
                <Check className="h-3.5 w-3.5" />
                Liquidado
              </Button>
            )}
          </div>
        </div>

        {/* Lista de operarios */}
        {detalle.operarios.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Este tercero no tiene operarios en la nómina.
          </div>
        ) : (
          detalle.operarios.map((o) => {
            const abierto = expandidos.has(o.operario_id);
            const iniciales = (o.nombre_completo || '')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p.charAt(0))
              .join('')
              .toUpperCase() || '?';
            const totalJornales = toNumber(o.total_jornales);
            const totalCosecha = toNumber(o.total_cosecha);
            const totalDescuentos = toNumber(o.total_descuentos);
            const subtotal = toNumber(o.subtotal);
            const desglose = desglosePorOperario.get(o.operario_id);
            return (
              <div key={o.id} className="border-b border-border/60 last:border-0">
                {/* Fila resumen operario — clickeable */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors text-left"
                  onClick={() => toggleExpandido(o.operario_id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {iniciales}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{o.nombre_completo}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.cargo || '—'} · {o.cedula}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Chips de labores realizadas */}
                    <div className="flex gap-2 flex-wrap justify-end max-w-md">
                      {(o.labores_realizadas ?? []).map((labor, idx) => (
                        <span
                          key={`${labor}-${idx}`}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {labor.toUpperCase()}
                        </span>
                      ))}
                    </div>
                    <p className="font-bold text-sm text-primary w-28 text-right">
                      ${subtotal.toLocaleString('es-CO')}
                    </p>
                    {abierto
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  </div>
                </button>

                {/* Detalle expandido */}
                {abierto && (
                  <div className="border-t border-border/40 bg-muted/5">
                    {/* Totales del operario */}
                    <div className="grid grid-cols-4 divide-x divide-border/40 border-b border-border/40 bg-muted/10">
                      <div className="px-5 py-3">
                        <p className="text-xs text-muted-foreground">Jornales</p>
                        <p className="text-sm font-bold">${totalJornales.toLocaleString('es-CO')}</p>
                      </div>
                      <div className="px-5 py-3">
                        <p className="text-xs text-muted-foreground">Cosecha</p>
                        <p className="text-sm font-bold">${totalCosecha.toLocaleString('es-CO')}</p>
                      </div>
                      <div className="px-5 py-3">
                        <p className="text-xs text-muted-foreground">Descuentos</p>
                        <p className="text-sm font-bold text-destructive">
                          {totalDescuentos > 0 ? `−$${totalDescuentos.toLocaleString('es-CO')}` : '$0'}
                        </p>
                      </div>
                      <div className="px-5 py-3">
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="text-sm font-bold text-primary">${subtotal.toLocaleString('es-CO')}</p>
                      </div>
                    </div>

                    {/* Desglose de labores del backend (§7.4) */}
                    {desglose === 'cargando' && (
                      <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando desglose...
                      </div>
                    )}
                    {desglose === 'error' && (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No se pudo cargar el desglose.
                      </div>
                    )}
                    {desglose && desglose !== 'cargando' && desglose !== 'error' && (
                      <>
                        {/* Cosecha */}
                        {desglose.cosecha.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border text-xs text-muted-foreground bg-muted/20">
                                  <th className="text-left p-3 pl-5 font-semibold">Lote</th>
                                  <th className="text-left p-3 font-semibold">Sublote</th>
                                  <th className="text-right p-3 font-semibold">Gajos</th>
                                  <th className="text-right p-3 font-semibold">Prom.</th>
                                  <th className="text-right p-3 font-semibold">Peso (kg)</th>
                                  <th className="text-right p-3 font-semibold">Precio Unit.</th>
                                  <th className="text-right p-3 pr-5 font-semibold">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className={LABOR_META_PALMA.bg}>
                                  <td colSpan={7} className={`px-5 py-2 text-xs font-bold tracking-wider ${LABOR_META_PALMA.header}`}>
                                    COSECHA
                                  </td>
                                </tr>
                                {desglose.cosecha.map((c, idx) => (
                                  <tr
                                    key={`cosecha-${idx}`}
                                    className="border-b border-border/50 last:border-0 hover:bg-muted/10"
                                  >
                                    <td className="p-3 pl-5 font-semibold">{c.lote}</td>
                                    <td className="p-3 text-muted-foreground">{c.sublote ?? '—'}</td>
                                    <td className="p-3 text-right">
                                      <span className="font-semibold">{c.gajos.toLocaleString('es-CO')}</span>{' '}
                                      <span className="text-xs text-muted-foreground">gajos</span>
                                    </td>
                                    <td className="p-3 text-right text-muted-foreground">
                                      {c.promedio_kg_gajo > 0 ? c.promedio_kg_gajo.toFixed(1) : '—'}
                                    </td>
                                    <td className="p-3 text-right font-semibold">
                                      {c.peso_kg > 0 ? c.peso_kg.toLocaleString('es-CO') : '—'}
                                    </td>
                                    <td className="p-3 text-right text-muted-foreground">
                                      ${c.precio_unit_kg.toLocaleString('es-CO')}
                                      <span className="text-xs ml-0.5">/kg</span>
                                    </td>
                                    <td className={`p-3 pr-5 text-right font-semibold ${LABOR_META_PALMA.header}`}>
                                      ${c.total.toLocaleString('es-CO')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Jornales */}
                        {desglose.jornales.length > 0 && (
                          <div className="overflow-x-auto border-t border-border/40">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border text-xs text-muted-foreground bg-muted/20">
                                  <th className="text-left p-3 pl-5 font-semibold">Labor</th>
                                  <th className="text-left p-3 font-semibold">Lote / Sublote</th>
                                  <th className="text-right p-3 font-semibold">Unidades</th>
                                  <th className="text-right p-3 font-semibold">Precio Unit.</th>
                                  <th className="text-right p-3 pr-5 font-semibold">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {desglose.jornales.map((j, idx) => {
                                  const meta = j.categoria === 'FINCA' ? LABOR_META_FINCA : LABOR_META_PALMA;
                                  return (
                                    <tr
                                      key={`jornal-${idx}`}
                                      className="border-b border-border/50 last:border-0 hover:bg-muted/10"
                                    >
                                      <td className="p-3 pl-5">
                                        <span className="font-semibold">{j.labor_nombre}</span>
                                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${meta.bg} ${meta.header}`}>
                                          {j.categoria}
                                        </span>
                                      </td>
                                      <td className="p-3 text-muted-foreground">
                                        {j.lote ? `${j.lote}${j.sublote ? ` · ${j.sublote}` : ''}` : '—'}
                                      </td>
                                      <td className="p-3 text-right">
                                        <span className="font-semibold">{j.unidades.toLocaleString('es-CO')}</span>{' '}
                                        <span className="text-xs text-muted-foreground">{j.unidad}</span>
                                      </td>
                                      <td className="p-3 text-right text-muted-foreground">
                                        ${j.precio_unit.toLocaleString('es-CO')}
                                      </td>
                                      <td className={`p-3 pr-5 text-right font-semibold ${meta.header}`}>
                                        ${j.total.toLocaleString('es-CO')}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {desglose.cosecha.length === 0 && desglose.jornales.length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Sin registros de labores en el período.
                          </div>
                        )}
                      </>
                    )}

                    {/* Descuentos aplicados (§7.5 + §7.6) — al final del
                        bloque expandido, después del desglose de labores. */}
                    <div className="px-5 py-3 border-t border-border/40">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Descuentos
                        </p>
                        {puedeEditar && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirModalDescuento(o.operario_id, o.nombre_completo)}
                            className="h-7 gap-1.5 text-xs"
                          >
                            <Plus className="h-3 w-3" />
                            Agregar descuento
                          </Button>
                        )}
                      </div>
                      {o.descuentos.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin descuentos aplicados.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {o.descuentos.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Minus className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{d.concepto_nombre}</p>
                                  {d.observacion && (
                                    <p className="text-xs text-muted-foreground truncate">{d.observacion}</p>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm font-bold text-destructive whitespace-nowrap">
                                −${toNumber(d.valor).toLocaleString('es-CO')}
                              </p>
                              {puedeEditar && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => eliminarDescuento(o.operario_id, d.id)}
                                  disabled={eliminandoDescuentoId === d.id}
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 flex-shrink-0"
                                  title="Eliminar descuento"
                                >
                                  {eliminandoDescuentoId === d.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Total general empresa */}
        <div className="border-t border-border bg-muted/20 px-5 py-3 flex justify-end items-center gap-4">
          <span className="text-sm font-semibold text-muted-foreground">
            TOTAL ORDEN DE PAGO A {nombre.toUpperCase()}
          </span>
          <span className="text-lg font-bold text-primary">
            ${totalEmpresa.toLocaleString('es-CO')}
          </span>
        </div>

        {/* Observación de pago */}
        <div className="px-5 py-3 border-t border-border bg-muted/5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Observación:
            </span>
            <Input
              className="h-8 text-xs"
              placeholder="Observación general para esta orden de pago..."
              value={observacionPago}
              disabled={estaPagada}
              onChange={(e) => setObservacionPago(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Modal confirmación liquidación */}
      <Dialog open={modalPagoAbierto} onOpenChange={setModalPagoAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Liquidar — {nombre}
            </DialogTitle>
            <DialogDescription>
              Confirma la liquidación de la orden de pago a esta empresa
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
                <span className="text-muted-foreground">Operarios</span>
                <span>{detalle.operarios.length} personas</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-semibold">Total a pagar</span>
                <span className="font-bold text-lg text-primary">
                  ${totalEmpresa.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-amber-400/40 bg-amber-50/60 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Al confirmar, la orden quedará marcada como liquidada. Asegúrate de haber revisado todos los valores antes de continuar.
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
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmar Liquidación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal agregar descuento (§7.5) */}
      <Dialog open={!!modalDescuento} onOpenChange={(open) => !open && setModalDescuento(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="h-5 w-5 text-destructive" />
              Agregar descuento
            </DialogTitle>
            <DialogDescription>
              {modalDescuento?.operarioNombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Concepto *</Label>
              <Select
                value={nuevoDescuento.concepto_id}
                onValueChange={(v) =>
                  setNuevoDescuento((prev) => ({ ...prev, concepto_id: v }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecciona un concepto..." />
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
            <div className="space-y-1.5">
              <Label className="text-xs">Valor *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={nuevoDescuento.valor}
                onChange={(e) =>
                  setNuevoDescuento((prev) => ({ ...prev, valor: e.target.value }))
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observación (opcional)</Label>
              <Input
                placeholder="Ej: Herramienta extraviada"
                value={nuevoDescuento.observacion}
                onChange={(e) =>
                  setNuevoDescuento((prev) => ({ ...prev, observacion: e.target.value }))
                }
                className="h-9"
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
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {guardandoDescuento ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal éxito post-liquidación */}
      <Dialog open={modalExitoAbierto} onOpenChange={(open) => !open && cerrarModalExito()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              ¡Liquidación Exitosa!
            </DialogTitle>
            <DialogDescription>
              La orden de pago ha sido liquidada correctamente.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-[#1E5631]/30 bg-[#1E5631]/5 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#1E5631]/10 text-[#1E5631] flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-sm">{nombre}</p>
              <p className="text-xs text-muted-foreground">
                Total liquidado: <span className="font-bold text-foreground">${totalLiquidado.toLocaleString('es-CO')}</span>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={cerrarModalExito}
                className="bg-primary hover:bg-primary/90 gap-1.5"
              >
                <Check className="h-4 w-4" />
                Aceptar
              </Button>
              <Button
                variant="outline"
                onClick={imprimirPdf}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                onClick={enviarWhatsapp}
                disabled={enviandoWhatsapp}
                className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
              >
                {enviandoWhatsapp
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <MessageCircle className="h-4 w-4" />}
                <span className="text-xs">Enviar WhatsApp</span>
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={descargarPdf}
              disabled={descargandoPdf}
              className="w-full gap-2"
            >
              {descargandoPdf
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
              Descargar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
