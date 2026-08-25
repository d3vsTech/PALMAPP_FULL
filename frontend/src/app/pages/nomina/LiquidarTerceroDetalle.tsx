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

// ── Colores por labor (esquema V.19) ─────────────────────────────────────────
// Cada labor tiene su color: cosecha (ámbar), poda (verde oscuro finca),
// fertilización (azul), sanidad (rosa), abonada (púrpura), trabajos de finca (zinc).
type LaborMeta = { header: string; bg: string; chip: string };

const LABOR_META_COSECHA: LaborMeta = {
  header: 'text-amber-600',
  bg: 'bg-amber-50/60 dark:bg-amber-950/20',
  chip: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
};
const LABOR_META_PODA: LaborMeta = {
  header: 'text-[#1E5631]',
  bg: 'bg-[#1E5631]/5',
  chip: 'bg-[#1E5631]/10 text-[#1E5631] border-[#1E5631]/30',
};
const LABOR_META_PLATEO: LaborMeta = LABOR_META_PODA;
const LABOR_META_FERTILIZACION: LaborMeta = {
  header: 'text-blue-600',
  bg: 'bg-blue-50/60 dark:bg-blue-950/20',
  chip: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
};
const LABOR_META_ABONADA: LaborMeta = {
  header: 'text-purple-600',
  bg: 'bg-purple-50/60 dark:bg-purple-950/20',
  chip: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
};
const LABOR_META_SANIDAD: LaborMeta = {
  header: 'text-rose-600',
  bg: 'bg-rose-50/60 dark:bg-rose-950/20',
  chip: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
};
const LABOR_META_FINCA: LaborMeta = {
  header: 'text-zinc-700 dark:text-zinc-300',
  bg: 'bg-zinc-100/80 dark:bg-zinc-800/40',
  chip: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/30 dark:text-zinc-300',
};

/** Resuelve el color según el nombre de la labor (case-insensitive). */
function metaDeLabor(nombreLabor: string): LaborMeta {
  const n = (nombreLabor || '').toLowerCase();
  if (n.includes('cosecha')) return LABOR_META_COSECHA;
  if (n.includes('plateo')) return LABOR_META_PLATEO;
  if (n.includes('poda')) return LABOR_META_PODA;
  if (n.includes('fertiliz')) return LABOR_META_FERTILIZACION;
  if (n.includes('abonad')) return LABOR_META_ABONADA;
  if (n.includes('sanidad')) return LABOR_META_SANIDAD;
  return LABOR_META_FINCA;
}

// Aliases legacy usados en el JSX del desglose.
const LABOR_META_PALMA = LABOR_META_COSECHA;

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
                onClick={descargarPdf}
              >
                <Download className="h-3.5 w-3.5" />
                Descargar Comprobante
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
                    {/* Chips de labores realizadas — color por labor (V.19) */}
                    <div className="flex gap-2 flex-wrap justify-end max-w-md">
                      {(o.labores_realizadas ?? []).map((labor, idx) => {
                        const meta = metaDeLabor(labor);
                        return (
                          <span
                            key={`${labor}-${idx}`}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.chip}`}
                          >
                            {labor.toUpperCase()}
                          </span>
                        );
                      })}
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
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Sin registros de labores en el período.
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-xs text-muted-foreground bg-muted/20">
                                <th className="text-left p-3 pl-5 font-semibold">Lote</th>
                                <th className="text-left p-3 font-semibold">Sublote</th>
                                <th className="text-right p-3 font-semibold">Cantidad</th>
                                <th className="text-right p-3 font-semibold">Prom.</th>
                                <th className="text-right p-3 font-semibold">Peso (kg)</th>
                                <th className="text-right p-3 font-semibold">Precio Unit.</th>
                                <th className="text-right p-3 pr-5 font-semibold">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* ─── COSECHA ─── */}
                              {desglose.cosecha.length > 0 && (
                                <>
                                  <tr className={LABOR_META_COSECHA.bg}>
                                    <td colSpan={7} className={`px-5 py-2 text-xs font-bold tracking-wider ${LABOR_META_COSECHA.header}`}>
                                      COSECHA
                                    </td>
                                  </tr>
                                  {desglose.cosecha.map((c, idx) => (
                                    <tr
                                      key={`cosecha-${idx}`}
                                      className="border-b border-border/50 hover:bg-muted/10"
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
                                      <td className={`p-3 pr-5 text-right font-semibold ${LABOR_META_COSECHA.header}`}>
                                        ${c.total.toLocaleString('es-CO')}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="border-b border-border">
                                    <td colSpan={6} className="p-2 pr-5 text-right text-xs text-muted-foreground">
                                      Subtotal Cosecha
                                    </td>
                                    <td className={`p-2 pr-5 text-right text-sm font-bold ${LABOR_META_COSECHA.header}`}>
                                      ${totalCosecha.toLocaleString('es-CO')}
                                    </td>
                                  </tr>
                                </>
                              )}

                              {/* ─── PALMA (poda / fertilización / sanidad / abonada / plateo) ─── */}
                              {Object.entries(gruposPalma).map(([nombreLabor, filas]) => {
                                const meta = metaDeLabor(nombreLabor);
                                const subtotalGrupo = filas.reduce((s, j) => s + j.total, 0);
                                return (
                                  <React.Fragment key={`grupo-${nombreLabor}`}>
                                    <tr className={meta.bg}>
                                      <td colSpan={7} className={`px-5 py-2 text-xs font-bold tracking-wider ${meta.header}`}>
                                        {nombreLabor.toUpperCase()}
                                      </td>
                                    </tr>
                                    {filas.map((j, idx) => (
                                      <tr
                                        key={`palma-${nombreLabor}-${idx}`}
                                        className="border-b border-border/50 hover:bg-muted/10"
                                      >
                                        <td className="p-3 pl-5 font-semibold">{j.lote ?? '—'}</td>
                                        <td className="p-3 text-muted-foreground">{j.sublote ?? '—'}</td>
                                        <td className="p-3 text-right">
                                          <span className="font-semibold">{j.unidades.toLocaleString('es-CO')}</span>{' '}
                                          <span className="text-xs text-muted-foreground">{j.unidad}</span>
                                        </td>
                                        <td className="p-3 text-right text-muted-foreground">—</td>
                                        <td className="p-3 text-right text-muted-foreground">—</td>
                                        <td className="p-3 text-right text-muted-foreground">
                                          ${j.precio_unit.toLocaleString('es-CO')}
                                          <span className="text-xs ml-0.5">/{j.unidad}</span>
                                        </td>
                                        <td className={`p-3 pr-5 text-right font-semibold ${meta.header}`}>
                                          ${j.total.toLocaleString('es-CO')}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="border-b border-border">
                                      <td colSpan={6} className="p-2 pr-5 text-right text-xs text-muted-foreground">
                                        Subtotal {nombreLabor}
                                      </td>
                                      <td className={`p-2 pr-5 text-right text-sm font-bold ${meta.header}`}>
                                        ${subtotalGrupo.toLocaleString('es-CO')}
                                      </td>
                                    </tr>
                                  </React.Fragment>
                                );
                              })}

                              {/* ─── TRABAJOS DE FINCA ─── */}
                              {jornalesFinca.length > 0 && (
                                <>
                                  <tr className={LABOR_META_FINCA.bg}>
                                    <td colSpan={7} className={`px-5 py-2 text-xs font-bold tracking-wider ${LABOR_META_FINCA.header}`}>
                                      TRABAJOS DE FINCA
                                    </td>
                                  </tr>
                                  {jornalesFinca.map((j, idx) => (
                                    <tr
                                      key={`finca-${idx}`}
                                      className="border-b border-border/50 hover:bg-muted/10"
                                    >
                                      <td className="p-3 pl-5 font-semibold" colSpan={5}>
                                        {j.labor_nombre}
                                      </td>
                                      <td className="p-3 text-right text-muted-foreground">
                                        ${j.precio_unit.toLocaleString('es-CO')}
                                      </td>
                                      <td className={`p-3 pr-5 text-right font-semibold ${LABOR_META_FINCA.header}`}>
                                        ${j.total.toLocaleString('es-CO')}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="border-b border-border">
                                    <td colSpan={6} className="p-2 pr-5 text-right text-xs text-muted-foreground">
                                      Subtotal Finca
                                    </td>
                                    <td className={`p-2 pr-5 text-right text-sm font-bold ${LABOR_META_FINCA.header}`}>
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
            <div className="border-t border-destructive/20">
              <div className="flex items-center justify-between px-5 py-3 bg-destructive/5">
                <p className="text-xs font-bold uppercase tracking-wide text-destructive">
                  Descuentos
                </p>
                {puedeEditar && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => abrirModalDescuento(null, nombre)}
                    className="h-7 gap-1 text-destructive hover:bg-destructive/10 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </Button>
                )}
              </div>
              {descuentosActa.length === 0 ? (
                <div className="py-4 text-center text-sm font-semibold text-destructive/70 bg-destructive/[0.03]">
                  $0
                </div>
              ) : (
                <div className="divide-y divide-destructive/10 bg-destructive/[0.03]">
                  {descuentosActa.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 px-5 py-2.5"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Minus className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{d.concepto_nombre}</p>
                          {d.observacion && (
                            <p className="text-xs text-muted-foreground truncate">
                              {d.observacion}
                            </p>
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
                          onClick={() => eliminarDescuento(d.id)}
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
                  {totalDescuentosActa > 0 && (
                    <div className="flex items-center justify-end gap-3 px-5 py-2 bg-destructive/[0.06]">
                      <span className="text-xs font-semibold uppercase text-destructive">
                        Total descuentos
                      </span>
                      <span className="text-sm font-bold text-destructive">
                        −${totalDescuentosActa.toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

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
              Se aplicará al acta de {modalDescuento?.operarioNombre ?? 'la empresa'}
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
                type="number" step="0.001"
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
