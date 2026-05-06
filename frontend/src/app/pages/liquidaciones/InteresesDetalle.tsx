import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Download, CheckCircle, DollarSign, Calendar, User, Briefcase, FileText, Info, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useLiquidaciones } from '../../contexts/LiquidacionesContext';
import { formatearMoneda, TASA_INTERESES_CESANTIAS } from '../../lib/liquidaciones/calculoUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InteresesDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { intereses, setIntereses } = useLiquidaciones();

  const interes = intereses.find(i => i.id === id);

  if (!interes) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/liquidaciones')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No se encontró la información de intereses</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const generarLiquidacion = () => {
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN DE INTERESES SOBRE CESANTÍAS', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 105, 28, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    // Información del colaborador
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL COLABORADOR', 14, 42);

    autoTable(doc, {
      startY: 46,
      head: [['Campo', 'Información']],
      body: [
        ['Nombre Completo', interes.nombreCompleto],
        ['Cargo', interes.cargo],
        ['Fecha de Ingreso', new Date(interes.fechaIngreso).toLocaleDateString('es-CO')],
        ['Fondo de Cesantías', interes.fondoCesantias],
        ['Período', `${new Date(interes.periodoInicio).toLocaleDateString('es-CO')} - ${new Date(interes.periodoFin).toLocaleDateString('es-CO')}`],
      ],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Cálculo detallado
    const finalY = (doc as any).lastAutoTable.finalY || 90;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CÁLCULO DE INTERESES', 14, finalY + 10);

    autoTable(doc, {
      startY: finalY + 14,
      head: [['Concepto', 'Valor']],
      body: [
        ['Saldo de Cesantías a 31 de Diciembre', formatearMoneda(interes.saldoCesantias31Dic)],
        ['Tasa de Interés Anual', `${TASA_INTERESES_CESANTIAS * 100}%`],
        ['Intereses Calculados', formatearMoneda(interes.interesesCalculados)],
      ],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Fórmula
    const finalY2 = (doc as any).lastAutoTable.finalY || 140;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Fórmula: Intereses = Saldo Cesantías × ${TASA_INTERESES_CESANTIAS * 100}%`, 14, finalY2 + 8);

    // Total
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(30, 86, 49);
    doc.rect(14, finalY2 + 14, 182, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`TOTAL A PAGAR: ${formatearMoneda(interes.interesesCalculados)}`, 105, finalY2 + 23, { align: 'center' });

    // Nota legal
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Artículo 99 de la Ley 50 de 1990', 14, finalY2 + 36);
    doc.text('Los intereses deben pagarse a más tardar el 31 de enero del año siguiente', 14, finalY2 + 42);

    // Firmas
    doc.setFontSize(10);
    doc.line(14, finalY2 + 64, 90, finalY2 + 64);
    doc.line(120, finalY2 + 64, 196, finalY2 + 64);
    doc.text('Firma del Empleador', 14, finalY2 + 70);
    doc.text('Firma del Colaborador', 120, finalY2 + 70);

    doc.save(`intereses_cesantias_${interes.nombreCompleto.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

    // Marcar como pagada
    setIntereses(prev => prev.map(i => {
      if (i.id === id) {
        return {
          ...i,
          consignado: true,
          fechaConsignacion: new Date().toISOString().split('T')[0],
        };
      }
      return i;
    }));

    toast.success('Liquidación generada y marcada como pagada');
    navigate('/liquidaciones');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Liquidaciones
        </Button>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center border border-green-500/30 shadow-lg">
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Intereses sobre Cesantías</h1>
            <p className="text-muted-foreground mt-1">{interes.nombreCompleto}</p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-subtle border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Colaborador</p>
                <p className="font-semibold text-sm">{interes.nombreCompleto}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cargo</p>
                <p className="font-semibold text-sm">{interes.cargo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fondo</p>
                <p className="font-semibold text-sm">{interes.fondoCesantias}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                {interes.consignado ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Pagado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                    Pendiente
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculation Steps */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Step 1 */}
        <Card className="glass-subtle border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <CardTitle className="text-base">Saldo de Cesantías</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Saldo acumulado de cesantías al 31 de diciembre del año anterior, según reporte del fondo de cesantías.
              </p>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Fecha de corte:</span>
                <span className="font-medium">31 de Diciembre</span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Saldo Base:</p>
              <p className="text-xl font-bold text-primary">{formatearMoneda(interes.saldoCesantias31Dic)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="glass-subtle border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <CardTitle className="text-base">Tasa de Interés Legal</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Tasa de interés legal del 12% anual sobre el saldo de cesantías acumuladas al 31 de diciembre.
              </p>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Tasa Anual:</p>
              <p className="text-xl font-bold text-primary">{TASA_INTERESES_CESANTIAS * 100}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="glass-subtle border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <CardTitle className="text-base">Aplicación de Fórmula</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-xs font-mono text-muted-foreground mb-2">
                Intereses = Saldo × Tasa
              </p>
              <p className="text-xs font-mono mb-2">
                Intereses = {formatearMoneda(interes.saldoCesantias31Dic)} × 12%
              </p>
              <p className="text-xs font-mono">
                Intereses = {formatearMoneda(interes.saldoCesantias31Dic * TASA_INTERESES_CESANTIAS)}
              </p>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Resultado:</p>
              <p className="text-xl font-bold text-primary">{formatearMoneda(interes.interesesCalculados)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result Card */}
      <Card className="glass-subtle border-primary bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-2">Total Intereses sobre Cesantías a Pagar</p>
          <p className="text-5xl font-bold text-primary mb-4">{formatearMoneda(interes.interesesCalculados)}</p>
          <p className="text-xs text-muted-foreground">
            Período: {new Date(interes.periodoInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} - {new Date(interes.periodoFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </CardContent>
      </Card>

      {/* Botón de acción */}
      <div className="flex justify-end">
        <Button onClick={generarLiquidacion} size="lg" className="gap-2 shadow-lg shadow-primary/20">
          <Download className="h-5 w-5" />
          Generar y Pagar
        </Button>
      </div>
    </div>
  );
}
