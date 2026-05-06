// PÁGINA COMPLETA LIQUIDACIÓN - Navega a nueva vista - v7.0
// v7.0: Cuando nómina CERRADA, solo muestra colaboradores liquidados
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  Download,
  Calculator,
  Lock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Send,
  Eye,
  X,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Package,
  Check,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { nominaPeriodos, colaboradores } from '../../lib/mockData';

// Mock data por nómina - Para nóminas CERRADAS todos están liquidados
const nominaDetallesPorPeriodo: Record<string, typeof nominaDetalles> = {
  'n1': [ // BORRADOR
    {
      colaboradorId: 'c1',
      tipoSalario: 'VARIABLE',
      salarioBase: 1300000,
      jornales: 850000,
      cosechas: 420000,
      devengado: 2570000,
      deducciones: 308400,
      neto: 2261600,
      estadoLiquidacion: 'Liquidado',
    },
    {
      colaboradorId: 'c2',
      tipoSalario: 'FIJO',
      salarioBase: 1500000,
      jornales: 0,
      cosechas: 0,
      devengado: 1500000,
      deducciones: 180000,
      neto: 1320000,
      estadoLiquidacion: 'Pendiente',
    },
    {
      colaboradorId: 'c3',
      tipoSalario: 'VARIABLE',
      salarioBase: 1400000,
      jornales: 780000,
      cosechas: 350000,
      devengado: 2530000,
      deducciones: 303600,
      neto: 2226400,
      estadoLiquidacion: 'Pendiente',
    },
  ],
  'n2': [ // CERRADA - Todos liquidados
    {
      colaboradorId: 'c1',
      tipoSalario: 'VARIABLE',
      salarioBase: 1300000,
      jornales: 920000,
      cosechas: 460000,
      devengado: 2680000,
      deducciones: 321600,
      neto: 2358400,
      estadoLiquidacion: 'Liquidado',
    },
    {
      colaboradorId: 'c2',
      tipoSalario: 'FIJO',
      salarioBase: 1500000,
      jornales: 0,
      cosechas: 0,
      devengado: 1500000,
      deducciones: 180000,
      neto: 1320000,
      estadoLiquidacion: 'Liquidado',
    },
    {
      colaboradorId: 'c3',
      tipoSalario: 'VARIABLE',
      salarioBase: 1400000,
      jornales: 840000,
      cosechas: 380000,
      devengado: 2620000,
      deducciones: 314400,
      neto: 2305600,
      estadoLiquidacion: 'Liquidado',
    },
  ],
};

// Datos de ejemplo para el resumen de trabajo diario
const resumenTrabajoDiario = {
  c1: [
    { fecha: '2026-04-01', diasTrabajados: 1, racimos: 45, peso: 675, jornal: 85000 },
    { fecha: '2026-04-02', diasTrabajados: 1, racimos: 48, peso: 720, jornal: 88000 },
    { fecha: '2026-04-03', diasTrabajados: 1, racimos: 42, peso: 630, jornal: 82000 },
    { fecha: '2026-04-04', diasTrabajados: 1, racimos: 50, peso: 750, jornal: 90000 },
    { fecha: '2026-04-05', diasTrabajados: 1, racimos: 46, peso: 690, jornal: 86000 },
    { fecha: '2026-04-08', diasTrabajados: 1, racimos: 44, peso: 660, jornal: 84000 },
    { fecha: '2026-04-09', diasTrabajados: 1, racimos: 47, peso: 705, jornal: 87000 },
    { fecha: '2026-04-10', diasTrabajados: 1, racimos: 49, peso: 735, jornal: 89000 },
    { fecha: '2026-04-11', diasTrabajados: 1, racimos: 43, peso: 645, jornal: 83000 },
    { fecha: '2026-04-12', diasTrabajados: 1, racimos: 51, peso: 765, jornal: 91000 },
  ],
  c2: [],
  c3: [
    { fecha: '2026-04-01', diasTrabajados: 1, racimos: 40, peso: 600, jornal: 80000 },
    { fecha: '2026-04-02', diasTrabajados: 1, racimos: 42, peso: 630, jornal: 82000 },
    { fecha: '2026-04-03', diasTrabajados: 1, racimos: 38, peso: 570, jornal: 78000 },
    { fecha: '2026-04-04', diasTrabajados: 1, racimos: 45, peso: 675, jornal: 85000 },
    { fecha: '2026-04-05', diasTrabajados: 1, racimos: 41, peso: 615, jornal: 81000 },
    { fecha: '2026-04-08', diasTrabajados: 1, racimos: 39, peso: 585, jornal: 79000 },
    { fecha: '2026-04-09', diasTrabajados: 1, racimos: 43, peso: 645, jornal: 83000 },
    { fecha: '2026-04-10', diasTrabajados: 1, racimos: 44, peso: 660, jornal: 84000 },
  ],
};

export default function NominaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const periodo = nominaPeriodos.find((p) => p.id === id);

  // Obtener detalles según el período
  const nominaDetalles = nominaDetallesPorPeriodo[id || 'n1'] || nominaDetallesPorPeriodo['n1'];

  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [estadosLiquidacion, setEstadosLiquidacion] = useState<Record<string, string>>(
    nominaDetalles.reduce((acc, detalle) => ({
      ...acc,
      [detalle.colaboradorId]: detalle.estadoLiquidacion || 'Pendiente'
    }), {})
  );

  // Modal de liquidación
  const [modalLiquidacionAbierto, setModalLiquidacionAbierto] = useState(false);
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState<string | null>(null);
  const [descuentosAdicionales, setDescuentosAdicionales] = useState<{concepto: string, valor: number}[]>([]);

  // Verificación de versión de archivo
  console.log('NominaDetalle - Solo liquidados en CERRADA v7.0 - Timestamp:', Date.now());

  if (!periodo) {
    return <div>Período no encontrado</div>;
  }

  const esBorrador = periodo.estado === 'BORRADOR' || periodo.estado === 'Borrador';

  // Filtrar colaboradores: si está CERRADA, solo mostrar liquidados
  const colaboradoresMostrar = esBorrador
    ? nominaDetalles
    : nominaDetalles.filter(d => estadosLiquidacion[d.colaboradorId] === 'Liquidado');

  const todosSeleccionados = seleccionados.length === colaboradoresMostrar.length && colaboradoresMostrar.length > 0;

  const toggleSeleccionarTodos = () => {
    if (todosSeleccionados) {
      setSeleccionados([]);
    } else {
      setSeleccionados(colaboradoresMostrar.map((d) => d.colaboradorId));
    }
  };

  const toggleSeleccion = (colaboradorId: string) => {
    setSeleccionados((prev) =>
      prev.includes(colaboradorId)
        ? prev.filter((id) => id !== colaboradorId)
        : [...prev, colaboradorId]
    );
  };

  const abrirModalLiquidacion = (colaboradorId: string) => {
    setColaboradorSeleccionado(colaboradorId);
    setDescuentosAdicionales([]);
    setModalLiquidacionAbierto(true);
  };

  const liquidarColaborador = () => {
    if (colaboradorSeleccionado) {
      setEstadosLiquidacion(prev => ({
        ...prev,
        [colaboradorSeleccionado]: 'Liquidado'
      }));
      setModalLiquidacionAbierto(false);
      setColaboradorSeleccionado(null);
    }
  };

  const agregarDescuento = () => {
    setDescuentosAdicionales([...descuentosAdicionales, { concepto: '', valor: 0 }]);
  };

  const eliminarDescuento = (index: number) => {
    setDescuentosAdicionales(descuentosAdicionales.filter((_, i) => i !== index));
  };

  const actualizarDescuento = (index: number, campo: 'concepto' | 'valor', valor: any) => {
    const nuevosDescuentos = [...descuentosAdicionales];
    nuevosDescuentos[index][campo] = valor;
    setDescuentosAdicionales(nuevosDescuentos);
  };

  const getIniciales = (nombre: string) => {
    const partes = nombre.split(' ');
    return partes.length > 1
      ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
      : nombre.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/nomina">Nómina</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{periodo.periodo}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 gap-2">
          <Link to="/nomina">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-foreground">{periodo.periodo}</h1>
              <StatusBadge status={periodo.estado as any} />
            </div>
            <p className="text-muted-foreground">
              {periodo.mes}/{periodo.ano} - Quincena {periodo.quincena}
            </p>
          </div>

          <div className="flex gap-2">
            {periodo.estado === 'Borrador' && (
              <>
                <Button variant="outline" className="gap-2">
                  <Calculator className="h-4 w-4" />
                  Calcular Todo
                </Button>
                <Button variant="default" className="gap-2">
                  <Lock className="h-4 w-4" />
                  Cerrar Nómina
                </Button>
              </>
            )}
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Total Devengado
                </p>
                <p className="text-3xl font-bold text-success">
                  ${periodo.devengadoTotal.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Ingresos del período</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Total Deducciones
                </p>
                <p className="text-3xl font-bold text-destructive">
                  ${periodo.deduccionesTotal.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Descuentos legales</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-7 w-7 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Neto a Pagar</p>
                <p className="text-3xl font-bold text-primary">
                  ${periodo.netoTotal.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total a desembolsar</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-7 w-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de empleados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-2">
              {esBorrador ? 'Liquidación de Colaboradores' : 'Detalle por Colaborador'}
            </h2>
            <p className="text-muted-foreground">
              {esBorrador
                ? `${nominaDetalles.length} empleados - ${Object.values(estadosLiquidacion).filter(e => e === 'Liquidado').length} liquidados, ${Object.values(estadosLiquidacion).filter(e => e === 'Pendiente').length} pendientes`
                : `${colaboradoresMostrar.length} empleados liquidados en este período`}
            </p>
          </div>

          {/* Controles de selección - Solo si NO es borrador */}
          {!esBorrador && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="seleccionar-todos"
                  checked={todosSeleccionados}
                  onCheckedChange={toggleSeleccionarTodos}
                />
                <label
                  htmlFor="seleccionar-todos"
                  className="text-sm font-medium cursor-pointer select-none"
                >
                  Seleccionar todos
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Tabla */}
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {!esBorrador && (
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground w-12">
                        <span className="sr-only">Seleccionar</span>
                      </th>
                    )}
                    <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                      Colaborador
                    </th>
                    <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                      Tipo
                    </th>
                    <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                      Salario Base
                    </th>
                    {!esBorrador && (
                      <>
                        <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                          Jornales
                        </th>
                        <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                          Cosechas
                        </th>
                        <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                          Devengado
                        </th>
                        <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                          Deducciones
                        </th>
                        <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                          Neto
                        </th>
                      </>
                    )}
                    {esBorrador && (
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground">
                        Estado
                      </th>
                    )}
                    <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradoresMostrar.map((detalle, index) => {
                    const colaborador = colaboradores.find((c) => c.id === detalle.colaboradorId);
                    const estaSeleccionado = seleccionados.includes(detalle.colaboradorId);
                    const estadoActual = estadosLiquidacion[detalle.colaboradorId] || 'Pendiente';
                    const estaLiquidado = estadoActual === 'Liquidado';

                    return (
                      <tr
                        key={detalle.colaboradorId}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                        } ${estaSeleccionado ? 'bg-primary/5' : ''}`}
                      >
                        {!esBorrador && (
                          <td className="p-4">
                            <Checkbox
                              checked={estaSeleccionado}
                              onCheckedChange={() => toggleSeleccion(detalle.colaboradorId)}
                            />
                          </td>
                        )}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                              <span className="text-sm font-bold">
                                {getIniciales(`${colaborador?.nombres} ${colaborador?.apellidos}`)}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-sm">
                                {colaborador?.nombres} {colaborador?.apellidos}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-xs">
                            {detalle.tipoSalario}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-medium">
                            ${detalle.salarioBase.toLocaleString('es-CO')}
                          </span>
                        </td>
                        {!esBorrador && (
                          <>
                            <td className="p-4 text-right">
                              <span className="text-sm font-medium">
                                ${detalle.jornales.toLocaleString('es-CO')}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-medium">
                                ${detalle.cosechas.toLocaleString('es-CO')}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-semibold text-success">
                                ${detalle.devengado.toLocaleString('es-CO')}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-medium text-destructive">
                                ${detalle.deducciones.toLocaleString('es-CO')}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-bold text-primary">
                                ${detalle.neto.toLocaleString('es-CO')}
                              </span>
                            </td>
                          </>
                        )}
                        {esBorrador && (
                          <td className="p-4 text-center">
                            <Badge
                              className={`text-xs ${
                                estaLiquidado
                                  ? 'bg-success/10 text-success border-success/20'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-200'
                              }`}
                            >
                              {estadoActual}
                            </Badge>
                          </td>
                        )}
                        <td className="p-4 text-right">
                          {esBorrador ? (
                            estaLiquidado ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/nomina/${id}/ver/${detalle.colaboradorId}`)}
                                className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                                title="Ver liquidación"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => navigate(`/nomina/${id}/liquidar/${detalle.colaboradorId}`)}
                                className="gap-1 bg-primary hover:bg-primary/90"
                                title="Liquidar"
                              >
                                <Calculator className="h-4 w-4" />
                              </Button>
                            )
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/nomina/${id}/ver/${detalle.colaboradorId}`)}
                              className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                              title="Ver liquidación"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Liquidación */}
      <Dialog open={modalLiquidacionAbierto} onOpenChange={setModalLiquidacionAbierto}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {colaboradorSeleccionado && (() => {
            const detalle = nominaDetalles.find(d => d.colaboradorId === colaboradorSeleccionado);
            const colaborador = colaboradores.find(c => c.id === colaboradorSeleccionado);
            const diasTrabajados = resumenTrabajoDiario[colaboradorSeleccionado as keyof typeof resumenTrabajoDiario] || [];

            const totalJornales = diasTrabajados.reduce((sum, dia) => sum + dia.jornal, 0);
            const totalRacimos = diasTrabajados.reduce((sum, dia) => sum + dia.racimos, 0);
            const totalPeso = diasTrabajados.reduce((sum, dia) => sum + dia.peso, 0);
            const totalDias = diasTrabajados.length;

            // Cálculos de liquidación
            const salarioBase = detalle?.salarioBase || 0;
            const auxTransporte = 162000; // Ejemplo
            const devengadoTotal = salarioBase + totalJornales + auxTransporte;

            // Deducciones legales
            const salud = Math.round(devengadoTotal * 0.04);
            const pension = Math.round(devengadoTotal * 0.04);
            const deduccionesLegales = salud + pension;

            // Descuentos adicionales
            const totalDescuentosAdicionales = descuentosAdicionales.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);

            const totalDeducciones = deduccionesLegales + totalDescuentosAdicionales;
            const netoAPagar = devengadoTotal - totalDeducciones;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {getIniciales(`${colaborador?.nombres} ${colaborador?.apellidos}`)}
                      </span>
                    </div>
                    <div>
                      <div>Liquidar: {colaborador?.nombres} {colaborador?.apellidos}</div>
                      <DialogDescription className="text-sm">
                        {detalle?.tipoSalario} - Período: {periodo.periodo}
                      </DialogDescription>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-6">
                  {/* Resumen de Trabajo Diario */}
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        Resumen de Trabajo - Planilla Diaria
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {diasTrabajados.length > 0 ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-border bg-muted/30">
                                  <th className="text-left p-3 font-semibold text-sm text-muted-foreground">Fecha</th>
                                  <th className="text-center p-3 font-semibold text-sm text-muted-foreground">Días</th>
                                  <th className="text-right p-3 font-semibold text-sm text-muted-foreground">Racimos</th>
                                  <th className="text-right p-3 font-semibold text-sm text-muted-foreground">Peso (kg)</th>
                                  <th className="text-right p-3 font-semibold text-sm text-muted-foreground">Jornal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {diasTrabajados.map((dia, index) => (
                                  <tr
                                    key={index}
                                    className={`border-b border-border last:border-0 ${
                                      index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                                    }`}
                                  >
                                    <td className="p-3 text-sm">
                                      {new Date(dia.fecha).toLocaleDateString('es-CO', {
                                        weekday: 'short',
                                        day: '2-digit',
                                        month: 'short',
                                      })}
                                    </td>
                                    <td className="p-3 text-sm text-center">{dia.diasTrabajados}</td>
                                    <td className="p-3 text-sm text-right font-medium">{dia.racimos}</td>
                                    <td className="p-3 text-sm text-right font-medium">{dia.peso}</td>
                                    <td className="p-3 text-sm text-right font-semibold text-success">
                                      ${dia.jornal.toLocaleString('es-CO')}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="border-t-2 border-primary bg-primary/5">
                                  <td className="p-3 text-sm font-bold">TOTALES</td>
                                  <td className="p-3 text-sm text-center font-bold">{totalDias}</td>
                                  <td className="p-3 text-sm text-right font-bold">{totalRacimos}</td>
                                  <td className="p-3 text-sm text-right font-bold">{totalPeso}</td>
                                  <td className="p-3 text-sm text-right font-bold text-success">
                                    ${totalJornales.toLocaleString('es-CO')}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Este colaborador tiene salario fijo, no hay registro de jornales.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Apartado de Liquidación */}
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Calculator className="h-5 w-5 text-primary" />
                        Liquidación - Devengado y Deducciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* DEVENGADO */}
                      <div>
                        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-success" />
                          Devengado
                        </h3>
                        <div className="space-y-2 bg-success/5 p-4 rounded-lg border border-success/20">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Salario Base</span>
                            <span className="font-semibold">${salarioBase.toLocaleString('es-CO')}</span>
                          </div>
                          {totalJornales > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Jornales ({totalDias} días)
                              </span>
                              <span className="font-semibold">${totalJornales.toLocaleString('es-CO')}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Auxilio de Transporte</span>
                            <span className="font-semibold">${auxTransporte.toLocaleString('es-CO')}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-success/30">
                            <span className="font-bold text-success">TOTAL DEVENGADO</span>
                            <span className="font-bold text-lg text-success">
                              ${devengadoTotal.toLocaleString('es-CO')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* DEDUCCIONES LEGALES */}
                      <div>
                        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-destructive" />
                          Deducciones Legales
                        </h3>
                        <div className="space-y-2 bg-destructive/5 p-4 rounded-lg border border-destructive/20">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Salud (4%)</span>
                            <span className="font-semibold text-destructive">
                              ${salud.toLocaleString('es-CO')}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Pensión (4%)</span>
                            <span className="font-semibold text-destructive">
                              ${pension.toLocaleString('es-CO')}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-destructive/30">
                            <span className="font-semibold">Subtotal Deducciones Legales</span>
                            <span className="font-semibold text-destructive">
                              ${deduccionesLegales.toLocaleString('es-CO')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* DESCUENTOS ADICIONALES */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-amber-600" />
                            Descuentos Adicionales
                          </h3>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={agregarDescuento}
                            className="gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Agregar Descuento
                          </Button>
                        </div>

                        {descuentosAdicionales.length > 0 ? (
                          <div className="space-y-2">
                            {descuentosAdicionales.map((descuento, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg"
                              >
                                <Input
                                  placeholder="Concepto del descuento"
                                  value={descuento.concepto}
                                  onChange={(e) =>
                                    actualizarDescuento(index, 'concepto', e.target.value)
                                  }
                                  className="flex-1"
                                />
                                <Input
                                  type="number"
                                  placeholder="Valor"
                                  value={descuento.valor || ''}
                                  onChange={(e) =>
                                    actualizarDescuento(index, 'valor', Number(e.target.value))
                                  }
                                  className="w-40"
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => eliminarDescuento(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex justify-between pt-2 border-t">
                              <span className="font-semibold text-sm">Total Descuentos Adicionales</span>
                              <span className="font-semibold text-amber-600">
                                ${totalDescuentosAdicionales.toLocaleString('es-CO')}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">
                            No hay descuentos adicionales. Haz clic en "Agregar Descuento" para añadir uno.
                          </p>
                        )}
                      </div>

                      {/* RESUMEN FINAL */}
                      <div className="pt-4 border-t-2">
                        <div className="space-y-2 bg-primary/10 p-4 rounded-lg border-2 border-primary/30">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Devengado</span>
                            <span className="font-semibold">${devengadoTotal.toLocaleString('es-CO')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Deducciones</span>
                            <span className="font-semibold text-destructive">
                              -${totalDeducciones.toLocaleString('es-CO')}
                            </span>
                          </div>
                          <div className="flex justify-between pt-3 border-t-2 border-primary/30">
                            <span className="font-bold text-lg">NETO A PAGAR</span>
                            <span className="font-bold text-2xl text-primary">
                              ${netoAPagar.toLocaleString('es-CO')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setModalLiquidacionAbierto(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={liquidarColaborador}
                          className="flex-1 gap-2 bg-success hover:bg-success/90"
                        >
                          <Check className="h-4 w-4" />
                          Confirmar Liquidación
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
