/**
 * Paso 1: elección del tipo de novedad.
 *
 * Las cinco pestañas y sus motivos vienen de `GET novedades/init`, así que una
 * finca con motivos propios los ve aquí sin tocar el front. Vacaciones y
 * Terminación no tienen motivos: son otras fuentes y confirman contra sus
 * propios endpoints.
 */
import { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Check, Info } from 'lucide-react';
import type { CategoriaInit, CategoriaNovedad, MotivoNovedad } from '../../../../api/novedades';
import { ICONO_CATEGORIA, formatPorcentaje, iconoDeMotivo } from '../tipos';

interface Props {
  categorias: CategoriaInit[];
  categoriaSeleccionada: CategoriaNovedad | null;
  motivoSeleccionado: MotivoNovedad | null;
  onSeleccionar: (categoria: CategoriaNovedad, motivo: MotivoNovedad | null) => void;
}

const PILDORA = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium';
const PILDORA_SI = `${PILDORA} border-success/20 bg-success/10 text-success`;
const PILDORA_NO = `${PILDORA} border-border bg-muted text-muted-foreground`;
const PILDORA_ALERTA = `${PILDORA} border-destructive/20 bg-destructive/10 text-destructive`;

const TH = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground';

/** Texto de las pestañas que no tienen motivos que elegir. */
const SIN_MOTIVOS: Partial<Record<CategoriaNovedad, string>> = {
  VACACIONES:
    'Registra una solicitud de disfrute. Queda pendiente hasta que Liquidaciones la apruebe liquidándola, o se rechace.',
  TERMINACION_CONTRATO:
    'Registra el retiro del colaborador. No liquida: al confirmar queda el enlace a la liquidación final.',
};

export function PasoTipoNovedad({
  categorias, categoriaSeleccionada, motivoSeleccionado, onSeleccionar,
}: Props) {
  const [activa, setActiva] = useState<CategoriaNovedad>(
    categoriaSeleccionada ?? categorias[0]?.codigo ?? 'PERMISOS_LICENCIAS',
  );
  const categoria = categorias.find((c) => c.codigo === activa);
  const motivos = categoria?.motivos ?? [];
  const nota = SIN_MOTIVOS[activa];

  return (
    <Card className="overflow-hidden border-border">
      <div className="flex overflow-x-auto border-b border-border bg-muted/20">
        {categorias.map((cat) => {
          const CatIcono = ICONO_CATEGORIA[cat.codigo];
          const esActiva = activa === cat.codigo;
          const tieneSeleccion = categoriaSeleccionada === cat.codigo;
          return (
            <button
              key={cat.codigo}
              type="button"
              onClick={() => {
                setActiva(cat.codigo);
                // Vacaciones y Terminación se eligen con el solo clic de pestaña.
                if (cat.motivos.length === 0) onSeleccionar(cat.codigo, null);
              }}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3.5 text-sm font-medium transition-colors ${
                esActiva
                  ? 'border-primary bg-background text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground'
              }`}
            >
              {CatIcono && <CatIcono className="h-4 w-4 shrink-0" />}
              {cat.etiqueta}
              {tieneSeleccion && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {motivos.length === 0 ? (
        <div className="flex items-start gap-3 px-6 py-8">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm text-foreground">{nota ?? 'Esta pestaña no tiene motivos configurados.'}</p>
            {nota && (
              <p className="mt-1 text-xs text-muted-foreground">
                Continúa al siguiente paso para completar los datos.
              </p>
            )}
          </div>
        </div>
      ) : (
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
              {motivos.map((motivo) => {
                const Icono = iconoDeMotivo(motivo);
                const sel = motivoSeleccionado?.id === motivo.id;
                return (
                  <tr
                    key={motivo.id}
                    onClick={() => onSeleccionar(activa, motivo)}
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
                          style={!sel && motivo.color ? { backgroundColor: `${motivo.color}1A`, color: motivo.color } : undefined}
                        >
                          <Icono className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className={`text-sm font-medium ${sel ? 'text-primary' : 'text-foreground'}`}>
                            {motivo.nombre}
                          </span>
                          {motivo.condicion && (
                            <p className="truncate text-xs text-muted-foreground">{motivo.condicion}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={motivo.es_remunerada ? PILDORA_SI : PILDORA_NO}>
                        {motivo.es_remunerada ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-sm font-semibold ${motivo.es_remunerada ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {formatPorcentaje(motivo.porcentaje_pago_default)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={motivo.afecta_auxilio_transporte ? PILDORA_ALERTA : PILDORA_SI}>
                        {motivo.afecta_auxilio_transporte ? 'Sí' : 'No'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {categoriaSeleccionada && (
        <div className="flex items-center gap-3 border-t border-border bg-primary/5 px-6 py-3">
          <Check className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Seleccionado:{' '}
            <strong className="text-primary">
              {motivoSeleccionado?.nombre
                ?? categorias.find((c) => c.codigo === categoriaSeleccionada)?.etiqueta}
            </strong>
          </p>
        </div>
      )}
    </Card>
  );
}
