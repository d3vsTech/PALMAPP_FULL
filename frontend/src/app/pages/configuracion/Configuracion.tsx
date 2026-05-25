import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  Building2,
  Users,
  DollarSign,
  Sprout,
  Hammer,
  TrendingUp,
  Package,
  Scale,
  Settings,
  Shield,
  Truck,
  Clock,
  UserX,
  Landmark,
  FileText,
} from 'lucide-react';
import { cn } from '../../components/lib/utils';

// Tabs existentes en V.2
import { SemillasTab } from '../../components/configuracion/SemillasTab';
import { InsumosTab } from '../../components/configuracion/InsumosTab';
import { LaboresTab } from '../../components/configuracion/LaboresTab';
import { ConceptosNominaTab } from '../../components/configuracion/ConceptosNominaTab';
import { PreciosCosechaTab } from '../../components/configuracion/PreciosCosechaTab';
import { EscalaAbonadaTab } from '../../components/configuracion/EscalaAbonadaTab';
import { PromediosTab } from '../../components/configuracion/PromediosTab';

// Tabs nuevos portados desde V.10
import { DatosEmpresaTab } from '../../components/configuracion/DatosEmpresaTab';
import { SeguridadSocialTab } from '../../components/configuracion/SeguridadSocialTab';
import { ConstantesLegalesTab } from '../../components/configuracion/ConstantesLegalesTab';
import { ExtractorasTab } from '../../components/configuracion/ExtractorasTab';
import { TransporteTab } from '../../components/configuracion/TransporteTab';
import { HorasExtrasTab } from '../../components/configuracion/HorasExtrasTab';
import { AusenciasTab } from '../../components/configuracion/AusenciasTab';

/**
 * Etapas del wizard de Configuración — réplica idéntica del proyecto V.10
 * (ver `ConfiguracionNueva.tsx` en `D:/Devs/PALMA/Front/V.10/PalmAppv23w`).
 */
const ETAPAS = [
  { numero: 1,  nombre: 'Empresa',     icono: Building2, component: DatosEmpresaTab },
  { numero: 2,  nombre: 'Legal',       icono: Scale,     component: ConstantesLegalesTab },
  { numero: 3,  nombre: 'Entidades',   icono: Landmark,  component: SeguridadSocialTab },
  { numero: 4,  nombre: 'Conceptos',   icono: FileText,  component: ConceptosNominaTab },
  { numero: 5,  nombre: 'Horas',       icono: Clock,     component: HorasExtrasTab },
  { numero: 6,  nombre: 'Novedades',   icono: UserX,     component: AusenciasTab },
  { numero: 7,  nombre: 'Semillas',    icono: Sprout,    component: SemillasTab },
  { numero: 8,  nombre: 'Insumos',     icono: Package,   component: InsumosTab },
  { numero: 9,  nombre: 'Abonada',     icono: TrendingUp, component: EscalaAbonadaTab },
  { numero: 10, nombre: 'Labores',     icono: Hammer,    component: LaboresTab },
  { numero: 11, nombre: 'Precios',     icono: DollarSign, component: PreciosCosechaTab },
  { numero: 12, nombre: 'Promedios',   icono: TrendingUp, component: PromediosTab },
  { numero: 13, nombre: 'Extractoras', icono: Package,   component: ExtractorasTab },
  { numero: 14, nombre: 'Transporte',  icono: Truck,     component: TransporteTab },
];

export default function Configuracion() {
  const [etapaActual, setEtapaActual] = useState(1);

  const EtapaComponent = ETAPAS[etapaActual - 1].component;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1 mb-6">
        <h1>Configuración</h1>
        <p className="text-lead">Configura todos los parámetros de tu finca</p>
      </div>

      {/* Indicador de Progreso - Pasos */}
      <Card className="border-border">
        <CardContent className="p-6">
          {/* Desktop - Grid de pasos (8 columnas como V.10) */}
          <div className="hidden lg:grid grid-cols-8 gap-3">
            {ETAPAS.map((etapa) => {
              const Icon = etapa.icono;
              const isActive = etapaActual === etapa.numero;

              return (
                <button
                  key={etapa.numero}
                  onClick={() => setEtapaActual(etapa.numero)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg transition-all',
                    isActive && 'bg-primary text-primary-foreground shadow-md scale-105',
                    !isActive && 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <div className={cn(
                    'relative flex items-center justify-center h-10 w-10 rounded-full transition-all',
                    isActive && 'bg-primary-foreground/20',
                    !isActive && 'bg-muted',
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">
                    {etapa.nombre}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile - Select dropdown */}
          <div className="lg:hidden">
            <select
              value={etapaActual}
              onChange={(e) => setEtapaActual(Number(e.target.value))}
              className="w-full p-3 rounded-lg border border-border bg-background"
            >
              {ETAPAS.map((etapa) => (
                <option key={etapa.numero} value={etapa.numero}>
                  {etapa.numero}. {etapa.nombre}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Contenido de la Etapa Actual */}
      <div className="min-h-[500px]">
        <EtapaComponent />
      </div>

      {/* Navegación Inferior */}
      <div className="flex items-center justify-between pt-6">
        <Button
          variant="outline"
          onClick={() => setEtapaActual(Math.max(1, etapaActual - 1))}
          disabled={etapaActual === 1}
          size="lg"
          className="gap-2"
        >
          Anterior
        </Button>

        <div className="text-sm text-muted-foreground font-medium">
          Paso {etapaActual} de {ETAPAS.length}
        </div>

        <Button
          onClick={() => setEtapaActual(Math.min(ETAPAS.length, etapaActual + 1))}
          disabled={etapaActual === ETAPAS.length}
          size="lg"
          className="gap-2"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
