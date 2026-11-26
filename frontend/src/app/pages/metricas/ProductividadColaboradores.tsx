import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  CHART_COLORS, gridProps, xAxisProps, yAxisProps, barProps, barCategoryGap, tooltipProps,
} from '../../components/common/chartTheme';
import PageHeader from '../../components/common/PageHeader';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { productividadColaboradores } from '../../lib/mockData';

export default function ProductividadColaboradores() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = productividadColaboradores.filter((item) =>
    item.colaborador.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = filteredData.map((item) => ({
    nombre: item.colaborador.split(' ')[0],
    rendimiento: item.rendimiento,
  }));

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productividad de colaboradores"
        description="Rendimiento del equipo en el período."
      />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gráfica de barras */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento por colaborador (kg)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barCategoryGap={barCategoryGap}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="nombre" {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="rendimiento" fill={CHART_COLORS[0]} {...barProps} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla de datos */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de productividad</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-right">Gajos</TableHead>
                <TableHead className="text-right">Kg</TableHead>
                <TableHead className="text-right">Jornales</TableHead>
                <TableHead className="text-right">Rendimiento (kg/jornal)</TableHead>
                <TableHead className="text-center">Tendencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.colaborador}</TableCell>
                  <TableCell className="text-right">{item.gajos.toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-right">{item.kg.toLocaleString('es-CO')}</TableCell>
                  <TableCell className="text-right">{item.jornales}</TableCell>
                  <TableCell className="text-right font-medium">{item.rendimiento}</TableCell>
                  <TableCell className="text-center">{getTrendIcon(item.tendencia)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
