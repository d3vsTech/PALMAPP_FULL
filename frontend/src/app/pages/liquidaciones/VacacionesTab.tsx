import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  Search,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  formatearMoneda,
} from '../../lib/liquidaciones/calculoUtils';
import { useLiquidaciones, VacacionesColaborador } from '../../contexts/LiquidacionesContext';

// Mock data
const vacacionesData: VacacionesColaborador[] = [
  {
    id: 'vac1',
    colaboradorId: 'col1',
    nombreCompleto: 'Juan Pérez García',
    cargo: 'Cosechero',
    fechaIngreso: '2024-01-15',
    salarioBasico: 1750905,
    diasCausados: 15,
    diasDisfrutados: 0,
    diasPendientes: 15,
    diasCompensados: 0,
    ultimoPeriodoInicio: '2024-01-15',
    ultimoPeriodoFin: '2025-01-14',
    diasHabilesLaborados: 312,
    estado: 'DISPONIBLE',
  },
  {
    id: 'vac2',
    colaboradorId: 'col2',
    nombreCompleto: 'María Rodríguez López',
    cargo: 'Podador',
    fechaIngreso: '2023-06-10',
    salarioBasico: 1750905,
    diasCausados: 30,
    diasDisfrutados: 15,
    diasPendientes: 15,
    diasCompensados: 0,
    ultimoPeriodoInicio: '2024-06-10',
    ultimoPeriodoFin: '2025-06-09',
    diasHabilesLaborados: 312,
    estado: 'PARCIAL',
  },
  {
    id: 'vac3',
    colaboradorId: 'col3',
    nombreCompleto: 'Carlos Sánchez Mejía',
    cargo: 'Operario Plateo',
    fechaIngreso: '2022-03-20',
    salarioBasico: 1850000,
    diasCausados: 45,
    diasDisfrutados: 30,
    diasPendientes: 15,
    diasCompensados: 0,
    ultimoPeriodoInicio: '2025-03-20',
    ultimoPeriodoFin: '2026-03-19',
    diasHabilesLaborados: 312,
    estado: 'PARCIAL',
  },
  {
    id: 'vac4',
    colaboradorId: 'col4',
    nombreCompleto: 'Ana Martínez Torres',
    cargo: 'Supervisor',
    fechaIngreso: '2021-08-01',
    salarioBasico: 2500000,
    diasCausados: 30,
    diasDisfrutados: 0,
    diasPendientes: 0,
    diasCompensados: 30,
    ultimoPeriodoInicio: '2024-08-01',
    ultimoPeriodoFin: '2025-07-31',
    diasHabilesLaborados: 312,
    valorCompensacion: 2500000,
    estado: 'COMPENSADO',
  },
  {
    id: 'vac5',
    colaboradorId: 'col5',
    nombreCompleto: 'Luis González Ramírez',
    cargo: 'Cosechero',
    fechaIngreso: '2025-09-15',
    salarioBasico: 1750905,
    diasCausados: 5,
    diasDisfrutados: 0,
    diasPendientes: 5,
    diasCompensados: 0,
    ultimoPeriodoInicio: '2025-09-15',
    ultimoPeriodoFin: '2026-05-03',
    diasHabilesLaborados: 156,
    estado: 'DISPONIBLE',
  },
];

export default function VacacionesTab() {
  const navigate = useNavigate();
  const { vacaciones, setVacaciones } = useLiquidaciones();
  const [filtros, setFiltros] = useState({
    nombre: '',
    cargo: '',
    estado: '',
  });

  // Cargar datos iniciales solo una vez
  useEffect(() => {
    if (vacaciones.length === 0) {
      setVacaciones(vacacionesData);
    }
  }, []);

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const vacacionesFiltradas = vacaciones.filter((vac) => {
    const cumpleFiltros =
      vac.nombreCompleto.toLowerCase().includes(filtros.nombre.toLowerCase()) &&
      vac.cargo.toLowerCase().includes(filtros.cargo.toLowerCase()) &&
      (filtros.estado === '' || vac.estado === filtros.estado);

    return cumpleFiltros;
  });

  const totalDiasCausados = vacaciones.reduce((sum, v) => sum + v.diasCausados, 0);
  const totalDiasPendientes = vacaciones.reduce((sum, v) => sum + v.diasPendientes, 0);
  const totalDiasDisfrutados = vacaciones.reduce((sum, v) => sum + v.diasDisfrutados, 0);
  const totalDiasCompensados = vacaciones.reduce((sum, v) => sum + v.diasCompensados, 0);

  const verDetalle = (vacacionId: string) => {
    navigate(`/liquidaciones/vacaciones/${vacacionId}`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(16);
    doc.text('Reporte de Vacaciones', 14, 20);

    // Fecha
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 14, 28);

    // Resumen
    doc.setFontSize(12);
    doc.text('Resumen General', 14, 38);
    doc.setFontSize(10);
    doc.text(`Total días causados: ${totalDiasCausados} días`, 14, 45);
    doc.text(`Días pendientes: ${totalDiasPendientes} días`, 14, 51);
    doc.text(`Días disfrutados: ${totalDiasDisfrutados} días`, 14, 57);
    doc.text(`Días compensados: ${totalDiasCompensados} días`, 14, 63);

    // Tabla
    autoTable(doc, {
      startY: 71,
      head: [['Colaborador', 'Cargo', 'Causados', 'Disfrutados', 'Compensados', 'Pendientes', 'Estado']],
      body: vacacionesFiltradas.map(v => [
        v.nombreCompleto,
        v.cargo,
        v.diasCausados,
        v.diasDisfrutados,
        v.diasCompensados,
        v.diasPendientes,
        v.estado,
      ]),
      headStyles: { fillColor: [30, 86, 49] },
    });

    doc.save(`vacaciones_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generado exitosamente');
  };

  const exportarExcel = () => {
    // Generar CSV
    const headers = ['Colaborador', 'Cargo', 'Fecha Ingreso', 'Salario Básico', 'Días Causados', 'Días Disfrutados', 'Días Compensados', 'Días Pendientes', 'Valor Compensación', 'Estado'];
    const rows = vacacionesFiltradas.map(v => [
      v.nombreCompleto,
      v.cargo,
      v.fechaIngreso,
      v.salarioBasico,
      v.diasCausados,
      v.diasDisfrutados,
      v.diasCompensados,
      v.diasPendientes,
      v.valorCompensacion || 0,
      v.estado,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vacaciones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Excel generado exitosamente');
  };

  const getEstadoBadge = (estado: VacacionesColaborador['estado']) => {
    switch (estado) {
      case 'DISPONIBLE':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30">Disponible</Badge>;
      case 'PARCIAL':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30">Parcial</Badge>;
      case 'COMPENSADO':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/30">Compensado</Badge>;
      case 'ACTUALIZADO':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Al día</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta días acumulados */}
      {totalDiasPendientes > 100 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-300">
                  Alerta: Acumulación de Vacaciones
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                  Hay {totalDiasPendientes} días de vacaciones pendientes en total. Se recomienda gestionar
                  las vacaciones acumuladas para evitar pasivos laborales elevados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs específicos de vacaciones */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Días Causados</p>
            <p className="text-2xl font-bold text-foreground">{totalDiasCausados}</p>
            <p className="text-xs text-muted-foreground mt-1">días hábiles</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">{totalDiasPendientes}</p>
            <p className="text-xs text-muted-foreground mt-1">por disfrutar/compensar</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Disfrutados</p>
            <p className="text-2xl font-bold text-success">{totalDiasDisfrutados}</p>
            <p className="text-xs text-muted-foreground mt-1">días usados</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Compensados</p>
            <p className="text-2xl font-bold text-primary">{totalDiasCompensados}</p>
            <p className="text-xs text-muted-foreground mt-1">en dinero</p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones y filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={filtros.nombre}
              onChange={(e) => handleFiltroChange('nombre', e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <Input
            placeholder="Filtrar por cargo..."
            value={filtros.cargo}
            onChange={(e) => handleFiltroChange('cargo', e.target.value)}
            className="h-9"
          />

          <select
            value={filtros.estado}
            onChange={(e) => handleFiltroChange('estado', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todos los estados</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="PARCIAL">Parcial</option>
            <option value="COMPENSADO">Compensado</option>
            <option value="ACTUALIZADO">Al día</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarExcel} className="gap-2">
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={exportarPDF} className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Tabla de vacaciones */}
      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Colaborador</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Cargo</th>
                  <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Causados</th>
                  <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Disfrutados</th>
                  <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Compensados</th>
                  <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Pendientes</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vacacionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No se encontraron registros con los filtros aplicados
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vacacionesFiltradas.map((vac, index) => (
                    <tr
                      key={vac.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{vac.nombreCompleto}</span>
                          <span className="text-xs text-muted-foreground">
                            Ingreso: {new Date(vac.fechaIngreso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{vac.cargo}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-foreground">{vac.diasCausados}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm text-blue-600">{vac.diasDisfrutados}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm text-green-600">{vac.diasCompensados}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-bold text-amber-600">{vac.diasPendientes}</span>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={
                            vac.estado === 'DISPONIBLE'
                              ? 'bg-success/10 text-success border-success/30'
                              : vac.estado === 'PARCIAL'
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                              : vac.estado === 'COMPENSADO'
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30'
                              : 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30'
                          }
                        >
                          {vac.estado}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verDetalle(vac.id)}
                            className="hover:bg-primary/10 hover:text-primary hover:border-primary gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalle
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Contador de resultados */}
          {vacacionesFiltradas.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-4 py-3 border-t border-border">
              <p>
                Mostrando <span className="font-medium text-foreground">{vacacionesFiltradas.length}</span> de{' '}
                <span className="font-medium text-foreground">{vacaciones.length}</span> registros
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}