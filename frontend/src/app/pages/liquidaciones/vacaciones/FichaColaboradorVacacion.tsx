/**
 * Ficha del colaborador en la liquidación de vacaciones: identidad, causación
 * y base del art. 192, más el ajuste manual de la base (v1.13).
 * Todo sale del detalle y del preview del backend; aquí no se recalcula nada.
 */
import type { ReactNode } from 'react';
import { Check, Loader2, Pencil } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import SeccionCard from '../../../components/liquidaciones/SeccionCard';
import DatoLista from '../../../components/liquidaciones/DatoLista';
import type { DetalleColaboradorVacaciones } from '../../../../api/vacaciones';
import { formatFecha } from '../../../utils/fecha';
import { fmtCOP, fmtDias } from './comunes';
import { EstadoAjuste } from './PiezasNuevaVacacion';

/** El campo de dinero guarda dígitos y se pinta con punto de miles. */
const soloDigitos = (v: string) => v.replace(/[^0-9]/g, '');
const conMiles = (v: string) => (v ? Number(v).toLocaleString('es-CO') : '');

export interface BaseFicha {
  etiqueta: string;
  subtexto: string;
  mensual: number;
  valorDia: number;
  diasMes: number;
  mesesBase: number | null | undefined;
  auxilio: number;
}

interface FichaProps {
  detalle: DetalleColaboradorVacaciones;
  periodo: { inicio: string; fin: string } | null;
  maxDisfrute: number;
  base: BaseFicha;
  children?: ReactNode;
}

const sutil = (texto: ReactNode) => <span className="block text-xs font-normal text-muted-foreground">{texto}</span>;

export default function FichaColaboradorVacacion({ detalle, periodo, maxDisfrute, base, children }: FichaProps) {
  const emp = detalle.empleado;
  const enCurso = detalle.causacion.dias_causados_periodo_actual;
  return (
    <SeccionCard
      title={emp.nombre_completo}
      description={`${emp.cargo ?? 'Sin cargo'} · CC ${emp.documento}`}
      actions={emp.fecha_ingreso && (
        <div className="text-left sm:text-right">
          <p className="text-[13px] font-medium text-muted-foreground">Fecha de ingreso</p>
          <p className="text-sm font-medium text-foreground">{formatFecha(emp.fecha_ingreso)}</p>
        </div>
      )}
    >
      <DatoLista
        className="lg:grid-cols-4"
        items={[
          { label: 'Período que se liquida', value: periodo ? `${formatFecha(periodo.inicio)} – ${formatFecha(periodo.fin)}` : '—' },
          { label: 'Días causados', value: fmtDias(detalle.causacion.dias_generados) },
          { label: 'Días disfrutados', value: fmtDias(detalle.causacion.dias_disfrutados) },
          {
            label: 'Días a liquidar',
            value: <>{fmtDias(maxDisfrute)}{enCurso > 0 && sutil(`+${fmtDias(enCurso)} en curso`)}</>,
          },
          // La base se nombra como lo que es: promedio, último salario o manual.
          { label: base.etiqueta, value: <>{fmtCOP(base.mensual)}{base.subtexto && sutil(base.subtexto)}</> },
          {
            // El auxilio no entra en la base del art. 192, y lo que llega es la
            // SUMA de la ventana de 12 meses, no un valor mensual.
            label: `Auxilio excluido en la ventana${base.mesesBase ? ` (Σ ${base.mesesBase} meses)` : ''}`,
            value: base.auxilio > 0
              ? <>{fmtCOP(base.auxilio)}{sutil('No entra en la base')}</>
              : <span className="font-normal text-muted-foreground">No aplica</span>,
          },
          { label: `Valor día (base ÷ ${base.diasMes})`, value: fmtCOP(base.valorDia) },
        ]}
      />
      {children}
    </SeccionCard>
  );
}

export interface AjusteBaseProps {
  abierto: boolean;
  onAlternar: () => void;
  base: string;
  onBase: (v: string) => void;
  motivo: string;
  onMotivo: (v: string) => void;
  baseSistema: number;
  diasMes: number;
  activo: boolean;
  aplicado: boolean;
  levantaBloqueo: boolean;
  calculando: boolean;
  sinDias: boolean;
  conError: boolean;
  onAplicar: () => void;
}

/**
 * v1.13 — Reemplaza la base del art. 192 cuando el año anterior se pagó fuera
 * del sistema y el promedio sale corto. Solo se pinta con permiso.
 */
export function AjusteBase(p: AjusteBaseProps) {
  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Reemplaza la base del art. 192 que calcula el sistema. Queda registrada con su motivo en el comprobante.
        </p>
        <Button variant="outline" size="sm" onClick={p.onAlternar}>
          <Pencil strokeWidth={2} />
          {p.abierto ? 'Usar base del sistema' : 'Ajustar base'}
        </Button>
      </div>
      {p.abierto && <CamposAjuste {...p} />}
    </div>
  );
}

function CamposAjuste(p: AjusteBaseProps) {
  const nBase = Number(p.base) || 0;
  const sistema = p.baseSistema > 0 ? conMiles(String(Math.round(p.baseSistema))) : '0';
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="base-manual">Base mensual</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">$</span>
            <Input
              id="base-manual"
              type="text"
              inputMode="numeric"
              className="pl-7"
              value={conMiles(p.base)}
              onChange={(e) => p.onBase(soloDigitos(e.target.value))}
              placeholder={sistema}
            />
          </div>
          {nBase > 0 && (
            <p className="text-xs text-muted-foreground">
              Valor día {fmtCOP(nBase / p.diasMes)} · base del sistema {fmtCOP(p.baseSistema)}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="motivo-ajuste">Motivo del ajuste</Label>
          <Input
            id="motivo-ajuste"
            value={p.motivo}
            onChange={(e) => p.onMotivo(e.target.value)}
            maxLength={500}
            placeholder="Por ejemplo: nóminas de 2025 en el sistema anterior"
            aria-invalid={(p.activo && !p.motivo.trim()) || undefined}
          />
          {p.activo && !p.motivo.trim() && (
            <p className="text-xs text-destructive">Indique el motivo del ajuste de la base.</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 space-y-1">
          {p.levantaBloqueo && !p.aplicado && (
            <p className="text-xs text-muted-foreground">
              Con esta base ya no aplica el bloqueo por falta de nóminas cerradas.
            </p>
          )}
          {p.activo && (
            <EstadoAjuste calculando={p.calculando} aplicado={p.aplicado} sinDias={p.sinDias} conError={p.conError} />
          )}
        </div>
        <Button size="sm" disabled={p.calculando} onClick={p.onAplicar}>
          {p.calculando ? <Loader2 className="animate-spin" /> : <Check strokeWidth={2} />}
          Aplicar base
        </Button>
      </div>
    </>
  );
}
