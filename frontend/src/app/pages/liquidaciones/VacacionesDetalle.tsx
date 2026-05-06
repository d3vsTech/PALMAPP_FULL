import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Download, CheckCircle, DollarSign, Calendar, User, Briefcase, FileText, Info, Plane } from 'lucide-react';
import { toast } from 'sonner';
import { useLiquidaciones } from '../../contexts/LiquidacionesContext';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VacacionesDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vacaciones } = useLiquidaciones();

  const vacacion = vacaciones.find(v => v.id === id);

  if (!vacacion) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/liquidaciones')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No se encontró la información de vacaciones</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const generarLiquidacion = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN DE VACACIONES', 105, 20, { align: 'center' });

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
        ['Nombre Completo', vacacion.nombreCompleto],
        ['Cargo', vacacion.cargo],
        ['Fecha de Ingreso', new Date(vacacion.fechaIngreso).toLocaleDateString('es-CO')],
        ['Salario Básico', formatearMoneda(vacacion.salarioBasico)],
      ],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE VACACIONES', 14, finalY + 10);

    autoTable(doc, {
      startY: finalY + 14,
      head: [['Concepto', 'Valor']],
      body: [
        ['Días Causados', `${vacacion.diasCausados} días`],
        ['Días Disfrutados', `${vacacion.diasDisfrutados} días`],
        ['Días Compensados', `${vacacion.diasCompensados} días`],
        ['Días Pendientes', `${vacacion.diasPendientes} días`],
      ],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const finalY2 = (doc as any).lastAutoTable.finalY || 160;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('15 días hábiles por cada año de servicio', 14, finalY2 + 8);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(30, 86, 49);
    doc.rect(14, finalY2 + 14, 182, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`ESTADO: ${vacacion.estado}`, 105, finalY2 + 23, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Artículo 186 del Código Sustantivo del Trabajo', 14, finalY2 + 36);

    doc.setFontSize(10);
    doc.line(14, finalY2 + 58, 90, finalY2 + 58);
    doc.line(120, finalY2 + 58, 196, finalY2 + 58);
    doc.text('Firma del Empleador', 14, finalY2 + 64);
    doc.text('Firma del Colaborador', 120, finalY2 + 64);

    doc.save(`vacaciones_${vacacion.nombreCompleto.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generado exitosamente');
    navigate('/liquidaciones');
  };

  const valorDiario = vacacion.salarioBasico / 30;
  const valorCompensacionPendiente = valorDiario * vacacion.diasPendientes;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Liquidaciones
        </Button>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center border border-blue-500/30 shadow-lg">
            <Plane className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Vacaciones</h1>
            <p className="text-muted-foreground mt-1">{vacacion.nombreCompleto}</p>
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
                <p className="font-semibold text-sm">{vacacion.nombreCompleto}</p>
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
                <p className="font-semibold text-sm">{vacacion.cargo}</p>
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
                <p className="text-xs text-muted-foreground">Ingreso</p>
                <p className="font-semibold text-sm">
                  {new Date(vacacion.fechaIngreso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {vacacion.estado}
                </Badge>
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
              <CardTitle className="text-base">Días Causados</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Días de vacaciones acumulados según tiempo de servicio
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Días laborados:</span>
                <span className="font-medium">{vacacion.diasHabilesLaborados} días</span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Total Causados:</p>
              <p className="text-xl font-bold text-primary">{vacacion.diasCausados} días</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <CardTitle className="text-base">Días Utilizados</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disfrutados:</span>
                <span className="font-medium text-blue-600">{vacacion.diasDisfrutados} días</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Compensados:</span>
                <span className="font-medium text-green-600">{vacacion.diasCompensados} días</span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Total:</p>
              <p className="text-xl font-bold text-primary">{vacacion.diasDisfrutados + vacacion.diasCompensados} días</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <CardTitle className="text-base">Días Pendientes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-xs font-mono text-muted-foreground mb-2">
                Pendientes = Causados - Utilizados
              </p>
              <p className="text-xs font-mono">
                {vacacion.diasCausados} - {vacacion.diasDisfrutados + vacacion.diasCompensados}
              </p>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Disponible:</p>
              <p className="text-xl font-bold text-amber-600">{vacacion.diasPendientes} días</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-subtle border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/10 mb-4">
              <Plane className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">Días de Vacaciones Pendientes</p>
            <p className="text-5xl font-bold text-amber-600 mb-4">{vacacion.diasPendientes}</p>
            <p className="text-xs text-muted-foreground">días hábiles disponibles</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-primary bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">Valor de Compensación (si aplica)</p>
            <p className="text-5xl font-bold text-primary mb-4">{formatearMoneda(valorCompensacionPendiente)}</p>
            <p className="text-xs text-muted-foreground">
              {vacacion.diasPendientes} días × {formatearMoneda(valorDiario)} por día
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Botón de acción */}
      <div className="flex justify-end">
        <Button onClick={generarLiquidacion} size="lg" className="gap-2 shadow-lg shadow-primary/20">
          <Download className="h-5 w-5" />
          Generar PDF
        </Button>
      </div>
    </div>
  );
}
