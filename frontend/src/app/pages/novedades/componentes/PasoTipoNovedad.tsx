/**
 * Paso 1: elección del tipo de novedad.
 *
 * La tabla muestra las reglas de cada tipo (si se paga, cuánto y si afecta el
 * subsidio) para que la decisión se tome sin consultar otra pantalla.
 */
import { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Check } from 'lucide-react';
import { CATEGORIAS, TIPOS_NOVEDAD, type CategoriaNovedad, type TipoNovedad } from '../tipos';

interface Props {
  seleccionado: TipoNovedad | null;
  onSeleccionar: (tipo: TipoNovedad) => void;
}

const PILDORA = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium';
const PILDORA_SI = `${PILDORA} border-success/20 bg-success/10 text-success`;
const PILDORA_NO = `${PILDORA} border-border bg-muted text-muted-foreground`;
const PILDORA_ALERTA = `${PILDORA} border-destructive/20 bg-destructive/10 text-destructive`;

const TH = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground';

export function PasoTipoNovedad({ seleccionado, onSeleccionar }: Props) {
  const [categoria, setCategoria] = useState<CategoriaNovedad>(CATEGORIAS[0]!.key);
  const tipos = CATEGORIAS.find((c) => c.key === categoria)?.tipos ?? [];

  return (
    <Card className="overflow-hidden border-border">
      <div className="flex overflow-x-auto border-b border-border bg-muted/20">
        {CATEGORIAS.map((cat) => {
          const CatIcono = cat.icono;
          const activa = categoria === cat.key;
          const tieneSeleccion = seleccionado !== null && cat.tipos.includes(seleccionado);
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoria(cat.key)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3.5 text-sm font-medium transition-colors ${
                activa
                  ? 'border-primary bg-background text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground'
              }`}
            >
              <CatIcono className="h-4 w-4 shrink-0" />
              {cat.label}
              {tieneSeleccion && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-10 px-4 py-3" />
              <th className={`text-left ${TH}`}>Tipo de novedad</th>
              <th className={`whitespace-nowrap text-center ${TH}`}>Remunerado</th>
              <th className={`whitespace-nowrap text-center ${TH}`}>% Remuneración</th>
              <th className={`whitespace-nowrap text-center ${TH}`}>Afecta subsidio de transporte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tipos.map((t) => {
              const info = TIPOS_NOVEDAD[t];
              const Icono = info.icono;
              const sel = seleccionado === t;
              // Las terminaciones no tienen porcentaje: se marcan con guion.
              const sinRemuneracion = info.pct === '—';

              return (
                <tr
                  key={t}
                  onClick={() => onSeleccionar(t)}
                  className={`cursor-pointer transition-colors ${sel ? 'bg-primary/5' : 'bg-background hover:bg-muted/25'}`}
                >
                  <td className="px-4 py-3.5 text-center">
                    <div
                      className={`mx-auto flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition-colors ${
                        sel ? 'border-primary bg-primary' : 'border-border bg-background'
                      }`}
                    >
                      {sel && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          sel ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icono className="h-3.5 w-3.5" />
                      </div>
                      <span className={`text-sm font-medium ${sel ? 'text-primary' : 'text-foreground'}`}>
                        {info.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {sinRemuneracion ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <span className={info.remunerado ? PILDORA_SI : PILDORA_NO}>
                        {info.remunerado ? 'Sí' : 'No'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-sm font-semibold ${sinRemuneracion || !info.remunerado ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {info.pct}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {sinRemuneracion ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <span className={info.afectaSubsidio ? PILDORA_ALERTA : PILDORA_SI}>
                        {info.afectaSubsidio ? 'Sí' : 'No'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {seleccionado && (
        <div className="flex items-center gap-3 border-t border-border bg-primary/5 px-6 py-3">
          <Check className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Seleccionado: <strong className="text-primary">{TIPOS_NOVEDAD[seleccionado].label}</strong>
          </p>
        </div>
      )}
    </Card>
  );
}
