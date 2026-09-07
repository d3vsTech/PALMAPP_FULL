import { Badge } from '../../../components/ui/badge';
import type { ColaboradorWizard } from './tipos';

/**
 * Chip con el nombre de un colaborador/operario para las tarjetas de palma.
 *
 * Estados visuales (§3.2 y §3.2.1):
 *  - Operario de tercero → fondo naranja, badge del nombre del tercero.
 *  - Empleado propio con `modalidad_pago = 'FIJO'` → badge extra gris
 *    "FIJO · $0" para dejar claro que su jornal cierra en cero (la nómina
 *    lo paga por salario_base).
 *  - Empleado propio con `modalidad_pago = 'PRODUCCION'` → chip neutro.
 */
export function ColaboradorChip({ col }: { col: ColaboradorWizard }) {
  const esFijo = !col.terceroNombre && col.modalidad_pago === 'FIJO';
  const primerApellido = (col.apellidos || '').split(' ')[0] ?? '';
  const nombreCorto = `${col.nombres} ${primerApellido}`.trim();
  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        col.terceroNombre
          ? 'bg-orange-50 text-orange-800 border-orange-300'
          : esFijo
            ? 'bg-muted/60 text-muted-foreground border-border'
            : ''
      }`}
      title={
        col.terceroNombre
          ? `Tercero · ${col.terceroNombre}`
          : esFijo
            ? 'Empleado con salario fijo — su jornal diario queda en $0. La nómina lo paga por salario_base.'
            : 'Colaborador interno · pago por producción'
      }
    >
      {nombreCorto}
      {col.terceroNombre && (
        <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wide bg-orange-200/70 text-orange-900 rounded px-1 py-[1px]">
          {col.terceroNombre}
        </span>
      )}
    </Badge>
  );
}
