import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  Calculator,
  User,
  Calendar,
  DollarSign,
  FileX,
  CheckCircle,
  Search,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLiquidaciones, LiquidacionFinal, CausaTerminacion } from '../../contexts/LiquidacionesContext';
import { formatearMoneda, TASA_INTERESES_CESANTIAS } from '../../lib/liquidaciones/calculoUtils';
import { colaboradores } from '../../lib/mockData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function NuevaLiquidacionFinal() {
  const navigate = useNavigate();
  const { liquidacionesFinales, setLiquidacionesFinales } = useLiquidaciones();

  const [tipoLiquidacion, setTipoLiquidacion] = useState<'normal' | 'final' | ''>('');
  const [formData, setFormData] = useState({
    colaboradorId: '',
    fechaRetiro: '',
    motivoRetiro: '',
    salarioBasico: '0',
    auxilioTransporte: '0',
    diasCesantias: '0',
    saldoCesantias: '0',
    diasIntereses: '0',
    salarioPrima: '0',
    auxilioPrima: '0',
    diasPrima: '0',
    salarioVacaciones: '0',
    diasVacaciones: '0',
    salarioIndemnizacion: '0',
    diasIndemnizacion: '0',
  });

  const [busquedaColaborador, setBusquedaColaborador] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const colaboradoresDisponibles = colaboradores.filter(c => c.estado === 'Activo');
  const colaboradorSeleccionado = colaboradores.find(c => c.id === formData.colaboradorId);
  const nombreCompletoDe = (c: { nombres: string; apellidos: string }) => `${c.nombres} ${c.apellidos}`;

  const colaboradoresFiltrados = colaboradoresDisponibles.filter(col => {
    if (!busquedaColaborador) return false;
    const busqueda = busquedaColaborador.toLowerCase();
    return (
      nombreCompletoDe(col).toLowerCase().includes(busqueda) ||
      (col.cedula || '').includes(busqueda) ||
      (col.cargo?.toLowerCase() || '').includes(busqueda)
    );
  });

  const montoCesantias = useMemo(() => {
    const salario = parseFloat(formData.salarioBasico) || 0;
    const auxilio = parseFloat(formData.auxilioTransporte) || 0;
    const dias = parseFloat(formData.diasCesantias) || 0;
    return ((salario + auxilio) * dias) / 360;
  }, [formData.salarioBasico, formData.auxilioTransporte, formData.diasCesantias]);

  const montoIntereses = useMemo(() => {
    const saldo = parseFloat(formData.saldoCesantias) || 0;
    const dias = parseFloat(formData.diasIntereses) || 0;
    return (saldo * TASA_INTERESES_CESANTIAS * dias) / 360;
  }, [formData.saldoCesantias, formData.diasIntereses]);

  const montoPrima = useMemo(() => {
    const salario = parseFloat(formData.salarioPrima) || 0;
    const auxilio = parseFloat(formData.auxilioPrima) || 0;
    const dias = parseFloat(formData.diasPrima) || 0;
    return ((salario + auxilio) * dias) / 360;
  }, [formData.salarioPrima, formData.auxilioPrima, formData.diasPrima]);

  const montoVacaciones = useMemo(() => {
    const salario = parseFloat(formData.salarioVacaciones) || 0;
    const dias = parseFloat(formData.diasVacaciones) || 0;
    return (salario * dias) / 360;
  }, [formData.salarioVacaciones, formData.diasVacaciones]);

  const montoIndemnizacion = useMemo(() => {
    if (tipoLiquidacion !== 'final') return 0;
    const salario = parseFloat(formData.salarioIndemnizacion) || 0;
    const dias = parseFloat(formData.diasIndemnizacion) || 0;
    return (salario * dias) / 30;
  }, [tipoLiquidacion, formData.salarioIndemnizacion, formData.diasIndemnizacion]);

  const montoTotal = montoCesantias + montoIntereses + montoPrima + montoVacaciones + montoIndemnizacion;

  const handleInputChange = (campo: string, valor: string) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };

  const seleccionarColaborador = (colaborador: (typeof colaboradores)[number]) => {
    setFormData(prev => ({ ...prev, colaboradorId: colaborador.id }));
    setBusquedaColaborador(nombreCompletoDe(colaborador));
    setMostrarResultados(false);
  };

  const handleBusquedaChange = (valor: string) => {
    setBusquedaColaborador(valor);
    setMostrarResultados(true);
    if (!valor) {
      setFormData(prev => ({ ...prev, colaboradorId: '' }));
    }
  };

  const validarFormulario = () => {
    if (!tipoLiquidacion) {
      toast.error('Selecciona el tipo de liquidación');
      return false;
    }
    if (!formData.colaboradorId) {
      toast.error('Selecciona un colaborador');
      return false;
    }
    if (tipoLiquidacion === 'final' && !formData.fechaRetiro) {
      toast.error('Ingresa la fecha de retiro');
      return false;
    }
    if (tipoLiquidacion === 'final' && !formData.motivoRetiro) {
      toast.error('Selecciona el motivo de retiro');
      return false;
    }
    return true;
  };

  const generarLiquidacion = () => {
    if (!validarFormulario()) return;

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(tipoLiquidacion === 'final' ? 'LIQUIDACIÓN FINAL' : 'LIQUIDACIÓN', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 105, 28, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL COLABORADOR', 14, 42);

    const datosColaborador = [
      ['Nombre Completo', colaboradorSeleccionado ? nombreCompletoDe(colaboradorSeleccionado) : ''],
      ['Cédula', colaboradorSeleccionado?.cedula || ''],
      ['Cargo', colaboradorSeleccionado?.cargo || ''],
    ];

    if (tipoLiquidacion === 'final') {
      datosColaborador.push(
        ['Fecha de Retiro', new Date(formData.fechaRetiro).toLocaleDateString('es-CO')],
        ['Motivo de Retiro', formData.motivoRetiro]
      );
    }

    autoTable(doc, {
      startY: 46,
      head: [['Campo', 'Información']],
      body: datosColaborador,
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONCEPTOS DE LIQUIDACIÓN', 14, finalY + 10);

    const conceptos = [];
    if (montoCesantias > 0) conceptos.push(['Cesantías', formatearMoneda(montoCesantias)]);
    if (montoIntereses > 0) conceptos.push(['Intereses sobre Cesantías', formatearMoneda(montoIntereses)]);
    if (montoPrima > 0) conceptos.push(['Prima de Servicios', formatearMoneda(montoPrima)]);
    if (montoVacaciones > 0) conceptos.push(['Vacaciones', formatearMoneda(montoVacaciones)]);
    if (montoIndemnizacion > 0) conceptos.push(['Indemnización', formatearMoneda(montoIndemnizacion)]);

    autoTable(doc, {
      startY: finalY + 14,
      head: [['Concepto', 'Valor']],
      body: conceptos,
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const finalY2 = (doc as any).lastAutoTable.finalY || 150;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(30, 86, 49);
    doc.rect(14, finalY2 + 14, 182, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL A PAGAR:', 18, finalY2 + 22);
    doc.text(formatearMoneda(montoTotal), 192, finalY2 + 22, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const noteY = finalY2 + 34;
    doc.text('Marco Legal: Código Sustantivo del Trabajo - Colombia', 14, noteY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const firmaY = noteY + 20;
    doc.line(14, firmaY, 90, firmaY);
    doc.line(120, firmaY, 196, firmaY);
    doc.text('Firma del Empleador', 52, firmaY + 5, { align: 'center' });
    doc.text('Firma del Colaborador', 158, firmaY + 5, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Documento generado automáticamente por el sistema de liquidaciones', 105, 280, { align: 'center' });

    doc.save(`Liquidacion_${tipoLiquidacion === 'final' ? 'Final_' : ''}${(colaboradorSeleccionado ? nombreCompletoDe(colaboradorSeleccionado) : '').replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

    const causasPorMotivo: Record<string, CausaTerminacion> = {
      'Renuncia Voluntaria': 'RENUNCIA',
      'Despido con Justa Causa': 'DESPIDO_JUSTA_CAUSA',
      'Despido sin Justa Causa': 'DESPIDO_SIN_JUSTA_CAUSA',
      'Mutuo Acuerdo': 'MUTUO_ACUERDO',
    };
    const hoy = new Date().toISOString().split('T')[0];

    const nuevaLiquidacion: LiquidacionFinal = {
      id: `liq-${Date.now()}`,
      colaboradorId: formData.colaboradorId,
      nombreCompleto: colaboradorSeleccionado ? nombreCompletoDe(colaboradorSeleccionado) : '',
      cargo: colaboradorSeleccionado?.cargo || '',
      tipoContrato: 'INDEFINIDO',
      fechaIngreso: colaboradorSeleccionado?.fechaIngreso || '',
      tipoLiquidacion: tipoLiquidacion,
      fechaRetiro: formData.fechaRetiro || hoy,
      motivoRetiro: formData.motivoRetiro,
      causaTerminacion: causasPorMotivo[formData.motivoRetiro] || 'MUTUO_ACUERDO',
      salarioBasico: parseFloat(formData.salarioBasico) || 0,
      auxilioTransporte: parseFloat(formData.auxilioTransporte) || 0,
      cesantias: montoCesantias,
      interesesCesantias: montoIntereses,
      prima: montoPrima,
      vacaciones: montoVacaciones,
      diasSalarioPendiente: 0,
      salarioPendiente: 0,
      indemnizacion: montoIndemnizacion,
      deduccionSeguridadSocial: 0,
      deduccionPrestamos: 0,
      otrosDeducciones: 0,
      totalDevengado: montoTotal,
      totalDeducciones: 0,
      netoAPagar: montoTotal,
      estado: 'PAGADA',
      fechaCreacion: hoy,
      fechaPago: hoy,
      observaciones: formData.motivoRetiro,
    };

    setLiquidacionesFinales(prev => [...prev, nuevaLiquidacion]);

    toast.success(`Liquidación ${tipoLiquidacion === 'final' ? 'final' : ''} generada exitosamente`);
    navigate('/liquidaciones');
  };

  if (!tipoLiquidacion) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Liquidaciones
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-primary">Nueva Liquidación</h1>
            <p className="text-muted-foreground mt-1">
              Selecciona el tipo de liquidación que deseas realizar
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Tipo de Liquidación</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setTipoLiquidacion('normal')}
                className="p-6 rounded-lg border-2 border-border hover:border-primary transition-all hover:shadow-md text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 dark:bg-primary/10 flex items-center justify-center">
                    <Calculator className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Liquidación Normal</h3>
                    <p className="text-sm text-muted-foreground">
                      Para colaboradores activos. Incluye cesantías, intereses, prima y vacaciones.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setTipoLiquidacion('final')}
                className="p-6 rounded-lg border-2 border-border hover:border-primary transition-all hover:shadow-md text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-destructive/10 dark:bg-destructive/10 flex items-center justify-center">
                    <FileX className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Liquidación Final</h3>
                    <p className="text-sm text-muted-foreground">
                      Para colaboradores que se retiran. Incluye todos los conceptos más indemnización.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setTipoLiquidacion('')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Cambiar Tipo
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
            Volver a Liquidaciones
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-primary">
            {tipoLiquidacion === 'final' ? 'Liquidación Final' : 'Liquidación Normal'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Calcula y genera la liquidación del colaborador
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
              Buscar Colaborador <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="busqueda-colaborador"
                type="text"
                placeholder="Buscar por nombre, cédula o cargo..."
                value={busquedaColaborador}
                onChange={(e) => handleBusquedaChange(e.target.value)}
                onFocus={() => setMostrarResultados(true)}
                className="pl-9"
              />
            </div>

            {mostrarResultados && busquedaColaborador && colaboradoresFiltrados.length > 0 && (
              <Card className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto shadow-lg">
                <CardContent className="p-0">
                  {colaboradoresFiltrados.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => seleccionarColaborador(col)}
                      className="w-full text-left p-3 hover:bg-muted/50 border-b border-border last:border-0 transition-colors"
                    >
                      <span className="font-medium text-sm">{nombreCompletoDe(col)}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {mostrarResultados && busquedaColaborador && colaboradoresFiltrados.length === 0 && (
              <Card className="absolute z-50 w-full mt-1 shadow-lg">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">No se encontraron colaboradores</p>
                </CardContent>
              </Card>
            )}
          </div>

          {colaboradorSeleccionado && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cédula</p>
                  <p className="font-medium">{colaboradorSeleccionado.cedula}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cargo</p>
                  <p className="font-medium">{colaboradorSeleccionado.cargo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de Ingreso</p>
                  <p className="font-medium">{new Date(colaboradorSeleccionado.fechaIngreso).toLocaleDateString('es-CO')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    {colaboradorSeleccionado.estado}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {tipoLiquidacion === 'final' && (
            <>
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
                      value={formData.fechaRetiro}
                      onChange={(e) => handleInputChange('fechaRetiro', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motivoRetiro">
                    Motivo de Retiro <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="motivoRetiro"
                    value={formData.motivoRetiro}
                    onChange={(e) => handleInputChange('motivoRetiro', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Selecciona un motivo...</option>
                    <option value="Renuncia Voluntaria">Renuncia Voluntaria</option>
                    <option value="Despido con Justa Causa">Despido con Justa Causa</option>
                    <option value="Despido sin Justa Causa">Despido sin Justa Causa</option>
                    <option value="Mutuo Acuerdo">Mutuo Acuerdo</option>
                    <option value="Pensión">Pensión</option>
                    <option value="Fallecimiento">Fallecimiento</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Conceptos de Liquidación
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              Cesantías
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salarioBasico">Salario Básico</Label>
                <Input
                  id="salarioBasico"
                  type="number"
                  value={formData.salarioBasico}
                  onChange={(e) => handleInputChange('salarioBasico', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auxilioTransporte">Aux. Transporte</Label>
                <Input
                  id="auxilioTransporte"
                  type="number"
                  value={formData.auxilioTransporte}
                  onChange={(e) => handleInputChange('auxilioTransporte', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diasCesantias">Días</Label>
                <Input
                  id="diasCesantias"
                  type="number"
                  value={formData.diasCesantias}
                  onChange={(e) => handleInputChange('diasCesantias', e.target.value)}
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Cesantías</span>
                <span className="font-bold text-lg text-primary">{formatearMoneda(montoCesantias)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              Intereses sobre Cesantías
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="saldoCesantias">Saldo Cesantías</Label>
                <Input
                  id="saldoCesantias"
                  type="number"
                  value={formData.saldoCesantias}
                  onChange={(e) => handleInputChange('saldoCesantias', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diasIntereses">Días</Label>
                <Input
                  id="diasIntereses"
                  type="number"
                  value={formData.diasIntereses}
                  onChange={(e) => handleInputChange('diasIntereses', e.target.value)}
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Intereses</span>
                <span className="font-bold text-lg text-primary">{formatearMoneda(montoIntereses)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              Prima de Servicios
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salarioPrima">Salario</Label>
                <Input
                  id="salarioPrima"
                  type="number"
                  value={formData.salarioPrima}
                  onChange={(e) => handleInputChange('salarioPrima', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auxilioPrima">Aux. Transporte</Label>
                <Input
                  id="auxilioPrima"
                  type="number"
                  value={formData.auxilioPrima}
                  onChange={(e) => handleInputChange('auxilioPrima', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diasPrima">Días</Label>
                <Input
                  id="diasPrima"
                  type="number"
                  value={formData.diasPrima}
                  onChange={(e) => handleInputChange('diasPrima', e.target.value)}
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Prima</span>
                <span className="font-bold text-lg text-primary">{formatearMoneda(montoPrima)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              Vacaciones
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salarioVacaciones">Salario</Label>
                <Input
                  id="salarioVacaciones"
                  type="number"
                  value={formData.salarioVacaciones}
                  onChange={(e) => handleInputChange('salarioVacaciones', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diasVacaciones">Días</Label>
                <Input
                  id="diasVacaciones"
                  type="number"
                  value={formData.diasVacaciones}
                  onChange={(e) => handleInputChange('diasVacaciones', e.target.value)}
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Vacaciones</span>
                <span className="font-bold text-lg text-primary">{formatearMoneda(montoVacaciones)}</span>
              </div>
            </div>
          </div>

          {tipoLiquidacion === 'final' && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive"></div>
                Indemnización
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salarioIndemnizacion">Salario Base</Label>
                  <Input
                    id="salarioIndemnizacion"
                    type="number"
                    value={formData.salarioIndemnizacion}
                    onChange={(e) => handleInputChange('salarioIndemnizacion', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diasIndemnizacion">Días</Label>
                  <Input
                    id="diasIndemnizacion"
                    type="number"
                    value={formData.diasIndemnizacion}
                    onChange={(e) => handleInputChange('diasIndemnizacion', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Según motivo de retiro
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 dark:bg-destructive/10 border border-red-200 dark:border-red-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Indemnización</span>
                  <span className="font-bold text-lg text-destructive">{formatearMoneda(montoIndemnizacion)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t-2">
            <div className="p-6 rounded-lg bg-primary/10 border-2 border-primary/30">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xl">TOTAL A PAGAR</span>
                <span className="font-bold text-3xl text-primary">{formatearMoneda(montoTotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate('/liquidaciones')}
        >
          Cancelar
        </Button>
        <Button
          size="lg"
          onClick={generarLiquidacion}
          className="gap-2"
          disabled={montoTotal === 0}
        >
          <CheckCircle className="h-5 w-5" />
          Generar Liquidación
        </Button>
      </div>
    </div>
  );
}
