/**
 * Pantalla 5 — Detalle de una liquidación final (API_LIQUIDACIONES §11.8).
 *
 * El detalle ES el comprobante: el backend lo lee de lo persistido y nunca
 * recalcula, así que cambiar el salario o cerrar una nómina después no mueve
 * lo que aquí se muestra. Esta vista solo pinta.
 *
 * Igual que el diseño, abre en modo resumen (datos, conceptos y acciones al
 * pie) y deja pasar al modo detalle, con la columna lateral de resumen.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
  ArrowLeft,
  Ban,
  Banknote,
  Check,
  CheckCircle,
  Download,
  FileText,
  FileX,
  Info,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
  type LucideIcon,
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
  ESTADO_BADGE,
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
import DatoLista, { type Dato } from '../../components/liquidaciones/DatoLista';
import ConceptosTabla, { type Concepto } from '../../components/liquidaciones/ConceptosTabla';
import VacioCard from '../../components/liquidaciones/VacioCard';
import { cn } from '../../components/ui/utils';
import { METODO_PAGO_LABEL } from './periodo/textos';

const VOLVER = '/liquidaciones?tab=liquidacion-final';

/** El enlace firmado solo existe en APROBADA y PAGADA (§11.8, bloque `compartir`). */
const SIN_ENLACE = 'El enlace para compartir se genera al aprobar la liquidación.';

type Comprobante = ComprobanteLiquidacionFinal;

/** Acciones que el estado y los permisos habilitan; `undefined` = no se ofrece. */
interface AccionesDetalle {
  descargando: boolean;
  onPdf: () => void;
  onImprimir: () => void;
  onCompartir?: () => void;
  onAceptar?: () => void;
  onPagar?: () => void;
  onEditar?: () => void;
}

/** Detalle bajo el concepto: texto, fórmula y norma, si vienen. */
function detalleConcepto(c: ConceptoLiquidacion) {
  if (!c.detalle_texto && !c.formula_aplicada && !c.norma) return undefined;
  return (
    <>
      {c.detalle_texto && <span className="block">{c.detalle_texto}</span>}
      {c.formula_aplicada && <span className="block">{c.formula_aplicada}</span>}
      {c.norma && <span className="block">{c.norma}</span>}
    </>
  );
}

function conceptosDevengados(liq: Comprobante): Concepto[] {
  return [
    ...liq.conceptos.devengados.map((c) => ({
      label: c.nombre,
      detalle: detalleConcepto(c),
      valor: fmtCOP(c.valor),
    })),
    { label: 'Total devengado', valor: fmtCOP(liq.totales.total_devengado), total: true },
  ];
}

function conceptosDeducidos(liq: Comprobante): Concepto[] {
  const total = liq.totales.total_deducciones;
  return [
    ...liq.conceptos.deducciones.map((c) => ({
      label: c.nombre,
      detalle: detalleConcepto(c),
      valor: fmtCOP(c.valor),
      negativo: c.valor > 0,
    })),
    { label: 'Total deducciones', valor: fmtCOP(total), negativo: total > 0, total: true },
  ];
}

// ─── Piezas de presentación ───────────────────────────────────────────────────

function EstadoBadges({ estado, historica, className }: {
  estado: EstadoLiquidacionFinal;
  historica: boolean;
  className?: string;
}) {
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)}>
      <Badge variant={ESTADO_BADGE[estado]}>{ESTADO_LIQUIDACION_LABEL[estado]}</Badge>
      {historica && <Badge variant="outline">Histórico</Badge>}
    </span>
  );
}

function Aviso({ tono, icon: Icon, children }: {
  tono: 'warning' | 'destructive';
  icon: LucideIcon;
  children: ReactNode;
}) {
  const fondo = tono === 'warning' ? 'bg-warning-soft' : 'bg-destructive-soft';
  const color = tono === 'warning' ? 'text-warning' : 'text-destructive';
  return (
    <div className={cn('flex gap-2 rounded-lg p-3 text-sm text-foreground', fondo)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', color)} strokeWidth={2} />
      <p>{children}</p>
    </div>
  );
}

/** Marca de simulación, anulación y bloqueantes, arriba de todo. */
function AlertasLiquidacion({ liq }: { liq: Comprobante }) {
  const anulacion = liq.estado === 'ANULADA' ? liq.anulacion : null;
  return (
    <div className="space-y-3 empty:hidden print:hidden">
      {liq.marca && <Aviso tono="warning" icon={Info}>{liq.marca}</Aviso>}
      {anulacion && (
        <Aviso tono="destructive" icon={Ban}>
          Anulada el {fmtFecha(anulacion.anulado_at)}
          {anulacion.anulado_por ? ` por ${anulacion.anulado_por}` : ''}: {anulacion.motivo}
        </Aviso>
      )}
      {liq.bloqueantes.map((b, i) => (
        <Aviso key={`${b.code}-${i}`} tono="warning" icon={AlertTriangle}>{b.mensaje}</Aviso>
      ))}
    </div>
  );
}

function causaTerminacion(liq: Comprobante) {
  return (
    <>
      {liq.retiro.motivo_etiqueta ?? 'Sin motivo'}
      {liq.retiro.indemniza && (
        <span className="block text-xs font-normal text-muted-foreground">Genera indemnización</span>
      )}
    </>
  );
}

/**
 * Salario y auxilio del contrato, como en el diseño.
 *
 * El comprobante trae el salario contractual, pero del auxilio solo trae si el
 * colaborador lo tiene; el monto no viaja en el contrato, así que se muestra el
 * sí o el no y nunca un valor inventado.
 */
function datosRemuneracion(liq: Comprobante): Dato[] {
  const salario = liq.empleado.salario_contractual;
  const auxilio = liq.empleado.subsidio_transporte;
  return [
    { label: 'Salario básico', value: salario == null ? '—' : fmtCOP(salario) },
    { label: 'Auxilio de transporte', value: auxilio == null ? '—' : auxilio ? 'Sí' : 'No' },
  ];
}

/** Datos del colaborador; el resumen usa la rejilla de tres columnas del diseño. */
function DatosColaborador({ liq, resumen }: { liq: Comprobante; resumen: boolean }) {
  const estado = liq.estado ?? 'BORRADOR';
  const tipoContrato = liq.contrato.tipo_contrato_etiqueta ?? TIPO_CONTRATO_LABEL[liq.contrato.tipo_contrato];
  const comunes: Dato[] = [
    { label: 'Cargo', value: liq.empleado.cargo ?? 'Sin cargo' },
    { label: 'Tipo de contrato', value: tipoContrato },
    { label: 'Fecha de ingreso', value: fmtFecha(liq.contrato.fecha_inicio) },
  ];
  const items: Dato[] = resumen
    ? [
        { label: 'Nombre completo', value: liq.empleado.nombre_completo },
        ...comunes,
        { label: 'Fecha de retiro', value: fmtFecha(liq.retiro.fecha_retiro) },
        { label: 'Tiempo de servicio', value: liq.retiro.tiempo_servicio.texto },
        { label: 'Causa de terminación', value: causaTerminacion(liq) },
        { label: 'Estado', value: <EstadoBadges estado={estado} historica={liq.origen === 'HISTORICO'} /> },
        { label: 'Cédula', value: liq.empleado.documento },
      ]
    : [
        { label: 'Cédula', value: liq.empleado.documento },
        ...comunes,
        { label: 'Tiempo de servicio', value: liq.retiro.tiempo_servicio.texto },
        { label: 'Fecha de retiro', value: fmtFecha(liq.retiro.fecha_retiro) },
        { label: 'Causa de terminación', value: causaTerminacion(liq) },
        ...datosRemuneracion(liq),
      ];

  return (
    <SeccionCard
      title="Colaborador"
      description={resumen ? undefined : 'Datos del contrato y de la terminación.'}
    >
      <DatoLista className={resumen ? 'lg:grid-cols-3' : undefined} items={items} />
      {liq.contrato.tipo_contrato_origen === 'MANUAL' && (
        <div className="mt-4">
          <Aviso tono="warning" icon={AlertTriangle}>
            El tipo de contrato se cambió a mano en esta liquidación.
          </Aviso>
        </div>
      )}
    </SeccionCard>
  );
}

function ListaDeducciones({ liq }: { liq: Comprobante }) {
  return (
    <>
      {liq.conceptos.deducciones.length === 0 ? (
        <p className="py-2.5 text-sm text-muted-foreground">Sin deducciones.</p>
      ) : (
        <ConceptosTabla items={conceptosDeducidos(liq)} />
      )}
      {liq.seguridad_social?.nota && (
        <p className="mt-2 text-xs text-muted-foreground">{liq.seguridad_social.nota}</p>
      )}
    </>
  );
}

function NetoPagar({ liq }: { liq: Comprobante }) {
  return (
    <div className="flex flex-col gap-1 border-t border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">Neto a pagar</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {fmtCOP(liq.totales.total_devengado)} devengado − {fmtCOP(liq.totales.total_deducciones)} deducciones
        </p>
      </div>
      <p className="text-3xl font-bold text-foreground">{fmtCOP(liq.totales.total_neto)}</p>
    </div>
  );
}

/** Resumen: devengados y deducidos lado a lado, como en el diseño. */
function ConceptosResumen({ liq }: { liq: Comprobante }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="px-5 py-5 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-1">Conceptos devengados</h3>
            <ConceptosTabla items={conceptosDevengados(liq)} />
          </div>
          <div>
            <h3 className="mb-1">Conceptos deducidos</h3>
            <ListaDeducciones liq={liq} />
          </div>
        </div>
      </div>
      <NetoPagar liq={liq} />
    </div>
  );
}

/** Detalle: devengados arriba y deducidos abajo, bajo un título de tarjeta. */
function ConceptosDetalle({ liq }: { liq: Comprobante }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h3>Detalle de la liquidación</h3>
      </div>
      <div className="space-y-6 px-5 py-5 sm:px-6">
        <div>
          <p className="mb-1 text-[13px] font-medium text-muted-foreground">Conceptos devengados</p>
          <ConceptosTabla items={conceptosDevengados(liq)} />
        </div>
        <div>
          <p className="mb-1 text-[13px] font-medium text-muted-foreground">Conceptos deducidos</p>
          <ListaDeducciones liq={liq} />
        </div>
      </div>
      <NetoPagar liq={liq} />
    </div>
  );
}

/** Cómo se liquidó y observaciones. */
function TarjetasMetodo({ liq }: { liq: Comprobante }) {
  return (
    <>
      <SeccionCard title="Cómo se liquidó">
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">{liq.metodo_liquidacion.texto}</p>
          {liq.metodo_liquidacion.normas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {liq.metodo_liquidacion.normas.map((n) => (
                <Badge key={n} variant="secondary">{n}</Badge>
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
    </>
  );
}

/** Avisos del cálculo y nota de retención en la fuente. */
function TarjetasAvisos({ liq }: { liq: Comprobante }) {
  return (
    <>
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
      {liq.retencion?.aplica && (
        <SeccionCard title="Retención en la fuente">
          <p className="text-sm text-muted-foreground">{liq.retencion.nota}</p>
        </SeccionCard>
      )}
    </>
  );
}

/** Barra de acciones al pie del resumen, con las clases de ResumenLiquidacion. */
function BarraResumen({ acciones: a, onVerDetalle }: { acciones: AccionesDetalle; onVerDetalle: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end print:hidden">
      <div className="flex flex-col-reverse gap-2 sm:mr-auto sm:flex-row">
        {a.onEditar && (
          <Button onClick={a.onEditar} variant="ghost">
            <ArrowLeft strokeWidth={2} />
            Volver a editar
          </Button>
        )}
        <Button onClick={onVerDetalle} variant="ghost">
          <FileText strokeWidth={2} />
          Ver detalle
        </Button>
      </div>
      <Button onClick={a.onImprimir} variant="outline" disabled={a.descargando}>
        <Printer strokeWidth={2} />
        Imprimir
      </Button>
      <Button
        onClick={a.onCompartir}
        variant="outline"
        disabled={!a.onCompartir}
        title={a.onCompartir ? undefined : SIN_ENLACE}
      >
        <MessageCircle strokeWidth={2} />
        WhatsApp
      </Button>
      <Button onClick={a.onPdf} variant="outline" disabled={a.descargando}>
        {a.descargando ? <Loader2 className="animate-spin" /> : <Download strokeWidth={2} />}
        Descargar PDF
      </Button>
      {a.onAceptar && (
        <Button onClick={a.onAceptar}>
          <Check strokeWidth={2} />
          Aceptar
        </Button>
      )}
      {a.onPagar && (
        <Button onClick={a.onPagar}>
          <Banknote strokeWidth={2} />
          Registrar pago
        </Button>
      )}
    </div>
  );
}

/** Botones de la columna lateral del modo detalle. */
function BotonesLaterales({ acciones: a, onVerResumen }: { acciones: AccionesDetalle; onVerResumen: () => void }) {
  const hayPrincipal = Boolean(a.onAceptar || a.onPagar);
  return (
    <div className="space-y-2 border-t border-border pt-4 print:hidden">
      {a.onAceptar && (
        <Button onClick={a.onAceptar} className="w-full">
          <CheckCircle strokeWidth={2} />
          Aceptar
        </Button>
      )}
      {a.onPagar && (
        <Button onClick={a.onPagar} className="w-full">
          <Banknote strokeWidth={2} />
          Registrar pago
        </Button>
      )}
      <Button onClick={onVerResumen} variant={hayPrincipal ? 'outline' : 'default'} className="w-full">
        <CheckCircle strokeWidth={2} />
        Ver resumen
      </Button>
      {a.onEditar && (
        <Button variant="outline" className="w-full" onClick={a.onEditar}>
          <Pencil strokeWidth={2} />
          Volver a editar
        </Button>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" disabled={a.descargando} onClick={a.onPdf} aria-label="Descargar PDF">
          {a.descargando ? <Loader2 className="animate-spin" /> : <Download strokeWidth={2} />}
          <span className="hidden sm:inline lg:hidden xl:inline">PDF</span>
        </Button>
        <Button variant="outline" disabled={a.descargando} onClick={a.onImprimir} aria-label="Imprimir">
          <Printer strokeWidth={2} />
          <span className="hidden sm:inline lg:hidden xl:inline">Imprimir</span>
        </Button>
        <Button
          variant="outline"
          onClick={a.onCompartir}
          disabled={!a.onCompartir}
          title={a.onCompartir ? undefined : SIN_ENLACE}
          aria-label="Compartir por WhatsApp"
        >
          <MessageCircle strokeWidth={2} />
          <span className="hidden sm:inline lg:hidden xl:inline">Compartir</span>
        </Button>
      </div>
    </div>
  );
}

/** Vacaciones compensadas y datos del pago, si los hay. */
function DatosPago({ liq }: { liq: Comprobante }) {
  return (
    <>
      {liq.vacaciones.saldo_dias > 0 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Vacaciones compensadas</span>
          <span className="font-medium tabular-nums text-foreground">{fmtDias(liq.vacaciones.saldo_dias)} días</span>
        </div>
      )}
      {liq.pago.fecha_pago && (
        <div className="space-y-0.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Pago</span>
            <span className="font-medium text-foreground">{fmtFecha(liq.pago.fecha_pago)}</span>
          </div>
          {liq.pago.metodo_pago && <p className="text-right text-xs text-muted-foreground">{METODO_PAGO_LABEL[liq.pago.metodo_pago] ?? liq.pago.metodo_pago}</p>}
          {liq.pago.referencia_pago && (
            <p className="text-right text-xs text-muted-foreground">Ref. {liq.pago.referencia_pago}</p>
          )}
        </div>
      )}
    </>
  );
}

function NotasPie({ liq }: { liq: Comprobante }) {
  const { creado_por: creadoPor, aprobado_por: aprobadoPor, aprobado_at: aprobadoAt } = liq.auditoria;
  return (
    <>
      {liq.compartir && (
        <p className="text-xs text-muted-foreground">
          El enlace que se envía por WhatsApp abre sin contraseña y vence el {fmtFecha(liq.compartir.expires_at)}.
        </p>
      )}
      {(creadoPor || aprobadoPor) && (
        <div className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
          {creadoPor && <p>Creada por {creadoPor}</p>}
          {aprobadoPor && <p>Aprobada por {aprobadoPor} el {fmtFecha(aprobadoAt)}</p>}
        </div>
      )}
    </>
  );
}

/** Columna lateral del modo detalle: totales, estado, pago y acciones. */
function ResumenLateral({ liq, acciones, onVerResumen }: {
  liq: Comprobante;
  acciones: AccionesDetalle;
  onVerResumen: () => void;
}) {
  const totalDeducciones = liq.totales.total_deducciones;
  return (
    <SeccionCard title="Resumen" className="lg:sticky lg:top-6">
      <div className="space-y-5">
        <ConceptosTabla
          items={[
            { label: 'Fecha de retiro', valor: fmtFecha(liq.retiro.fecha_retiro) },
            { label: 'Causa', valor: liq.retiro.motivo_etiqueta ?? 'Sin motivo' },
            { label: 'Total devengado', valor: fmtCOP(liq.totales.total_devengado) },
            { label: 'Total deducciones', valor: fmtCOP(totalDeducciones), negativo: totalDeducciones > 0 },
            { label: 'Neto a pagar', valor: fmtCOP(liq.totales.total_neto), total: true },
          ]}
        />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Estado</span>
          <EstadoBadges
            estado={liq.estado ?? 'BORRADOR'}
            historica={liq.origen === 'HISTORICO'}
            className="justify-end"
          />
        </div>
        <DatosPago liq={liq} />
        <BotonesLaterales acciones={acciones} onVerResumen={onVerResumen} />
        <NotasPie liq={liq} />
      </div>
    </SeccionCard>
  );
}

interface OpcionesMenu {
  anularPago: boolean;
  anularLiquidacion: boolean;
  eliminar: boolean;
}

/** Qué ofrece el menú según estado, origen y permisos. */
function opcionesMenu(liq: Comprobante, hasPermiso: (p: string) => boolean): OpcionesMenu | null {
  const esHistorica = liq.origen === 'HISTORICO';
  const estado = liq.estado ?? 'BORRADOR';
  const esBorrador = estado === 'BORRADOR' && !esHistorica;
  const esAprobada = estado === 'APROBADA' && !esHistorica;
  const opciones: OpcionesMenu = {
    anularPago: estado === 'PAGADA' && !esHistorica && hasPermiso('liquidaciones.pagar'),
    anularLiquidacion: (esBorrador || esAprobada) && hasPermiso('liquidaciones.liquidar'),
    eliminar: (esBorrador || esHistorica) && hasPermiso('liquidaciones.eliminar'),
  };
  return Object.values(opciones).some(Boolean) ? opciones : null;
}

/** Menú de "Más acciones": anular pago, anular liquidación y eliminar. */
function MenuAcciones({ opciones, historica, eliminando, onAnular, onEliminar }: {
  opciones: OpcionesMenu;
  historica: boolean;
  eliminando: boolean;
  onAnular: (modo: ModoAnulacion) => void;
  onEliminar: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Más acciones">
          <MoreHorizontal strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {opciones.anularPago && (
          <DropdownMenuItem onClick={() => onAnular('pago')} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Anular pago
          </DropdownMenuItem>
        )}
        {opciones.anularLiquidacion && (
          <DropdownMenuItem onClick={() => onAnular('liquidacion')} className="gap-2 text-destructive focus:text-destructive">
            <Ban className="h-4 w-4" />
            Anular liquidación
          </DropdownMenuItem>
        )}
        {opciones.eliminar && (
          <DropdownMenuItem onClick={onEliminar} disabled={eliminando} className="gap-2 text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4" />
            {historica ? 'Eliminar registro histórico' : 'Eliminar borrador'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function LiquidacionFinalDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermiso } = useAuth();

  const [liq, setLiq] = useState<Comprobante | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(true);

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
      toast.success(liq.origen === 'HISTORICO' ? 'Registro histórico eliminado' : 'Borrador eliminado');
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
          icon={FileX}
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

  /**
   * PR-L14 (§11.1) — Una liquidación cargada desde archivo es el registro de
   * un pago hecho antes del sistema: nace PAGADA y no pasa por el ciclo de
   * vida. Editar, aprobar, anular y tocar el pago responden 409
   * `LIQUIDACION_HISTORICA`, así que esos botones no se ofrecen. Lo único
   * que admite, además de verse e imprimirse, es eliminarse.
   */
  const esHistorica = liq.origen === 'HISTORICO';
  const estado = liq.estado ?? 'BORRADOR';
  const esBorrador = estado === 'BORRADOR' && !esHistorica;
  const esAprobada = estado === 'APROBADA' && !esHistorica;
  const whatsappUrl = liq.compartir?.whatsapp_url;

  const acciones: AccionesDetalle = {
    descargando,
    onPdf: () => void abrirPdf(false),
    onImprimir: () => void abrirPdf(true),
    onCompartir: whatsappUrl ? () => window.open(whatsappUrl, '_blank', 'noopener') : undefined,
    onAceptar: esBorrador && hasPermiso('liquidaciones.liquidar') ? () => setAprobando(true) : undefined,
    onPagar: esAprobada && hasPermiso('liquidaciones.pagar') ? () => setPagando(true) : undefined,
    onEditar: esBorrador && hasPermiso('liquidaciones.editar')
      ? () => navigate(`/liquidaciones/liquidacion-final/${liq.id}/editar`)
      : undefined,
  };

  const opciones = opcionesMenu(liq, hasPermiso);
  const menu = opciones ? (
    <MenuAcciones
      opciones={opciones}
      historica={esHistorica}
      eliminando={eliminando}
      onAnular={setAnulando}
      onEliminar={() => void eliminar()}
    />
  ) : undefined;
  const eyebrow = liq.numero_comprobante
    ? `Liquidación final de contrato · ${liq.numero_comprobante}`
    : 'Liquidación final de contrato';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={liq.empleado.nombre_completo}
        description={mostrarResumen ? 'Resumen de la liquidación final.' : 'Detalle de la liquidación final.'}
        backTo={VOLVER}
        actions={menu}
        className="print:hidden"
      />

      <AlertasLiquidacion liq={liq} />

      {mostrarResumen ? (
        <>
          <DatosColaborador liq={liq} resumen />
          <ConceptosResumen liq={liq} />
          <TarjetasMetodo liq={liq} />
          <TarjetasAvisos liq={liq} />
          <BarraResumen acciones={acciones} onVerDetalle={() => setMostrarResumen(false)} />
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <DatosColaborador liq={liq} resumen={false} />
            <ConceptosDetalle liq={liq} />
            <TarjetasMetodo liq={liq} />
          </div>
          <div className="space-y-6">
            <ResumenLateral liq={liq} acciones={acciones} onVerResumen={() => setMostrarResumen(true)} />
            <TarjetasAvisos liq={liq} />
          </div>
        </div>
      )}

      {aprobando && (
        <AprobarLiquidacionDialog
          liquidacion={liq}
          onCerrar={() => setAprobando(false)}
          onAprobada={setLiq}
          onDesactualizada={() => void cargar()}
        />
      )}

      {pagando && (
        <PagoLiquidacionDialog liquidacion={liq} onCerrar={() => setPagando(false)} onPagada={setLiq} />
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
