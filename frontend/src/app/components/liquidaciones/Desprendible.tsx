import { ReactNode } from 'react';
import { Card } from '../ui/card';
import ConceptosTabla, { Concepto } from './ConceptosTabla';
import { Dato } from './DatoLista';

interface DesprendibleProps {
  nombre: string;
  cargo?: string;
  meta?: Dato;
  datos: Dato[];
  conceptos: Concepto[];
  children?: ReactNode;
}

/** Desprendible de un colaborador: cabecera, datos en una fila y tabla de conceptos del cálculo. */
export default function Desprendible({ nombre, cargo, meta, datos, conceptos, children }: DesprendibleProps) {
  return (
    <Card className="gap-0 overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <h3 className="break-words">{nombre}</h3>
          {cargo && <p className="text-xs text-muted-foreground">{cargo}</p>}
        </div>
        {meta && (
          <div className="shrink-0 text-right">
            <p className="text-[13px] font-medium text-muted-foreground">{meta.label}</p>
            <p className="text-sm font-medium text-foreground">{meta.value}</p>
          </div>
        )}
      </div>
      <dl className="grid grid-cols-1 gap-3 border-y border-border bg-muted/60 px-5 py-3 sm:grid-cols-3">
        {datos.map(d => (
          <div key={d.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{d.label}</dt>
            <dd className="text-sm font-medium text-foreground">{d.value}</dd>
          </div>
        ))}
      </dl>
      <div className="px-5 py-2">
        <ConceptosTabla items={conceptos} />
      </div>
      {children}
    </Card>
  );
}
