/**
 * El panel de ayuda del paso 1: qué va en cada una de las 32 columnas.
 *
 * Es la misma tabla que la plantilla trae en su hoja "Columnas". Se repite aquí
 * porque el usuario arma el archivo con la plantilla abierta en Excel y la
 * pantalla al lado, y lo que no está a la vista se adivina.
 *
 * Va cerrado por defecto: estorba a quien ya cargó una vez, y el que lo necesita
 * lo abre.
 */
import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { AYUDA_COLUMNAS, AYUDA_TIPOS, type AyudaColumna } from './columnasAyuda';

const CABECERAS = ['Columna', 'Tipo', 'Qué va', 'Ejemplo'];

function Fila({ ayuda }: { ayuda: AyudaColumna }) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="px-3 py-2 align-top">
        <span className="font-mono text-xs font-medium text-foreground">{ayuda.columna}</span>
        {ayuda.obligatoria && (
          <span className="ml-1.5 align-middle text-xs font-semibold text-destructive">*</span>
        )}
      </td>
      <td className="px-3 py-2 align-top text-xs text-muted-foreground">{ayuda.tipo}</td>
      <td className="px-3 py-2 align-top text-xs text-muted-foreground">{ayuda.queVa}</td>
      <td className="px-3 py-2 align-top font-mono text-xs text-muted-foreground">
        {ayuda.ejemplo}
      </td>
    </tr>
  );
}

export function AyudaColumnas() {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-muted/20 px-4 py-3 text-left hover:bg-muted/40"
      >
        <span className="flex min-w-0 items-center gap-2">
          <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Qué va en cada columna
            </span>
            <span className="block text-xs text-muted-foreground">
              Las {AYUDA_COLUMNAS.length} columnas, igual que la hoja Columnas de la plantilla
            </span>
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            abierto ? 'rotate-180' : ''
          }`}
        />
      </button>

      {abierto && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/30">
                  {CABECERAS.map((c) => (
                    <th
                      key={c}
                      className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AYUDA_COLUMNAS.map((ayuda) => (
                  <Fila key={ayuda.columna} ayuda={ayuda} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 border-t border-border bg-muted/10 px-4 py-3">
            <p className="text-xs font-medium text-foreground">
              <span className="text-destructive">*</span> obligatoria. Cómo se escribe cada tipo:
            </p>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {AYUDA_TIPOS.map((t) => (
                <li key={t.tipo}>
                  <span className="font-medium text-foreground">{t.tipo}:</span> {t.comoSeEscribe}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
