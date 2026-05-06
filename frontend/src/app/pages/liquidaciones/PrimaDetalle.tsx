import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Download, CheckCircle, Calendar, User, Briefcase, FileText, Info, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useLiquidaciones } from '../../contexts/LiquidacionesContext';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PrimaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { primas, setPrimas } = useLiquidaciones();

  const prima = primas.find(p => p.id === id);

  if (!prima) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/liquidaciones')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No se encontró la información de prima</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const generarLiquidacion = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN DE PRIMA DE SERVICIOS', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 105, 28, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL COLABORADOR', 14, 42);

    autoTable(doc, {
      startY: 46,
      head: [['Campo', 'Información']],
      body: [
        ['Nombre Completo', prima.nombreCompleto],
        ['Cargo', prima.cargo],
        ['Fecha de Ingreso', new Date(prima.fechaIngreso).toLocaleDateString('es-CO')],
        ['Semestre', prima.semestre === 'PRIMER_SEMESTRE' ? 'Primer Semestre' : 'Segundo Semestre'],
        ['Período', `${new Date(prima.periodoInicio).toLocaleDateString('es-CO')} - ${new Date(prima.periodoFin).toLocaleDateString('es-CO')}`],
      ],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CÁLCULO DE PRIMA', 14, finalY + 10);

    autoTable(doc, {
      startY: finalY + 14,
      head: [['Concepto', 'Valor']],
      body: [
        ['Salario Básico', formatearMoneda(prima.salarioBasico)],
        ['Auxilio de Transporte', formatearMoneda(prima.auxilioTransporte)],
        ['Promedio Prestacional', formatearMoneda(prima.promedioPrestacional)],
        ['Días Trabajados', `${prima.diasTrabajados} días`],
        ['Prima Calculada', formatearMoneda(prima.primaCalculada)],
      ],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const finalY2 = (doc as any).lastAutoTable.finalY || 160;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Fórmula: Prima = (Salario Mensual × Días Trabajados) / 360`, 14, finalY2 + 8);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(30, 86, 49);
    doc.rect(14, finalY2 + 14, 182, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`TOTAL A PAGAR: ${formatearMoneda(prima.primaCalculada)}`, 105, finalY2 + 23, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Artículo 306 del Código Sustantivo del Trabajo', 14, finalY2 + 36);

    doc.setFontSize(10);
    doc.line(14, finalY2 + 58, 90, finalY2 + 58);
    doc.line(120, finalY2 + 58, 196, finalY2 + 58);
    doc.text('Firma del Empleador', 14, finalY2 + 64);
    doc.text('Firma del Colaborador', 120, finalY2 + 64);

    doc.save(`prima_${prima.nombreCompleto.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

    setPrimas(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          pagada: true,
          fechaPago: new Date().toISOString().split('T')[0],
        };
      }
      return p;
    }));

    toast.success('Liquidación generada y marcada como pagada');
    navigate('/liquidaciones');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Liquidaciones
        </Button>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center border border-purple-500/30 shadow-lg">
            <Gift className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Prima de Servicios</h1>
            <p className="text-muted-foreground mt-1">{prima.nombreCompleto}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-subtle border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Colaborador</p>
                <p className="font-semibold text-sm">{prima.nombreCompleto}</p>
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
                <p className="font-semibold text-sm">{prima.cargo}</p>
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
                <p className="text-xs text-muted-foreground">Semestre</p>
                <p className="font-semibold text-sm">
                  {prima.semestre === 'PRIMER_SEMESTRE' ? '1er Semestre' : '2do Semestre'}
                </p>
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
                {prima.pagada ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Pagada
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-subtle border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <CardTitle className="text-base">Promedio Prestacional</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Salario Básico:</span>
                <span className="font-medium">{formatearMoneda(prima.salarioBasico)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aux. Transporte:</span>
                <span className="font-medium">{formatearMoneda(prima.auxilioTransporte)}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Total Base:</p>
              <p className="text-xl font-bold text-primary">{formatearMoneda(prima.promedioPrestacional)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <CardTitle className="text-base">Días Trabajados</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Período inicio:</span>
                <span className="font-medium">
                  {new Date(prima.periodoInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Período fin:</span>
                <span className="font-medium">
                  {new Date(prima.periodoFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Total Días:</p>
              <p className="text-xl font-bold text-primary">{prima.diasTrabajados} días</p>
            </div>
          </CardContent>
        </Card>

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
                Prima = (Salario × Días) / 360
              </p>
              <p className="text-xs font-mono">
                ({formatearMoneda(prima.promedioPrestacional)} × {prima.diasTrabajados}) / 360
              </p>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Resultado:</p>
              <p className="text-xl font-bold text-primary">{formatearMoneda(prima.primaCalculada)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-subtle border-primary bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-2">Total Prima de Servicios a Pagar</p>
          <p className="text-5xl font-bold text-primary mb-4">{formatearMoneda(prima.primaCalculada)}</p>
          <p className="text-xs text-muted-foreground">
            {prima.semestre === 'PRIMER_SEMESTRE' ? 'Primer Semestre' : 'Segundo Semestre'} • {prima.diasTrabajados} días trabajados
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
