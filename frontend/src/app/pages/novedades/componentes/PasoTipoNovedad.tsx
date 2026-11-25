/**
 * Paso 1: elección del tipo de novedad.
 *
 * Las cinco pestañas y sus motivos vienen de `GET novedades/init`, así que una
 * finca con motivos propios los ve aquí sin tocar el front. Vacaciones y
 * Terminación no tienen motivos: son otras fuentes y confirman contra sus
 * propios endpoints.
 */
import { useState } from 'react';
import { comoBoton } from '../../../hooks/comoBoton';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Check, Info } from 'lucide-react';
import type { CategoriaInit, CategoriaNovedad, MotivoNovedad } from '../../../../api/novedades';
import {
  ETIQUETA_CATEGORIA, ICONO_CATEGORIA, formatPorcentaje, iconoDeMotivo } from '../tipos';

interface Props {
  categorias: CategoriaInit[];
  categoriaSeleccionada: CategoriaNovedad | null;
  motivoSeleccionado: MotivoNovedad | null;
  onSeleccionar: (categoria: CategoriaNovedad, motivo: MotivoNovedad | null) => void;
}

const TH = 'px-4 py-2.5 text-[13px] font-semibold text-muted-foreground';

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
    <Card className="gap-0 overflow-hidden">
      <div className="flex overflow-x-auto border-b border-border">
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
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                esActiva
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {CatIcono && <CatIcono className="h-4 w-4 shrink-0" />}
              {ETIQUETA_CATEGORIA[cat.codigo] ?? cat.etiqueta}
              {tieneSeleccion && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {motivos.length === 0 ? (
        <div className="flex items-start gap-3 px-5 py-6">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
          <div className="min-w-0">
            <p className="text-sm text-foreground">{nota ?? 'Esta pestaña no tiene motivos configurados.'}</p>
            {nota && (
              <p className="mt-1 text-sm text-muted-foreground">
                Continúa al siguiente paso para completar los datos.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="w-10 px-4 py-2.5" />
                <th className={`text-left ${TH}`}>Tipo de novedad</th>
                <th className={`whitespace-nowrap text-center ${TH}`}>Remunerado</th>
                <th className={`whitespace-nowrap text-right ${TH}`}>% remuneración</th>
                <th className={`whitespace-nowrap text-center ${TH}`}>Afecta subsidio de transporte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {motivos.map((motivo) => {
                const Icono = iconoDeMotivo(motivo);
                const sel = motivoSeleccionado?.id === motivo.id;
                const pct = formatPorcentaje(motivo.porcentaje_pago_default);
                const sinPorcentaje = pct === '—';
                return (
                  <tr
                    key={motivo.id}
                    {...comoBoton(() => onSeleccionar(activa, motivo))}
                    className={`cursor-pointer transition-colors ${sel ? 'bg-primary-soft' : 'hover:bg-muted/40'}`}
                  >
                    <td className="celda-seleccion px-4 py-3 text-center">
                      <span
                        className={`mx-auto flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                          sel ? 'border-primary bg-primary' : 'border-input bg-card'
                        }`}
                      >
                        {sel && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            sel ? 'bg-card text-primary' : 'bg-muted text-muted-foreground'
                          }`}
                          style={!sel && motivo.color ? { backgroundColor: `${motivo.color}1A`, color: motivo.color } : undefined}
                        >
                          <Icono className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <span className="font-medium text-foreground">{motivo.nombre}</span>
                          {motivo.condicion && (
                            <p className="text-xs text-muted-foreground">{motivo.condicion}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sinPorcentaje ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant={motivo.es_remunerada ? 'success' : 'secondary'}>
                          {motivo.es_remunerada ? 'Sí' : 'No'}
                        </Badge>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold tabular-nums ${
                        motivo.es_remunerada && !sinPorcentaje ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {pct}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sinPorcentaje ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant={motivo.afecta_auxilio_transporte ? 'destructive' : 'success'}>
                          {motivo.afecta_auxilio_transporte ? 'Sí' : 'No'}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {categoriaSeleccionada && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/60 px-5 py-3 text-sm text-muted-foreground">
          <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
          Seleccionado:{' '}
          <strong className="font-semibold text-foreground">
            {motivoSeleccionado?.nombre
              ?? ETIQUETA_CATEGORIA[categoriaSeleccionada]
              ?? categorias.find((c) => c.codigo === categoriaSeleccionada)?.etiqueta}
          </strong>
        </div>
      )}
    </Card>
  );
}
