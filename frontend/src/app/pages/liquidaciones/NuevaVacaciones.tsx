import { useState, useMemo, useEffect } from 'react';
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
  Plane,
  CheckCircle,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLiquidaciones, VacacionesColaborador } from '../../contexts/LiquidacionesContext';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';
import { colaboradores } from '../../lib/mockData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function NuevaVacaciones() {
  const navigate = useNavigate();
  const { vacaciones, setVacaciones } = useLiquidaciones();

  const [formData, setFormData] = useState({
    colaboradorId: '',
    periodoInicio: '',
    periodoFin: '',
    salarioPromedio: '0',
    auxilioTransporte: '0',
    tipoVacaciones: 'servicio',
  });

  const [diasLaborados, setDiasLaborados] = useState(0);
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

  useEffect(() => {
    if (formData.periodoInicio && formData.periodoFin) {
      const inicio = new Date(formData.periodoInicio);
      const fin = new Date(formData.periodoFin);
      const diffTime = Math.abs(fin.getTime() - inicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDiasLaborados(diffDays + 1);
    } else {
      setDiasLaborados(0);
    }
  }, [formData.periodoInicio, formData.periodoFin]);

  const montoVacaciones = useMemo(() => {
    const salario = parseFloat(formData.salarioPromedio) || 0;
    const auxilio = parseFloat(formData.auxilioTransporte) || 0;
    const base = salario + auxilio;
    if (diasLaborados === 0 || base === 0) return 0;
    return (base * diasLaborados) / 360;
  }, [formData.salarioPromedio, formData.auxilioTransporte, diasLaborados]);

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
    if (!formData.colaboradorId) {
      toast.error('Selecciona un colaborador');
      return false;
    }
    if (!formData.periodoInicio || !formData.periodoFin) {
      toast.error('Define el período de liquidación');
      return false;
    }
    if (!formData.salarioPromedio || parseFloat(formData.salarioPromedio) <= 0) {
      toast.error('Ingresa un salario promedio válido');
      return false;
    }
    if (new Date(formData.periodoInicio) > new Date(formData.periodoFin)) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
      return false;
    }
    return true;
  };

  const generarLiquidacion = () => {
    if (!validarFormulario()) return;

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
        ['Nombre Completo', colaboradorSeleccionado ? nombreCompletoDe(colaboradorSeleccionado) : ''],
        ['Cédula', colaboradorSeleccionado?.cedula || ''],
        ['Cargo', colaboradorSeleccionado?.cargo || ''],
        ['Tipo', formData.tipoVacaciones === 'servicio' ? 'Vacaciones Laborales' : 'Vacaciones Compensatorias'],
        ['Período', `${new Date(formData.periodoInicio).toLocaleDateString('es-CO')} - ${new Date(formData.periodoFin).toLocaleDateString('es-CO')}`],
        ['Días Laborados', `${diasLaborados} días`],
      ],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CÁLCULO DE VACACIONES', 14, finalY + 10);

    autoTable(doc, {
      startY: finalY + 14,
      head: [['Concepto', 'Valor']],
      body: [
        ['Salario Promedio', formatearMoneda(parseFloat(formData.salarioPromedio))],
        ['Auxilio de Transporte', formatearMoneda(parseFloat(formData.auxilioTransporte) || 0)],
        ['Base Prestacional', formatearMoneda(parseFloat(formData.salarioPromedio) + (parseFloat(formData.auxilioTransporte) || 0))],
        ['Días Laborados', `${diasLaborados} días`],
      ],
      headStyles: { fillColor: [30, 86, 49], fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const finalY2 = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Fórmula: Vacaciones = (Base Prestacional × Días Laborados) / 360`, 14, finalY2 + 8);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(30, 86, 49);
    doc.rect(14, finalY2 + 14, 182, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL VACACIONES A PAGAR:', 18, finalY2 + 22);
    doc.text(formatearMoneda(montoVacaciones), 192, finalY2 + 22, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const noteY = finalY2 + 34;
    doc.text('Marco Legal: Artículo 306 del Código Sustantivo del Trabajo - Ley 1788 de 2016', 14, noteY);
    doc.text('Se paga en dos períodos: 30 de junio (primer semestre) y 20 de diciembre (segundo semestre)', 14, noteY + 4);

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

    doc.save(`Vacaciones_${(colaboradorSeleccionado ? nombreCompletoDe(colaboradorSeleccionado) : '').replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

    const nuevaVacaciones: VacacionesColaborador = {
      id: `vac-${Date.now()}`,
      colaboradorId: formData.colaboradorId,
      nombreCompleto: colaboradorSeleccionado ? nombreCompletoDe(colaboradorSeleccionado) : '',
      cargo: colaboradorSeleccionado?.cargo || '',
      fechaIngreso: colaboradorSeleccionado?.fechaIngreso || '',
      cedula: colaboradorSeleccionado?.cedula || '',
      salarioBasico: parseFloat(formData.salarioPromedio) || 0,
      diasCausados: 0,
      diasDisfrutados: 0,
      diasPendientes: 0,
      diasCompensados: 0,
      ultimoPeriodoInicio: formData.periodoInicio,
      ultimoPeriodoFin: formData.periodoFin,
      diasHabilesLaborados: diasLaborados,
      estado: 'ACTUALIZADO',
      salarioPromedio: parseFloat(formData.salarioPromedio),
      auxilioTransporte: parseFloat(formData.auxilioTransporte) || 0,
      vacacionesCalculada: montoVacaciones,
      periodoInicio: formData.periodoInicio,
      periodoFin: formData.periodoFin,
      tipoVacaciones: formData.tipoVacaciones,
      pagado: true,
      fechaPago: new Date().toISOString().split('T')[0],
    };

    setVacaciones(prev => [...prev, nuevaVacaciones]);

    toast.success('Liquidación de vacaciones generada exitosamente');
    navigate('/liquidaciones');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Liquidaciones
        </Button>

        <div>
          <h1 className="text-3xl font-bold text-primary">Nueva Liquidación de Vacaciones</h1>
          <p className="text-muted-foreground mt-1">
            Calcula y genera la liquidación de vacaciones de servicios
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

          <div className="space-y-2">
            <Label htmlFor="tipoVacaciones">
              Tipo <span className="text-destructive">*</span>
            </Label>
            <select
              id="tipoVacaciones"
              value={formData.tipoVacaciones}
              onChange={(e) => handleInputChange('tipoVacaciones', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="servicio">Vacaciones Laborales</option>
              <option value="navidad">Vacaciones Compensatorias</option>
            </select>
          </div>

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
                  value={formData.periodoInicio}
                  onChange={(e) => handleInputChange('periodoInicio', e.target.value)}
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
                  value={formData.periodoFin}
                  onChange={(e) => handleInputChange('periodoFin', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {diasLaborados > 0 && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-sm text-muted-foreground">Días laborados en el período</p>
              <p className="text-2xl font-bold text-primary">{diasLaborados} días</p>
            </div>
          )}
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
                Salario Promedio del Semestre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="salarioPromedio"
                type="number"
                placeholder="1750905"
                value={formData.salarioPromedio}
                onChange={(e) => handleInputChange('salarioPromedio', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auxilioTransporte">
                Auxilio de Transporte Promedio
              </Label>
              <Input
                id="auxilioTransporte"
                type="number"
                placeholder="249095"
                value={formData.auxilioTransporte}
                onChange={(e) => handleInputChange('auxilioTransporte', e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Base Prestacional</span>
              <span className="font-bold text-lg">{formatearMoneda((parseFloat(formData.salarioPromedio) || 0) + (parseFloat(formData.auxilioTransporte) || 0))}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Días Laborados</span>
              <span className="font-bold text-lg">{diasLaborados} días</span>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Vacaciones</span>
                <span className="font-bold text-2xl text-primary">{formatearMoneda(montoVacaciones)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fórmula: (Base Prestacional × {diasLaborados}) / 360
              </p>
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
          disabled={montoVacaciones === 0}
        >
          <CheckCircle className="h-5 w-5" />
          Generar Liquidación
        </Button>
      </div>
    </div>
  );
}
