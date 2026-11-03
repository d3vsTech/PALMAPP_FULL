import { cn } from '../lib/utils';

// Tonos suaves fijos; cada nombre cae siempre en el mismo.
const TONOS = [
  'bg-[#E3F0DC] text-[#2F6A2A] dark:bg-[#22361F] dark:text-[#A9D69B]',
  'bg-[#E3ECF7] text-[#2B5A94] dark:bg-[#1C2A3D] dark:text-[#9EC0EA]',
  'bg-[#F7EBDA] text-[#8A5A16] dark:bg-[#352818] dark:text-[#E5B977]',
  'bg-[#EEE5F5] text-[#6A3E8E] dark:bg-[#2B2036] dark:text-[#C7A6E3]',
  'bg-[#F8E3E1] text-[#9B3A2E] dark:bg-[#3A201D] dark:text-[#EBA59B]',
  'bg-[#DFF1EE] text-[#1F6B60] dark:bg-[#18302C] dark:text-[#8FD3C6]',
  'bg-[#F1F0D7] text-[#5F6517] dark:bg-[#2E2F18] dark:text-[#D2D68A]',
];

export function iniciales(nombre: string | undefined | null) {
  return (nombre ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p.charAt(0).toUpperCase())
    .join('') || '?';
}

export function tonoAvatar(nombre: string | undefined | null) {
  const s = (nombre ?? '').toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TONOS[h % TONOS.length];
}

interface AvatarProps {
  nombre: string | undefined | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-12 w-12 text-base',
};

/** Avatar de iniciales con un color suave propio de cada persona. */
export default function Avatar({ nombre, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold',
        SIZES[size],
        tonoAvatar(nombre),
        className
      )}
    >
      {iniciales(nombre)}
    </span>
  );
}
