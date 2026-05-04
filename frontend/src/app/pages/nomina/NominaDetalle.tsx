import { useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Download, Calculator, Lock, Eye } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { nominaPeriodos, colaboradores } from '../../lib/mockData';

const nominaDetalles = [
  {
    colaboradorId: 'c1',
    tipoSalario: 'VARIABLE',
    salarioBase: 1300000,
    jornales: 850000,
    cosechas: 420000,
    devengado: 2570000,
    deducciones: 308400,
    neto: 2261600,
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
  },
];

export default function NominaDetalle() {
  const { id } = useParams();
  const periodo = nominaPeriodos.find((p) => p.id === id);

  if (!periodo) {
    return <div>Período no encontrado</div>;
  }

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

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/nomina">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">{periodo.periodo}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={periodo.estado as any} />
            <span className="text-muted-foreground">
              {periodo.mes}/{periodo.ano} - Quincena {periodo.quincena}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {periodo.estado === 'BORRADOR' && (
            <>
              <Button variant="outline">
                <Calculator className="mr-2 h-4 w-4" />
                Calcular Todo
              </Button>
              <Button variant="destructive">
                <Lock className="mr-2 h-4 w-4" />
                Cerrar Nómina
              </Button>
            </>
          )}
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Devengado</CardDescription>
            <CardTitle className="text-2xl">
              ${periodo.devengadoTotal.toLocaleString('es-CO')}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Deducciones</CardDescription>
            <CardTitle className="text-2xl">
              ${periodo.deduccionesTotal.toLocaleString('es-CO')}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Neto a Pagar</CardDescription>
            <CardTitle className="text-2xl text-primary">
              ${periodo.netoTotal.toLocaleString('es-CO')}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabla de empleados */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Salario Base</TableHead>
                <TableHead className="text-right">Jornales</TableHead>
                <TableHead className="text-right">Cosechas</TableHead>
                <TableHead className="text-right">Devengado</TableHead>
                <TableHead className="text-right">Deducciones</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nominaDetalles.map((detalle) => {
                const colaborador = colaboradores.find((c) => c.id === detalle.colaboradorId);
                return (
                  <TableRow key={detalle.colaboradorId}>
                    <TableCell className="font-medium">
                      {colaborador?.nombres} {colaborador?.apellidos}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{detalle.tipoSalario}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ${detalle.salarioBase.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="text-right">
                      ${detalle.jornales.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="text-right">
                      ${detalle.cosechas.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${detalle.devengado.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="text-right">
                      ${detalle.deducciones.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${detalle.neto.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}