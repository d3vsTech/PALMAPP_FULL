import { useNavigate, useSearchParams } from 'react-router';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Button } from '../../components/ui/button';
import { Info, Upload, History } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import PageHeader from '../../components/common/PageHeader';
import { SeccionTabsList, SeccionTabsTrigger } from '../../components/liquidaciones/SeccionTabs';

// Componentes de cada pestaña
import CesantiasTab from './CesantiasTab';
import InteresesTab from './InteresesTab';
import PrimaTab from './PrimaTab';
import VacacionesTab from './VacacionesTab';
import LiquidacionFinalTab from './LiquidacionFinalTab';

/**
 * Botón "Importar" del encabezado, uno por pestaña.
 *
 * Antes cada pestaña resolvía la carga de histórico a su manera: Vacaciones la
 * tenía al pie, y Cesantías y Prima tenían pantalla y ruta pero ningún enlace
 * que llevara a ellas. Ahora el botón vive siempre en el mismo sitio y cambia
 * de destino según la pestaña abierta.
 *
 * Intereses no lleva botón: sus valores van en las mismas filas del archivo
 * de cesantías (§12), que crea los dos períodos de una vez. No existe un
 * cargue de intereses por separado, y mandar a la pantalla de cesantías desde
 * aquí solo confundía: pide el año y muestra la plantilla del otro módulo.
 *
 * Liquidación sí lo lleva desde PR-L14 (§15): un archivo por año de retiro.
 */
const IMPORTAR_POR_TAB: Record<string, { label: string; ruta: string }> = {
  cesantias:  { label: 'Importar cesantías',  ruta: '/liquidaciones/cesantias/carga-historico' },
  prima:      { label: 'Importar prima',      ruta: '/liquidaciones/prima/carga-historico' },
  vacaciones: { label: 'Importar vacaciones', ruta: '/liquidaciones/vacaciones/carga-historico' },
  // La clave es el `value` del TabsTrigger, no el nombre de la pestaña.
  'liquidacion-final': {
    label: 'Importar liquidaciones',
    ruta: '/liquidaciones/finales/carga-historico',
  },
};

/** `value` de cada TabsTrigger. Es lo que viaja en `?tab=`. */
const TABS = ['cesantias', 'intereses', 'prima', 'vacaciones', 'liquidacion-final'] as const;
const TAB_POR_DEFECTO = 'cesantias';

const ETIQUETAS: Record<typeof TABS[number], string> = {
  cesantias: 'Cesantías',
  intereses: 'Intereses',
  prima: 'Prima',
  vacaciones: 'Vacaciones',
  'liquidacion-final': 'Liquidación final',
};

const MARCO_LEGAL = [
  'Código Sustantivo del Trabajo (arts. 64, 65, 99, 186, 189, 192, 249, 306)',
  'Ley 50 de 1990 (cesantías)',
  'Ley 52 de 1975 (intereses sobre cesantías)',
  'Ley 2466 de 2025 (contratos a término fijo)',
  'Decreto 1072 de 2015',
  'Decreto 1469 de 2025 (SMMLV 2026: $1.750.905)',
  'Decreto 1470 de 2025 (auxilio de transporte 2026: $249.095)',
];

function LiquidacionesContent() {
  const navigate = useNavigate();
  /**
   * La pestaña vive en la URL, no en estado local. Así las pantallas hijas
   * pueden devolver a la pestaña de la que salieron (`?tab=vacaciones`) en
   * vez de caer siempre en Cesantías, y el botón Atrás del navegador funciona.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const tabUrl = searchParams.get('tab');
  const activeTab = TABS.includes(tabUrl as typeof TABS[number]) ? tabUrl! : TAB_POR_DEFECTO;
  const { hasPermiso } = useAuth();
  /**
   * Cargar un histórico deja períodos cerrados y liquidaciones pagadas con los
   * valores del archivo, así que el backend lo puso tras su propio permiso
   * (API_LIQUIDACIONES v1.12). Sin él, el botón no lleva a ninguna parte.
   */
  const importar = hasPermiso('liquidaciones.importar') ? IMPORTAR_POR_TAB[activeTab] : null;

  // `replace` para no llenar el historial con un paso por cada pestaña abierta.
  const cambiarTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liquidaciones"
        description="Cesantías, intereses, prima de servicios, vacaciones y liquidaciones finales."
        actions={
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground">
                    <Info strokeWidth={2} />
                    Marco legal
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-3" side="bottom" align="end">
                  <p className="mb-1.5 text-sm font-semibold">Marco legal</p>
                  <ul className="space-y-1 text-xs">
                    {MARCO_LEGAL.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* Solo Vacaciones tiene histórico propio. */}
            {activeTab === 'vacaciones' && (
              <Button variant="outline" onClick={() => navigate('/liquidaciones/vacaciones/historico')}>
                <History strokeWidth={2} />
                Histórico
              </Button>
            )}
            {/* Intereses no lleva botón: van dentro del archivo de cesantías. */}
            {importar && (
              <Button variant="outline" onClick={() => navigate(importar.ruta)}>
                <Upload strokeWidth={2} />
                {importar.label}
              </Button>
            )}
          </>
        }
      />

      <TabsPrimitive.Root value={activeTab} onValueChange={cambiarTab} className="space-y-6">
        <SeccionTabsList aria-label="Secciones de liquidaciones">
          {TABS.map(t => (
            <SeccionTabsTrigger key={t} value={t}>
              {ETIQUETAS[t]}
            </SeccionTabsTrigger>
          ))}
        </SeccionTabsList>

        <TabsPrimitive.Content value="cesantias" className="outline-none">
          <CesantiasTab />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="intereses" className="outline-none">
          <InteresesTab />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="prima" className="outline-none">
          <PrimaTab />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="vacaciones" className="outline-none">
          <VacacionesTab />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="liquidacion-final" className="outline-none">
          <LiquidacionFinalTab />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  );
}

export default function Liquidaciones() {
  return <LiquidacionesContent />;
}
