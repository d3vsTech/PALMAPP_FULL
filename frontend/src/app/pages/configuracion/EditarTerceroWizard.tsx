/**
 * Wizard "Editar Tercero" — pantalla de edición conectada al backend
 * (`API_TERCEROS.md` §4 PUT /terceros/{id} + §6 configuración/init).
 *
 * Reusa los componentes visuales `Paso1`, `Paso2`, `Paso3` exportados desde
 * `NuevoTerceroWizard.tsx`. La diferencia con la pantalla de creación está en:
 *  - Al montar carga `tercerosApi.configuracionInit(id)` y precarga los 3 pasos.
 *  - Al guardar persiste un diff calculado contra el estado original:
 *      · Datos del tercero  → PUT /terceros/{id}    (solo si cambió algo)
 *      · Precios cosecha    → upsert por lote; DELETE si se vació
 *      · Precios labores    → upsert por labor; DELETE si se puso en 0
 *      · Rangos abono       → crear nuevos, editar existentes, eliminar removidos
 *      · Operarios          → crear nuevos, editar existentes, eliminar removidos
 *
 * Si el backend aún no implementó el módulo se muestra el toast con el mensaje
 * del 404 y se cae a la pantalla de configuración.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, ArrowRight, Building2, User, Check, Save,
  DollarSign, Users,
} from 'lucide-react';
import {
  Paso1, Paso2, Paso3,
  preciosVacios,
  type PreciosLabores,
  type PrecioCosecha,
  type RangoAbonada,
} from './NuevoTerceroWizard';
import type { EmpresaTercero, ColaboradorTercero } from '../../components/configuracion/TercerosTab';
import {
  tercerosApi,
  operariosApi,
  tercerosPreciosApi,
  TercerosErrorCodes,
  TercerosCacheKeys,
  type Tercero,
  type Operario,
  type TerceroConfiguracionInit,
  type TerceroLaborPrecio,
  type TerceroPrecioCosecha,
  type TerceroPrecioAbono,
} from '../../../api/terceros';
import { invalidate } from '../../../api/cache';
import type { ApiError } from '../../../api/client';

// ─── Helpers de error tipados ────────────────────────────────────────────────

function asApiError(e: unknown): Partial<ApiError> {
  return (typeof e === 'object' && e !== null) ? (e as Partial<ApiError>) : {};
}

// ─── Helpers de mapeo backend → estado del wizard ────────────────────────────

/**
 * Convierte el `Tercero` del backend al shape local que usan los pasos del
 * wizard (`EmpresaTercero`). El form usa `nit`/`razonSocial` para ambos tipos
 * por consistencia visual; aquí los hidratamos según `tipo_persona`.
 */
function bundleToDatos(tercero: Tercero): Partial<EmpresaTercero> {
  const esNatural = tercero.tipo_persona === 'NATURAL';
  return {
    id: String(tercero.id),
    tipoPersona: esNatural ? 'Natural' : 'Jurídica',
    nit: esNatural ? (tercero.cedula ?? '') : (tercero.nit ?? ''),
    razonSocial: esNatural ? (tercero.nombre_completo ?? '') : (tercero.razon_social ?? ''),
    nombreComercial: tercero.nombre_comercial ?? undefined,
    contacto: esNatural ? undefined : (tercero.representante ?? undefined),
    telefono: tercero.telefono ?? undefined,
    email: tercero.email ?? undefined,
    estado: tercero.estado ? 'Activa' : 'Inactiva',
  };
}

/**
 * Mapea el bundle de configuración a la estructura local `PreciosLabores`.
 * Cada lote del tenant aparece como fila aunque no tenga override (precioPorKg=0
 * = no hay override). Los rangos de abono que tiene el tercero se reflejan tal
 * cual; si no tiene, se cae a los rangos de referencia del tenant.
 */
function bundleToPrecios(bundle: TerceroConfiguracionInit, anio: number): PreciosLabores {
  // Cosecha — una fila por lote, con override si existe para el año actual.
  const cosechaPorLote: PrecioCosecha[] = bundle.lotes_contexto.map((l) => {
    const override = bundle.precios_cosecha.find(
      (p) => p.lote_id === l.id && p.anio === anio,
    );
    return {
      loteId: l.id,
      loteNombre: l.nombre,
      precioPorKg: override ? Number(override.precio) : 0,
    };
  });

  // Abono — usa los rangos override del tercero. Si no tiene ninguno todavía,
  // arranca con la estructura vacía estándar para que el admin pueda llenarlos.
  const abonada: RangoAbonada[] = bundle.precios_abono.length > 0
    ? bundle.precios_abono.map((r) => ({
        gramosMinimo: Number(r.gramos_min),
        gramosMaximo: Number(r.gramos_max),
        precioPorPalma: Number(r.precio_palma),
      }))
    : preciosVacios().abonada;

  // Labores fijas — buscamos PLATEO, PODA, SANIDAD en el catálogo y vemos si
  // el tercero tiene override.
  const findOverridePorTipo = (tipo: 'PLATEO' | 'PODA' | 'SANIDAD'): number => {
    const labor = bundle.labores_contexto.find((l) => l.tipo === tipo);
    if (!labor) return 0;
    const override = bundle.labor_precios.find(
      (lp) => lp.labor_id === labor.id && lp.estado,
    );
    return override ? Number(override.precio_palma) : 0;
  };

  return {
    cosecha: cosechaPorLote,
    abonada,
    plateo: findOverridePorTipo('PLATEO'),
    poda: findOverridePorTipo('PODA'),
    sanidad: findOverridePorTipo('SANIDAD'),
  };
}

/** Mapea `Operario` del backend al shape local que usa Paso3. */
function operarioToColaboradorTercero(op: Operario): Partial<ColaboradorTercero> {
  return {
    id: String(op.id),
    nombres: op.nombres,
    apellidos: op.apellidos,
    documento: op.cedula ?? undefined,
    cargo: op.cargo ?? undefined,
    eps: op.eps ?? undefined,
    arl: op.arl ?? undefined,
    estado: op.estado ? 'Activo' : 'Inactivo',
  };
}

// ─── Stepper compartido ──────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Datos del Tercero' },
  { num: 2, label: 'Precios por Labor' },
  { num: 3, label: 'Operarios' },
];

// ─── Componente principal ────────────────────────────────────────────────────

export default function EditarTerceroWizard() {
  const { id: idParam } = useParams<{ id: string }>();
  const terceroId = Number(idParam);
  const navigate = useNavigate();

  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estado actual del wizard (lo que se está editando).
  const [datos, setDatos] = useState<Partial<EmpresaTercero>>({ tipoPersona: 'Jurídica', estado: 'Activa' });
  const [precios, setPrecios] = useState<PreciosLabores>(preciosVacios());
  const [operarios, setOperarios] = useState<Partial<ColaboradorTercero>[]>([]);

  /**
   * Snapshot del bundle original. Lo guardamos al cargar para poder calcular
   * diffs al guardar (qué hay que crear / actualizar / borrar) en vez de
   * mandar todos los registros a la vez.
   */
  const [bundle, setBundle] = useState<TerceroConfiguracionInit | null>(null);

  const epsOptions = bundle?.eps.map((e) => e.nombre) ?? null;
  const arlOptions = bundle?.arl.map((a) => a.nombre) ?? null;

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!Number.isFinite(terceroId)) {
      toast.error('Id de tercero inválido');
      navigate('/configuracion');
      return;
    }
    let cancelado = false;
    setCargando(true);
    Promise.all([
      tercerosApi.configuracionInit(terceroId),
      operariosApi.listarPorTercero(terceroId),
    ])
      .then(([resBundle, resOps]) => {
        if (cancelado) return;
        const b = resBundle.data;
        setBundle(b);
        setDatos(bundleToDatos(b.tercero));
        // Año actual desde el wizardInit no viene aquí; usamos el del cliente.
        const anioActual = new Date().getFullYear();
        setPrecios(bundleToPrecios(b, anioActual));
        setOperarios(resOps.data.map(operarioToColaboradorTercero));
      })
      .catch((e) => {
        if (cancelado) return;
        console.error('[EditarTerceroWizard] Carga inicial:', e);
        toast.error(asApiError(e).message ?? 'No se pudo cargar el tercero');
        navigate('/configuracion');
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [terceroId, navigate]);

  const pasoValido = paso === 1 ? !!datos.nit && !!datos.razonSocial : true;

  const totalPreciosConfigurados = [
    precios.cosecha.some(c => c.precioPorKg > 0),
    precios.abonada.some(a => a.precioPorPalma > 0),
    precios.plateo > 0, precios.poda > 0, precios.sanidad > 0,
  ].filter(Boolean).length;

  /**
   * Construye el payload de edición del tercero. Solo enviamos campos que
   * cambiaron, pero como el backend acepta `sometimes` no es crítico — manda
   * todo. Mapea el shape local al shape del backend según `tipo_persona`.
   */
  const construirPayloadEditar = () => {
    const nitOcedula = (datos.nit ?? '').trim();
    const nombre = (datos.razonSocial ?? '').trim();
    const common = {
      nombre_comercial: datos.nombreComercial?.trim() || undefined,
      telefono: datos.telefono?.trim() || undefined,
      email: datos.email?.trim() || undefined,
    };
    if (datos.tipoPersona === 'Natural') {
      return {
        tipo_persona: 'NATURAL' as const,
        cedula: nitOcedula,
        nombre_completo: nombre,
        ...common,
      };
    }
    return {
      tipo_persona: 'JURIDICA' as const,
      nit: nitOcedula,
      razon_social: nombre,
      representante: datos.contacto?.trim() || undefined,
      ...common,
    };
  };

  /** Resuelve labor_id real desde el bundle por `tipo`. */
  const findLaborId = (tipo: 'PLATEO' | 'PODA' | 'SANIDAD'): number | null => {
    const item = bundle?.labores_contexto.find((l) => l.tipo === tipo);
    return item?.id ?? null;
  };

  /** Override de labor existente para un tipo (PLATEO/PODA/SANIDAD). */
  const findOverrideLabor = (tipo: 'PLATEO' | 'PODA' | 'SANIDAD'): TerceroLaborPrecio | undefined => {
    const laborId = findLaborId(tipo);
    if (!laborId || !bundle) return undefined;
    return bundle.labor_precios.find((lp) => lp.labor_id === laborId);
  };

  /**
   * Persistencia con diff:
   *  1. PUT /terceros/{id}                                  → siempre.
   *  2. Cada lote con precioPorKg > 0 → upsert /precios-cosecha.
   *     Lotes con precioPorKg = 0 que tenían override → DELETE /precios-cosecha.
   *  3. Cada rango con precioPorPalma > 0 → si existía, PUT; si no, POST.
   *     Rangos eliminados localmente que existían en backend → DELETE.
   *  4. Plateo/Poda/Sanidad: upsert si > 0; DELETE override existente si 0.
   *  5. Operarios:
   *     - Sin id local → POST.
   *     - Con id que ya existe → PUT (con campos editados).
   *     - Id en backend pero no en el array local → DELETE.
   */
  const handleGuardar = async () => {
    if (!bundle) return;
    if (!datos.nit?.trim() || !datos.razonSocial?.trim()) {
      toast.error('Faltan datos obligatorios del tercero');
      setPaso(1);
      return;
    }
    setGuardando(true);

    type AnyPromise = Promise<unknown>;
    const tareas: AnyPromise[] = [];

    try {
      // 1. Editar el tercero (síncrono al inicio para detectar errores fatales).
      await tercerosApi.editar(terceroId, construirPayloadEditar());

      // 2. Cosechas — upsert los con valor; eliminar los puestos en 0 que tenían override.
      const anioActual = new Date().getFullYear();
      for (const c of precios.cosecha) {
        const override = bundle.precios_cosecha.find(
          (p) => p.lote_id === c.loteId && p.anio === anioActual,
        );
        if (c.precioPorKg > 0) {
          tareas.push(
            tercerosPreciosApi.upsertPrecioCosecha(terceroId, {
              lote_id: c.loteId,
              precio: c.precioPorKg,
            }),
          );
        } else if (override) {
          tareas.push(tercerosPreciosApi.eliminarPrecioCosecha(terceroId, override.id));
        }
      }

      // 3. Abono — comparamos por (gramos_min, gramos_max). Lo más simple y
      // sin riesgo de colisiones: borrar todos los rangos viejos, crear los
      // nuevos. Esto evita lidiar con el cálculo de "qué cambió" para rangos
      // que el usuario reordenó/extendió.
      const rangosViejos = bundle.precios_abono;
      const rangosNuevos = precios.abonada.filter((a) => a.precioPorPalma > 0);
      for (const viejo of rangosViejos) {
        tareas.push(tercerosPreciosApi.eliminarPrecioAbono(terceroId, viejo.id));
      }
      for (const r of rangosNuevos) {
        tareas.push(
          tercerosPreciosApi.crearPrecioAbono(terceroId, {
            gramos_min: r.gramosMinimo,
            gramos_max: r.gramosMaximo,
            precio_palma: r.precioPorPalma,
          }),
        );
      }

      // 4. Labores simples.
      const upsertOrDelete = (precio: number, tipo: 'PLATEO' | 'PODA' | 'SANIDAD') => {
        const laborId = findLaborId(tipo);
        if (!laborId) return; // labor no existe en el catálogo del tenant.
        const override = findOverrideLabor(tipo);
        if (precio > 0) {
          tareas.push(
            tercerosPreciosApi.upsertLaborPrecio(terceroId, {
              labor_id: laborId,
              precio_palma: precio,
            }),
          );
        } else if (override) {
          tareas.push(tercerosPreciosApi.eliminarLaborPrecio(terceroId, override.id));
        }
      };
      upsertOrDelete(precios.plateo, 'PLATEO');
      upsertOrDelete(precios.poda, 'PODA');
      upsertOrDelete(precios.sanidad, 'SANIDAD');

      // 5. Operarios — diff por id.
      const operariosOriginales = await operariosApi.listarPorTercero(terceroId);
      const idsOriginales = new Set(operariosOriginales.data.map((o) => o.id));
      const idsLocales = new Set(
        operarios.filter((o) => o.id !== undefined).map((o) => Number(o.id)),
      );

      // Eliminar los que ya no están localmente.
      for (const original of operariosOriginales.data) {
        if (!idsLocales.has(original.id)) {
          tareas.push(operariosApi.eliminar(terceroId, original.id));
        }
      }

      for (const op of operarios) {
        if (!op.nombres?.trim() || !op.apellidos?.trim()) continue;
        const payload = {
          nombres: op.nombres.trim(),
          apellidos: op.apellidos.trim(),
          cedula: op.documento?.trim() || undefined,
          cargo: op.cargo?.trim() || undefined,
          eps: op.eps?.trim() || undefined,
          arl: op.arl?.trim() || undefined,
        };
        const opId = op.id !== undefined ? Number(op.id) : NaN;
        if (Number.isFinite(opId) && idsOriginales.has(opId)) {
          tareas.push(operariosApi.editar(terceroId, opId, payload));
        } else {
          tareas.push(operariosApi.crear(terceroId, payload));
        }
      }

      // Esperar todo en paralelo y reportar fallos parciales.
      const resultados = await Promise.allSettled(tareas);
      const fallidos = resultados.filter((r) => r.status === 'rejected');
      if (fallidos.length > 0) {
        const codigos = fallidos.map((r) => asApiError((r as PromiseRejectedResult).reason));
        console.error('[EditarTerceroWizard] Ítems fallidos:', codigos);
        const tieneSolapado = codigos.some(
          (e) => e.code === TercerosErrorCodes.RANGO_SOLAPADO,
        );
        const tieneOpConJornales = codigos.some(
          (e) => e.code === TercerosErrorCodes.OPERARIO_CON_JORNALES,
        );
        if (tieneOpConJornales) {
          toast.warning(
            'Cambios guardados. Algunos operarios no se pudieron eliminar porque tienen jornales o cosechas.',
          );
        } else if (tieneSolapado) {
          toast.warning(
            'Cambios guardados. Algunos rangos de abono se solapan y no se guardaron.',
          );
        } else {
          toast.warning(
            `Cambios guardados. ${resultados.length - fallidos.length}/${resultados.length} ítems ok, ${fallidos.length} fallidos.`,
          );
        }
      } else {
        toast.success('Tercero actualizado correctamente');
      }

      invalidate(TercerosCacheKeys.LISTADO);
      navigate('/configuracion');
    } catch (e) {
      console.error('[EditarTerceroWizard] Error al guardar:', e);
      toast.error(asApiError(e).message ?? 'No se pudo guardar el tercero');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando datos del tercero…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/configuracion')}
          className="h-12 w-12 rounded-xl hover:bg-muted border border-border/50">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary">Editar Tercero</h1>
          <p className="text-muted-foreground mt-1">Actualiza los datos, precios y operarios del contratista</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Stepper */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {STEPS.map((s, i) => (
                  <React.Fragment key={s.num}>
                    <div className="flex flex-col items-center gap-2">
                      <div className={`h-12 w-12 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
                        paso > s.num
                          ? 'bg-primary border-primary text-primary-foreground'
                          : paso === s.num
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted border-border text-muted-foreground'
                      }`}>
                        {paso > s.num ? <Check className="h-5 w-5" /> : s.num}
                      </div>
                      <span className={`text-xs font-semibold whitespace-nowrap ${paso === s.num ? 'text-primary' : 'text-muted-foreground'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 mx-3 h-0.5 bg-border overflow-hidden rounded-full">
                        <div className={`h-full bg-primary transition-all duration-500 ${paso > s.num ? 'w-full' : 'w-0'}`} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contenido del paso */}
          {paso === 1 && <Paso1 data={datos} onChange={setDatos} />}
          {paso === 2 && <Paso2 precios={precios} onChange={setPrecios} />}
          {paso === 3 && (
            <Paso3
              operarios={operarios}
              onChange={setOperarios}
              epsOptions={epsOptions}
              arlOptions={arlOptions}
            />
          )}

          {/* Navegación */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" className="gap-2"
              onClick={() => paso === 1 ? navigate('/configuracion') : setPaso(p => p - 1)}
              disabled={guardando}>
              <ArrowLeft className="h-4 w-4" />
              {paso === 1 ? 'Cancelar' : 'Anterior'}
            </Button>
            {paso < 3 ? (
              <Button className="gap-2 bg-primary hover:bg-primary/90"
                disabled={!pasoValido || guardando}
                onClick={() => setPaso(p => p + 1)}>
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className="gap-2 bg-primary hover:bg-primary/90"
                onClick={handleGuardar}
                disabled={guardando}>
                <Save className="h-4 w-4" />
                {guardando ? 'Guardando…' : 'Guardar Cambios'}
              </Button>
            )}
          </div>
        </div>

        {/* Panel de resumen */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8 border-border">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="space-y-3 pb-4 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tercero</p>
                {datos.razonSocial ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      {datos.tipoPersona === 'Natural' ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{datos.razonSocial}</p>
                      <p className="text-xs text-muted-foreground">
                        {datos.tipoPersona === 'Natural' ? 'CC' : 'NIT'} {datos.nit}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin datos</p>
                )}
                {datos.telefono && <p className="text-xs text-muted-foreground">Tel: {datos.telefono}</p>}
                {datos.email && <p className="text-xs text-muted-foreground">{datos.email}</p>}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Precios configurados
                </p>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  {totalPreciosConfigurados} {totalPreciosConfigurados === 1 ? 'configuración' : 'configuraciones'}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Operarios
                </p>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  {operarios.length} registrado{operarios.length !== 1 ? 's' : ''}
                </Badge>
                {operarios.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {operarios.map((op, i) => {
                      const nombres = op.nombres?.trim() ?? '';
                      const apellidos = op.apellidos?.trim() ?? '';
                      const inicial = (nombres[0] ?? '') + (apellidos[0] ?? '');
                      const nombreCompleto = `${nombres} ${apellidos}`.trim() || '(sin nombre)';
                      return (
                        <div key={op.id ?? i} className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {inicial.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate" title={nombreCompleto}>{nombreCompleto}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {op.cargo || '—'}{op.documento ? ` · CC ${op.documento}` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
