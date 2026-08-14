/**
 * CardAlerta
 *
 * Renderiza una alerta individual del diagnóstico IA con:
 *  - Badge de severidad (color según §5 API_INSIGHTS)
 *  - Badge del dominio
 *  - Título + descripción
 *  - Evidencia numérica (métrica, valor, umbral, fecha)
 *  - Badge ⚠ si `evidencia_verificada === false`
 *
 * Las alertas son puramente informativas — no tienen acciones Resolver /
 * Descartar. Si en el futuro se necesita gestión, se re-agregan los
 * botones + AlertDialog + call a `insightsApi.marcarAlerta`.
 */
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import {
  SEVERIDAD_LABEL, DOMINIO_LABEL,
  type Alerta,
} from '../../../api/insights';

interface Props {
  alerta: Alerta;
}

/** Mapa de métricas técnicas del backend a etiquetas legibles para el
 *  finquero. Si aparece una métrica no mapeada, se muestra el slug
 *  original con snake_case convertido a texto normal. */
const METRICA_LABEL: Record<string, string> = {
  kg_gajo: 'Kilos por gajo',
  kg_totales: 'Producción total (kg)',
  kg_totales_vs_gajos: 'Kilos vs gajos reportados',
  delta_gajos_pct_promedio: 'Diferencia entre reportado y reconteo',
  delta_kg_gajo_pct: 'Caída en kilos por gajo (%)',
  delta_kg_pct: 'Cambio en producción total (%)',
  fruto_verde_pct: 'Fruto verde (%)',
  sobre_maduro_pct: 'Fruto sobre-maduro (%)',
  podrido_pct: 'Fruto podrido (%)',
  pedunculo_largo_pct: 'Pedúnculo largo (%)',
  mal_formado_pct: 'Fruto mal formado (%)',
  horas_extra_semanales: 'Horas extra por semana',
  ausencias_injustificadas: 'Ausencias sin justificar',
  dias_sin_labor: 'Días sin atender el lote',
  costo_por_palma: 'Costo por palma ($)',
  delta_costo_pct: 'Cambio en el costo (%)',
  podrido_pct_post_lluvia: 'Fruto podrido tras lluvia (%)',
};

function formatearMetrica(slug: string | null | undefined): string {
  if (!slug) return '';
  if (METRICA_LABEL[slug]) return METRICA_LABEL[slug];
  // Fallback: snake_case → texto capitalizado.
  return slug
    .replace(/_/g, ' ')
    .replace(/\bpct\b/gi, '%')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatearValor(v: string | null | undefined): string {
  if (v == null) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  // Enteros exactos → sin decimales. Otros → máximo 2 decimales.
  if (Number.isInteger(n)) return n.toLocaleString('es-CO');
  return n.toLocaleString('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

export function CardAlerta({ alerta }: Props) {
  const sev = SEVERIDAD_LABEL[alerta.severidad];
  const dominio = DOMINIO_LABEL[alerta.dominio] ?? alerta.dominio;

  return (
    <Card
      className={`border-l-4 ${
        alerta.severidad === 'CRITICA' ? 'border-l-red-500' :
        alerta.severidad === 'ALTA' ? 'border-l-orange-500' :
        alerta.severidad === 'MEDIA' ? 'border-l-yellow-500' :
        'border-l-blue-500'
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={sev.badgeClass}>
            <TrendingDown className="h-3 w-3 mr-1" />
            {sev.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {dominio}
          </Badge>
          {!alerta.evidencia_verificada && (
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Sin evidencia verificada
            </Badge>
          )}
        </div>

        {/* Título + descripción */}
        <div>
          <h4 className="font-semibold text-foreground">{alerta.titulo}</h4>
          <p className="text-sm text-muted-foreground mt-1">{alerta.descripcion}</p>
        </div>

        {/* Evidencia con lenguaje amigable para el finquero. */}
        {(alerta.metrica || alerta.valor || alerta.umbral) && (
          <div className="flex items-center gap-4 text-xs bg-muted/30 rounded p-2.5 flex-wrap">
            {alerta.metrica && (
              <div className="flex-1 min-w-[150px]">
                <span className="text-muted-foreground uppercase text-[10px]">Qué se midió</span>
                <p className="font-medium text-foreground">{formatearMetrica(alerta.metrica)}</p>
              </div>
            )}
            {alerta.valor != null && (
              <div>
                <span className="text-muted-foreground uppercase text-[10px]">Lo encontrado</span>
                <p className="font-bold text-foreground">{formatearValor(alerta.valor)}</p>
              </div>
            )}
            {alerta.umbral != null && (
              <div>
                <span className="text-muted-foreground uppercase text-[10px]">Límite aceptable</span>
                <p className="text-foreground">{formatearValor(alerta.umbral)}</p>
              </div>
            )}
            {alerta.fecha_evidencia && (
              <div>
                <span className="text-muted-foreground uppercase text-[10px]">Fecha</span>
                <p className="text-foreground">
                  {new Date(alerta.fecha_evidencia + 'T00:00:00').toLocaleDateString('es-CO')}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
