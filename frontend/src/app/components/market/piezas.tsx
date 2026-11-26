import { useState, type ReactNode } from 'react';
import {
  Package, Sprout, Droplet, Wrench, Cog, Apple, ShieldCheck, Star, Minus, Plus,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../lib/utils';
import { cop } from '../../lib/formato';

/** Ícono de cada categoría del catálogo. */
export const iconoCategoria: Record<string, LucideIcon> = {
  Todas: Package,
  Fertilizantes: Sprout,
  Agroquímicos: Droplet,
  Herramientas: Wrench,
  Maquinaria: Cog,
  Insumos: Apple,
  Equipos: ShieldCheck,
};

/** Tono suave de cada categoría, con los tokens del sistema. */
const tonoCategoria: Record<string, string> = {
  Fertilizantes: 'bg-primary-soft text-primary',
  Agroquímicos: 'bg-info-soft text-info',
  Herramientas: 'bg-warning-soft text-warning',
  Maquinaria: 'bg-muted text-muted-foreground',
  Insumos: 'bg-success-soft text-success',
  Equipos: 'bg-accent/25 text-primary',
};

interface ProductoFotoProps {
  categoria?: string;
  /** URL ya absoluta de la foto. Sin ella se pinta el recuadro de la categoría. */
  src?: string | null;
  alt?: string;
  className?: string;
  /** Tamaño del ícono cuando no hay foto. */
  iconClassName?: string;
  /** `cover` recorta para llenar el recuadro; `contain` muestra la foto entera. */
  ajuste?: 'cover' | 'contain';
}

/**
 * Foto del producto. Si el backend no manda imagen, queda un recuadro con el
 * tono de la categoría y su ícono centrado.
 */
export function ProductoFoto({ categoria, src, alt, className, iconClassName, ajuste = 'cover' }: ProductoFotoProps) {
  const Icon = (categoria && iconoCategoria[categoria]) || Package;
  const tono = (categoria && tonoCategoria[categoria]) || 'bg-muted text-muted-foreground';
  // Una foto que el backend ya no tiene deja un hueco gris: se cae al recuadro.
  const [rota, setRota] = useState(false);

  if (src && !rota) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        onError={() => setRota(true)}
        className={cn('rounded-lg bg-muted', ajuste === 'contain' ? 'object-contain' : 'object-cover', className)}
      />
    );
  }

  return (
    <div className={cn('flex items-center justify-center rounded-lg', tono, className)}>
      <Icon className={cn('h-6 w-6', iconClassName)} strokeWidth={1.75} aria-hidden />
    </div>
  );
}

/** Calificación compacta: una estrella y el número. */
export function Calificacion({ valor, detalle, className }: { valor: number; detalle?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
      <Star className="h-3.5 w-3.5 fill-warning text-warning" strokeWidth={2} aria-hidden />
      <span className="font-semibold text-foreground">{valor.toLocaleString('es-CO')}</span>
      {detalle && <span>{detalle}</span>}
    </span>
  );
}

interface CantidadInputProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}

/** Selector de cantidad con botones menos y más. */
export function CantidadInput({ value, onChange, min = 1, max, disabled, className, size = 'default' }: CantidadInputProps) {
  const clamp = (n: number) => Math.max(min, max !== undefined ? Math.min(max, n) : n);
  const btn = size === 'sm' ? 'size-8' : 'size-9';
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={btn}
        aria-label="Restar uno"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
      >
        <Minus strokeWidth={2} />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        aria-label="Cantidad"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={e => onChange(clamp(parseInt(e.target.value) || min))}
        className={cn('w-16 text-center tabular-nums', size === 'sm' && 'h-8')}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={btn}
        aria-label="Sumar uno"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || (max !== undefined && value >= max)}
      >
        <Plus strokeWidth={2} />
      </Button>
    </div>
  );
}

interface ProductoCardProps {
  /** Abre el detalle del producto. */
  onAbrir: () => void;
  nombre: string;
  categoria?: string;
  imagen?: string | null;
  precio: number;
  unidad: string;
  /** Marca "Stock bajo" sobre la foto. */
  stockBajo?: boolean;
  rating?: number;
  /** Línea secundaria en gris; normalmente el proveedor. */
  subtitulo?: string;
  /** Acción a la derecha del precio, por ejemplo el botón de agregar. */
  accion?: ReactNode;
  /** Marca extra sobre la foto, a la izquierda. */
  marca?: ReactNode;
  /** `id` del elemento, para volver al mismo producto desde el detalle. */
  id?: string;
}

/** Tarjeta sobria de producto para el catálogo. */
export function ProductoCard({
  onAbrir, nombre, categoria, imagen, precio, unidad, stockBajo, rating, subtitulo, accion, marca, id,
}: ProductoCardProps) {
  return (
    <Card id={id} className="gap-0 overflow-hidden scroll-mt-24">
      <button type="button" onClick={onAbrir} className="relative block p-3 pb-0 text-left" aria-label={`Ver ${nombre}`}>
        <ProductoFoto categoria={categoria} src={imagen} alt={nombre} className="aspect-[4/3] w-full" />
        {stockBajo && <Badge variant="warning" className="absolute right-5 top-5">Stock bajo</Badge>}
        {marca && <span className="absolute left-5 top-5">{marca}</span>}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="min-w-0 space-y-0.5">
          <button
            type="button"
            onClick={onAbrir}
            className="line-clamp-2 w-full text-left text-sm font-semibold text-foreground hover:text-primary"
          >
            {nombre}
          </button>
          {subtitulo && <p className="line-clamp-2 text-xs text-muted-foreground">{subtitulo}</p>}
        </div>
        {rating !== undefined && rating > 0 && <Calificacion valor={rating} />}
        <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between [&>button]:w-full sm:[&>button]:w-auto">
          <div className="min-w-0">
            <p className="font-heading text-lg font-bold leading-tight tabular-nums text-foreground">{cop(precio)}</p>
            <p className="truncate text-xs text-muted-foreground">por {unidad}</p>
          </div>
          {accion}
        </div>
      </div>
    </Card>
  );
}

type VarianteBadge = 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' | 'outline';

/** Rótulo y color de cada estado de pedido. Las claves son las del backend. */
export const estadoPedidoConfig: Record<string, { label: string; variant: VarianteBadge }> = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  confirmado: { label: 'Confirmado', variant: 'default' },
  preparando: { label: 'En preparación', variant: 'default' },
  en_transito: { label: 'En camino', variant: 'info' },
  entregado: { label: 'Entregado', variant: 'success' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

export function EstadoPedidoBadge({ estado, className }: { estado: string; className?: string }) {
  const c = estadoPedidoConfig[estado] ?? { label: estado, variant: 'secondary' as const };
  return <Badge variant={c.variant} className={className}>{c.label}</Badge>;
}

/** Fila de un resumen de compra: etiqueta a la izquierda, valor a la derecha. */
export function ResumenLinea({ label, value, total, className }: { label: ReactNode; value: ReactNode; total?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', total ? 'pt-3' : 'text-sm', className)}>
      <span className={total ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{label}</span>
      <span className={cn('tabular-nums', total ? 'text-2xl font-bold text-foreground' : 'font-medium text-foreground')}>{value}</span>
    </div>
  );
}
