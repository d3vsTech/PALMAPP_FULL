import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
  Search,
  Eye,
  Plus,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';
import {
  useLiquidaciones,
  LiquidacionFinal,
  EstadoLiquidacion,
  TipoContrato,
  CausaTerminacion
} from '../../contexts/LiquidacionesContext';

// Mock data
const liquidacionesData: LiquidacionFinal[] = [
  {
    id: 'liq1',
    colaboradorId: 'col1',
    nombreCompleto: 'Juan Pérez García',
    cargo: 'Cosechero',
    tipoContrato: 'INDEFINIDO',
    fechaIngreso: '2024-01-15',
    fechaRetiro: '2026-05-01',
    causaTerminacion: 'RENUNCIA',
    salarioBasico: 1750905,
    auxilioTransporte: 249095,
    cesantias: 3650000,
    interesesCesantias: 438000,
    prima: 1850000,
    vacaciones: 875000,
    diasSalarioPendiente: 1,
    salarioPendiente: 58363,
    indemnizacion: 0,
    deduccionSeguridadSocial: 280000,
    deduccionPrestamos: 500000,
    otrosDeducciones: 0,
    totalDevengado: 6871363,
    totalDeducciones: 780000,
    netoAPagar: 6091363,
    estado: 'BORRADOR',
    fechaCreacion: '2026-05-01',
    observaciones: 'Renuncia voluntaria con preaviso',
  },
  {
    id: 'liq2',
    colaboradorId: 'col2',
    nombreCompleto: 'María Rodríguez López',
    cargo: 'Podador',
    tipoContrato: 'FIJO',
    fechaIngreso: '2025-01-10',
    fechaRetiro: '2026-01-09',
    causaTerminacion: 'VENCIMIENTO_CONTRATO',
    salarioBasico: 1750905,
    auxilioTransporte: 249095,
    cesantias: 1820000,
    interesesCesantias: 218400,
    prima: 910000,
    vacaciones: 437500,
    diasSalarioPendiente: 0,
    salarioPendiente: 0,
    indemnizacion: 0,
    deduccionSeguridadSocial: 140000,
    deduccionPrestamos: 0,
    otrosDeducciones: 50000,
    totalDevengado: 3385900,
    totalDeducciones: 190000,
    netoAPagar: 3195900,
    estado: 'APROBADA',
    fechaCreacion: '2026-01-09',
    fechaAprobacion: '2026-01-10',
  },
  {
    id: 'liq3',
    colaboradorId: 'col3',
    nombreCompleto: 'Carlos Sánchez Mejía',
    cargo: 'Operario Plateo',
    tipoContrato: 'INDEFINIDO',
    fechaIngreso: '2022-03-20',
    fechaRetiro: '2026-04-15',
    causaTerminacion: 'DESPIDO_SIN_JUSTA_CAUSA',
    salarioBasico: 1850000,
    auxilioTransporte: 249095,
    cesantias: 7800000,
    interesesCesantias: 936000,
    prima: 1950000,
    vacaciones: 1850000,
    diasSalarioPendiente: 15,
    salarioPendiente: 925000,
    indemnizacion: 5550000,
    deduccionSeguridadSocial: 450000,
    deduccionPrestamos: 1000000,
    otrosDeducciones: 0,
    totalDevengado: 19011000,
    totalDeducciones: 1450000,
    netoAPagar: 17561000,
    estado: 'PAGADA',
    fechaCreacion: '2026-04-15',
    fechaAprobacion: '2026-04-16',
    fechaPago: '2026-04-20',
    observaciones: 'Despido sin justa causa - Indemnización de 90 días (3 meses)',
  },
];

export default function LiquidacionFinalTab() {
  const navigate = useNavigate();
  const { liquidacionesFinales: liquidaciones, setLiquidacionesFinales: setLiquidaciones } = useLiquidaciones();
  const [filtros, setFiltros] = useState({
    nombre: '',
    estado: '',
  });
  const [wizardAbierto, setWizardAbierto] = useState(false);

  // Cargar datos iniciales solo una vez
  useEffect(() => {
    if (liquidaciones.length === 0) {
      setLiquidaciones(liquidacionesData);
    }
  }, []);

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const liquidacionesFiltradas = liquidaciones.filter((liq) => {
    const cumpleFiltros =
      liq.nombreCompleto.toLowerCase().includes(filtros.nombre.toLowerCase()) &&
      (filtros.estado === '' || liq.estado === filtros.estado);

    return cumpleFiltros;
  });

  const totalBorradores = liquidaciones.filter(l => l.estado === 'BORRADOR').length;
  const totalAprobadas = liquidaciones.filter(l => l.estado === 'APROBADA').length;
  const totalPagadas = liquidaciones.filter(l => l.estado === 'PAGADA').length;
  const montoTotalPagar = liquidaciones.filter(l => l.estado === 'APROBADA').reduce((sum, l) => sum + l.netoAPagar, 0);

  const verDetalle = (liquidacionId: string) => {
    navigate(`/liquidaciones/liquidacion-final/${liquidacionId}`);
  };

  const getEstadoBadge = (estado: EstadoLiquidacion) => {
    switch (estado) {
      case 'BORRADOR':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
            <Edit className="h-3 w-3 mr-1" />
            Borrador
          </Badge>
        );
      case 'APROBADA':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobada
          </Badge>
        );
      case 'PAGADA':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pagada
          </Badge>
        );
      case 'ANULADA':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <XCircle className="h-3 w-3 mr-1" />
            Anulada
          </Badge>
        );
    }
  };

  const getCausaTerminacionTexto = (causa: CausaTerminacion) => {
    const textos = {
      'RENUNCIA': 'Renuncia voluntaria',
      'DESPIDO_JUSTA_CAUSA': 'Despido con justa causa',
      'DESPIDO_SIN_JUSTA_CAUSA': 'Despido sin justa causa',
      'MUTUO_ACUERDO': 'Mutuo acuerdo',
      'VENCIMIENTO_CONTRATO': 'Vencimiento de contrato',
    };
    return textos[causa];
  };

  return (
    <div className="space-y-6">
      {/* Alerta liquidaciones pendientes */}
      {totalAprobadas > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-300">
                  Liquidaciones Pendientes de Pago
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                  Tienes {totalAprobadas} liquidaciones aprobadas pendientes de pago por un total de {formatearMoneda(montoTotalPagar)}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs específicos de liquidaciones finales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Borradores</p>
            <p className="text-2xl font-bold text-muted-foreground">{totalBorradores}</p>
            <p className="text-xs text-muted-foreground mt-1">sin aprobar</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Aprobadas</p>
            <p className="text-2xl font-bold text-blue-600">{totalAprobadas}</p>
            <p className="text-xs text-muted-foreground mt-1">pendientes de pago</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Pagadas</p>
            <p className="text-2xl font-bold text-success">{totalPagadas}</p>
            <p className="text-xs text-muted-foreground mt-1">finalizadas</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Monto por Pagar</p>
            <p className="text-2xl font-bold text-foreground">{formatearMoneda(montoTotalPagar)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones y filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={filtros.nombre}
              onChange={(e) => handleFiltroChange('nombre', e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <select
            value={filtros.estado}
            onChange={(e) => handleFiltroChange('estado', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todos los estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="APROBADA">Aprobada</option>
            <option value="PAGADA">Pagada</option>
            <option value="ANULADA">Anulada</option>
          </select>
        </div>

        <Button onClick={() => setWizardAbierto(true)} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Nueva Liquidación
        </Button>
      </div>

      {/* Tabla de liquidaciones */}
      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Colaborador</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Causa Terminación</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Fecha Retiro</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Neto a Pagar</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {liquidacionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No hay liquidaciones finales registradas
                        </p>
                        <Button onClick={() => setWizardAbierto(true)} className="mt-2 gap-2">
                          <Plus className="h-4 w-4" />
                          Crear Primera Liquidación
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  liquidacionesFiltradas.map((liquidacion, index) => (
                    <tr
                      key={liquidacion.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{liquidacion.nombreCompleto}</span>
                          <span className="text-xs text-muted-foreground">{liquidacion.cargo}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{getCausaTerminacionTexto(liquidacion.causaTerminacion)}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">
                          {new Date(liquidacion.fechaRetiro).toLocaleDateString('es-CO')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-bold text-primary">
                          {formatearMoneda(liquidacion.netoAPagar)}
                        </span>
                      </td>
                      <td className="p-4">
                        {getEstadoBadge(liquidacion.estado)}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verDetalle(liquidacion.id)}
                            className="hover:bg-primary/10 hover:text-primary hover:border-primary gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalle
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Contador de resultados */}
          {liquidacionesFiltradas.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-4 py-3 border-t border-border">
              <p>
                Mostrando <span className="font-medium text-foreground">{liquidacionesFiltradas.length}</span> de{' '}
                <span className="font-medium text-foreground">{liquidaciones.length}</span> liquidaciones
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Wizard (placeholder) */}
      <Dialog open={wizardAbierto} onOpenChange={setWizardAbierto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Liquidación Final</DialogTitle>
            <DialogDescription>
              Asistente para crear una liquidación final de contrato
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900 dark:text-blue-300">
                    <p className="font-semibold mb-1">Wizard en Desarrollo</p>
                    <p>
                      El asistente completo para crear liquidaciones finales se implementará en esta sección.
                      Por ahora, puedes ver las liquidaciones de ejemplo en la tabla principal.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setWizardAbierto(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
