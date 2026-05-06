// VER LIQUIDACIÓN - Solo lectura v1.0
// Muestra cómo fue liquidado un colaborador sin permitir edición
// Estructura según formato actual de la finca:
// - BASE/SUELDO BÁSICO + EXTRAS + INCAPACIDADES = TOTAL BRUTO
// - SUBSIDIO TRANSPORTE (suma aparte)
// - DEDUCCIONES: Salud (4%), Pensión (4%), Adelantos, Ahorro
// - BONIFICACIÓN (suma al final)
// - TOTAL NETO = Total Bruto + Subsidio + Bonificación - Deducciones
import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import {
  ArrowLeft,
  Calculator,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Package,
  Check,
  Save,
} from 'lucide-react';
import { nominaPeriodos, colaboradores } from '../../lib/mockData';

// Datos de ejemplo para el resumen de trabajo diario
const resumenTrabajoDiario: Record<string, Array<{
  fecha: string;
  lote: string;
  sublote: string;
  cosecha: string;
  cuadrilla: string;
  diasTrabajados: number;
  racimos: number;
  peso: number;
  promedio: number;
  precioKg: number;
  total: number;
  jornal: number;
}>> = {
  c1: [
    { fecha: '2026-04-01', lote: 'TARRO', sublote: 'TA-01', cosecha: 'C-2026-001', cuadrilla: 'Cuadrilla A', diasTrabajados: 1, racimos: 45, peso: 675, promedio: 15.0, precioKg: 45, total: 30375, jornal: 85000 },
    { fecha: '2026-04-02', lote: 'PISCINAS', sublote: 'PS-02', cosecha: 'C-2026-002', cuadrilla: 'Cuadrilla A', diasTrabajados: 1, racimos: 48, peso: 720, promedio: 15.0, precioKg: 45, total: 32400, jornal: 88000 },
    { fecha: '2026-04-03', lote: 'PISCINAS', sublote: 'PS-03', cosecha: 'C-2026-003', cuadrilla: 'Individual', diasTrabajados: 1, racimos: 42, peso: 630, promedio: 15.0, precioKg: 42, total: 26460, jornal: 82000 },
    { fecha: '2026-04-04', lote: 'ESCUELA', sublote: 'ES-01', cosecha: 'C-2026-004', cuadrilla: 'Cuadrilla B', diasTrabajados: 1, racimos: 50, peso: 750, promedio: 15.0, precioKg: 42, total: 31500, jornal: 90000 },
    { fecha: '2026-04-05', lote: 'ESCUELA', sublote: 'ES-02', cosecha: 'C-2026-005', cuadrilla: 'Cuadrilla B', diasTrabajados: 1, racimos: 46, peso: 690, promedio: 15.0, precioKg: 42, total: 28980, jornal: 86000 },
    { fecha: '2026-04-08', lote: 'CASIRO', sublote: 'CA-01', cosecha: 'C-2026-006', cuadrilla: 'Individual', diasTrabajados: 1, racimos: 44, peso: 660, promedio: 15.0, precioKg: 42, total: 27720, jornal: 84000 },
    { fecha: '2026-04-09', lote: 'CASIRO', sublote: 'CA-02', cosecha: 'C-2026-007', cuadrilla: 'Cuadrilla A', diasTrabajados: 1, racimos: 47, peso: 705, promedio: 15.0, precioKg: 42, total: 29610, jornal: 87000 },
    { fecha: '2026-04-10', lote: 'SEMBRIO A', sublote: 'SA-01', cosecha: 'C-2026-008', cuadrilla: 'Cuadrilla C', diasTrabajados: 1, racimos: 49, peso: 735, promedio: 15.0, precioKg: 42, total: 30870, jornal: 89000 },
    { fecha: '2026-04-11', lote: 'SEMBRIO A', sublote: 'SA-02', cosecha: 'C-2026-009', cuadrilla: 'Cuadrilla C', diasTrabajados: 1, racimos: 43, peso: 645, promedio: 15.0, precioKg: 42, total: 27090, jornal: 83000 },
    { fecha: '2026-04-12', lote: 'TARRO', sublote: 'TA-02', cosecha: 'C-2026-010', cuadrilla: 'Individual', diasTrabajados: 1, racimos: 51, peso: 765, promedio: 15.0, precioKg: 42, total: 32130, jornal: 91000 },
  ],
  c2: [],
  c3: [
    { fecha: '2026-04-01', lote: 'PISCINAS', sublote: 'PS-01', cosecha: 'C-2026-001', cuadrilla: 'Cuadrilla B', diasTrabajados: 1, racimos: 40, peso: 600, promedio: 15.0, precioKg: 45, total: 27000, jornal: 80000 },
    { fecha: '2026-04-02', lote: 'PISCINAS', sublote: 'PS-04', cosecha: 'C-2026-002', cuadrilla: 'Individual', diasTrabajados: 1, racimos: 42, peso: 630, promedio: 15.0, precioKg: 45, total: 28350, jornal: 82000 },
    { fecha: '2026-04-03', lote: 'ESCUELA', sublote: 'ES-03', cosecha: 'C-2026-003', cuadrilla: 'Cuadrilla A', diasTrabajados: 1, racimos: 38, peso: 570, promedio: 15.0, precioKg: 42, total: 23940, jornal: 78000 },
    { fecha: '2026-04-04', lote: 'ESCUELA', sublote: 'ES-01', cosecha: 'C-2026-004', cuadrilla: 'Cuadrilla A', diasTrabajados: 1, racimos: 45, peso: 675, promedio: 15.0, precioKg: 42, total: 28350, jornal: 85000 },
    { fecha: '2026-04-05', lote: 'CASIRO', sublote: 'CA-03', cosecha: 'C-2026-005', cuadrilla: 'Individual', diasTrabajados: 1, racimos: 41, peso: 615, promedio: 15.0, precioKg: 42, total: 25830, jornal: 81000 },
    { fecha: '2026-04-08', lote: 'CASIRO', sublote: 'CA-01', cosecha: 'C-2026-006', cuadrilla: 'Cuadrilla B', diasTrabajados: 1, racimos: 39, peso: 585, promedio: 15.0, precioKg: 42, total: 24570, jornal: 79000 },
    { fecha: '2026-04-09', lote: 'SEMBRIO A', sublote: 'SA-03', cosecha: 'C-2026-007', cuadrilla: 'Cuadrilla C', diasTrabajados: 1, racimos: 43, peso: 645, promedio: 15.0, precioKg: 42, total: 27090, jornal: 83000 },
    { fecha: '2026-04-10', lote: 'SEMBRIO A', sublote: 'SA-01', cosecha: 'C-2026-008', cuadrilla: 'Cuadrilla C', diasTrabajados: 1, racimos: 44, peso: 660, promedio: 15.0, precioKg: 42, total: 27720, jornal: 84000 },
  ],
};

const nominaDetalles = [
  {
    colaboradorId: 'c1',
    tipoSalario: 'VARIABLE',
    salarioBase: 1300000,
  },
  {
    colaboradorId: 'c2',
    tipoSalario: 'FIJO',
    salarioBase: 1500000,
  },
  {
    colaboradorId: 'c3',
    tipoSalario: 'VARIABLE',
    salarioBase: 1400000,
  },
];

export default function VerLiquidacion() {
  const { nominaId, colaboradorId } = useParams();
  const navigate = useNavigate();

  const periodo = nominaPeriodos.find((p) => p.id === nominaId);
  const colaborador = colaboradores.find((c) => c.id === colaboradorId);
  const detalle = nominaDetalles.find((d) => d.colaboradorId === colaboradorId);

  // Datos mockeados de liquidación (en producción vendrían de la API)
  const incapacidades = 0;
  const bonificaciones = colaboradorId === 'c2' ? 58364 : 0;
  const ahorro = colaboradorId === 'c1' ? 20000 : 0;
  const prestamos = colaboradorId === 'c1' ? [{ concepto: 'Adelanto quincena', valor: 50000 }] : [];

  if (!periodo || !colaborador || !detalle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No encontrado</h1>
          <p className="text-muted-foreground mb-4">
            No se encontró la información de liquidación
          </p>
          <Button onClick={() => navigate('/nomina')}>Volver a Nómina</Button>
        </div>
      </div>
    );
  }

  const diasTrabajados = resumenTrabajoDiario[colaboradorId as keyof typeof resumenTrabajoDiario] || [];

  const totalJornales = diasTrabajados.reduce((sum, dia) => sum + dia.jornal, 0);
  const totalRacimos = diasTrabajados.reduce((sum, dia) => sum + dia.racimos, 0);
  const totalPeso = diasTrabajados.reduce((sum, dia) => sum + dia.peso, 0);
  const totalCosecha = diasTrabajados.reduce((sum, dia) => sum + dia.total, 0);
  const totalDias = diasTrabajados.length;

  // Cálculos de liquidación según formato real
  const salarioBase = detalle.tipoSalario === 'VARIABLE' ? totalJornales : (detalle.salarioBase || 0);
  const totalBruto = salarioBase + incapacidades;
  const auxTransporte = 162000;

  // Base de cotización para calcular deducciones (Total Bruto)
  const baseCotizacion = totalBruto;

  // Deducciones legales (se calculan sobre Total Bruto)
  const salud = Math.round(baseCotizacion * 0.04);
  const pension = Math.round(baseCotizacion * 0.04);

  // Total de préstamos/adelantos
  const totalPrestamos = prestamos.reduce((sum, p) => sum + (Number(p.valor) || 0), 0);

  // Cálculo final
  const totalDeducciones = salud + pension + totalPrestamos + ahorro;
  const netoAPagar = totalBruto + auxTransporte + bonificaciones - totalDeducciones;

  const volverANomina = () => {
    navigate(`/nomina/${nominaId}`);
  };

  const getIniciales = (nombre: string) => {
    const partes = nombre.split(' ');
    return partes.length > 1
      ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
      : nombre.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/nomina">Nómina</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/nomina/${nominaId}`}>{periodo.periodo}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Liquidar Colaborador</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/nomina/${nominaId}`)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
            <span className="text-xl font-bold text-primary">
              {getIniciales(`${colaborador.nombres} ${colaborador.apellidos}`)}
            </span>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              {colaborador.nombres} {colaborador.apellidos}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline">{detalle.tipoSalario}</Badge>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{periodo.periodo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de Trabajo Diario - Solo para VARIABLE */}
      {detalle.tipoSalario === 'VARIABLE' && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Resumen de Trabajo - Planilla Diaria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diasTrabajados.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                        Fecha
                      </th>
                      <th className="text-left p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                        Lote
                      </th>
                      <th className="text-left p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                        Sublote
                      </th>
                      <th className="text-left p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                        Cosecha
                      </th>
                      <th className="text-left p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                        Cuadrilla
                      </th>
                      <th className="text-center p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                        Días
                      </th>
                      <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                        Racimos
                      </th>
                      <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                        Peso (kg)
                      </th>
                      <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                        Prom.
                      </th>
                      <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                        Precio/kg
                      </th>
                      <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                        Total Cosecha
                      </th>
                      <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap bg-green-50">
                        Jornal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {diasTrabajados.map((dia, index) => (
                      <tr
                        key={index}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                        }`}
                      >
                        <td className="p-2 text-xs whitespace-nowrap">
                          {new Date(dia.fecha).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </td>
                        <td className="p-2 text-xs font-medium whitespace-nowrap">{dia.lote}</td>
                        <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{dia.sublote}</td>
                        <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{dia.cosecha}</td>
                        <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{dia.cuadrilla}</td>
                        <td className="p-2 text-xs text-center whitespace-nowrap">{dia.diasTrabajados}</td>
                        <td className="p-2 text-xs text-right font-medium whitespace-nowrap">{dia.racimos}</td>
                        <td className="p-2 text-xs text-right font-medium whitespace-nowrap">{dia.peso}</td>
                        <td className="p-2 text-xs text-right whitespace-nowrap">{dia.promedio.toFixed(1)}</td>
                        <td className="p-2 text-xs text-right whitespace-nowrap">${dia.precioKg}</td>
                        <td className="p-2 text-xs text-right font-semibold text-amber-600 whitespace-nowrap">
                          ${dia.total.toLocaleString('es-CO')}
                        </td>
                        <td className="p-2 text-xs text-right font-bold text-success bg-green-50 whitespace-nowrap">
                          ${dia.jornal.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary bg-primary/5">
                      <td className="p-2 text-xs font-bold" colSpan={6}>TOTALES</td>
                      <td className="p-2 text-xs text-right font-bold">{totalRacimos}</td>
                      <td className="p-2 text-xs text-right font-bold">{totalPeso}</td>
                      <td className="p-2 text-xs"></td>
                      <td className="p-2 text-xs"></td>
                      <td className="p-2 text-xs text-right font-bold text-amber-600">
                        ${totalCosecha.toLocaleString('es-CO')}
                      </td>
                      <td className="p-2 text-xs text-right font-bold text-success bg-green-100">
                        ${totalJornales.toLocaleString('es-CO')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">Sin Registro</p>
                <p className="text-sm">
                  No hay registro de jornales para este período.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Apartado de Liquidación */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-6 w-6 text-primary" />
            Desprendible de Nómina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* INFORMACIÓN BÁSICA */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Días Trabajados</p>
              <p className="text-xl font-bold">{totalDias}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cédula</p>
              <p className="text-xl font-bold">{colaborador.numeroDocumento}</p>
            </div>
          </div>

          {/* DEVENGADO */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Devengado
            </h3>
            <div className="space-y-3 bg-success/5 p-5 rounded-lg border border-success/20">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">
                  {detalle.tipoSalario === 'VARIABLE' ? 'BASE (Jornales)' : 'SUELDO BÁSICO'}
                </span>
                <span className="font-bold text-lg">
                  ${salarioBase.toLocaleString('es-CO')}
                </span>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span className="text-muted-foreground font-medium">INCAPACIDADES</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={incapacidades || ''}
                  disabled
                  className="w-48 text-right font-semibold"
                />
              </div>

              <div className="flex justify-between pt-3 border-t-2 border-success/30">
                <span className="font-bold text-success">TOTAL BRUTO</span>
                <span className="font-bold text-xl text-success">
                  ${totalBruto.toLocaleString('es-CO')}
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground font-medium">SUBSIDIO TRANSPORTE</span>
                <span className="font-bold text-lg">
                  ${auxTransporte.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>

          {/* DEDUCCIONES */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Deducciones
            </h3>
            <div className="space-y-3 bg-destructive/5 p-5 rounded-lg border border-destructive/20">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">DESCUENTO SALUD (4%)</span>
                <span className="font-bold text-destructive">
                  ${salud.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">DESCUENTO PENSIÓN (4%)</span>
                <span className="font-bold text-destructive">
                  ${pension.toLocaleString('es-CO')}
                </span>
              </div>

              {/* PRÉSTAMOS/ADELANTOS */}
              <div className="pt-3 border-t border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground font-medium">DCTO ADELANTOS</span>
                </div>

                {prestamos.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {prestamos.map((prestamo, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 py-1">
                        <span className="text-sm">{prestamo.concepto}</span>
                        <span className="font-semibold text-destructive">
                          ${prestamo.valor.toLocaleString('es-CO')}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-end pt-1 border-t border-destructive/20">
                      <span className="text-sm font-semibold text-destructive">
                        Total: ${totalPrestamos.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-right font-semibold text-destructive">$0</p>
                )}
              </div>

              <div className="flex justify-between items-center gap-3 pt-2">
                <span className="text-muted-foreground font-medium">AHORRO</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={ahorro || ''}
                  disabled
                  className="w-48 text-right font-semibold"
                />
              </div>
            </div>
          </div>

          {/* BONIFICACIÓN */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Bonificación
            </h3>
            <div className="bg-green-50 p-5 rounded-lg border border-green-200">
              <div className="flex justify-between items-center gap-3">
                <span className="text-muted-foreground font-medium">BONIFICACIÓN</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={bonificaciones || ''}
                  disabled
                  className="w-48 text-right font-semibold"
                />
              </div>
            </div>
          </div>

          {/* RESUMEN FINAL */}
          <div className="pt-6 border-t-2">
            <div className="space-y-4 bg-primary/10 p-6 rounded-lg border-2 border-primary/30">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Bruto</p>
                  <p className="font-bold text-lg">${totalBruto.toLocaleString('es-CO')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subsidio Transporte</p>
                  <p className="font-bold text-lg text-success">${auxTransporte.toLocaleString('es-CO')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bonificaciones</p>
                  <p className="font-bold text-lg text-green-600">${bonificaciones.toLocaleString('es-CO')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Deducciones</p>
                  <p className="font-bold text-lg text-destructive">${totalDeducciones.toLocaleString('es-CO')}</p>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t-2 border-primary/30">
                <span className="font-bold text-2xl">TOTAL NETO</span>
                <span className="font-bold text-3xl text-primary">
                  ${netoAPagar.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>

          {/* Botón de volver */}
          <div className="flex justify-end pt-6">
            <Button
              onClick={volverANomina}
              className="gap-2"
              size="lg"
            >
              <ArrowLeft className="h-5 w-5" />
              Volver a Nómina
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
