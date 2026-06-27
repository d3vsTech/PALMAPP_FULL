// PLANILLA DIARIA - Registro diario de trabajo para validación de nómina
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
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
  FileText,
  Search,
  Filter,
  Calendar,
  Download,
  Users,
} from 'lucide-react';
import { useState } from 'react';

// Mock data para planilla diaria
const registrosDiarios = [
  {
    fecha: '2026-04-01',
    col1: 'PAULO',
    col2: 'ROCKET',
    col3: '',
    cuadrilla: '',
    lote: 'TARRO',
    nd: 6,
    kilos: 106,
    promedio: 17.67,
    peso: 1639,
    precio: 45,
    total: 73753,
    nroCol: 2,
    pagoXCol: 36876,
    pagoNeto: 90164,
  },
  {
    fecha: '2026-04-01',
    col1: 'JOSE',
    col2: 'RODOLFO',
    col3: 'ANDRES',
    cuadrilla: '',
    lote: 'PISCINAS',
    nd: 107,
    kilos: 1780,
    promedio: 16.64,
    precio: 45,
    total: 80100,
    nroCol: 3,
    pagoXCol: 26700,
    pagoNeto: 93600,
  },
  {
    fecha: '2026-04-01',
    col1: 'CARLOS',
    col2: '',
    col3: 'ANDRES',
    cuadrilla: 'DIMAS',
    lote: 'PISCINAS',
    nd: 410,
    kilos: 6813,
    promedio: 16.62,
    precio: 42,
    total: 286146,
    nroCol: 2,
    pagoXCol: 143073,
    pagoNeto: 94207,
  },
  {
    fecha: '2026-04-02',
    col1: 'DIMAS',
    col2: '',
    col3: '',
    cuadrilla: '',
    lote: 'PISCINAS',
    nd: 306,
    kilos: 5084,
    promedio: 16.61,
    precio: 42,
    total: 213528,
    nroCol: 1,
    pagoXCol: 213528,
    pagoNeto: 90701,
  },
  {
    fecha: '2026-04-03',
    col1: 'DOMIRES',
    col2: '',
    col3: '',
    cuadrilla: '',
    lote: 'PISCINAS',
    nd: 398,
    kilos: 6613,
    promedio: 16.61,
    precio: 42,
    total: 277746,
    nroCol: 1,
    pagoXCol: 277746,
    pagoNeto: 93787,
  },
  {
    fecha: '2026-04-08',
    col1: 'CESAR',
    col2: '',
    col3: 'ANDRES',
    cuadrilla: '',
    lote: 'PISCINAS',
    nd: 956,
    kilos: 15897,
    promedio: 16.63,
    precio: 42,
    total: 667674,
    nroCol: 2,
    pagoXCol: 333837,
    pagoNeto: 96793,
  },
  {
    fecha: '2026-04-09',
    col1: 'CESAR',
    col2: '',
    col3: 'RODOLFO',
    cuadrilla: '',
    lote: 'PISCINAS',
    nd: 645,
    kilos: 10714,
    promedio: 16.61,
    precio: 42,
    total: 449988,
    nroCol: 2,
    pagoXCol: 224994,
    pagoNeto: 90736,
  },
  {
    fecha: '2026-04-10',
    col1: 'PAULO',
    col2: '',
    col3: 'ROCKET',
    cuadrilla: 'DIMAS',
    lote: 'ESCUELA',
    nd: 648,
    kilos: 10762,
    promedio: 16.61,
    precio: 42,
    total: 452004,
    nroCol: 3,
    pagoXCol: 150668,
    pagoNeto: 92474,
  },
  {
    fecha: '2026-04-11',
    col1: 'PAULO',
    col2: '',
    col3: 'ROCKET',
    cuadrilla: 'ROCKET2',
    lote: 'ESCUELA',
    nd: 515,
    kilos: 8547,
    promedio: 16.59,
    precio: 42,
    total: 358974,
    nroCol: 3,
    pagoXCol: 119658,
    pagoNeto: 92475,
  },
  {
    fecha: '2026-04-11',
    col1: 'CARLOS',
    col2: '',
    col3: '',
    cuadrilla: '',
    lote: 'ESCUELA',
    nd: 956,
    kilos: 15868,
    promedio: 16.60,
    precio: 42,
    total: 666456,
    nroCol: 1,
    pagoXCol: 666456,
    pagoNeto: 93147,
  },
  {
    fecha: '2026-04-17',
    col1: 'PAULO',
    col2: '',
    col3: 'ROCKET',
    cuadrilla: '',
    lote: 'CASIRO',
    nd: 667,
    kilos: 11083,
    promedio: 16.62,
    precio: 42,
    total: 465486,
    nroCol: 2,
    pagoXCol: 232743,
    pagoNeto: 96239,
  },
];

export default function PlanillaDiaria() {
  const navigate = useNavigate();
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroLote, setFiltroLote] = useState('todos');
  const [filtroColaborador, setFiltroColaborador] = useState('');

  // Filtrar registros
  const registrosFiltrados = registrosDiarios.filter((reg) => {
    const cumpleFecha = !filtroFecha || reg.fecha.includes(filtroFecha);
    const cumpleLote = filtroLote === 'todos' || reg.lote === filtroLote;
    const cumpleColaborador =
      !filtroColaborador ||
      reg.col1.toLowerCase().includes(filtroColaborador.toLowerCase()) ||
      reg.col2.toLowerCase().includes(filtroColaborador.toLowerCase()) ||
      reg.col3.toLowerCase().includes(filtroColaborador.toLowerCase());
    return cumpleFecha && cumpleLote && cumpleColaborador;
  });

  // Calcular totales
  const totalKilos = registrosFiltrados.reduce((sum, r) => sum + r.kilos, 0);
  const totalPago = registrosFiltrados.reduce((sum, r) => sum + r.total, 0);
  const totalPagoNeto = registrosFiltrados.reduce((sum, r) => sum + r.pagoNeto, 0);

  // Obtener lotes únicos
  const lotesUnicos = Array.from(new Set(registrosDiarios.map((r) => r.lote))).sort();

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
            <BreadcrumbPage>Planilla Diaria</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/nomina')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Nómina
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Planilla Diaria de Trabajo</h1>
            <p className="text-muted-foreground mt-2">
              Registro diario de operaciones y cosecha
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Registros</p>
                <p className="text-3xl font-bold text-foreground">{registrosFiltrados.length}</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-7 w-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Kilos</p>
                <p className="text-3xl font-bold text-foreground">
                  {totalKilos.toLocaleString('es-CO')}
                </p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Calendar className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Pagos</p>
                <p className="text-3xl font-bold text-foreground">
                  ${(totalPago / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-success/10 flex items-center justify-center">
                <Users className="h-7 w-7 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Filtros</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Colaborador</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre del colaborador..."
                  value={filtroColaborador}
                  onChange={(e) => setFiltroColaborador(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lote</label>
              <Select value={filtroLote} onValueChange={setFiltroLote}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los lotes</SelectItem>
                  {lotesUnicos.map((lote) => (
                    <SelectItem key={lote} value={lote}>
                      {lote}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>
          </div>

          {(filtroFecha || filtroLote !== 'todos' || filtroColaborador) && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFiltroFecha('');
                  setFiltroLote('todos');
                  setFiltroColaborador('');
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de planilla diaria */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Registros Diarios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    FECHA
                  </th>
                  <th className="text-left p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    COL. 1
                  </th>
                  <th className="text-left p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    COL. 2
                  </th>
                  <th className="text-left p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    COL. 3
                  </th>
                  <th className="text-left p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    CUADRILLA
                  </th>
                  <th className="text-left p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    LOTE
                  </th>
                  <th className="text-right p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    ND
                  </th>
                  <th className="text-right p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    KILOS
                  </th>
                  <th className="text-right p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    PROMEDIO
                  </th>
                  <th className="text-right p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    PRECIO
                  </th>
                  <th className="text-right p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    TOTAL
                  </th>
                  <th className="text-center p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    No COL
                  </th>
                  <th className="text-right p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    $ X COL
                  </th>
                  <th className="text-right p-3 font-semibold text-xs text-muted-foreground whitespace-nowrap bg-green-50">
                    $ COL NETO
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((registro, index) => (
                  <tr
                    key={index}
                    className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                    }`}
                  >
                    <td className="p-3 whitespace-nowrap">
                      {new Date(registro.fecha).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </td>
                    <td className="p-3 font-medium whitespace-nowrap">{registro.col1 || '-'}</td>
                    <td className="p-3 font-medium whitespace-nowrap">{registro.col2 || '-'}</td>
                    <td className="p-3 font-medium whitespace-nowrap">{registro.col3 || '-'}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {registro.cuadrilla || '-'}
                    </td>
                    <td className="p-3 font-semibold whitespace-nowrap">{registro.lote}</td>
                    <td className="p-3 text-right whitespace-nowrap">{registro.nd}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">
                      {registro.kilos.toLocaleString('es-CO')}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {registro.promedio.toFixed(2)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">${registro.precio}</td>
                    <td className="p-3 text-right font-semibold text-success whitespace-nowrap">
                      ${registro.total.toLocaleString('es-CO')}
                    </td>
                    <td className="p-3 text-center font-semibold whitespace-nowrap">
                      {registro.nroCol}
                    </td>
                    <td className="p-3 text-right font-medium whitespace-nowrap">
                      ${registro.pagoXCol.toLocaleString('es-CO')}
                    </td>
                    <td className="p-3 text-right font-bold text-green-700 bg-green-50 whitespace-nowrap">
                      ${registro.pagoNeto.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
                {registrosFiltrados.length > 0 && (
                  <tr className="border-t-2 border-primary bg-primary/5 font-bold">
                    <td className="p-3" colSpan={7}>
                      TOTALES
                    </td>
                    <td className="p-3 text-right">{totalKilos.toLocaleString('es-CO')}</td>
                    <td className="p-3"></td>
                    <td className="p-3"></td>
                    <td className="p-3 text-right text-success">
                      ${totalPago.toLocaleString('es-CO')}
                    </td>
                    <td className="p-3"></td>
                    <td className="p-3"></td>
                    <td className="p-3 text-right text-green-700 bg-green-100">
                      ${totalPagoNeto.toLocaleString('es-CO')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {registrosFiltrados.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">No hay registros</p>
              <p className="text-sm">No se encontraron registros con los filtros aplicados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
