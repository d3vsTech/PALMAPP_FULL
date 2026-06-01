import { useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { cn } from '../lib/utils';

// ─── Día + Mes (sin año) ─────────────────────────────────────────────────────
// Usado por ConstantesLegales para fechas como "14 de febrero".

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

/** Parsea "14 de febrero" → Date con el año actual. Devuelve null si no matchea. */
function parseFechaDiaMes(texto: string | null | undefined): Date | null {
  if (!texto) return null;
  const m = texto.trim().toLowerCase().match(/^(\d{1,2})\s+de\s+([a-záéíóú]+)$/);
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mesIdx = MESES_ES.indexOf(m[2] as typeof MESES_ES[number]);
  if (mesIdx < 0 || dia < 1 || dia > 31) return null;
  return new Date(new Date().getFullYear(), mesIdx, dia);
}

/** Formatea Date → "14 de febrero" en español. */
function formatFechaDiaMes(d: Date): string {
  return format(d, "d 'de' MMMM", { locale: es });
}

interface FechaDiaMesPickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Picker de "día + mes" — formato persistido: "14 de febrero".
 * Ignora el año porque las fechas legales colombianas son recurrentes anuales.
 */
export function FechaDiaMesPicker({
  id,
  value,
  onChange,
  placeholder = 'Selecciona una fecha',
}: FechaDiaMesPickerProps) {
  const [open, setOpen] = useState(false);
  const fecha = parseFechaDiaMes(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full h-10 justify-start text-left font-normal bg-background',
            !fecha && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
          {fecha ? formatFechaDiaMes(fecha) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={fecha ?? undefined}
          defaultMonth={fecha ?? undefined}
          onSelect={(d) => {
            if (d) onChange(formatFechaDiaMes(d));
            setOpen(false);
          }}
          locale={es}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── Día/Mes/Año (dd/mm/yyyy) ────────────────────────────────────────────────
// Usado por Tablas Legales para vigencias (vigente_desde / vigente_hasta).

/** Parsea "31/12/2025" → Date. Devuelve null si no matchea. */
function parseFechaDDMMYYYY(texto: string | null | undefined): Date | null {
  if (!texto) return null;
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = parse(texto, 'd/M/yyyy', new Date());
  return isValid(d) ? d : null;
}

/** Formatea Date → "31/12/2025". */
function formatFechaDDMMYYYY(d: Date): string {
  return format(d, 'dd/MM/yyyy');
}

interface FechaDDMMYYYYPickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Picker de fecha completa — formato persistido: "31/12/2025".
 * Coincide con el formato que pide el API (`dd/mm/yyyy`) en tablas-legales.
 */
export function FechaDDMMYYYYPicker({
  id,
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
}: FechaDDMMYYYYPickerProps) {
  const [open, setOpen] = useState(false);
  const fecha = parseFechaDDMMYYYY(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full h-10 justify-start text-left font-normal bg-background',
            !fecha && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
          {fecha ? formatFechaDDMMYYYY(fecha) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={fecha ?? undefined}
          defaultMonth={fecha ?? undefined}
          onSelect={(d) => {
            if (d) onChange(formatFechaDDMMYYYY(d));
            setOpen(false);
          }}
          locale={es}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
