import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Users,
  Search,
  Eye,
  Edit,
  Plus,
  Trash2,
  TrendingUp
} from 'lucide-react';

interface Colaborador {
  id: string;
  nombre: string;
  cedula: string;
  cargo: string;
  modalidadPago: 'Fijo' | 'Producción';
  salarioBase: number;
  estado: 'Activo' | 'Inactivo';
  fechaIngreso: string;
}

export default function Colaboradores() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [alertDialog, setAlertDialog] = useState(false);
  const [colaboradorToDelete, setColaboradorToDelete] = useState<{ id: string; nombre: string } | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([
    { id: 'c1', nombre: 'Carlos Rodríguez García', cedula: '1.234.567.890', cargo: 'Operario de Campo', modalidadPago: 'Producción', salarioBase: 1300000, estado: 'Activo', fechaIngreso: '2020-03-15' },
    { id: 'c2', nombre: 'María González López', cedula: '2.345.678.901', cargo: 'Operaria de Campo', modalidadPago: 'Fijo', salarioBase: 1500000, estado: 'Activo', fechaIngreso: '2019-08-22' },
    { id: 'c3', nombre: 'Luis Martínez Pérez', cedula: '3.456.789.012', cargo: 'Supervisor', modalidadPago: 'Fijo', salarioBase: 2000000, estado: 'Activo', fechaIngreso: '2018-01-10' },
    { id: 'c4', nombre: 'Ana Ramírez Torres', cedula: '4.567.890.123', cargo: 'Operaria de Campo', modalidadPago: 'Producción', salarioBase: 1300000, estado: 'Activo', fechaIngreso: '2021-05-18' },
    { id: 'c5', nombre: 'Pedro Sánchez Ruiz', cedula: '5.678.901.234', cargo: 'Operario de Campo', modalidadPago: 'Fijo', salarioBase: 1400000, estado: 'Inactivo', fechaIngreso: '2019-02-10' },
    { id: 'c6', nombre: 'Juliana Herrera Castillo', cedula: '6.789.012.345', cargo: 'Operaria de Campo', modalidadPago: 'Producción', salarioBase: 1350000, estado: 'Activo', fechaIngreso: '2022-09-05' },
    { id: 'c7', nombre: 'Roberto Vargas Mendoza', cedula: '7.890.123.456', cargo: 'Jefe de Campo', modalidadPago: 'Fijo', salarioBase: 3500000, estado: 'Activo', fechaIngreso: '2017-04-20' },
  ]);

  const filteredColaboradores = colaboradores.filter(col =>
    col.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    col.cedula.includes(searchTerm) ||
    col.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEliminar = (id: string, nombre: string) => {
    setColaboradorToDelete({ id, nombre });
    setAlertDialog(true);
  };

  const confirmarEliminar = () => {
    if (!colaboradorToDelete) return;
    setColaboradores(colaboradores.filter(c => c.id !== colaboradorToDelete.id));
    setAlertDialog(false);
    setColaboradorToDelete(null);
  };

  const getIniciales = (nombre: string) => {
    const partes = nombre.split(' ');
    return partes.length > 1
      ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
      : nombre.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Alert Dialog */}
      <AlertDialog open={alertDialog} onOpenChange={setAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              <span>
                Esto eliminará permanentemente a <strong>{colaboradorToDelete?.nombre}</strong>.
                Esta acción no se puede deshacer.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminar}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="space-y-1 mb-6">
        <h1>Colaboradores</h1>
        <p className="text-lead">Gestión de personal y documentación</p>
      </div>

      {/* Resumen */}
      <div className="space-y-4">
        <h2>Resumen</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Total Colaboradores</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold">{colaboradores.length}</p>
                    <span className="text-sm text-muted-foreground">registrados</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-primary bg-primary/10 border-primary/20">
                    <TrendingUp className="h-4 w-4" />
                    <span>Personal</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Colaboradores Activos</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold">{colaboradores.filter(c => c.estado === 'Activo').length}</p>
                    <span className="text-sm text-muted-foreground">activos</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                    <Users className="h-4 w-4" />
                    <span>Trabajando</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Colaboradores Inactivos</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold">{colaboradores.filter(c => c.estado === 'Inactivo').length}</p>
                    <span className="text-sm text-muted-foreground">inactivos</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-muted-foreground bg-muted/50 border-muted">
                    <Users className="h-4 w-4" />
                    <span>Sin acceso</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lista de Colaboradores */}
      <div className="space-y-4">
        <div>
          <h2 className="mb-2">Lista de Colaboradores</h2>
          <p className="text-muted-foreground">Todos los colaboradores del sistema</p>
        </div>

        {/* Buscador y botón nuevo - de lado a lado */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre, cédula o cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => navigate('/colaboradores/nuevo')}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus className="h-5 w-5" />
            Nuevo Colaborador
          </Button>
        </div>

        {/* Lista de colaboradores en formato tabla */}
        {filteredColaboradores.length > 0 ? (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Nombre</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Cédula</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Cargo</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredColaboradores.map((colaborador, index) => (
                      <tr
                        key={colaborador.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              colaborador.estado === 'Activo'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}>
                              {getIniciales(colaborador.nombre)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{colaborador.nombre}</span>
                              <Badge className={`w-fit mt-1 text-xs ${
                                colaborador.estado === 'Activo'
                                  ? 'bg-success/10 text-success border-success/20'
                                  : 'bg-muted text-muted-foreground border-muted'
                              }`}>
                                {colaborador.estado}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-foreground">{colaborador.cedula}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-foreground">{colaborador.cargo}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/colaboradores/${colaborador.id}`)}
                              className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/colaboradores/editar/${colaborador.id}`)}
                              className="hover:bg-accent/10 hover:text-accent hover:border-accent"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleEliminar(colaborador.id, colaborador.nombre)}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontraron colaboradores</p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primer colaborador'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => navigate('/colaboradores/nuevo')}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Colaborador
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}