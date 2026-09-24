/**
 * Quiénes no salen en el selector de esta planilla, y por qué.
 *
 * Sin esto el filtro de vinculación (§1.1) es peor que el bug que arregla: el
 * usuario busca a Juan, no lo encuentra, y no tiene forma de saber si es que
 * se retiró, si entró después, o si la pantalla está fallando. Con la nota, la
 * pregunta se cierra sola.
 *
 * Va plegada porque en una finca grande pueden ser varias personas y el
 * usuario casi siempre solo necesita el número.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { ColaboradorExcluido } from './vinculacionPlanilla';

export function NotaColaboradoresExcluidos({
  excluidos,
  fecha,
}: {
  excluidos: ColaboradorExcluido[];
  fecha: string;
}) {
  const [abierta, setAbierta] = useState(false);
  if (excluidos.length === 0) return null;

  const n = excluidos.length;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-start gap-2 text-left text-sm text-muted-foreground"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="flex-1">
          {n} colaborador{n === 1 ? '' : 'es'} no aparece{n === 1 ? '' : 'n'} en las listas de esta
          planilla porque no tenía{n === 1 ? '' : 'n'} contrato vigente el {fecha}.
        </span>
        {abierta ? (
          <ChevronUp className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" />
        )}
      </button>

      {abierta && (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {excluidos.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-medium">{c.nombre}</span>
              <span className="text-xs text-muted-foreground">{c.motivo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
