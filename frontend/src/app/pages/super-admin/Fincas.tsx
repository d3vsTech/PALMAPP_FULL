import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Building2, Eye, Loader2, Pause, Pencil, Play, Plus, RefreshCw, Search, Trash2, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { formatFecha } from '../../utils/fecha';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CrearFincaModal, {
  type FincaFormData,
} from '../../components/super-admin/CrearFincaModal';
import { num } from '../../lib/formato';

type EstadoTenant = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

interface FincaItem {
  id: number;
  tipoPersona: string;
  nombre: string;
  nit: string;
  razonSocial: string;
  correoContacto: string;
  telefono: string;
  direccion: string;
  departamento: string;
  municipio: string;
  estado: EstadoTenant;
  fechaActivacion: string;
  fechaSuspension: string;
  totalUsuarios: number;
  totalEmpleados: number;
}

interface DashboardStatsResponse {
  data?: {
    tenants?: { total?: number; activos?: number; suspendidos?: number; inactivos?: number };
  };
}

interface LaravelPagination<T> {
  data?: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
  meta?: { current_page?: number; last_page?: number; total?: number };
}

interface TenantDetailResponse {
  data?: Record<string, unknown>;
  modulos?: Record<string, unknown>;
  config_nomina?: Record<string, unknown>;
}

const POR_PAGINA = 10;

const VARIANTE_ESTADO: Record<EstadoTenant, 'success' | 'warning' | 'destructive'> = {
  ACTIVO: 'success',
  SUSPENDIDO: 'warning',
  INACTIVO: 'destructive',
};

function aNumero(valor: unknown, porDefecto = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : porDefecto;
}

function normalizarEstado(valor: unknown): EstadoTenant {
  const v = String(valor ?? 'ACTIVO').trim().toUpperCase();
  if (v === 'SUSPENDIDO' || v === 'INACTIVO') return v;
  return 'ACTIVO';
}

/** Fecha del backend (YYYY-MM-DD o ISO) a DD/MM/YYYY. Vacía o inválida da "—". */
const formatearFecha = (raw?: string | null): string =>
  formatFecha(raw, { day: '2-digit', month: '2-digit', year: 'numeric' });

function normalizarTenant(raw: Record<string, unknown> | undefined): FincaItem {
  const r = raw ?? {};
  return {
    id: aNumero(r.id),
    tipoPersona: String(r.tipo_persona ?? 'NATURAL'),
    nombre: String(r.nombre ?? ''),
    nit: String(r.nit ?? ''),
    razonSocial: String(r.razon_social ?? ''),
    correoContacto: String(r.correo_contacto ?? ''),
    telefono: String(r.telefono ?? ''),
    direccion: String(r.direccion ?? ''),
    departamento: String(r.departamento ?? ''),
    municipio: String(r.municipio ?? ''),
    estado: normalizarEstado(r.estado ?? r.status),
    fechaActivacion: String(r.fecha_activacion ?? ''),
    fechaSuspension: String(r.fecha_suspension ?? ''),
    totalUsuarios: aNumero(r.total_usuarios, 0),
    totalEmpleados: aNumero(r.total_empleados, 0),
  };
}

function fincaAFormulario(finca: FincaItem | null): FincaFormData | null {
  if (!finca) return null;
  return {
    tipo_persona: finca.tipoPersona === 'JURIDICA' ? 'JURIDICA' : 'NATURAL',
    nombre: finca.nombre,
    nit: finca.nit,
    razon_social: finca.razonSocial,
    correo_contacto: finca.correoContacto,
    telefono: finca.telefono,
    direccion: finca.direccion,
    departamento: finca.departamento,
    municipio: finca.municipio,
    fecha_activacion: finca.fechaActivacion,
    fecha_suspension: finca.fechaSuspension,
  };
}

function armarPayload(form: FincaFormData) {
  const payload: Record<string, unknown> = {
    tipo_persona: form.tipo_persona,
    nombre: form.nombre.trim(),
  };

  // El backend espera las fechas en DD/MM/YYYY, no en el ISO del input.
  const opcionales: Record<string, string> = {
    nit: form.nit.trim(),
    razon_social: form.razon_social.trim(),
    correo_contacto: form.correo_contacto.trim(),
    telefono: form.telefono.trim(),
    direccion: form.direccion.trim(),
    departamento: form.departamento.trim(),
    municipio: form.municipio.trim(),
    fecha_activacion: form.fecha_activacion ? form.fecha_activacion.split('-').reverse().join('/') : '',
    fecha_suspension: form.fecha_suspension ? form.fecha_suspension.split('-').reverse().join('/') : '',
  };

  Object.entries(opcionales).forEach(([clave, valor]) => {
    if (valor) payload[clave] = valor;
  });

  return payload;
}

/** Un dato del detalle. */
function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function Fincas() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [fincas, setFincas] = useState<FincaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoEdicionId, setCargandoEdicionId] = useState<number | null>(null);
  const [cargandoDetalleId, setCargandoDetalleId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoTenant>('TODOS');

  const [pagina, setPagina] = useState(1);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [total, setTotal] = useState(0);

  const [resumen, setResumen] = useState({ total: 0, activos: 0, suspendidos: 0, inactivos: 0 });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [seleccionada, setSeleccionada] = useState<FincaItem | null>(null);
  const [detalle, setDetalle] = useState<FincaItem | null>(null);

  const [confirmacion, setConfirmacion] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: 'warning' | 'danger';
    onConfirm: () => Promise<void>;
  }>({ open: false, title: '', description: '', variant: 'warning', onConfirm: async () => {} });

  const pedirConfirmacion = (
    title: string,
    description: string,
    variant: 'warning' | 'danger',
    onConfirm: () => Promise<void>,
  ) => setConfirmacion({ open: true, title, description, variant, onConfirm });

  const cerrarConfirmacion = () => setConfirmacion((prev) => ({ ...prev, open: false }));

  const abrirDetalle = async (tenantId: number) => {
    if (!token) return;
    setCargandoDetalleId(tenantId);
    try {
      const res = await requestConToken<TenantDetailResponse>(
        `/api/v1/admin/tenants/${tenantId}`,
        { method: 'GET' },
        token,
      );
      setDetalle(normalizarTenant(res.data));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar el detalle de la finca');
    } finally {
      setCargandoDetalleId(null);
    }
  };

  const cargarResumen = useCallback(async () => {
    if (!token) return;
    try {
      const res = await requestConToken<DashboardStatsResponse>(
        '/api/v1/admin/dashboard',
        { method: 'GET' },
        token,
      );
      setResumen({
        total: aNumero(res.data?.tenants?.total, 0),
        activos: aNumero(res.data?.tenants?.activos, 0),
        suspendidos: aNumero(res.data?.tenants?.suspendidos, 0),
        inactivos: aNumero(res.data?.tenants?.inactivos, 0),
      });
    } catch (error) {
      console.error('Error cargando el resumen de fincas:', error);
    }
  }, [token]);

  const cargarFincas = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (busqueda.trim()) params.set('search', busqueda.trim());
      if (filtroEstado !== 'TODOS') params.set('estado', filtroEstado);
      params.set('sort_by', 'nombre');
      params.set('sort_dir', 'asc');
      params.set('per_page', String(POR_PAGINA));
      params.set('page', String(pagina));

      const res = await requestConToken<LaravelPagination<Record<string, unknown>>>(
        `/api/v1/admin/tenants?${params.toString()}`,
        { method: 'GET' },
        token,
      );

      const items = Array.isArray(res.data) ? res.data : [];
      setFincas(items.map(normalizarTenant));
      setUltimaPagina(aNumero(res.last_page ?? res.meta?.last_page, 1));
      setTotal(aNumero(res.total ?? res.meta?.total, items.length));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las fincas');
      setFincas([]);
      setUltimaPagina(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, pagina, busqueda, token]);

  useEffect(() => { void cargarResumen(); }, [cargarResumen]);

  useEffect(() => {
    const t = window.setTimeout(() => { void cargarFincas(); }, 250);
    return () => window.clearTimeout(t);
  }, [cargarFincas]);

  const recargar = async () => {
    await Promise.all([cargarResumen(), cargarFincas()]);
    toast.success('Listado de fincas actualizado');
  };

  const abrirCrear = () => {
    setSeleccionada(null);
    setModalAbierto(true);
  };

  const abrirEditar = async (tenantId: number) => {
    if (!token) return;
    setCargandoEdicionId(tenantId);
    try {
      const res = await requestConToken<TenantDetailResponse>(
        `/api/v1/admin/tenants/${tenantId}`,
        { method: 'GET' },
        token,
      );
      setSeleccionada(normalizarTenant(res.data));
      setModalAbierto(true);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar el detalle de la finca');
    } finally {
      setCargandoEdicionId(null);
    }
  };

  const guardar = async (form: FincaFormData) => {
    if (!token) return;
    setGuardando(true);
    try {
      const payload = armarPayload(form);

      if (seleccionada) {
        const res = await requestConToken<{ message?: string }>(
          `/api/v1/admin/tenants/${seleccionada.id}`,
          { method: 'PUT', body: JSON.stringify(payload) },
          token,
        );
        toast.success(res.message ?? 'Finca actualizada correctamente');
      } else {
        const res = await requestConToken<{ message?: string }>(
          '/api/v1/admin/tenants',
          { method: 'POST', body: JSON.stringify(payload) },
          token,
        );
        toast.success(res.message ?? 'Finca creada correctamente');
      }

      setModalAbierto(false);
      setSeleccionada(null);
      await Promise.all([cargarResumen(), cargarFincas()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la finca');
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = (finca: FincaItem) => {
    if (!token) return;

    if (finca.estado === 'INACTIVO') {
      toast.error('Una finca inactiva no se puede activar ni suspender desde aquí');
      return;
    }

    const accion = finca.estado === 'ACTIVO' ? 'suspender' : 'activar';

    pedirConfirmacion(
      `${accion.charAt(0).toUpperCase()}${accion.slice(1)} finca`,
      `¿Seguro que deseas ${accion} la finca "${finca.nombre}"?`,
      'warning',
      async () => {
        const res = await requestConToken<{ message?: string }>(
          `/api/v1/admin/tenants/${finca.id}/toggle`,
          { method: 'PATCH' },
          token,
        );
        toast.success(res.message ?? 'Estado de la finca actualizado');
        cerrarConfirmacion();
        await Promise.all([cargarResumen(), cargarFincas()]);
      },
    );
  };

  /**
   * Ejecuta el DELETE. Si el backend responde 409, la finca tiene datos
   * relacionados y se ofrece el borrado en cascada con `?force=1`.
   */
  const ejecutarBorrado = async (finca: FincaItem, forzar = false): Promise<void> => {
    try {
      const res = await requestConToken<{ message?: string }>(
        `/api/v1/admin/tenants/${finca.id}${forzar ? '?force=1' : ''}`,
        { method: 'DELETE' },
        token,
      );
      toast.success(res.message ?? 'Finca eliminada correctamente');
      cerrarConfirmacion();
      if (pagina > 1 && fincas.length === 1) {
        setPagina((prev) => Math.max(1, prev - 1));
        await cargarResumen();
      } else {
        await Promise.all([cargarResumen(), cargarFincas()]);
      }
    } catch (e) {
      const err = e as { status?: number; code?: string; message?: string; errors?: Record<string, string[]> };

      if (err.status === 409 && !forzar) {
        cerrarConfirmacion();
        pedirConfirmacion(
          'Eliminar finca con sus datos',
          `${err.message ?? 'La finca tiene datos relacionados (usuarios, colaboradores, nóminas, etc.).'} ¿Eliminar la finca con TODOS sus datos asociados? Esta acción no se puede deshacer.`,
          'danger',
          () => ejecutarBorrado(finca, true),
        );
        return;
      }

      if (err.status === 403) {
        toast.error('No tienes permiso para eliminar fincas.');
      } else if (err.status === 404) {
        toast.error('La finca ya no existe.');
        cerrarConfirmacion();
        await Promise.all([cargarResumen(), cargarFincas()]);
      } else if (err.errors) {
        const primero = Object.values(err.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : (err.message ?? 'Error de validación'));
      } else {
        toast.error(err.message ?? `No se pudo eliminar la finca${err.code ? ` (${err.code})` : ''}`);
      }
    }
  };

  const eliminar = (finca: FincaItem) => {
    if (!token) return;
    pedirConfirmacion(
      'Eliminar finca',
      `¿Seguro que deseas eliminar "${finca.nombre}"? Esta acción no se puede deshacer.`,
      'danger',
      () => ejecutarBorrado(finca, false),
    );
  };

  const hayFiltros = busqueda.trim() !== '' || filtroEstado !== 'TODOS';
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super admin"
        title="Fincas"
        description="Todas las fincas clientes de la plataforma."
        actions={
          <>
            <Button variant="outline" onClick={() => void recargar()} disabled={loading}>
              <RefreshCw className="h-4 w-4" strokeWidth={2} />
              Recargar
            </Button>
            <Button onClick={abrirCrear}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nueva finca
            </Button>
          </>
        }
      />

      <StatStrip
        items={[
          { label: 'Fincas', value: num(resumen.total), note: 'registradas en la plataforma' },
          { label: 'Activas', value: num(resumen.activos) },
          { label: 'Suspendidas', value: num(resumen.suspendidos) },
          { label: 'Inactivas', value: num(resumen.inactivos) },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <Input
            aria-label="Buscar fincas"
            value={busqueda}
            onChange={(e) => { setPagina(1); setBusqueda(e.target.value); }}
            placeholder="Buscar por nombre, NIT o razón social"
            className="pl-9"
          />
        </div>
        <Select
          value={filtroEstado}
          onValueChange={(v) => { setPagina(1); setFiltroEstado(v as 'TODOS' | EstadoTenant); }}
        >
          <SelectTrigger aria-label="Estado" className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los estados</SelectItem>
            <SelectItem value="ACTIVO">Activas</SelectItem>
            <SelectItem value="SUSPENDIDO">Suspendidas</SelectItem>
            <SelectItem value="INACTIVO">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="gap-0 overflow-hidden">
        <div className="px-5 py-3.5">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium text-foreground">{desde}-{hasta}</span> de{' '}
            <span className="font-medium text-foreground">{num(total)}</span> fincas
          </p>
        </div>

        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/60 text-[13px] text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">Finca</th>
                <th className="px-4 py-2.5 text-left font-semibold">Contacto</th>
                <th className="px-4 py-2.5 text-left font-semibold">Ubicación</th>
                <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                <th className="px-4 py-2.5 text-right font-semibold">Activación</th>
                <th className="px-4 py-2.5 text-right font-semibold">Usuarios</th>
                <th className="px-5 py-2.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando fincas…
                    </span>
                  </td>
                </tr>
              ) : fincas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      title="No se encontraron fincas"
                      description={hayFiltros
                        ? 'Ninguna finca coincide con la búsqueda.'
                        : 'Todavía no hay fincas registradas en la plataforma.'}
                      action={hayFiltros
                        ? { label: 'Quitar filtros', onClick: () => { setBusqueda(''); setFiltroEstado('TODOS'); setPagina(1); } }
                        : { label: 'Nueva finca', onClick: abrirCrear }}
                    />
                  </td>
                </tr>
              ) : (
                fincas.map((finca) => (
                  <tr key={finca.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                          <Building2 className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <span className="min-w-0">
                          <button
                            type="button"
                            onClick={() => void abrirDetalle(finca.id)}
                            disabled={cargandoDetalleId === finca.id}
                            className="block truncate text-left font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {finca.nombre || 'Sin nombre'}
                          </button>
                          <span className="block text-xs text-muted-foreground">
                            ID {finca.id} · NIT {finca.nit || '—'}
                          </span>
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="block text-foreground">{finca.correoContacto || '—'}</span>
                      <span className="block text-xs text-muted-foreground">{finca.telefono || 'Sin teléfono'}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="block text-foreground">
                        {finca.municipio || '—'}{finca.departamento ? `, ${finca.departamento}` : ''}
                      </span>
                      <span className="block text-xs text-muted-foreground">{finca.direccion || 'Sin dirección'}</span>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={VARIANTE_ESTADO[finca.estado]} className="capitalize">
                        {finca.estado.toLowerCase()}
                      </Badge>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                      {formatearFecha(finca.fechaActivacion)}
                      {finca.fechaSuspension && (
                        <span className="block text-xs">Suspende {formatearFecha(finca.fechaSuspension)}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="block text-foreground">{num(finca.totalUsuarios)}</span>
                      <span className="block text-xs text-muted-foreground">{num(finca.totalEmpleados)} empleados</span>
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-0.5 text-muted-foreground">
                        <Button
                          variant="ghost" size="icon" title="Ver detalle"
                          onClick={() => void abrirDetalle(finca.id)}
                          disabled={cargandoDetalleId === finca.id}
                        >
                          {cargandoDetalleId === finca.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Eye className="h-4 w-4" strokeWidth={2} />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Usuarios de la finca"
                          onClick={() => navigate(`/super-admin/fincas/${finca.id}/usuarios`)}
                        >
                          <Users className="h-4 w-4" strokeWidth={2} />
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Editar"
                          onClick={() => void abrirEditar(finca.id)}
                          disabled={cargandoEdicionId === finca.id}
                        >
                          {cargandoEdicionId === finca.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Pencil className="h-4 w-4" strokeWidth={2} />}
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          title={finca.estado === 'ACTIVO' ? 'Suspender' : 'Activar'}
                          onClick={() => alternarEstado(finca)}
                          disabled={finca.estado === 'INACTIVO'}
                        >
                          {finca.estado === 'ACTIVO'
                            ? <Pause className="h-4 w-4" strokeWidth={2} />
                            : <Play className="h-4 w-4" strokeWidth={2} />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Eliminar"
                          className="hover:text-destructive"
                          onClick={() => eliminar(finca)}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {ultimaPagina > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
            <p className="text-sm text-muted-foreground">Página {pagina} de {ultimaPagina}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm" variant="outline"
                disabled={loading || pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anteriores
              </Button>
              <Button
                size="sm" variant="outline"
                disabled={loading || pagina >= ultimaPagina}
                onClick={() => setPagina((p) => Math.min(ultimaPagina, p + 1))}
              >
                Siguientes
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CrearFincaModal
        isOpen={modalAbierto}
        onClose={() => {
          if (guardando) return;
          setModalAbierto(false);
          setSeleccionada(null);
        }}
        onSave={guardar}
        fincaData={fincaAFormulario(seleccionada)}
        isEdit={Boolean(seleccionada)}
        isSaving={guardando}
      />

      <ConfirmDialog
        open={confirmacion.open}
        onClose={cerrarConfirmacion}
        onConfirm={confirmacion.onConfirm}
        title={confirmacion.title}
        description={confirmacion.description}
        variant={confirmacion.variant}
      />

      <Dialog open={detalle !== null} onOpenChange={(abierto) => !abierto && setDetalle(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detalle?.nombre || 'Finca'}</DialogTitle>
            <DialogDescription>Detalle de la finca</DialogDescription>
          </DialogHeader>

          {detalle && (
            <div className="max-h-[70vh] space-y-5 overflow-y-auto custom-scrollbar">
              <section className="rounded-lg bg-muted/60 px-4 py-3.5">
                <h4 className="mb-3">Información general</h4>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Dato label="Nombre">{detalle.nombre || '—'}</Dato>
                  <Dato label="NIT">{detalle.nit || '—'}</Dato>
                  <Dato label="Razón social">{detalle.razonSocial || '—'}</Dato>
                  <Dato label="Estado">
                    <Badge variant={VARIANTE_ESTADO[detalle.estado]} className="capitalize">
                      {detalle.estado.toLowerCase()}
                    </Badge>
                  </Dato>
                </dl>
              </section>

              <section className="rounded-lg bg-muted/60 px-4 py-3.5">
                <h4 className="mb-3">Contacto</h4>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Dato label="Correo">{detalle.correoContacto || '—'}</Dato>
                  <Dato label="Teléfono">{detalle.telefono || '—'}</Dato>
                </dl>
              </section>

              <section className="rounded-lg bg-muted/60 px-4 py-3.5">
                <h4 className="mb-3">Ubicación</h4>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Dato label="Departamento">{detalle.departamento || '—'}</Dato>
                  <Dato label="Municipio">{detalle.municipio || '—'}</Dato>
                  <div className="sm:col-span-2">
                    <Dato label="Dirección">{detalle.direccion || '—'}</Dato>
                  </div>
                </dl>
              </section>

              <section className="rounded-lg bg-muted/60 px-4 py-3.5">
                <h4 className="mb-3">Fechas y usuarios</h4>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Dato label="Fecha de activación">{formatearFecha(detalle.fechaActivacion)}</Dato>
                  <Dato label="Fecha de suspensión">{formatearFecha(detalle.fechaSuspension)}</Dato>
                  <Dato label="Usuarios asignados">{num(detalle.totalUsuarios)}</Dato>
                  <Dato label="Empleados">{num(detalle.totalEmpleados)}</Dato>
                </dl>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
