import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { ArrowLeft, Shield, Save, CheckSquare, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usuariosApi } from '../../../api/usuarios';

// ─── Estructura de permisos disponibles ──────────────────────────────────────
const MODULOS = [
  {
    id: 'dashboard',
    nombre: 'Dashboard',
    permisos: [
      { id: 'dashboard.ver', nombre: 'Ver', descripcion: 'Acceder al dashboard principal' },
    ],
  },
  {
    id: 'lotes',
    nombre: 'Lotes',
    permisos: [
      { id: 'lotes.ver',      nombre: 'Ver',      descripcion: 'Visualizar listado de lotes' },
      { id: 'lotes.crear',    nombre: 'Crear',    descripcion: 'Registrar nuevos lotes' },
      { id: 'lotes.editar',   nombre: 'Editar',   descripcion: 'Modificar datos de lotes' },
      { id: 'lotes.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar lotes del sistema' },
    ],
  },
  {
    id: 'sublotes',
    nombre: 'Sublotes',
    permisos: [
      { id: 'sublotes.ver',      nombre: 'Ver',      descripcion: 'Visualizar sublotes' },
      { id: 'sublotes.crear',    nombre: 'Crear',    descripcion: 'Crear nuevos sublotes' },
      { id: 'sublotes.editar',   nombre: 'Editar',   descripcion: 'Modificar sublotes' },
      { id: 'sublotes.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar sublotes' },
    ],
  },
  {
    id: 'lineas',
    nombre: 'Líneas',
    permisos: [
      { id: 'lineas.ver',      nombre: 'Ver',      descripcion: 'Visualizar líneas' },
      { id: 'lineas.crear',    nombre: 'Crear',    descripcion: 'Crear nuevas líneas' },
      { id: 'lineas.editar',   nombre: 'Editar',   descripcion: 'Modificar líneas' },
      { id: 'lineas.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar líneas' },
    ],
  },
  {
    id: 'palmas',
    nombre: 'Palmas',
    permisos: [
      { id: 'palmas.ver',      nombre: 'Ver',      descripcion: 'Visualizar palmas' },
      { id: 'palmas.crear',    nombre: 'Crear',    descripcion: 'Registrar nuevas palmas' },
      { id: 'palmas.editar',   nombre: 'Editar',   descripcion: 'Modificar palmas' },
      { id: 'palmas.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar palmas' },
    ],
  },
  {
    id: 'colaboradores',
    nombre: 'Colaboradores',
    permisos: [
      { id: 'colaboradores.ver',      nombre: 'Ver',      descripcion: 'Visualizar listado de colaboradores' },
      { id: 'colaboradores.crear',    nombre: 'Crear',    descripcion: 'Registrar nuevos colaboradores' },
      { id: 'colaboradores.editar',   nombre: 'Editar',   descripcion: 'Modificar datos de colaboradores' },
      { id: 'colaboradores.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar colaboradores del sistema' },
    ],
  },
  {
    id: 'contratos',
    nombre: 'Contratos',
    permisos: [
      { id: 'contratos.ver',      nombre: 'Ver',      descripcion: 'Visualizar contratos' },
      { id: 'contratos.crear',    nombre: 'Crear',    descripcion: 'Crear contratos' },
      { id: 'contratos.editar',   nombre: 'Editar',   descripcion: 'Editar contratos' },
      { id: 'contratos.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar contratos' },
    ],
  },
  {
    id: 'nomina',
    nombre: 'Nómina',
    permisos: [
      { id: 'nomina.ver',      nombre: 'Ver',      descripcion: 'Visualizar nóminas' },
      { id: 'nomina.crear',    nombre: 'Crear',    descripcion: 'Crear nuevas nóminas' },
      { id: 'nomina.aprobar',  nombre: 'Aprobar',  descripcion: 'Aprobar y procesar nóminas' },
    ],
  },
  {
    id: 'operaciones',
    nombre: 'Operaciones',
    permisos: [
      { id: 'operaciones.ver',      nombre: 'Ver',      descripcion: 'Visualizar labores diarias' },
      { id: 'operaciones.crear',    nombre: 'Crear',    descripcion: 'Registrar labores' },
      { id: 'operaciones.editar',   nombre: 'Editar',   descripcion: 'Modificar labores registradas' },
      { id: 'operaciones.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar labores' },
    ],
  },
  {
    id: 'cosecha',
    nombre: 'Cosecha',
    permisos: [
      { id: 'cosecha.ver',      nombre: 'Ver',      descripcion: 'Visualizar cosechas' },
      { id: 'cosecha.crear',    nombre: 'Crear',    descripcion: 'Registrar cosechas' },
      { id: 'cosecha.editar',   nombre: 'Editar',   descripcion: 'Modificar cosechas' },
      { id: 'cosecha.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar cosechas' },
    ],
  },
  {
    id: 'remisiones',
    nombre: 'Viajes',
    permisos: [
      { id: 'remisiones.ver',       nombre: 'Ver',       descripcion: 'Visualizar despachos' },
      { id: 'remisiones.crear',     nombre: 'Crear',     descripcion: 'Registrar nuevos viajes' },
      { id: 'remisiones.finalizar', nombre: 'Finalizar', descripcion: 'Finalizar viajes' },
    ],
  },
  {
    id: 'configuracion',
    nombre: 'Configuración',
    permisos: [
      { id: 'configuracion.ver',    nombre: 'Ver',    descripcion: 'Acceder a configuración' },
      { id: 'configuracion.editar', nombre: 'Editar', descripcion: 'Modificar configuración' },
    ],
  },
  {
    id: 'usuarios',
    nombre: 'Usuarios',
    permisos: [
      { id: 'usuarios.ver',             nombre: 'Ver',             descripcion: 'Visualizar usuarios' },
      { id: 'usuarios.crear',           nombre: 'Crear',           descripcion: 'Crear nuevos usuarios' },
      { id: 'usuarios.editar',          nombre: 'Editar',          descripcion: 'Editar información de usuarios' },
      { id: 'usuarios.editar_permisos', nombre: 'Editar Permisos', descripcion: 'Gestionar permisos de usuarios' },
    ],
  },
];

export default function UsuarioPermisos() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [activos, setActivos]   = useState<Set<string>>(new Set());
  const [usuarioNombre, setUsuarioNombre] = useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  // ── Cargar usuario + permisos actuales ──────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [uRes, pRes] = await Promise.all([
          usuariosApi.getUsuarios(),
          usuariosApi.getPermisos(Number(id)),
        ]);
        const u = (uRes.data ?? []).find((u: any) => String(u.id) === String(id));
        setUsuarioNombre(u?.name ?? '');
        setActivos(new Set(pRes.permisos ?? []));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar permisos');
      } finally { setLoading(false); }
    })();
  }, [id]);

  // ── Guardar ─────────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    setSaving(true);
    try {
      await usuariosApi.updatePermisos(Number(id), { permisos: Array.from(activos) });
      toast.success('Permisos guardados correctamente');
      navigate('/usuarios');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar permisos');
    } finally { setSaving(false); }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const togglePermiso = (permisoId: string) =>
    setActivos(prev => {
      const n = new Set(prev);
      n.has(permisoId) ? n.delete(permisoId) : n.add(permisoId);
      return n;
    });

  const toggleModulo = (modulo: typeof MODULOS[0]) => {
    const ids = modulo.permisos.map(p => p.id);
    const todosActivos = ids.every(pid => activos.has(pid));
    setActivos(prev => {
      const n = new Set(prev);
      todosActivos ? ids.forEach(pid => n.delete(pid)) : ids.forEach(pid => n.add(pid));
      return n;
    });
  };

  const seleccionarTodos = () =>
    setActivos(new Set(MODULOS.flatMap(m => m.permisos.map(p => p.id))));

  const quitarTodos = () => setActivos(new Set());

  const todosModuloActivos = (m: typeof MODULOS[0]) =>
    m.permisos.every(p => activos.has(p.id));

  const algunoModuloActivo = (m: typeof MODULOS[0]) =>
    m.permisos.some(p => activos.has(p.id)) && !todosModuloActivos(m);

  const getContador = (m: typeof MODULOS[0]) =>
    `${m.permisos.filter(p => activos.has(p.id)).length}/${m.permisos.length}`;

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
      <Loader2 className="w-5 h-5 animate-spin" /> Cargando permisos...
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/usuarios">Usuarios</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to={`/usuarios/${id}`}>{usuarioNombre}</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Editar Permisos</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/usuarios/${id}`)}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1 flex-1">
          <h1 className="text-4xl font-bold text-foreground">Editar Permisos</h1>
          <p className="text-muted-foreground">Configura los permisos personalizados para {usuarioNombre}</p>
        </div>
      </div>

      

      {/* Botones globales */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={seleccionarTodos} className="gap-2">
          <CheckSquare className="h-4 w-4" /> Seleccionar Todos
        </Button>
        <Button variant="outline" onClick={quitarTodos} className="gap-2">
          <Square className="h-4 w-4" /> Quitar Todos
        </Button>
      </div>

      {/* Grid 2 columnas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {MODULOS.map(modulo => (
          <Card key={modulo.id} className="glass-subtle border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => toggleModulo(modulo)}
                  className="flex items-center gap-3 cursor-pointer group">
                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                    todosModuloActivos(modulo)   ? 'border-primary bg-primary'
                    : algunoModuloActivo(modulo) ? 'border-primary bg-primary/50'
                    : 'border-border hover:border-primary/50'}`}>
                    {todosModuloActivos(modulo) && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {algunoModuloActivo(modulo) && !todosModuloActivos(modulo) && (
                      <div className="h-2 w-2 bg-white rounded-sm" />
                    )}
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">{modulo.nombre}</CardTitle>
                </button>
                <Badge variant="outline" className="bg-primary/5 border-primary/20">
                  {getContador(modulo)}
                </Badge>
              </div>
              <CardDescription>Permisos del módulo {modulo.nombre}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {modulo.permisos.map(permiso => {
                const isActivo = activos.has(permiso.id);
                return (
                  <div key={permiso.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      isActivo ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                               : 'border-border hover:border-primary/30'}`}>
                    <Checkbox
                      id={permiso.id}
                      checked={isActivo}
                      onCheckedChange={() => togglePermiso(permiso.id)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={permiso.id} className="text-sm font-medium cursor-pointer">
                        {permiso.nombre}
                      </Label>
                      {permiso.descripcion && (
                        <p className="text-xs text-muted-foreground">{permiso.descripcion}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={() => navigate(`/usuarios/${id}`)}>Cancelar</Button>
        <Button onClick={handleGuardar} disabled={saving} className="gap-2 bg-primary hover:bg-primary/90">
          <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar Permisos'}
        </Button>
      </div>
    </div>
  );
}