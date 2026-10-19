/**
 * Planilla del día en solo lectura.
 *
 * Antes esta ruta abría el wizard con los campos bloqueados: para enterarse de
 * lo que pasó ese día había que recorrer cinco etapas y ocho pestañas. Ahora es
 * una ficha de una pantalla, con el diseño que el usuario aprobó: el encabezado
 * del día, lo que se hizo en palma, lo que se hizo en finca y las novedades.
 *
 * Lee el mismo `GET /operaciones/{id}` de siempre; el wizard sigue siendo quien
 * crea y edita, y no se tocó.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, CheckCircle, ClipboardList, Clock, CloudRain, Download,
  Leaf, Loader2, Timer, User, Users, Wrench,
} from 'lucide-react';
import { operacionesApi, type PlanillaDetalle, type Resumen } from '../../../api/operaciones';
import {
  resumirPlanilla,
  type GrupoLaborPalma,
  type ResumenPlanilla,
} from './planilla/resumenPlanilla';
import { formatFecha } from '../../utils/fecha';
import { descargarPlanillaPdf } from './planilla/planillaPdf';

function ColBadges({ nombres }: { nombres: string[] }) {
  if (nombres.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {nombres.map((n) => (
        <Badge key={n} variant="secondary" className="text-xs font-normal">{n}</Badge>
      ))}
    </div>
  );
}

function LoteBadges({ nombres }: { nombres: string[] }) {
  if (nombres.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {nombres.map((n) => (
        <Badge key={n} variant="outline" className="text-xs font-normal">{n}</Badge>
      ))}
    </div>
  );
}

/**
 * Los renglones de una labor. La celda del nombre abarca todas sus filas, como
 * en el papel: la labor se escribe una vez y debajo va cada cuadrilla.
 */
function FilasDeLabor({ grupo }: { grupo: GrupoLaborPalma }) {
  return (
    <>
      {grupo.trabajos.map((t, i) => (
        <tr
          key={t.id}
          className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
        >
          {i === 0 && (
            <td rowSpan={grupo.trabajos.length} className="px-5 py-2.5 align-top">
              <div className="flex items-center gap-1.5">
                <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold text-xs">
                  {grupo.labor}
                </Badge>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {grupo.trabajos.length}
                </span>
              </div>
            </td>
          )}
          <td className="px-5 py-2.5"><ColBadges nombres={t.colaboradores} /></td>
          <td className="px-5 py-2.5"><LoteBadges nombres={t.lotes} /></td>
          <td className="px-5 py-2.5"><LoteBadges nombres={t.sublotes} /></td>
          <td className="px-5 py-2.5 text-xs text-muted-foreground">{t.detalle || '—'}</td>
        </tr>
      ))}
      {grupo.total && (
        <tr className="border-b border-border bg-muted/10 last:border-0">
          <td className="px-5 py-2 text-xs font-semibold text-muted-foreground" colSpan={4}>
            Total {grupo.labor}
          </td>
          <td className="px-5 py-2 text-xs font-bold text-foreground">{grupo.total}</td>
        </tr>
      )}
    </>
  );
}

function LaboresDePalma({ grupos }: { grupos: GrupoLaborPalma[] }) {
  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border py-3 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Leaf className="h-4 w-4 text-primary" />
          Labores de Palma
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {grupos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Ese día no se registró ninguna labor de palma.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground text-xs">Labor</th>
                  <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground text-xs">Colaboradores</th>
                  <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground text-xs">Lotes</th>
                  <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground text-xs">Sublotes</th>
                  <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground text-xs">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => <FilasDeLabor key={g.clave} grupo={g} />)}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LaboresDeFinca({ resumen }: { resumen: ResumenPlanilla }) {
  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border py-3 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          Labores de Finca
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-5 py-2 font-medium text-muted-foreground text-xs">Colaborador</th>
              <th className="text-left px-5 py-2 font-medium text-muted-foreground text-xs">Labor</th>
            </tr>
          </thead>
          <tbody>
            {resumen.laboresFinca.map((f) => (
              <tr key={f.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2 font-medium text-xs">{f.colaborador}</td>
                <td className="px-5 py-2 text-xs text-muted-foreground">
                  {f.labor}
                  {f.ubicacion && <span className="text-muted-foreground/70"> · {f.ubicacion}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

const TONO_ESTADO: Record<string, string> = {
  Aprobada: 'border-success/30 bg-success/10 text-success',
  Liquidada: 'border-primary/30 bg-primary/10 text-primary',
  Rechazada: 'border-destructive/30 bg-destructive/10 text-destructive',
};

function HorasExtra({ resumen }: { resumen: ResumenPlanilla }) {
  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border py-3 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          Horas Extra
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-5 py-2 font-medium text-muted-foreground text-xs">Colaborador</th>
                <th className="text-left px-5 py-2 font-medium text-muted-foreground text-xs">Tipo</th>
                <th className="text-right px-5 py-2 font-medium text-muted-foreground text-xs">Horas</th>
                <th className="text-left px-5 py-2 font-medium text-muted-foreground text-xs">Estado</th>
              </tr>
            </thead>
            <tbody>
              {resumen.horasExtra.map((h) => (
                <tr key={h.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2 font-medium text-xs">{h.colaborador}</td>
                  <td className="px-5 py-2 text-xs text-muted-foreground">{h.tipo}</td>
                  <td className="px-5 py-2 text-right text-xs tabular-nums">{h.horas}</td>
                  <td className="px-5 py-2">
                    <Badge
                      variant="outline"
                      className={`text-xs font-normal ${TONO_ESTADO[h.estado] ?? 'text-muted-foreground'}`}
                    >
                      {h.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border bg-muted/10">
                <td colSpan={2} className="px-5 py-2 text-xs font-semibold text-right text-muted-foreground">
                  Total de horas:
                </td>
                <td className="px-5 py-2 text-right text-sm font-bold tabular-nums">
                  {resumen.horasExtraSumadas}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Novedades({ observaciones, ausentes }: { observaciones: string; ausentes: string[] }) {
  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border py-3 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Novedades
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {observaciones && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Observaciones</p>
            <p className="text-sm">{observaciones}</p>
          </div>
        )}
        {ausentes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Ausentes</p>
            <div className="space-y-0.5">
              {ausentes.map((a) => <p key={a} className="text-sm">{a}</p>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Las dos filas de arriba: los datos del día y lo que se logró. */
function Encabezado({ resumen }: { resumen: ResumenPlanilla }) {
  const datos = [
    { icon: <User className="h-3.5 w-3.5" />, label: 'Elaborado por', value: resumen.elaboradoPor },
    { icon: <Clock className="h-3.5 w-3.5" />, label: 'Inicio labores', value: resumen.inicioLabores },
    { icon: <CloudRain className="h-3.5 w-3.5" />, label: 'Lluvia', value: resumen.lluvia },
    { icon: <Users className="h-3.5 w-3.5" />, label: 'Colaboradores cosecha', value: `${resumen.colaboradoresCosecha}` },
  ];

  const metricas = [
    { label: 'Palmas plateadas', value: resumen.palmasPlateadas.toLocaleString('es-CO') },
    { label: 'Palmas podadas', value: resumen.palmasPodadas.toLocaleString('es-CO') },
    { label: 'Palmas fertilizadas', value: resumen.palmasFertilizadas.toLocaleString('es-CO') },
    { label: 'Horas extra', value: `${resumen.horasExtraSumadas}` },
  ];

  return (
    <Card className="border-border">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-b border-border">
          {datos.map((item) => (
            <div key={item.label} className="px-5 py-3.5 min-w-0">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </div>
              <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border bg-muted/20">
          {metricas.map((m) => (
            <div key={m.label} className="px-5 py-3 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">{m.label}</p>
              <p className="text-base font-bold text-foreground truncate">{m.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Verplanilla() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [planilla, setPlanilla] = useState<PlanillaDetalle | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Dos llamadas porque el backend parte el dato: el detalle trae los jornales
   * y las cosechas, y el resumen trae quién elaboró la planilla. Si el resumen
   * falla la pantalla se pinta igual, solo sin ese nombre.
   */
  const cargar = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    setError(null);
    try {
      const [detalle, panel] = await Promise.all([
        operacionesApi.ver(Number(id)),
        operacionesApi.resumen(Number(id)).catch(() => null),
      ]);
      setPlanilla(detalle.data);
      setResumen(panel?.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la planilla');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { void cargar(); }, [cargar]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando la planilla...
      </div>
    );
  }

  if (error || !planilla) {
    return (
      <div className="space-y-4 py-20 text-center">
        <p className="text-muted-foreground">{error ?? 'Planilla no encontrada.'}</p>
        <Button variant="outline" onClick={() => navigate('/operaciones')}>Volver a Operaciones</Button>
      </div>
    );
  }

  const datos = resumirPlanilla(planilla, resumen);
  const aprobada = planilla.estado === 'APROBADA';
  // El backend manda la fecha a secas o con hora según el endpoint. El mediodía
  // fijo evita que la zona horaria la corra un día hacia atrás.
  const fechaLarga = formatFecha(`${String(planilla.fecha).slice(0, 10)}T12:00:00`, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const descargar = async () => {
    setDescargando(true);
    try {
      await descargarPlanillaPdf(planilla, datos);
    } catch (e) {
      // Sin esto un fallo de jsPDF se perdía en la consola y el botón quedaba
      // girando para siempre.
      setError(e instanceof Error ? e.message : 'No se pudo generar el PDF');
    } finally {
      setDescargando(false);
    }
  };

  const hayFinca = datos.laboresFinca.length > 0;
  const hayNovedades = Boolean(planilla.observaciones) || datos.ausentes.length > 0;
  const hayHorasExtra = datos.horasExtra.length > 0;

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl space-y-5">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/operaciones')} className="gap-1.5 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div className="h-5 w-px bg-border" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-primary">Planilla del Día</h1>
              {aprobada ? (
                <Badge className="bg-success/15 text-success border-success/30 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aprobada
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">Borrador</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground capitalize">{fechaLarga}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={descargando}
          onClick={() => void descargar()}
        >
          <Download className="h-3.5 w-3.5" />
          {descargando ? 'Generando...' : 'Descargar'}
        </Button>
      </div>

      <Encabezado resumen={datos} />

      <LaboresDePalma grupos={datos.laboresPalma} />

      {hayHorasExtra && <HorasExtra resumen={datos} />}

      {/* Dos columnas solo cuando hay dos tarjetas: una sola a media página se
          veía recortada contra el ancho de las labores de arriba. */}
      <div className={`grid gap-5 ${hayFinca && hayNovedades ? 'sm:grid-cols-2' : ''}`}>
        {hayFinca && <LaboresDeFinca resumen={datos} />}
        {hayNovedades && (
          <Novedades observaciones={planilla.observaciones ?? ''} ausentes={datos.ausentes} />
        )}
      </div>
    </div>
  );
}
