import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Download, CheckCircle, DollarSign, Calendar, User, Briefcase, FileText, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useLiquidaciones } from '../../contexts/LiquidacionesContext';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CesantiasDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { cesantias, setCesantias } = useLiquidaciones();

  const cesantia = cesantias.find(c => c.id === id);

  if (!cesantia) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/liquidaciones')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No se encontró la información de cesantías</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const generarLiquidacion = () => {
    // Generar PDF profesional
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN DE CESANTÍAS', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 105, 28, { align: 'center' });

    // Línea separadora
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
        ['Nombre Completo', cesantia.nombreCompleto],
        ['Cargo', cesantia.cargo],
        ['Fecha de Ingreso', new Date(cesantia.fechaIngreso).toLocaleDateString('es-CO')],
        ['Fondo de Cesantías', cesantia.fondoCesantias],
        ['Período', `${new Date(cesantia.periodoInicio).toLocaleDateString('es-CO')} - ${new Date(cesantia.periodoFin).toLocaleDateString('es-CO')}`],
      ],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Cálculo detallado
    const finalY = (doc as any).lastAutoTable.finalY || 90;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CÁLCULO DE CESANTÍAS', 14, finalY + 10);

    autoTable(doc, {
      startY: finalY + 14,
      head: [['Concepto', 'Valor']],
      body: [
        ['Salario Básico', formatearMoneda(cesantia.salarioBasico)],
        ['Auxilio de Transporte', formatearMoneda(cesantia.auxilioTransporte)],
        ['Promedio Prestacional', formatearMoneda(cesantia.promedioPrestacional)],
        ['Días Laborados', '360 días'],
      ],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Fórmula
    const finalY2 = (doc as any).lastAutoTable.finalY || 140;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Fórmula: Cesantías = (Promedio Prestacional × Días Laborados) / 360', 14, finalY2 + 8);

    // Total
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(30, 86, 49);
    doc.rect(14, finalY2 + 14, 182, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL CESANTÍAS A CONSIGNAR:', 18, finalY2 + 22);
    doc.text(formatearMoneda(cesantia.cesantiasAcumuladas), 192, finalY2 + 22, { align: 'right' });

    // Nota legal
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const noteY = finalY2 + 34;
    doc.text('Marco Legal: Artículo 249 del Código Sustantivo del Trabajo - Ley 50 de 1990', 14, noteY);
    doc.text('Las cesantías deben consignarse a más tardar el 14 de febrero del año siguiente.', 14, noteY + 4);

    // Pie de página
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Documento generado automáticamente por el sistema de liquidaciones', 105, 280, { align: 'center' });

    // Guardar
    doc.save(`Cesantias_${cesantia.nombreCompleto.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

    // Marcar como pagado
    setCesantias(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          consignada: true,
          fechaConsignacion: new Date().toISOString().split('T')[0],
        };
      }
      return c;
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
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30 shadow-lg">
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">Liquidación de Cesantías</h1>
            <p className="text-muted-foreground mt-1">{cesantia.nombreCompleto}</p>
          </div>
        </div>
      </div>

      {/* Datos del colaborador */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Colaborador</p>
                <p className="text-xl font-bold text-foreground">{cesantia.nombreCompleto.split(' ').slice(0, 2).join(' ')}</p>
                <p className="text-sm text-muted-foreground mt-1">{cesantia.cargo}</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-7 w-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Fondo Cesantías</p>
                <p className="text-xl font-bold text-foreground">{cesantia.fondoCesantias}</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Período</p>
                <p className="text-base font-bold text-foreground">
                  {new Date(cesantia.periodoInicio).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })} - {new Date(cesantia.periodoFin).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Calendar className="h-7 w-7 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Estado</p>
                {cesantia.consignada ? (
                  <>
                    <p className="text-xl font-bold text-success">Consignada</p>
                    {cesantia.fechaConsignacion && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(cesantia.fechaConsignacion).toLocaleDateString('es-CO')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xl font-bold text-amber-600">Pendiente</p>
                )}
              </div>
              <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${cesantia.consignada ? 'bg-success/10' : 'bg-amber-500/10'}`}>
                <CheckCircle className={`h-7 w-7 ${cesantia.consignada ? 'text-success' : 'text-amber-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cálculo detallado */}
      <Card className="border-border glass-subtle">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Cálculo de Cesantías</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Desglose detallado paso a paso</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base salarial */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold text-lg">Base Salarial</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <p className="text-xs text-muted-foreground mb-2">Salario Básico</p>
                <p className="text-2xl font-bold">{formatearMoneda(cesantia.salarioBasico)}</p>
              </div>
              <div className="p-5 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <p className="text-xs text-muted-foreground mb-2">Auxilio de Transporte</p>
                <p className="text-2xl font-bold">{formatearMoneda(cesantia.auxilioTransporte)}</p>
              </div>
              <div className="p-5 bg-primary/10 rounded-lg border-2 border-primary">
                <p className="text-xs text-primary mb-2 font-semibold">= Promedio Prestacional</p>
                <p className="text-2xl font-bold text-primary">{formatearMoneda(cesantia.promedioPrestacional)}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border"></div>

          {/* Período */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold text-lg">Período Laborado</h3>
            </div>
            <div className="p-5 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Desde - Hasta</p>
                  <p className="font-semibold">
                    {new Date(cesantia.periodoInicio).toLocaleDateString('es-CO')} - {new Date(cesantia.periodoFin).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Total Días</p>
                  <p className="text-3xl font-bold text-primary">360</p>
                  <p className="text-xs text-muted-foreground">(año comercial)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border"></div>

          {/* Fórmula */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold text-lg">Aplicación de Fórmula Legal</h3>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <p className="font-mono text-sm text-blue-900 dark:text-blue-300 text-center">
                  Cesantías = (Promedio Prestacional × Días Laborados) / 360
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="font-mono text-sm text-center">
                  Cesantías = ({formatearMoneda(cesantia.promedioPrestacional)} × 360) / 360
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="font-mono text-sm text-center">
                  Cesantías = {formatearMoneda(cesantia.promedioPrestacional)}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-primary"></div>

          {/* Resultado */}
          <div className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border-2 border-primary shadow-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Total Cesantías a Consignar</p>
              </div>
              <p className="text-5xl font-bold text-primary">{formatearMoneda(cesantia.cesantiasAcumuladas)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón de acción */}
      {!cesantia.consignada && (
        <div className="flex justify-end">
          <Button onClick={generarLiquidacion} size="lg" className="gap-2 shadow-lg shadow-primary/20">
            <Download className="h-5 w-5" />
            Generar y Pagar
          </Button>
        </div>
      )}
    </div>
  );
}

