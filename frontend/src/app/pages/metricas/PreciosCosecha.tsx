import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  CHART_COLORS, gridProps, xAxisProps, yAxisProps, tooltipProps,
} from '../../components/common/chartTheme';
import PageHeader from '../../components/common/PageHeader';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { preciosCosecha } from '../../lib/mockData';

const evolucionData = [
  { mes: 'Ago', precio: 780, produccion: 38000 },
  { mes: 'Sep', precio: 800, produccion: 42000 },
  { mes: 'Oct', precio: 820, produccion: 45000 },
  { mes: 'Nov', precio: 840, produccion: 48000 },
  { mes: 'Dic', precio: 850, produccion: 52000 },
  { mes: 'Ene', precio: 850, produccion: 50000 },
  { mes: 'Feb', precio: 830, produccion: 47000 },
];

export default function PreciosCosecha() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Precios y productividad de cosecha"
        description="Análisis de precios y producción por lote."
        actions={
          <Button variant="outline">
            <Download strokeWidth={2} />
            Exportar
          </Button>
        }
      />

      {/* Gráfica de evolución */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución de precios vs producción</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolucionData}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="mes" {...xAxisProps} />
              <YAxis yAxisId="left" {...yAxisProps} />
              <YAxis yAxisId="right" orientation="right" {...yAxisProps} />
              <Tooltip {...tooltipProps} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="precio"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                name="Precio ($/kg)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="produccion"
                stroke={CHART_COLORS[1]}
                strokeWidth={2}
                name="Producción (kg)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla de precios por lote */}
      <Card>
        <CardHeader>
          <CardTitle>Precios por lote</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead className="text-right">Precio ($/kg)</TableHead>
                <TableHead className="text-right">Producción (kg)</TableHead>
                <TableHead className="text-right">Total Estimado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preciosCosecha.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.lote}</TableCell>
                  <TableCell className="text-right">
                    ${item.precioKg.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.produccion.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${item.totalEstimado.toLocaleString('es-CO')}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">TOTAL</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold">
                  {preciosCosecha
                    .reduce((sum, item) => sum + item.produccion, 0)
                    .toLocaleString('es-CO')}
                </TableCell>
                <TableCell className="text-right font-bold">
                  ${preciosCosecha
                    .reduce((sum, item) => sum + item.totalEstimado, 0)
                    .toLocaleString('es-CO')}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
