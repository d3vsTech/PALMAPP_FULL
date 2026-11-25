/**
 * Desprendible de pago, con el diseño del 19 de noviembre: documento en
 * una tarjeta, datos del colaborador en rejilla, conceptos en una tabla de
 * dos columnas, total neto al pie, firmas y nota.
 *
 * Acciones en la cabecera: Imprimir, WhatsApp, Descargar PDF. Abajo, Aceptar.
 * Conexiones API: `nominaApi.desprendible`, `desprendiblePdf`, `desprendibleWhatsapp`.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import { Card } from '../../components/ui/card';
import {
  Check, Printer, Download, MessageCircle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { nominaApi, DesprendibleData } from '../../../api/nomina';
import type { ApiError } from '../../../api/client';
import { DetalleDescansos } from '../../components/nomina/DetalleDescansos';
import { DetalleAusencias } from '../../components/nomina/DetalleAusencias';
import { lineasAusenciasRemuneradas, motivosRemunerados } from '../../components/nomina/ausenciasRemuneradas';
import { FaltasInjustificadas } from '../../components/nomina/FaltasInjustificadas';
import { DiasVacaciones } from '../../components/nomina/DiasVacaciones';
import { imprimirPdf } from '../../lib/pdf/imprimirPdf';

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
  const pedirPdf = async (accion: 'descargar' | 'imprimir') => {
    if (!nominaEmpleadoId || !data) return;
    setDescargando(true);
    try {
      const blob = await nominaApi.desprendiblePdf(nominaEmpleadoId);
      if (accion === 'imprimir') {
        imprimirPdf(blob);
        return;
      }
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
      toast.error(e.message ?? 'Error al obtener el desprendible');
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
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando desprendible...
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader backTo={`/nomina/${nominaId}`} title="No encontrado" description="No se encontró la información." />
      </div>
    );
  }

  const { empleado, nomina, liquidacion } = data;
  const fechaActual = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
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

  const subsidioEtiqueta = liquidacion.dias_auxilio_transporte != null
    ? `Subsidio de transporte (${liquidacion.dias_auxilio_transporte} día${liquidacion.dias_auxilio_transporte !== 1 ? 's' : ''})`
    : 'Subsidio de transporte';
  const recargoDominical =
    (liquidacion.total_recargo_dominical ?? 0) + (liquidacion.total_recargo_festivo ?? 0);
  const ausencias = liquidacion.total_incapacidades > 0
    ? lineasAusenciasRemuneradas({
      resumen: liquidacion.ausencias_remuneradas_resumen,
      etiqueta: liquidacion.etiqueta_ausencias_remuneradas,
      total: liquidacion.total_incapacidades,
      motivos: motivosRemunerados(liquidacion.detalle_ausencias),
    })
    : [];
  const datos: { label: string; value: string }[] = [
    { label: 'Nombre', value: empleado.nombre_completo },
    { label: 'Cédula', value: empleado.documento },
    { label: 'Base', value: empleado.salario_tipo ?? '-' },
    { label: 'Fecha', value: fechaActual },
    { label: 'Período', value: nomina.periodo_label },
    { label: 'Días cancelados', value: String(liquidacion.dias_trabajados) },
  ];

  return (
    <div className="space-y-6 print:space-y-2">
      {/* La cabecera no se imprime: el papel arranca en el desprendible. */}
      <PageHeader
        className="print:hidden"
        backTo={`/nomina/${nominaId}`}
        eyebrow={nomina.periodo_label}
        title="Desprendible generado"
        description="Liquidación confirmada."
        actions={
          <>
            <Button variant="outline" onClick={() => void pedirPdf('imprimir')} disabled={descargando}>
              <Printer strokeWidth={2} />
              Imprimir
            </Button>
            <Button variant="outline" onClick={enviarWhatsapp} disabled={generandoWa}>
              {generandoWa
                ? <Loader2 className="animate-spin" strokeWidth={2} />
                : <MessageCircle strokeWidth={2} />}
              Enviar por WhatsApp
            </Button>
            <Button variant="outline" onClick={() => void pedirPdf('descargar')} disabled={descargando}>
              {descargando
                ? <Loader2 className="animate-spin" strokeWidth={2} />
                : <Download strokeWidth={2} />}
              Descargar PDF
            </Button>
          </>
        }
      />

      {/* Documento: se imprime */}
      <Card className="mx-auto max-w-3xl gap-0 bg-card p-6 text-foreground sm:p-10 print:max-w-none print:border-0 print:p-0">
        {/* Encabezado del documento */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base font-semibold text-foreground">{data.finca}</p>
          <div className="sm:text-right">
            <p className="text-lg font-bold tracking-wide text-foreground">Desprendible de nómina</p>
            <p className="text-sm text-muted-foreground">{nomina.periodo_label}</p>
          </div>
        </div>

        {/* Datos del colaborador */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-border py-5 text-sm sm:grid-cols-3">
          {datos.map((d) => (
            <div key={d.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{d.label}</dt>
              <dd className="font-medium text-foreground">{d.value}</dd>
            </div>
          ))}
        </dl>

        {/* Detalles día por día, donde el diseño pone el "Detalle de días
            trabajados". Componentes compartidos con LiquidarColaborador, en
            su variante compacta. Cada uno se esconde solo si no trae datos. */}
        <div className="space-y-4 border-b border-border py-5 empty:hidden">
          <DetalleAusencias
            items={liquidacion.detalle_ausencias}
            formatMoney={fmt}
            variant="compact"
            titulo="Detalle de ausencias"
          />
          <DetalleDescansos
            items={liquidacion.detalle_descansos}
            diasPerdidos={liquidacion.dias_descanso_perdidos}
            totalDescansoPerdido={liquidacion.total_descanso_perdido}
            formatMoney={fmt}
            variant="compact"
            titulo="Detalle de descansos"
          />
          {/* PLAN_AUSENCIAS_IMPLICITAS §1.6: días no laborados sin novedad
              registrada. Legalmente no es lo mismo que una ausencia. */}
          <FaltasInjustificadas
            items={liquidacion.detalle_faltas_injustificadas}
            total={liquidacion.dias_injustificados}
            formatMoney={fmt}
            variant="compact"
            titulo="Días no laborados sin novedad registrada"
          />
          {/* PR-L8: los días del disfrute dentro del período. En `DIRECTO`
              la línea va sin valor: los pagó Liquidaciones con su
              comprobante VAC-n. En `NOMINA` el tramo lo paga esta nómina. */}
          <DiasVacaciones
            items={liquidacion.detalle_vacaciones}
            total={liquidacion.dias_vacaciones}
            formatMoney={fmt}
            variant="compact"
            titulo="Vacaciones del período"
          />
        </div>

        {/* Conceptos de la liquidación */}
        <div className="py-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/40 text-xs text-muted-foreground">
                <th className="px-3 py-2 pl-0 text-left font-semibold">Concepto</th>
                <th className="px-3 py-2 pr-0 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              <Seccion titulo="Devengado" primera />
              <Fila
                label={empleado.salario_tipo === 'VARIABLE' ? 'Base (jornales)' : 'Sueldo básico'}
                value={fmt(liquidacion.total_jornales)}
              />
              {liquidacion.total_cosecha > 0 && (
                <Fila label="Cosecha" value={fmt(liquidacion.total_cosecha)} />
              )}
              {/* §16 - En una nomina historica no hay planillas detras, asi
                  que la unica traza de como se pago la cosecha es lo que
                  trajo el archivo: los gajos y el promedio kg/gajo. */}
              {liquidacion.cosecha_historica && (
                <tr className="border-b border-border">
                  <td colSpan={2} className="py-2 text-xs text-muted-foreground">
                    {liquidacion.cosecha_historica.gajos.toLocaleString('es-CO')} gajos ×{' '}
                    {liquidacion.cosecha_historica.promedio_kg_gajo.toLocaleString('es-CO', {
                      minimumFractionDigits: 4,
                    })}{' '}
                    kg/gajo = {liquidacion.cosecha_historica.kg.toLocaleString('es-CO', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    kg
                  </td>
                </tr>
              )}
              {(liquidacion.total_horas_extra + liquidacion.total_recargos) > 0 && (
                <Fila
                  label="Extras (horas y dominicales)"
                  value={fmt(liquidacion.total_horas_extra + liquidacion.total_recargos)}
                />
              )}
              {ausencias.map((linea) => (
                <Fila
                  key={linea.clave}
                  label={linea.detalle ? `${linea.etiqueta} (${linea.detalle})` : linea.etiqueta}
                  value={fmt(linea.valor)}
                />
              ))}
              {/* PR-L15 - Solo las vacaciones que paga esta nomina. Las que
                  pago Liquidaciones llegan en 0 y siguen apareciendo abajo,
                  sin valor, para explicar los dias que faltan. */}
              {(liquidacion.total_vacaciones ?? 0) > 0 && (
                <Fila
                  label={
                    diasVacacionesPagados > 0
                      ? `Vacaciones (${diasVacacionesPagados} día${diasVacacionesPagados !== 1 ? 's' : ''})`
                      : 'Vacaciones'
                  }
                  value={fmt(liquidacion.total_vacaciones!)}
                />
              )}
              {(liquidacion.total_vacaciones_compensadas ?? 0) > 0 && (
                <Fila
                  label="Vacaciones compensadas en dinero"
                  value={fmt(liquidacion.total_vacaciones_compensadas!)}
                />
              )}
              {/* §9.9 — Dominicales / festivos / recargo. Solo se muestra si
                  llegan del backend (nóminas anteriores al cambio no los
                  tienen). Sistema todo-o-nada según art. 173 num. 1. */}
              {(liquidacion.total_dominicales ?? 0) > 0 && (
                <Fila label="Dominicales" value={fmt(liquidacion.total_dominicales!)} />
              )}
              {(liquidacion.total_festivos ?? 0) > 0 && (
                <Fila label="Festivos" value={fmt(liquidacion.total_festivos!)} />
              )}
              {recargoDominical > 0 && (
                <Fila
                  label={
                    liquidacion.porcentaje_recargo_dominical != null
                      ? `Recargo dominical/festivo (${liquidacion.porcentaje_recargo_dominical} %)`
                      : 'Recargo dominical/festivo'
                  }
                  value={fmt(recargoDominical)}
                />
              )}
              <Fila label="Total bruto" value={fmt(totalBruto)} fuerte />
              {/* PR-N6 — el colaborador firma este papel: tiene que poder ver
                  con cuántos días se calculó el auxilio. */}
              <Fila label={subsidioEtiqueta} value={fmt(liquidacion.subsidio_transporte)} />

              <Seccion titulo="Deducciones" />
              <Fila label="Salud (4 %)" value={`−${fmt(salud)}`} />
              <Fila label="Pensión (4 %)" value={`−${fmt(pension)}`} />
              <Fila label="Adelantos" value={`−${fmt(adelantos)}`} />
              <Fila label="Ahorro" value={`−${fmt(ahorros)}`} />
              {otras > 0 && <Fila label="Otras deducciones" value={`−${fmt(otras)}`} />}
              <Fila label="Total de deducciones" value={`−${fmt(liquidacion.total_deducciones)}`} fuerte />

              <Seccion titulo="Bonificación" />
              <Fila label="Bonificación" value={fmt(liquidacion.total_bonificaciones ?? 0)} />
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-foreground/60">
                <td className="pt-4 text-base font-bold text-foreground">Total neto</td>
                <td className="pt-4 text-right text-2xl font-bold tabular-nums text-success">
                  {fmt(liquidacion.total_neto)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Firmas */}
        <div className="mt-8 grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="mb-2 h-16 border-b border-foreground/40"></div>
            <p className="text-xs text-muted-foreground">Firma de recibido</p>
          </div>
          <div className="text-center">
            <div className="mb-2 h-16 border-b border-foreground/40"></div>
            <p className="text-xs text-muted-foreground">Huella</p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Este desprendible es un documento oficial de pago. Consérvalo para tus registros.
        </p>
      </Card>

      <div className="mx-auto flex max-w-3xl flex-col-reverse gap-2 sm:flex-row sm:justify-end print:hidden">
        <Button onClick={handleAceptar}>
          <Check strokeWidth={2} />
          Aceptar
        </Button>
      </div>
    </div>
  );
}

/** Rótulo de sección dentro de la tabla de conceptos. */
function Seccion({ titulo, primera }: { titulo: string; primera?: boolean }) {
  return (
    <tr>
      <td colSpan={2} className={`${primera ? 'pt-4' : 'pt-5'} pb-1 text-[13px] font-medium text-muted-foreground`}>
        {titulo}
      </td>
    </tr>
  );
}

/** Fila de concepto: etiqueta a la izquierda, valor a la derecha. */
function Fila({ label, value, fuerte }: { label: string; value: string; fuerte?: boolean }) {
  return (
    <tr className={`border-b border-border ${fuerte ? 'font-semibold' : ''}`}>
      <td className="px-3 py-2 pl-0">{label}</td>
      <td className="px-3 py-2 pr-0 text-right tabular-nums">{value}</td>
    </tr>
  );
}
