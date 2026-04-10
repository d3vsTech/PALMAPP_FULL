import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export type DateRange = {
  from: Date;
  to: Date;
};

export type DateFilterPreset = 'today' | 'week' | 'fortnight' | 'month' | 'custom';

interface DateFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  preset: DateFilterPreset;
  onPresetChange: (preset: DateFilterPreset) => void;
}

export function DateFilter({ dateRange, onDateRangeChange, preset, onPresetChange }: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (newPreset: DateFilterPreset) => {
    const today = new Date();
    let from: Date;
    let to: Date = today;

    switch (newPreset) {
      case 'today':
        from = today;
        break;
      case 'week':
        from = subDays(today, 7);
        break;
      case 'fortnight':
        from = subDays(today, 15);
        break;
      case 'month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'custom':
        // Mantener el rango actual para personalizado
        return;
      default:
        from = subDays(today, 15);
    }

    onDateRangeChange({ from, to });
    onPresetChange(newPreset);
  };

  const presetButtons: { value: DateFilterPreset; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Semana' },
    { value: 'fortnight', label: 'Quincena' },
    { value: 'month', label: 'Mes' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Botones de preset */}
      {presetButtons.map((button) => (
        <Button
          key={button.value}
          variant={preset === button.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePresetChange(button.value)}
          className="h-9"
        >
          {button.label}
        </Button>
      ))}

      {/* Selector de rango personalizado */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={preset === 'custom' ? 'default' : 'outline'}
            size="sm"
            className="h-9 gap-2"
          >
            <Calendar className="h-4 w-4" />
            {preset === 'custom' ? (
              <span>
                {format(dateRange.from, 'dd/MM/yy', { locale: es })} - {format(dateRange.to, 'dd/MM/yy', { locale: es })}
              </span>
            ) : (
              <span>Personalizado</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
                onPresetChange('custom');
                setIsOpen(false);
              } else if (range?.from) {
                // Permitir selección parcial
                onDateRangeChange({ from: range.from, to: range.from });
              }
            }}
            numberOfMonths={2}
            locale={es}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}