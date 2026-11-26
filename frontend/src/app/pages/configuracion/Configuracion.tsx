import { useEffect, useState } from 'react';
import {
  Building2,
  Palmtree,
  Hammer,
  Users,
  Truck,
  DollarSign,
  ChevronDown,
  Handshake,
  Scale,
} from 'lucide-react';
import { cn } from '../../components/lib/utils';
import PageHeader from '../../components/common/PageHeader';

// Tabs existentes en V.2 + portados de V.11
import { DatosEmpresaTab } from '../../components/configuracion/DatosEmpresaTab';
import { ConstantesLegalesTab } from '../../components/configuracion/ConstantesLegalesTab';
import { SemillasTab } from '../../components/configuracion/SemillasTab';
import { LaboresTab } from '../../components/configuracion/LaboresTab';
import { InsumosTab } from '../../components/configuracion/InsumosTab';
import { SeguridadSocialTab } from '../../components/configuracion/SeguridadSocialTab';
import { ExtractorasTab } from '../../components/configuracion/ExtractorasTab';
import { TransporteTab } from '../../components/configuracion/TransporteTab';
import { RangosNumeracionTab } from '../../components/configuracion/RangosNumeracionTab';
import { ConceptosNominaTab } from '../../components/configuracion/ConceptosNominaTab';
import { HorasExtrasTab } from '../../components/configuracion/HorasExtrasTab';
import { AusenciasTab } from '../../components/configuracion/AusenciasTab';
import { PromediosTab } from '../../components/configuracion/PromediosTab';
// Tabs nuevos portados desde V.11
import { EntidadesBancariasTab } from '../../components/configuracion/EntidadesBancariasTab';
import { ParametrosNominaTab } from '../../components/configuracion/ParametrosNominaTab';
import { PreciosLaboresTab } from '../../components/configuracion/PreciosLaboresTab';
// Tab nuevo portado desde V.15 (sin backend todavía).
import { TercerosTab } from '../../components/configuracion/TercerosTab';
// §14.1 — Calendario de festivos. La pantalla completa vive en
// `pages/configuracion/CalendarioFestivos.tsx` y también se enruta
// como `/configuracion/festivos`. Aquí se embebe como tab sin el
// botón "Volver" (`standalone={false}`).
import CalendarioFestivos from './CalendarioFestivos';
const CalendarioFestivosTab = () => <CalendarioFestivos standalone={false} />;

type SubItem = {
  id: string;
  nombre: string;
  component: React.ComponentType;
};

type Categoria = {
  id: string;
  nombre: string;
  icono: React.ElementType;
  items?: SubItem[];
  component?: React.ComponentType;
};

/**
 * Las categorías y sus rótulos salen del diseño. Dos entradas son nuestras y
 * no existen allá: "Rangos de numeración" y "Calendario de festivos".
 */
const CATEGORIAS: Categoria[] = [
  {
    id: 'info-empresa',
    nombre: 'Información de la empresa',
    icono: Building2,
    component: DatosEmpresaTab,
  },
  {
    id: 'legal',
    nombre: 'Legal',
    icono: Scale,
    items: [
      { id: 'parametros-legales', nombre: 'Parámetros legales', component: ConstantesLegalesTab },
    ],
  },
  {
    id: 'mi-plantacion',
    nombre: 'Mi plantación',
    icono: Palmtree,
    items: [
      { id: 'semillas',  nombre: 'Semillas',  component: SemillasTab },
      { id: 'promedios', nombre: 'Promedios', component: PromediosTab },
    ],
  },
  {
    id: 'operaciones',
    nombre: 'Operaciones',
    icono: Hammer,
    items: [
      { id: 'labores', nombre: 'Trabajos y labores', component: LaboresTab },
      { id: 'insumos', nombre: 'Insumos',            component: InsumosTab },
    ],
  },
  {
    id: 'colaboradores',
    nombre: 'Colaboradores',
    icono: Users,
    items: [
      { id: 'entidades-prestadoras', nombre: 'Seguridad social',     component: SeguridadSocialTab },
      { id: 'entidades-bancarias',   nombre: 'Entidades bancarias',  component: EntidadesBancariasTab },
    ],
  },
  {
    id: 'viajes',
    nombre: 'Viajes',
    icono: Truck,
    items: [
      { id: 'extractoras',        nombre: 'Extractoras',          component: ExtractorasTab },
      { id: 'transporte',         nombre: 'Transportadores',      component: TransporteTab },
      { id: 'rangos-numeracion',  nombre: 'Rangos de numeración', component: RangosNumeracionTab },
    ],
  },
  {
    id: 'terceros',
    nombre: 'Terceros',
    icono: Handshake,
    component: TercerosTab,
  },
  {
    id: 'nomina-liquidaciones',
    nombre: 'Pagos y liquidaciones',
    icono: DollarSign,
    items: [
      { id: 'parametros-nomina', nombre: 'Parámetros de nómina',   component: ParametrosNominaTab },
      { id: 'conceptos',         nombre: 'Conceptos de nómina',    component: ConceptosNominaTab },
      { id: 'precios-labores',   nombre: 'Precios de labores',     component: PreciosLaboresTab },
      { id: 'horas-extra',       nombre: 'Horas extra',            component: HorasExtrasTab },
      { id: 'novedades',         nombre: 'Novedades',              component: AusenciasTab },
      { id: 'festivos',          nombre: 'Calendario de festivos', component: CalendarioFestivosTab },
    ],
  },
];

/** Clave para recordar el último tab abierto entre navegaciones. */
const LS_KEY_ULTIMO_TAB = 'palmapp_configuracion_ultimo_tab';

/** Lee el tab guardado y resuelve qué categoría debe abrirse expandida. */
function leerEstadoInicial(): { item: string; categoria: string } {
  let item = 'info-empresa';
  try {
    const saved = sessionStorage.getItem(LS_KEY_ULTIMO_TAB);
    if (saved) item = saved;
  } catch { /* ignorar */ }

  for (const cat of CATEGORIAS) {
    if (cat.id === item) return { item, categoria: cat.id };
    if (cat.items?.some((s) => s.id === item)) return { item, categoria: cat.id };
  }
  return { item: 'info-empresa', categoria: 'info-empresa' };
}

export default function Configuracion() {
  const inicial = leerEstadoInicial();
  const [categoriaExpandida, setCategoriaExpandida] = useState<string[]>([inicial.categoria]);
  const [itemSeleccionado, setItemSeleccionado] = useState<string>(inicial.item);

  // Persiste el tab activo para que al volver desde una pantalla hija
  // (ej: /configuracion/conceptos/nuevo) se restaure en el mismo lugar.
  useEffect(() => {
    try { sessionStorage.setItem(LS_KEY_ULTIMO_TAB, itemSeleccionado); } catch { /* ignorar */ }
  }, [itemSeleccionado]);

  const toggleCategoria = (categoriaId: string) => {
    if (categoriaExpandida.includes(categoriaId)) {
      setCategoriaExpandida(categoriaExpandida.filter((id) => id !== categoriaId));
      return;
    }
    setCategoriaExpandida([...categoriaExpandida, categoriaId]);
  };

  const seleccionarItem = (categoriaId: string, itemId?: string) => {
    const categoria = CATEGORIAS.find((c) => c.id === categoriaId);

    if (!categoria?.items) {
      setItemSeleccionado(categoriaId);
      return;
    }
    if (!categoriaExpandida.includes(categoriaId)) {
      setCategoriaExpandida([...categoriaExpandida, categoriaId]);
    }
    setItemSeleccionado(itemId ?? categoria.items[0].id);
  };

  // Lista plana para el selector móvil y para ubicar la sección actual.
  const opciones = CATEGORIAS.flatMap((cat) =>
    cat.items
      ? cat.items.map((item) => ({
          id: item.id,
          categoriaId: cat.id,
          nombre: item.nombre,
          component: item.component,
        }))
      : [{
          id: cat.id,
          categoriaId: cat.id,
          nombre: cat.nombre,
          component: cat.component!,
        }],
  );

  const actual = opciones.find((o) => o.id === itemSeleccionado);
  const ComponenteActual = actual?.component ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Parámetros de la empresa, la plantación y la nómina."
      />

      {/* Móvil y tablet: selector de sección */}
      <div className="lg:hidden">
        <label htmlFor="config-seccion" className="text-[13px] font-medium text-muted-foreground">
          Sección
        </label>
        <div className="relative mt-1.5">
          <select
            id="config-seccion"
            value={itemSeleccionado}
            onChange={(e) => {
              const o = opciones.find((x) => x.id === e.target.value);
              if (o) seleccionarItem(o.categoriaId, o.categoriaId === o.id ? undefined : o.id);
            }}
            className="h-10 w-full appearance-none rounded-lg border border-border bg-card pl-3 pr-9 text-sm font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {CATEGORIAS.map((cat) =>
              cat.items ? (
                <optgroup key={cat.id} label={cat.nombre}>
                  {cat.items.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </optgroup>
              ) : (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ),
            )}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Escritorio: navegación lateral */}
        <nav aria-label="Secciones de configuración" className="hidden lg:block">
          <ul className="sticky top-4 space-y-0.5">
            {CATEGORIAS.map((categoria) => {
              const Icon = categoria.icono;
              const tieneSubitems = !!categoria.items?.length;
              const estaExpandida = categoriaExpandida.includes(categoria.id);
              const estaSeleccionada = itemSeleccionado === categoria.id;
              const contieneActual = categoria.items?.some((i) => i.id === itemSeleccionado);

              return (
                <li key={categoria.id}>
                  <button
                    type="button"
                    onClick={() =>
                      tieneSubitems ? toggleCategoria(categoria.id) : seleccionarItem(categoria.id)
                    }
                    aria-expanded={tieneSubitems ? estaExpandida : undefined}
                    aria-current={estaSeleccionada ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                      estaSeleccionada
                        ? 'bg-primary-soft text-primary'
                        : contieneActual
                          ? 'text-foreground hover:bg-muted'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span className="flex-1 break-words">{categoria.nombre}</span>
                    {tieneSubitems && (
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                          !estaExpandida && '-rotate-90',
                        )}
                        strokeWidth={2}
                      />
                    )}
                  </button>

                  {tieneSubitems && estaExpandida && (
                    <ul className="mb-1 ml-5 mt-0.5 space-y-0.5 border-l border-border pl-2.5">
                      {categoria.items!.map((subitem) => {
                        const activo = itemSeleccionado === subitem.id;
                        return (
                          <li key={subitem.id}>
                            <button
                              type="button"
                              onClick={() => seleccionarItem(categoria.id, subitem.id)}
                              aria-current={activo ? 'page' : undefined}
                              className={cn(
                                'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                                activo
                                  ? 'bg-primary-soft font-medium text-primary'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                              )}
                            >
                              {subitem.nombre}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Contenido */}
        <section className="min-w-0" aria-label={actual?.nombre}>
          {ComponenteActual ? <ComponenteActual /> : null}
        </section>
      </div>
    </div>
  );
}
