/**
 * Vista "Ver" de un período CERRADA. Diseño V.25: ficha del período,
 * soporte imprimible y un desprendible por colaborador en lugar de una
 * tabla plana.
 *
 * Conectado a API_LIQUIDACIONES §1.1 post-wizard: registro y anulación de
 * giros (§5), desprendible JSON y PDF por fila y PDF del período (§6), y
 * reapertura (§4.3). El PDF lo arma el backend con los datos congelados
 * al confirmar, así que aquí no se recalcula nada.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import {
  ArrowLeft, AlertTriangle, RotateCcw, Loader2, Download, Printer, Banknote, CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  liquidacionesApi,
  LiquidacionesErrorCodes,
  type DesprendibleLiquidacion,
  type LiquidacionFila,
  type LiquidacionPeriodoDetalle,
} from '../../../../api/liquidaciones';
import type { ApiError } from '../../../../api/client';
import { formatFecha } from '../../../utils/fecha';
import { fmtCOP, descargarBlob, nombrePdf, semestreLabel, TEXTOS_PERIODO, type TipoPeriodoDetalle } from './textos';
import RegistrarPagoDialog, { type ObjetivoPago } from './RegistrarPagoDialog';
import DesprendibleFilaCard from './DesprendibleFilaCard';

interface Props {
  periodo: LiquidacionPeriodoDetalle;
  tipo: TipoPeriodoDetalle;
  /** Recarga el período tras un giro, anulación o reapertura. */
  onReload: () => Promise<unknown>;
}

export default function VistaPeriodoCerrado({ periodo, tipo, onReload }: Props) {
  const txt = TEXTOS_PERIODO[tipo];
  const esCesantias = tipo === 'CESANTIAS';
  const esPrima = tipo === 'PRIMA';
  const filas = periodo.filas ?? [];
  const pendientes = filas.filter(f => f.estado_pago === 'PENDIENTE');

  const [objetivoPago, setObjetivoPago] = useState<ObjetivoPago | null>(null);
  const [aAnular, setAAnular] = useState<LiquidacionFila | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [descargandoFila, setDescargandoFila] = useState<number | null>(null);
  const [descargandoPeriodo, setDescargandoPeriodo] = useState(false);

  // Desglose legal por fila: se pide una vez al desplegar y se cachea.
  const [detalles, setDetalles] = useState<Record<number, DesprendibleLiquidacion>>({});
  const [cargandoDetalle, setCargandoDetalle] = useState<number | null>(null);
  const [expandidas, setExpandidas] = useState<number[]>([]);

  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [motivoReabrir, setMotivoReabrir] = useState('');
  const [reabriendo, setReabriendo] = useState(false);

  // Reabrir solo aplica sin giros registrados (§1.1); con giros el backend
  // responde 409 LIQUIDACION_CON_PAGOS, así que se deshabilita de una.
  const reabrirDeshabilitado = periodo.estado_pago !== 'PENDIENTE';

  // Ficha del período: fondos usados y fecha del último giro.
  const fondos = Array.from(
    new Set(filas.map(f => f.empleado.fondo_cesantias).filter((x): x is string => !!x)),
  ).join(', ');
  const tasa = filas.find(f => f.tasa_aplicada != null)?.tasa_aplicada ?? 12;
  const ultimoGiro = filas
    .map(f => f.fecha_pago)
    .filter((x): x is string => !!x)
    .sort()
    .pop();

  const toggleDetalle = async (fila: LiquidacionFila) => {
    if (expandidas.includes(fila.id)) {
      setExpandidas(prev => prev.filter(x => x !== fila.id));
      return;
    }
    setExpandidas(prev => [...prev, fila.id]);
    if (detalles[fila.id]) return;
    setCargandoDetalle(fila.id);
    try {
      const res = await liquidacionesApi.desprendible(fila.id);
      setDetalles(prev => ({ ...prev, [fila.id]: res.data }));
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo cargar el desglose');
      setExpandidas(prev => prev.filter(x => x !== fila.id));
    } finally {
      setCargandoDetalle(null);
    }
  };

  const anularPago = async () => {
    if (!aAnular) return;
    setAnulando(true);
    try {
      const res = await liquidacionesApi.anularPago(aAnular.id);
      toast.success(res.message ?? 'Giro anulado: la fila vuelve a pendiente');
      setAAnular(null);
      await onReload();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_PAGO_NO_REGISTRADO) {
        toast.error('Esta fila no tiene un giro registrado');
      } else {
        toast.error(e.message ?? 'No se pudo anular el giro');
      }
    } finally {
      setAnulando(false);
    }
  };

  const descargarDesprendibleFila = async (fila: LiquidacionFila) => {
    setDescargandoFila(fila.id);
    try {
      const blob = await liquidacionesApi.desprendiblePdf(fila.id);
      descargarBlob(blob, nombrePdf(tipo, { documento: fila.empleado.documento }, periodo.anio, periodo.semestre));
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo descargar el desprendible');
    } finally {
      setDescargandoFila(null);
    }
  };

  const descargarPdfPeriodo = async () => {
    setDescargandoPeriodo(true);
    try {
      const blob = await liquidacionesApi.desprendiblesPeriodoPdf(periodo.id);
      descargarBlob(blob, nombrePdf(tipo, { periodoId: periodo.id }, periodo.anio, periodo.semestre));
      toast.success('Soporte descargado correctamente');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo descargar el soporte del período');
    } finally {
      setDescargandoPeriodo(false);
    }
  };

  const reabrir = async () => {
    if (motivoReabrir.trim().length < 5) {
      toast.error('Escribe el motivo de la reapertura (mínimo 5 caracteres)');
      return;
    }
    setReabriendo(true);
    try {
      const res = await liquidacionesApi.reabrir(periodo.id, motivoReabrir.trim());
      toast.success(res.message ?? 'Período reabierto');
      setReabrirOpen(false);
      setMotivoReabrir('');
      await onReload();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_CON_PAGOS) {
        toast.error('No se puede reabrir: hay filas ya giradas. Anula los giros primero.');
      } else if (e.code === LiquidacionesErrorCodes.LIQUIDACION_PERIODO_REFERENCIADO) {
        toast.error('Un período de intereses cerrado usa estas cesantías como base. Reabre primero los intereses.');
      } else {
        toast.error(e.message ?? 'No se pudo reabrir el período');
      }
    } finally {
      setReabriendo(false);
    }
  };

  return (
    <div className="space-y-6 print:space-y-3">
      <Button variant="ghost" size="sm" asChild className="gap-2 print:hidden">
        <Link to={txt.rutaTab}><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      {/* Encabezado con el estado del período */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-primary">{periodo.descripcion}</h1>
          <p className="text-muted-foreground mt-1">
            {txt.subtituloWizard} · Cerrada el {periodo.cerrado_at ? formatFecha(periodo.cerrado_at) : '—'}
            {periodo.cerrado_por ? ` por ${periodo.cerrado_por.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {periodo.vencida && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Vencida
            </Badge>
          )}
          {periodo.estado_pago === 'COMPLETO' ? (
            <Badge className="bg-success/10 text-success border border-success/30 text-sm px-3 py-1">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              {txt.badgeCompleto}
            </Badge>
          ) : periodo.estado_pago === 'PARCIAL' ? (
            <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-sm px-3 py-1">
              Giro parcial
            </Badge>
          ) : (
            <Badge className="bg-primary/10 text-primary border border-primary/30 text-sm px-3 py-1">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Liquidado
            </Badge>
          )}
        </div>
      </div>

      {/* Ficha del período */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Período</p>
              <p className="text-sm font-medium">
                {formatFecha(periodo.fecha_inicio)} – {formatFecha(periodo.fecha_fin)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                {esCesantias ? 'Fondos' : esPrima ? 'Semestre' : 'Tasa'}
              </p>
              <p className="text-sm font-medium">
                {esCesantias
                  ? (fondos || '—')
                  : esPrima
                    ? (semestreLabel(periodo.semestre) || '—')
                    : `${tasa}% anual (fija por ley)`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Fecha límite</p>
              <p
                className={`text-sm font-medium ${periodo.vencida ? 'text-destructive' : ''}`}
                title={`Fecha legal: ${formatFecha(periodo.fecha_limite_legal)}. Operativa: último día hábil.`}
              >
                {formatFecha(periodo.fecha_limite_operativa)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{txt.giradoEnLabel}</p>
              <p className={`text-sm font-semibold ${ultimoGiro ? 'text-success' : 'text-muted-foreground'}`}>
                {ultimoGiro ? formatFecha(ultimoGiro) : 'Sin giros'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones del período */}
      <div className="flex gap-3 justify-end flex-wrap print:hidden">
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
        <Button variant="outline" onClick={descargarPdfPeriodo} disabled={descargandoPeriodo} className="gap-2">
          {descargandoPeriodo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Descargar Soporte PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => setReabrirOpen(true)}
          disabled={reabrirDeshabilitado}
          title={reabrirDeshabilitado ? 'No se puede reabrir con giros registrados: anúlalos primero' : undefined}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reabrir
        </Button>
        {pendientes.length > 0 && (
          <Button onClick={() => setObjetivoPago({ fila: null, pendientes: pendientes.length })} className="gap-2">
            <Banknote className="h-4 w-4" />
            {txt.girarTodos}
          </Button>
        )}
      </div>

      {/* Totales */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
          <p className="text-xs text-muted-foreground mb-1">Total liquidado</p>
          <p className="text-2xl font-bold text-primary">{fmtCOP(periodo.totales.liquidado)}</p>
        </div>
        <div className="p-4 rounded-xl border border-success/20 bg-success/5">
          <p className="text-xs text-muted-foreground mb-1">{txt.giradoLabel}</p>
          <p className="text-2xl font-bold text-success">{fmtCOP(periodo.totales.consignado)}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-muted/20">
          <p className="text-xs text-muted-foreground mb-1">{txt.pendienteGiroLabel}</p>
          <p className="text-2xl font-bold">{fmtCOP(periodo.totales.pendiente)}</p>
        </div>
      </div>

      {periodo.advertencias_globales.length > 0 && (
        <div className="space-y-2">
          {periodo.advertencias_globales.map((a, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
              <span>{a.mensaje ?? a.code}</span>
            </div>
          ))}
        </div>
      )}

      {/* Desprendibles por colaborador */}
      <div className="space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Detalle por Colaborador</h2>
          <p className="text-sm text-muted-foreground">
            {filas.length} colaborador{filas.length !== 1 ? 'es' : ''} liquidado{filas.length !== 1 ? 's' : ''}
          </p>
        </div>
        {filas.map((fila) => (
          <DesprendibleFilaCard
            key={fila.id}
            fila={fila}
            tipo={tipo}
            anio={periodo.anio}
            detalle={detalles[fila.id]}
            cargandoDetalle={cargandoDetalle === fila.id}
            expandido={expandidas.includes(fila.id)}
            onToggleDetalle={() => toggleDetalle(fila)}
            descargandoPdf={descargandoFila === fila.id}
            onDescargarPdf={() => descargarDesprendibleFila(fila)}
            onRegistrarGiro={() => setObjetivoPago({ fila, pendientes: 1 })}
            onAnularGiro={() => setAAnular(fila)}
          />
        ))}
      </div>

      {/* Registrar giro (fila o todos) */}
      <RegistrarPagoDialog
        periodoId={periodo.id}
        tipo={tipo}
        objetivo={objetivoPago}
        onClose={() => setObjetivoPago(null)}
        onRegistrado={() => { onReload(); }}
      />

      {/* Anular giro */}
      <AlertDialog open={aAnular != null} onOpenChange={(open) => !open && !anulando && setAAnular(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular el giro de {aAnular?.empleado.nombre_completo}?</AlertDialogTitle>
            <AlertDialogDescription>
              La fila vuelve a pendiente y se limpian fecha, método, referencia y fondo. El valor liquidado no cambia. Queda en auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={anulando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={anularPago}
              disabled={anulando}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {anulando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Anular giro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reabrir */}
      <AlertDialog open={reabrirOpen} onOpenChange={(open) => !open && !reabriendo && setReabrirOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reabrir "{periodo.descripcion}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Las filas vuelven a pendiente y podrás recalcular. Solo es posible si nada se ha girado{esCesantias ? ' y ningún período de intereses cerrado depende de este' : ''}. El motivo queda en auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivoReabrir">Motivo <span className="text-destructive">*</span></Label>
            <textarea
              id="motivoReabrir"
              rows={3}
              value={motivoReabrir}
              onChange={(e) => setMotivoReabrir(e.target.value)}
              placeholder="Ej: faltó una nómina por cerrar"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reabriendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={reabrir} disabled={reabriendo}>
              {reabriendo && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reabrir período
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
