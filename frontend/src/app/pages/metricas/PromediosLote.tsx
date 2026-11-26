import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  CHART_COLORS, gridProps, xAxisProps, yAxisProps, barProps, barCategoryGap, tooltipProps,
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';

const promediosData = [
  { lote: 'Lote 1 – Norte', ano: 2025, kgPromedio: 1.42, tendencia: 'up', notas: 'Buen desempeño' },
  { lote: 'Lote 2 – Sur', ano: 2025, kgPromedio: 1.38, tendencia: 'stable', notas: 'Consistente' },
  { lote: 'Lote 3 – Este', ano: 2025, kgPromedio: 1.35, tendencia: 'down', notas: 'Requiere atención' },
];

const chartData = promediosData.map((item) => ({
  lote: item.lote.split(' – ')[0],
  kg: item.kgPromedio,
}));

export default function PromediosLote() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Promedios por lote"
        description="Análisis histórico de producción por lote."
        actions={
          <Button variant="outline">
            <Download strokeWidth={2} />
            Exportar
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Kg promedio por gajo - comparativo por lote</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barCategoryGap={barCategoryGap}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="lote" {...xAxisProps} />
              <YAxis domain={[0, 2]} {...yAxisProps} />
              <Tooltip {...tooltipProps} />
              <Legend />
              <Bar dataKey="kg" fill={CHART_COLORS[0]} name="Kg promedio" {...barProps} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de promedios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead className="text-center">Año</TableHead>
                <TableHead className="text-right">Kg Promedio por Gajo</TableHead>
                <TableHead className="text-center">Tendencia</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promediosData.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.lote}</TableCell>
                  <TableCell className="text-center">{item.ano}</TableCell>
                  <TableCell className="text-right font-semibold">{item.kgPromedio}</TableCell>
                  <TableCell className="text-center">
                    {item.tendencia === 'up' && <TrendingUp className="inline h-4 w-4 text-success" />}
                    {item.tendencia === 'down' && <TrendingDown className="inline h-4 w-4 text-destructive" />}
                    {item.tendencia === 'stable' && <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.notas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
