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
      <div>
        <h3 className="font-semibold">Devengados que se agregan a mano</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          El salario del último período lo paga la nómina. Agréguelo aquí solo si esa nómina no
          lo va a cubrir, o se pagaría dos veces.
        </p>
      </div>

      {items.map((d) => (
        <div key={d.key} className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {d.codigo === 'SALARIO_PENDIENTE' ? 'Salario pendiente' : 'Otro devengado'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onQuitar(d.key)}
              className="h-8 px-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {d.codigo === 'OTRO_DEVENGADO' && (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={d.nombre}
                  onChange={(e) => onEditar(d.key, 'nombre', e.target.value)}
                  placeholder="Bonificación de retiro"
                  className="h-9"
                />
              </div>
            )}

            {d.codigo === 'SALARIO_PENDIENTE' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Días</Label>
                <Input
                  type="number"
                  value={d.dias}
                  onChange={(e) => onEditar(d.key, 'dias', e.target.value)}
                  placeholder="1"
                  className="h-9"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Valor</Label>
              <Input
                type="number"
                value={d.valor}
                onChange={(e) => onEditar(d.key, 'valor', e.target.value)}
                placeholder={d.codigo === 'SALARIO_PENDIENTE' ? 'Se calcula con los días' : '0'}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Motivo <span className="text-destructive">*</span>
              </Label>
              <Input
                value={d.motivo}
                onChange={(e) => onEditar(d.key, 'motivo', e.target.value)}
                placeholder="Por qué se paga aquí"
                className="h-9"
              />
            </div>
          </div>

          {!d.motivo.trim() && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
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
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Salario pendiente
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAgregar('OTRO_DEVENGADO')}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
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
        <div className="flex-1">
          <p className="text-sm font-medium">Descontar salud y pensión</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Solo sobre el salario pendiente. Las cesantías, los intereses, la prima, las
            vacaciones compensadas y la indemnización no cotizan.
          </p>
        </div>
        <Switch checked={seguridadSocial} onCheckedChange={onSeguridadSocial} />
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Préstamos vigentes</h3>
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
              className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border p-3 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={seleccion[p.prestamo_id] ?? false}
                  onCheckedChange={(v) => onPrestamo(p.prestamo_id, v === true)}
                />
                <div>
                  <p className="text-sm font-medium">{p.concepto}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.cuotas_pendientes} cuota{p.cuotas_pendientes === 1 ? '' : 's'} sin pagar
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold">{fmtCOP(p.saldo_pendiente)}</span>
            </label>
          ))
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Otras deducciones</h3>
          <Button type="button" variant="outline" size="sm" onClick={onAgregarOtra} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </Button>
        </div>

        {otras.map((o) => (
          <div key={o.key} className="space-y-3 rounded-lg border border-border p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Concepto <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={o.nombre}
                  onChange={(e) => onEditarOtra(o.key, 'nombre', e.target.value)}
                  placeholder="Dotación no devuelta"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Valor <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  value={o.valor}
                  onChange={(e) => onEditarOtra(o.key, 'valor', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Motivo</Label>
                <Input
                  value={o.motivo}
                  onChange={(e) => onEditarOtra(o.key, 'motivo', e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox
                  checked={o.autorizacion_escrita}
                  onCheckedChange={(v) => onEditarOtra(o.key, 'autorizacion_escrita', v === true)}
                />
                Hay autorización escrita de este descuento
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onQuitarOtra(o.key)}
                className="h-8 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {hayDescuento && (
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
            autorizacionEscrita ? 'border-border' : 'border-destructive/40 bg-destructive/5'
          }`}
        >
          <Checkbox
            checked={autorizacionEscrita}
            onCheckedChange={(v) => onAutorizacion(v === true)}
            className="mt-0.5"
          />
          <div>
            <p className="text-sm font-medium">
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
