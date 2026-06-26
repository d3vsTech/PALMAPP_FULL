import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  Calculator,
  Lock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Eye,
  Loader2,
  Trash2,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import {
  nominaApi,
  Nomina,
  NominaEmpleado,
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
  const [accionando, setAccionando] = useState(false);

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

  useEffect(() => {
    cargar();
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
      if (e.code === 'NOMINA_CON_PENDIENTES') {
        toast.error('Hay empleados pendientes por liquidar');
      } else {
        toast.error(e.message ?? 'Error al cerrar nómina');
      }
    } finally {
      setAccionando(false);
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

  const total = toNumber(nomina.total_general);
  const ded = toNumber(nomina.total_deducciones);
  const dev = total + ded;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/nomina">Nómina</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{periodoLabel(nomina)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
              {empleados.filter((e) => e.estado === 'LIQUIDADO').length}/{empleados.length} liquidados
            </p>
          </div>

          {esBorrador && (
            <div className="flex gap-2">
              <Button
                variant="default"
                className="gap-2"
                onClick={() => setConfirmarCerrar(true)}
                disabled={
                  empleados.length === 0 ||
                  empleados.some((e) => e.estado !== 'LIQUIDADO')
                }
              >
                <Lock className="h-4 w-4" />
                Cerrar Nómina
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Devengado</p>
                <p className="text-3xl font-bold text-success">
                  ${dev.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Ingresos del período</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Deducciones</p>
                <p className="text-3xl font-bold text-destructive">
                  ${ded.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Descuentos legales</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-7 w-7 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Neto a Pagar</p>
                <p className="text-3xl font-bold text-primary">
                  ${total.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total a desembolsar</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-7 w-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empleados */}
      <div className="space-y-4">
        <div>
          <h2 className="mb-2">
            {esBorrador ? 'Liquidación de Colaboradores' : 'Detalle por Colaborador'}
          </h2>
          <p className="text-muted-foreground">
            {esBorrador
              ? `${empleados.length} empleados — ${empleados.filter((e) => e.estado === 'LIQUIDADO').length} liquidados, ${empleados.filter((e) => e.estado === 'PENDIENTE').length} pendientes`
              : `${empleadosMostrar.length} empleados liquidados en este período`}
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
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Devengado</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Deducciones</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Neto</th>
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Estado</th>
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/nomina/${nominaId}/ver/${emp.id}`)}
                                  className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                                  title="Ver liquidación"
                                >
                                  {esBorrador ? <Eye className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                </Button>
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
    </div>
  );
}
