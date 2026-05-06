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
import { useLiquidaciones, PrimaColaborador } from '../../contexts/LiquidacionesContext';

// Mock data
const primaData: PrimaColaborador[] = [
  {
    id: 'prima1',
    colaboradorId: 'col1',
    nombreCompleto: 'Juan Pérez García',
    cargo: 'Cosechero',
    fechaIngreso: '2024-01-15',
    salarioBasico: 1750905,
    auxilioTransporte: 249095,
    promedioPrestacional: 1850000,
    primaCalculada: 925000,
    semestre: 'PRIMER_SEMESTRE',
    periodoInicio: '2026-01-01',
    periodoFin: '2026-06-30',
    diasTrabajados: 180,
    pagada: false,
  },
  {
    id: 'prima2',
    colaboradorId: 'col2',
    nombreCompleto: 'María Rodríguez López',
    cargo: 'Podador',
    fechaIngreso: '2023-06-10',
    salarioBasico: 1750905,
    auxilioTransporte: 249095,
    promedioPrestacional: 1820000,
    primaCalculada: 910000,
    semestre: 'PRIMER_SEMESTRE',
    periodoInicio: '2026-01-01',
    periodoFin: '2026-06-30',
    diasTrabajados: 180,
    pagada: true,
    fechaPago: '2026-06-28',
  },
  {
    id: 'prima3',
    colaboradorId: 'col3',
    nombreCompleto: 'Carlos Sánchez Mejía',
    cargo: 'Operario Plateo',
    fechaIngreso: '2022-03-20',
    salarioBasico: 1850000,
    auxilioTransporte: 249095,
    promedioPrestacional: 1950000,
    primaCalculada: 975000,
    semestre: 'PRIMER_SEMESTRE',
    periodoInicio: '2026-01-01',
    periodoFin: '2026-06-30',
    diasTrabajados: 180,
    pagada: false,
  },
  {
    id: 'prima4',
    colaboradorId: 'col4',
    nombreCompleto: 'Ana Martínez Torres',
    cargo: 'Supervisor',
    fechaIngreso: '2021-08-01',
    salarioBasico: 2500000,
    auxilioTransporte: 0,
    promedioPrestacional: 2650000,
    primaCalculada: 1325000,
    semestre: 'SEGUNDO_SEMESTRE',
    periodoInicio: '2026-07-01',
    periodoFin: '2026-12-31',
    diasTrabajados: 180,
    pagada: true,
    fechaPago: '2026-12-18',
  },
  {
    id: 'prima5',
    colaboradorId: 'col5',
    nombreCompleto: 'Luis González Ramírez',
    cargo: 'Cosechero',
    fechaIngreso: '2026-03-15',
    salarioBasico: 1750905,
    auxilioTransporte: 249095,
    promedioPrestacional: 1800000,
    primaCalculada: 500000,
    semestre: 'PRIMER_SEMESTRE',
    periodoInicio: '2026-03-15',
    periodoFin: '2026-06-30',
    diasTrabajados: 100,
    pagada: false,
  },
];

export default function PrimaTab() {
  const navigate = useNavigate();
  const { primas, setPrimas } = useLiquidaciones();
  const [filtros, setFiltros] = useState({
    nombre: '',
    cargo: '',
    semestre: '',
    estado: '',
  });

  // Cargar datos iniciales solo una vez
  useEffect(() => {
    if (primas.length === 0) {
      setPrimas(primaData);
    }
  }, []);

  // Verificar si estamos cerca de las fechas límite
  const hoy = new Date();
  const fechaLimitePrimerSemestre = new Date(hoy.getFullYear(), 5, 30); // 30 de junio
  const fechaLimiteSegundoSemestre = new Date(hoy.getFullYear(), 11, 20); // 20 de diciembre

  const diasParaPrimerSemestre = Math.ceil((fechaLimitePrimerSemestre.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  const diasParaSegundoSemestre = Math.ceil((fechaLimiteSegundoSemestre.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  const mostrarAlertaPrimerSemestre = diasParaPrimerSemestre <= 30 && diasParaPrimerSemestre >= 0;
  const mostrarAlertaSegundoSemestre = diasParaSegundoSemestre <= 30 && diasParaSegundoSemestre >= 0;

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const primasFiltradas = primas.filter((prima) => {
    const cumpleFiltros =
      prima.nombreCompleto.toLowerCase().includes(filtros.nombre.toLowerCase()) &&
      prima.cargo.toLowerCase().includes(filtros.cargo.toLowerCase()) &&
      (filtros.semestre === '' || prima.semestre === filtros.semestre) &&
      (filtros.estado === '' ||
        (filtros.estado === 'pagada' && prima.pagada) ||
        (filtros.estado === 'pendiente' && !prima.pagada));

    return cumpleFiltros;
  });

  const totalPrimas = primas.reduce((sum, p) => sum + p.primaCalculada, 0);
  const totalPagadas = primas.filter(p => p.pagada).length;
  const totalPendientes = primas.filter(p => !p.pagada).length;
  const montoPendiente = primas.filter(p => !p.pagada).reduce((sum, p) => sum + p.primaCalculada, 0);
  const primasPrimerSemestre = primas.filter(p => p.semestre === 'PRIMER_SEMESTRE' && !p.pagada).length;
  const primaSSegundoSemestre = primas.filter(p => p.semestre === 'SEGUNDO_SEMESTRE' && !p.pagada).length;

  const verDetalle = (primaId: string) => {
    navigate(`/liquidaciones/prima/${primaId}`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(16);
    doc.text('Reporte de Prima de Servicios', 14, 20);

    // Fecha
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 14, 28);

    // Resumen
    doc.setFontSize(12);
    doc.text('Resumen General', 14, 38);
    doc.setFontSize(10);
    doc.text(`Total primas: ${formatearMoneda(totalPrimas)}`, 14, 45);
    doc.text(`Pagadas: ${totalPagadas} colaboradores`, 14, 51);
    doc.text(`Pendientes: ${totalPendientes} colaboradores - ${formatearMoneda(montoPendiente)}`, 14, 57);

    // Tabla
    autoTable(doc, {
      startY: 65,
      head: [['Colaborador', 'Cargo', 'Semestre', 'Días', 'Monto', 'Estado']],
      body: primasFiltradas.map(p => [
        p.nombreCompleto,
        p.cargo,
        p.semestre === 'PRIMER_SEMESTRE' ? '1er Semestre' : '2do Semestre',
        p.diasTrabajados,
        formatearMoneda(p.primaCalculada),
        p.pagada ? 'Pagada' : 'Pendiente',
      ]),
      headStyles: { fillColor: [30, 86, 49] },
    });

    doc.save(`prima_servicios_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generado exitosamente');
  };

  const exportarExcel = () => {
    // Generar CSV
    const headers = ['Colaborador', 'Cargo', 'Fecha Ingreso', 'Semestre', 'Salario Básico', 'Aux. Transporte', 'Promedio Prestacional', 'Días Trabajados', 'Prima', 'Estado'];
    const rows = primasFiltradas.map(p => [
      p.nombreCompleto,
      p.cargo,
      p.fechaIngreso,
      p.semestre === 'PRIMER_SEMESTRE' ? '1er Semestre' : '2do Semestre',
      p.salarioBasico,
      p.auxilioTransporte,
      p.promedioPrestacional,
      p.diasTrabajados,
      p.primaCalculada,
      p.pagada ? 'Pagada' : 'Pendiente',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prima_servicios_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Excel generado exitosamente');
  };

  return (
    <div className="space-y-6">
      {/* Alertas fechas límite */}
      {mostrarAlertaPrimerSemestre && primasPrimerSemestre > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-300">
                  Alerta: Prima Primer Semestre
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                  Quedan {diasParaPrimerSemestre} días para el 30 de junio. La prima del primer semestre debe pagarse
                  antes de esta fecha (Art. 306 CST). Tienes {primasPrimerSemestre} primas pendientes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {mostrarAlertaSegundoSemestre && primaSSegundoSemestre > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-300">
                  Alerta: Prima Segundo Semestre
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                  Quedan {diasParaSegundoSemestre} días para el 20 de diciembre. La prima del segundo semestre debe pagarse
                  antes de esta fecha (Art. 306 CST). Tienes {primaSSegundoSemestre} primas pendientes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs específicos de prima */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Primas</p>
            <p className="text-2xl font-bold text-foreground">{formatearMoneda(totalPrimas)}</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Pagadas</p>
            <p className="text-2xl font-bold text-success">{totalPagadas}</p>
            <p className="text-xs text-muted-foreground mt-1">colaboradores</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">{totalPendientes}</p>
            <p className="text-xs text-muted-foreground mt-1">colaboradores</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Monto Pendiente</p>
            <p className="text-2xl font-bold text-foreground">{formatearMoneda(montoPendiente)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones y filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-4 w-full sm:w-auto">
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
            value={filtros.semestre}
            onChange={(e) => handleFiltroChange('semestre', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todos los semestres</option>
            <option value="PRIMER_SEMESTRE">1er Semestre</option>
            <option value="SEGUNDO_SEMESTRE">2do Semestre</option>
          </select>

          <select
            value={filtros.estado}
            onChange={(e) => handleFiltroChange('estado', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="pagada">Pagadas</option>
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

      {/* Tabla de primas */}
      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Colaborador</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Cargo</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Semestre</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Período</th>
                  <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Días</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Prima</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {primasFiltradas.length === 0 ? (
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
                  primasFiltradas.map((prima, index) => (
                    <tr
                      key={prima.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{prima.nombreCompleto}</span>
                          <span className="text-xs text-muted-foreground">
                            Ingreso: {new Date(prima.fechaIngreso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{prima.cargo}</span>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={prima.semestre === 'PRIMER_SEMESTRE' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30' : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/30'}>
                          {prima.semestre === 'PRIMER_SEMESTRE' ? '1er Semestre' : '2do Semestre'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span>{new Date(prima.periodoInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                          <span>{new Date(prima.periodoFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {prima.diasTrabajados}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-bold text-primary">
                          {formatearMoneda(prima.primaCalculada)}
                        </span>
                      </td>
                      <td className="p-4">
                        {prima.pagada ? (
                          <div className="flex flex-col">
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30 w-fit">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Pagada
                            </Badge>
                            {prima.fechaPago && (
                              <span className="text-xs text-muted-foreground mt-1">
                                {new Date(prima.fechaPago).toLocaleDateString('es-CO')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                            Pendiente
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verDetalle(prima.id)}
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
          {primasFiltradas.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-4 py-3 border-t border-border">
              <p>
                Mostrando <span className="font-medium text-foreground">{primasFiltradas.length}</span> de{' '}
                <span className="font-medium text-foreground">{primas.length}</span> registros
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
