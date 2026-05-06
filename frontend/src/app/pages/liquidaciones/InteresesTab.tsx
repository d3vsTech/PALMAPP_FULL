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
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  formatearMoneda,
  TASA_INTERESES_CESANTIAS,
} from '../../lib/liquidaciones/calculoUtils';
import { useLiquidaciones, InteresesColaborador } from '../../contexts/LiquidacionesContext';

// Mock data
const interesesData: InteresesColaborador[] = [
  {
    id: 'int1',
    colaboradorId: 'col1',
    nombreCompleto: 'Juan Pérez García',
    cargo: 'Cosechero',
    fechaIngreso: '2024-01-15',
    saldoCesantias31Dic: 1545833,
    interesesCalculados: 185500,
    periodoInicio: '2025-01-01',
    periodoFin: '2025-12-31',
    pagado: false,
    fondoCesantias: 'Porvenir',
  },
  {
    id: 'int2',
    colaboradorId: 'col2',
    nombreCompleto: 'María Rodríguez López',
    cargo: 'Podador',
    fechaIngreso: '2023-06-10',
    saldoCesantias31Dic: 1518333,
    interesesCalculados: 182200,
    periodoInicio: '2025-01-01',
    periodoFin: '2025-12-31',
    pagado: true,
    fechaPago: '2026-01-28',
    fondoCesantias: 'Protección',
  },
  {
    id: 'int3',
    colaboradorId: 'col3',
    nombreCompleto: 'Carlos Sánchez Mejía',
    cargo: 'Operario Plateo',
    fechaIngreso: '2022-03-20',
    saldoCesantias31Dic: 1625000,
    interesesCalculados: 195000,
    periodoInicio: '2025-01-01',
    periodoFin: '2025-12-31',
    pagado: false,
    fondoCesantias: 'Colfondos',
  },
  {
    id: 'int4',
    colaboradorId: 'col4',
    nombreCompleto: 'Ana Martínez Torres',
    cargo: 'Supervisor',
    fechaIngreso: '2021-08-01',
    saldoCesantias31Dic: 2208333,
    interesesCalculados: 265000,
    periodoInicio: '2025-01-01',
    periodoFin: '2025-12-31',
    pagado: true,
    fechaPago: '2026-01-29',
    fondoCesantias: 'Porvenir',
  },
  {
    id: 'int5',
    colaboradorId: 'col5',
    nombreCompleto: 'Luis González Ramírez',
    cargo: 'Cosechero',
    fechaIngreso: '2024-09-15',
    saldoCesantias31Dic: 600000,
    interesesCalculados: 72000,
    periodoInicio: '2025-01-01',
    periodoFin: '2025-12-31',
    pagado: false,
    fondoCesantias: 'Skandia',
  },
];

export default function InteresesTab() {
  const navigate = useNavigate();
  const { intereses, setIntereses } = useLiquidaciones();
  const [filtros, setFiltros] = useState({
    nombre: '',
    cargo: '',
    estado: '',
  });

  // Cargar datos iniciales solo una vez
  useEffect(() => {
    if (intereses.length === 0) {
      setIntereses(interesesData);
    }
  }, []);

  // Verificar si estamos cerca de la fecha límite (31 de enero)
  const hoy = new Date();
  const fechaLimite = new Date(hoy.getFullYear(), 0, 31); // 31 de enero
  const diasParaLimite = Math.ceil((fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  const mostrarAlerta = diasParaLimite <= 30 && diasParaLimite >= 0;

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const interesesFiltrados = intereses.filter((interes) => {
    const cumpleFiltros =
      interes.nombreCompleto.toLowerCase().includes(filtros.nombre.toLowerCase()) &&
      interes.cargo.toLowerCase().includes(filtros.cargo.toLowerCase()) &&
      (filtros.estado === '' ||
        (filtros.estado === 'pagado' && interes.pagado) ||
        (filtros.estado === 'pendiente' && !interes.pagado));

    return cumpleFiltros;
  });

  const totalIntereses = intereses.reduce((sum, i) => sum + i.interesesCalculados, 0);
  const totalPagados = intereses.filter(i => i.pagado).length;
  const totalPendientes = intereses.filter(i => !i.pagado).length;
  const montoPendiente = intereses.filter(i => !i.pagado).reduce((sum, i) => sum + i.interesesCalculados, 0);

  const verDetalle = (interesId: string) => {
    navigate(`/liquidaciones/intereses/${interesId}`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(16);
    doc.text('Reporte de Intereses sobre Cesantías', 14, 20);

    // Fecha
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 14, 28);

    // Resumen
    doc.setFontSize(12);
    doc.text('Resumen General', 14, 38);
    doc.setFontSize(10);
    doc.text(`Total intereses: ${formatearMoneda(totalIntereses)}`, 14, 45);
    doc.text(`Pagados: ${totalPagados} colaboradores`, 14, 51);
    doc.text(`Pendientes: ${totalPendientes} colaboradores - ${formatearMoneda(montoPendiente)}`, 14, 57);
    doc.text(`Tasa de interés: ${TASA_INTERESES_CESANTIAS * 100}% anual`, 14, 63);

    // Tabla
    autoTable(doc, {
      startY: 71,
      head: [['Colaborador', 'Cargo', 'Saldo Cesantías', 'Intereses', 'Estado']],
      body: interesesFiltrados.map(i => [
        i.nombreCompleto,
        i.cargo,
        formatearMoneda(i.saldoCesantias31Dic),
        formatearMoneda(i.interesesCalculados),
        i.pagado ? 'Pagado' : 'Pendiente',
      ]),
      headStyles: { fillColor: [30, 86, 49] },
    });

    doc.save(`intereses_cesantias_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generado exitosamente');
  };

  const exportarExcel = () => {
    // Generar CSV
    const headers = ['Colaborador', 'Cargo', 'Fecha Ingreso', 'Saldo Cesantías 31/Dic', 'Intereses 12%', 'Estado', 'Fondo'];
    const rows = interesesFiltrados.map(i => [
      i.nombreCompleto,
      i.cargo,
      i.fechaIngreso,
      i.saldoCesantias31Dic,
      i.interesesCalculados,
      i.pagado ? 'Pagado' : 'Pendiente',
      i.fondoCesantias,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intereses_cesantias_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Excel generado exitosamente');
  };

  return (
    <div className="space-y-6">
      {/* Alerta fecha límite */}
      {mostrarAlerta && totalPendientes > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-300">
                  Alerta: Vencimiento Intereses sobre Cesantías
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                  Quedan {diasParaLimite} días para el 31 de enero. Los intereses sobre cesantías deben pagarse
                  directamente al trabajador antes de esta fecha (Ley 52 de 1975, Art. 1).
                  Tienes {totalPendientes} pagos pendientes por {formatearMoneda(montoPendiente)}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs específicos de intereses */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Intereses</p>
            <p className="text-2xl font-bold text-foreground">{formatearMoneda(totalIntereses)}</p>
            <div className="inline-flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Tasa: {TASA_INTERESES_CESANTIAS * 100}% anual</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Pagados</p>
            <p className="text-2xl font-bold text-success">{totalPagados}</p>
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
            <option value="pendiente">Pendientes</option>
            <option value="pagado">Pagados</option>
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

      {/* Tabla de intereses */}
      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Colaborador</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Cargo</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Fecha Ingreso</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Saldo Cesantías 31/Dic</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Intereses 12%</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {interesesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No se encontraron registros con los filtros aplicados
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  interesesFiltrados.map((interes, index) => (
                    <tr
                      key={interes.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{interes.nombreCompleto}</span>
                          <span className="text-xs text-muted-foreground">{interes.fondoCesantias}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{interes.cargo}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">
                          {new Date(interes.fechaIngreso).toLocaleDateString('es-CO')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-medium text-foreground">
                          {formatearMoneda(interes.saldoCesantias31Dic)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-bold text-primary">
                          {formatearMoneda(interes.interesesCalculados)}
                        </span>
                      </td>
                      <td className="p-4">
                        {interes.pagado ? (
                          <div className="flex flex-col">
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30 w-fit">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Pagado
                            </Badge>
                            {interes.fechaPago && (
                              <span className="text-xs text-muted-foreground mt-1">
                                {new Date(interes.fechaPago).toLocaleDateString('es-CO')}
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
                            onClick={() => verDetalle(interes.id)}
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
          {interesesFiltrados.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-4 py-3 border-t border-border">
              <p>
                Mostrando <span className="font-medium text-foreground">{interesesFiltrados.length}</span> de{' '}
                <span className="font-medium text-foreground">{intereses.length}</span> registros
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
