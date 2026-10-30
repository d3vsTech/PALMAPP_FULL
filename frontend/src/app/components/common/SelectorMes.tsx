/**
 * Selectores de mes y de año para los filtros de período.
 *
 * Los usan Operaciones y Viajes. Antes cada pantalla llevaba un
 * `input[type=month]`: dentro del ancho del filtro, "octubre de 2026" tapaba el
 * icono del calendario y no quedaba forma de cambiar el mes.
 */
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** El año actual y los cinco anteriores, más el que esté elegido. */
export function aniosDisponibles(elegido: number): number[] {
  const actual = new Date().getFullYear();
  const lista = Array.from({ length: 6 }, (_, i) => actual - i);
  return lista.includes(elegido) ? lista : [elegido, ...lista].sort((a, b) => b - a);
}

export function SelectorAnio({ valor, onChange }: { valor: number; onChange: (anio: number) => void }) {
  return (
    <Select value={String(valor)} onValueChange={(a) => onChange(Number(a))}>
      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
      <SelectContent>
        {aniosDisponibles(valor).map((a) => (
          <SelectItem key={a} value={String(a)}>{a}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Mes y año como dos listas. `valor` y `onChange` hablan en `YYYY-MM`. */
export function SelectorMes({ valor, onChange }: { valor: string; onChange: (mes: string) => void }) {
  const [anio, mes] = valor.split('-');
  return (
    <>
      <Select value={mes} onValueChange={(m) => onChange(`${anio}-${m}`)}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MESES.map((nombre, i) => (
            <SelectItem key={nombre} value={String(i + 1).padStart(2, '0')}>{nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SelectorAnio valor={Number(anio)} onChange={(a) => onChange(`${a}-${mes}`)} />
    </>
  );
}

/** El mes en curso en formato `YYYY-MM`. */
export function mesDeHoy(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

/** Último día del mes `YYYY-MM`, como fecha completa. El día 0 del mes
 *  siguiente es el último del actual, así que febrero y los bisiestos salen
 *  solos sin tabla de días. */
export function finDeMes(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number);
  const dia = new Date(anio, numero, 0).getDate();
  return `${mes}-${String(dia).padStart(2, '0')}`;
}
