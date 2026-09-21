/**
 * Estado del formulario de liquidación final y su preview.
 *
 * La pantalla no calcula nada: este hook arma el payload del §11.6, lo manda
 * a `preview` con un respiro tras cada cambio y devuelve el comprobante que
 * pinta la vista. Un bloque de ajuste solo viaja cuando tiene valor Y motivo,
 * porque sin motivo el backend responde 422 y el preview corre en cada tecla.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  liquidacionFinalApi,
  type AjusteConcepto,
  type AjustesLiquidacion,
  type CodigoAjustable,
  type CodigoDevengadoManual,
  type ComprobanteLiquidacionFinal,
  type DevengadoManual,
  type FichaColaboradorLiquidacion,
  type MotivoRetiroCodigo,
  type PayloadLiquidacionFinal,
  type TipoContrato,
  type TipoLiquidacionFinal,
} from '../../../../api/liquidacionFinal';
import { mensajeErrorLiquidacion } from './comunes';

const ESPERA_PREVIEW_MS = 500;

/** Un bloque de ajuste tal como lo escribe el usuario: todo texto. */
export type AjusteTexto = Partial<Record<keyof AjusteConcepto, string>>;

export interface DevengadoManualTexto {
  /** Clave local para la lista; no viaja al backend. */
  key: string;
  codigo: CodigoDevengadoManual;
  nombre: string;
  dias: string;
  valor: string;
  motivo: string;
}

export interface OtraDeduccionTexto {
  key: string;
  nombre: string;
  valor: string;
  motivo: string;
  autorizacion_escrita: boolean;
}

export interface EstadoFormulario {
  fechaRetiro: string;
  fechaCorte: string;
  motivoRetiro: MotivoRetiroCodigo | '';
  tipoContrato: TipoContrato | '';
  fechaFinPactada: string;
  motivoOverride: string;
  diasIndemnizacion: string;
  observaciones: string;
  seguridadSocial: boolean;
  autorizacionEscrita: boolean;
  /** prestamo_id → descontar */
  prestamos: Record<number, boolean>;
}

const FORM_INICIAL: EstadoFormulario = {
  fechaRetiro: '',
  fechaCorte: '',
  motivoRetiro: '',
  tipoContrato: '',
  fechaFinPactada: '',
  motivoOverride: '',
  diasIndemnizacion: '',
  observaciones: '',
  seguridadSocial: true,
  autorizacionEscrita: false,
  prestamos: {},
};

/** Los cinco conceptos que admiten ajuste, para filtrar al rehidratar. */
const CAMPOS_POR_CONCEPTO: Record<CodigoAjustable, true> = {
  CESANTIAS: true,
  INTERESES_CESANTIAS: true,
  PRIMA: true,
  VACACIONES: true,
  INDEMNIZACION: true,
};

/** El motivo viene dentro del ajuste guardado, que es jsonb sin tipo fijo. */
function leerMotivo(ajuste: Record<string, unknown> | null | undefined): string {
  const m = ajuste?.motivo;
  return typeof m === 'string' ? m : '';
}

/** Texto vacío no es cero: devuelve `undefined` para que el backend calcule. */
function num(v: string | undefined): number | undefined {
  if (v == null || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Un ajuste cuenta como escrito si tiene algún valor además del motivo. */
export function ajusteTieneValor(a: AjusteTexto | undefined): boolean {
  if (!a) return false;
  return Object.entries(a).some(([k, v]) => k !== 'motivo' && v != null && v.trim() !== '');
}

/** Con valor pero sin motivo el backend responde 422 AJUSTE_SIN_MOTIVO. */
export function ajusteFaltaMotivo(a: AjusteTexto | undefined): boolean {
  return ajusteTieneValor(a) && !(a?.motivo ?? '').trim();
}

function mapAjuste(a: AjusteTexto): AjusteConcepto {
  return {
    salario_basico: num(a.salario_basico as string | undefined),
    auxilio_transporte: num(a.auxilio_transporte as string | undefined),
    promedio_variables: num(a.promedio_variables as string | undefined),
    dias_computados: num(a.dias_computados as string | undefined),
    fecha_computo_desde: (a.fecha_computo_desde as string | undefined) || undefined,
    saldo_cesantias: num(a.saldo_cesantias as string | undefined),
    dias_base_intereses: num(a.dias_base_intereses as string | undefined),
    base_mensual: num(a.base_mensual as string | undefined),
    base: num(a.base as string | undefined),
    dias: num(a.dias as string | undefined),
    motivo: (a.motivo as string | undefined)?.trim(),
  };
}

export interface UseFormularioLiquidacion {
  form: EstadoFormulario;
  setCampo: <K extends keyof EstadoFormulario>(campo: K, valor: EstadoFormulario[K]) => void;
  ajustes: Partial<Record<CodigoAjustable, AjusteTexto>>;
  setAjuste: (codigo: CodigoAjustable, campo: keyof AjusteConcepto, valor: string) => void;
  limpiarAjuste: (codigo: CodigoAjustable) => void;
  devengados: DevengadoManualTexto[];
  agregarDevengado: (codigo: CodigoDevengadoManual) => void;
  editarDevengado: (key: string, campo: keyof DevengadoManualTexto, valor: string) => void;
  quitarDevengado: (key: string) => void;
  otrasDeducciones: OtraDeduccionTexto[];
  agregarOtraDeduccion: () => void;
  editarOtraDeduccion: (
    key: string,
    campo: keyof OtraDeduccionTexto,
    valor: string | boolean,
  ) => void;
  quitarOtraDeduccion: (key: string) => void;
  preview: ComprobanteLiquidacionFinal | null;
  cargandoPreview: boolean;
  errorPreview: string | null;
  /** Payload tal como se enviaría; también lo usan guardar y el PDF. */
  construirPayload: () => PayloadLiquidacionFinal | null;
  /** Vuelve a pedir el preview sin esperar el respiro. */
  refrescar: () => void;
  precargarDesdeFicha: (ficha: FichaColaboradorLiquidacion) => void;
  /** Rehidrata desde una liquidación guardada, para "Volver a editar". */
  hidratarDesdeComprobante: (c: ComprobanteLiquidacionFinal) => void;
  reiniciar: () => void;
}

export function useFormularioLiquidacion(
  tipo: TipoLiquidacionFinal,
  empleadoId: number | null,
): UseFormularioLiquidacion {
  const [form, setForm] = useState<EstadoFormulario>(FORM_INICIAL);
  const [ajustes, setAjustes] = useState<Partial<Record<CodigoAjustable, AjusteTexto>>>({});
  const [devengados, setDevengados] = useState<DevengadoManualTexto[]>([]);
  const [otrasDeducciones, setOtrasDeducciones] = useState<OtraDeduccionTexto[]>([]);

  const [preview, setPreview] = useState<ComprobanteLiquidacionFinal | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [errorPreview, setErrorPreview] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reqIdRef = useRef(0);

  const setCampo = useCallback(
    <K extends keyof EstadoFormulario>(campo: K, valor: EstadoFormulario[K]) => {
      setForm((prev) => ({ ...prev, [campo]: valor }));
    },
    [],
  );

  const setAjuste = useCallback(
    (codigo: CodigoAjustable, campo: keyof AjusteConcepto, valor: string) => {
      setAjustes((prev) => ({ ...prev, [codigo]: { ...prev[codigo], [campo]: valor } }));
    },
    [],
  );

  const limpiarAjuste = useCallback((codigo: CodigoAjustable) => {
    setAjustes((prev) => {
      const copia = { ...prev };
      delete copia[codigo];
      return copia;
    });
  }, []);

  const agregarDevengado = useCallback((codigo: CodigoDevengadoManual) => {
    setDevengados((prev) => [
      ...prev,
      { key: `${codigo}-${Date.now()}`, codigo, nombre: '', dias: '', valor: '', motivo: '' },
    ]);
  }, []);

  const editarDevengado = useCallback(
    (key: string, campo: keyof DevengadoManualTexto, valor: string) => {
      setDevengados((prev) => prev.map((d) => (d.key === key ? { ...d, [campo]: valor } : d)));
    },
    [],
  );

  const quitarDevengado = useCallback((key: string) => {
    setDevengados((prev) => prev.filter((d) => d.key !== key));
  }, []);

  const agregarOtraDeduccion = useCallback(() => {
    setOtrasDeducciones((prev) => [
      ...prev,
      {
        key: `otra-${Date.now()}`,
        nombre: '',
        valor: '',
        motivo: '',
        autorizacion_escrita: false,
      },
    ]);
  }, []);

  const editarOtraDeduccion = useCallback(
    (key: string, campo: keyof OtraDeduccionTexto, valor: string | boolean) => {
      setOtrasDeducciones((prev) =>
        prev.map((o) => (o.key === key ? { ...o, [campo]: valor } : o)),
      );
    },
    [],
  );

  const quitarOtraDeduccion = useCallback((key: string) => {
    setOtrasDeducciones((prev) => prev.filter((o) => o.key !== key));
  }, []);

  /** Trae del backend los valores que el formulario usa como punto de partida. */
  const precargarDesdeFicha = useCallback((ficha: FichaColaboradorLiquidacion) => {
    const prestamos: Record<number, boolean> = {};
    const proponer = ficha.parametros?.liq_final_descontar_prestamos ?? true;
    ficha.prestamos.forEach((p) => {
      prestamos[p.prestamo_id] = p.descontar ?? proponer;
    });
    setForm({
      ...FORM_INICIAL,
      // Si la ficha ya trae un retiro, esa fecha manda: aprobar con otra
      // responde 409 LIQUIDACION_FECHA_RETIRO_DISTINTA.
      fechaRetiro: ficha.empleado.fecha_retiro ?? '',
      fechaCorte: ficha.fecha_corte ?? '',
      // Sin contrato registrado el backend asume indefinido: arrancar en
      // vacío haría que la vista pidiera un motivo de cambio que no existe.
      tipoContrato: ficha.contrato?.tipo_contrato ?? 'INDEFINIDO',
      fechaFinPactada: ficha.contrato?.fecha_fin_pactada ?? '',
      seguridadSocial: ficha.parametros?.liq_final_deducir_seguridad_social ?? true,
      prestamos,
    });
    setAjustes({});
    setDevengados([]);
    setOtrasDeducciones([]);
    setPreview(null);
    setErrorPreview(null);
  }, []);

  /**
   * Rehidrata el formulario desde una liquidación ya guardada, para "Volver a
   * editar". Hace falta porque el PUT reemplaza la solicitud completa: si se
   * mandara a medias, los ajustes y las deducciones guardadas se perderían.
   */
  const hidratarDesdeComprobante = useCallback((c: ComprobanteLiquidacionFinal) => {
    const prestamos: Record<number, boolean> = {};
    c.prestamos.forEach((p) => {
      prestamos[p.prestamo_id] = p.descontar ?? false;
    });

    const deducciones = c.conceptos.deducciones;
    const hayDescuento = deducciones.some(
      (d) => d.codigo === 'PRESTAMO' || d.codigo === 'OTRA_DEDUCCION',
    );

    setForm({
      ...FORM_INICIAL,
      fechaRetiro: c.retiro.fecha_retiro ?? '',
      fechaCorte: '',
      motivoRetiro: c.retiro.motivo_retiro ?? '',
      tipoContrato: c.contrato.tipo_contrato,
      fechaFinPactada: c.contrato.fecha_fin_pactada ?? '',
      // El texto del override no viaja en el comprobante: si el tipo venía
      // sobrescrito, la vista vuelve a pedir el motivo antes de guardar.
      motivoOverride: '',
      diasIndemnizacion: '',
      observaciones: c.observaciones ?? '',
      // Salud y pensión aparecen como conceptos (aunque valgan 0) cuando la
      // política estaba encendida al guardar.
      seguridadSocial: deducciones.some((d) => d.codigo === 'SALUD' || d.codigo === 'PENSION'),
      // No se pudo haber guardado un descuento sin la autorización.
      autorizacionEscrita: hayDescuento,
      prestamos,
    });

    // Los ajustes quedaron guardados concepto por concepto.
    const ajustesPrevios: Partial<Record<CodigoAjustable, AjusteTexto>> = {};
    c.conceptos.devengados.forEach((concepto) => {
      const ajuste = concepto.ajuste_manual;
      if (!ajuste || typeof ajuste !== 'object') return;
      const codigo = concepto.codigo as CodigoAjustable;
      if (!(codigo in CAMPOS_POR_CONCEPTO)) return;
      const bloque: AjusteTexto = {};
      Object.entries(ajuste).forEach(([k, v]) => {
        if (v != null && v !== '') bloque[k as keyof AjusteConcepto] = String(v);
      });
      if (Object.keys(bloque).length) ajustesPrevios[codigo] = bloque;
    });
    setAjustes(ajustesPrevios);

    setDevengados(
      c.conceptos.devengados
        .filter((d) => d.codigo === 'SALARIO_PENDIENTE' || d.codigo === 'OTRO_DEVENGADO')
        .map((d, i) => ({
          key: `${d.codigo}-${d.ref_id ?? i}`,
          codigo: d.codigo as CodigoDevengadoManual,
          nombre: d.codigo === 'OTRO_DEVENGADO' ? d.nombre : '',
          dias: d.dias != null ? String(d.dias) : '',
          valor: String(d.valor ?? ''),
          motivo: leerMotivo(d.ajuste_manual),
        })),
    );

    setOtrasDeducciones(
      deducciones
        .filter((d) => d.codigo === 'OTRA_DEDUCCION')
        .map((d, i) => ({
          key: `otra-${d.ref_id ?? i}`,
          nombre: d.nombre,
          valor: String(d.valor ?? ''),
          motivo: leerMotivo(d.ajuste_manual),
          autorizacion_escrita: true,
        })),
    );

    setPreview(c);
    setErrorPreview(null);
  }, []);

  const reiniciar = useCallback(() => {
    setForm(FORM_INICIAL);
    setAjustes({});
    setDevengados([]);
    setOtrasDeducciones([]);
    setPreview(null);
    setErrorPreview(null);
  }, []);

  const esSimulacion = tipo === 'SIMULACION';

  const construirPayload = useCallback((): PayloadLiquidacionFinal | null => {
    if (!empleadoId) return null;
    if (esSimulacion ? !form.fechaCorte : !form.fechaRetiro || !form.motivoRetiro) return null;

    // Solo viajan los bloques completos: con valor y con motivo.
    const ajustesPayload: AjustesLiquidacion = {};
    (Object.keys(ajustes) as CodigoAjustable[]).forEach((codigo) => {
      const bloque = ajustes[codigo];
      if (ajusteTieneValor(bloque) && (bloque?.motivo ?? '').trim()) {
        ajustesPayload[codigo] = mapAjuste(bloque as AjusteTexto);
      }
    });

    const devengadosPayload: DevengadoManual[] = devengados
      .filter((d) => {
        const tieneValor = num(d.dias) != null || num(d.valor) != null;
        const nombreOk = d.codigo === 'OTRO_DEVENGADO' ? d.nombre.trim() !== '' : true;
        return tieneValor && nombreOk && d.motivo.trim() !== '';
      })
      .map((d) => ({
        codigo: d.codigo,
        dias: num(d.dias),
        valor: num(d.valor),
        nombre: d.codigo === 'OTRO_DEVENGADO' ? d.nombre.trim() : undefined,
        motivo: d.motivo.trim(),
      }));

    const otrasPayload = otrasDeducciones
      .filter((o) => o.nombre.trim() !== '' && num(o.valor) != null)
      .map((o) => ({
        nombre: o.nombre.trim(),
        valor: num(o.valor) as number,
        motivo: o.motivo.trim() || undefined,
        autorizacion_escrita: o.autorizacion_escrita,
      }));

    const prestamosPayload = Object.entries(form.prestamos).map(([id, descontar]) => ({
      prestamo_id: Number(id),
      descontar,
    }));

    // El override del contrato exige motivo; sin él no se manda.
    const hayOverride = Boolean(form.motivoOverride.trim());

    return {
      tipo,
      empleado_id: empleadoId,
      fecha_retiro: esSimulacion ? undefined : form.fechaRetiro,
      fecha_corte: esSimulacion ? form.fechaCorte : undefined,
      motivo_retiro: esSimulacion ? undefined : (form.motivoRetiro as MotivoRetiroCodigo),
      tipo_contrato: hayOverride && form.tipoContrato ? form.tipoContrato : undefined,
      fecha_fin_pactada: form.fechaFinPactada || undefined,
      motivo_override: hayOverride ? form.motivoOverride.trim() : undefined,
      dias_indemnizacion: esSimulacion ? undefined : num(form.diasIndemnizacion),
      ajustes: Object.keys(ajustesPayload).length ? ajustesPayload : undefined,
      devengados_manuales: devengadosPayload.length ? devengadosPayload : undefined,
      deducciones: {
        seguridad_social: form.seguridadSocial,
        prestamos: prestamosPayload.length ? prestamosPayload : undefined,
        autorizacion_escrita: form.autorizacionEscrita,
        otras: otrasPayload.length ? otrasPayload : undefined,
      },
      observaciones: form.observaciones.trim() || undefined,
    };
  }, [tipo, esSimulacion, empleadoId, form, ajustes, devengados, otrasDeducciones]);

  const refrescar = useCallback(() => setTick((t) => t + 1), []);

  // Serializar el payload evita re-pedir el preview cuando nada cambió de
  // verdad (por ejemplo, un motivo a medio escribir que aún no viaja).
  const payload = construirPayload();
  const firma = useMemo(() => (payload ? JSON.stringify(payload) : null), [payload]);

  useEffect(() => {
    if (!firma) {
      setPreview(null);
      setErrorPreview(null);
      return;
    }
    const t = setTimeout(async () => {
      const reqId = ++reqIdRef.current;
      setCargandoPreview(true);
      setErrorPreview(null);
      try {
        const res = await liquidacionFinalApi.preview(
          JSON.parse(firma) as PayloadLiquidacionFinal,
        );
        if (reqId !== reqIdRef.current) return;
        setPreview(res.data);
      } catch (e) {
        if (reqId !== reqIdRef.current) return;
        setPreview(null);
        setErrorPreview(mensajeErrorLiquidacion(e, 'No se pudo calcular la liquidación'));
      } finally {
        if (reqId === reqIdRef.current) setCargandoPreview(false);
      }
    }, ESPERA_PREVIEW_MS);
    return () => clearTimeout(t);
  }, [firma, tick]);

  return {
    form,
    setCampo,
    ajustes,
    setAjuste,
    limpiarAjuste,
    devengados,
    agregarDevengado,
    editarDevengado,
    quitarDevengado,
    otrasDeducciones,
    agregarOtraDeduccion,
    editarOtraDeduccion,
    quitarOtraDeduccion,
    preview,
    cargandoPreview,
    errorPreview,
    construirPayload,
    refrescar,
    precargarDesdeFicha,
    hidratarDesdeComprobante,
    reiniciar,
  };
}
