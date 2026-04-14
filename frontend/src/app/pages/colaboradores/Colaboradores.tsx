import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
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
  TrendingUp,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { colaboradoresApi } from '../../../api/colaboradores';
import { toast } from 'sonner';

export default function Colaboradores() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [alertDialog, setAlertDialog] = useState(false);
  const [colaboradorToDelete, setColaboradorToDelete] = useState<{ id: number; nombre: string } | null>(null);
  const [colaboradorToToggle, setColaboradorToToggle] = useState<any | null>(null);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // ─── Cargar datos ────────────────────────────────────────────────────────────
  const cargar = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const res = await colaboradoresApi.listar({ search: search?.trim() || undefined, per_page: 50 });
      setColaboradores(res.data ?? []);
      setMeta(res.meta ?? {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar colaboradores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => cargar(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm, cargar]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const getNombre = (c: any) =>
    [c.primer_nombre, c.segundo_nombre, c.primer_apellido, c.segundo_apellido]
      .filter(Boolean).join(' ');

  const getIniciales = (c: any) =>
    ((c.primer_nombre?.[0] ?? '') + (c.primer_apellido?.[0] ?? '')).toUpperCase() || '??';

  // ─── Eliminar ────────────────────────────────────────────────────────────────
  const handleEliminar = (id: number, nombre: string) => {
    setColaboradorToDelete({ id, nombre });
    setAlertDialog(true);
  };

  const confirmarEliminar = async () => {
    if (!colaboradorToDelete) return;
    try {
      const res = await colaboradoresApi.eliminar(colaboradorToDelete.id);
      toast.success(res.message ?? 'Colaborador eliminado');
      await cargar(searchTerm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
    setAlertDialog(false);
    setColaboradorToDelete(null);
  };

  const handleToggle = (colaborador: any) => {
    setColaboradorToToggle(colaborador);
  };

  const confirmarToggle = async () => {
    if (!colaboradorToToggle) return;
    try {
      const res = await colaboradoresApi.toggle(Number(colaboradorToToggle.id));
      toast.success(res.message ?? (colaboradorToToggle.estado ? 'Colaborador desactivado' : 'Colaborador activado'));
      await cargar(searchTerm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
    setColaboradorToToggle(null);
  };

  const activos   = colaboradores.filter(c => c.estado === true).length;
  const inactivos = colaboradores.filter(c => c.estado === false).length;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Alert Dialog */}
      <AlertDialog open={alertDialog} onOpenChange={setAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará permanentemente a{' '}
              <strong>{colaboradorToDelete?.nombre}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Dialog */}
      <AlertDialog open={!!colaboradorToToggle} onOpenChange={open => !open && setColaboradorToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {colaboradorToToggle?.estado ? 'Desactivar colaborador' : 'Activar colaborador'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que deseas {colaboradorToToggle?.estado ? 'desactivar' : 'activar'} a{' '}
              <strong>{colaboradorToToggle ? [colaboradorToToggle.primer_nombre, colaboradorToToggle.primer_apellido].filter(Boolean).join(' ') : ''}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setColaboradorToToggle(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarToggle}
              className={colaboradorToToggle?.estado ? 'bg-destructive hover:bg-destructive/90' : 'bg-success hover:bg-success/90'}
            >
              {colaboradorToToggle?.estado ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="space-y-1">
        <h1>Colaboradores</h1>
        <p className="text-lead">Gestión de personal y documentación</p>
      </div>

      {/* Resumen */}
      <div className="space-y-4">
        <h2>Resumen</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Total Colaboradores</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold">{meta.total ?? colaboradores.length}</p>
                <span className="text-sm text-muted-foreground">registrados</span>
              </div>
              <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-primary bg-primary/10 border-primary/20">
                <TrendingUp className="h-4 w-4" />
                <span>Personal</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Colaboradores Activos</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold">{activos}</p>
                <span className="text-sm text-muted-foreground">activos</span>
              </div>
              <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                <Users className="h-4 w-4" />
                <span>Trabajando</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Colaboradores Inactivos</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold">{inactivos}</p>
                <span className="text-sm text-muted-foreground">inactivos</span>
              </div>
              <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-muted-foreground bg-muted/50 border-muted">
                <Users className="h-4 w-4" />
                <span>Sin acceso</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        <div>
          <h2 className="mb-2">Lista de Colaboradores</h2>
          <p className="text-muted-foreground">Todos los colaboradores del sistema</p>
        </div>

        {/* Buscador + botón */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cédula o cargo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando colaboradores...
          </div>
        )}

        {/* Tabla */}
        {!loading && colaboradores.length > 0 && (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Nombre</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Documento</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Cargo</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground hidden md:table-cell">Modalidad</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colaboradores.map((colaborador, index) => (
                      <tr
                        key={colaborador.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${colaborador.estado ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                              {getIniciales(colaborador)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{getNombre(colaborador)}</span>
                              <Badge className={`w-fit mt-1 text-xs ${colaborador.estado ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-muted'}`}>
                                {colaborador.estado ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-foreground">{colaborador.documento}</span>
                          <p className="text-xs text-muted-foreground">{colaborador.tipo_documento}</p>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-foreground">{colaborador.cargo}</span>
                          <p className="text-xs text-muted-foreground">{colaborador.predio?.nombre ?? 'Sin predio'}</p>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <span className="text-sm text-foreground">
                            {colaborador.modalidad_pago === 'FIJO' ? 'Fijo' : 'Variable'}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            ${parseFloat(colaborador.salario_base ?? 0).toLocaleString('es-CO')}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline"
                              onClick={() => handleToggle(colaborador)}
                              className={colaborador.estado ? 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive' : 'hover:bg-success/10 hover:text-success hover:border-success'}
                              title={colaborador.estado ? 'Desactivar' : 'Activar'}>
                              {colaborador.estado
                                ? <ToggleRight className="h-4 w-4 text-success" />
                                : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={() => navigate(`/colaboradores/${colaborador.id}`)}
                              className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                              title="Ver detalle">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={() => navigate(`/colaboradores/editar/${colaborador.id}`)}
                              className="hover:bg-accent/10 hover:text-accent hover:border-accent"
                              title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive"
                              onClick={() => handleEliminar(Number(colaborador.id), getNombre(colaborador))}
                              title="Eliminar">
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
        )}

        {/* Empty state */}
        {!loading && colaboradores.length === 0 && (
          <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontraron colaboradores</p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primer colaborador'}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate('/colaboradores/nuevo')} className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" /> Nuevo Colaborador
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}