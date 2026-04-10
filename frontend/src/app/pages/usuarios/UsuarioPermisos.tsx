import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ArrowLeft, Save, Loader2, Shield, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PermisosResponse {
  user_id: number;
  user_name: string;
  is_admin: boolean;
  permisos_directos: string[];
  permisos_disponibles: string[];
  dependencias: Record<string, string[]>;
}

// Agrupa permisos por módulo: "lotes.ver" → { lotes: ["lotes.ver", ...] }
function agrupar(permisos: string[]): Record<string, string[]> {
  return permisos.reduce((acc, p) => {
    const mod = p.split('.')[0];
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {} as Record<string, string[]>);
}

const LABEL_MODULO: Record<string, string> = {
  dashboard: 'Dashboard', lotes: 'Lotes', sublotes: 'Sublotes', lineas: 'Líneas',
  palmas: 'Palmas', colaboradores: 'Colaboradores', contratos: 'Contratos',
  nomina: 'Nómina', operaciones: 'Operaciones', cosecha: 'Cosecha',
  remisiones: 'Remisiones/Viajes', insumos: 'Insumos', parametricas: 'Paramétricas',
  usuarios: 'Usuarios', configuracion: 'Configuración', reportes: 'Reportes',
  auditorias: 'Auditorías',
};

const LABEL_ACCION: Record<string, string> = {
  ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar',
  desactivar: 'Activar/Desactivar', ver_permisos: 'Ver permisos', editar_permisos: 'Editar permisos',
};

export default function UsuarioPermisos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [data, setData] = useState<PermisosResponse | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    const cargar = async () => {
      try {
        const res = await requestConToken<PermisosResponse>(
          `/api/v1/tenant/usuarios/${id}/permisos`, { method: 'GET' }, token
        );
        setData(res);
        setSeleccionados(new Set(res.permisos_directos));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar permisos');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id, token]);

  const togglePermiso = (permiso: string, deps: Record<string, string[]>) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(permiso)) {
        next.delete(permiso);
      } else {
        next.add(permiso);
        // Auto-agregar dependencias
        const dependencias = deps[permiso] ?? [];
        dependencias.forEach(d => next.add(d));
      }
      return next;
    });
  };

  const handleGuardar = async () => {
    if (!token || !id) return;
    setSaving(true);
    try {
      const res = await requestConToken<{ message?: string }>(
        `/api/v1/tenant/usuarios/${id}/permisos`,
        { method: 'PUT', body: JSON.stringify({ permisos: Array.from(seleccionados) }) }, token
      );
      toast.success(res.message ?? 'Permisos actualizados correctamente');
      navigate('/usuarios');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar permisos');
    } finally {
      setSaving(false);
    }
  };

  const handleRevocar = async () => {
    if (!token || !id) return;
    if (!confirm('¿Seguro que deseas revocar todos los permisos?')) return;
    setSaving(true);
    try {
      const res = await requestConToken<{ message?: string }>(
        `/api/v1/tenant/usuarios/${id}/permisos`, { method: 'DELETE' }, token
      );
      toast.success(res.message ?? 'Permisos revocados');
      setSeleccionados(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al revocar permisos');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="w-5 h-5 animate-spin" /> Cargando permisos...
      </div>
    );
  }

  if (!data) return null;

  const grupos = agrupar(data.permisos_disponibles);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/usuarios')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1>Permisos de {data.user_name}</h1>
          <p className="text-lead">Gestiona el acceso de este usuario en la finca</p>
        </div>
        {!data.is_admin && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRevocar} disabled={saving}
              className="border-destructive/50 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4 mr-2" /> Revocar todos
            </Button>
            <Button onClick={handleGuardar} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar permisos
            </Button>
          </div>
        )}
      </div>

      {data.is_admin ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-6">
            <ShieldCheck className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="font-semibold">Usuario Administrador</p>
              <p className="text-sm text-muted-foreground">
                Este usuario tiene todos los permisos del sistema de forma automática. No se pueden editar.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(grupos).map(([modulo, permisos]) => (
            <Card key={modulo} className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  {LABEL_MODULO[modulo] ?? modulo.charAt(0).toUpperCase() + modulo.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {permisos.map(permiso => {
                  const accion = permiso.split('.')[1] ?? permiso;
                  const checked = seleccionados.has(permiso);
                  return (
                    <label key={permiso} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermiso(permiso, data.dependencias)}
                        className="w-4 h-4 rounded border-border accent-primary"
                      />
                      <span className={`text-sm transition-colors ${checked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {LABEL_ACCION[accion] ?? accion}
                      </span>
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}