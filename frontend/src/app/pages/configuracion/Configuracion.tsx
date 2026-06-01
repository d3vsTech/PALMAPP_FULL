import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import {
  Building2,
  Sprout,
  Hammer,
  Users,
  Truck,
  DollarSign,
  ChevronRight,
  ChevronDown,
  Scale,
} from 'lucide-react';
import { cn } from '../../components/lib/utils';

// Tabs existentes en V.2 + portados de V.11
import { DatosEmpresaTab } from '../../components/configuracion/DatosEmpresaTab';
import { ConstantesLegalesTab } from '../../components/configuracion/ConstantesLegalesTab';
import { TablasLegalesTab } from '../../components/configuracion/TablasLegalesTab';
import { SemillasTab } from '../../components/configuracion/SemillasTab';
import { LaboresTab } from '../../components/configuracion/LaboresTab';
import { InsumosTab } from '../../components/configuracion/InsumosTab';
import { SeguridadSocialTab } from '../../components/configuracion/SeguridadSocialTab';
import { ExtractorasTab } from '../../components/configuracion/ExtractorasTab';
import { TransporteTab } from '../../components/configuracion/TransporteTab';
import { ConceptosNominaTab } from '../../components/configuracion/ConceptosNominaTab';
import { HorasExtrasTab } from '../../components/configuracion/HorasExtrasTab';
import { AusenciasTab } from '../../components/configuracion/AusenciasTab';
import { PromediosTab } from '../../components/configuracion/PromediosTab';
// Tabs nuevos portados desde V.11
import { EntidadesBancariasTab } from '../../components/configuracion/EntidadesBancariasTab';
import { ParametrosNominaTab } from '../../components/configuracion/ParametrosNominaTab';
import { PreciosLaboresTab } from '../../components/configuracion/PreciosLaboresTab';

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
 * Estructura de categorías idéntica al diseño de V.11 (sidebar colapsable).
 * El usuario solicitó replicarlo "tal cual" preservando las conexiones de API
 * que ya viven dentro de cada Tab.
 */
const CATEGORIAS: Categoria[] = [
  {
    id: 'info-empresa',
    nombre: 'Info Empresa',
    icono: Building2,
    component: DatosEmpresaTab,
  },
  {
    id: 'legal',
    nombre: 'Legal',
    icono: Scale,
    items: [
      { id: 'parametros-legales', nombre: 'Parámetros Legales', component: ConstantesLegalesTab },
      { id: 'tablas-legales',     nombre: 'Aportes',            component: TablasLegalesTab },
    ],
  },
  {
    id: 'mi-plantacion',
    nombre: 'Mi Plantación',
    icono: Sprout,
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
      { id: 'labores', nombre: 'Trabajos / Labores', component: LaboresTab },
      { id: 'insumos', nombre: 'Insumos',            component: InsumosTab },
    ],
  },
  {
    id: 'colaboradores',
    nombre: 'Colaboradores',
    icono: Users,
    items: [
      { id: 'entidades-prestadoras', nombre: 'Seguridad Social',     component: SeguridadSocialTab },
      { id: 'entidades-bancarias',   nombre: 'Entidades Bancarias',  component: EntidadesBancariasTab },
    ],
  },
  {
    id: 'viajes',
    nombre: 'Viajes',
    icono: Truck,
    items: [
      { id: 'extractoras', nombre: 'Extractoras',     component: ExtractorasTab },
      { id: 'transporte',  nombre: 'Transportadores', component: TransporteTab },
    ],
  },
  {
    id: 'nomina-liquidaciones',
    nombre: 'Nómina y Liquidaciones',
    icono: DollarSign,
    items: [
      { id: 'parametros-nomina', nombre: 'Parámetros de Nómina', component: ParametrosNominaTab },
      { id: 'precios-labores',   nombre: 'Precios Labores',      component: PreciosLaboresTab },
      { id: 'conceptos',         nombre: 'Aportes y Deducciones', component: ConceptosNominaTab },
      { id: 'horas-extra',       nombre: 'Horas Extra',          component: HorasExtrasTab },
      { id: 'novedades',         nombre: 'Novedades',            component: AusenciasTab },
    ],
  },
];

export default function Configuracion() {
  // La primera categoría arranca expandida y seleccionada por defecto.
  const [categoriaExpandida, setCategoriaExpandida] = useState<string[]>(['info-empresa']);
  const [itemSeleccionado, setItemSeleccionado] = useState<string>('info-empresa');

  const toggleCategoria = (categoriaId: string) => {
    if (categoriaExpandida.includes(categoriaId)) {
      setCategoriaExpandida(categoriaExpandida.filter((id) => id !== categoriaId));
    } else {
      setCategoriaExpandida([...categoriaExpandida, categoriaId]);
    }
  };

  const seleccionarItem = (categoriaId: string, itemId?: string) => {
    const categoria = CATEGORIAS.find((c) => c.id === categoriaId);

    if (categoria?.items) {
      // Si tiene subitems, expande la categoría
      if (!categoriaExpandida.includes(categoriaId)) {
        setCategoriaExpandida([...categoriaExpandida, categoriaId]);
      }
      // Selecciona el primer subitem si no se especificó uno
      if (itemId) {
        setItemSeleccionado(itemId);
      } else {
        setItemSeleccionado(categoria.items[0].id);
      }
    } else {
      // Si no tiene subitems, selecciona la categoría directamente
      setItemSeleccionado(categoriaId);
    }
  };

  /**
   * Devuelve el componente correspondiente al item actualmente seleccionado.
   * Busca primero en las categorías top-level y luego en sus subitems.
   */
  const getComponenteActual = () => {
    const categoria = CATEGORIAS.find((c) => c.id === itemSeleccionado);
    if (categoria?.component) return categoria.component;

    for (const cat of CATEGORIAS) {
      if (cat.items) {
        const subitem = cat.items.find((item) => item.id === itemSeleccionado);
        if (subitem) return subitem.component;
      }
    }
    return null;
  };

  const ComponenteActual = getComponenteActual();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1 mb-6">
        <h1>Configuración</h1>
        <p className="text-lead">Configura todos los parámetros de tu finca</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de navegación */}
        <Card className="border-border lg:col-span-1 h-fit">
          <CardContent className="p-4">
            <nav className="space-y-1">
              {CATEGORIAS.map((categoria) => {
                const Icon = categoria.icono;
                const tieneSubitems = categoria.items && categoria.items.length > 0;
                const estaExpandida = categoriaExpandida.includes(categoria.id);
                const estaSeleccionada = itemSeleccionado === categoria.id;

                return (
                  <div key={categoria.id}>
                    <button
                      onClick={() => {
                        if (tieneSubitems) {
                          toggleCategoria(categoria.id);
                        } else {
                          seleccionarItem(categoria.id);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        estaSeleccionada && !tieneSubitems
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{categoria.nombre}</span>
                      {tieneSubitems && (
                        estaExpandida ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )
                      )}
                    </button>

                    {/* Subitems */}
                    {tieneSubitems && estaExpandida && (
                      <div className="ml-7 mt-1 space-y-1 border-l-2 border-border pl-3">
                        {categoria.items!.map((subitem) => (
                          <button
                            key={subitem.id}
                            onClick={() => seleccionarItem(categoria.id, subitem.id)}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                              itemSeleccionado === subitem.id
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {subitem.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Contenido principal */}
        <div className="lg:col-span-3">
          {ComponenteActual ? <ComponenteActual /> : null}
        </div>
      </div>
    </div>
  );
}
