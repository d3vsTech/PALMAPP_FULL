import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Download, CheckCircle, DollarSign, Calendar, User, Briefcase, FileText, Info, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLiquidaciones, EstadoLiquidacion, CausaTerminacion } from '../../contexts/LiquidacionesContext';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LiquidacionFinalDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { liquidacionesFinales, setLiquidacionesFinales } = useLiquidaciones();

  const liquidacion = liquidacionesFinales.find(l => l.id === id);

  if (!liquidacion) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/liquidaciones')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No se encontró la liquidación final</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const generarYPagar = () => {
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN FINAL DE CONTRATO', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 105, 28, { align: 'center' });
    doc.text(`Nro. Liquidación: ${liquidacion.id.toUpperCase()}`, 105, 34, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);

    // Información del colaborador
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL TRABAJADOR', 14, 48);

    autoTable(doc, {
      startY: 52,
      head: [['Campo', 'Información']],
      body: [
        ['Nombre Completo', liquidacion.nombreCompleto],
        ['Cargo', liquidacion.cargo],
        ['Tipo de Contrato', liquidacion.tipoContrato],
        ['Fecha de Ingreso', new Date(liquidacion.fechaIngreso).toLocaleDateString('es-CO')],
        ['Fecha de Retiro', new Date(liquidacion.fechaRetiro).toLocaleDateString('es-CO')],
        ['Causa de Terminación', getCausaTerminacionTexto(liquidacion.causaTerminacion)],
        ['Salario Básico', formatearMoneda(liquidacion.salarioBasico)],
        ['Auxilio de Transporte', formatearMoneda(liquidacion.auxilioTransporte)],
      ],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Conceptos Devengados
    const finalY1 = (doc as any).lastAutoTable.finalY || 120;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONCEPTOS DEVENGADOS', 14, finalY1 + 10);

    const conceptosDevengados: string[][] = [];
    if (liquidacion.salarioPendiente > 0) {
      conceptosDevengados.push(['Salario Pendiente', `${liquidacion.diasSalarioPendiente} días`, formatearMoneda(liquidacion.salarioPendiente)]);
    }
    if (liquidacion.cesantias > 0) {
      conceptosDevengados.push(['Cesantías', '', formatearMoneda(liquidacion.cesantias)]);
    }
    if (liquidacion.interesesCesantias > 0) {
      conceptosDevengados.push(['Intereses sobre Cesantías', '12% anual', formatearMoneda(liquidacion.interesesCesantias)]);
    }
    if (liquidacion.prima > 0) {
      conceptosDevengados.push(['Prima de Servicios', '', formatearMoneda(liquidacion.prima)]);
    }
    if (liquidacion.vacaciones > 0) {
      conceptosDevengados.push(['Vacaciones', '', formatearMoneda(liquidacion.vacaciones)]);
    }
    if (liquidacion.indemnizacion > 0) {
      conceptosDevengados.push(['Indemnización', '', formatearMoneda(liquidacion.indemnizacion)]);
    }

    autoTable(doc, {
      startY: finalY1 + 14,
      head: [['Concepto', 'Detalle', 'Valor']],
      body: conceptosDevengados,
      foot: [[{ content: 'TOTAL DEVENGADO', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, formatearMoneda(liquidacion.totalDevengado)]],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      footStyles: { fillColor: [220, 240, 220], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Conceptos Deducidos
    const finalY2 = (doc as any).lastAutoTable.finalY || 180;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONCEPTOS DEDUCIDOS', 14, finalY2 + 10);

    const conceptosDeducidos: string[][] = [];
    if (liquidacion.deduccionSeguridadSocial > 0) {
      conceptosDeducidos.push(['Seguridad Social', '', formatearMoneda(liquidacion.deduccionSeguridadSocial)]);
    }
    if (liquidacion.deduccionPrestamos > 0) {
      conceptosDeducidos.push(['Préstamos', '', formatearMoneda(liquidacion.deduccionPrestamos)]);
    }
    if (liquidacion.otrosDeducciones > 0) {
      conceptosDeducidos.push(['Otras Deducciones', '', formatearMoneda(liquidacion.otrosDeducciones)]);
    }

    autoTable(doc, {
      startY: finalY2 + 14,
      head: [['Concepto', 'Detalle', 'Valor']],
      body: conceptosDeducidos,
      foot: [[{ content: 'TOTAL DEDUCCIONES', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, formatearMoneda(liquidacion.totalDeducciones)]],
      headStyles: { fillColor: [180, 50, 50], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      footStyles: { fillColor: [255, 220, 220], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Neto a Pagar
    const finalY3 = (doc as any).lastAutoTable.finalY || 220;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(30, 86, 49);
    doc.rect(14, finalY3 + 8, 182, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`NETO A PAGAR: ${formatearMoneda(liquidacion.netoAPagar)}`, 105, finalY3 + 19, { align: 'center' });

    // Observaciones
    if (liquidacion.observaciones) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones:', 14, finalY3 + 32);
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(liquidacion.observaciones, 180);
      doc.text(splitText, 14, finalY3 + 38);
    }

    // Firmas
    const firmasY = Math.max(finalY3 + 60, 250);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.line(14, firmasY, 90, firmasY);
    doc.line(120, firmasY, 196, firmasY);
    doc.text('Firma del Empleador', 52, firmasY + 6, { align: 'center' });
    doc.text('Firma del Trabajador', 158, firmasY + 6, { align: 'center' });

    // Pie de página
    doc.setFontSize(8);
    doc.text('Elaborado conforme al Código Sustantivo del Trabajo de Colombia', 105, 285, { align: 'center' });

    doc.save(`liquidacion_final_${liquidacion.nombreCompleto.replace(/\s+/g, '_')}_${liquidacion.id}.pdf`);

    // Marcar como pagada
    setLiquidacionesFinales(prev => prev.map(l => {
      if (l.id === id) {
        return {
          ...l,
          estado: 'PAGADA',
          fechaPago: new Date().toISOString().split('T')[0],
        };
      }
      return l;
    }));

    toast.success('Liquidación final generada y marcada como pagada');
    navigate('/liquidaciones');
  };

  const getCausaTerminacionTexto = (causa: CausaTerminacion): string => {
    const textos: Record<CausaTerminacion, string> = {
      'RENUNCIA': 'Renuncia voluntaria',
      'DESPIDO_JUSTA_CAUSA': 'Despido con justa causa',
      'DESPIDO_SIN_JUSTA_CAUSA': 'Despido sin justa causa',
      'MUTUO_ACUERDO': 'Mutuo acuerdo',
      'VENCIMIENTO_CONTRATO': 'Vencimiento de contrato',
    };
    return textos[causa];
  };

  const getEstadoBadge = (estado: EstadoLiquidacion) => {
    switch (estado) {
      case 'BORRADOR':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
            Borrador
          </Badge>
        );
      case 'APROBADA':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobada
          </Badge>
        );
      case 'PAGADA':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pagada
          </Badge>
        );
      case 'ANULADA':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <XCircle className="h-3 w-3 mr-1" />
            Anulada
          </Badge>
        );
    }
  };

  const diasTrabajados = Math.floor(
    (new Date(liquidacion.fechaRetiro).getTime() - new Date(liquidacion.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24)
  );
  const anosTrabajados = (diasTrabajados / 365).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Liquidaciones
        </Button>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/10 flex items-center justify-center border border-red-500/30 shadow-lg">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Liquidación Final de Contrato</h1>
            <p className="text-muted-foreground mt-1">{liquidacion.nombreCompleto}</p>
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
                <p className="font-semibold text-sm">{liquidacion.nombreCompleto}</p>
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
                <p className="font-semibold text-sm">{liquidacion.cargo}</p>
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
                <p className="text-xs text-muted-foreground">Retiro</p>
                <p className="font-semibold text-sm">
                  {new Date(liquidacion.fechaRetiro).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                {getEstadoBadge(liquidacion.estado)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información General */}
      <Card className="glass-subtle border-border">
        <CardHeader>
          <CardTitle>Información del Contrato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tipo de Contrato</p>
            <p className="font-medium">{liquidacion.tipoContrato}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Fecha de Ingreso</p>
            <p className="font-medium">
              {new Date(liquidacion.fechaIngreso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Fecha de Retiro</p>
            <p className="font-medium">
              {new Date(liquidacion.fechaRetiro).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tiempo de Servicio</p>
            <p className="font-medium">{anosTrabajados} años ({diasTrabajados} días)</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Causa de Terminación</p>
            <p className="font-medium">{getCausaTerminacionTexto(liquidacion.causaTerminacion)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Salario Básico</p>
            <p className="font-medium">{formatearMoneda(liquidacion.salarioBasico)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Conceptos Devengados */}
      <Card className="glass-subtle border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            Conceptos Devengados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {liquidacion.salarioPendiente > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Salario Pendiente</p>
                  <p className="text-xs text-muted-foreground">{liquidacion.diasSalarioPendiente} días</p>
                </div>
                <p className="font-bold text-lg">{formatearMoneda(liquidacion.salarioPendiente)}</p>
              </div>
            )}
            {liquidacion.cesantias > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Cesantías</p>
                  <p className="text-xs text-muted-foreground">Acumuladas al retiro</p>
                </div>
                <p className="font-bold text-lg">{formatearMoneda(liquidacion.cesantias)}</p>
              </div>
            )}
            {liquidacion.interesesCesantias > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Intereses sobre Cesantías</p>
                  <p className="text-xs text-muted-foreground">12% anual</p>
                </div>
                <p className="font-bold text-lg">{formatearMoneda(liquidacion.interesesCesantias)}</p>
              </div>
            )}
            {liquidacion.prima > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Prima de Servicios</p>
                  <p className="text-xs text-muted-foreground">Proporcional</p>
                </div>
                <p className="font-bold text-lg">{formatearMoneda(liquidacion.prima)}</p>
              </div>
            )}
            {liquidacion.vacaciones > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Vacaciones</p>
                  <p className="text-xs text-muted-foreground">No disfrutadas</p>
                </div>
                <p className="font-bold text-lg">{formatearMoneda(liquidacion.vacaciones)}</p>
              </div>
            )}
            {liquidacion.indemnizacion > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-300">Indemnización</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {liquidacion.causaTerminacion === 'DESPIDO_SIN_JUSTA_CAUSA' ? 'Despido sin justa causa' : 'Según causa'}
                  </p>
                </div>
                <p className="font-bold text-lg text-amber-900 dark:text-amber-300">{formatearMoneda(liquidacion.indemnizacion)}</p>
              </div>
            )}
            <div className="flex justify-between items-center p-4 rounded-lg bg-success/10 border-2 border-success/30 mt-4">
              <p className="font-bold text-lg">TOTAL DEVENGADO</p>
              <p className="font-bold text-2xl text-success">{formatearMoneda(liquidacion.totalDevengado)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conceptos Deducidos */}
      <Card className="glass-subtle border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            Conceptos Deducidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {liquidacion.deduccionSeguridadSocial > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <p className="font-medium">Seguridad Social</p>
                <p className="font-bold text-lg text-destructive">-{formatearMoneda(liquidacion.deduccionSeguridadSocial)}</p>
              </div>
            )}
            {liquidacion.deduccionPrestamos > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <p className="font-medium">Préstamos</p>
                <p className="font-bold text-lg text-destructive">-{formatearMoneda(liquidacion.deduccionPrestamos)}</p>
              </div>
            )}
            {liquidacion.otrosDeducciones > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <p className="font-medium">Otras Deducciones</p>
                <p className="font-bold text-lg text-destructive">-{formatearMoneda(liquidacion.otrosDeducciones)}</p>
              </div>
            )}
            <div className="flex justify-between items-center p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30 mt-4">
              <p className="font-bold text-lg">TOTAL DEDUCCIONES</p>
              <p className="font-bold text-2xl text-destructive">-{formatearMoneda(liquidacion.totalDeducciones)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Neto a Pagar */}
      <Card className="glass-subtle border-primary bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-2">Neto a Pagar</p>
          <p className="text-6xl font-bold text-primary mb-4">{formatearMoneda(liquidacion.netoAPagar)}</p>
          <p className="text-xs text-muted-foreground">
            {formatearMoneda(liquidacion.totalDevengado)} devengado - {formatearMoneda(liquidacion.totalDeducciones)} deducciones
          </p>
        </CardContent>
      </Card>

      {/* Observaciones */}
      {liquidacion.observaciones && (
        <Card className="glass-subtle border-border">
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{liquidacion.observaciones}</p>
          </CardContent>
        </Card>
      )}

      {/* Botón de acción */}
      {liquidacion.estado !== 'PAGADA' && liquidacion.estado !== 'ANULADA' && (
        <div className="flex justify-end">
          <Button onClick={generarYPagar} size="lg" className="gap-2 shadow-lg shadow-primary/20">
            <Download className="h-5 w-5" />
            Generar y Pagar
          </Button>
        </div>
      )}
    </div>
  );
}
