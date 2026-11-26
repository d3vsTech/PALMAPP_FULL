import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import PageHeader from '../../components/common/PageHeader';
import Avatar from '../../components/common/Avatar';
import { Pencil, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatFecha } from '../../utils/fecha';

interface Usuario {
  id: number; name: string; email: string;
  is_admin: boolean; estado: boolean; asignado_at: string;
  finca?: string;
}

/** Fila de la lista de datos: rótulo a la izquierda, valor a la derecha. */
function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-foreground sm:text-right">{children}</dd>
    </div>
  );
}

export default function UsuarioDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token, user } = useAuth();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const fincaNombre = user?.fincaActual?.nombre ?? '';

  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      try {
        // La API no tiene GET /usuarios/{id} — usamos el listado y filtramos
        const res = await requestConToken<{ data: Usuario[] }>(
          `/api/v1/tenant/usuarios`, { method: 'GET' }, token
        );
        const found = (res.data ?? []).find(u => String(u.id) === String(id));
        if (found) setUsuario(found);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar usuario');
      } finally { setLoading(false); }
    })();
  }, [id, token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader backTo="/usuarios" eyebrow="Usuarios" title="Usuario" />
        <Card className="items-center py-14 text-center">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Cargando usuario...
          </p>
        </Card>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="space-y-6">
        <PageHeader backTo="/usuarios" eyebrow="Usuarios" title="Usuario no encontrado" />
        <Card className="items-center py-14 text-center">
          <div className="space-y-1">
            <h3>No encontramos este usuario</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Puede que se haya eliminado o que el enlace no sea correcto.
            </p>
          </div>
          <Button onClick={() => navigate('/usuarios')}>Volver a usuarios</Button>
        </Card>
      </div>
    );
  }

  const rol = usuario.is_admin ? 'Administrador' : 'Usuario';
  const estadoLabel = usuario.estado ? 'Activo' : 'Inactivo';
  const estadoVariant = usuario.estado ? 'success' : 'secondary';
  const finca = fincaNombre || usuario.finca || '';

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/usuarios"
        eyebrow="Usuarios"
        title={usuario.name}
        description={finca ? `${rol} · ${finca}` : rol}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/usuarios/permisos/${id}`)}>
              <Shield strokeWidth={2} />
              Gestionar permisos
            </Button>
            <Button variant="outline" onClick={() => navigate(`/usuarios/editar/${id}`)}>
              <Pencil strokeWidth={2} />
              Editar
            </Button>
          </>
        }
      />

      <Card>
        <CardContent>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar
              nombre={usuario.name}
              size="lg"
              className={`h-16 w-16 text-xl font-bold${usuario.estado ? '' : ' opacity-60'}`}
            />
            <dl className="grid flex-1 grid-cols-2 gap-5 lg:grid-cols-4">
              <div className="col-span-2 min-w-0 space-y-1 lg:col-span-1">
                <dt className="text-[13px] font-medium text-muted-foreground">Correo</dt>
                <dd className="break-all font-semibold" title={usuario.email}>{usuario.email}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-[13px] font-medium text-muted-foreground">Rol</dt>
                <dd><Badge variant="default">{rol}</Badge></dd>
              </div>
              <div className="space-y-1">
                <dt className="text-[13px] font-medium text-muted-foreground">Estado</dt>
                <dd><Badge variant={estadoVariant}>{estadoLabel}</Badge></dd>
              </div>
              <div className="space-y-1">
                <dt className="text-[13px] font-medium text-muted-foreground">ID</dt>
                <dd className="font-semibold">{usuario.id}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información de contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Dato label="Correo electrónico">{usuario.email}</Dato>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Dato label="Rol asignado">{rol}</Dato>
              <Dato label="Estado de la cuenta">
                <Badge variant={estadoVariant}>{estadoLabel}</Badge>
              </Dato>
              <Dato label="Finca asignada">{finca || '—'}</Dato>
              {usuario.asignado_at && (
                <Dato label="Fecha de asignación">
                  {formatFecha(usuario.asignado_at, { year: 'numeric', month: 'long', day: 'numeric' })}
                </Dato>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
