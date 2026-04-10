import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Calculator, FileText } from 'lucide-react';
import { colaboradores } from '../../lib/mockData';

export default function Liquidaciones() {
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState('');
  const [diasTrabajados, setDiasTrabajados] = useState('');
  const [resultado, setResultado] = useState<number | null>(null);

  const calcularCesantias = () => {
    const salario = 1300000; // Ejemplo
    const dias = parseInt(diasTrabajados);
    const cesantias = (salario * dias) / 360;
    setResultado(cesantias);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Liquidaciones y Prestaciones Sociales</h1>
        <p className="text-muted-foreground">Cálculo de cesantías, primas y liquidaciones</p>
      </div>

      <Tabs defaultValue="cesantias" className="space-y-6">
        <TabsList>
          <TabsTrigger value="cesantias">Cesantías</TabsTrigger>
          <TabsTrigger value="intereses">Intereses Cesantías</TabsTrigger>
          <TabsTrigger value="prima">Prima de Servicios</TabsTrigger>
          <TabsTrigger value="vacaciones">Vacaciones</TabsTrigger>
          <TabsTrigger value="final">Liquidación Final</TabsTrigger>
        </TabsList>

        <TabsContent value="cesantias">
          <Card>
            <CardHeader>
              <CardTitle>Simulador de Cesantías</CardTitle>
              <CardDescription>
                Fórmula: (Salario × Días trabajados) / 360
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Colaborador</Label>
                  <Select value={colaboradorSeleccionado} onValueChange={setColaboradorSeleccionado}>
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
                    onChange={(e) => setDiasTrabajados(e.target.value)}
                  />
                </div>
                <Button onClick={calcularCesantias} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular Cesantías
                </Button>
              </div>

              {resultado !== null && (
                <Card className="border-primary bg-primary/5">
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

        <TabsContent value="intereses">
          <Card>
            <CardHeader>
              <CardTitle>Intereses sobre Cesantías</CardTitle>
              <CardDescription>
                Fórmula: Cesantías × 12% × (Días / 360)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Simulador similar al de cesantías aplicando el 12% de interés anual
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prima">
          <Card>
            <CardHeader>
              <CardTitle>Prima de Servicios</CardTitle>
              <CardDescription>
                Fórmula: (Salario × Días trabajados en semestre) / 360
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Calculadora de prima de servicios semestral
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vacaciones">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Vacaciones</CardTitle>
              <CardDescription>
                Días generados, tomados y disponibles por colaborador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <FileText className="mr-2 h-5 w-5" />
                Tabla de saldos de vacaciones por empleado
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="final">
          <Card>
            <CardHeader>
              <CardTitle>Liquidación Final de Contrato</CardTitle>
              <CardDescription>
                Cálculo completo al finalizar relación laboral
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>Nueva Liquidación Final</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
