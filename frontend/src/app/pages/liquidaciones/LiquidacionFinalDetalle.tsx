import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, User, Calendar, DollarSign, CheckCircle, MessageCircle, Printer, Download, Search, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLiquidaciones, EstadoLiquidacion, CausaTerminacion } from '../../contexts/LiquidacionesContext';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';
import ResumenLiquidacion from '../../components/liquidaciones/ResumenLiquidacion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LiquidacionFinalDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { liquidacionesFinales, setLiquidacionesFinales } = useLiquidaciones();
  const [mostrarResumen, setMostrarResumen] = useState(true);

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

  const diasTrabajados = Math.floor(
    (new Date(liquidacion.fechaRetiro).getTime() - new Date(liquidacion.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24)
  );
  const anosTrabajados = (diasTrabajados / 365).toFixed(1);

  const generarPDF = () => {
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
  };

  const compartirWhatsApp = () => {
    const mensaje = `*LIQUIDACIÓN FINAL DE CONTRATO*\n\n` +
      `👤 *Colaborador:* ${liquidacion.nombreCompleto}\n` +
      `💼 *Cargo:* ${liquidacion.cargo}\n` +
      `📅 *Fecha de Retiro:* ${new Date(liquidacion.fechaRetiro).toLocaleDateString('es-CO')}\n` +
      `📋 *Causa:* ${getCausaTerminacionTexto(liquidacion.causaTerminacion)}\n\n` +
      `💰 *TOTAL DEVENGADO:* ${formatearMoneda(liquidacion.totalDevengado)}\n` +
      `💳 *TOTAL DEDUCCIONES:* ${formatearMoneda(liquidacion.totalDeducciones)}\n\n` +
      `💵 *NETO A PAGAR:* ${formatearMoneda(liquidacion.netoAPagar)}`;

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const marcarComoPagado = () => {
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

    toast.success('Liquidación final marcada como pagada');
    navigate('/liquidaciones');
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
          <Badge variant="outline" className="bg-primary/5 text-primary border-blue-200 dark:bg-primary/10 dark:text-primary dark:border-blue-900/30">
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

  if (mostrarResumen) {
    return (
      <ResumenLiquidacion
        onVolver={() => setMostrarResumen(false)}
        onAceptar={marcarComoPagado}
        onDescargarPDF={generarPDF}
        onCompartirWhatsApp={compartirWhatsApp}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a Liquidaciones
            </Button>

            <div>
              <h1 className="text-3xl font-bold text-primary">Liquidación Final de Contrato</h1>
              <p className="text-muted-foreground mt-1">
                Detalle de liquidación final
              </p>
            </div>
          </div>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Colaborador
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Nombre Completo</p>
                    <p className="font-medium">{liquidacion.nombreCompleto}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="font-medium">{liquidacion.cargo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de Contrato</p>
                    <p className="font-medium">{liquidacion.tipoContrato}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    {getEstadoBadge(liquidacion.estado)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fecha de Ingreso</p>
                  <p className="text-sm font-medium">
                    {new Date(liquidacion.fechaIngreso).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fecha de Retiro</p>
                  <p className="text-sm font-medium">
                    {new Date(liquidacion.fechaRetiro).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tiempo de Servicio</p>
                  <p className="text-sm font-medium">{anosTrabajados} años</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Causa de Terminación</p>
                <Badge variant="outline" className="bg-destructive/10 text-destructive dark:text-destructive border-red-500/30">
                  {getCausaTerminacionTexto(liquidacion.causaTerminacion)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                Conceptos Devengados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {liquidacion.salarioPendiente > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <div>
                    <p className="font-medium">Salario Pendiente</p>
                    <p className="text-xs text-muted-foreground">{liquidacion.diasSalarioPendiente} días</p>
                  </div>
                  <p className="font-bold">{formatearMoneda(liquidacion.salarioPendiente)}</p>
                </div>
              )}
              {liquidacion.cesantias > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="font-medium">Cesantías</p>
                  <p className="font-bold">{formatearMoneda(liquidacion.cesantias)}</p>
                </div>
              )}
              {liquidacion.interesesCesantias > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <div>
                    <p className="font-medium">Intereses sobre Cesantías</p>
                    <p className="text-xs text-muted-foreground">12% anual</p>
                  </div>
                  <p className="font-bold">{formatearMoneda(liquidacion.interesesCesantias)}</p>
                </div>
              )}
              {liquidacion.prima > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="font-medium">Prima de Servicios</p>
                  <p className="font-bold">{formatearMoneda(liquidacion.prima)}</p>
                </div>
              )}
              {liquidacion.vacaciones > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="font-medium">Vacaciones</p>
                  <p className="font-bold">{formatearMoneda(liquidacion.vacaciones)}</p>
                </div>
              )}
              {liquidacion.indemnizacion > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="font-medium">Indemnización</p>
                  <p className="font-bold text-amber-600">{formatearMoneda(liquidacion.indemnizacion)}</p>
                </div>
              )}

              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">TOTAL DEVENGADO</span>
                  <span className="font-bold text-2xl text-success">{formatearMoneda(liquidacion.totalDevengado)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Conceptos Deducidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {liquidacion.deduccionSeguridadSocial > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="font-medium">Seguridad Social</p>
                  <p className="font-bold text-destructive">-{formatearMoneda(liquidacion.deduccionSeguridadSocial)}</p>
                </div>
              )}
              {liquidacion.deduccionPrestamos > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="font-medium">Préstamos</p>
                  <p className="font-bold text-destructive">-{formatearMoneda(liquidacion.deduccionPrestamos)}</p>
                </div>
              )}
              {liquidacion.otrosDeducciones > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <p className="font-medium">Otras Deducciones</p>
                  <p className="font-bold text-destructive">-{formatearMoneda(liquidacion.otrosDeducciones)}</p>
                </div>
              )}

              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">TOTAL DEDUCCIONES</span>
                  <span className="font-bold text-2xl text-destructive">-{formatearMoneda(liquidacion.totalDeducciones)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary bg-gradient-to-br from-primary/5 to-primary/10">
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

          {liquidacion.observaciones && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Observaciones</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">{liquidacion.observaciones}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ResumenLiquidacion>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna principal - Formulario */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Liquidaciones
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-primary">Liquidación Final de Contrato</h1>
            <p className="text-muted-foreground mt-1">
              Detalle de liquidación final
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2 relative">
              <Label htmlFor="busqueda-colaborador">
                Colaborador <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="busqueda-colaborador"
                  type="text"
                  value={liquidacion.nombreCompleto}
                  disabled
                  className="pl-9"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cargo</p>
                  <p className="font-medium">{liquidacion.cargo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Contrato</p>
                  <p className="font-medium">{liquidacion.tipoContrato}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de Ingreso</p>
                  <p className="font-medium">{new Date(liquidacion.fechaIngreso).toLocaleDateString('es-CO')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tiempo de Servicio</p>
                  <p className="font-medium">{anosTrabajados} años</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fechaRetiro">
                  Fecha de Retiro <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fechaRetiro"
                    type="date"
                    value={liquidacion.fechaRetiro}
                    disabled
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="causaTerminacion">
                  Causa de Terminación <span className="text-destructive">*</span>
                </Label>
                <select
                  id="causaTerminacion"
                  value={liquidacion.causaTerminacion}
                  disabled
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed"
                >
                  <option value="RENUNCIA">Renuncia voluntaria</option>
                  <option value="DESPIDO_JUSTA_CAUSA">Despido con justa causa</option>
                  <option value="DESPIDO_SIN_JUSTA_CAUSA">Despido sin justa causa</option>
                  <option value="MUTUO_ACUERDO">Mutuo acuerdo</option>
                  <option value="VENCIMIENTO_CONTRATO">Vencimiento de contrato</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salarioBasico">Salario Básico</Label>
                <Input
                  id="salarioBasico"
                  type="number"
                  value={liquidacion.salarioBasico}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auxilioTransporte">Auxilio de Transporte</Label>
                <Input
                  id="auxilioTransporte"
                  type="number"
                  value={liquidacion.auxilioTransporte}
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Detalle de Liquidación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Conceptos Devengados
              </h3>
              <div className="space-y-2 text-sm">
                {liquidacion.salarioPendiente > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Salario Pendiente ({liquidacion.diasSalarioPendiente} días)</span>
                    <span className="font-medium">{formatearMoneda(liquidacion.salarioPendiente)}</span>
                  </div>
                )}
                {liquidacion.cesantias > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Cesantías</span>
                    <span className="font-medium">{formatearMoneda(liquidacion.cesantias)}</span>
                  </div>
                )}
                {liquidacion.interesesCesantias > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Intereses sobre Cesantías</span>
                    <span className="font-medium">{formatearMoneda(liquidacion.interesesCesantias)}</span>
                  </div>
                )}
                {liquidacion.prima > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Prima de Servicios</span>
                    <span className="font-medium">{formatearMoneda(liquidacion.prima)}</span>
                  </div>
                )}
                {liquidacion.vacaciones > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Vacaciones</span>
                    <span className="font-medium">{formatearMoneda(liquidacion.vacaciones)}</span>
                  </div>
                )}
                {liquidacion.indemnizacion > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Indemnización</span>
                    <span className="font-medium text-amber-600">{formatearMoneda(liquidacion.indemnizacion)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 font-bold">
                  <span>TOTAL DEVENGADO</span>
                  <span className="text-success">{formatearMoneda(liquidacion.totalDevengado)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Conceptos Deducidos
              </h3>
              <div className="space-y-2 text-sm">
                {liquidacion.deduccionSeguridadSocial > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Seguridad Social</span>
                    <span className="font-medium text-destructive">-{formatearMoneda(liquidacion.deduccionSeguridadSocial)}</span>
                  </div>
                )}
                {liquidacion.deduccionPrestamos > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Préstamos</span>
                    <span className="font-medium text-destructive">-{formatearMoneda(liquidacion.deduccionPrestamos)}</span>
                  </div>
                )}
                {liquidacion.otrosDeducciones > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Otras Deducciones</span>
                    <span className="font-medium text-destructive">-{formatearMoneda(liquidacion.otrosDeducciones)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 font-bold">
                  <span>TOTAL DEDUCCIONES</span>
                  <span className="text-destructive">-{formatearMoneda(liquidacion.totalDeducciones)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">NETO A PAGAR</span>
                <span className="font-bold text-3xl text-primary">{formatearMoneda(liquidacion.netoAPagar)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {liquidacion.observaciones && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Observaciones</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{liquidacion.observaciones}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Columna lateral - Resumen */}
      <div className="space-y-6">
        <Card className="sticky top-6">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Resumen de Liquidación</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Colaborador</p>
                <p className="font-semibold text-sm">{liquidacion.nombreCompleto}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Fecha de Retiro</p>
                <p className="text-sm">{new Date(liquidacion.fechaRetiro).toLocaleDateString('es-CO')}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Causa de Terminación</p>
                <Badge variant="outline" className="bg-destructive/10 text-destructive dark:text-destructive border-red-500/30">
                  {getCausaTerminacionTexto(liquidacion.causaTerminacion)}
                </Badge>
              </div>

              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Devengado:</span>
                  <span className="font-medium text-success">{formatearMoneda(liquidacion.totalDevengado)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Deducciones:</span>
                  <span className="font-medium text-destructive">-{formatearMoneda(liquidacion.totalDeducciones)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Neto a Pagar</p>
                <p className="text-2xl font-bold text-primary">{formatearMoneda(liquidacion.netoAPagar)}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Estado</p>
                {getEstadoBadge(liquidacion.estado)}
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                onClick={() => setMostrarResumen(true)}
                className="w-full gap-2"
                size="lg"
              >
                <CheckCircle className="h-5 w-5" />
                Ver Resumen
              </Button>
              <Button
                onClick={generarPDF}
                variant="outline"
                className="w-full gap-2"
                size="sm"
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="w-full gap-2"
                size="sm"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <Button
                onClick={compartirWhatsApp}
                variant="outline"
                className="w-full gap-2 text-primary border-green-600 hover:bg-primary/5"
                size="sm"
              >
                <MessageCircle className="h-4 w-4" />
                Compartir
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
