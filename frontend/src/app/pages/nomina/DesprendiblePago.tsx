import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  Check,
  Printer,
  Download,
  MessageCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { nominaApi, DesprendibleData } from '../../../api/nomina';
import type { ApiError } from '../../../api/client';

function fmt(n: number): string {
  return `$${n.toLocaleString('es-CO')}`;
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

  const descargarPdf = async () => {
    if (!nominaEmpleadoId || !data) return;
    setDescargando(true);
    try {
      const blob = await nominaApi.desprendiblePdf(nominaEmpleadoId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `desprendible_${data.empleado.documento}_${data.nomina.anio}_${String(data.nomina.mes).padStart(2, '0')}${data.nomina.quincena ? `_Q${data.nomina.quincena}` : ''}.pdf`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'Error al descargar');
    } finally {
      setDescargando(false);
    }
  };

  const enviarWhatsapp = async () => {
    if (!nominaEmpleadoId) return;
    setGenerandoWa(true);
    try {
      const res = await nominaApi.desprendibleWhatsapp(nominaEmpleadoId);
      const text = encodeURIComponent(`Desprendible de pago: ${res.data.url}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'Error al generar enlace');
    } finally {
      setGenerandoWa(false);
    }
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

  return (
    <div className="space-y-6 print:space-y-2">
      <div className="flex items-center justify-between print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/nomina/${nominaId}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la nómina
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={descargarPdf} disabled={descargando} className="gap-2">
            {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar PDF
          </Button>
          <Button variant="outline" onClick={enviarWhatsapp} disabled={generandoWa} className="gap-2">
            {generandoWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Header H1 igual que V.15 — no se imprime */}
      <div className="print:hidden">
        <h1 className="text-3xl font-bold text-primary">Desprendible Generado</h1>
        <p className="text-muted-foreground mt-2">Liquidación confirmada exitosamente</p>
      </div>

      <Card className="border-2 border-success bg-success/5 print:hidden">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="font-semibold text-success">Liquidación confirmada</p>
            <p className="text-xs text-muted-foreground">
              El empleado ha sido liquidado correctamente.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border max-w-3xl mx-auto">
        <CardContent className="p-8 space-y-6">
          <div className="text-center border-b border-border pb-4">
            <h2 className="text-xl font-bold uppercase">{data.finca}</h2>
            <p className="text-sm text-muted-foreground">Desprendible de pago</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Empleado</p>
              <p className="font-semibold">{empleado.nombre_completo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Documento</p>
              <p className="font-semibold">{empleado.documento}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cargo</p>
              <p className="font-semibold">{empleado.cargo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo de salario</p>
              <p className="font-semibold">{empleado.salario_tipo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Período</p>
              <p className="font-semibold">{nomina.periodo_label}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fechas</p>
              <p className="font-semibold">
                {nomina.fecha_inicio} → {nomina.fecha_fin}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Días trabajados</p>
              <p className="font-semibold">{liquidacion.dias_trabajados}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Liquidado</p>
              <p className="font-semibold">{liquidacion.fecha_humana}</p>
            </div>
          </div>

          <div className="border-l-4 border-success pl-4 space-y-2">
            <h3 className="font-semibold text-success">Devengado</h3>
            {liquidacion.total_jornales > 0 && (
              <Row label="Jornales / Salario base" value={fmt(liquidacion.total_jornales)} />
            )}
            {liquidacion.total_cosecha > 0 && (
              <Row label="Cosecha" value={fmt(liquidacion.total_cosecha)} />
            )}
            {liquidacion.total_horas_extra > 0 && (
              <Row label="Horas extra" value={fmt(liquidacion.total_horas_extra)} />
            )}
            {liquidacion.total_recargos > 0 && (
              <Row label="Recargos" value={fmt(liquidacion.total_recargos)} />
            )}
            {liquidacion.total_incapacidades > 0 && (
              <Row label="Incapacidades" value={fmt(liquidacion.total_incapacidades)} />
            )}
            {liquidacion.bonificaciones.map((b, i) => (
              <Row
                key={i}
                label={`Bonificación: ${b.nombre}${b.observacion ? ` (${b.observacion})` : ''}`}
                value={fmt(b.valor)}
              />
            ))}
            <Row label="Subsidio de transporte" value={fmt(liquidacion.subsidio_transporte)} />
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total devengado</span>
              <span className="text-success">
                {fmt(
                  liquidacion.total_devengado +
                    liquidacion.total_bonificaciones +
                    liquidacion.subsidio_transporte,
                )}
              </span>
            </div>
          </div>

          <div className="border-l-4 border-destructive pl-4 space-y-2">
            <h3 className="font-semibold text-destructive">Deducciones</h3>
            {liquidacion.deducciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No aplica</p>
            ) : (
              liquidacion.deducciones.map((d, i) => (
                <Row
                  key={i}
                  label={
                    d.nombre +
                    (d.porcentaje !== undefined && d.base !== undefined
                      ? ` (${d.porcentaje}%)`
                      : '') +
                    (d.observacion ? ` — ${d.observacion}` : '')
                  }
                  value={fmt(d.valor)}
                  destructivo
                />
              ))
            )}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total deducciones</span>
              <span className="text-destructive">{fmt(liquidacion.total_deducciones)}</span>
            </div>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg flex justify-between items-center">
            <span className="font-bold text-lg">Total neto a pagar</span>
            <span className="font-bold text-2xl text-primary">
              {fmt(liquidacion.total_neto)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 mt-8 border-t border-border">
            <div className="text-center">
              <div className="border-t border-foreground pt-2">
                <p className="text-xs text-muted-foreground">Recibido conforme</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-foreground pt-2">
                <p className="text-xs text-muted-foreground">Huella</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  destructivo,
}: {
  label: string;
  value: string;
  destructivo?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${destructivo ? 'text-destructive' : ''}`}>{value}</span>
    </div>
  );
}
