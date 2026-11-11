import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Search, Eye, Edit, Plus, Trash2, UserCheck, UserX, FileSpreadsheet,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import EmptyState from '../../components/common/EmptyState';
import TableSkeleton from '../../components/common/TableSkeleton';
import Avatar from '../../components/common/Avatar';
import { num } from '../../lib/formato';
import { colaboradoresApi, buildAvatarUrl } from '../../../api/colaboradores';
import { sortByFirstName } from '../../utils/personas';
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

  // Importación masiva — el dialog ahora maneja el picker de archivo
  // internamente (incluye botón de "Descargar Plantilla").
  const searchMounted = useRef(false);

  const cargar = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const res = await colaboradoresApi.listar({ search: search?.trim() || undefined, per_page: 50 });
      setColaboradores(res.data ?? []);
      setMeta(res.meta ?? {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar colaboradores');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    if (!searchMounted.current) { searchMounted.current = true; return; }
    const t = setTimeout(() => cargar(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm, cargar]);

  const getNombre = (c: any) =>
    c.nombre_completo ||
    [c.primer_nombre, c.segundo_nombre, c.primer_apellido, c.segundo_apellido].filter(Boolean).join(' ');

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

  const handleToggle = (colaborador: any) => setColaboradorToToggle(colaborador);

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

  const activos = colaboradores.filter(c => c.estado === true).length;
  const inactivos = colaboradores.filter(c => c.estado === false).length;

  // Orden alfabetico por PRIMER NOMBRE (convencion del sistema). Desempate
  // por nombre completo. Ignora tildes y mayusculas.
  const colaboradoresOrdenados = sortByFirstName(colaboradores);

  return (
    <div className="space-y-6">
      {/* Alert Dialog eliminar */}
      <AlertDialog open={alertDialog} onOpenChange={setAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              <span>Esto eliminará permanentemente a <strong>{colaboradorToDelete?.nombre}</strong>. Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Dialog */}
      <AlertDialog open={!!colaboradorToToggle} onOpenChange={open => !open && setColaboradorToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{colaboradorToToggle?.estado ? 'Desactivar colaborador' : 'Activar colaborador'}</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que deseas {colaboradorToToggle?.estado ? 'desactivar' : 'activar'} a <strong>{colaboradorToToggle ? getNombre(colaboradorToToggle) : ''}</strong>?
            </AlertDialogDescription>
            {/* API_COLABORADORES — Desde el 2026-09-23 el retiro apaga la
                ficha solo, y una verificación periódica la vuelve a apagar.
                Activar aquí a un retirado se deshace sin que nadie avise:
                el camino real es quitarle la fecha de retiro. */}
            {!colaboradorToToggle?.estado && colaboradorToToggle?.fecha_retiro && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-400">
                Está inactivo porque se registró su retiro el{' '}
                <strong>{colaboradorToToggle.fecha_retiro}</strong>. Activarlo desde aquí no dura:
                el sistema lo vuelve a apagar. Para un reingreso, edite el colaborador y quítele
                la fecha de retiro.
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setColaboradorToToggle(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarToggle}
              className={colaboradorToToggle?.estado ? 'bg-destructive hover:bg-destructive/90' : 'bg-success hover:bg-success/90'}>
              {colaboradorToToggle?.estado ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageHeader
        title="Colaboradores"
        description="Personal de la finca y su documentación."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/colaboradores/importar')}>
              <FileSpreadsheet className="h-4 w-4" strokeWidth={2} />
              Importar
            </Button>
            <Button onClick={() => navigate('/colaboradores/nuevo')}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nuevo colaborador
            </Button>
          </>
        }
      />

      <StatStrip
        loading={loading && colaboradores.length === 0}
        items={[
          { label: 'Total de colaboradores', value: num(meta.total ?? colaboradores.length), note: 'registrados' },
          { label: 'Activos', value: num(activos), note: 'con la ficha encendida' },
          { label: 'Inactivos', value: num(inactivos), note: 'retirados o apagados' },
        ]}
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2>Lista de colaboradores</h2>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
            <Input
              type="search"
              placeholder="Buscar por nombre, cédula o cargo"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <Card className="gap-0">
            <TableSkeleton rows={6} columns={4} avatar />
          </Card>
        ) : colaboradores.length === 0 ? (
          <Card className="gap-0">
            <EmptyState
              title="No se encontraron colaboradores"
              description={searchTerm
                ? 'Ningún colaborador coincide con la búsqueda.'
                : 'Registre el primer colaborador para empezar.'}
              action={searchTerm
                ? { label: 'Limpiar búsqueda', onClick: () => setSearchTerm('') }
                : { label: 'Nuevo colaborador', onClick: () => navigate('/colaboradores/nuevo') }}
            />
          </Card>
        ) : (
          <Card className="gap-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-[13px] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-semibold">Nombre</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Cédula</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Cargo</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {colaboradoresOrdenados.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {c.avatar_url ? (
                            <img
                              src={buildAvatarUrl(c.avatar_url) ?? ''}
                              alt={getNombre(c)}
                              className={`h-9 w-9 shrink-0 rounded-full border border-border object-cover ${c.estado ? '' : 'opacity-60'}`}
                            />
                          ) : (
                            <Avatar nombre={getNombre(c)} className={c.estado ? '' : 'opacity-60'} />
                          )}
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-foreground">{getNombre(c)}</span>
                            <Badge variant={c.estado ? 'success' : 'secondary'} className="mt-1">
                              {c.estado ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground">{c.documento}</td>
                      <td className="px-4 py-3 text-foreground">{c.cargo}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="text-muted-foreground"
                            aria-label="Ver colaborador" title="Ver"
                            onClick={() => navigate(`/colaboradores/${c.id}`)}
                          >
                            <Eye className="h-4 w-4" strokeWidth={2} />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-muted-foreground"
                            aria-label="Editar colaborador" title="Editar"
                            onClick={() => navigate(`/colaboradores/editar/${c.id}`)}
                          >
                            <Edit className="h-4 w-4" strokeWidth={2} />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className={c.estado
                              ? 'text-muted-foreground hover:text-destructive'
                              : 'text-muted-foreground hover:text-success'}
                            aria-label={c.estado ? 'Desactivar colaborador' : 'Activar colaborador'}
                            title={c.estado ? 'Desactivar' : 'Activar'}
                            onClick={() => handleToggle(c)}
                          >
                            {c.estado
                              ? <UserX className="h-4 w-4" strokeWidth={2} />
                              : <UserCheck className="h-4 w-4" strokeWidth={2} />}
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Eliminar colaborador" title="Eliminar"
                            onClick={() => handleEliminar(Number(c.id), getNombre(c))}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}