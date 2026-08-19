/**
 * SelectActividadLabor
 *
 * Select para el campo "Trabajo realizado" de las tabs SANIDAD y OTROS del
 * wizard de operaciones. Reemplaza el Input libre por un dropdown poblado
 * desde el catálogo `/labores/{labor}/actividades` (§19 API_PARAMETRICAS).
 *
 * Diseño estandarizado con la tab "Labores de Finca":
 *  - Select con las actividades del catálogo + opción "Otra" al final.
 *  - Cuando el usuario elige "Otra", se muestra debajo un input para escribir
 *    el nombre de la nueva actividad.
 *  - El wizard resuelve el nombre nuevo al guardar el jornal: llama a
 *    `POST /labores/{labor}/actividades/wizard` antes de persistir. Ese
 *    endpoint acepta `operaciones.crear|editar`, sin `configuracion.editar`.
 */
import { useEffect, useState } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface Actividad {
  id: number;
  labor_id: number;
  nombre: string;
}

interface Props {
  /** ID de la labor a la que pertenecen las actividades. */
  laborId: number | undefined;
  /** Lista actual de actividades disponibles para esta labor. */
  actividades: Actividad[];
  /** Nombre visible actual. Para actividades del catálogo, coincide con el nombre. */
  value: string;
  /** ID actual (null si el usuario está escribiendo una nueva). */
  actividadId: number | null;
  /**
   * Callback con el nombre y el id. `id = null` significa "actividad libre"
   * — se resolverá al backend al guardar el jornal.
   */
  onChange: (nombre: string, id: number | null) => void;
  disabled?: boolean;
}

/** Valor sentinel para la opción "Otra" del select. */
const OTRA = '__otra__';

export function SelectActividadLabor({
  laborId,
  actividades,
  value,
  actividadId,
  onChange,
  disabled,
}: Props) {
  // Estado local: "está mostrándose el input de otra actividad".
  // Se activa al elegir "Otra" y se mantiene aunque el usuario borre el texto,
  // hasta que elija otra opción del dropdown o se recargue el formulario.
  const [modoOtra, setModoOtra] = useState(actividadId == null && value !== '');

  // Si el padre cambia (ej. edición de una tarjeta existente con id resuelto),
  // salimos del modo Otra automáticamente.
  useEffect(() => {
    if (actividadId != null) setModoOtra(false);
  }, [actividadId]);

  const selectValue: string | undefined = actividadId != null
    ? value
    : modoOtra
      ? OTRA
      : undefined;

  return (
    <>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === OTRA) {
            setModoOtra(true);
            onChange('', null);
          } else {
            setModoOtra(false);
            const match = actividades.find((a) => a.nombre === v);
            onChange(v, match?.id ?? null);
          }
        }}
        disabled={disabled || !laborId}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecciona el trabajo realizado" />
        </SelectTrigger>
        <SelectContent>
          {actividades.length === 0 ? (
            <SelectItem value="__sin_actividades__" disabled>
              No hay actividades registradas
            </SelectItem>
          ) : (
            actividades.map((a) => (
              <SelectItem key={a.id} value={a.nombre}>{a.nombre}</SelectItem>
            ))
          )}
          <SelectItem value={OTRA}>Otra</SelectItem>
        </SelectContent>
      </Select>

      {modoOtra && (
        <div className="space-y-2 mt-3">
          <Label>Especificar otro trabajo</Label>
          <Input
            autoFocus
            placeholder="Ingrese el tipo de trabajo"
            value={value}
            maxLength={150}
            onChange={(e) => onChange(e.target.value, null)}
          />
        </div>
      )}
    </>
  );
}
