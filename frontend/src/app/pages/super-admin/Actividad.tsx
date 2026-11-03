import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import EmptyState from '../../components/common/EmptyState';
import { num } from '../../lib/formato';

interface AuditoriaItem {
  id: number;
  accion: string;
  fecha: string;
  usuario: string;
  correo: string;
  entidad_afectada: string;
  detalle: string;
  direccion_ip: string;
  tenant_id: number | null;
}

interface AuditoriaPagination {
  data?: unknown[];
  current_page?: number;
  last_page?: number;
  total?: number;
}

/** Color de la pastilla según lo que se hizo. */
type VarianteBadge = 'success' | 'info' | 'destructive' | 'warning' | 'secondary' | 'default';

const COLOR_ACCION: Record<string, VarianteBadge> = {
  CREAR: 'success',
  EDITAR: 'info',
  ELIMINAR: 'destructive',
  LOGIN_EXITOSO: 'success',
  LOGIN_FALLIDO: 'warning',
  LOGOUT: 'secondary',
};

const ACCIONES = [
  { valor: 'CREAR', label: 'Crear' },
  { valor: 'EDITAR', label: 'Editar' },
  { valor: 'ELIMINAR', label: 'Eliminar' },
  { valor: 'LOGIN_EXITOSO', label: 'Inicio de sesión exitoso' },
  { valor: 'LOGIN_FALLIDO', label: 'Inicio de sesión fallido' },
  { valor: 'LOGOUT', label: 'Cierre de sesión' },
];

const MODULOS = [
  { valor: 'AUTH', label: 'Autenticación' },
  { valor: 'TENANTS', label: 'Fincas' },
  { valor: 'USERS', label: 'Usuarios' },
];

const POR_PAGINA = 15;

export default function Actividad() {
  const { token } = useAuth();
  const [auditorias, setAuditorias] = useState<AuditoriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAccion, setFiltroAccion] = useState('todas');
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [total, setTotal] = useState(0);

  const cargar = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroAccion !== 'todas') params.set('accion', filtroAccion);
      if (filtroModulo !== 'todos') params.set('modulo', filtroModulo);
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);
      params.set('per_page', String(POR_PAGINA));
      params.set('page', String(pagina));

      const res = await requestConToken<AuditoriaPagination>(
        `/api/v1/admin/auditorias?${params.toString()}`,
        { method: 'GET' },
        token,
      );

      const items = Array.isArray(res.data) ? res.data : [];
      setAuditorias(items.map((fila) => {
        const item = fila as Record<string, unknown>;
        return {
          id: Number(item.id),
          accion: String(item.accion ?? ''),
          fecha: String(item.fecha ?? ''),
          usuario: String(item.usuario ?? ''),
          correo: String(item.correo ?? ''),
          entidad_afectada: String(item.entidad_afectada ?? ''),
          detalle: String(item.detalle ?? ''),
          direccion_ip: String(item.direccion_ip ?? ''),
          tenant_id: (item.tenant_id as number | null) ?? null,
        };
      }));
      setUltimaPagina(res.last_page ?? 1);
      setTotal(res.total ?? items.length);
    } catch (error) {
      console.error('Error al cargar auditorías:', error);
      setAuditorias([]);
    } finally {
      setLoading(false);
    }
  }, [token, filtroAccion, filtroModulo, fechaDesde, fechaHasta, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hayFiltros = filtroAccion !== 'todas' || filtroModulo !== 'todos' || !!fechaDesde || !!fechaHasta;

  const limpiar = () => {
    setPagina(1);
    setFiltroAccion('todas');
    setFiltroModulo('todos');
    setFechaDesde('');
    setFechaHasta('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super admin"
        title="Actividad del sistema"
        description="Registro de todas las acciones realizadas en la plataforma."
      />

      <StatStrip
        loading={loading}
        items={[
          { label: 'Registros encontrados', value: num(total), note: hayFiltros ? 'con los filtros aplicados' : 'en todo el historial' },
          { label: 'Página', value: `${pagina} de ${ultimaPagina}`, note: `${POR_PAGINA} registros por página` },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="actividad-accion">Acción</Label>
          <Select
            value={filtroAccion}
            onValueChange={(v) => { setPagina(1); setFiltroAccion(v); }}
          >
            <SelectTrigger id="actividad-accion"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las acciones</SelectItem>
              {ACCIONES.map((a) => (
                <SelectItem key={a.valor} value={a.valor}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="actividad-modulo">Módulo</Label>
          <Select
            value={filtroModulo}
            onValueChange={(v) => { setPagina(1); setFiltroModulo(v); }}
          >
            <SelectTrigger id="actividad-modulo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los módulos</SelectItem>
              {MODULOS.map((m) => (
                <SelectItem key={m.valor} value={m.valor}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="actividad-desde">Desde</Label>
          <Input
            id="actividad-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => { setPagina(1); setFechaDesde(e.target.value); }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="actividad-hasta">Hasta</Label>
          <Input
            id="actividad-hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => { setPagina(1); setFechaHasta(e.target.value); }}
          />
        </div>
      </div>

      <Card className="gap-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-[13px] text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">Acción</th>
                <th className="px-4 py-2.5 text-left font-semibold">Fecha</th>
                <th className="px-4 py-2.5 text-left font-semibold">Usuario</th>
                <th className="px-4 py-2.5 text-left font-semibold">Módulo</th>
                <th className="px-4 py-2.5 text-left font-semibold">Detalle</th>
                <th className="px-5 py-2.5 text-left font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando actividad…
                    </span>
                  </td>
                </tr>
              ) : auditorias.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      title="No se encontró actividad"
                      description={hayFiltros
                        ? 'Ningún registro coincide con los filtros aplicados.'
                        : 'Todavía no hay acciones registradas en el sistema.'}
                      action={hayFiltros ? { label: 'Quitar filtros', onClick: limpiar } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                auditorias.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <Badge variant={COLOR_ACCION[a.accion] ?? 'default'}>{a.accion}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{a.fecha}</td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-foreground">{a.usuario}</span>
                      <span className="block text-xs text-muted-foreground">{a.correo}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.entidad_afectada}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.detalle}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{a.direccion_ip}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{num(total)}</span> registros
        </p>
        {ultimaPagina > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Página {pagina} de {ultimaPagina}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={loading || pagina <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
            >
              Anteriores
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loading || pagina >= ultimaPagina}
              onClick={() => setPagina((p) => Math.min(ultimaPagina, p + 1))}
            >
              Siguientes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
