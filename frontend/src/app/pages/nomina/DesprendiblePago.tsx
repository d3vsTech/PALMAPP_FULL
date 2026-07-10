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
import jsPDF from 'jspdf';
import { nominaApi, DesprendibleData } from '../../../api/nomina';
import type { ApiError } from '../../../api/client';

function fmt(n: number): string {
  return `$${n.toLocaleString('es-CO')}`;
}

/**
 * Genera el PDF del desprendible de nómina en el cliente. Reemplaza al
 * `GET /desprendible/pdf` del backend cuyo template blade pegaba los
 * valores al texto (BASE JORNALES (DESTAJO)$421.000 sin espacio ni
 * alineación). Aquí usamos labels a la izquierda y valores alineados a la
 * derecha del ancho utilizable.
 */
export function generarDesprendiblePdf(data: DesprendibleData): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const rightX = width - marginX;
  let y = 50;

  // ── Cabecera ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 86, 49);
  doc.text('DESPRENDIBLE DE NÓMINA', width / 2, y, { align: 'center' });
  y += 20;
  doc.setDrawColor(30, 86, 49);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, rightX, y);
  y += 20;

  // Info empleado (2 columnas)
  doc.setTextColor(60);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const halfW = (width - 2 * marginX) / 2;

  const labelValue = (label: string, value: string, x: number, yy: number) => {
    doc.setTextColor(120);
    doc.setFont('helvetica', 'normal');
    doc.text(label.toUpperCase(), x, yy);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(value || '—', x, yy + 12);
  };

  labelValue('Finca', data.finca ?? '—', marginX, y);
  labelValue('Nombre', data.empleado.nombre_completo, marginX + halfW, y);
  y += 30;
  labelValue('Cédula', data.empleado.documento ?? '—', marginX, y);
  labelValue('Cargo', data.empleado.cargo ?? '—', marginX + halfW, y);
  y += 30;
  labelValue('Período', data.nomina.periodo_label ?? '—', marginX, y);
  labelValue(
    'Base',
    data.empleado.salario_tipo ?? 'OPERARIO',
    marginX + halfW,
    y,
  );
  y += 30;
  labelValue('Fecha liquidación', data.liquidacion.fecha_humana ?? data.liquidacion.fecha, marginX, y);
  labelValue('Días cancelados', String(data.liquidacion.dias_trabajados ?? 0), marginX + halfW, y);
  y += 35;

  // Helper para pintar fila con label izq + valor derecha alineado.
  const filaLV = (label: string, value: string, opts?: { bold?: boolean; color?: [number, number, number] }) => {
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...(opts?.color ?? [40, 40, 40] as [number, number, number]));
    doc.text(label, marginX + 8, y);
    doc.text(value, rightX - 8, y, { align: 'right' });
    y += 16;
  };

  const seccion = (titulo: string, color: [number, number, number]) => {
    doc.setFillColor(...color);
    doc.rect(marginX, y - 2, width - 2 * marginX, 18, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(titulo.toUpperCase(), marginX + 8, y + 10);
    y += 22;
  };

  // ── DEVENGADO ─────────────────────────────────────────────────────────
  seccion('Devengado', [30, 86, 49]);
  const liq = data.liquidacion;
  if (data.empleado.salario_tipo === 'FIJO') {
    filaLV('Sueldo básico', fmt(data.empleado.salario_base ?? 0));
  }
  if ((liq.total_jornales ?? 0) > 0) {
    filaLV('Base jornales (destajo)', fmt(liq.total_jornales));
  }
  if ((liq.total_cosecha ?? 0) > 0) {
    filaLV('Base cosecha', fmt(liq.total_cosecha));
  }
  if ((liq.total_horas_extra ?? 0) > 0) {
    filaLV('Horas extra', fmt(liq.total_horas_extra));
  }
  if ((liq.total_recargos ?? 0) > 0) {
    filaLV('Recargos', fmt(liq.total_recargos));
  }
  if ((liq.total_incapacidades ?? 0) > 0) {
    filaLV('Incapacidades', fmt(liq.total_incapacidades));
  }
  (liq.bonificaciones ?? []).forEach((b) => {
    filaLV(b.nombre ?? 'Bonificación', fmt(b.valor));
  });
  y += 4;
  filaLV('TOTAL BRUTO', fmt(liq.total_devengado + (liq.total_bonificaciones ?? 0)), {
    bold: true,
    color: [30, 86, 49],
  });
  if ((liq.subsidio_transporte ?? 0) > 0) {
    filaLV('Subsidio transporte', fmt(liq.subsidio_transporte));
  }
  y += 10;

  // ── DEDUCCIONES ───────────────────────────────────────────────────────
  seccion('Deducciones', [180, 40, 50]);
  (liq.deducciones ?? []).forEach((d) => {
    const label = d.porcentaje != null
      ? `${d.nombre} (${d.porcentaje}%)`
      : d.nombre;
    filaLV(label, fmt(d.valor), { color: [180, 40, 50] });
  });
  y += 4;
  filaLV('Total deducciones', fmt(liq.total_deducciones), {
    bold: true,
    color: [180, 40, 50],
  });
  y += 14;

  // ── TOTAL NETO ────────────────────────────────────────────────────────
  doc.setFillColor(30, 86, 49);
  doc.rect(marginX, y, width - 2 * marginX, 32, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL NETO', marginX + 10, y + 20);
  doc.setFontSize(14);
  doc.text(fmt(liq.total_neto), rightX - 10, y + 20, { align: 'right' });
  y += 55;

  // ── Firmas ─────────────────────────────────────────────────────────────
  const firmaW = (width - 2 * marginX - 40) / 2;
  const firmaY = Math.max(y + 40, height - 100);
  doc.setDrawColor(180);
  doc.setLineWidth(0.5);
  doc.line(marginX + 20, firmaY, marginX + 20 + firmaW, firmaY);
  doc.line(marginX + firmaW + 60, firmaY, marginX + firmaW * 2 + 60, firmaY);
  doc.setTextColor(120);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('RECIBIDO', marginX + 20 + firmaW / 2, firmaY + 12, { align: 'center' });
  doc.text('HUELLA', marginX + firmaW + 60 + firmaW / 2, firmaY + 12, { align: 'center' });

  // Footer
  doc.setTextColor(150);
  doc.setFontSize(7);
  doc.text(
    `PalmApp · Nómina #${data.nomina.id} · Liquidado por ${liq.liquidado_por ?? '—'}`,
    width / 2,
    height - 25,
    { align: 'center' },
  );

  const filename = `desprendible_${data.empleado.documento}_${data.nomina.anio}_${String(data.nomina.mes).padStart(2, '0')}${data.nomina.quincena ? `_Q${data.nomina.quincena}` : ''}.pdf`;
  doc.save(filename);
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
    if (!data) return;
    setDescargando(true);
    try {
      // Generamos el PDF en el cliente con jsPDF para tener control total
      // del layout (label a la izquierda, valor alineado a la derecha).
      // El template blade del backend pegaba los valores al texto sin
      // alineación — este fix evita ese problema.
      generarDesprendiblePdf(data);
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
    liquidacion.total_incapacidades;
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
          <h1 className="text-3xl font-bold text-primary">Desprendible Generado</h1>
          <p className="text-muted-foreground mt-2">Liquidación confirmada exitosamente</p>
        </div>
      </div>

      {/* DESPRENDIBLE - SE IMPRIME */}
      <Card className="border border-border shadow-lg max-w-4xl mx-auto">
        <CardContent className="p-8">
          {/* Header del desprendible: grid 3 col con panel finca + título */}
          <div className="mb-8">
            <div className="grid grid-cols-3 mb-6">
              <div className="col-span-1 p-6 flex items-center justify-center bg-primary/5 rounded-l-lg">
                <p className="font-bold text-primary text-center uppercase">{data.finca}</p>
              </div>
              <div className="col-span-2 p-6 flex items-center justify-center bg-muted/30 rounded-r-lg">
                <h2 className="text-2xl font-bold text-center">DESPRENDIBLE DE NÓMINA</h2>
              </div>
            </div>

            {/* Grid 3x2 de info — mini-cards */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <InfoMini label="Nombre" value={empleado.nombre_completo} />
              <InfoMini label="Cédula" value={empleado.documento} />
              <InfoMini label="Base" value={empleado.salario_tipo} />
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
                <div className="border-t border-success/30 pt-2 mt-2">
                  <div className="flex justify-between items-center bg-success/10 p-2 rounded">
                    <span className="font-bold text-success text-xs">Total Bruto</span>
                    <span className="font-bold text-base text-success">{fmt(totalBruto)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-medium text-xs">Subsidio Transporte</span>
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
                <span className="font-bold text-3xl text-primary">{fmt(liquidacion.total_neto)}</span>
              </div>
            </div>
          </div>

          {/* Footer: firmas */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="grid grid-cols-2 gap-8">
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
