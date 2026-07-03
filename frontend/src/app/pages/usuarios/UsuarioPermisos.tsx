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
// Una card por ítem del menú lateral. Los módulos con varios sub-módulos
// (Mi Plantación, Operaciones) usan `secciones` para sub-grupar.
// Alineado con backend: database/seeders/RolesAndPermissionsSeeder.php
type Permiso = { id: string; nombre: string; descripcion: string };
type Seccion = { titulo: string; permisos: Permiso[] };
type Modulo = {
  id: string;
  nombre: string;
  permisos?: Permiso[];   // Para módulos sencillos (1 grupo)
  secciones?: Seccion[];  // Para módulos con sub-módulos (Mi Plantación, etc.)
  nota?: string;          // Mensaje informativo cuando no hay permisos editables
};

const MODULOS: Modulo[] = [
  {
    id: 'dashboard',
    nombre: 'Dashboard',
    permisos: [
      { id: 'dashboard.ver', nombre: 'Ver', descripcion: 'Acceder al dashboard principal' },
    ],
  },
  {
    id: 'plantacion',
    nombre: 'Mi Plantación',
    secciones: [
      {
        titulo: 'Lotes',
        permisos: [
          { id: 'lotes.ver',      nombre: 'Ver',      descripcion: 'Visualizar listado de lotes' },
          { id: 'lotes.crear',    nombre: 'Crear',    descripcion: 'Registrar nuevos lotes' },
          { id: 'lotes.editar',   nombre: 'Editar',   descripcion: 'Modificar datos de lotes' },
          { id: 'lotes.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar lotes del sistema' },
        ],
      },
      {
        titulo: 'Sublotes',
        permisos: [
          { id: 'sublotes.ver',      nombre: 'Ver',      descripcion: 'Visualizar sublotes' },
          { id: 'sublotes.crear',    nombre: 'Crear',    descripcion: 'Crear nuevos sublotes' },
          { id: 'sublotes.editar',   nombre: 'Editar',   descripcion: 'Modificar sublotes' },
          { id: 'sublotes.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar sublotes' },
        ],
      },
      {
        titulo: 'Líneas',
        permisos: [
          { id: 'lineas.ver',      nombre: 'Ver',      descripcion: 'Visualizar líneas' },
          { id: 'lineas.crear',    nombre: 'Crear',    descripcion: 'Crear nuevas líneas' },
          { id: 'lineas.editar',   nombre: 'Editar',   descripcion: 'Modificar líneas' },
          { id: 'lineas.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar líneas' },
        ],
      },
      {
        titulo: 'Palmas',
        permisos: [
          { id: 'palmas.ver',      nombre: 'Ver',      descripcion: 'Visualizar palmas' },
          { id: 'palmas.crear',    nombre: 'Crear',    descripcion: 'Registrar nuevas palmas' },
          { id: 'palmas.editar',   nombre: 'Editar',   descripcion: 'Modificar palmas' },
          { id: 'palmas.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar palmas' },
        ],
      },
    ],
  },
  {
    id: 'colaboradores',
    nombre: 'Colaboradores',
    secciones: [
      {
        titulo: 'Colaboradores',
        permisos: [
          { id: 'colaboradores.ver',      nombre: 'Ver',      descripcion: 'Visualizar colaboradores' },
          { id: 'colaboradores.crear',    nombre: 'Crear',    descripcion: 'Registrar nuevos colaboradores' },
          { id: 'colaboradores.editar',   nombre: 'Editar',   descripcion: 'Modificar datos de colaboradores' },
          { id: 'colaboradores.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar colaboradores' },
        ],
      },
      {
        titulo: 'Contratos',
        permisos: [
          { id: 'contratos.ver',      nombre: 'Ver',      descripcion: 'Visualizar contratos' },
          { id: 'contratos.crear',    nombre: 'Crear',    descripcion: 'Crear contratos' },
          { id: 'contratos.editar',   nombre: 'Editar',   descripcion: 'Editar contratos' },
          { id: 'contratos.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar contratos' },
        ],
      },
    ],
  },
  {
    id: 'operaciones',
    nombre: 'Operaciones',
    secciones: [
      {
        titulo: 'Planilla',
        permisos: [
          { id: 'operaciones.ver',      nombre: 'Ver',      descripcion: 'Visualizar planillas' },
          { id: 'operaciones.crear',    nombre: 'Crear',    descripcion: 'Crear planillas' },
          { id: 'operaciones.editar',   nombre: 'Editar',   descripcion: 'Modificar planillas' },
          { id: 'operaciones.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar planillas' },
          { id: 'operaciones.aprobar',  nombre: 'Aprobar',  descripcion: 'Aprobar planillas' },
        ],
      },
      {
        titulo: 'Cosecha',
        permisos: [
          { id: 'cosecha.ver',      nombre: 'Ver',      descripcion: 'Visualizar cosechas' },
          { id: 'cosecha.crear',    nombre: 'Crear',    descripcion: 'Registrar cosechas' },
          { id: 'cosecha.editar',   nombre: 'Editar',   descripcion: 'Modificar cosechas' },
          { id: 'cosecha.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar cosechas' },
        ],
      },
      {
        titulo: 'Jornales',
        permisos: [
          { id: 'jornales.ver',      nombre: 'Ver',      descripcion: 'Visualizar jornales' },
          { id: 'jornales.crear',    nombre: 'Crear',    descripcion: 'Registrar jornales' },
          { id: 'jornales.editar',   nombre: 'Editar',   descripcion: 'Modificar jornales' },
          { id: 'jornales.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar jornales' },
        ],
      },
      {
        titulo: 'Auxiliares',
        permisos: [
          { id: 'auxiliares.ver',      nombre: 'Ver',      descripcion: 'Visualizar auxiliares' },
          { id: 'auxiliares.crear',    nombre: 'Crear',    descripcion: 'Registrar auxiliares' },
          { id: 'auxiliares.editar',   nombre: 'Editar',   descripcion: 'Modificar auxiliares' },
          { id: 'auxiliares.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar auxiliares' },
        ],
      },
    ],
  },
  {
    id: 'viajes',
    nombre: 'Viajes',
    permisos: [
      { id: 'viajes.ver',      nombre: 'Ver',      descripcion: 'Visualizar viajes' },
      { id: 'viajes.crear',    nombre: 'Crear',    descripcion: 'Registrar nuevos viajes' },
      { id: 'viajes.editar',   nombre: 'Editar',   descripcion: 'Modificar viajes' },
      { id: 'viajes.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar viajes' },
    ],
  },
  {
    id: 'nomina',
    nombre: 'Nómina',
    secciones: [
      {
        titulo: 'Nóminas',
        permisos: [
          { id: 'nomina.ver',      nombre: 'Ver',      descripcion: 'Visualizar nóminas' },
          { id: 'nomina.crear',    nombre: 'Crear',    descripcion: 'Crear nóminas' },
          { id: 'nomina.editar',   nombre: 'Editar',   descripcion: 'Modificar nóminas' },
          { id: 'nomina.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar nóminas' },
        ],
      },
      {
        titulo: 'Conceptos de Nómina',
        permisos: [
          { id: 'nomina-conceptos.ver',       nombre: 'Ver',       descripcion: 'Visualizar catálogo de conceptos' },
          { id: 'nomina-conceptos.gestionar', nombre: 'Gestionar', descripcion: 'Crear, editar y eliminar conceptos' },
        ],
      },
    ],
  },
  {
    id: 'liquidaciones',
    nombre: 'Liquidaciones',
    permisos: [
      { id: 'nomina.liquidar', nombre: 'Liquidar', descripcion: 'Liquidar empleados de la nómina' },
      { id: 'nomina.cerrar',   nombre: 'Cerrar',   descripcion: 'Cerrar y procesar nómina' },
    ],
  },
  {
    id: 'agente-ia',
    nombre: 'Agente IA',
    nota: 'Este módulo está disponible para todos los usuarios autenticados y no requiere permisos personalizables.',
  },
  {
    id: 'market',
    nombre: 'Market (B2B)',
    permisos: [
      { id: 'market.catalogo', nombre: 'Catálogo', descripcion: 'Navegar el catálogo de productos' },
      { id: 'market.carrito',  nombre: 'Carrito',  descripcion: 'Gestionar el carrito de compras' },
      { id: 'market.pedidos',  nombre: 'Pedidos',  descripcion: 'Crear y consultar pedidos' },
    ],
  },
  {
    id: 'usuarios',
    nombre: 'Gestión de Usuarios',
    permisos: [
      { id: 'usuarios.ver',             nombre: 'Ver',             descripcion: 'Visualizar usuarios' },
      { id: 'usuarios.crear',           nombre: 'Crear',           descripcion: 'Crear nuevos usuarios' },
      { id: 'usuarios.editar',          nombre: 'Editar',          descripcion: 'Editar información de usuarios' },
      { id: 'usuarios.eliminar',        nombre: 'Eliminar',        descripcion: 'Eliminar usuarios' },
      { id: 'usuarios.desactivar',      nombre: 'Desactivar',      descripcion: 'Activar o desactivar usuarios' },
      { id: 'usuarios.ver_permisos',    nombre: 'Ver Permisos',    descripcion: 'Ver permisos asignados' },
      { id: 'usuarios.editar_permisos', nombre: 'Editar Permisos', descripcion: 'Gestionar permisos de usuarios' },
    ],
  },
  {
    id: 'configuracion',
    nombre: 'Configuración',
    permisos: [
      { id: 'configuracion.editar', nombre: 'Editar', descripcion: 'Modificar configuración de la finca' },
    ],
  },
];

/** Helper: aplana todas las permisos de un módulo (juntando secciones si las hay). */
const permisosDeModulo = (m: Modulo): Permiso[] => {
  if (m.permisos) return m.permisos;
  if (m.secciones) return m.secciones.flatMap(s => s.permisos);
  return [];
};

export default function UsuarioPermisos() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [activos, setActivos]   = useState<Set<string>>(new Set());
  const [usuarioNombre, setUsuarioNombre] = useState('');
  const [isAdmin, setIsAdmin]   = useState(false);
  const [dependencias, setDependencias] = useState<Record<string, string[]>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  // ── Cargar usuario + permisos actuales ──────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const pRes = await usuariosApi.getPermisos(Number(id));
        setUsuarioNombre(pRes.user_name ?? '');
        setIsAdmin(!!pRes.is_admin);
        setDependencias(pRes.dependencias ?? {});
        // Para ADMIN, permisos_directos viene vacío; mostramos los efectivos
        // como referencia (todos marcados, deshabilitados).
        const inicial = pRes.is_admin
          ? (pRes.permisos_efectivos ?? [])
          : (pRes.permisos_directos ?? []);
        setActivos(new Set(inicial));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar permisos');
      } finally { setLoading(false); }
    })();
  }, [id]);

  /** Aplica el mapa de dependencias del backend para auto-marcar hijos. */
  const expandirConDependencias = (set: Set<string>): Set<string> => {
    const out = new Set(set);
    for (const padre of Array.from(set)) {
      const hijos = dependencias[padre];
      if (hijos) hijos.forEach((h) => out.add(h));
    }
    return out;
  };

  // ── Guardar ─────────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    setSaving(true);
    try {
      const finales = Array.from(expandirConDependencias(activos));
      await usuariosApi.updatePermisos(Number(id), { permisos: finales });
      toast.success('Permisos guardados correctamente');
      navigate('/usuarios');
    } catch (err: any) {
      const code = err?.code;
      if (code === 'ADMIN_PERMISSION_DENIED') {
        toast.error('No se pueden editar los permisos de un administrador');
      } else if (code === 'SELF_PERMISSION_DENIED') {
        toast.error('No puedes modificar tus propios permisos');
      } else {
        toast.error(err instanceof Error ? err.message : 'Error al guardar permisos');
      }
    } finally { setSaving(false); }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const togglePermiso = (permisoId: string) => {
    setActivos(prev => {
      const n = new Set(prev);
      n.has(permisoId) ? n.delete(permisoId) : n.add(permisoId);
      return n;
    });
  };

  const toggleModulo = (modulo: Modulo) => {
    const ids = permisosDeModulo(modulo).map(p => p.id);
    if (ids.length === 0) return;
    const todosActivos = ids.every(pid => activos.has(pid));
    setActivos(prev => {
      const n = new Set(prev);
      todosActivos ? ids.forEach(pid => n.delete(pid)) : ids.forEach(pid => n.add(pid));
      return n;
    });
  };

  const seleccionarTodos = () => {
    setActivos(new Set(MODULOS.flatMap(m => permisosDeModulo(m).map(p => p.id))));
  };

  const quitarTodos = () => {
    setActivos(new Set());
  };

  const todosModuloActivos = (m: Modulo) => {
    const lista = permisosDeModulo(m);
    return lista.length > 0 && lista.every(p => activos.has(p.id));
  };

  const algunoModuloActivo = (m: Modulo) => {
    const lista = permisosDeModulo(m);
    return lista.some(p => activos.has(p.id)) && !todosModuloActivos(m);
  };

  const getContador = (m: Modulo) => {
    const lista = permisosDeModulo(m);
    return `${lista.filter(p => activos.has(p.id)).length}/${lista.length}`;
  };

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

      {/* Info para usuarios ADMIN — arrancan con todos los permisos del rol */}
      {isAdmin && (
        <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Usuario administrador</p>
              <p className="text-sm text-muted-foreground mt-1">
                Arranca con todos los permisos del rol. Puedes ajustar los que
                quieras revocar o agregar y guardar los cambios.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botones globales */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={seleccionarTodos}
          className="gap-2"
        >
          <CheckSquare className="h-4 w-4" /> Seleccionar Todos
        </Button>
        <Button
          variant="outline"
          onClick={quitarTodos}
          className="gap-2"
        >
          <Square className="h-4 w-4" /> Quitar Todos
        </Button>
      </div>

      {/* Grid 2 columnas — una card por ítem del menú lateral */}
      <div className="grid gap-6 lg:grid-cols-2">
        {MODULOS.map(modulo => {
          const tieneSecciones = !!modulo.secciones;
          const tienePermisosPlanos = !!modulo.permisos;
          const sinPermisos = !tieneSecciones && !tienePermisosPlanos;

          return (
            <Card key={modulo.id} className="glass-subtle border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleModulo(modulo)}
                    disabled={sinPermisos}
                    className={`flex items-center gap-3 group ${sinPermisos ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {!sinPermisos && (
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
                    )}
                    <CardTitle className={!sinPermisos ? 'group-hover:text-primary transition-colors' : ''}>
                      {modulo.nombre}
                    </CardTitle>
                  </button>
                  {!sinPermisos && (
                    <Badge variant="outline" className="bg-primary/5 border-primary/20">
                      {getContador(modulo)}
                    </Badge>
                  )}
                </div>
                <CardDescription>Permisos del módulo {modulo.nombre}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Nota informativa para módulos sin permisos editables */}
                {sinPermisos && modulo.nota && (
                  <p className="text-sm text-muted-foreground italic">{modulo.nota}</p>
                )}

                {/* Permisos planos (módulo simple) */}
                {tienePermisosPlanos && (
                  <div className="space-y-3">
                    {modulo.permisos!.map(permiso => (
                      <PermisoRow
                        key={permiso.id}
                        permiso={permiso}
                        isActivo={activos.has(permiso.id)}
                        onToggle={() => togglePermiso(permiso.id)}
                                    />
                    ))}
                  </div>
                )}

                {/* Permisos en sub-secciones (Mi Plantación, Operaciones, etc.) */}
                {tieneSecciones && modulo.secciones!.map((seccion) => (
                  <div key={seccion.titulo} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-1">
                      {seccion.titulo}
                    </p>
                    <div className="space-y-2">
                      {seccion.permisos.map(permiso => (
                        <PermisoRow
                          key={permiso.id}
                          permiso={permiso}
                          isActivo={activos.has(permiso.id)}
                          onToggle={() => togglePermiso(permiso.id)}
                                        />
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={() => navigate(`/usuarios/${id}`)}>
          Cancelar
        </Button>
        <Button
          onClick={handleGuardar}
          disabled={saving}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar Permisos'}
        </Button>
      </div>
    </div>
  );
}

// ─── Sub-componente: una fila de permiso con checkbox ───────────────────────
function PermisoRow({
  permiso,
  isActivo,
  onToggle,
  disabled,
}: {
  permiso: Permiso;
  isActivo: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
        isActivo
          ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
          : 'border-border hover:border-primary/30'
      }`}
    >
      <Checkbox
        id={permiso.id}
        checked={isActivo}
        onCheckedChange={onToggle}
        disabled={disabled}
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
}