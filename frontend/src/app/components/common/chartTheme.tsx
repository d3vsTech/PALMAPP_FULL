// Estilo compartido de las gráficas Recharts de PalmApp.
// Uso: <CartesianGrid {...gridProps} />, <XAxis {...xAxisProps} />, <Bar {...barProps} />,
// <Tooltip {...tooltipProps} />, y para áreas <defs><AreaGradient id="x" color="var(--chart-1)" /></defs>.

export const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export const axisTick = { fill: 'var(--muted-foreground)', fontSize: 12, opacity: 0.85 };

export const gridProps = {
  vertical: false,
  stroke: 'var(--border)',
  strokeDasharray: '4 4',
} as const;

export const xAxisProps = {
  tickLine: false,
  axisLine: false,
  tick: axisTick,
  tickMargin: 10,
} as const;

export const yAxisProps = {
  tickLine: false,
  axisLine: false,
  tick: axisTick,
  width: 48,
} as const;

export const barProps = {
  radius: [8, 8, 2, 2] as [number, number, number, number],
  maxBarSize: 48,
};

export const barCategoryGap = '24%';

export const tooltipProps = {
  cursor: { fill: 'var(--muted)', opacity: 0.7, radius: 8 },
  contentStyle: {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    color: 'var(--foreground)',
    fontSize: 13,
    padding: '10px 12px',
    boxShadow: '0 8px 24px rgba(15, 33, 22, 0.10)',
  },
  labelStyle: { color: 'var(--muted-foreground)', marginBottom: 4, fontWeight: 500 },
  itemStyle: { color: 'var(--foreground)', fontWeight: 600 },
};

export const lineProps = {
  strokeWidth: 2.5,
  dot: false,
  activeDot: { r: 5, strokeWidth: 2, stroke: 'var(--card)' },
  type: 'monotone' as const,
};

/** Etiqueta encima de cada barra. */
export const barLabelProps = {
  position: 'top' as const,
  fill: 'var(--foreground)',
  fontSize: 12,
  fontWeight: 600,
  offset: 8,
};

/** Relleno tenue para series de área. Se pone dentro de <defs>. */
export function AreaGradient({ id, color }: { id: string; color: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.22} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  );
}
