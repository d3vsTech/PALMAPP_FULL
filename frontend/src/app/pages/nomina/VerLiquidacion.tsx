import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import {
  ArrowLeft,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Loader2,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { nominaApi, DesprendibleData, CategoriaResumenTrabajo } from '../../../api/nomina';
import { generarDesprendiblePdf } from './DesprendiblePago';
import type { ApiError } from '../../../api/client';

const CATEGORIAS: { key: keyof Omit<NonNullable<DesprendibleData['resumen_trabajo']>, 'total_general'>; titulo: string }[] = [
  { key: 'cosecha', titulo: 'Cosecha' },
  { key: 'plateo', titulo: 'Plateo' },
  { key: 'poda', titulo: 'Poda' },
  { key: 'fertilizacion', titulo: 'Fertilización' },
  { key: 'sanidad', titulo: 'Sanidad' },
  { key: 'otros', titulo: 'Otros' },
  { key: 'finca', titulo: 'Finca' },
];

function getIniciales(nombre: string): string {
  const partes = nombre.trim().split(' ').filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function fmt(n: number | null | undefined): string {
  // Guardamos contra null/undefined que llegan del backend cuando la
  // liquidación aún no está totalmente calculada (bono/deducciones en null).
  if (n == null) return '$0';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(num)) return '$0';
  return `$${num.toLocaleString('es-CO')}`;
}

function Item({
  label,
  value,
  destructivo,
}: {
  label: string;
  value: string;
  destructivo?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${destructivo ? 'text-destructive' : ''}`}>{value}</span>
    </div>
  );
}

export default function VerLiquidacion() {
  const { nominaId, colaboradorId } = useParams();
  const navigate = useNavigate();
  const nominaEmpleadoId = colaboradorId ? parseInt(colaboradorId) : null;

  const [data, setData] = useState<DesprendibleData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [generandoWa, setGenerandoWa] = useState(false);

  useEffect(() => {
    if (!nominaEmpleadoId) return;
    setCargando(true);
    nominaApi
      .desprendible(nominaEmpleadoId)
      .then((res) => setData(res.data))
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar liquidación'))
      .finally(() => setCargando(false));
  }, [nominaEmpleadoId]);

  const descargarPdf = async () => {
    if (!data) return;
    setDescargando(true);
    try {
      // Generado en el cliente con jsPDF — el template blade del backend
      // pegaba los valores al texto sin alineación (BASE JORNALES$421.000).
      generarDesprendiblePdf(data);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'Error al descargar PDF');
    } finally {
      setDescargando(false);
    }
  };

  const enviarWhatsapp = async () => {
    if (!nominaEmpleadoId) return;
    setGenerandoWa(true);
    const nombre = data?.empleado.nombre_completo ?? 'Colaborador';
    const periodo = data?.nomina.periodo_label ?? '';
    const neto = data?.liquidacion.total_neto ?? 0;
    const resumen =
      `Hola ${nombre}, adjunto tu desprendible de pago del período ${periodo}. `
      + `Neto a pagar: $${neto.toLocaleString('es-CO')}.`;
    try {
      const res = await nominaApi.desprendibleWhatsapp(nominaEmpleadoId);
      const text = encodeURIComponent(`${resumen}\n\nDescarga el PDF: ${res.data.url}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } catch {
      // Backend no pudo generar el PDF — abrir WhatsApp con solo el resumen
      const text = encodeURIComponent(resumen);
      window.open(`https://wa.me/?text=${text}`, '_blank');
      toast.info('No se pudo adjuntar el PDF. Abriendo WhatsApp con el resumen.');
    } finally {
      setGenerandoWa(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando liquidación...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Liquidación no encontrada.
      </div>
    );
  }

  const { empleado, nomina, liquidacion, resumen_trabajo } = data;
  const esVariable = empleado.salario_tipo === 'VARIABLE';

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
            <BreadcrumbLink asChild>
              <Link to={`/nomina/${nominaId}`}>{nomina.periodo_label}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Liquidación</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/nomina/${nominaId}`)}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <span className="text-xl font-bold text-primary">
                {getIniciales(empleado.nombre_completo)}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">{empleado.nombre_completo}</h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline">{empleado.salario_tipo}</Badge>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{empleado.cargo}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{nomina.periodo_label}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={descargarPdf} disabled={descargando} className="gap-2">
            {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar PDF
          </Button>
          <Button variant="outline" onClick={enviarWhatsapp} disabled={generandoWa} className="gap-2">
            {generandoWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            WhatsApp
          </Button>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-6 w-6 text-primary" />
            Información del período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Finca</p>
              <p className="font-medium">{data.finca}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Documento</p>
              <p className="font-medium">{empleado.documento}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Período</p>
              <p className="font-medium">
                {nomina.fecha_inicio} → {nomina.fecha_fin}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Liquidado por</p>
              <p className="font-medium">{liquidacion.liquidado_por}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {false && esVariable && resumen_trabajo && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Resumen de trabajo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {CATEGORIAS.map(({ key, titulo }) => {
              const cat = resumen_trabajo[key] as CategoriaResumenTrabajo;
              if (!cat || cat.filas.length === 0) return null;
              // Cosecha se paga por `total_cosecha` (no por jornal). El resto
              // de categorías usa `subtotal_jornal` / `f.jornal`.
              const esCosecha = key === 'cosecha';
              // Fallbacks para cuando el backend no calcula `peso_kg` /
              // `total_cosecha` (ocurre con operarios de tercero): se
              // reconstruyen aquí como racimos × promedio_kg y peso × precio_kg.
              const pesoDe = (f: any) => {
                const p = Number(f.peso_kg ?? 0);
                if (p > 0) return p;
                return Number(f.racimos ?? 0) * Number(f.promedio_kg ?? 0);
              };
              const totalCosechaDe = (f: any) => {
                const t = Number(f.total_cosecha ?? 0);
                if (t > 0) return t;
                return pesoDe(f) * Number(f.precio_kg ?? 0);
              };
              const subtotal = esCosecha
                ? (cat.subtotal_valor && cat.subtotal_valor > 0
                    ? cat.subtotal_valor
                    : cat.filas.reduce((s, f) => s + totalCosechaDe(f), 0))
                : cat.subtotal_jornal;
              return (
                <div key={key} className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-primary/10 px-3 py-2 border-b border-border flex justify-between items-center">
                    <h4 className="font-semibold text-sm text-primary">{titulo}</h4>
                    <span className="font-semibold text-sm text-success">
                      ${(subtotal ?? 0).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left p-2">Fecha</th>
                          <th className="text-left p-2">Lote</th>
                          <th className="text-left p-2">Sublote</th>
                          {esCosecha && <th className="text-right p-2">Racimos</th>}
                          {esCosecha && <th className="text-right p-2">Peso (kg)</th>}
                          <th className="text-right p-2">
                            {esCosecha ? 'Total' : 'Jornal'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.filas.map((f, i) => {
                          const peso = esCosecha ? pesoDe(f) : 0;
                          const valor = esCosecha ? totalCosechaDe(f) : f.jornal;
                          return (
                            <tr
                              key={i}
                              className={`border-b border-border last:border-0 ${
                                i % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                              }`}
                            >
                              <td className="p-2">{f.fecha}</td>
                              <td className="p-2">{f.lote ?? '-'}</td>
                              <td className="p-2">{f.sublote ?? '-'}</td>
                              {esCosecha && (
                                <td className="p-2 text-right">{(f.racimos ?? 0).toLocaleString('es-CO')}</td>
                              )}
                              {esCosecha && (
                                <td className="p-2 text-right">
                                  {peso.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
                                </td>
                              )}
                              <td className="p-2 text-right font-semibold text-success">
                                ${Math.round(valor).toLocaleString('es-CO')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            <div className="flex justify-end pt-2 border-t-2 border-primary">
              <div className="flex items-center gap-3">
                <span className="font-bold">Total General:</span>
                <span className="text-2xl font-bold text-success">
                  ${(resumen_trabajo.total_general ?? 0).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-6 w-6 text-success" />
            Devengado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 bg-success/5 p-4 rounded-lg border border-success/20">
            <Item label="Días trabajados" value={String(liquidacion.dias_trabajados)} />
            {liquidacion.total_jornales > 0 && (
              <Item label="Jornales" value={fmt(liquidacion.total_jornales)} />
            )}
            {liquidacion.total_cosecha > 0 && (
              <Item label="Cosecha" value={fmt(liquidacion.total_cosecha)} />
            )}
            {liquidacion.total_horas_extra > 0 && (
              <Item
                label={
                  (liquidacion as any).detalle_horas_extra?.length > 0
                    ? `Horas extra · ${Array.from(new Set(
                        ((liquidacion as any).detalle_horas_extra as any[])
                          .map((h) => h.tipo_nombre || h.codigo).filter(Boolean),
                      )).join(', ')}`
                    : 'Horas extra'
                }
                value={fmt(liquidacion.total_horas_extra)}
              />
            )}
            {liquidacion.total_recargos > 0 && (
              <Item label="Recargos" value={fmt(liquidacion.total_recargos)} />
            )}
            {liquidacion.total_incapacidades > 0 && (
              <Item
                label={
                  (liquidacion as any).detalle_ausencias?.length > 0
                    ? `Incapacidades · ${Array.from(new Set(
                        ((liquidacion as any).detalle_ausencias as any[])
                          .filter((a) => a.afecta === 'INCAPACIDAD')
                          .map((a) => a.motivo_nombre).filter(Boolean),
                      )).join(', ')}`
                    : 'Incapacidades'
                }
                value={fmt(liquidacion.total_incapacidades)}
              />
            )}
            {liquidacion.bonificaciones.length > 0 && (
              <>
                <p className="text-xs font-semibold mt-3 mb-1">Bonificaciones</p>
                {liquidacion.bonificaciones.map((b, i) => (
                  <Item
                    key={i}
                    label={b.nombre + (b.observacion ? ` (${b.observacion})` : '')}
                    value={fmt(b.valor)}
                  />
                ))}
              </>
            )}
            <div className="flex justify-between pt-2 border-t border-success/30">
              <span className="font-bold text-success">Total devengado</span>
              <span className="font-bold text-lg text-success">
                {fmt((liquidacion.total_devengado ?? 0) + (liquidacion.total_bonificaciones ?? 0))}
              </span>
            </div>
            <Item label="Subsidio transporte" value={fmt(liquidacion.subsidio_transporte)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <TrendingDown className="h-6 w-6 text-destructive" />
            Deducciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 bg-destructive/5 p-4 rounded-lg border border-destructive/20">
            {liquidacion.deducciones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No aplica</p>
            ) : (
              liquidacion.deducciones.map((d, i) => (
                <Item
                  key={i}
                  label={
                    d.nombre +
                    (d.porcentaje !== undefined && d.base !== undefined
                      ? ` (${d.porcentaje}% sobre ${fmt(d.base)})`
                      : '') +
                    (d.observacion ? ` — ${d.observacion}` : '')
                  }
                  value={fmt(d.valor)}
                  destructivo
                />
              ))
            )}
            <div className="flex justify-between pt-2 border-t border-destructive/30">
              <span className="font-semibold">Total deducciones</span>
              <span className="font-semibold text-destructive">
                {fmt(liquidacion.total_deducciones)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Final — layout V.15: 2 columnas */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-success mb-3">+ INGRESOS</h4>
              <div>
                <p className="text-sm text-muted-foreground">Devengado</p>
                <p className="font-bold text-lg text-success">{fmt(liquidacion.total_devengado)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subsidio Transporte</p>
                <p className="font-bold text-lg text-success">{fmt(liquidacion.subsidio_transporte)}</p>
              </div>
              {liquidacion.total_bonificaciones > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Bonificaciones</p>
                  <p className="font-bold text-lg text-success">{fmt(liquidacion.total_bonificaciones)}</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-destructive mb-3">- DEDUCCIONES</h4>
              <div>
                <p className="text-sm text-muted-foreground">Total Deducciones</p>
                <p className="font-bold text-lg text-destructive">-{fmt(liquidacion.total_deducciones)}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-between pt-4 border-t-2 border-primary/30">
            <div>
              <span className="font-bold text-2xl">TOTAL NETO</span>
              <p className="text-xs text-muted-foreground mt-1">{liquidacion.fecha_humana}</p>
            </div>
            <span className="font-bold text-3xl text-primary">{fmt(liquidacion.total_neto)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
