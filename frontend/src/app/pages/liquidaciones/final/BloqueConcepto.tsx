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
import { fmtCOP } from './comunes';
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
  oculto = false,
  soloLectura = false,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  if (oculto) return null;

  const ajustado = ajusteTieneValor(ajuste);
  const faltaMotivo = ajusteFaltaMotivo(ajuste);
  const valor = concepto?.valor ?? 0;

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {titulo}
            {concepto?.es_manual && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Ajustado
              </Badge>
            )}
          </h3>
          {descripcion && <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>}
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-primary">{fmtCOP(valor)}</p>
          {concepto?.detalle_texto && (
            <p className="text-xs text-muted-foreground">{concepto.detalle_texto}</p>
          )}
        </div>
      </div>

      {concepto?.formula_aplicada && (
        <p className="font-mono text-xs text-muted-foreground">{concepto.formula_aplicada}</p>
      )}

      {concepto?.advertencias?.map((a, i) => (
        <p
          key={`${a.code}-${i}`}
          className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {a.mensaje}
        </p>
      ))}

      {!soloLectura && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAbierto((v) => !v)}
            className="h-8 gap-1.5 px-2 text-xs"
          >
            <Pencil className="h-3.5 w-3.5" />
            Ajustar a mano
            {abierto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>

          {abierto && (
            <div className="space-y-3 rounded-md bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Lo que escriba aquí reemplaza el dato con el que el sistema calcula. Queda
                guardado en el comprobante con su motivo.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {campos.map(({ campo, label, tipo = 'number' }) => (
                  <div key={String(campo)} className="space-y-1.5">
                    <Label htmlFor={`${codigo}-${String(campo)}`} className="text-xs">
                      {label}
                    </Label>
                    <Input
                      id={`${codigo}-${String(campo)}`}
                      type={tipo}
                      value={(ajuste?.[campo] as string | undefined) ?? ''}
                      onChange={(e) => onAjuste(campo, e.target.value)}
                      placeholder="Calculado"
                      className="h-9"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${codigo}-motivo`} className="text-xs">
                  Motivo del ajuste {ajustado && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id={`${codigo}-motivo`}
                  value={ajuste?.motivo ?? ''}
                  onChange={(e) => onAjuste('motivo', e.target.value)}
                  placeholder="Por qué se cambia este valor"
                  className="h-9"
                />
                {faltaMotivo && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
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
                  className="h-8 gap-1.5 px-2 text-xs"
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
