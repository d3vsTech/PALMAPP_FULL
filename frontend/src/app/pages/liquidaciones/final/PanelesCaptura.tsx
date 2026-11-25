/**
 * Los dos paneles de captura manual del formulario: devengados que se agregan
 * a mano y deducciones.
 *
 * Nada de esto se calcula aquí. Son entradas del §11.6 que el backend suma y
 * devuelve ya conciliadas en el preview.
 */
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import { Switch } from '../../../components/ui/switch';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import type { PrestamoLiquidable } from '../../../../api/liquidacionFinal';
import { fmtCOP } from './comunes';
import type { DevengadoManualTexto, OtraDeduccionTexto } from './useFormularioLiquidacion';

// ─── Devengados manuales ──────────────────────────────────────────────────────

interface PropsDevengados {
  items: DevengadoManualTexto[];
  onAgregar: (codigo: 'SALARIO_PENDIENTE' | 'OTRO_DEVENGADO') => void;
  onEditar: (key: string, campo: keyof DevengadoManualTexto, valor: string) => void;
  onQuitar: (key: string) => void;
  /** Bloquea agregar un segundo salario pendiente: el backend solo admite uno. */
  yaHaySalarioPendiente: boolean;
}

export function PanelDevengadosManuales({
  items,
  onAgregar,
  onEditar,
  onQuitar,
  yaHaySalarioPendiente,
}: PropsDevengados) {
  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay devengados agregados a mano.</p>
      )}

      {items.map((d) => (
        <div key={d.key} className="space-y-4 rounded-lg bg-muted/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-muted-foreground">
              {d.codigo === 'SALARIO_PENDIENTE' ? 'Salario pendiente' : 'Otro devengado'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onQuitar(d.key)}
              aria-label="Quitar"
              title="Quitar"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 strokeWidth={2} />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {d.codigo === 'OTRO_DEVENGADO' && (
              <div className="space-y-2">
                <Label htmlFor={`dev-nombre-${d.key}`}>Nombre *</Label>
                <Input id={`dev-nombre-${d.key}`}
                  value={d.nombre}
                  onChange={(e) => onEditar(d.key, 'nombre', e.target.value)}
                  placeholder="Bonificación de retiro"
                />
              </div>
            )}

            {d.codigo === 'SALARIO_PENDIENTE' && (
              <div className="space-y-2">
                <Label htmlFor={`dev-dias-${d.key}`}>Días</Label>
                <Input id={`dev-dias-${d.key}`}
                  type="number"
                  value={d.dias}
                  onChange={(e) => onEditar(d.key, 'dias', e.target.value)}
                  placeholder="1"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor={`dev-valor-${d.key}`}>Valor</Label>
              <Input id={`dev-valor-${d.key}`}
                type="number"
                value={d.valor}
                onChange={(e) => onEditar(d.key, 'valor', e.target.value)}
                placeholder={d.codigo === 'SALARIO_PENDIENTE' ? 'Se calcula con los días' : '0'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`dev-motivo-${d.key}`}>Motivo *</Label>
              <Input id={`dev-motivo-${d.key}`}
                value={d.motivo}
                onChange={(e) => onEditar(d.key, 'motivo', e.target.value)}
                placeholder="Por qué se paga aquí"
              />
            </div>
          </div>

          {!d.motivo.trim() && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" strokeWidth={2} />
              Sin motivo este concepto no se agrega.
            </p>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={yaHaySalarioPendiente}
          onClick={() => onAgregar('SALARIO_PENDIENTE')}
        >
          <Plus strokeWidth={2} />
          Salario pendiente
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAgregar('OTRO_DEVENGADO')}
        >
          <Plus strokeWidth={2} />
          Otro devengado
        </Button>
      </div>
    </div>
  );
}

// ─── Deducciones ──────────────────────────────────────────────────────────────

interface PropsDeducciones {
  seguridadSocial: boolean;
  onSeguridadSocial: (v: boolean) => void;
  prestamos: PrestamoLiquidable[];
  seleccion: Record<number, boolean>;
  onPrestamo: (prestamoId: number, descontar: boolean) => void;
  autorizacionEscrita: boolean;
  onAutorizacion: (v: boolean) => void;
  otras: OtraDeduccionTexto[];
  onAgregarOtra: () => void;
  onEditarOtra: (key: string, campo: keyof OtraDeduccionTexto, valor: string | boolean) => void;
  onQuitarOtra: (key: string) => void;
}

export function PanelDeducciones({
  seguridadSocial,
  onSeguridadSocial,
  prestamos,
  seleccion,
  onPrestamo,
  autorizacionEscrita,
  onAutorizacion,
  otras,
  onAgregarOtra,
  onEditarOtra,
  onQuitarOtra,
}: PropsDeducciones) {
  const hayDescuento =
    prestamos.some((p) => seleccion[p.prestamo_id]) || otras.some((o) => o.nombre.trim() !== '');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Descontar salud y pensión</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Solo sobre el salario pendiente. Las cesantías, los intereses, la prima, las
            vacaciones compensadas y la indemnización no cotizan.
          </p>
        </div>
        <Switch className="shrink-0" checked={seguridadSocial} onCheckedChange={onSeguridadSocial} aria-label="Descontar salud y pensión" />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">Préstamos vigentes</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Se descuenta el saldo completo. No hay descuentos parciales.
          </p>
        </div>

        {prestamos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este colaborador no tiene préstamos vigentes.</p>
        ) : (
          prestamos.map((p) => (
            <label
              key={p.prestamo_id}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors ${
                seleccion[p.prestamo_id] ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted/40'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Checkbox
                  checked={seleccion[p.prestamo_id] ?? false}
                  onCheckedChange={(v) => onPrestamo(p.prestamo_id, v === true)}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{p.concepto}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.cuotas_pendientes} cuota{p.cuotas_pendientes === 1 ? '' : 's'} sin pagar
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{fmtCOP(p.saldo_pendiente)}</span>
            </label>
          ))
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted-foreground">Otras deducciones</p>
          <Button type="button" variant="outline" size="sm" onClick={onAgregarOtra}>
            <Plus strokeWidth={2} />
            Agregar
          </Button>
        </div>

        {otras.map((o) => (
          <div key={o.key} className="space-y-4 rounded-lg bg-muted/60 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`ded-concepto-${o.key}`}>Concepto *</Label>
                <Input id={`ded-concepto-${o.key}`}
                  value={o.nombre}
                  onChange={(e) => onEditarOtra(o.key, 'nombre', e.target.value)}
                  placeholder="Dotación no devuelta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ded-valor-${o.key}`}>Valor *</Label>
                <Input id={`ded-valor-${o.key}`}
                  type="number"
                  value={o.valor}
                  onChange={(e) => onEditarOtra(o.key, 'valor', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ded-motivo-${o.key}`}>Motivo</Label>
                <Input id={`ded-motivo-${o.key}`}
                  value={o.motivo}
                  onChange={(e) => onEditarOtra(o.key, 'motivo', e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={o.autorizacion_escrita}
                  onCheckedChange={(v) => onEditarOtra(o.key, 'autorizacion_escrita', v === true)}
                />
                Hay autorización escrita de este descuento
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onQuitarOtra(o.key)}
                aria-label="Quitar"
                title="Quitar"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 strokeWidth={2} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {hayDescuento && (
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
            autorizacionEscrita ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted/40'
          }`}
        >
          <Checkbox
            checked={autorizacionEscrita}
            onCheckedChange={(v) => onAutorizacion(v === true)}
            className="mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              El trabajador autorizó estos descuentos por escrito
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Los artículos 149 y 150 del Código Sustantivo del Trabajo lo exigen. Sin esta
              casilla el sistema no deja descontar.
            </p>
          </div>
        </label>
      )}
    </div>
  );
}
