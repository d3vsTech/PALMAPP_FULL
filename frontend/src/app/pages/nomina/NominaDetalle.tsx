/**
 * Pantalla detalle de Nómina — diseño portado de V.15.
 *
 * Funcionalidades:
 *  - Selector visual de tabs (Colaboradores Internos | Terceros).
 *  - KPIs dinámicos por tab:
 *      · Colaboradores: 4 cards (Devengado, Deducciones, Neto, Avance liquidación).
 *      · Terceros: 3 cards (Empresas, Total a transferir, Avance pago).
 *  - Tabla de colaboradores con columnas Jornales y Cosechas.
 *  - Sección de empresas terceras con UI placeholder hasta tener API.
 *  - Botón "Exportar" y "Cerrar Nómina" (BORRADOR).
 *  - Flujo de liquidación: navega a `/nomina/{id}/liquidar/{empId}`
 *    (pantalla LiquidarColaborador.tsx tiene la lógica completa).
 *
 * Conexiones API mantenidas: `nominaApi.ver`, `nominaApi.cerrar`,
 * `nominaApi.quitarEmpleado`.
 *
 * Pendiente conectar API:
 *  - Endpoint que devuelva el detalle de TERCEROS por nómina
 *    (empresas, operarios, labores, kg, total a transferir, estado).
 *  - Endpoint para exportar la nómina a Excel/PDF.
 */
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, Calculator, Lock, DollarSign, TrendingUp, TrendingDown,
  FileText, Eye, Loader2, Trash2, Download, Users, Building2, Check,
  Pencil,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import {
  nominaApi, Nomina, NominaEmpleado, NominaTercero, Periodicidad,
  NominaErrorCodes,
} from '../../../api/nomina';
import type { ApiError } from '../../../api/client';

const MESES_NOMBRE: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

function periodoLabel(n: Nomina): string {
  const mes = MESES_NOMBRE[n.mes] ?? String(n.mes);
  if (n.tipo_pago_snapshot === 'QUINCENAL' && n.quincena) {
    const q = n.quincena === 1 ? 'Primera' : 'Segunda';
    return `${mes} ${n.anio} - ${q} quincena`;
  }
  return `${mes} ${n.anio}`;
}

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

function getIniciales(nombre: string): string {
  const partes = nombre.trim().split(' ').filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

export default function NominaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const nominaId = id ? parseInt(id) : null;

  const [nomina, setNomina] = useState<Nomina | null>(null);
  const [empleados, setEmpleados] = useState<NominaEmpleado[]>([]);
  const [cargando, setCargando] = useState(true);

  const [empleadoAQuitar, setEmpleadoAQuitar] = useState<NominaEmpleado | null>(null);
  const [confirmarCerrar, setConfirmarCerrar] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [accionando, setAccionando] = useState(false);

  // ── Editar nómina (mes/quincena/observación) ──────────────────────────────
  const [editarOpen, setEditarOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    mes: string;
    periodicidad: Periodicidad;
    quincena: '1' | '2' | '';
    observacion: string;
  }>({ mes: '', periodicidad: 'QUINCENAL', quincena: '', observacion: '' });
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // ── Selector visual de tabs ──────────────────────────────────────────────
  const [tabActivo, setTabActivo] = useState<'colaboradores' | 'terceros'>('colaboradores');

  // ── Datos de terceros — endpoint /nominas/{id}/terceros (doc §6) ─────────
  const [terceros, setTerceros] = useState<NominaTercero[]>([]);
  const [cargandoTerceros, setCargandoTerceros] = useState(false);

  const cargar = () => {
    if (!nominaId) return;
    setCargando(true);
    nominaApi
      .ver(nominaId)
      .then((res) => {
        setNomina(res.data);
        setEmpleados(res.data.empleados ?? []);
      })
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar nómina'))
      .finally(() => setCargando(false));
  };

  const cargarTerceros = () => {
    if (!nominaId) return;
    setCargandoTerceros(true);
    nominaApi.terceros
      .listar(nominaId)
      .then((res) => setTerceros(res.data ?? []))
      .catch((err: ApiError) => {
        // 404 acceptable si todavía no se ha liquidado ninguno
        if (err.status !== 404) {
          toast.error(err.message ?? 'Error al cargar terceros');
        }
      })
      .finally(() => setCargandoTerceros(false));
  };

  useEffect(() => {
    cargar();
    cargarTerceros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nominaId]);

  const esBorrador = nomina?.estado === 'BORRADOR';
  const empleadosMostrar = esBorrador
    ? empleados
    : empleados.filter((e) => e.estado === 'LIQUIDADO');

  const quitarEmpleado = async () => {
    if (!empleadoAQuitar) return;
    setAccionando(true);
    try {
      await nominaApi.quitarEmpleado(empleadoAQuitar.id);
      toast.success('Empleado quitado de la nómina');
      setEmpleadoAQuitar(null);
      cargar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === 'EMPLEADO_LIQUIDADO') {
        toast.error('No se puede quitar un empleado ya liquidado');
      } else {
        toast.error(e.message ?? 'Error al quitar empleado');
      }
    } finally {
      setAccionando(false);
    }
  };

  const cerrarNomina = async () => {
    if (!nominaId) return;
    setAccionando(true);
    try {
      const res = await nominaApi.cerrar(nominaId);
      toast.success(res.message ?? 'Nómina cerrada');
      setConfirmarCerrar(false);
      cargar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.NOMINA_CON_PENDIENTES) {
        toast.error('Hay empleados pendientes por liquidar');
      } else if (e.code === NominaErrorCodes.NOMINA_VALIDACION_COSECHA_REQUERIDA) {
        toast.error('Debes confirmar la validación de cosecha antes de cerrar');
      } else if (e.code === NominaErrorCodes.NOMINA_TERCERO_NO_LIQUIDADO) {
        toast.error('Hay terceros sin liquidar — calcula sus actas en "Liquidar Terceros"');
      } else {
        toast.error(e.message ?? 'Error al cerrar nómina');
      }
    } finally {
      setAccionando(false);
    }
  };

  /** Abre el modal de editar pre-poblado con los datos actuales. */
  const abrirEditar = () => {
    if (!nomina) return;
    setEditForm({
      mes: String(nomina.mes),
      periodicidad: nomina.tipo_pago_snapshot,
      quincena: nomina.quincena ? (String(nomina.quincena) as '1' | '2') : '',
      observacion: nomina.observacion ?? '',
    });
    setEditarOpen(true);
  };

  const guardarEdicion = async () => {
    if (!nominaId) return;
    if (!editForm.mes) {
      toast.error('El mes es requerido');
      return;
    }
    if (editForm.periodicidad === 'QUINCENAL' && !editForm.quincena) {
      toast.error('La quincena es requerida para periodicidad quincenal');
      return;
    }
    setGuardandoEdit(true);
    try {
      await nominaApi.editar(nominaId, {
        mes: parseInt(editForm.mes),
        periodicidad: editForm.periodicidad,
        quincena:
          editForm.periodicidad === 'QUINCENAL'
            ? (parseInt(editForm.quincena) as 1 | 2)
            : null,
        observacion: editForm.observacion || null,
      });
      toast.success('Nómina actualizada');
      setEditarOpen(false);
      cargar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.NOMINA_CON_LIQUIDADOS) {
        toast.error('No se puede editar: ya hay colaboradores liquidados');
      } else if (e.code === NominaErrorCodes.NOMINA_DUPLICADA) {
        toast.error('Ya existe otra nómina para ese período');
      } else if (e.code === NominaErrorCodes.NOMINA_CERRADA) {
        toast.error('No se puede editar una nómina cerrada');
      } else {
        toast.error(e.message ?? 'Error al editar nómina');
      }
    } finally {
      setGuardandoEdit(false);
    }
  };

  const eliminarNomina = async () => {
    if (!nominaId) return;
    setAccionando(true);
    try {
      await nominaApi.eliminar(nominaId);
      toast.success('Nómina eliminada');
      navigate('/nomina');
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.NOMINA_CON_LIQUIDADOS) {
        toast.error('No se puede eliminar: hay colaboradores liquidados');
      } else if (e.code === NominaErrorCodes.NOMINA_CERRADA) {
        toast.error('No se puede eliminar una nómina cerrada');
      } else {
        toast.error(e.message ?? 'Error al eliminar nómina');
      }
    } finally {
      setAccionando(false);
      setConfirmarEliminar(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando nómina...
      </div>
    );
  }

  if (!nomina || !nominaId) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Nómina no encontrada.
      </div>
    );
  }

  // ── KPIs Colaboradores ──────────────────────────────────────────────────
  const totalNeto = toNumber(nomina.total_general);
  const totalDeducciones = toNumber(nomina.total_deducciones);
  const totalDevengado = totalNeto + totalDeducciones;
  const liquidados = empleados.filter((e) => e.estado === 'LIQUIDADO').length;
  const totalColabs = empleados.length;
  const pendientes = empleados.filter((e) => e.estado !== 'LIQUIDADO').length;

  // ── KPIs Terceros ───────────────────────────────────────────────────────
  const totalServiciosTerceros = terceros.reduce(
    (s, t) => s + toNumber(t.total_a_transferir),
    0,
  );
  const empresasPagadas = terceros.filter((t) => t.estado_pago === 'PAGADO').length;
  const totalOperarios = terceros.reduce(
    (s, t) => s + (t.operarios?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/nomina">Pagos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{periodoLabel(nomina)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 gap-2">
          <Link to="/nomina">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-primary">{periodoLabel(nomina)}</h1>
              <StatusBadge status={nomina.estado as any} />
            </div>
            <p className="text-muted-foreground">
              {nomina.fecha_inicio} → {nomina.fecha_fin}
              {' · '}
              {liquidados}/{totalColabs} liquidados
            </p>
          </div>

          <div className="flex gap-2">
            {/* Editar/Eliminar solo en BORRADOR sin liquidados (el backend
                bloquea con NOMINA_CON_LIQUIDADOS si ya hay alguno cerrado). */}
            {esBorrador && liquidados === 0 && (
              <>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={abrirEditar}
                  title="Editar período de la nómina"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                  onClick={() => setConfirmarEliminar(true)}
                  title="Eliminar nómina"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </>
            )}
            {esBorrador && (
              <Button
                variant="default"
                className="gap-2"
                onClick={() => setConfirmarCerrar(true)}
                disabled={empleados.length === 0 || pendientes > 0}
              >
                <Lock className="h-4 w-4" />
                Cerrar Nómina
              </Button>
            )}
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Selector de vista (tabs visuales V.15) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setTabActivo('colaboradores')}
          className={`relative flex items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
            tabActivo === 'colaboradores'
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
          }`}
        >
          <div className={`h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center ${
            tabActivo === 'colaboradores' ? 'bg-primary/15' : 'bg-muted'
          }`}>
            <Users className={`h-6 w-6 ${tabActivo === 'colaboradores' ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-base ${tabActivo === 'colaboradores' ? 'text-primary' : 'text-foreground'}`}>
              Colaboradores Internos
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Colaboradores directos de la finca</p>
          </div>
          <span className={`text-2xl font-bold flex-shrink-0 ${tabActivo === 'colaboradores' ? 'text-primary' : 'text-muted-foreground'}`}>
            {totalColabs}
          </span>
          {tabActivo === 'colaboradores' && (
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setTabActivo('terceros')}
          className={`relative flex items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
            tabActivo === 'terceros'
              ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 shadow-sm'
              : 'border-border bg-card hover:border-amber-400/40 hover:bg-muted/40'
          }`}
        >
          <div className={`h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center ${
            tabActivo === 'terceros' ? 'bg-amber-500/15' : 'bg-muted'
          }`}>
            <Building2 className={`h-6 w-6 ${tabActivo === 'terceros' ? 'text-amber-600' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-base ${tabActivo === 'terceros' ? 'text-amber-700' : 'text-foreground'}`}>
              Terceros
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Contratistas y empresas externas</p>
          </div>
          <span className={`text-2xl font-bold flex-shrink-0 ${tabActivo === 'terceros' ? 'text-amber-700' : 'text-muted-foreground'}`}>
            {terceros.length}
          </span>
          {tabActivo === 'terceros' && (
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500" />
          )}
        </button>
      </div>

      {/* KPIs dinámicos según tab */}
      {tabActivo === 'colaboradores' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Total Devengado</p>
                  <p className="text-2xl font-bold text-success">${totalDevengado.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Lo que ganaron en el período</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Deducciones</p>
                  <p className="text-2xl font-bold text-destructive">${totalDeducciones.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Salud + Pensión + Otros</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Neto a Pagar</p>
                  <p className="text-2xl font-bold text-primary">${totalNeto.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Lo que recibe cada colaborador</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Avance de Liquidación</p>
                  <p className="text-2xl font-bold text-foreground">
                    {liquidados} <span className="text-base font-normal text-muted-foreground">de {totalColabs}</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{ width: `${totalColabs ? (liquidados / totalColabs) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Colaboradores liquidados</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Empresas Contratistas</p>
                  <p className="text-2xl font-bold text-foreground">{terceros.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{totalOperarios} operario{totalOperarios !== 1 ? 's' : ''} en campo</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Total a Transferir</p>
                  <p className="text-2xl font-bold text-primary">${totalServiciosTerceros.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">A empresas contratistas</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Avance de Pago</p>
                  <p className="text-2xl font-bold text-foreground">
                    {empresasPagadas} <span className="text-base font-normal text-muted-foreground">de {terceros.length}</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{ width: `${terceros.length ? (empresasPagadas / terceros.length) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Empresas pagadas</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB TERCEROS ── */}
      {tabActivo === 'terceros' && (
        <div className="space-y-4">
          {esBorrador && (
            <div className="flex justify-end">
              <Button
                onClick={() => navigate(`/nomina/${nominaId}/liquidar-terceros`)}
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                <FileText className="h-4 w-4" />
                Liquidar Terceros
              </Button>
            </div>
          )}

          {cargandoTerceros ? (
            <Card className="border-border">
              <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando terceros...
              </CardContent>
            </Card>
          ) : terceros.length === 0 ? (
            <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No hay terceros en este período</p>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  {esBorrador
                    ? 'Usa "Liquidar Terceros" arriba para calcular las actas de las empresas contratistas con operarios en este período.'
                    : 'No se liquidaron empresas contratistas en este período.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            terceros.map((nt) => {
              const pagado = nt.estado_pago === 'PAGADO';
              const total = toNumber(nt.total_a_transferir);
              const razonSocial = nt.tercero?.razon_social ?? `Tercero #${nt.tercero_id}`;
              const nit = nt.tercero?.nit ?? '—';
              const contacto = nt.tercero?.contacto ?? '';
              return (
                <Card
                  key={nt.id}
                  className="border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/nomina/${nominaId}/liquidar-terceros`)}
                >
                  <div className={`flex items-center justify-between px-5 py-3.5 border-b border-border ${pagado ? 'bg-success/5' : 'bg-amber-50/60 dark:bg-amber-950/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold ${pagado ? 'bg-success/10 text-success' : 'bg-amber-500/10 text-amber-700'}`}>
                        {razonSocial.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{razonSocial}</p>
                        <p className="text-xs text-muted-foreground">
                          NIT {nit}{contacto ? ` · ${contacto}` : ''}
                          {nt.operarios && nt.operarios.length > 0 && ` · ${nt.operarios.length} operario${nt.operarios.length !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total a pagar</p>
                        <p className="text-lg font-bold text-foreground">${total.toLocaleString('es-CO')}</p>
                      </div>
                      <Badge className={`text-xs ${pagado ? 'bg-success/10 text-success border-success/20' : 'bg-amber-500/10 text-amber-700 border-amber-300'}`}>
                        {pagado ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB COLABORADORES ── */}
      {tabActivo === 'colaboradores' && (
        <div className="space-y-4">
          <div>
            <h2 className="mb-2">
              {esBorrador ? 'Liquidación de Colaboradores' : 'Detalle por Colaborador'}
            </h2>
            <p className="text-muted-foreground">
              {esBorrador
                ? `${totalColabs} colaboradores - ${liquidados} liquidados, ${pendientes} pendientes`
                : `${empleadosMostrar.length} colaboradores liquidados en este período`}
            </p>
          </div>

          <Card className="border-border">
            <CardContent className="p-0">
              {empleadosMostrar.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {esBorrador
                    ? 'No hay empleados en esta nómina. Edita la nómina para agregar.'
                    : 'No hay empleados liquidados.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Colaborador</th>
                        <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Tipo</th>
                        <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Salario Base</th>
                        {!esBorrador && (
                          <>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Jornales</th>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Cosechas</th>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Devengado</th>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Deducciones</th>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Neto</th>
                          </>
                        )}
                        {esBorrador && (
                          <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                        )}
                        <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empleadosMostrar.map((emp, index) => {
                        const liquidado = emp.estado === 'LIQUIDADO';
                        const nombre =
                          emp.empleado?.nombre_completo ??
                          `${emp.empleado?.primer_nombre ?? ''} ${emp.empleado?.primer_apellido ?? ''}`.trim() ??
                          `Empleado #${emp.empleado_id}`;
                        const jornales = toNumber((emp as any).total_jornales);
                        const cosechas = toNumber((emp as any).total_cosechas);
                        return (
                          <tr
                            key={emp.id}
                            className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                              index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                            }`}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                                  <span className="text-sm font-bold">{getIniciales(nombre)}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-sm">{nombre}</span>
                                  {emp.empleado?.cargo && (
                                    <p className="text-xs text-muted-foreground">{emp.empleado.cargo}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="text-xs">{emp.salario_tipo}</Badge>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-medium">
                                ${toNumber(emp.salario_base).toLocaleString('es-CO')}
                              </span>
                            </td>
                            {!esBorrador && (
                              <>
                                <td className="p-4 text-right">
                                  <span className="text-sm font-medium">${jornales.toLocaleString('es-CO')}</span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-sm font-medium">${cosechas.toLocaleString('es-CO')}</span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-sm font-semibold text-success">
                                    ${toNumber(emp.total_devengado).toLocaleString('es-CO')}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-sm font-medium text-destructive">
                                    ${toNumber(emp.total_deducciones).toLocaleString('es-CO')}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-sm font-bold text-primary">
                                    ${toNumber(emp.total_neto).toLocaleString('es-CO')}
                                  </span>
                                </td>
                              </>
                            )}
                            {esBorrador && (
                              <td className="p-4 text-center">
                                <Badge
                                  className={`text-xs ${
                                    liquidado
                                      ? 'bg-success/10 text-success border-success/20'
                                      : 'bg-amber-500/10 text-amber-600 border-amber-200'
                                  }`}
                                >
                                  {emp.estado}
                                </Badge>
                              </td>
                            )}
                            <td className="p-4">
                              <div className="flex gap-2 justify-end">
                                {esBorrador && !liquidado && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => navigate(`/nomina/${nominaId}/liquidar/${emp.id}`)}
                                      className="gap-1 bg-primary hover:bg-primary/90"
                                      title="Liquidar"
                                    >
                                      <Calculator className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEmpleadoAQuitar(emp)}
                                      className="text-destructive hover:bg-destructive/10"
                                      title="Quitar de la nómina"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {liquidado && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate(`/nomina/${nominaId}/ver/${emp.id}`)}
                                      className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                                      title="Ver liquidación"
                                    >
                                      {esBorrador ? <Eye className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                    </Button>
                                    {esBorrador && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => navigate(`/nomina/${nominaId}/liquidar/${emp.id}?reliquidar=1`)}
                                        className="gap-1 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                                        title="Re-liquidar"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmar quitar empleado */}
      <AlertDialog
        open={!!empleadoAQuitar}
        onOpenChange={(o) => !o && setEmpleadoAQuitar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitar empleado de la nómina</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no podrá deshacerse. El empleado dejará de estar en este período.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accionando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={quitarEmpleado}
              disabled={accionando}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {accionando ? 'Quitando...' : 'Quitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar cerrar nómina */}
      <AlertDialog open={confirmarCerrar} onOpenChange={setConfirmarCerrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar nómina</AlertDialogTitle>
            <AlertDialogDescription>
              Al cerrar la nómina los valores quedan inmutables. Las ausencias y horas extras del período
              quedarán LIQUIDADAS y no podrán editarse. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accionando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={cerrarNomina} disabled={accionando}>
              {accionando ? 'Cerrando...' : 'Cerrar nómina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminar nómina */}
      <AlertDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar nómina</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la nómina y todos sus colaboradores pendientes. No podrá deshacerse.
              {liquidados > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  No se puede eliminar: hay {liquidados} colaborador(es) ya liquidados.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accionando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarNomina}
              disabled={accionando || liquidados > 0}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {accionando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Editar nómina */}
      <Dialog open={editarOpen} onOpenChange={setEditarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar período de la nómina
            </DialogTitle>
            <DialogDescription>
              Modifica el mes, periodicidad o quincena. Las fechas se recalculan automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-mes">Mes *</Label>
              <Select
                value={editForm.mes}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, mes: v }))}
              >
                <SelectTrigger id="edit-mes">
                  <SelectValue placeholder="Selecciona un mes" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MESES_NOMBRE).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-periodicidad">Periodicidad *</Label>
              <Select
                value={editForm.periodicidad}
                onValueChange={(v) => setEditForm((prev) => ({
                  ...prev,
                  periodicidad: v as Periodicidad,
                  quincena: v === 'MENSUAL' ? '' : prev.quincena,
                }))}
              >
                <SelectTrigger id="edit-periodicidad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                  <SelectItem value="MENSUAL">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.periodicidad === 'QUINCENAL' && (
              <div className="space-y-2">
                <Label htmlFor="edit-quincena">Quincena *</Label>
                <Select
                  value={editForm.quincena}
                  onValueChange={(v) => setEditForm((prev) => ({ ...prev, quincena: v as '1' | '2' }))}
                >
                  <SelectTrigger id="edit-quincena">
                    <SelectValue placeholder="Selecciona quincena" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Primera Quincena (1-15)</SelectItem>
                    <SelectItem value="2">Segunda Quincena (16-fin de mes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-obs">Observación</Label>
              <Input
                id="edit-obs"
                value={editForm.observacion}
                onChange={(e) => setEditForm((prev) => ({ ...prev, observacion: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditarOpen(false)}
              disabled={guardandoEdit}
            >
              Cancelar
            </Button>
            <Button onClick={guardarEdicion} disabled={guardandoEdit} className="gap-2">
              {guardandoEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
