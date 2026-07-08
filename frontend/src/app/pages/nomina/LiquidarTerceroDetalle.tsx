/**
 * Pantalla dedicada para liquidar un tercero — reemplaza al modal.
 *
 * Ruta: `/nomina/:nominaId/tercero/:terceroId/liquidar`
 *
 * Flujo:
 *  1. Carga el detalle del acta via `nominaApi.terceros.ver()`.
 *  2. Muestra la info del contratista + operarios + totales.
 *  3. Permite agregar descuentos manuales (concepto + valor).
 *  4. Al confirmar, llama `POST /registrar-pago` con los descuentos
 *     consolidados en la observación (el endpoint §7.5 no acepta
 *     descuentos estructurados).
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import {
  ArrowLeft, Check, Trash2, Plus, Loader2,
  TrendingDown, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  nominaApi,
  NominaTerceroActaDetalle,
  NominaErrorCodes,
} from '../../../api/nomina';
import { operacionesApi } from '../../../api/operaciones';
import type { PlanillaDetalle } from '../../../api/operaciones';
import { lotesApi, sublotesApi } from '../../../api/plantacion';
import type { ApiError } from '../../../api/client';

interface DescuentoTercero {
  concepto: string;
  valor: number;
}

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

/** Mismos colores que el card de NominaDetalle por categoría de labor. */
function colorCategoria(color: 'amber' | 'green' | 'blue' | 'purple' | 'red' | 'gray') {
  switch (color) {
    case 'amber': return { header: 'text-amber-600', total: 'text-amber-600' };
    case 'green': return { header: 'text-primary', total: 'text-primary' };
    case 'blue': return { header: 'text-info', total: 'text-info' };
    case 'purple': return { header: 'text-purple-700', total: 'text-purple-700' };
    case 'red': return { header: 'text-red-600', total: 'text-red-600' };
    default: return { header: 'text-muted-foreground', total: 'text-foreground' };
  }
}

export default function LiquidarTerceroDetalle() {
  const { nominaId: nominaIdParam, terceroId: terceroIdParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const nominaId = nominaIdParam ? parseInt(nominaIdParam) : null;
  const terceroId = terceroIdParam ? parseInt(terceroIdParam) : null;

  /**
   * Total ya calculado que viene desde NominaDetalle vía navigation state.
   * Se usa como fallback cuando `acta.total_a_transferir === 0` (bug del
   * motor de acta del backend). Si el usuario entra con una URL directa,
   * este state estará ausente y se usa el valor del acta.
   */
  const totalEstimadoDeState = (location.state as any)?.totalEstimado as number | undefined;
  const categoriasDeState = (location.state as any)?.categorias as Array<{
    key: string;
    titulo: string;
    subtotal: number;
    filas: Array<{ lote: string; sublote: string; cantidad: number; unidad: string; total: number }>;
  }> | undefined;

  const [detalle, setDetalle] = useState<NominaTerceroActaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descuentos, setDescuentos] = useState<DescuentoTercero[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  /** Total reconstruido desde las planillas del período — se usa cuando el
   *  acta viene en $0 por bug del motor del backend. */
  const [totalDesdeplanillas, setTotalDesdeplanillas] = useState<number>(0);
  /** Categorías de labores con lote/sublote/cantidad/total — para desglose. */
  const [categoriasCalculadas, setCategoriasCalculadas] = useState<Array<{
    key: string;
    titulo: string;
    color: 'amber' | 'green' | 'blue' | 'purple' | 'red' | 'gray';
    subtotal: number;
    filas: Array<{
      lote: string;
      sublote: string;
      cantidad: number;
      unidad: 'gajos' | 'palmas';
      promedio_kg: number | null;
      peso_kg: number | null;
      precio: number;
      precio_unidad: string;
      total: number;
    }>;
  }>>([]);

  useEffect(() => {
    if (!nominaId || !terceroId) return;
    setCargando(true);
    nominaApi.terceros
      .ver(nominaId, terceroId)
      .then((res) => setDetalle(res.data))
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar acta'))
      .finally(() => setCargando(false));
  }, [nominaId, terceroId]);

  /**
   * Reconstruye el total y desglose del acta a partir de las planillas del
   * período — necesario porque el motor de acta del backend a veces persiste
   * `total_a_transferir=0` (bug conocido). Solo se ejecuta cuando el detalle
   * ya está cargado y sabemos el rango de la nómina.
   */
  useEffect(() => {
    if (!detalle || !nominaId) return;
    const operarioIds = detalle.operarios
      .map((o) => o.operario_id)
      .filter((x): x is number => x != null);
    if (operarioIds.length === 0) return;

    (async () => {
      try {
        const [lotesRes, sublotesRes] = await Promise.all([
          lotesApi.select().catch(() => ({ data: [] } as any)),
          sublotesApi.select().catch(() => ({ data: [] } as any)),
        ]);
        const lotesMap = new Map<number, string>();
        (lotesRes.data ?? []).forEach((l: any) => lotesMap.set(l.id, l.nombre));
        const sublotesMap = new Map<number, string>();
        (sublotesRes.data ?? []).forEach((s: any) => sublotesMap.set(s.id, s.nombre));

        const listRes = await operacionesApi.listar({
          fecha_desde: String(detalle.nomina.fecha_inicio).slice(0, 10),
          fecha_hasta: String(detalle.nomina.fecha_fin).slice(0, 10),
          estado: 'APROBADA',
          per_page: 200,
        });
        const detalles = await Promise.all(
          (listRes.data ?? []).map((p) =>
            operacionesApi.ver(p.id).then((d) => d.data).catch(() => null),
          ),
        );
        const planillas = detalles.filter(Boolean) as PlanillaDetalle[];

        // Consolidar por categoría → lote/sublote — mismo esquema visual
        // que el card del tab Terceros (colores + unidades + precio).
        const CATS = [
          { key: 'cosecha', titulo: 'COSECHA', color: 'amber' },
          { key: 'poda', titulo: 'PODA', color: 'green' },
          { key: 'fertilizacion', titulo: 'FERTILIZACIÓN', color: 'blue' },
          { key: 'plateo', titulo: 'PLATEO', color: 'purple' },
          { key: 'sanidad', titulo: 'SANIDAD', color: 'red' },
          { key: 'otros', titulo: 'OTROS', color: 'gray' },
          { key: 'finca', titulo: 'FINCA', color: 'gray' },
        ] as const;

        type Row = {
          lote: string; sublote: string; cantidad: number;
          unidad: 'gajos' | 'palmas';
          promedio_kg: number | null; peso_kg: number | null;
          precio: number; precio_unidad: string; total: number;
          pesoTotal: number; kgAcc: number;
        };
        const acc: Record<string, Record<string, Row>> = {};
        for (const c of CATS) acc[c.key] = {};

        const operariosSet = new Set(operarioIds);
        const catDeJornal = (categoria: string, tipo?: string | null): string => {
          if (categoria === 'FINCA') return 'finca';
          if (tipo === 'PLATEO') return 'plateo';
          if (tipo === 'PODA') return 'poda';
          if (tipo === 'FERTILIZACION') return 'fertilizacion';
          if (tipo === 'SANIDAD') return 'sanidad';
          return 'otros';
        };

        const getRow = (key: string, loteN: string, subloteN: string, esCosecha: boolean): Row => {
          const k = `${loteN}|${subloteN}`;
          if (!acc[key][k]) {
            acc[key][k] = {
              lote: loteN, sublote: subloteN, cantidad: 0,
              unidad: esCosecha ? 'gajos' : 'palmas',
              promedio_kg: esCosecha ? 0 : null,
              peso_kg: esCosecha ? 0 : null,
              precio: 0,
              precio_unidad: esCosecha ? '/kg' : '/palma',
              total: 0, pesoTotal: 0, kgAcc: 0,
            };
          }
          return acc[key][k];
        };

        planillas.forEach((planilla) => {
          // Cosechas
          (planilla.cosechas ?? []).forEach((c) => {
            const miembros = (c.cuadrilla ?? []).filter(
              (m) => m.operario_id != null && operariosSet.has(m.operario_id),
            );
            if (miembros.length === 0) return;
            const loteName = c.lote_id != null ? (lotesMap.get(c.lote_id) ?? `Lote #${c.lote_id}`) : '—';
            const subloteName = c.sublote_id != null ? (sublotesMap.get(c.sublote_id) ?? `#${c.sublote_id}`) : '—';
            const row = getRow('cosecha', loteName, subloteName, true);
            const gajos = Number(c.gajos_reconteo ?? c.gajos_reportados ?? 0);
            const promedio = Number(c.promedio_kg_gajo ?? 0);
            const precio = Number(c.precio_cosecha ?? 0);
            const proporcion = miembros.length / Math.max((c.cuadrilla ?? []).length, 1);
            row.cantidad += Math.round(gajos * proporcion);
            const valorCosecha = Number((c as any).valor_total ?? 0);
            const valorProrrateado = (c.cuadrilla?.length ?? 0) > 0
              ? valorCosecha / (c.cuadrilla?.length ?? 1)
              : 0;
            miembros.forEach((m) => {
              const peso = Number(m.peso_calculado_empleado ?? 0);
              let valor = Number(m.valor_calculado ?? 0);
              if (valor <= 0) {
                if (peso > 0 && precio > 0) valor = peso * precio;
                else valor = valorProrrateado;
              }
              row.peso_kg = (row.peso_kg ?? 0) + peso;
              row.total += valor;
              if (peso > 0 && promedio > 0) {
                row.kgAcc += promedio * peso;
                row.pesoTotal += peso;
              }
            });
            if (precio > 0) row.precio = precio;
          });
          // Jornales
          (planilla.jornales ?? []).forEach((j) => {
            if (j.operario_id == null || !operariosSet.has(j.operario_id)) return;
            const key = catDeJornal(j.categoria, j.tipo ?? null);
            // FINCA no tiene lote/sublote — agrupamos por trabajo realizado
            // (nombre de la labor, nombre_trabajo o descripción libre).
            let loteName: string;
            let subloteName: string;
            if (key === 'finca') {
              const nombreLabor = (j as any).labor?.nombre as string | undefined;
              loteName = nombreLabor
                || j.nombre_trabajo
                || j.descripcion
                || 'Trabajo de finca';
              subloteName = '—';
            } else {
              loteName = j.lote_id != null ? (lotesMap.get(j.lote_id) ?? `Lote #${j.lote_id}`) : '—';
              subloteName = j.sublote_id != null ? (sublotesMap.get(j.sublote_id) ?? `#${j.sublote_id}`) : '—';
            }
            const row = getRow(key, loteName, subloteName, false);
            const palmas = Number(j.cantidad_palmas ?? 0);
            const total = Number(j.valor_total ?? 0);
            const unit = Number(j.valor_unitario ?? 0);
            row.cantidad += palmas;
            row.total += total;
            if (unit > 0) row.precio = unit;
            else if (palmas > 0) row.precio = Math.round(total / palmas);
          });
        });

        const catsFinal = CATS
          .map((c) => {
            const rows = Object.values(acc[c.key]);
            rows.forEach((r) => {
              if (c.key === 'cosecha' && r.pesoTotal > 0) {
                r.promedio_kg = r.kgAcc / r.pesoTotal;
              }
            });
            const filas = rows.map(({ pesoTotal, kgAcc, ...rest }) => {
              void pesoTotal; void kgAcc;
              return rest;
            });
            const subtotal = filas.reduce((s, r) => s + r.total, 0);
            return { key: c.key, titulo: c.titulo, color: c.color, subtotal, filas };
          })
          .filter((c) => c.filas.length > 0);

        setCategoriasCalculadas(catsFinal);
        setTotalDesdeplanillas(catsFinal.reduce((s, c) => s + c.subtotal, 0));
      } catch { /* silencioso — la UI cae al total del acta */ }
    })();
  }, [detalle, nominaId]);

  const agregarDescuento = () =>
    setDescuentos((prev) => [...prev, { concepto: '', valor: 0 }]);
  const quitarDescuento = (i: number) =>
    setDescuentos((prev) => prev.filter((_, idx) => idx !== i));
  const actualizarDescuento = (
    i: number,
    campo: keyof DescuentoTercero,
    valor: string | number,
  ) =>
    setDescuentos((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, [campo]: valor } : d)),
    );

  const confirmar = async () => {
    if (!nominaId || !terceroId || !detalle) return;
    const descuentosValidos = descuentos.filter(
      (d) => d.concepto.trim() && d.valor > 0,
    );
    if (descuentos.some(
      (d) => (d.concepto.trim() && d.valor <= 0)
        || (!d.concepto.trim() && d.valor > 0),
    )) {
      toast.error('Completa concepto y valor en los descuentos agregados');
      return;
    }
    setConfirmando(true);
    try {
      const observacion = descuentosValidos.length > 0
        ? `Descuentos: ${descuentosValidos
            .map((d) => `${d.concepto} $${d.valor.toLocaleString('es-CO')}`)
            .join(', ')}`
        : undefined;
      await nominaApi.terceros.registrarPago(nominaId, terceroId, {
        metodo_pago: 'TRANSFERENCIA',
        observacion,
      });
      toast.success('Tercero liquidado');
      navigate(`/nomina/${nominaId}`);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.TERCERO_SIN_DATOS_BANCARIOS) {
        toast.error('Falta configurar los datos bancarios del tercero');
      } else if (e.code === NominaErrorCodes.ACTA_TERCERO_YA_PAGADA) {
        toast.error('El acta ya fue pagada');
      } else if (e.code === NominaErrorCodes.PERMISSION_DENIED) {
        toast.error('No tienes el permiso "nomina.pagar-tercero"');
      } else {
        toast.error(e.message ?? 'No se pudo liquidar el tercero');
      }
    } finally {
      setConfirmando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando acta...
      </div>
    );
  }

  if (!detalle) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No se pudo cargar el acta del tercero.
      </div>
    );
  }

  // Prioridad para el total bruto:
  //  1. Acta si `total_a_transferir > 0` (fuente confiable).
  //  2. Total reconstruido desde planillas (bug del motor de acta).
  //  3. State pasado desde NominaDetalle (fallback si el usuario navegó
  //     con el botón "Liquidar" y aún no cargaron las planillas).
  const totalActa = toNumber(detalle.acta.total_a_transferir);
  const totalBruto = totalActa > 0
    ? totalActa
    : (totalDesdeplanillas > 0 ? totalDesdeplanillas : (totalEstimadoDeState ?? 0));
  const totalDescuentos = descuentos.reduce(
    (s, d) => s + (Number(d.valor) || 0),
    0,
  );
  const totalNeto = totalBruto - totalDescuentos;
  const nombre = detalle.tercero.nombre;
  const nit = detalle.tercero.nit ?? detalle.tercero.cedula ?? '—';

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/nomina">Pagos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/nomina/${nominaId}`}>{detalle.nomina.periodo_label}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Liquidar tercero</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/nomina/${nominaId}`)}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Button>

      {/* Card unificado — mismo layout que el card del tab Terceros de
          NominaDetalle: header con avatar + nombre + total + badge +
          botón, tabla completa por categoría con colores, y footer con
          TOTAL ORDEN DE PAGO — todo dentro de un mismo Card.
          Usamos <div> plano en vez de <Card> porque el componente Card
          de shadcn agrega `flex flex-col gap-6` que separa el header de
          la tabla con 24px, y `backdrop-blur-xl` que enturbia los
          fondos. */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Header interno del card */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b border-border ${
          detalle.acta.estado_pago === 'PAGADO'
            ? 'bg-primary/5'
            : 'bg-amber-50/60 dark:bg-amber-950/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold ${
              detalle.acta.estado_pago === 'PAGADO'
                ? 'bg-primary/10 text-primary'
                : 'bg-amber-500/10 text-amber-700'
            }`}>
              {nombre.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm">{nombre}</p>
              <p className="text-xs text-muted-foreground">
                NIT {nit}
                {detalle.tercero.representante && ` · ${detalle.tercero.representante}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total a pagar</p>
              <p className="text-lg font-bold text-foreground">
                ${totalBruto.toLocaleString('es-CO')}
              </p>
            </div>
            <Badge className={`text-xs ${
              detalle.acta.estado_pago === 'PAGADO'
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-amber-500/10 text-amber-700 border-amber-300'
            }`}>
              {detalle.acta.estado_pago === 'PAGADO' ? 'Liquidado' : 'Pendiente'}
            </Badge>
            {detalle.acta.estado_pago !== 'PAGADO' && (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 gap-1.5"
                onClick={confirmar}
                disabled={confirmando}
              >
                {confirmando
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <FileText className="h-3.5 w-3.5" />}
                Liquidar
              </Button>
            )}
          </div>
        </div>

        {/* Tabla por labor — se excluye FINCA porque va en su propia
            tabla debajo (no tiene lote/sublote/promedio/peso). */}
        {categoriasCalculadas.filter((c) => c.key !== 'finca').length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left p-3 pl-5 font-semibold">Lote</th>
                  <th className="text-left p-3 font-semibold">Sublote</th>
                  <th className="text-right p-3 font-semibold">Cantidad</th>
                  <th className="text-right p-3 font-semibold">Prom.</th>
                  <th className="text-right p-3 font-semibold">Peso (kg)</th>
                  <th className="text-right p-3 font-semibold">Precio Unit.</th>
                  <th className="text-right p-3 pr-5 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {categoriasCalculadas.filter((c) => c.key !== 'finca').map((cat) => {
                  const col = colorCategoria(cat.color);
                  return (
                    <React.Fragment key={cat.key}>
                      <tr className="bg-muted/40 border-b border-border">
                        <td colSpan={7} className={`px-5 py-1.5 text-xs font-bold uppercase tracking-wide ${col.header}`}>
                          {cat.titulo}
                        </td>
                      </tr>
                      {cat.filas.map((f, idx) => (
                        <tr
                          key={`${cat.key}-${idx}`}
                          className={`border-b border-border/40 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                        >
                          <td className="p-3 pl-5 font-semibold">{f.lote}</td>
                          <td className="p-3 text-muted-foreground">{f.sublote}</td>
                          <td className="p-3 text-right font-semibold">
                            {f.cantidad.toLocaleString('es-CO')}
                            <span className="text-xs text-muted-foreground ml-1">{f.unidad}</span>
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {f.promedio_kg != null && f.promedio_kg > 0
                              ? f.promedio_kg.toFixed(1)
                              : '—'}
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {f.peso_kg != null && f.peso_kg > 0
                              ? f.peso_kg.toLocaleString('es-CO')
                              : '—'}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            ${f.precio.toLocaleString('es-CO')}
                            <span className="text-xs ml-1">{f.precio_unidad}</span>
                          </td>
                          <td className={`p-3 pr-5 text-right font-bold ${col.total}`}>
                            ${f.total.toLocaleString('es-CO')}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-b border-border bg-muted/10">
                        <td colSpan={6} className="p-2 pl-5 text-right text-xs text-muted-foreground">
                          Subtotal {cat.titulo.charAt(0) + cat.titulo.slice(1).toLowerCase()}
                        </td>
                        <td className={`p-2 pr-5 text-right text-sm font-bold ${col.total}`}>
                          ${cat.subtotal.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabla aparte para labores de FINCA — no tienen
            lote/sublote/promedio/peso, se muestran con columnas
            propias para no verse vacías en la tabla principal. */}
        {categoriasCalculadas.filter((c) => c.key === 'finca').map((cat) => {
          const col = colorCategoria(cat.color);
          return (
            <div key={cat.key} className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left p-3 pl-5 font-semibold">Trabajo realizado</th>
                    <th className="text-right p-3 font-semibold">Precio Unit.</th>
                    <th className="text-right p-3 pr-5 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-muted/40 border-b border-border">
                    <td colSpan={3} className={`px-5 py-1.5 text-xs font-bold uppercase tracking-wide ${col.header}`}>
                      Trabajos de finca
                    </td>
                  </tr>
                  {cat.filas.map((f, idx) => (
                    <tr
                      key={`finca-${idx}`}
                      className={`border-b border-border/40 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                    >
                      <td className="p-3 pl-5 font-semibold">
                        {f.lote !== '—' ? f.lote : 'Trabajo de finca'}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        ${f.precio.toLocaleString('es-CO')}
                      </td>
                      <td className={`p-3 pr-5 text-right font-bold ${col.total}`}>
                        ${f.total.toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-border bg-muted/10">
                    <td colSpan={2} className="p-2 pl-5 text-right text-xs text-muted-foreground">
                      Subtotal Finca
                    </td>
                    <td className={`p-2 pr-5 text-right text-sm font-bold ${col.total}`}>
                      ${cat.subtotal.toLocaleString('es-CO')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Total orden de pago — al final, después de todas las tablas
            (labores de campo + finca). Sumamos siempre `totalBruto`,
            que ya incluye finca. */}
        {categoriasCalculadas.length > 0 && (
          <div className="border-t-2 border-primary/20 bg-muted/20 flex items-center justify-between px-5 py-3">
            <p className="text-sm font-bold text-primary uppercase tracking-wide">
              Total orden de pago a {nombre}
            </p>
            <p className="text-lg font-bold text-primary">
              ${totalBruto.toLocaleString('es-CO')}
            </p>
          </div>
        )}

        {/* Mensaje si no hay desglose calculable */}
        {categoriasCalculadas.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Sin registros de campo en el período para los operarios de esta empresa.
          </div>
        )}
      </div>

      {/* Fallback — solo cuando no hay desglose calculable (URL directa
          sin planillas cargables) mostramos los operarios del acta. */}
      {categoriasCalculadas.length === 0 && detalle.operarios.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Operarios del contratista</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 pl-5 font-semibold text-xs text-muted-foreground">Operario</th>
                    <th className="text-left p-3 font-semibold text-xs text-muted-foreground">Cargo</th>
                    <th className="text-right p-3 font-semibold text-xs text-muted-foreground">Días</th>
                    <th className="text-right p-3 font-semibold text-xs text-muted-foreground">Tarifa/día</th>
                    <th className="text-right p-3 pr-5 font-semibold text-xs text-muted-foreground">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.operarios.map((op, idx) => (
                    <tr
                      key={op.id}
                      className={`border-b border-border last:border-0 ${
                        idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                      }`}
                    >
                      <td className="p-3 pl-5">
                        <p className="font-medium">{op.nombre_completo}</p>
                        <p className="text-xs text-muted-foreground">CC {op.cedula}</p>
                      </td>
                      <td className="p-3 text-muted-foreground">{op.cargo || '—'}</td>
                      <td className="p-3 text-right">{op.dias}</td>
                      <td className="p-3 text-right">
                        ${toNumber(op.tarifa_dia).toLocaleString('es-CO')}
                      </td>
                      <td className="p-3 pr-5 text-right font-semibold">
                        ${toNumber(op.subtotal).toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Descuentos */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Descuentos
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={agregarDescuento}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Agregar descuento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {descuentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">
              Sin descuentos.
            </p>
          ) : (
            <div className="space-y-3">
              {descuentos.map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-7">
                    <Label className="text-xs">Concepto</Label>
                    <Input
                      value={d.concepto}
                      onChange={(e) => actualizarDescuento(i, 'concepto', e.target.value)}
                      placeholder="Ej: Herramienta extraviada"
                    />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs">Valor</Label>
                    <Input
                      type="number"
                      value={d.valor || ''}
                      onChange={(e) => actualizarDescuento(i, 'valor', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => quitarDescuento(i)}
                      className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen final */}
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardContent className="p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total bruto</span>
            <span className="font-semibold">${totalBruto.toLocaleString('es-CO')}</span>
          </div>
          {totalDescuentos > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total descuentos</span>
              <span className="font-semibold text-destructive">
                -${totalDescuentos.toLocaleString('es-CO')}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-3 border-t border-primary/20">
            <span className="font-bold text-lg">TOTAL A PAGAR</span>
            <span className="font-bold text-2xl text-primary">
              ${totalNeto.toLocaleString('es-CO')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Estado + Botones */}
      {detalle.acta.estado_pago === 'PAGADO' && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-success" />
            <div>
              <p className="font-semibold">Acta ya pagada</p>
              <p className="text-xs text-muted-foreground">
                No se pueden agregar más descuentos ni registrar otro pago.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(`/nomina/${nominaId}`)}
          disabled={confirmando}
          className="h-12 text-base"
        >
          Cancelar
        </Button>
        <Button
          onClick={confirmar}
          disabled={confirmando || detalle.acta.estado_pago === 'PAGADO'}
          className="h-12 text-base gap-2 bg-primary hover:bg-primary/90"
        >
          {confirmando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          Confirmar liquidación
        </Button>
      </div>
    </div>
  );
}
