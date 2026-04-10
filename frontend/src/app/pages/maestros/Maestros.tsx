import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { semillas, insumos, cargos, labores } from '../../lib/mockData';

export default function Maestros() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Maestros y Catálogos</h1>
        <p className="text-muted-foreground">Gestión de datos base del sistema</p>
      </div>

      <Tabs defaultValue="semillas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="semillas">Semillas</TabsTrigger>
          <TabsTrigger value="insumos">Insumos</TabsTrigger>
          <TabsTrigger value="cargos">Cargos</TabsTrigger>
          <TabsTrigger value="labores">Labores</TabsTrigger>
          <TabsTrigger value="conceptos">Conceptos Nómina</TabsTrigger>
          <TabsTrigger value="tablas">Tablas Legales</TabsTrigger>
        </TabsList>

        <TabsContent value="semillas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catálogo de Semillas</CardTitle>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Semilla
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {semillas.map((semilla) => (
                    <TableRow key={semilla.id}>
                      <TableCell>{semilla.tipo}</TableCell>
                      <TableCell className="font-medium">{semilla.nombre}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insumos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catálogo de Insumos</CardTitle>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Insumo
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Unidad de Medida</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map((insumo) => (
                    <TableRow key={insumo.id}>
                      <TableCell className="font-medium">{insumo.nombre}</TableCell>
                      <TableCell>{insumo.unidad}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cargos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catálogo de Cargos</CardTitle>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Cargo
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo Salario</TableHead>
                    <TableHead className="text-right">Salario Base</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cargos.map((cargo) => (
                    <TableRow key={cargo.id}>
                      <TableCell className="font-medium">{cargo.nombre}</TableCell>
                      <TableCell>{cargo.tipoSalario}</TableCell>
                      <TableCell className="text-right">
                        ${cargo.salarioBase.toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labores">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catálogo de Labores</CardTitle>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Labor
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo de Pago</TableHead>
                    <TableHead className="text-right">Valor Base</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labores.map((labor) => (
                    <TableRow key={labor.id}>
                      <TableCell className="font-medium">{labor.nombre}</TableCell>
                      <TableCell>{labor.tipoPago}</TableCell>
                      <TableCell className="text-right">
                        ${labor.valorBase.toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell>{labor.unidad}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conceptos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Conceptos de Nómina</CardTitle>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Concepto
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Tabla con: Código, Tipo, Operación (+/-), Cálculo, Valor, Base, Aplica a, Obligatorio
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tablas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tablas Legales</CardTitle>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Entrada
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Tabla con: Concepto, % Empleado, % Empresa, Vigencia desde/hasta
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
