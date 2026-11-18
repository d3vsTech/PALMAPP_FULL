/**
 * Buscador rápido de la barra superior (⌘K o Ctrl+K).
 *
 * Salta a un módulo, dispara una acción frecuente o abre la ficha de un
 * colaborador. Los módulos y las acciones se filtran aquí mismo; los
 * colaboradores los busca el backend con `q`, que parte el texto por palabras
 * y las exige todas. Por eso el diálogo va con `shouldFilter={false}`: lo que
 * llega del API ya viene filtrado y cmdk no debe volver a descartarlo.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CalendarPlus, ClipboardPlus, HandCoins, MapPin, Truck, UserPlus, Wallet } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../ui/command';
import { useAuth, esAdmin } from '../../contexts/AuthContext';
import { colaboradoresApi, type ColaboradorSelectItem } from '../../../api/colaboradores';
import Avatar from '../common/Avatar';
import { navItems, TITULOS_SECCION } from './Sidebar';
import { EVT_ABRIR_BUSCADOR, useEventoShell } from './shellState';

/** Acciones frecuentes. La ruta y el permiso son los mismos de `routes.tsx`. */
const ACCIONES = [
  { label: 'Nueva planilla del día', href: '/operaciones/planilla/nueva', icon: ClipboardPlus, permiso: 'operaciones.ver' },
  { label: 'Nuevo viaje', href: '/viajes/nuevo', icon: Truck, permiso: 'viajes.ver' },
  { label: 'Nuevo colaborador', href: '/colaboradores/nuevo', icon: UserPlus, permiso: 'colaboradores.ver' },
  { label: 'Nuevo período de pago', href: '/nomina/nueva', icon: Wallet, permiso: 'nomina.ver' },
  { label: 'Nueva novedad', href: '/novedades/nueva', icon: CalendarPlus, permiso: 'novedades.ver' },
  { label: 'Nuevo préstamo', href: '/nomina/nuevo-prestamo', icon: HandCoins, permiso: 'nomina.ver' },
  { label: 'Nuevo predio', href: '/plantacion/predio/nuevo', icon: MapPin, permiso: 'lotes.ver' },
];

/** Sin esto "placido" no encuentra a "Plácido" y la búsqueda parece rota. */
const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Todas las palabras del texto escrito tienen que aparecer, en cualquier orden. */
function coincide(consulta: string, ...campos: string[]): boolean {
  const heno = normalizar(campos.join(' '));
  return normalizar(consulta).split(/\s+/).filter(Boolean).every((palabra) => heno.includes(palabra));
}

/** A partir de dos letras vale la pena molestar al backend. */
const MINIMO_BUSQUEDA = 2;
const MAX_COLABORADORES = 8;

export default function CommandPalette() {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [personas, setPersonas] = useState<ColaboradorSelectItem[]>([]);
  const navigate = useNavigate();
  const { user, hasPermiso } = useAuth();

  const abrir = useCallback(() => setAbierto(true), []);
  useEventoShell(EVT_ABRIR_BUSCADOR, abrir);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAbierto((previo) => !previo);
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  const puede = useCallback(
    (permiso?: string) => (esAdmin(user) ? true : !permiso || hasPermiso(permiso)),
    [user, hasPermiso],
  );

  const verColaboradores = puede('colaboradores.ver');

  // El backend busca, no la pantalla. Se espera a que el usuario deje de
  // escribir para no mandar una petición por tecla.
  useEffect(() => {
    const texto = consulta.trim();
    if (!abierto || !verColaboradores || texto.length < MINIMO_BUSQUEDA) {
      setPersonas([]);
      return;
    }
    let vivo = true;
    const temporizador = window.setTimeout(() => {
      colaboradoresApi
        .selectListado({ q: texto })
        .then((res) => {
          if (vivo) setPersonas((res.data ?? []).slice(0, MAX_COLABORADORES));
        })
        .catch(() => {
          // Sin resultados del API el buscador sigue sirviendo para los módulos.
          if (vivo) setPersonas([]);
        });
    }, 250);
    return () => {
      vivo = false;
      window.clearTimeout(temporizador);
    };
  }, [consulta, abierto, verColaboradores]);

  const modulos = useMemo(
    () =>
      navItems
        .filter((item) => puede(item.permiso))
        .filter((item) => !consulta || coincide(consulta, item.label, TITULOS_SECCION[item.seccion])),
    [consulta, puede],
  );

  const acciones = useMemo(
    () =>
      ACCIONES
        .filter((a) => puede(a.permiso))
        .filter((a) => !consulta || coincide(consulta, a.label)),
    [consulta, puede],
  );

  const ir = (href: string) => {
    setAbierto(false);
    navigate(href);
  };

  const cambiarAbierto = (valor: boolean) => {
    setAbierto(valor);
    if (!valor) setConsulta('');
  };

  const sinNada = modulos.length === 0 && acciones.length === 0 && personas.length === 0;

  return (
    <CommandDialog
      open={abierto}
      onOpenChange={cambiarAbierto}
      shouldFilter={false}
      title="Buscador rápido"
      description="Busca módulos, acciones y colaboradores"
    >
      <CommandInput
        value={consulta}
        onValueChange={setConsulta}
        placeholder="Busca un módulo, un colaborador o una acción"
      />
      <CommandList className="max-h-[420px]">
        {sinNada && <CommandEmpty>Sin resultados.</CommandEmpty>}

        {modulos.length > 0 && (
          <CommandGroup heading="Ir a">
            {modulos.map((m) => {
              const Icon = m.icon;
              return (
                <CommandItem key={m.href} value={m.href} onSelect={() => ir(m.href)}>
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  {m.label}
                  <CommandShortcut>{TITULOS_SECCION[m.seccion]}</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {acciones.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Acciones">
              {acciones.map((a) => {
                const Icon = a.icon;
                return (
                  <CommandItem key={a.href} value={a.href} onSelect={() => ir(a.href)}>
                    <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                    {a.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {personas.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Colaboradores">
              {personas.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`colaborador-${c.id}`}
                  onSelect={() => ir(`/colaboradores/${c.id}`)}
                >
                  <Avatar nombre={c.nombre_completo} size="sm" />
                  {c.nombre_completo}
                  <CommandShortcut>CC {c.documento}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
