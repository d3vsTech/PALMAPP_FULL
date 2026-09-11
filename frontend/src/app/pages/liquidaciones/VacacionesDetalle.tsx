import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, User, Calendar, DollarSign, CheckCircle, MessageCircle, Printer, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useLiquidaciones } from '../../contexts/LiquidacionesContext';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';
import ResumenLiquidacion from '../../components/liquidaciones/ResumenLiquidacion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VacacionesDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vacaciones, setVacaciones } = useLiquidaciones();
  const [mostrarResumen, setMostrarResumen] = useState(true);

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

  // Calcular valores usando los datos disponibles
  const diasLaborados = vacacion.diasHabilesLaborados || vacacion.diasCausados || 0;
  const salarioBase = vacacion.salarioBasico || vacacion.salarioPromedio || 0;
  const auxilioTransporte = vacacion.auxilioTransporte || 0;
  const basePrestacional = salarioBase + auxilioTransporte;
  const montoVacaciones = vacacion.vacacionesCalculada || (basePrestacional * diasLaborados) / 360;

  const generarPDF = () => {
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
        ['Cédula', vacacion.cedula || 'N/A'],
        ['Cargo', vacacion.cargo],
        ['Tipo', vacacion.tipoVacaciones === 'servicio' ? 'Vacaciones Laborales' : 'Vacaciones Compensatorias'],
        ['Período', vacacion.periodoInicio && vacacion.periodoFin ? `${new Date(vacacion.periodoInicio).toLocaleDateString('es-CO')} - ${new Date(vacacion.periodoFin).toLocaleDateString('es-CO')}` : 'N/A'],
        ['Días Causados', `${vacacion.diasCausados || 0} días`],
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
        ['Días Causados', `${vacacion.diasCausados || 0} días`],
        ['Días Disfrutados', `${vacacion.diasDisfrutados || 0} días`],
        ['Días Compensados', `${vacacion.diasCompensados || 0} días`],
        ['Días Pendientes', `${vacacion.diasPendientes || 0} días`],
        ['Salario Promedio', formatearMoneda(salarioBase)],
        ['Auxilio de Transporte', formatearMoneda(auxilioTransporte)],
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
    doc.text('VALOR TOTAL:', 18, finalY2 + 22);
    doc.text(formatearMoneda(montoVacaciones), 192, finalY2 + 22, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Artículo 186 del Código Sustantivo del Trabajo', 14, finalY2 + 36);

    doc.setFontSize(10);
    doc.line(14, finalY2 + 58, 90, finalY2 + 58);
    doc.line(120, finalY2 + 58, 196, finalY2 + 58);
    doc.text('Firma del Empleador', 52, finalY2 + 64, { align: 'center' });
    doc.text('Firma del Colaborador', 158, finalY2 + 64, { align: 'center' });

    doc.save(`Vacaciones_${vacacion.nombreCompleto.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const compartirWhatsApp = () => {
    const mensaje = `*LIQUIDACIÓN DE VACACIONES*\n\n` +
      `👤 *Colaborador:* ${vacacion.nombreCompleto}\n` +
      `💼 *Cargo:* ${vacacion.cargo}\n` +
      `📅 *Días Causados:* ${vacacion.diasCausados || 0} días\n` +
      `✈️ *Días Disfrutados:* ${vacacion.diasDisfrutados || 0} días\n` +
      `💰 *Días Compensados:* ${vacacion.diasCompensados || 0} días\n` +
      `⏳ *Días Pendientes:* ${vacacion.diasPendientes || 0} días\n\n` +
      `💵 *VALOR TOTAL:* ${formatearMoneda(montoVacaciones)}`;

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const marcarComoPagado = () => {
    setVacaciones(prev => prev.map(v => {
      if (v.id === id) {
        return {
          ...v,
          pagado: true,
          fechaPago: new Date().toISOString().split('T')[0],
        };
      }
      return v;
    }));

    toast.success('Vacaciones marcadas como pagadas');
    navigate('/liquidaciones');
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
              <h1 className="text-3xl font-bold text-primary">Liquidación de Vacaciones</h1>
              <p className="text-muted-foreground mt-1">
                Detalle de liquidación de vacaciones
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
                    <p className="font-medium">{vacacion.nombreCompleto}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="font-medium">{vacacion.cargo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de Ingreso</p>
                    <p className="font-medium">{new Date(vacacion.fechaIngreso).toLocaleDateString('es-CO')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    {vacacion.pagado ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Pagada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-primary/5 text-primary border-blue-200">
                        {vacacion.estado || 'Pendiente'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge variant="outline" className="bg-primary/10 text-primary dark:text-primary border-blue-500/30">
                  {vacacion.tipoVacaciones === 'servicio' ? 'Vacaciones Laborales' : 'Vacaciones Compensatorias'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Resumen de Vacaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-2">Días Causados</p>
                  <p className="text-2xl font-bold text-primary">{vacacion.diasCausados || 0} días</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-2">Días Disfrutados</p>
                  <p className="text-2xl font-bold text-primary">{vacacion.diasDisfrutados || 0} días</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-2">Días Compensados</p>
                  <p className="text-2xl font-bold text-primary">{vacacion.diasCompensados || 0} días</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-muted-foreground mb-2">Días Pendientes</p>
                  <p className="text-2xl font-bold text-amber-600">{vacacion.diasPendientes || 0} días</p>
                </div>
              </div>

              {vacacion.periodoInicio && vacacion.periodoFin && (
                <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-2">Período</p>
                  <p className="font-medium">
                    {new Date(vacacion.periodoInicio).toLocaleDateString('es-CO')} - {new Date(vacacion.periodoFin).toLocaleDateString('es-CO')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cálculo de Compensación
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Salario Base</span>
                  <span className="font-medium">{formatearMoneda(salarioBase)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Auxilio de Transporte</span>
                  <span className="font-medium">{formatearMoneda(auxilioTransporte)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm font-medium">Base Prestacional</span>
                  <span className="font-bold text-lg">{formatearMoneda(basePrestacional)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Valor Diario</span>
                  <span className="font-medium">{formatearMoneda(basePrestacional / 30)}</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Valor Total Compensación</span>
                  <span className="font-bold text-2xl text-primary">{formatearMoneda(montoVacaciones)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Calculado según días pendientes y valor diario
                </p>
              </div>
            </CardContent>
          </Card>
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
            <h1 className="text-3xl font-bold text-primary">Liquidación de Vacaciones</h1>
            <p className="text-muted-foreground mt-1">
              Detalle de liquidación de vacaciones
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Colaborador y Período
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2 relative">
              <Label htmlFor="busqueda-colaborador">
                Buscar Colaborador <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="busqueda-colaborador"
                  type="text"
                  value={vacacion.nombreCompleto}
                  disabled
                  className="pl-9"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cédula</p>
                  <p className="font-medium">{vacacion.cedula || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cargo</p>
                  <p className="font-medium">{vacacion.cargo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de Ingreso</p>
                  <p className="font-medium">{new Date(vacacion.fechaIngreso).toLocaleDateString('es-CO')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    Activo
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoVacaciones">
                Tipo <span className="text-destructive">*</span>
              </Label>
              <select
                id="tipoVacaciones"
                value={vacacion.tipoVacaciones || 'servicio'}
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed"
              >
                <option value="servicio">Vacaciones Laborales</option>
                <option value="navidad">Vacaciones Compensatorias</option>
              </select>
            </div>

            {vacacion.periodoInicio && vacacion.periodoFin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="periodoInicio">
                    Fecha Inicio del Período <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="periodoInicio"
                      type="date"
                      value={vacacion.periodoInicio}
                      disabled
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodoFin">
                    Fecha Fin del Período <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="periodoFin"
                      type="date"
                      value={vacacion.periodoFin}
                      disabled
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-muted-foreground">Días Causados</p>
                <p className="text-2xl font-bold text-primary">{vacacion.diasCausados || 0} días</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-muted-foreground">Días Pendientes</p>
                <p className="text-2xl font-bold text-amber-600">{vacacion.diasPendientes || 0} días</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Componentes Salariales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="salarioPromedio">
                  Salario Promedio <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="salarioPromedio"
                  type="number"
                  value={salarioBase}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auxilioTransporte">
                  Auxilio de Transporte
                </Label>
                <Input
                  id="auxilioTransporte"
                  type="number"
                  value={auxilioTransporte}
                  disabled
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Base Prestacional</span>
                <span className="font-bold text-lg">{formatearMoneda(basePrestacional)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor Diario</span>
                <span className="font-bold text-lg">{formatearMoneda(basePrestacional / 30)}</span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Compensación</span>
                  <span className="font-bold text-2xl text-primary">{formatearMoneda(montoVacaciones)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Basado en días pendientes y valor diario
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Columna lateral - Resumen */}
      <div className="space-y-6">
        <Card className="sticky top-6">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Resumen de Vacaciones</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Colaborador</p>
                <p className="font-semibold text-sm">{vacacion.nombreCompleto}</p>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Días Causados</p>
                  <p className="text-sm font-medium">{vacacion.diasCausados || 0} días</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Días Disfrutados</p>
                  <p className="text-sm font-medium text-primary">{vacacion.diasDisfrutados || 0} días</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Días Compensados</p>
                  <p className="text-sm font-medium text-primary">{vacacion.diasCompensados || 0} días</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Días Pendientes</p>
                  <p className="text-sm font-medium text-amber-600">{vacacion.diasPendientes || 0} días</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Valor Compensación</p>
                <p className="text-2xl font-bold text-primary">{formatearMoneda(montoVacaciones)}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Estado</p>
                {vacacion.pagado ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Pagada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-primary/5 text-primary border-blue-200">
                    {vacacion.estado || 'Pendiente'}
                  </Badge>
                )}
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
