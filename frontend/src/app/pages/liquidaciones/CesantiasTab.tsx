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
  SMMLV_2026,
} from '../../lib/liquidaciones/calculoUtils';
import { useLiquidaciones, CesantiaColaborador } from '../../contexts/LiquidacionesContext';

// Mock data
const cesantiasData: CesantiaColaborador[] = [
  {
    id: 'ces1',
    colaboradorId: 'col1',
    nombreCompleto: 'Juan Pérez García',
    cargo: 'Cosechero',
    fechaIngreso: '2024-01-15',
    salarioBasico: 1750905,
    auxilioTransporte: 249095,
    promedioPrestacional: 1850000,
    cesantiasAcumuladas: 1545833,
    periodoInicio: '2025-01-01',
    periodoFin: '2025-12-31',
    consignada: false,
    fondoCesantias: 'Porvenir',
  },
  {
    id: 'ces2',
    colaboradorId: 'col2',
    nombreCompleto: 'María Rodríguez López',
    cargo: 'Podador',
    fechaIngreso: '2023-06-10',
    salarioBasico: 1750905,
    auxilioTransporte: 249095,
    promedioPrestacional: 1820000,
    cesantiasAcumuladas: 1518333,
    periodoInicio: '2025-01-01',
    periodoFin: '2025-12-31',
    consignada: true,
    fechaConsignacion: '2026-02-10',
    fondoCesantias: 'Protección',
  },
  {
    id: 'ces3',
    colaboradorId: 'col3',
    nombreCompleto: 'Carlos Sánchez Mejía',
    cargo: 'Operario Plateo',
    fechaIngreso: '2022-03-20',
    salarioBasico: 1850000,
    auxilioTransporte: 249095,
    promedioPrestacional: 1950000,
    cesantiasAcumuladas: 1625000,
    periodoInicio: '2025-01-01',
    periodoFin: '2025-12-31',
    consignada: false,
    fondoCesantias: 'Colfondos',
  },
  {
    id: 'ces4',
    colaboradorId: 'col4',
    nombreCompleto: 'Ana Martínez Torres',
    cargo: 'Supervisor',
    fechaIngreso: '2021-08-01',
    salarioBasico: 2500000,
    auxilioTransporte: 0,
    promedioPrestacional: 2650000,
    cesantiasAcumuladas: 2208333,
    periodoInicio: '2025-01-01',
    periodoFin: '2025-12-31',
    consignada: true,
    fechaConsignacion: '2026-02-12',
    fondoCesantias: 'Porvenir',
  },
  {
    id: 'ces5',
    colaboradorId: 'col5',
    nombreCompleto: 'Luis González Ramírez',
    cargo: 'Cosechero',
    fechaIngreso: '2024-09-15',
    salarioBasico: 1750905,
    auxilioTransporte: 249095,
    promedioPrestacional: 1800000,
    cesantiasAcumuladas: 600000,
    periodoInicio: '2025-09-15',
    periodoFin: '2025-12-31',
    consignada: false,
    fondoCesantias: 'Skandia',
  },
];

export default function CesantiasTab() {
  const navigate = useNavigate();
  const { cesantias, setCesantias } = useLiquidaciones();
  const [filtros, setFiltros] = useState({
    nombre: '',
    cargo: '',
    estado: '',
  });

  // Cargar datos iniciales solo una vez
  useEffect(() => {
    if (cesantias.length === 0) {
      setCesantias(cesantiasData);
    }
  }, []);

  // Verificar si estamos cerca de la fecha límite (14 de febrero)
  const hoy = new Date();
  const fechaLimite = new Date(hoy.getFullYear(), 1, 14); // 14 de febrero
  const diasParaLimite = Math.ceil((fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  const mostrarAlerta = diasParaLimite <= 30 && diasParaLimite >= 0;

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const cesantiasFiltradas = cesantias.filter((cesantia) => {
    const cumpleFiltros =
      cesantia.nombreCompleto.toLowerCase().includes(filtros.nombre.toLowerCase()) &&
      cesantia.cargo.toLowerCase().includes(filtros.cargo.toLowerCase()) &&
      (filtros.estado === '' ||
        (filtros.estado === 'consignada' && cesantia.consignada) ||
        (filtros.estado === 'pendiente' && !cesantia.consignada));

    return cumpleFiltros;
  });

  const totalCesantias = cesantias.reduce((sum, c) => sum + c.cesantiasAcumuladas, 0);
  const totalConsignadas = cesantias.filter(c => c.consignada).length;
  const totalPendientes = cesantias.filter(c => !c.consignada).length;
  const montoPendiente = cesantias.filter(c => !c.consignada).reduce((sum, c) => sum + c.cesantiasAcumuladas, 0);

  const verDetalle = (cesantiaId: string) => {
    navigate(`/liquidaciones/cesantias/${cesantiaId}`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(16);
    doc.text('Reporte de Cesantías', 14, 20);

    // Fecha
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 14, 28);

    // Resumen
    doc.setFontSize(12);
    doc.text('Resumen General', 14, 38);
    doc.setFontSize(10);
    doc.text(`Total cesantías: ${formatearMoneda(totalCesantias)}`, 14, 45);
    doc.text(`Consignadas: ${totalConsignadas} colaboradores`, 14, 51);
    doc.text(`Pendientes: ${totalPendientes} colaboradores - ${formatearMoneda(montoPendiente)}`, 14, 57);

    // Tabla
    autoTable(doc, {
      startY: 65,
      head: [['Colaborador', 'Cargo', 'Monto', 'Estado', 'Fondo']],
      body: cesantiasFiltradas.map(c => [
        c.nombreCompleto,
        c.cargo,
        formatearMoneda(c.cesantiasAcumuladas),
        c.consignada ? 'Consignada' : 'Pendiente',
        c.fondoCesantias,
      ]),
      headStyles: { fillColor: [30, 86, 49] },
    });

    doc.save(`cesantias_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generado exitosamente');
  };

  const exportarExcel = () => {
    // Generar CSV (simple para este ejemplo)
    const headers = ['Colaborador', 'Cargo', 'Fecha Ingreso', 'Salario Básico', 'Aux. Transporte', 'Promedio Prestacional', 'Cesantías', 'Estado', 'Fondo'];
    const rows = cesantiasFiltradas.map(c => [
      c.nombreCompleto,
      c.cargo,
      c.fechaIngreso,
      c.salarioBasico,
      c.auxilioTransporte,
      c.promedioPrestacional,
      c.cesantiasAcumuladas,
      c.consignada ? 'Consignada' : 'Pendiente',
      c.fondoCesantias,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cesantias_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Excel generado exitosamente');
  };

  return (
    <div className="space-y-6">
      {/* Alerta sanción moratoria */}
      {mostrarAlerta && totalPendientes > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-300">
                  Alerta: Sanción Moratoria
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                  Quedan {diasParaLimite} días para el 14 de febrero. Las cesantías deben consignarse antes de esta fecha
                  para evitar la sanción moratoria de un día de salario por cada día de retraso (Art. 99 CST).
                  Tienes {totalPendientes} cesantías pendientes por {formatearMoneda(montoPendiente)}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs específicos de cesantías */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Cesantías</p>
            <p className="text-2xl font-bold text-foreground">{formatearMoneda(totalCesantias)}</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Consignadas</p>
            <p className="text-2xl font-bold text-success">{totalConsignadas}</p>
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
            <option value="consignada">Consignadas</option>
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

      {/* Tabla de cesantías */}
      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Colaborador</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Cargo</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Fecha Ingreso</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Salario Base</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Promedio Prest.</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Cesantías</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cesantiasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No se encontraron cesantías con los filtros aplicados
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cesantiasFiltradas.map((cesantia, index) => (
                    <tr
                      key={cesantia.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{cesantia.nombreCompleto}</span>
                          <span className="text-xs text-muted-foreground">{cesantia.fondoCesantias}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{cesantia.cargo}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">
                          {new Date(cesantia.fechaIngreso).toLocaleDateString('es-CO')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-medium text-foreground">
                          {formatearMoneda(cesantia.salarioBasico)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-medium text-foreground">
                          {formatearMoneda(cesantia.promedioPrestacional)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-bold text-primary">
                          {formatearMoneda(cesantia.cesantiasAcumuladas)}
                        </span>
                      </td>
                      <td className="p-4">
                        {cesantia.consignada ? (
                          <div className="flex flex-col">
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30 w-fit">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Consignada
                            </Badge>
                            {cesantia.fechaConsignacion && (
                              <span className="text-xs text-muted-foreground mt-1">
                                {new Date(cesantia.fechaConsignacion).toLocaleDateString('es-CO')}
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
                            onClick={() => verDetalle(cesantia.id)}
                            className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                            title="Ver detalle y liquidar"
                          >
                            <Eye className="h-4 w-4 mr-1" />
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
          {cesantiasFiltradas.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-4 py-3 border-t border-border">
              <p>
                Mostrando <span className="font-medium text-foreground">{cesantiasFiltradas.length}</span> de{' '}
                <span className="font-medium text-foreground">{cesantias.length}</span> cesantías
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
