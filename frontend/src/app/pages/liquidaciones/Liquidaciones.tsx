import { useNavigate, useSearchParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Info, DollarSign, TrendingUp, Calendar, FileText, Briefcase, Upload } from 'lucide-react';
import { InfoTooltip } from '../../components/common/InfoTooltip';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

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
  cesantias:  { label: 'Importar Cesantías',  ruta: '/liquidaciones/cesantias/carga-historico' },
  prima:      { label: 'Importar Prima',      ruta: '/liquidaciones/prima/carga-historico' },
  vacaciones: { label: 'Importar Vacaciones', ruta: '/liquidaciones/vacaciones/carga-historico' },
  // La clave es el `value` del TabsTrigger, no el nombre de la pestaña.
  'liquidacion-final': {
    label: 'Importar Liquidación Final',
    ruta: '/liquidaciones/finales/carga-historico',
  },
};

/** `value` de cada TabsTrigger. Es lo que viaja en `?tab=`. */
const TABS = ['cesantias', 'intereses', 'prima', 'vacaciones', 'liquidacion-final'] as const;
const TAB_POR_DEFECTO = 'cesantias';

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
  const importar = IMPORTAR_POR_TAB[activeTab];

  // `replace` para no llenar el historial con un paso por cada pestaña abierta.
  const cambiarTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary sm:text-3xl">Liquidaciones</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                    <Info className="h-4 w-4 text-primary" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-md p-4" side="bottom" align="start">
                  <p className="text-sm font-semibold mb-2">Marco Legal</p>
                  <ul className="text-xs space-y-1">
                    <li>• Código Sustantivo del Trabajo (Arts. 64, 65, 99, 186, 189, 192, 249, 306)</li>
                    <li>• Ley 50 de 1990 (Cesantías)</li>
                    <li>• Ley 52 de 1975 (Intereses sobre cesantías)</li>
                    <li>• Ley 2466 de 2025 (Contratos a término fijo)</li>
                    <li>• Decreto 1072 de 2015</li>
                    <li>• Decreto 1469 de 2025 (SMMLV 2026: $1.750.905)</li>
                    <li>• Decreto 1470 de 2025 (Aux. Transporte 2026: $249.095)</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-muted-foreground mt-2">
            Cesantías, intereses, prima de servicios, vacaciones y liquidaciones finales
          </p>
        </div>

        {/* Sin botón solo en Intereses: sus valores van dentro del archivo de
            cesantías y no tiene un cargue propio. */}
        {importar && (
          <Button
            variant="outline"
            onClick={() => navigate(importar.ruta)}
            className="w-full gap-2 rounded-full sm:w-auto sm:shrink-0"
          >
            <Upload className="h-4 w-4" />
            {importar.label}
          </Button>
        )}
      </div>

      {/* Pestañas del módulo */}
      <Tabs value={activeTab} onValueChange={cambiarTab} className="space-y-6">
        <Card className="border-border">
          <CardContent className="p-3">
            <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-0 sm:grid sm:grid-cols-5 sm:overflow-visible">
              <TabsTrigger
                value="cesantias"
                className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-12 py-0 transition-all duration-200 hover:bg-muted"
              >
                <DollarSign className="h-4 w-4" />
                <span>Cesantías</span>
                <InfoTooltip text="Ahorro obligatorio que la finca debe guardar por cada trabajador, equivalente a un mes de salario por año trabajado" />
              </TabsTrigger>
              <TabsTrigger
                value="intereses"
                className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-12 py-0 transition-all duration-200 hover:bg-muted"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Intereses</span>
              </TabsTrigger>
              <TabsTrigger
                value="prima"
                className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-12 py-0 transition-all duration-200 hover:bg-muted"
              >
                <Briefcase className="h-4 w-4" />
                <span>Prima</span>
              </TabsTrigger>
              <TabsTrigger
                value="vacaciones"
                className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-12 py-0 transition-all duration-200 hover:bg-muted"
              >
                <Calendar className="h-4 w-4" />
                <span>Vacaciones</span>
              </TabsTrigger>
              <TabsTrigger
                value="liquidacion-final"
                className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-12 py-0 transition-all duration-200 hover:bg-muted"
              >
                <FileText className="h-4 w-4" />
                <span>Liquidación</span>
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="cesantias" className="mt-0">
          <CesantiasTab />
        </TabsContent>

        <TabsContent value="intereses" className="mt-0">
          <InteresesTab />
        </TabsContent>

        <TabsContent value="prima" className="mt-0">
          <PrimaTab />
        </TabsContent>

        <TabsContent value="vacaciones" className="mt-0">
          <VacacionesTab />
        </TabsContent>

        <TabsContent value="liquidacion-final" className="mt-0">
          <LiquidacionFinalTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Liquidaciones() {
  return <LiquidacionesContent />;
}
