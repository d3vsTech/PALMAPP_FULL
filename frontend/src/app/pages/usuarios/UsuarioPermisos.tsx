import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import PageHeader from '../../components/common/PageHeader';
import { Shield, Check, Minus, Loader2 } from 'lucide-react';
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
          { id: 'operaciones.importar', nombre: 'Importar', descripcion: 'Cargar jornales y cosechas históricos desde Excel' },
          { id: 'operaciones.desaprobar', nombre: 'Devolver a borrador', descripcion: 'Devolver una planilla aprobada a borrador para corregirla' },
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
    id: 'novedades',
    nombre: 'Novedades',
    permisos: [
      { id: 'novedades.ver',      nombre: 'Ver',      descripcion: 'Visualizar novedades de todas las fuentes' },
      { id: 'novedades.crear',    nombre: 'Crear',    descripcion: 'Registrar permisos, incapacidades, vacaciones y retiros' },
      { id: 'novedades.editar',   nombre: 'Editar',   descripcion: 'Modificar novedades pendientes' },
      { id: 'novedades.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar novedades pendientes' },
      { id: 'novedades.aprobar',  nombre: 'Aprobar',  descripcion: 'Aprobar o rechazar novedades' },
      { id: 'novedades.importar', nombre: 'Importar', descripcion: 'Cargar novedades masivas desde Excel' },
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
      { id: 'viajes.reabrir',  nombre: 'Reabrir',  descripcion: 'Reabrir un viaje finalizado para corregirlo' },
      { id: 'viajes.importar', nombre: 'Importar', descripcion: 'Cargar viajes históricos desde Excel' },
    ],
  },
  {
    id: 'nomina',
    nombre: 'Pagos',
    secciones: [
      {
        titulo: 'Pagos',
        permisos: [
          { id: 'nomina.ver',      nombre: 'Ver',      descripcion: 'Visualizar nóminas' },
          { id: 'nomina.crear',    nombre: 'Crear',    descripcion: 'Crear nóminas' },
          { id: 'nomina.editar',   nombre: 'Editar',   descripcion: 'Modificar nóminas' },
          { id: 'nomina.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar nóminas' },
          { id: 'nomina.importar', nombre: 'Importar', descripcion: 'Cargar nóminas históricas desde Excel y borrar lo importado' },
          { id: 'nomina.liquidar', nombre: 'Liquidar', descripcion: 'Liquidar empleados de la nómina' },
          { id: 'nomina.cerrar',   nombre: 'Cerrar',   descripcion: 'Cerrar y procesar nómina' },
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
      { id: 'liquidaciones.ver',      nombre: 'Ver',      descripcion: 'Visualizar vacaciones, prima, cesantías y liquidaciones finales' },
      { id: 'liquidaciones.crear',    nombre: 'Crear',    descripcion: 'Crear liquidaciones' },
      { id: 'liquidaciones.editar',   nombre: 'Editar',   descripcion: 'Modificar liquidaciones y cargar los históricos desde Excel' },
      { id: 'liquidaciones.eliminar', nombre: 'Eliminar', descripcion: 'Eliminar liquidaciones' },
      { id: 'liquidaciones.liquidar', nombre: 'Liquidar', descripcion: 'Liquidar y aprobar el cálculo' },
      { id: 'liquidaciones.pagar',    nombre: 'Pagar',    descripcion: 'Registrar el pago de la liquidación' },
      { id: 'liquidaciones.importar', nombre: 'Importar', descripcion: 'Cargar vacaciones, prima, cesantías y liquidaciones finales históricas desde Excel' },
    ],
  },
  {
    id: 'agente-ia',
    nombre: 'Agente IA',
    nota: 'Este módulo está disponible para todos los usuarios autenticados y no requiere permisos personalizables.',
  },
  {
    id: 'market',
    nombre: 'Tienda de Insumos',
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
      if (n.has(permisoId)) n.delete(permisoId);
      else n.add(permisoId);
      return n;
    });
  };

  const toggleModulo = (modulo: Modulo) => {
    const ids = permisosDeModulo(modulo).map(p => p.id);
    if (ids.length === 0) return;
    const todosActivos = ids.every(pid => activos.has(pid));
    setActivos(prev => {
      const n = new Set(prev);
      if (todosActivos) ids.forEach(pid => n.delete(pid));
      else ids.forEach(pid => n.add(pid));
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
    <div className="space-y-6">
      <PageHeader backTo="/usuarios" eyebrow="Usuarios" title="Editar permisos" />
      <Card className="items-center py-14 text-center">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          Cargando permisos...
        </p>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        backTo={`/usuarios/${id}`}
        eyebrow={
          <>
            <Link to="/usuarios" className="hover:text-foreground">Usuarios</Link>
            {usuarioNombre && (
              <>
                {' · '}
                <Link to={`/usuarios/${id}`} className="hover:text-foreground">{usuarioNombre}</Link>
              </>
            )}
          </>
        }
        title="Editar permisos"
        description={`Configura los permisos personalizados para ${usuarioNombre}.`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={seleccionarTodos}>Seleccionar todos</Button>
            <Button variant="outline" size="sm" onClick={quitarTodos}>Quitar todos</Button>
          </>
        }
      />

      {/* Un usuario administrador arranca con todos los permisos del rol. */}
      {isAdmin && (
        <div className="flex items-start gap-3 rounded-lg bg-warning-soft px-4 py-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
          <p className="text-sm text-foreground">
            Usuario administrador. Arranca con todos los permisos del rol; puedes
            ajustar los que quieras revocar o agregar y guardar los cambios.
          </p>
        </div>
      )}

      {/* Grid 2 columnas — una card por ítem del menú lateral */}
      <div className="grid gap-6 lg:grid-cols-2">
        {MODULOS.map(modulo => {
          const tieneSecciones = !!modulo.secciones;
          const tienePermisosPlanos = !!modulo.permisos;
          const sinPermisos = !tieneSecciones && !tienePermisosPlanos;

          return (
            <Card key={modulo.id} className="gap-4">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleModulo(modulo)}
                    disabled={sinPermisos}
                    className="group flex min-w-0 items-center gap-3 text-left"
                    aria-label={`Marcar o desmarcar todos los permisos de ${modulo.nombre}`}
                  >
                    {!sinPermisos && (
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                        todosModuloActivos(modulo) || algunoModuloActivo(modulo)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-card group-hover:border-primary/50'}`}>
                        {todosModuloActivos(modulo) && <Check className="h-3 w-3" strokeWidth={3} />}
                        {algunoModuloActivo(modulo) && <Minus className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    )}
                    <CardTitle className="break-words">{modulo.nombre}</CardTitle>
                  </button>
                  {!sinPermisos && (
                    <Badge variant="secondary" className="tabular-nums">{getContador(modulo)}</Badge>
                  )}
                </div>
                <CardDescription>Permisos del módulo {modulo.nombre}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Nota informativa para módulos sin permisos editables */}
                {sinPermisos && modulo.nota && (
                  <p className="text-sm text-muted-foreground">{modulo.nota}</p>
                )}

                {/* Permisos planos (módulo simple) */}
                {tienePermisosPlanos && (
                  <div className="space-y-2">
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
                    <p className="pl-1 text-[13px] font-medium text-muted-foreground">
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
      <div className="barra-acciones flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => navigate(`/usuarios/${id}`)}>
          Cancelar
        </Button>
        <Button onClick={handleGuardar} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar permisos'}
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
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        isActivo ? 'border-primary/20 bg-primary-soft' : 'border-border hover:bg-muted/40'
      }`}
    >
      <Checkbox
        id={permiso.id}
        checked={isActivo}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <Label htmlFor={permiso.id} className="cursor-pointer text-sm font-medium">
          {permiso.nombre}
        </Label>
        {permiso.descripcion && (
          <p className="text-xs text-muted-foreground">{permiso.descripcion}</p>
        )}
      </div>
    </div>
  );
}