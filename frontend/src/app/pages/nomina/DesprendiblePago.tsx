/**
 * Desprendible de pago — diseño portado de V.15.
 *
 * Layout V.15:
 *  - Header del desprendible: grid 3 columnas con panel logo + título
 *  - Grid 3x2 mini-cards con info (Nombre, Cédula, Base, Fecha, Período, Días)
 *  - Detalle de días trabajados (tabla completa para VARIABLE) — pendiente API
 *  - Bloques DEVENGADO / DEDUCCIONES / BONIFICACIÓN con border-l-3 y colores
 *  - TOTAL NETO grande
 *  - Footer con firma y huella
 *
 * Acciones: Aceptar, Imprimir, WhatsApp, Descargar PDF.
 * Conexiones API: `nominaApi.desprendible`, `desprendiblePdf`, `desprendibleWhatsapp`.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  Check, Printer, Download, MessageCircle, ArrowLeft, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { nominaApi, DesprendibleData } from '../../../api/nomina';
import type { ApiError } from '../../../api/client';
import { DetalleDescansos } from '../../components/nomina/DetalleDescansos';
import { DetalleAusencias } from '../../components/nomina/DetalleAusencias';
import { FaltasInjustificadas } from '../../components/nomina/FaltasInjustificadas';
import { DiasVacaciones } from '../../components/nomina/DiasVacaciones';

function fmt(n: number): string {
  return `$${n.toLocaleString('es-CO')}`;
}

/**
 * Nombre del archivo del desprendible, igual al que usa el backend en el
 * `Content-Disposition` de `GET /desprendible/pdf` (§6.3).
 */
export function nombreArchivoDesprendible(data: DesprendibleData): string {
  const mes = String(data.nomina.mes).padStart(2, '0');
  const q = data.nomina.quincena ? `_Q${data.nomina.quincena}` : '';
  return `desprendible_${data.empleado.documento}_${data.nomina.anio}_${mes}${q}.pdf`;
}

export default function DesprendiblePago() {
  const { nominaId, colaboradorId } = useParams();
  const navigate = useNavigate();
  const nominaEmpleadoId = colaboradorId ? parseInt(colaboradorId) : null;

  const [data, setData] = useState<DesprendibleData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [generandoWa, setGenerandoWa] = useState(false);

  useEffect(() => {
    if (!nominaEmpleadoId) return;
    setCargando(true);
    nominaApi
      .desprendible(nominaEmpleadoId)
      .then((res) => setData(res.data))
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar desprendible'))
      .finally(() => setCargando(false));
  }, [nominaEmpleadoId]);

  /**
   * Descarga el PDF que genera el backend (§6.3).
   *
   * Antes se armaba acá con jsPDF, porque el blade viejo pegaba los valores
   * al texto sin alineación. Ese blade se reescribió con el layout de
   * membrete común a los nueve documentos de la plataforma: logo de la finca,
   * pie con NIT y paginación. Seguir generándolo en el navegador dejaba el
   * PDF que se descarga distinto del que se comparte por WhatsApp, que
   * siempre apuntó al del backend.
   */
  const descargarPdf = async () => {
    if (!nominaEmpleadoId || !data) return;
    setDescargando(true);
    try {
      const blob = await nominaApi.desprendiblePdf(nominaEmpleadoId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivoDesprendible(data);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'Error al descargar el desprendible');
    } finally {
      setDescargando(false);
    }
  };

  const enviarWhatsapp = async () => {
    if (!nominaEmpleadoId) return;
    setGenerandoWa(true);
    // Mensaje base con la data del desprendible — siempre se puede armar
    const nombre = data?.empleado.nombre_completo ?? 'Colaborador';
    const periodo = data?.nomina.periodo_label ?? '';
    const neto = data?.liquidacion.total_neto ?? 0;
    const resumen =
      `Hola ${nombre}, adjunto tu desprendible de pago del período ${periodo}. `
      + `Neto a pagar: $${neto.toLocaleString('es-CO')}.`;
    try {
      const res = await nominaApi.desprendibleWhatsapp(nominaEmpleadoId);
      const text = encodeURIComponent(`${resumen}\n\nDescarga el PDF: ${res.data.url}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } catch {
      // Backend no pudo generar el PDF — abrir WhatsApp con solo el resumen
      const text = encodeURIComponent(resumen);
      window.open(`https://wa.me/?text=${text}`, '_blank');
      toast.info('No se pudo adjuntar el PDF. Abriendo WhatsApp con el resumen.');
    } finally {
      setGenerandoWa(false);
    }
  };

  const handleAceptar = () => {
    toast.success('Desprendible aceptado');
    navigate(`/nomina/${nominaId}`);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando desprendible...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Desprendible no disponible.
      </div>
    );
  }

  const { empleado, nomina, liquidacion } = data;
  const fechaActual = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const totalBruto =
    liquidacion.total_jornales + liquidacion.total_cosecha +
    liquidacion.total_horas_extra + liquidacion.total_recargos +
    liquidacion.total_incapacidades +
    // §9.9 — Descansos + recargos dominicales/festivos. Fallback a 0
    // cuando la nómina se liquidó antes del cambio.
    (liquidacion.total_dominicales ?? 0) +
    (liquidacion.total_festivos ?? 0) +
    (liquidacion.total_recargo_dominical ?? 0) +
    (liquidacion.total_recargo_festivo ?? 0) +
    // PR-L15 - Vacaciones con `modo_pago = NOMINA`: el disfrute es salario
    // del periodo y la compensacion CST 189 va con el periodo que contiene
    // la fecha de inicio. Las `DIRECTO` llegan en 0 y no mueven el bruto.
    (liquidacion.total_vacaciones ?? 0) +
    (liquidacion.total_vacaciones_compensadas ?? 0);
  // El desprendible no trae un contador aparte: los dias remunerados son los
  // de los tramos que esta nomina paga. Los `DIRECTO` no cuentan aqui.
  const diasVacacionesPagados = (liquidacion.detalle_vacaciones ?? [])
    .filter((v) => v.pagada_aqui)
    .reduce((acumulado, v) => acumulado + (v.dias_remunerados ?? v.dias), 0);
  const adelantos = liquidacion.deducciones
    .filter((d) => /adelant|prestam/i.test(d.nombre))
    .reduce((s, d) => s + d.valor, 0);
  const ahorros = liquidacion.deducciones
    .filter((d) => /ahorr/i.test(d.nombre))
    .reduce((s, d) => s + d.valor, 0);
  const salud = liquidacion.deducciones.find((d) => /salud/i.test(d.nombre))?.valor ?? 0;
  const pension = liquidacion.deducciones.find((d) => /pensi/i.test(d.nombre))?.valor ?? 0;
  const otras = liquidacion.total_deducciones - adelantos - ahorros - salud - pension;

  return (
    <div className="space-y-6 print:space-y-2">
      {/* Header - NO SE IMPRIME */}
      <div className="print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/nomina/${nominaId}`)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Desprendible Generado</h1>
          <p className="text-muted-foreground mt-2">Liquidación confirmada exitosamente</p>
        </div>
      </div>

      {/* DESPRENDIBLE - SE IMPRIME */}
      <Card className="border border-border shadow-lg max-w-4xl mx-auto">
        <CardContent className="p-8">
          {/* Header del desprendible: grid 3 col con panel finca + título */}
          <div className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 mb-6">
              <div className="col-span-1 p-6 flex items-center justify-center bg-primary/5 rounded-l-lg">
                <p className="font-bold text-primary text-center uppercase">{data.finca}</p>
              </div>
              <div className="col-span-2 p-6 flex items-center justify-center bg-muted/30 rounded-r-lg">
                <h2 className="text-2xl font-bold text-center">DESPRENDIBLE DE NÓMINA</h2>
              </div>
            </div>

            {/* Grid 3x2 de info — mini-cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <InfoMini label="Nombre" value={empleado.nombre_completo} />
              <InfoMini label="Cédula" value={empleado.documento} />
              <InfoMini label="Base" value={empleado.salario_tipo ?? '—'} />
              <InfoMini label="Fecha" value={fechaActual} />
              <InfoMini label="Período" value={nomina.periodo_label} />
              <InfoMini label="Días Cancelados" value={String(liquidacion.dias_trabajados)} />
            </div>
          </div>

          {/* Bloques de liquidación */}
          <div className="space-y-3 mt-4">
            {/* DEVENGADO */}
            <div className="bg-success/5 rounded-lg p-3 border-l-4 border-success">
              <h3 className="font-bold text-xs text-success mb-2 uppercase">Devengado</h3>
              <div className="space-y-1.5">
                <RowSmall
                  label={empleado.salario_tipo === 'VARIABLE' ? 'Base (Jornales)' : 'Sueldo Básico'}
                  value={fmt(liquidacion.total_jornales)}
                />
                {liquidacion.total_cosecha > 0 && (
                  <RowSmall label="Cosecha" value={fmt(liquidacion.total_cosecha)} />
                )}
                {(liquidacion.total_horas_extra + liquidacion.total_recargos) > 0 && (
                  <RowSmall
                    label="Extras (Horas/Domin)"
                    value={fmt(liquidacion.total_horas_extra + liquidacion.total_recargos)}
                  />
                )}
                <RowSmall label="Incapacidades" value={fmt(liquidacion.total_incapacidades)} />
                {/* PR-L15 - Solo las vacaciones que paga esta nomina. Las que
                    pago Liquidaciones llegan en 0 y siguen apareciendo abajo,
                    sin valor, para explicar los dias que faltan. */}
                {(liquidacion.total_vacaciones ?? 0) > 0 && (
                  <RowSmall
                    label={
                      diasVacacionesPagados > 0
                        ? `Vacaciones (${diasVacacionesPagados} día${diasVacacionesPagados !== 1 ? 's' : ''})`
                        : 'Vacaciones'
                    }
                    value={fmt(liquidacion.total_vacaciones!)}
                  />
                )}
                {(liquidacion.total_vacaciones_compensadas ?? 0) > 0 && (
                  <RowSmall
                    label="Vacaciones compensadas en dinero"
                    value={fmt(liquidacion.total_vacaciones_compensadas!)}
                  />
                )}
                {/* §9.9 — Dominicales / festivos / recargo. Solo se muestra si
                    llegan del backend (nóminas anteriores al cambio no los
                    tienen). Sistema todo-o-nada según art. 173 num. 1. */}
                {(liquidacion.total_dominicales ?? 0) > 0 && (
                  <RowSmall label="Dominicales" value={fmt(liquidacion.total_dominicales!)} />
                )}
                {(liquidacion.total_festivos ?? 0) > 0 && (
                  <RowSmall label="Festivos" value={fmt(liquidacion.total_festivos!)} />
                )}
                {((liquidacion.total_recargo_dominical ?? 0) + (liquidacion.total_recargo_festivo ?? 0)) > 0 && (
                  <RowSmall
                    label={
                      liquidacion.porcentaje_recargo_dominical != null
                        ? `Recargo dominical/festivo (${liquidacion.porcentaje_recargo_dominical}%)`
                        : 'Recargo dominical/festivo'
                    }
                    value={fmt(
                      (liquidacion.total_recargo_dominical ?? 0) + (liquidacion.total_recargo_festivo ?? 0),
                    )}
                  />
                )}
                <div className="border-t border-success/30 pt-2 mt-2">
                  <div className="flex justify-between items-center bg-success/10 p-2 rounded">
                    <span className="font-bold text-success text-xs">Total Bruto</span>
                    <span className="font-bold text-base text-success">{fmt(totalBruto)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-medium text-xs">
                    Subsidio Transporte
                    {/* PR-N6 — el colaborador firma este papel: tiene que
                        poder ver con cuántos días se calculó el auxilio. */}
                    {liquidacion.dias_auxilio_transporte != null && (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        ({liquidacion.dias_auxilio_transporte} día{liquidacion.dias_auxilio_transporte !== 1 ? 's' : ''})
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-sm">{fmt(liquidacion.subsidio_transporte)}</span>
                </div>
              </div>
            </div>

            {/* DEDUCCIONES */}
            <div className="bg-destructive/5 rounded-lg p-3 border-l-4 border-destructive">
              <h3 className="font-bold text-xs text-destructive mb-2 uppercase">Deducciones</h3>
              <div className="space-y-1.5">
                <RowSmall label="Descuento Salud (4%)" value={fmt(salud)} destructivo />
                <RowSmall label="Descuento Pensión (4%)" value={fmt(pension)} destructivo />
                <RowSmall label="Dcto Adelantos" value={fmt(adelantos)} destructivo />
                <RowSmall label="Ahorro" value={fmt(ahorros)} destructivo />
                {otras > 0 && (
                  <RowSmall label="Otras deducciones" value={fmt(otras)} destructivo />
                )}
                <div className="border-t border-destructive/30 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs">Total Deducciones</span>
                    <span className="font-bold text-sm text-destructive">
                      {fmt(liquidacion.total_deducciones)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BONIFICACIÓN */}
            {liquidacion.total_bonificaciones > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 border-l-4 border-primary">
                <h3 className="font-bold text-xs text-primary mb-2 uppercase">Bonificación</h3>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-xs">Total Bonificaciones</span>
                  <span className="font-bold text-sm text-primary">
                    {fmt(liquidacion.total_bonificaciones)}
                  </span>
                </div>
              </div>
            )}

            {/* TOTAL NETO */}
            <div className="bg-primary/10 rounded-lg p-4 border-2 border-primary mt-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">TOTAL NETO</span>
                <span className="font-bold text-2xl sm:text-3xl text-primary">{fmt(liquidacion.total_neto)}</span>
              </div>
            </div>

            {/* §9.9 — Detalle día por día de descansos. Componente compartido
                con `LiquidarColaborador` (mismo shape, variante compacta para
                el desprendible impreso). */}
            <div className="mt-4">
              <DetalleAusencias
                items={liquidacion.detalle_ausencias}
                formatMoney={fmt}
                variant="compact"
                titulo="Detalle de ausencias"
              />
            </div>

            <div className="mt-4">
              <DetalleDescansos
                items={liquidacion.detalle_descansos}
                diasPerdidos={liquidacion.dias_descanso_perdidos}
                totalDescansoPerdido={liquidacion.total_descanso_perdido}
                formatMoney={fmt}
                variant="compact"
                titulo="Detalle de descansos"
              />
            </div>

            {/* PLAN_AUSENCIAS_IMPLICITAS §1.6 — Días no laborados sin novedad
                registrada. Sección propia bajo detalle_ausencias porque
                legalmente no es lo mismo. Solo se muestra si el backend adjunta
                el detalle. */}
            <div className="mt-4">
              <FaltasInjustificadas
                items={liquidacion.detalle_faltas_injustificadas}
                total={liquidacion.dias_injustificados}
                formatMoney={fmt}
                variant="compact"
                titulo="Días no laborados sin novedad registrada"
              />
            </div>

            {/* PR-L8 — Los días del disfrute dentro del período. En `DIRECTO`
                la línea va sin valor: los pagó Liquidaciones con su
                comprobante VAC-n. En `NOMINA` el tramo lo paga esta nómina y
                el propio bloque muestra cuánto (PR-L15). */}
            <div className="mt-4">
              <DiasVacaciones
                items={liquidacion.detalle_vacaciones}
                total={liquidacion.dias_vacaciones}
                formatMoney={fmt}
                variant="compact"
                titulo="Vacaciones del período"
              />
            </div>
          </div>

          {/* Footer: firmas */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="h-20 border-b-2 border-muted-foreground/30 mb-3"></div>
                <p className="text-sm font-semibold text-muted-foreground">FIRMA RECIBIDO</p>
              </div>
              <div className="text-center">
                <div className="h-20 border-b-2 border-muted-foreground/30 mb-3"></div>
                <p className="text-sm font-semibold text-muted-foreground">HUELLA</p>
              </div>
            </div>
          </div>

          {/* Nota al pie */}
          <div className="mt-6 text-xs text-center text-muted-foreground italic">
            <p>Este desprendible es un documento oficial de pago. Consérvelo para sus registros.</p>
          </div>
        </CardContent>
      </Card>

      {/* Acciones duplicadas abajo - NO SE IMPRIME */}
      <div className="print:hidden grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        <Button onClick={handleAceptar} size="lg" className="gap-2 bg-success hover:bg-success/90">
          <Check className="h-5 w-5" />
          Aceptar
        </Button>
        <Button onClick={() => window.print()} variant="outline" size="lg" className="gap-2">
          <Printer className="h-5 w-5" />
          Imprimir
        </Button>
        <Button
          onClick={enviarWhatsapp}
          disabled={generandoWa}
          variant="outline"
          size="lg"
          className="gap-2 text-primary border-primary hover:bg-primary/5"
        >
          {generandoWa ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
          WhatsApp
        </Button>
        <Button
          onClick={descargarPdf}
          disabled={descargando}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          {descargando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          PDF
        </Button>
      </div>
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-1.5 bg-muted/20 rounded">
      <span className="font-semibold text-muted-foreground text-[10px] uppercase">{label}</span>
      <div className="font-semibold text-xs">{value}</div>
    </div>
  );
}

function RowSmall({
  label,
  value,
  destructivo,
}: {
  label: string;
  value: string;
  destructivo?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-medium text-xs">{label}</span>
      <span className={`font-bold text-sm ${destructivo ? 'text-destructive' : ''}`}>{value}</span>
    </div>
  );
}
