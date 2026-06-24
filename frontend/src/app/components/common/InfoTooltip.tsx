import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface InfoTooltipProps {
  text: string;
  className?: string;
}

/**
 * Tooltip de ayuda discreto — ícono de interrogación que al hover muestra un
 * texto explicativo. Portado tal cual del diseño V.15 para mantener
 * consistencia visual en pantallas con campos avanzados (Terceros, etc.).
 */
export function InfoTooltip({ text, className }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <span
        role="img"
        aria-label="Más información"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        tabIndex={0}
        className="ml-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </span>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-lg bg-foreground px-3 py-2 text-xs text-background shadow-lg pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
        </span>
      )}
    </span>
  );
}
