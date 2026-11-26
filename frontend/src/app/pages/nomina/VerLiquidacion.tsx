import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Download,
  Loader2,
  MessageCircle,
  Printer,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { nominaApi, type DesprendibleData } from '../../../api/nomina';
import { nombreArchivoDesprendible } from './DesprendiblePago';
import type { ApiError } from '../../../api/client';
import { imprimirPdf } from '../../lib/pdf/imprimirPdf';
import { Eyebrow, FilaMonto } from '../../components/nomina/piezas';
import { lineasAusenciasRemuneradas, motivosRemunerados } from '../../components/nomina/ausenciasRemuneradas';

function fmt(n: number | null | undefined): string {
  // Guardamos contra null/undefined que llegan del backend cuando la
  // liquidación aún no está totalmente calculada (bono/deducciones en null).
  if (n == null) return '$0';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(num)) return '$0';
  return `$${num.toLocaleString('es-CO')}`;
}


export default function VerLiquidacion() {
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
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar liquidación'))
      .finally(() => setCargando(false));
  }, [nominaEmpleadoId]);

  /**
   * El PDF lo genera el backend, con el membrete de la finca (§6.3). El mismo
   * archivo se guarda o se manda a la impresora según `accion`.
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

  if (cargando) {
    return (
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando liquidación...
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          backTo={`/nomina/${nominaId}`}
          title="No encontrado"
          description="No se encontró la información de liquidación."
        />
      </div>
    );
  }

  const { empleado, nomina, liquidacion } = data;
  const detalleHorasExtra = (liquidacion as { detalle_horas_extra?: { tipo_nombre?: string; codigo?: string }[] })
    .detalle_horas_extra ?? [];
  const etiquetaHorasExtra = detalleHorasExtra.length > 0
    ? `Horas extra · ${Array.from(new Set(
      detalleHorasExtra.map((h) => h.tipo_nombre || h.codigo).filter(Boolean),
    )).join(', ')}`
    : 'Horas extra';
  const ausencias = liquidacion.total_incapacidades > 0
    ? lineasAusenciasRemuneradas({
      resumen: liquidacion.ausencias_remuneradas_resumen,
      etiqueta: liquidacion.etiqueta_ausencias_remuneradas,
      total: liquidacion.total_incapacidades,
      motivos: motivosRemunerados(liquidacion.detalle_ausencias),
    })
    : [];
  // Aportes de ley arriba, como Salud y Pensión del diseño; el resto debajo.
  const legales = liquidacion.deducciones.filter((d) => d.porcentaje != null);
  const otrasDeducciones = liquidacion.deducciones.filter((d) => d.porcentaje == null);
  const etiquetaDeduccion = (d: (typeof liquidacion.deducciones)[number]) =>
    d.nombre
    + (d.porcentaje != null && d.base != null ? ` (${d.porcentaje} % sobre ${fmt(d.base)})` : '')
    + (d.observacion ? ` · ${d.observacion}` : '');

  return (
    <div className="space-y-6">
      <PageHeader
        backTo={`/nomina/${nominaId}`}
        eyebrow={`Liquidación · ${nomina.periodo_label}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {empleado.nombre_completo}
            {empleado.salario_tipo && <Badge variant="outline">{empleado.salario_tipo}</Badge>}
          </span>
        }
        description={[
          `C.C. ${empleado.documento}`,
          empleado.cargo,
          `${liquidacion.dias_trabajados} días trabajados`,
        ].filter(Boolean).join(' · ')}
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

      {/* Liquidación: conceptos a la izquierda, resumen fijo a la derecha. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Devengado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {liquidacion.total_jornales > 0 && (
                <FilaMonto label="Sueldo base" value={fmt(liquidacion.total_jornales)} />
              )}
              {liquidacion.total_cosecha > 0 && (
                <FilaMonto label="Cosecha" value={fmt(liquidacion.total_cosecha)} />
              )}
              {liquidacion.total_horas_extra > 0 && (
                <FilaMonto label={etiquetaHorasExtra} value={fmt(liquidacion.total_horas_extra)} />
              )}
              {liquidacion.total_recargos > 0 && (
                <FilaMonto label="Recargos" value={fmt(liquidacion.total_recargos)} />
              )}
              {ausencias.map((linea) => (
                <FilaMonto
                  key={linea.clave}
                  label={linea.detalle ? `${linea.etiqueta} · ${linea.detalle}` : linea.etiqueta}
                  value={fmt(linea.valor)}
                />
              ))}
              <FilaMonto
                label="Total devengado"
                value={fmt((liquidacion.total_devengado ?? 0) + (liquidacion.total_bonificaciones ?? 0))}
                strong
                className="border-t border-border pt-2"
              />
              <FilaMonto label="Subsidio de transporte" value={fmt(liquidacion.subsidio_transporte)} className="pt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deducciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {legales.map((d, i) => (
                <FilaMonto key={`l-${i}`} label={etiquetaDeduccion(d)} value={fmt(d.valor)} />
              ))}
              <div className={`space-y-2 ${legales.length > 0 ? 'border-t border-border pt-3' : ''}`}>
                <Eyebrow>Adelantos y descuentos</Eyebrow>
                {otrasDeducciones.length > 0
                  ? otrasDeducciones.map((d, i) => (
                    <FilaMonto key={`o-${i}`} label={etiquetaDeduccion(d)} value={fmt(d.valor)} />
                  ))
                  : <FilaMonto label="Sin adelantos ni descuentos" value="$0" />}
                <FilaMonto label="Total deducciones" value={fmt(liquidacion.total_deducciones)} strong />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bonificación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {liquidacion.bonificaciones.length === 0 && <FilaMonto label="Bonificación" value="$0" />}
              {liquidacion.bonificaciones.map((b, i) => (
                <FilaMonto
                  key={i}
                  label={b.nombre + (b.observacion ? ` (${b.observacion})` : '')}
                  value={fmt(b.valor)}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Eyebrow>Ingresos</Eyebrow>
              <FilaMonto label="Total bruto" value={fmt(liquidacion.total_devengado)} />
              <FilaMonto label="Subsidio de transporte" value={fmt(liquidacion.subsidio_transporte)} />
              <FilaMonto label="Bonificaciones" value={fmt(liquidacion.total_bonificaciones)} />
            </div>
            <div className="space-y-2">
              <Eyebrow>Deducciones</Eyebrow>
              <FilaMonto label="Total deducciones" value={`−${fmt(liquidacion.total_deducciones)}`} />
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
              <span className="font-semibold text-foreground">Total neto</span>
              <span className="text-2xl font-bold tabular-nums text-foreground">{fmt(liquidacion.total_neto)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {[data.finca, liquidacion.liquidado_por && `Liquidado por ${liquidacion.liquidado_por}`, liquidacion.fecha_humana]
                .filter(Boolean).join(' · ')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end print:hidden">
        <Button variant="outline" onClick={() => navigate(`/nomina/${nominaId}`)}>Volver</Button>
        <Button onClick={() => navigate(`/nomina/${nominaId}`)}>
          <Check strokeWidth={2} />
          Aceptar
        </Button>
      </div>
    </div>
  );
}
