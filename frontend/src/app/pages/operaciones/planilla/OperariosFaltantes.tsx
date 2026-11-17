/**
 * Los operarios de contratista que no aparecen en la planilla del día
 * (API_OPERACIONES §7.1).
 *
 * Desde el 2026-11-16 el backend solo manda los de contratistas activos y los
 * entrega agrupados por contratista. La lista plana repetía el nombre de la
 * empresa en cada renglón y, como un contratista que no vino ese día sale con
 * toda su planta, eran diez líneas iguales. Aquí se pinta un bloque por
 * empresa, respetando el orden en que llegan.
 */
import type { CoberturaOperarioFaltante } from '../../../../api/operaciones';

const SIN_EMPRESA = 'Sin contratista';

/** Agrupa conservando el orden del backend, empresa y persona. */
function porContratista(
  operarios: CoberturaOperarioFaltante[],
): Array<[string, CoberturaOperarioFaltante[]]> {
  const grupos = new Map<string, CoberturaOperarioFaltante[]>();
  for (const o of operarios) {
    const empresa = o.tercero_nombre?.trim() || SIN_EMPRESA;
    const actual = grupos.get(empresa);
    if (actual) actual.push(o);
    else grupos.set(empresa, [o]);
  }
  return [...grupos.entries()];
}

export default function OperariosFaltantes({
  operarios,
}: {
  operarios: CoberturaOperarioFaltante[];
}) {
  if (operarios.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
        Operarios ({operarios.length})
      </p>
      <div className="max-h-40 overflow-y-auto space-y-2">
        {porContratista(operarios).map(([empresa, gente]) => (
          <div key={empresa}>
            <p className="text-xs font-medium text-foreground">
              {empresa} <span className="text-muted-foreground">({gente.length})</span>
            </p>
            <ul className="text-sm space-y-0.5">
              {gente.map((o) => (
                <li key={`op-${o.id}`}>
                  {o.nombre_completo}
                  <span className="text-xs text-muted-foreground ml-1">· CC {o.cedula}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
