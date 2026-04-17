import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
import StatusBadge from '../../components/common/StatusBadge';
import {
  ArrowLeft, CheckCircle, CloudRain, Sun, Loader2, Edit, Trash2,
  Wheat, Sprout, Scissors, Droplet, Shield, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { operacionesApi, Planilla } from '../../../api/operaciones';

export default function VerPlanilla() {
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  const id = Number(idParam);

  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [showAprobar, setShowAprobar] = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const r = await operacionesApi.ver(id);
      setPlanilla(r.data);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cargar planilla');
      navigate('/operaciones');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { if (id) cargar(); /* eslint-disable-next-line */ }, [id]);

  const aprobar = async () => {
    setProcesando(true);
    try {
      await operacionesApi.aprobar(id);
      toast.success('Planilla aprobada');
      await cargar();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo aprobar');
    } finally {
      setProcesando(false);
      setShowAprobar(false);
    }
  };

  const eliminar = async () => {
    setProcesando(true);
    try {
      await operacionesApi.eliminar(id);
      toast.success('Planilla eliminada');
      navigate('/operaciones');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo eliminar');
    } finally {
      setProcesando(false);
      setShowEliminar(false);
    }
  };

  const formatearFecha = (iso: string): string => {
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch { return iso; }
  };

  const formatearMoneda = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '—';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (Number.isNaN(n)) return '—';
    return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  };

  const nombreEmp = (e?: { primer_nombre?: string; primer_apellido?: string }) =>
    e ? [e.primer_nombre, e.primer_apellido].filter(Boolean).join(' ') : '—';

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!planilla) return null;

  const isBorrador = planilla.estado === 'BORRADOR';
  const jornalesPorTipo = (tipo: string) => (planilla.jornales ?? []).filter((j) => j.tipo === tipo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/operaciones')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Operaciones
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Planilla del {formatearFecha(planilla.fecha)}</h1>
            <StatusBadge status={isBorrador ? 'BORRADOR' : 'APROBADO'} />
          </div>
          <p className="text-muted-foreground">
            Elaborada por {planilla.creado_por_rel?.name ?? '—'}
            {planilla.aprobado_por_rel && <> · Aprobada por {planilla.aprobado_por_rel.name}</>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isBorrador && (
            <>
              <Button variant="outline" className="gap-2"
                onClick={() => navigate(`/operaciones/planilla/editar/${planilla.id}`)}>
                <Edit className="h-4 w-4" /> Editar
              </Button>
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setShowEliminar(true)}>
                <Trash2 className="h-4 w-4" /> Eliminar
              </Button>
              <Button className="gap-2 bg-success hover:bg-success/90" onClick={() => setShowAprobar(true)}>
                <CheckCircle className="h-5 w-5" /> Aprobar
              </Button>
            </>
          )}
        </div>
      </div>

      {!isBorrador && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-success mt-0.5" />
          <div>
            <p className="font-medium">Planilla aprobada</p>
            <p className="text-sm text-muted-foreground">
              Esta planilla es inmutable. No se pueden editar ni eliminar sus registros.
            </p>
          </div>
        </div>
      )}

      {/* Info general */}
      <Card>
        <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Fecha</p>
            <p className="font-medium">{formatearFecha(planilla.fecha)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inicio de labores</p>
            <p className="font-medium">{planilla.hora_inicio?.slice(0, 5) ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Clima</p>
            <p className="font-medium flex items-center gap-1">
              {planilla.hubo_lluvia
                ? <><CloudRain className="h-4 w-4" /> {planilla.cantidad_lluvia ?? '0'} mm</>
                : <><Sun className="h-4 w-4" /> Sin lluvia</>}
            </p>
          </div>
          {planilla.observaciones && (
            <div className="sm:col-span-3">
              <p className="text-xs text-muted-foreground">Observaciones</p>
              <p className="text-sm">{planilla.observaciones}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cosechas */}
      {(planilla.cosechas?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wheat className="h-5 w-5" /> Cosecha ({planilla.cosechas!.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {planilla.cosechas!.map((c) => (
              <div key={c.id} className="border rounded-lg p-4 bg-muted/10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{c.lote?.nombre} · {c.sublote?.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.gajos_reportados} gajos
                      {c.peso_confirmado && ` · ${c.peso_confirmado} kg`}
                    </p>
                    <p className="text-sm mt-1">
                      Cuadrilla: {c.cuadrilla.map((q) => nombreEmp(q.empleado)).join(', ')}
                    </p>
                  </div>
                  <span className="font-semibold text-success">{formatearMoneda(c.valor_total)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Jornales por tipo */}
      {renderBloqueJornal(jornalesPorTipo('PLATEO'),        'Plateo',        Sprout, nombreEmp, formatearMoneda)}
      {renderBloqueJornal(jornalesPorTipo('PODA'),          'Poda',          Scissors, nombreEmp, formatearMoneda)}
      {renderBloqueJornal(jornalesPorTipo('FERTILIZACION'), 'Fertilización', Droplet, nombreEmp, formatearMoneda)}
      {renderBloqueJornal(jornalesPorTipo('SANIDAD'),       'Sanidad',       Shield, nombreEmp, formatearMoneda)}
      {renderBloqueJornal(jornalesPorTipo('OTROS'),         'Otros',         Wrench, nombreEmp, formatearMoneda)}

      {/* Totales */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Colaboradores</p>
              <p className="text-2xl font-bold">{planilla.colaboradores_count ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Jornales</p>
              <p className="text-lg font-semibold">{formatearMoneda(planilla.total_jornales_sum)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total General</p>
              <p className="text-2xl font-bold text-success">{formatearMoneda(planilla.total_general)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AlertDialog open={showAprobar} onOpenChange={setShowAprobar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar planilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Una vez aprobada queda inmutable: no podrás editar ni eliminar sus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={aprobar} disabled={procesando}>
              {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, aprobar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEliminar} onOpenChange={setShowEliminar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar planilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Solo se permite eliminar planillas en BORRADOR sin jornales ni cosechas registradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={eliminar} disabled={procesando}
              className="bg-destructive hover:bg-destructive/90">
              {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper para renderizar bloque de jornales
// ─────────────────────────────────────────────────────────────

function renderBloqueJornal(
  items: any[],
  titulo: string,
  Icon: any,
  nombreEmp: (e?: any) => string,
  formatearMoneda: (v: any) => string,
) {
  if (items.length === 0) return null;
  return (
    <Card key={titulo}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" /> {titulo} ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((j) => (
          <div key={j.id} className="border rounded-lg p-4 bg-muted/10 flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium">{nombreEmp(j.empleado)}</p>
              <p className="text-sm text-muted-foreground">
                {j.lote?.nombre}{j.sublote ? ` · ${j.sublote.nombre}` : ''}
                {j.cantidad_palmas && <> · {j.cantidad_palmas} palmas</>}
                {j.insumo && <> · {j.insumo.nombre}</>}
                {j.gramos_por_palma && <> · {j.gramos_por_palma} g/palma</>}
              </p>
              {j.nombre_trabajo && <p className="text-sm font-medium mt-1">{j.nombre_trabajo}</p>}
              {j.descripcion && <p className="text-sm mt-1">{j.descripcion}</p>}
            </div>
            <span className="font-semibold text-success whitespace-nowrap">{formatearMoneda(j.valor_total)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}