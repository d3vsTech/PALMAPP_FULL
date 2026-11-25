/**
 * Un concepto del formulario: lo que calculó el backend arriba y, plegados,
 * los campos para ajustarlo a mano.
 *
 * El valor grande SIEMPRE sale del preview. Los inputs no multiplican nada:
 * son el ajuste del §11.6, y sin motivo no se aplican.
 */
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { AlertTriangle, ChevronDown, ChevronUp, Pencil, RotateCcw } from 'lucide-react';
import type { AjusteConcepto, CodigoAjustable, ConceptoLiquidacion } from '../../../../api/liquidacionFinal';
import { fmtCOP, fmtDias } from './comunes';
import { ajusteFaltaMotivo, ajusteTieneValor, type AjusteTexto } from './useFormularioLiquidacion';

/** Qué campos admite cada concepto, según el §11.6. */
export interface CampoAjuste {
  campo: keyof AjusteConcepto;
  label: string;
  tipo?: 'number' | 'date';
}

interface Props {
  codigo: CodigoAjustable;
  titulo: string;
  /** Qué representa el concepto, en una línea. */
  descripcion?: string;
  campos: CampoAjuste[];
  concepto: ConceptoLiquidacion | undefined;
  ajuste: AjusteTexto | undefined;
  onAjuste: (campo: keyof AjusteConcepto, valor: string) => void;
  onLimpiar: () => void;
  /** Cómo se llaman los días de este concepto: "acumulados", "del semestre". */
  unidadDias?: string;
  /** Se oculta el bloque completo cuando el concepto no aplica. */
  oculto?: boolean;
  soloLectura?: boolean;
}

export function BloqueConcepto({
  codigo,
  titulo,
  descripcion,
  campos,
  concepto,
  ajuste,
  onAjuste,
  onLimpiar,
  unidadDias = 'días',
  oculto = false,
  soloLectura = false,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  if (oculto) return null;

  const ajustado = ajusteTieneValor(ajuste);
  const faltaMotivo = ajusteFaltaMotivo(ajuste);
  const valor = concepto?.valor ?? 0;
  const subtitulo = subtituloDe(concepto, unidadDias);

  return (
    <div className="space-y-3 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
          {titulo}
          {concepto?.es_manual && <Badge variant="warning">Ajustado</Badge>}
        </p>
        {descripcion && <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/60 px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">
          Total {titulo.toLowerCase()}
          {subtitulo && ` · ${subtitulo}`}
        </span>
        <span className="font-semibold tabular-nums text-foreground">{fmtCOP(valor)}</span>
      </div>

      {/* En el estado de cuenta no se pintan avisos: es una consulta, no hay
          nada que corregir ni que aprobar. En la liquidación real sí, porque
          ahí son la señal de que un concepto quedó mal calculado. */}
      {!soloLectura &&
        concepto?.advertencias?.map((a, i) => (
          <div key={`${a.code}-${i}`} className="flex gap-2 rounded-lg bg-warning-soft p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
            <p className="text-sm text-foreground">{a.mensaje}</p>
          </div>
        ))}

      {!soloLectura && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAbierto((v) => !v)}
            className="text-muted-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Ajustar a mano
            {abierto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>

          {abierto && (
            <div className="space-y-4 rounded-lg bg-muted/60 p-4">
              <p className="text-xs text-muted-foreground">
                Lo que escriba aquí reemplaza el dato con el que el sistema calcula. Queda
                guardado en el comprobante con su motivo.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {campos.map(({ campo, label, tipo = 'number' }) => (
                  <div key={String(campo)} className="space-y-2">
                    <Label htmlFor={`${codigo}-${String(campo)}`}>
                      {label}
                    </Label>
                    <Input
                      id={`${codigo}-${String(campo)}`}
                      type={tipo}
                      value={(ajuste?.[campo] as string | undefined) ?? ''}
                      onChange={(e) => onAjuste(campo, e.target.value)}
                      placeholder="Calculado"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${codigo}-motivo`}>
                  Motivo del ajuste{ajustado && ' *'}
                </Label>
                <Input
                  id={`${codigo}-motivo`}
                  value={ajuste?.motivo ?? ''}
                  onChange={(e) => onAjuste('motivo', e.target.value)}
                  placeholder="Por qué se cambia este valor"
                />
                {faltaMotivo && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    Sin motivo el ajuste no se aplica.
                  </p>
                )}
              </div>

              {ajustado && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onLimpiar}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Volver al valor calculado
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Línea bajo el valor. Se arma con los campos estructurados y no con
 * `detalle_texto`, porque ese viene del backend con la multiplicación dentro
 * ("20,75 días × 0") y eso es la fórmula, que no va en el formulario.
 */
function subtituloDe(
  c: ConceptoLiquidacion | undefined,
  unidadDias: string,
): string | null {
  if (!c) return null;
  const partes: string[] = [];
  if (c.porcentaje != null) partes.push(`${fmtDias(c.porcentaje)} % anual`);
  if (c.dias != null) partes.push(`${fmtDias(c.dias)} ${unidadDias}`);
  return partes.length ? partes.join(' · ') : null;
}

/** Campos que admite cada concepto ajustable (§11.6). */
export const CAMPOS_AJUSTE: Record<CodigoAjustable, CampoAjuste[]> = {
  CESANTIAS: [
    { campo: 'salario_basico', label: 'Salario básico' },
    { campo: 'auxilio_transporte', label: 'Aux. transporte' },
    { campo: 'promedio_variables', label: 'Promedio variables' },
    { campo: 'dias_computados', label: 'Días' },
    { campo: 'fecha_computo_desde', label: 'Calcular desde', tipo: 'date' },
  ],
  INTERESES_CESANTIAS: [
    { campo: 'saldo_cesantias', label: 'Saldo de cesantías' },
    { campo: 'dias_base_intereses', label: 'Días' },
  ],
  PRIMA: [
    { campo: 'salario_basico', label: 'Salario básico' },
    { campo: 'auxilio_transporte', label: 'Aux. transporte' },
    { campo: 'promedio_variables', label: 'Promedio variables' },
    { campo: 'dias_computados', label: 'Días' },
    { campo: 'fecha_computo_desde', label: 'Calcular desde', tipo: 'date' },
  ],
  VACACIONES: [
    { campo: 'base_mensual', label: 'Salario base' },
    { campo: 'dias', label: 'Días a compensar' },
  ],
  INDEMNIZACION: [
    { campo: 'base', label: 'Salario base' },
    { campo: 'dias', label: 'Días' },
  ],
};
