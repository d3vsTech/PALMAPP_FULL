import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import KPICard from '../../components/common/KPICard';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, Package, TrendingUp, Droplets, MapPin } from 'lucide-react';
import { kpisDashboard } from '../../lib/mockData';

const distribucionLotes = [
  { lote: 'Lote 1', kg: 45000, color: 'hsl(var(--chart-1))' },
  { lote: 'Lote 2', kg: 38000, color: 'hsl(var(--chart-2))' },
  { lote: 'Lote 3', kg: 52000, color: 'hsl(var(--chart-3))' },
];

const laborData = [
  { labor: 'Cosecha', productividad: 145 },
  { labor: 'Plateo', productividad: 88 },
  { labor: 'Poda', productividad: 95 },
  { labor: 'Fertilización', productividad: 72 },
];

export default function EstadisticasGenerales() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estadísticas Generales</h1>
          <p className="text-muted-foreground">Dashboard analítico completo</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Producción Total"
          value={`${kpisDashboard.produccionTotal.toLocaleString('es-CO')} kg`}
          icon={Package}
        />
        <KPICard
          title="Productividad Promedio"
          value={kpisDashboard.productividadPromedio.toFixed(1)}
          icon={TrendingUp}
          subtitle="kg/colaborador"
        />
        <KPICard
          title="Lluvia Acumulada"
          value={`${kpisDashboard.lluviaAcumulada} mm`}
          icon={Droplets}
        />
        <KPICard
          title="Lotes Activos"
          value="3"
          icon={MapPin}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Distribución por lotes */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Producción por Lote</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribucionLotes}
                  dataKey="kg"
                  nameKey="lote"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.lote}: ${((entry.kg / 135000) * 100).toFixed(1)}%`}
                >
                  {distribucionLotes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Productividad por labor */}
        <Card>
          <CardHeader>
            <CardTitle>Productividad por Labor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={laborData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="labor" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="productividad" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
