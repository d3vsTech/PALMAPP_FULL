import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Settings, Sprout, Package, Briefcase, Hammer, FileText, Scale, TrendingUp } from 'lucide-react';
import { SemillasTab } from '../../components/configuracion/SemillasTab';
import { InsumosTab } from '../../components/configuracion/InsumosTab';
import { CargosTab } from '../../components/configuracion/CargosTab';
import { LaboresTab } from '../../components/configuracion/LaboresTab';
import { ConceptosNominaTab } from '../../components/configuracion/ConceptosNominaTab';
import { TablasLegalesTab } from '../../components/configuracion/TablasLegalesTab';
import { PreciosCosechaTab } from '../../components/configuracion/PreciosCosechaTab';
import { LaboresFijasTab } from '../../components/configuracion/LaboresFijasTab';
import { EscalaAbonadaTab } from '../../components/configuracion/EscalaAbonadaTab';
import { PromediosTab } from '../../components/configuracion/PromediosTab';

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('semillas');

  return (
    <div className="space-y-6">
      {/* Header ultra-moderno */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-3xl border border-primary/30 p-10 shadow-2xl shadow-primary/10">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-accent/30 to-accent/5 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-sm border border-primary/30 px-4 py-2 shadow-lg shadow-primary/20">
            <div className="relative h-2.5 w-2.5">
              <div className="absolute inset-0 rounded-full bg-primary animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-primary blur-sm animate-pulse" />
            </div>
            <span className="text-sm font-semibold text-primary">Sistema</span>
          </div>
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text">
            Configuración
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            Catálogos maestros y precios base del sistema
          </p>
        </div>
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="bg-muted/50 backdrop-blur-sm inline-flex w-auto">
            {/* Catálogos Maestros */}
            <TabsTrigger value="semillas" className="gap-2">
              <Sprout className="h-4 w-4" />
              <span className="hidden sm:inline">Semillas</span>
            </TabsTrigger>
            <TabsTrigger value="insumos" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Insumos</span>
            </TabsTrigger>
            <TabsTrigger value="cargos" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Cargos</span>
            </TabsTrigger>
            <TabsTrigger value="labores" className="gap-2">
              <Hammer className="h-4 w-4" />
              <span className="hidden sm:inline">Labores</span>
            </TabsTrigger>
            <TabsTrigger value="conceptos" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Conceptos Nómina</span>
            </TabsTrigger>
            <TabsTrigger value="tablas" className="gap-2">
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Tablas Legales</span>
            </TabsTrigger>

            {/* Panel de Configuración */}
            <TabsTrigger value="precios-cosecha" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Precios Cosecha</span>
            </TabsTrigger>
            <TabsTrigger value="labores-fijas" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Labores Fijas</span>
            </TabsTrigger>
            <TabsTrigger value="escala-abonada" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Escala Abonada</span>
            </TabsTrigger>
            <TabsTrigger value="promedios" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Promedios</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Catálogos Maestros */}
        <TabsContent value="semillas">
          <SemillasTab />
        </TabsContent>

        <TabsContent value="insumos">
          <InsumosTab />
        </TabsContent>

        <TabsContent value="cargos">
          <CargosTab />
        </TabsContent>

        <TabsContent value="labores">
          <LaboresTab />
        </TabsContent>

        <TabsContent value="conceptos">
          <ConceptosNominaTab />
        </TabsContent>

        <TabsContent value="tablas">
          <TablasLegalesTab />
        </TabsContent>

        {/* Panel de Configuración */}
        <TabsContent value="precios-cosecha">
          <PreciosCosechaTab />
        </TabsContent>

        <TabsContent value="labores-fijas">
          <LaboresFijasTab />
        </TabsContent>

        <TabsContent value="escala-abonada">
          <EscalaAbonadaTab />
        </TabsContent>

        <TabsContent value="promedios">
          <PromediosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
