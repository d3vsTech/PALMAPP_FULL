// PÁGINA LIQUIDACIÓN - Formato desprendible real v4.0
// Estructura según formato actual de la finca:
// - BASE/SUELDO BÁSICO + EXTRAS + INCAPACIDADES = TOTAL BRUTO
// - SUBSIDIO TRANSPORTE (suma aparte)
// - DEDUCCIONES: Salud (4%), Pensión (4%), Adelantos, Ahorro
// - BONIFICACIÓN (suma al final)
// - TOTAL NETO = Total Bruto + Subsidio + Bonificación - Deducciones
// v4.0: Planilla diaria completa con Lote, Sublote, Cosecha, Cuadrilla, Promedio, Precio/kg, Total Cosecha
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
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

// Datos de ejemplo para el resumen de trabajo diario por actividad
const resumenTrabajoDiario: Record<string, Array<{
  fecha: string;
  lote: string;
  sublote: string;
  actividad: 'Cosecha' | 'Poda' | 'Plateo' | 'Sanidad';
  referencia?: string;
  viajeId?: string;
  // Para Cosecha
  racimos?: number;
  peso?: number;
  promedio?: number;
  precioKg?: number;
  totalCosecha?: number;
  // Para Poda y Plateo
  palmas?: number;
  precioPalma?: number;
  totalPalmas?: number;
  // Para Sanidad
  descripcion?: string;
  jornal: number;
}>> = {
  c1: [
    // Cosecha
    { fecha: '2026-04-01', lote: 'TARRO', sublote: 'TA-01', actividad: 'Cosecha', referencia: 'C-2026-001', viajeId: 'r1', racimos: 45, peso: 675, promedio: 15.0, precioKg: 45, totalCosecha: 30375, jornal: 85000 },
    { fecha: '2026-04-02', lote: 'PISCINAS', sublote: 'PS-02', actividad: 'Cosecha', referencia: 'C-2026-002', viajeId: 'r2', racimos: 48, peso: 720, promedio: 15.0, precioKg: 45, totalCosecha: 32400, jornal: 88000 },
    { fecha: '2026-04-03', lote: 'PISCINAS', sublote: 'PS-03', actividad: 'Cosecha', referencia: 'C-2026-003', viajeId: 'r3', racimos: 42, peso: 630, promedio: 15.0, precioKg: 42, totalCosecha: 26460, jornal: 82000 },
    { fecha: '2026-04-04', lote: 'ESCUELA', sublote: 'ES-01', actividad: 'Cosecha', referencia: 'C-2026-004', viajeId: 'r4', racimos: 50, peso: 750, promedio: 15.0, precioKg: 42, totalCosecha: 31500, jornal: 90000 },
    // Poda
    { fecha: '2026-04-05', lote: 'TARRO', sublote: 'TA-03', actividad: 'Poda', palmas: 58, precioPalma: 950, totalPalmas: 55100, jornal: 55000 },
    { fecha: '2026-04-06', lote: 'PISCINAS', sublote: 'PS-01', actividad: 'Poda', palmas: 60, precioPalma: 950, totalPalmas: 57000, jornal: 57000 },
    // Plateo
    { fecha: '2026-04-08', lote: 'CASIRO', sublote: 'CA-01', actividad: 'Plateo', palmas: 65, precioPalma: 800, totalPalmas: 52000, jornal: 52000 },
    // Sanidad
    { fecha: '2026-04-09', lote: 'ESCUELA', sublote: 'ES-02', actividad: 'Sanidad', descripcion: 'Aplicación de fungicida contra Phytophthora', jornal: 50000 },
    // Más cosecha
    { fecha: '2026-04-10', lote: 'SEMBRIO A', sublote: 'SA-01', actividad: 'Cosecha', referencia: 'C-2026-008', viajeId: 'r5', racimos: 49, peso: 735, promedio: 15.0, precioKg: 42, totalCosecha: 30870, jornal: 89000 },
    { fecha: '2026-04-11', lote: 'SEMBRIO A', sublote: 'SA-02', actividad: 'Cosecha', referencia: 'C-2026-009', viajeId: 'r1', racimos: 43, peso: 645, promedio: 15.0, precioKg: 42, totalCosecha: 27090, jornal: 83000 },
  ],
  c2: [],
  c3: [
    // Cosecha
    { fecha: '2026-04-01', lote: 'PISCINAS', sublote: 'PS-01', actividad: 'Cosecha', referencia: 'C-2026-001', viajeId: 'r1', racimos: 40, peso: 600, promedio: 15.0, precioKg: 45, totalCosecha: 27000, jornal: 80000 },
    { fecha: '2026-04-02', lote: 'PISCINAS', sublote: 'PS-04', actividad: 'Cosecha', referencia: 'C-2026-002', viajeId: 'r2', racimos: 42, peso: 630, promedio: 15.0, precioKg: 45, totalCosecha: 28350, jornal: 82000 },
    { fecha: '2026-04-03', lote: 'ESCUELA', sublote: 'ES-03', actividad: 'Cosecha', referencia: 'C-2026-003', viajeId: 'r3', racimos: 38, peso: 570, promedio: 15.0, precioKg: 42, totalCosecha: 23940, jornal: 78000 },
    // Poda
    { fecha: '2026-04-04', lote: 'TARRO', sublote: 'TA-01', actividad: 'Poda', palmas: 56, precioPalma: 950, totalPalmas: 53200, jornal: 53000 },
    // Plateo
    { fecha: '2026-04-05', lote: 'CASIRO', sublote: 'CA-02', actividad: 'Plateo', palmas: 62, precioPalma: 800, totalPalmas: 49600, jornal: 50000 },
    // Cosecha
    { fecha: '2026-04-08', lote: 'CASIRO', sublote: 'CA-03', actividad: 'Cosecha', referencia: 'C-2026-005', viajeId: 'r4', racimos: 41, peso: 615, promedio: 15.0, precioKg: 42, totalCosecha: 25830, jornal: 81000 },
    // Sanidad
    { fecha: '2026-04-09', lote: 'SEMBRIO A', sublote: 'SA-02', actividad: 'Sanidad', descripcion: 'Control de plagas con insecticida', jornal: 50000 },
    // Cosecha
    { fecha: '2026-04-10', lote: 'SEMBRIO A', sublote: 'SA-03', actividad: 'Cosecha', referencia: 'C-2026-007', viajeId: 'r5', racimos: 43, peso: 645, promedio: 15.0, precioKg: 42, totalCosecha: 27090, jornal: 83000 },
    { fecha: '2026-04-11', lote: 'SEMBRIO A', sublote: 'SA-01', actividad: 'Cosecha', referencia: 'C-2026-008', viajeId: 'r1', racimos: 44, peso: 660, promedio: 15.0, precioKg: 42, totalCosecha: 27720, jornal: 84000 },
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

export default function LiquidarColaborador() {
  const { nominaId, colaboradorId } = useParams();
  const navigate = useNavigate();

  // Verificación de versión
  console.log('LiquidarColaborador - Planilla completa v4.0 - Timestamp:', Date.now());

  const periodo = nominaPeriodos.find((p) => p.id === nominaId);
  const colaborador = colaboradores.find((c) => c.id === colaboradorId);
  const detalle = nominaDetalles.find((d) => d.colaboradorId === colaboradorId);

  // Estados para campos editables
  const [incapacidades, setIncapacidades] = useState(0);
  const [bonificaciones, setBonificaciones] = useState(0);
  const [ahorros, setAhorros] = useState<{
    concepto: string;
    valor: number;
    periodicidad: 'QUINCENAL' | 'MENSUAL';
    metodo: 'PRESTAMO' | 'DESCUENTO_DIRECTO' | 'OTRO';
    otroMetodo?: string;
  }[]>([]);
  const [prestamos, setPrestamos] = useState<{concepto: string, valor: number}[]>([]);

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

  // Agrupar por actividad
  const actividadesPorTipo = diasTrabajados.reduce((acc, dia) => {
    if (!acc[dia.actividad]) {
      acc[dia.actividad] = [];
    }
    acc[dia.actividad].push(dia);
    return acc;
  }, {} as Record<string, typeof diasTrabajados>);

  const totalJornales = diasTrabajados.reduce((sum, dia) => sum + dia.jornal, 0);
  const totalRacimos = diasTrabajados.reduce((sum, dia) => sum + (dia.racimos || 0), 0);
  const totalPeso = diasTrabajados.reduce((sum, dia) => sum + (dia.peso || 0), 0);
  const totalCosecha = diasTrabajados.reduce((sum, dia) => sum + (dia.totalCosecha || 0), 0);
  const totalPalmas = diasTrabajados.reduce((sum, dia) => sum + (dia.palmas || 0), 0);
  const totalValorPalmas = diasTrabajados.reduce((sum, dia) => sum + (dia.totalPalmas || 0), 0);
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

  // Total de ahorros
  const totalAhorros = ahorros.reduce((sum, a) => sum + (Number(a.valor) || 0), 0);

  // Cálculo final
  const totalDeducciones = salud + pension + totalPrestamos + totalAhorros;
  const netoAPagar = totalBruto + auxTransporte + bonificaciones - totalDeducciones;

  const agregarPrestamo = () => {
    setPrestamos([...prestamos, { concepto: '', valor: 0 }]);
  };

  const eliminarPrestamo = (index: number) => {
    setPrestamos(prestamos.filter((_, i) => i !== index));
  };

  const actualizarPrestamo = (index: number, campo: 'concepto' | 'valor', valor: any) => {
    const nuevosPrestamos = [...prestamos];
    nuevosPrestamos[index][campo] = valor;
    setPrestamos(nuevosPrestamos);
  };

  const agregarAhorro = () => {
    setAhorros([...ahorros, { concepto: '', valor: 0, periodicidad: 'QUINCENAL', metodo: 'DESCUENTO_DIRECTO' }]);
  };

  const eliminarAhorro = (index: number) => {
    setAhorros(ahorros.filter((_, i) => i !== index));
  };

  const actualizarAhorro = (index: number, campo: keyof typeof ahorros[0], valor: any) => {
    const nuevosAhorros = [...ahorros];
    (nuevosAhorros[index] as any)[campo] = valor;
    setAhorros(nuevosAhorros);
  };

  const confirmarLiquidacion = () => {
    // Aquí guardarías la liquidación en el backend
    // Luego navegar al desprendible
    navigate(`/nomina/${nominaId}/desprendible/${colaboradorId}`);
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
              <div className="space-y-6">
                {Object.entries(actividadesPorTipo).map(([actividad, registros]) => {
                  const esCosecha = actividad === 'Cosecha';
                  const esPodaOPlateo = actividad === 'Poda' || actividad === 'Plateo';
                  const esSanidad = actividad === 'Sanidad';

                  const subtotalJornales = registros.reduce((sum, r) => sum + r.jornal, 0);
                  const subtotalRacimos = registros.reduce((sum, r) => sum + (r.racimos || 0), 0);
                  const subtotalPeso = registros.reduce((sum, r) => sum + (r.peso || 0), 0);
                  const subtotalCosecha = registros.reduce((sum, r) => sum + (r.totalCosecha || 0), 0);
                  const subtotalPalmas = registros.reduce((sum, r) => sum + (r.palmas || 0), 0);
                  const subtotalValorPalmas = registros.reduce((sum, r) => sum + (r.totalPalmas || 0), 0);

                  return (
                    <div key={actividad} className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-primary/10 px-3 py-2 border-b border-border">
                        <h4 className="font-semibold text-sm text-primary">{actividad}</h4>
                      </div>
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
                              {esCosecha && (
                                <>
                                  <th className="text-left p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                                    Cosecha
                                  </th>
                                  <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                                    Racimos
                                  </th>
                                  <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                                    Prom.
                                  </th>
                                  <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                                    Peso (kg)
                                  </th>
                                  <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                                    Precio/kg
                                  </th>
                                  <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                                    Total Cosecha
                                  </th>
                                </>
                              )}
                              {esPodaOPlateo && (
                                <>
                                  <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                                    Palmas
                                  </th>
                                  <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                                    Precio/palma
                                  </th>
                                  <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                                    Total Palmas
                                  </th>
                                </>
                              )}
                              {esSanidad && (
                                <th className="text-left p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                                  Descripción
                                </th>
                              )}
                              <th className="text-right p-2 font-semibold text-xs text-muted-foreground whitespace-nowrap bg-green-50">
                                Jornal
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {registros.map((dia, index) => (
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
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="p-2 text-xs font-medium whitespace-nowrap">{dia.lote}</td>
                                <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{dia.sublote}</td>
                                {esCosecha && (
                                  <>
                                    <td className="p-2 text-xs whitespace-nowrap">
                                      <Link
                                        to={`/viajes/${dia.viajeId}`}
                                        className="text-primary hover:underline font-medium"
                                      >
                                        {dia.referencia}
                                      </Link>
                                    </td>
                                    <td className="p-2 text-xs text-right font-medium whitespace-nowrap">{dia.racimos}</td>
                                    <td className="p-2 text-xs text-right whitespace-nowrap">{dia.promedio?.toFixed(1)}</td>
                                    <td className="p-2 text-xs text-right font-medium whitespace-nowrap">{dia.peso}</td>
                                    <td className="p-2 text-xs text-right whitespace-nowrap">${dia.precioKg}</td>
                                    <td className="p-2 text-xs text-right font-semibold text-amber-600 whitespace-nowrap">
                                      ${dia.totalCosecha?.toLocaleString('es-CO')}
                                    </td>
                                  </>
                                )}
                                {esPodaOPlateo && (
                                  <>
                                    <td className="p-2 text-xs text-right font-medium whitespace-nowrap">{dia.palmas}</td>
                                    <td className="p-2 text-xs text-right whitespace-nowrap">${dia.precioPalma?.toLocaleString('es-CO')}</td>
                                    <td className="p-2 text-xs text-right font-semibold text-amber-600 whitespace-nowrap">
                                      ${dia.totalPalmas?.toLocaleString('es-CO')}
                                    </td>
                                  </>
                                )}
                                {esSanidad && (
                                  <td className="p-2 text-xs text-muted-foreground max-w-xs truncate">{dia.descripcion}</td>
                                )}
                                <td className="p-2 text-xs text-right font-bold text-success bg-green-50 whitespace-nowrap">
                                  ${dia.jornal.toLocaleString('es-CO')}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-primary bg-primary/5">
                              <td className="p-2 text-xs font-bold" colSpan={3}>SUBTOTAL {actividad.toUpperCase()}</td>
                              {esCosecha && (
                                <>
                                  <td className="p-2 text-xs"></td>
                                  <td className="p-2 text-xs text-right font-bold">{subtotalRacimos}</td>
                                  <td className="p-2 text-xs"></td>
                                  <td className="p-2 text-xs text-right font-bold">{subtotalPeso}</td>
                                  <td className="p-2 text-xs"></td>
                                  <td className="p-2 text-xs text-right font-bold text-amber-600">
                                    ${subtotalCosecha.toLocaleString('es-CO')}
                                  </td>
                                </>
                              )}
                              {esPodaOPlateo && (
                                <>
                                  <td className="p-2 text-xs text-right font-bold">{subtotalPalmas}</td>
                                  <td className="p-2 text-xs"></td>
                                  <td className="p-2 text-xs text-right font-bold text-amber-600">
                                    ${subtotalValorPalmas.toLocaleString('es-CO')}
                                  </td>
                                </>
                              )}
                              {esSanidad && (
                                <td className="p-2 text-xs"></td>
                              )}
                              <td className="p-2 text-xs text-right font-bold text-success bg-green-100">
                                ${subtotalJornales.toLocaleString('es-CO')}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* Total General */}
                <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">TOTAL GENERAL</span>
                    <span className="font-bold text-2xl text-primary">
                      ${totalJornales.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
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
                  onChange={(e) => setIncapacidades(Number(e.target.value) || 0)}
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
                  <Button size="sm" variant="ghost" onClick={agregarPrestamo} className="gap-1 h-7">
                    <Plus className="h-3 w-3" />
                    Agregar
                  </Button>
                </div>

                {prestamos.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {prestamos.map((prestamo, index) => (
                      <div key={index} className="flex items-center gap-2 bg-background p-2 rounded">
                        <Input
                          placeholder="Concepto"
                          value={prestamo.concepto}
                          onChange={(e) => actualizarPrestamo(index, 'concepto', e.target.value)}
                          className="flex-1 h-8 text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="0"
                          value={prestamo.valor || ''}
                          onChange={(e) => actualizarPrestamo(index, 'valor', Number(e.target.value))}
                          className="w-32 h-8 text-sm text-right"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => eliminarPrestamo(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex justify-end pt-1">
                      <span className="text-sm font-semibold text-destructive">
                        Total: ${totalPrestamos.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-center text-muted-foreground py-2">$0</p>
                )}
              </div>

              {/* AHORROS */}
              <div className="pt-3 border-t border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground font-medium">AHORROS</span>
                  <Button size="sm" variant="ghost" onClick={agregarAhorro} className="gap-1 h-7">
                    <Plus className="h-3 w-3" />
                    Agregar
                  </Button>
                </div>

                {ahorros.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {ahorros.map((ahorro, index) => (
                      <div key={index} className="bg-background p-3 rounded border border-destructive/20 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Concepto"
                            value={ahorro.concepto}
                            onChange={(e) => actualizarAhorro(index, 'concepto', e.target.value)}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => eliminarAhorro(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Valor</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={ahorro.valor || ''}
                              onChange={(e) => actualizarAhorro(index, 'valor', Number(e.target.value))}
                              className="h-8 text-sm text-right"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Periodicidad</Label>
                            <Select
                              value={ahorro.periodicidad}
                              onValueChange={(value) => actualizarAhorro(index, 'periodicidad', value)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                                <SelectItem value="MENSUAL">Mensual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Método</Label>
                          <Select
                            value={ahorro.metodo}
                            onValueChange={(value) => actualizarAhorro(index, 'metodo', value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DESCUENTO_DIRECTO">Descuento Directo</SelectItem>
                              <SelectItem value="PRESTAMO">Préstamo</SelectItem>
                              <SelectItem value="OTRO">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {ahorro.metodo === 'OTRO' && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Especificar método</Label>
                            <Input
                              placeholder="Ej: Ahorro programado"
                              value={ahorro.otroMetodo || ''}
                              onChange={(e) => actualizarAhorro(index, 'otroMetodo', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-end pt-1">
                      <span className="text-sm font-semibold text-destructive">
                        Total: ${totalAhorros.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-center text-muted-foreground py-2">$0</p>
                )}
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
                  onChange={(e) => setBonificaciones(Number(e.target.value) || 0)}
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

          {/* Botones de acción */}
          <div className="flex gap-4 pt-6">
            <Button
              variant="outline"
              onClick={() => navigate(`/nomina/${nominaId}`)}
              className="flex-1"
              size="lg"
            >
              Cancelar
            </Button>
            <Button onClick={confirmarLiquidacion} className="flex-1 gap-2 bg-success hover:bg-success/90" size="lg">
              <Check className="h-5 w-5" />
              Confirmar y Guardar Liquidación
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
