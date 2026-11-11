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
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { num } from '../../lib/formato';
import {
  CheckCircle, ClipboardList, Clock, CloudRain, Download,
  Leaf, Loader2, Timer, User, Users, Wrench, type LucideIcon,
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
        <tr key={t.id}>
          {i === 0 && (
            <td rowSpan={grupo.trabajos.length} className="px-5 py-2.5 align-top">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="border-primary/20 bg-primary-soft text-xs font-semibold text-primary">
                  {grupo.labor}
                </Badge>
                <span className="text-xs tabular-nums text-muted-foreground">
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
        <tr className="bg-muted/40">
          <td className="px-5 py-2 text-xs font-semibold text-muted-foreground" colSpan={4}>
            Total {grupo.labor}
          </td>
          <td className="px-5 py-2 text-xs font-bold text-foreground">{grupo.total}</td>
        </tr>
      )}
    </>
  );
}

/** Clases de la cabecera de tabla del sistema visual. */
const CABECERA = 'bg-muted/60 text-[13px] text-muted-foreground';

/** Tarjeta de sección: el título con su ícono y debajo la tabla o el texto. */
function Seccion({ icono: Icono, titulo, children }: {
  icono: LucideIcon;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0">
      <CardHeader className="border-b border-border px-5 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icono className="h-4 w-4 text-primary" strokeWidth={2} />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function LaboresDePalma({ grupos }: { grupos: GrupoLaborPalma[] }) {
  return (
    <Seccion icono={Leaf} titulo="Labores de palma">
      {grupos.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          Ese día no se registró ninguna labor de palma.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className={CABECERA}>
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">Labor</th>
                <th className="px-5 py-2.5 text-left font-semibold">Colaboradores</th>
                <th className="px-5 py-2.5 text-left font-semibold">Lotes</th>
                <th className="px-5 py-2.5 text-left font-semibold">Sublotes</th>
                <th className="px-5 py-2.5 text-left font-semibold">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grupos.map((g) => <FilasDeLabor key={g.clave} grupo={g} />)}
            </tbody>
          </table>
        </div>
      )}
    </Seccion>
  );
}

function LaboresDeFinca({ resumen }: { resumen: ResumenPlanilla }) {
  return (
    <Seccion icono={Wrench} titulo="Labores de finca">
      <table className="w-full text-sm">
        <thead className={CABECERA}>
          <tr>
            <th className="px-5 py-2.5 text-left font-semibold">Colaborador</th>
            <th className="px-5 py-2.5 text-left font-semibold">Labor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {resumen.laboresFinca.map((f) => (
            <tr key={f.id}>
              <td className="px-5 py-2.5 font-medium">{f.colaborador}</td>
              <td className="px-5 py-2.5 text-muted-foreground">
                {f.labor}
                {f.ubicacion && <span className="text-muted-foreground/70"> · {f.ubicacion}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Seccion>
  );
}

const TONO_ESTADO: Record<string, string> = {
  Aprobada: 'border-success/30 bg-success-soft text-success',
  Liquidada: 'border-primary/30 bg-primary-soft text-primary',
  Rechazada: 'border-destructive/30 bg-destructive-soft text-destructive',
};

function HorasExtra({ resumen }: { resumen: ResumenPlanilla }) {
  return (
    <Seccion icono={Timer} titulo="Horas extra">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={CABECERA}>
            <tr>
              <th className="px-5 py-2.5 text-left font-semibold">Colaborador</th>
              <th className="px-5 py-2.5 text-left font-semibold">Tipo</th>
              <th className="px-5 py-2.5 text-right font-semibold">Horas</th>
              <th className="px-5 py-2.5 text-left font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {resumen.horasExtra.map((h) => (
              <tr key={h.id}>
                <td className="px-5 py-2.5 font-medium">{h.colaborador}</td>
                <td className="px-5 py-2.5 text-muted-foreground">{h.tipo}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{h.horas}</td>
                <td className="px-5 py-2.5">
                  <Badge
                    variant="outline"
                    className={`text-xs font-normal ${TONO_ESTADO[h.estado] ?? 'text-muted-foreground'}`}
                  >
                    {h.estado}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/40">
              <td colSpan={2} className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                Total de horas:
              </td>
              <td className="px-5 py-2.5 text-right font-bold tabular-nums">
                {resumen.horasExtraSumadas}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Seccion>
  );
}

function Novedades({ observaciones, ausentes }: { observaciones: string; ausentes: string[] }) {
  return (
    <Seccion icono={ClipboardList} titulo="Novedades">
      <div className="space-y-4 p-5">
        {observaciones && (
          <div>
            <p className="mb-1 text-[13px] font-medium text-muted-foreground">Observaciones</p>
            <p className="text-sm">{observaciones}</p>
          </div>
        )}
        {ausentes.length > 0 && (
          <div>
            <p className="mb-1 text-[13px] font-medium text-muted-foreground">Ausentes</p>
            <div className="space-y-0.5">
              {ausentes.map((a) => <p key={a} className="text-sm">{a}</p>)}
            </div>
          </div>
        )}
      </div>
    </Seccion>
  );
}

/** Las dos filas de arriba: los datos del día y lo que se logró. */
function Encabezado({ resumen }: { resumen: ResumenPlanilla }) {
  const datos = [
    { icon: <User className="h-3.5 w-3.5" strokeWidth={2} />, label: 'Elaborado por', value: resumen.elaboradoPor },
    { icon: <Clock className="h-3.5 w-3.5" strokeWidth={2} />, label: 'Inicio labores', value: resumen.inicioLabores },
    { icon: <CloudRain className="h-3.5 w-3.5" strokeWidth={2} />, label: 'Lluvia', value: resumen.lluvia },
    { icon: <Users className="h-3.5 w-3.5" strokeWidth={2} />, label: 'Colaboradores cosecha', value: num(resumen.colaboradoresCosecha) },
  ];

  const metricas = [
    { label: 'Palmas plateadas', value: num(resumen.palmasPlateadas) },
    { label: 'Palmas podadas', value: num(resumen.palmasPodadas) },
    { label: 'Palmas fertilizadas', value: num(resumen.palmasFertilizadas) },
    { label: 'Horas extra', value: num(resumen.horasExtraSumadas) },
  ];

  return (
    <Card className="gap-0">
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border sm:grid-cols-4">
        {datos.map((item) => (
          <div key={item.label} className="min-w-0 px-5 py-3.5">
            <div className="mb-0.5 flex items-center gap-1.5 text-muted-foreground">
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </div>
            <p className="truncate text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 divide-x divide-border bg-muted/40 sm:grid-cols-4">
        {metricas.map((m) => (
          <div key={m.label} className="min-w-0 px-5 py-3">
            <p className="mb-0.5 text-xs text-muted-foreground">{m.label}</p>
            <p className="truncate text-base font-bold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>
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
      <div className="mx-auto max-w-4xl">
        <Card className="gap-0">
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando la planilla…
          </div>
        </Card>
      </div>
    );
  }

  if (error || !planilla) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="gap-0">
          <EmptyState
            title="No se pudo abrir la planilla"
            description={error ?? 'La planilla no existe o ya fue eliminada.'}
            action={{ label: 'Volver a operaciones', onClick: () => navigate('/operaciones') }}
          />
        </Card>
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
    <div className="mx-auto max-w-4xl space-y-6">

      <PageHeader
        backTo="/operaciones"
        eyebrow={<span className="capitalize">{fechaLarga}</span>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            Planilla del día
            {aprobada ? (
              <Badge variant="outline" className="border-success/30 bg-success-soft text-success">
                <CheckCircle className="h-3.5 w-3.5" strokeWidth={2} />
                Aprobada
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Borrador</Badge>
            )}
          </span>
        }
        actions={
          <Button variant="outline" disabled={descargando} onClick={() => void descargar()}>
            <Download className="h-4 w-4" strokeWidth={2} />
            {descargando ? 'Generando...' : 'Descargar PDF'}
          </Button>
        }
      />

      <Encabezado resumen={datos} />

      <LaboresDePalma grupos={datos.laboresPalma} />

      {hayHorasExtra && <HorasExtra resumen={datos} />}

      {/* Dos columnas solo cuando hay dos tarjetas: una sola a media página se
          veía recortada contra el ancho de las labores de arriba. */}
      <div className={`grid gap-6 ${hayFinca && hayNovedades ? 'sm:grid-cols-2' : ''}`}>
        {hayFinca && <LaboresDeFinca resumen={datos} />}
        {hayNovedades && (
          <Novedades observaciones={planilla.observaciones ?? ''} ausentes={datos.ausentes} />
        )}
      </div>
    </div>
  );
}
