import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent } from '../../components/ui/card';
import { Info, DollarSign, TrendingUp, Calendar, FileText, Briefcase } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { useKPIsLiquidaciones } from '../../contexts/LiquidacionesContext';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';

// Componentes de cada pestaña
import CesantiasTab from './CesantiasTab';
import InteresesTab from './InteresesTab';
import PrimaTab from './PrimaTab';
import VacacionesTab from './VacacionesTab';
import LiquidacionFinalTab from './LiquidacionFinalTab';

function LiquidacionesContent() {
  const [activeTab, setActiveTab] = useState('cesantias');
  const kpis = useKPIsLiquidaciones();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-foreground">Liquidaciones</h1>
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
      </div>

      {/* Pestañas del módulo */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <Card className="border-border">
          <CardContent className="p-3">
            <TabsList className="h-auto p-0 bg-transparent grid grid-cols-5 gap-2 w-full">
              <TabsTrigger
                value="cesantias"
                className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-12 py-0 transition-all duration-200 hover:bg-muted"
              >
                <DollarSign className="h-4 w-4" />
                <span>Cesantías</span>
              </TabsTrigger>
              <TabsTrigger
                value="intereses"
                className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-12 py-0 transition-all duration-200 hover:bg-muted"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Intereses</span>
              </TabsTrigger>
              <TabsTrigger
                value="prima"
                className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-12 py-0 transition-all duration-200 hover:bg-muted"
              >
                <Briefcase className="h-4 w-4" />
                <span>Prima</span>
              </TabsTrigger>
              <TabsTrigger
                value="vacaciones"
                className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-12 py-0 transition-all duration-200 hover:bg-muted"
              >
                <Calendar className="h-4 w-4" />
                <span>Vacaciones</span>
              </TabsTrigger>
              <TabsTrigger
                value="liquidacion-final"
                className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-12 py-0 transition-all duration-200 hover:bg-muted"
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
