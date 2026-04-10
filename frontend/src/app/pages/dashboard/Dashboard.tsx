import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { KPICard } from '../../components/dashboard/KPICard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Truck, Cloud } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../../components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type FilterPreset = 'week' | 'fortnight' | 'month';

export default function Dashboard() {
  const { user } = useAuth();

  // Estado para el filtro de fechas
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('fortnight');
  const [fechaInicio, setFechaInicio] = useState<string>(
    format(subDays(new Date(), 15), 'yyyy-MM-dd')
  );
  const [fechaFin, setFechaFin] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Función para actualizar fechas según el preset
  const handlePresetChange = (preset: FilterPreset) => {
    setFilterPreset(preset);
    const today = new Date();
    let startDate: Date;

    switch (preset) {
      case 'week':
        startDate = subDays(today, 7);
        break;
      case 'fortnight':
        startDate = subDays(today, 15);
        break;
      case 'month':
        startDate = subDays(today, 30);
        break;
      default:
        startDate = subDays(today, 15);
    }

    setFechaInicio(format(startDate, 'yyyy-MM-dd'));
    setFechaFin(format(today, 'yyyy-MM-dd'));
  };

  // Datos mock para promedio kg por lote
  const promediosPorLote = useMemo(() => [
    { id: 'L-001', nombre: 'Lote Norte A', promedioKg: 194.0 },
    { id: 'L-002', nombre: 'Lote Sur B', promedioKg: 174.7 },
    { id: 'L-003', nombre: 'Lote Este C', promedioKg: 134.5 },
    { id: 'L-004', nombre: 'Lote Oeste D', promedioKg: 165.0 },
  ], []);

  // Datos mock para viajes
  const viajesMock = useMemo(() => [
    { id: 'V-001', fecha: '2026-04-07', destino: 'Extractora Central', kg: 4500, estado: 'Completado' },
    { id: 'V-002', fecha: '2026-04-06', destino: 'Extractora Norte', kg: 3850, estado: 'Completado' },
    { id: 'V-003', fecha: '2026-04-05', destino: 'Extractora Central', kg: 4200, estado: 'Completado' },
    { id: 'V-004', fecha: '2026-04-04', destino: 'Extractora Sur', kg: 3650, estado: 'Completado' },
  ], []);

  const totalViajes = viajesMock.reduce((acc, viaje) => acc + viaje.kg, 0);

  return (
    <div className="space-y-6">
      {/* Header con bienvenida */}
      <div className="space-y-1">
        <h1>¡Bienvenido, {user?.nombre}!</h1>
        <p className="text-lead">Resumen de producción de tu plantación</p>
      </div>

      {/* Filtro de Fechas */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            {/* Título */}
            <h3 className="whitespace-nowrap">
              Filtro de Fechas
            </h3>

            {/* Botones de periodo */}
            <div className="flex gap-2">
              <Button
                variant={filterPreset === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetChange('week')}
                className={filterPreset === 'week' ? 'bg-primary hover:bg-primary/90' : ''}
              >
                Semanal
              </Button>
              <Button
                variant={filterPreset === 'fortnight' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetChange('fortnight')}
                className={filterPreset === 'fortnight' ? 'bg-primary hover:bg-primary/90' : ''}
              >
                Quincenal
              </Button>
              <Button
                variant={filterPreset === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetChange('month')}
                className={filterPreset === 'month' ? 'bg-primary hover:bg-primary/90' : ''}
              >
                Mensual
              </Button>
            </div>

            {/* Espaciador para empujar las fechas a la derecha */}
            <div className="flex-1" />

            {/* Fecha inicio */}
            <div className="space-y-1.5">
              <Label htmlFor="fechaInicio" className="text-sm font-medium">Fecha Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                className="h-9 w-[140px]"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            {/* Fecha fin */}
            <div className="space-y-1.5">
              <Label htmlFor="fechaFin" className="text-sm font-medium">Fecha Fin</Label>
              <Input
                id="fechaFin"
                type="date"
                className="h-9 w-[140px]"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>

            {/* Botón Aplicar */}
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 h-9 px-6 self-end"
            >
              Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Principales */}
      <div className="space-y-4">
        <h2>Indicadores Principales</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <KPICard
            title="Producción Total"
            value="17,320"
            subtitle="kg"
          />
          <KPICard
            title="Promedio Kg/Gajo"
            value="0.131"
            subtitle="kg (plantación)"
          />
          <KPICard
            title="Viajes"
            value={totalViajes.toLocaleString('es-CO')}
            subtitle="kg transportados"
          />
        </div>
      </div>

      {/* Promedio kg por lote */}
      <div className="space-y-4">
        <h2>Promedio kg por Lote</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {promediosPorLote.map((lote) => (
            <Card key={lote.id} className="border-border">
              <CardHeader className="pb-3">
                <CardTitle>{lote.nombre}</CardTitle>
                <p className="text-sm text-muted-foreground">{lote.id}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-4xl font-bold">{lote.promedioKg}</p>
                  <p className="text-sm text-muted-foreground">kg promedio</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Viajes */}
      <div className="space-y-4">
        <h2>Viajes</h2>
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <CardTitle>Registro de Viajes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={viajesMock}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="id" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ 
                    value: 'kg', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: 'hsl(var(--muted-foreground))' }
                  }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString('es-CO')} kg`, 'Kilogramos']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  labelFormatter={(label) => {
                    const viaje = viajesMock.find(v => v.id === label);
                    return viaje ? `${label} - ${format(new Date(viaje.fecha), 'd MMM yyyy', { locale: es })}` : label;
                  }}
                />
                <Bar 
                  dataKey="kg" 
                  fill="#1E5631" 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lluvias */}
      <div className="space-y-4">
        <h2>Lluvias</h2>
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              <CardTitle>Registro de Precipitaciones</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Semana Actual</p>
                <p className="text-4xl font-bold">145</p>
                <p className="text-xs text-muted-foreground">mm acumulados</p>
              </div>
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Semana Anterior</p>
                <p className="text-4xl font-bold">182</p>
                <p className="text-xs text-muted-foreground">mm acumulados</p>
              </div>
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Mes Actual</p>
                <p className="text-4xl font-bold">520</p>
                <p className="text-xs text-muted-foreground">mm acumulados</p>
              </div>
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Promedio Mensual</p>
                <p className="text-4xl font-bold">485</p>
                <p className="text-xs text-muted-foreground">mm histórico</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}