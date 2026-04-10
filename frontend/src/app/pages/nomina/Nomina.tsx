import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, FileText, Calculator, Palmtree, TrendingUp, TrendingDown } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { nominaPeriodos, colaboradores } from '../../lib/mockData';
import { CrearNominaModal } from '../../components/nomina/CrearNominaModal';
import { LiquidacionFinalModal } from '../../components/liquidaciones/LiquidacionFinalModal';
import { CrearVacacionesModal } from '../../components/liquidaciones/CrearVacacionesModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

// Mock data para vacaciones
const vacacionesData = [
  { id: 'v1', colaboradorId: 'c1', nombres: 'Carlos', apellidos: 'Rodríguez', diasGenerados: 30, diasTomados: 15, diasPagados: 0, diasDisponibles: 15 },
  { id: 'v2', colaboradorId: 'c2', nombres: 'María', apellidos: 'González', diasGenerados: 30, diasTomados: 10, diasPagados: 5, diasDisponibles: 15 },
];

export default function Nomina() {
  const [openModalNomina, setOpenModalNomina] = useState(false);
  const [openModalLiquidacion, setOpenModalLiquidacion] = useState(false);
  const [openModalVacaciones, setOpenModalVacaciones] = useState(false);
  
  // Simuladores
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState('');
  const [diasTrabajados, setDiasTrabajados] = useState('');
  const [resultado, setResultado] = useState<number | null>(null);
  const [tipoCalculo, setTipoCalculo] = useState<'cesantias' | 'intereses' | 'prima'>('cesantias');

  const calcularCesantias = () => {
    const colaborador = colaboradores.find((c) => c.id === colaboradorSeleccionado);
    if (!colaborador) return;
    
    const salario = colaborador.salarioBase;
    const subsidioTransporte = salario <= (2 * 1423500) ? 140606 : 0;
    const dias = parseInt(diasTrabajados);
    const cesantias = ((salario + subsidioTransporte) * dias) / 360;
    setResultado(cesantias);
  };

  const calcularIntereses = () => {
    const colaborador = colaboradores.find((c) => c.id === colaboradorSeleccionado);
    if (!colaborador) return;
    
    const salario = colaborador.salarioBase;
    const subsidioTransporte = salario <= (2 * 1423500) ? 140606 : 0;
    const dias = parseInt(diasTrabajados);
    const cesantias = ((salario + subsidioTransporte) * dias) / 360;
    const intereses = (cesantias * 0.12 * dias) / 360;
    setResultado(intereses);
  };

  const calcularPrima = () => {
    const colaborador = colaboradores.find((c) => c.id === colaboradorSeleccionado);
    if (!colaborador) return;
    
    const salario = colaborador.salarioBase;
    const subsidioTransporte = salario <= (2 * 1423500) ? 140606 : 0;
    const dias = parseInt(diasTrabajados);
    const prima = ((salario + subsidioTransporte) * dias) / 360;
    setResultado(prima);
  };

  const handleCalcular = () => {
    if (tipoCalculo === 'cesantias') calcularCesantias();
    else if (tipoCalculo === 'intereses') calcularIntereses();
    else if (tipoCalculo === 'prima') calcularPrima();
  };

  const handleCrearNomina = (data: { ano: number; mes: number; quincena: number }) => {
    console.log('Crear nómina:', data);
    // Aquí iría la lógica para crear la nómina
  };

  const handleGuardarLiquidacion = (liquidacion: any) => {
    console.log('Guardar liquidación:', liquidacion);
  };

  const handleGuardarVacaciones = (vacaciones: any) => {
    console.log('Guardar vacaciones:', vacaciones);
  };

  const totalNominasActivas = nominaPeriodos.filter(p => p.estado === 'Borrador').length;
  const totalNominasCerradas = nominaPeriodos.filter(p => p.estado === 'Cerrada').length;

  return (
    <div className="space-y-6">
      {/* Modales */}
      <CrearNominaModal
        isOpen={openModalNomina}
        onClose={() => setOpenModalNomina(false)}
        onSave={handleCrearNomina}
      />
      
      <LiquidacionFinalModal
        isOpen={openModalLiquidacion}
        onClose={() => setOpenModalLiquidacion(false)}
        colaboradores={colaboradores.map(c => ({
          ...c,
          fechaIngreso: c.fechaIngreso || '2020-01-01'
        }))}
        onSave={handleGuardarLiquidacion}
      />

      <CrearVacacionesModal
        isOpen={openModalVacaciones}
        onClose={() => setOpenModalVacaciones(false)}
        colaboradores={colaboradores.map(c => ({
          id: c.id,
          nombres: c.nombres,
          apellidos: c.apellidos,
          diasVacacionesDisponibles: 15
        }))}
        onSave={handleGuardarVacaciones}
      />

      {/* Header ultra-moderno */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-3xl border border-primary/30 p-10 shadow-2xl shadow-primary/10">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-accent/30 to-accent/5 blur-3xl" />
        
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-sm border border-primary/30 px-4 py-2 shadow-lg shadow-primary/20">
            <div className="relative h-2.5 w-2.5">
              <div className="absolute inset-0 rounded-full bg-primary animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-primary blur-sm animate-pulse" />
            </div>
            <span className="text-sm font-semibold text-primary">Gestión de Nómina</span>
          </div>
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text">
            Nómina y Liquidaciones
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            Gestión de períodos de nómina, desprendibles y prestaciones sociales
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Nóminas en Borrador
            </CardDescription>
            <CardTitle className="text-4xl font-bold text-primary">{totalNominasActivas}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-success" />
              Nóminas Cerradas
            </CardDescription>
            <CardTitle className="text-4xl font-bold text-success">{totalNominasCerradas}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-accent" />
              Total Períodos
            </CardDescription>
            <CardTitle className="text-4xl font-bold text-accent">{nominaPeriodos.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="nomina" className="space-y-6">
        <TabsList className="bg-muted/50 backdrop-blur-sm">
          <TabsTrigger value="nomina" className="gap-2">
            <FileText className="h-4 w-4" />
            Nómina
          </TabsTrigger>
          <TabsTrigger value="liquidaciones" className="gap-2">
            <Calculator className="h-4 w-4" />
            Liquidaciones
          </TabsTrigger>
        </TabsList>

        {/* Tab de Nómina */}
        <TabsContent value="nomina" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={() => setOpenModalNomina(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Nómina
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {nominaPeriodos.map((periodo) => (
              <Card key={periodo.id} className="group relative transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <StatusBadge status={periodo.estado as any} />
                  </div>
                  <CardTitle className="mt-2">{periodo.periodo}</CardTitle>
                  <CardDescription>
                    {periodo.mes}/{periodo.ano} - Quincena {periodo.quincena}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-success" />
                        Devengado:
                      </span>
                      <span className="font-medium text-success">
                        ${periodo.devengadoTotal.toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="h-3 w-3 text-destructive" />
                        Deducciones:
                      </span>
                      <span className="font-medium text-destructive">
                        ${periodo.deduccionesTotal.toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Neto:</span>
                      <span className="font-semibold text-primary">
                        ${periodo.netoTotal.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/nomina/${periodo.id}`}>Ver Detalle</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {nominaPeriodos.length === 0 && (
            <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">No hay períodos de nómina</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Comienza creando tu primer período de nómina
                </p>
                <Button onClick={() => setOpenModalNomina(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Nómina
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab de Liquidaciones */}
        <TabsContent value="liquidaciones" className="space-y-6">
          <Tabs defaultValue="cesantias" className="space-y-6">
            <TabsList className="bg-muted/50 backdrop-blur-sm">
              <TabsTrigger value="cesantias">Cesantías</TabsTrigger>
              <TabsTrigger value="intereses">Intereses Cesantías</TabsTrigger>
              <TabsTrigger value="prima">Prima de Servicios</TabsTrigger>
              <TabsTrigger value="vacaciones">Vacaciones</TabsTrigger>
              <TabsTrigger value="final">Liquidación Final</TabsTrigger>
            </TabsList>

            {/* Cesantías */}
            <TabsContent value="cesantias">
              <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Simulador de Cesantías
                  </CardTitle>
                  <CardDescription>
                    Fórmula: (Salario + Subsidio Transporte) × Días trabajados / 360
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Colaborador</Label>
                      <Select value={colaboradorSeleccionado} onValueChange={(val) => { setColaboradorSeleccionado(val); setResultado(null); setTipoCalculo('cesantias'); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un colaborador" />
                        </SelectTrigger>
                        <SelectContent>
                          {colaboradores.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombres} {c.apellidos} - ${c.salarioBase.toLocaleString('es-CO')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Días Trabajados</Label>
                      <Input
                        type="number"
                        placeholder="180"
                        value={diasTrabajados}
                        onChange={(e) => { setDiasTrabajados(e.target.value); setResultado(null); }}
                      />
                    </div>
                    <Button onClick={handleCalcular} className="w-full" disabled={!colaboradorSeleccionado || !diasTrabajados}>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calcular Cesantías
                    </Button>
                  </div>

                  {resultado !== null && (
                    <Card className="border-primary bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle>Resultado</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-primary">
                          ${resultado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Valor de cesantías a pagar
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Intereses sobre Cesantías */}
            <TabsContent value="intereses">
              <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Intereses sobre Cesantías
                  </CardTitle>
                  <CardDescription>
                    Fórmula: Cesantías × 12% × (Días / 360)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Colaborador</Label>
                      <Select value={colaboradorSeleccionado} onValueChange={(val) => { setColaboradorSeleccionado(val); setResultado(null); setTipoCalculo('intereses'); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un colaborador" />
                        </SelectTrigger>
                        <SelectContent>
                          {colaboradores.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombres} {c.apellidos}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Días Trabajados</Label>
                      <Input
                        type="number"
                        placeholder="180"
                        value={diasTrabajados}
                        onChange={(e) => { setDiasTrabajados(e.target.value); setResultado(null); }}
                      />
                    </div>
                    <Button onClick={handleCalcular} className="w-full" disabled={!colaboradorSeleccionado || !diasTrabajados}>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calcular Intereses
                    </Button>
                  </div>

                  {resultado !== null && (
                    <Card className="border-primary bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle>Resultado</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-primary">
                          ${resultado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Valor de intereses sobre cesantías
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Prima de Servicios */}
            <TabsContent value="prima">
              <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Prima de Servicios
                  </CardTitle>
                  <CardDescription>
                    Fórmula: (Salario + Subsidio Transporte) × Días trabajados en semestre / 360
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Colaborador</Label>
                      <Select value={colaboradorSeleccionado} onValueChange={(val) => { setColaboradorSeleccionado(val); setResultado(null); setTipoCalculo('prima'); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un colaborador" />
                        </SelectTrigger>
                        <SelectContent>
                          {colaboradores.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombres} {c.apellidos}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Días Trabajados en Semestre</Label>
                      <Input
                        type="number"
                        placeholder="180"
                        value={diasTrabajados}
                        onChange={(e) => { setDiasTrabajados(e.target.value); setResultado(null); }}
                      />
                    </div>
                    <Button onClick={handleCalcular} className="w-full" disabled={!colaboradorSeleccionado || !diasTrabajados}>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calcular Prima
                    </Button>
                  </div>

                  {resultado !== null && (
                    <Card className="border-primary bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle>Resultado</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-primary">
                          ${resultado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Valor de prima de servicios
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vacaciones */}
            <TabsContent value="vacaciones">
              <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Palmtree className="h-5 w-5 text-success" />
                        Gestión de Vacaciones
                      </CardTitle>
                      <CardDescription>
                        Días generados, tomados y disponibles por colaborador
                      </CardDescription>
                    </div>
                    <Button onClick={() => setOpenModalVacaciones(true)} className="bg-success hover:bg-success/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva Solicitud
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Colaborador</TableHead>
                          <TableHead className="text-center">Días Generados</TableHead>
                          <TableHead className="text-center">Días Tomados</TableHead>
                          <TableHead className="text-center">Días Pagados</TableHead>
                          <TableHead className="text-center">Días Disponibles</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vacacionesData.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.nombres} {v.apellidos}</TableCell>
                            <TableCell className="text-center">{v.diasGenerados}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{v.diasTomados}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{v.diasPagados}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-success">{v.diasDisponibles}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Liquidación Final */}
            <TabsContent value="final">
              <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Liquidación Final de Contrato
                  </CardTitle>
                  <CardDescription>
                    Cálculo completo al finalizar relación laboral
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Genera una liquidación final completa con todos los conceptos legales
                    </p>
                    <Button onClick={() => setOpenModalLiquidacion(true)} className="bg-primary hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva Liquidación Final
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}