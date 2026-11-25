/**
 * Detalle de un Préstamo — `GET /prestamos/{id}` (doc API_PRESTAMOS §3).
 *
 * Muestra:
 *  - Cabecera con datos del colaborador y del préstamo.
 *  - KPIs: valor total, saldo pendiente, cuota, avance.
 *  - Calendario de cuotas (PENDIENTE / APLICADA) con fecha de aplicación.
 *  - Edición inline de `concepto` y `observaciones` (siempre permitido).
 *  - Cancelar (solo si VIGENTE — doc §6, PAGADO/CANCELADO devuelven 422).
 *  - Soporte del préstamo: pagaré o autorización de descuento (§11).
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { formatThousands, parseCOP } from '../../components/lib/format';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  AlertTriangle, FileSignature, Loader2, Save, Trash2, Share2,
  Landmark, Wallet, CalendarClock, CircleCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  prestamosApi,
  PrestamoErrorCodes,
  type Prestamo,
  type EstadoPrestamo,
  type EditarPrestamoPayload,
} from '../../../api/prestamos';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';
import { SoportePrestamoCard } from '../../components/nomina/SoportePrestamoCard';
import { FilaMonto, thead, th, td } from '../../components/nomina/piezas';

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ANIO_ACTUAL = new Date().getFullYear();

/**
 * Mientras nadie haya pagado una cuota, el monto y el calendario se pueden
 * rehacer enteros. Con una cuota aplicada el backend responde
 * `PRESTAMO_NO_EDITABLE` a cualquier campo financiero.
 */
function puedeEditarMontosDe(p: Prestamo): boolean {
  return p.cuotas_pagadas === 0 && p.estado === 'VIGENTE';
}

function periodoCuota(anio: number, mes: number, quincena: number | null): string {
  const mesLabel = MESES[mes - 1] ?? String(mes);
  const q = quincena ? ` · Q${quincena}` : '';
  return `${mesLabel} ${anio}${q}`;
}

/** Formatea ISO datetime como "05 ene 2026" sin desfase. */
const fmtFecha = (s: string | null | undefined): string => formatFecha(s, { day: '2-digit', month: 'short', year: 'numeric' });

const estadoConfig: Record<EstadoPrestamo, { label: string; variant: 'info' | 'success' | 'secondary' }> = {
  VIGENTE:   { label: 'Vigente',   variant: 'info' },
  PAGADO:    { label: 'Pagado',    variant: 'success' },
  CANCELADO: { label: 'Cancelado', variant: 'secondary' },
};

export default function PrestamoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const prestamoId = id ? parseInt(id) : null;

  const [prestamo, setPrestamo] = useState<Prestamo | null>(null);
  const [cargando, setCargando] = useState(true);

  // Formulario editable
  const [editConcepto, setEditConcepto] = useState('');
  const [editObservaciones, setEditObservaciones] = useState('');
  /**
   * Lo financiero solo viaja mientras `cuotas_pagadas` sea 0: con una cuota
   * aplicada el backend responde `PRESTAMO_NO_EDITABLE`. Se guardan como texto
   * porque vienen de inputs.
   */
  const [editValorTotal, setEditValorTotal] = useState('');
  const [editNumCuotas, setEditNumCuotas] = useState('');
  const [editAnio, setEditAnio] = useState('');
  const [editMes, setEditMes] = useState('');
  const [editQuincena, setEditQuincena] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [descargandoComprobante, setDescargandoComprobante] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  // Guard contra respuestas fuera de orden si cambia el id rápido:
  // solo la carga más reciente puede setear estado.
  const reqIdRef = useRef(0);

  const cargar = () => {
    if (!prestamoId) return;
    const reqId = ++reqIdRef.current;
    setCargando(true);
    prestamosApi
      .ver(prestamoId)
      .then((res) => {
        if (reqId !== reqIdRef.current) return;
        setPrestamo(res.data);
        setEditConcepto(res.data.concepto ?? '');
        setEditObservaciones(res.data.observaciones ?? '');
        setEditValorTotal(String(Math.round(toNumber(res.data.valor_total))));
        setEditNumCuotas(String(res.data.num_cuotas));
        setEditAnio(String(res.data.inicio_anio));
        setEditMes(String(res.data.inicio_mes));
        setEditQuincena(res.data.inicio_quincena ? String(res.data.inicio_quincena) : '');
      })
      .catch((err: ApiError) => {
        if (reqId !== reqIdRef.current) return;
        toast.error(err.message ?? 'Error al cargar préstamo');
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setCargando(false);
      });
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestamoId]);

  const guardarEdicion = async () => {
    if (!prestamoId || !prestamo) return;

    const payload: EditarPrestamoPayload = {
      concepto: editConcepto.trim(),
      observaciones: editObservaciones.trim() || null,
    };

    if (puedeEditarMontosDe(prestamo)) {
      const total = parseFloat(editValorTotal) || 0;
      const cuotas = parseInt(editNumCuotas) || 0;
      if (total <= 0) return toast.error('El valor del préstamo debe ser mayor a cero');
      if (cuotas < 1 || cuotas > 120) return toast.error('El número de cuotas va de 1 a 120');
      if (prestamo.frecuencia === 'QUINCENAL' && !editQuincena) {
        return toast.error('Selecciona la quincena de inicio');
      }
      payload.valor_total = total;
      payload.num_cuotas = cuotas;
      payload.inicio_anio = parseInt(editAnio);
      payload.inicio_mes = parseInt(editMes);
      // El backend deriva la frecuencia al crear: en un MENSUAL la quincena
      // siempre va nula.
      payload.inicio_quincena = prestamo.frecuencia === 'QUINCENAL' ? parseInt(editQuincena) : null;
    }

    setGuardando(true);
    try {
      await prestamosApi.editar(prestamoId, payload);
      toast.success('Préstamo actualizado');
      navigate('/nomina/prestamos');
    } catch (err) {
      const e = err as ApiError;
      if (e.code === PrestamoErrorCodes.PRESTAMO_NO_EDITABLE) {
        toast.error('Este préstamo ya tiene cuotas aplicadas. Solo puedes editar concepto y observaciones');
      } else {
        toast.error(e.message ?? 'No se pudo actualizar');
      }
    } finally {
      setGuardando(false);
    }
  };

  const cancelarPrestamo = async () => {
    if (!prestamoId) return;
    setCancelando(true);
    try {
      await prestamosApi.eliminar(prestamoId);
      toast.success('Préstamo cancelado');
      navigate('/nomina/prestamos');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo cancelar');
    } finally {
      setCancelando(false);
      setConfirmarCancelar(false);
    }
  };

  /**
   * Descarga el comprobante que arma el backend (doc §12).
   *
   * Antes se generaba aquí con jsPDF. El logo de la finca se bajaba desde el
   * navegador y en producción no siempre llegaba, así que el papel que firma
   * el colaborador salía con el logo equivocado. El backend lo emite con el
   * membrete de la empresa, igual que el resto de los documentos.
   */
  const descargarComprobante = async () => {
    if (!prestamoId) return;
    setDescargandoComprobante(true);
    try {
      const blob = await prestamosApi.comprobantePdf(prestamoId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const doc = prestamo?.empleado.documento ?? prestamoId;
      a.download = `comprobante_prestamo_${doc}_PRE-${prestamoId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo descargar el comprobante');
    } finally {
      setDescargandoComprobante(false);
    }
  };

  /**
   * El backend solo devuelve la URL firmada, que vive siete días; el mensaje
   * y el contacto los pone el usuario en WhatsApp (doc §12.4).
   */
  const compartirComprobante = async () => {
    if (!prestamoId) return;
    setCompartiendo(true);
    try {
      const res = await prestamosApi.comprobanteWhatsapp(prestamoId);
      const nombre = prestamo?.empleado.nombre_completo ?? 'Colaborador';
      const texto =
        `Hola ${nombre}, adjunto el comprobante de tu ${prestamo?.concepto ?? 'préstamo'}.`
        + `

Descarga el PDF: ${res.data.url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo generar el enlace para compartir');
    } finally {
      setCompartiendo(false);
    }
  };

  if (cargando) {
    return (
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando préstamo...
      </Card>
    );
  }

  if (!prestamo) {
    return (
      <div className="space-y-6">
        <PageHeader
          backTo="/nomina/prestamos"
          title="Préstamo no encontrado"
          description="El préstamo que buscas no existe o fue eliminado."
        />
      </div>
    );
  }

  const cfg = estadoConfig[prestamo.estado] ?? estadoConfig.CANCELADO;
  const total = toNumber(prestamo.valor_total);
  const saldo = toNumber(prestamo.saldo_pendiente);
  const cuota = toNumber(prestamo.cuota_valor);
  const cuotas = prestamo.cuotas ?? [];
  const pagadasCount = cuotas.filter((c) => c.estado === 'APLICADA').length;
  const pctAvance = prestamo.num_cuotas > 0
    ? Math.round((prestamo.cuotas_pagadas / prestamo.num_cuotas) * 100)
    : 0;
  const puedeCancelar = prestamo.estado === 'VIGENTE';
  // Un préstamo CANCELADO está soft-deleted: el backend responde 404 a su
  // comprobante (doc §12.1). No se ofrece un botón que solo puede fallar.
  const hayComprobante = prestamo.estado !== 'CANCELADO';
  const puedeEditarMontos = puedeEditarMontosDe(prestamo);
  /** Lo que quedaría al guardar: el backend reparte igual y la última absorbe el residuo. */
  const cuotaRecalculada = (() => {
    const total = parseFloat(editValorTotal) || 0;
    const n = parseInt(editNumCuotas) || 0;
    return n > 0 ? Math.floor(total / n) : 0;
  })();
  // El año del préstamo puede ser anterior al actual: sin él, el select se
  // abriría sin la opción que ya tiene guardada.
  const aniosDisponibles = Array.from(
    new Set([prestamo.inicio_anio, ANIO_ACTUAL, ANIO_ACTUAL + 1]),
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/nomina/prestamos"
        eyebrow={`Préstamos · #${prestamo.id}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {prestamo.concepto}
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
          </span>
        }
        description={[
          prestamo.empleado.nombre_completo,
          `C.C. ${prestamo.empleado.documento}`,
          prestamo.empleado.cargo,
          prestamo.frecuencia === 'QUINCENAL' ? 'Descuento quincenal' : 'Descuento mensual',
        ].filter(Boolean).join(' · ')}
        actions={
          <>
            {/* El pagaré con la autorización de descuento (CST arts. 149-150)
                para imprimir, firmar y subir después como soporte. Lo arma el
                backend con el membrete de la finca. */}
            {hayComprobante && (<>
              <Button
                variant="outline"
                onClick={() => void descargarComprobante()}
                disabled={descargandoComprobante}
              >
                {descargandoComprobante
                  ? <Loader2 className="animate-spin" strokeWidth={2} />
                  : <FileSignature strokeWidth={2} />}
                Comprobante para firma
              </Button>
              <Button
                variant="outline"
                onClick={() => void compartirComprobante()}
                disabled={compartiendo}
              >
                {compartiendo
                  ? <Loader2 className="animate-spin" strokeWidth={2} />
                  : <Share2 strokeWidth={2} />}
                Enviar por WhatsApp
              </Button>
            </>)}
            {puedeCancelar && (
              <Button
                variant="outline"
                onClick={() => setConfirmarCancelar(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 strokeWidth={2} />
                Cancelar préstamo
              </Button>
            )}
          </>
        }
      />

      <StatStrip
        items={[
          { label: 'Valor total', value: `$${total.toLocaleString('es-CO')}`, icon: Landmark, tone: 'blue' },
          { label: 'Saldo pendiente', value: `$${saldo.toLocaleString('es-CO')}`, icon: Wallet, tone: 'amber' },
          {
            label: 'Cuota',
            value: `$${cuota.toLocaleString('es-CO')}`,
            note: prestamo.frecuencia === 'QUINCENAL' ? 'Por quincena' : 'Por mes',
            icon: CalendarClock,
            tone: 'neutral',
          },
          {
            label: 'Avance',
            value: prestamo.avance ?? `${prestamo.cuotas_pagadas}/${prestamo.num_cuotas}`,
            note: `${pctAvance} % pagado`,
            icon: CircleCheck,
            tone: 'green',
          },
        ]}
      />

      {/* Formulario editable — concepto y observaciones siempre editables */}
      <Card>
        <CardHeader>
          <h3>Editar información</h3>
          <CardDescription>Concepto, observaciones y, si no hay cuotas aplicadas, el plan de descuento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {prestamo.cuotas_pagadas > 0 && (
            <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
              <p className="text-sm text-foreground">
                Este préstamo ya tiene{' '}
                <strong>
                  {prestamo.cuotas_pagadas} {prestamo.cuotas_pagadas === 1 ? 'cuota aplicada' : 'cuotas aplicadas'}
                </strong>.
                Solo puedes editar concepto y observaciones. Cambiar el valor total o el número de cuotas
                requiere cancelar el préstamo y crear uno nuevo.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="prestamode-concepto">Concepto <span className="text-destructive">*</span></Label>
            <Input id="prestamode-concepto"
              value={editConcepto}
              onChange={(e) => setEditConcepto(e.target.value)}
              placeholder="Ej: Préstamo personal"
            />
          </div>
          {/* Mientras no se aplique ninguna cuota el calendario se rehace
              entero, que es lo que el backend permite. Con una sola cuota
              pagada esto desaparece y responde `PRESTAMO_NO_EDITABLE`. */}
          {puedeEditarMontos && (
            <div className="space-y-4 rounded-lg bg-muted/60 p-4">
              <p className="text-xs text-muted-foreground">
                Todavía no se ha aplicado ninguna cuota, así que el monto y el calendario
                se pueden corregir. Al guardar se vuelven a generar todas las cuotas.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prestamode-valor">Valor del préstamo</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="prestamode-valor"
                      inputMode="numeric"
                      value={formatThousands(editValorTotal)}
                      onChange={(e) => setEditValorTotal(parseCOP(e.target.value))}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prestamode-cuotas">
                    {prestamo.frecuencia === 'QUINCENAL' ? 'Número de quincenas' : 'Número de meses'}
                  </Label>
                  <Input id="prestamode-cuotas"
                    inputMode="numeric"
                    value={editNumCuotas}
                    onChange={(e) => setEditNumCuotas(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="prestamode-ano-de-inicio">Año de inicio</Label>
                  <Select value={editAnio} onValueChange={setEditAnio}>
                    <SelectTrigger id="prestamode-ano-de-inicio"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {aniosDisponibles.map((a) => (
                        <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prestamode-mes-de-inicio">Mes de inicio</Label>
                  <Select value={editMes} onValueChange={setEditMes}>
                    <SelectTrigger id="prestamode-mes-de-inicio"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {prestamo.frecuencia === 'QUINCENAL' && (
                  <div className="space-y-2">
                    <Label htmlFor="prestamode-quincena">Quincena</Label>
                    <Select value={editQuincena} onValueChange={setEditQuincena}>
                      <SelectTrigger id="prestamode-quincena"><SelectValue placeholder="Elegir" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1ª quincena (1–15)</SelectItem>
                        <SelectItem value="2">2ª quincena (16–fin)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {cuotaRecalculada > 0 && (
                <div className="rounded-lg bg-card px-4 py-3">
                  <FilaMonto
                    label={`Cuota ${prestamo.frecuencia === 'QUINCENAL' ? 'por quincena' : 'por mes'}`}
                    value={`$${cuotaRecalculada.toLocaleString('es-CO')}`}
                    strong
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                La última cuota absorbe el residuo del redondeo.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="prestamode-observaciones">
              Observaciones <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea id="prestamode-observaciones"
              value={editObservaciones}
              onChange={(e) => setEditObservaciones(e.target.value)}
              rows={3}
              placeholder="Ej: aprobado por gerencia, motivo del préstamo"
              className="resize-none"
            />
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <Button
              onClick={guardarEdicion}
              disabled={guardando || !editConcepto.trim()}
            >
              {guardando ? <Loader2 className="animate-spin" strokeWidth={2} /> : <Save strokeWidth={2} />}
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* El pagaré o la autorización de descuento (CST arts. 149-150). La
          tarjeta se oculta sola mientras el backend no exponga el soporte. */}
      <SoportePrestamoCard
        prestamoId={prestamo.id}
        documento={prestamo.documento}
        onCambio={cargar}
      />

      {/* Calendario de cuotas */}
      <Card className="gap-0 overflow-hidden">
        <CardHeader className="border-b pb-5">
          <CardTitle>Calendario de cuotas</CardTitle>
          <CardDescription>
            {cuotas.length} cuotas · {pagadasCount} aplicada{pagadasCount !== 1 ? 's' : ''} ·{' '}
            {cuotas.length - pagadasCount} pendiente{cuotas.length - pagadasCount !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={thead}>
                <tr>
                  <th className="px-6 py-2.5 text-left font-semibold">Cuota</th>
                  <th className={`${th} text-left`}>Período</th>
                  <th className={`${th} text-right`}>Monto</th>
                  <th className={`${th} text-left`}>Estado</th>
                  <th className="px-6 py-2.5 text-left font-semibold">Aplicada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cuotas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                      No hay cuotas registradas.
                    </td>
                  </tr>
                ) : (
                  cuotas.map((c) => {
                    const aplicada = c.estado === 'APLICADA';
                    return (
                      <tr key={c.id}>
                        <td className="px-6 py-3 tabular-nums text-muted-foreground">{c.numero_cuota}</td>
                        <td className={`${td} font-medium text-foreground`}>{periodoCuota(c.anio, c.mes, c.quincena)}</td>
                        <td className={`${td} text-right tabular-nums text-foreground`}>
                          ${toNumber(c.monto).toLocaleString('es-CO')}
                        </td>
                        <td className={td}>
                          <Badge variant={aplicada ? 'success' : 'warning'}>
                            {aplicada ? 'Aplicada' : 'Pendiente'}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-muted-foreground">
                          {fmtFecha(c.aplicada_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      </Card>

      <AlertDialog open={confirmarCancelar} onOpenChange={setConfirmarCancelar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar préstamo</AlertDialogTitle>
            <AlertDialogDescription>
              El préstamo quedará cancelado. Sus cuotas pendientes dejarán de aparecer en la
              liquidación de los siguientes períodos. Las cuotas ya aplicadas en nóminas cerradas
              se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelando}>Cerrar</AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelarPrestamo}
              disabled={cancelando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelando ? 'Cancelando...' : 'Cancelar préstamo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
