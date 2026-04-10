import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
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

const comparativoData = [
  { mes: 'Ene', ano2025: 48000, ano2026: 50000 },
  { mes: 'Feb', ano2025: 45000, ano2026: 47000 },
  { mes: 'Mar', ano2025: 42000, ano2026: 52000 },
  { mes: 'Abr', ano2025: 46000, ano2026: null },
  { mes: 'May', ano2025: 49000, ano2026: null },
];

const resumenData = [
  { concepto: 'Producción Total', ano2025: '230,000 kg', ano2026: '149,000 kg', variacion: '+8.2%' },
  { concepto: 'Promedio Mensual', ano2025: '46,000 kg', ano2026: '49,667 kg', variacion: '+8.0%' },
  { concepto: 'Kg por Gajo', ano2025: '1.38', ano2026: '1.41', variacion: '+2.2%' },
];

export default function ComparativosHistoricos() {
  const [loteSeleccionado, setLoteSeleccionado] = useState('todos');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comparativos Históricos</h1>
          <p className="text-muted-foreground">Análisis año vs año</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <Select value={loteSeleccionado} onValueChange={setLoteSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar lote" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los lotes</SelectItem>
                  <SelectItem value="lote1">Lote 1 – Norte</SelectItem>
                  <SelectItem value="lote2">Lote 2 – Sur</SelectItem>
                  <SelectItem value="lote3">Lote 3 – Este</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfica comparativa */}
      <Card>
        <CardHeader>
          <CardTitle>Producción Mensual - 2025 vs 2026</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={comparativoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="ano2025"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                name="2025"
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="ano2026"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                name="2026"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla resumen */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Comparativo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">2025</TableHead>
                <TableHead className="text-right">2026 (YTD)</TableHead>
                <TableHead className="text-right">Variación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumenData.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.concepto}</TableCell>
                  <TableCell className="text-right">{item.ano2025}</TableCell>
                  <TableCell className="text-right">{item.ano2026}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-success">{item.variacion}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
