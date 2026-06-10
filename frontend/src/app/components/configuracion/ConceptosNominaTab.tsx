import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { toast } from 'sonner';
import {
  nominaApi,
  NominaErrorCodes,
  type NominaConcepto,
  type TipoConcepto,
} from '../../../api/nomina';
import { TabLoadingGate } from './TabLoadingGate';
import { cached } from '../../../api/cache';
import { formatCOP } from '../lib/format';

const TIPO_LABEL: Record<TipoConcepto, string> = {
  APORTE_LEGAL: 'Aporte Legal',
  DEDUCCION_LEGAL: 'Deducción Legal',
  DEDUCCION_VOLUNTARIA: 'Deducción Voluntaria',
  BONIFICACION_FIJA: 'Bonificación Fija',
  BONIFICACION_VARIABLE: 'Bonificación Variable',
};

export function ConceptosNominaTab() {
  const navigate = useNavigate();
  const [conceptos, setConceptos] = useState<NominaConcepto[]>([]);
  const [loading, setLoading] = useState(true);

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    cached('config:conceptos-nomina', () => nominaApi.conceptos.listar())
      .then((res) => setConceptos(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los conceptos'))
      .finally(() => setLoading(false));
  }, []);

  const handleNuevo = () => navigate('/configuracion/conceptos/nuevo');
  const handleEditar = (concepto: NominaConcepto) =>
    navigate(`/configuracion/conceptos/editar?id=${concepto.id}`);

  const handleDelete = (concepto: NominaConcepto) => {
    confirmDelete({
      title: '¿Eliminar concepto?',
      description: `¿Estás seguro de que deseas eliminar el concepto "${concepto.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await nominaApi.conceptos.eliminar(concepto.id);
          setConceptos((prev) => prev.filter((c) => c.id !== concepto.id));
          toast.success('Concepto eliminado');
        } catch (e: any) {
          if (e?.code === NominaErrorCodes.CONCEPTO_EN_USO) {
            toast.error('No se puede eliminar: está en uso por nóminas existentes');
          } else if (e?.code === NominaErrorCodes.CONCEPTO_OBLIGATORIO) {
            toast.error('No se puede eliminar: es un concepto obligatorio');
          } else {
            toast.error(e?.message ?? 'No se pudo eliminar el concepto');
          }
        }
      },
    });
  };

  const getTipoColor = (tipo: TipoConcepto): string => {
    switch (tipo) {
      case 'APORTE_LEGAL':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30';
      case 'DEDUCCION_LEGAL':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'DEDUCCION_VOLUNTARIA':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'BONIFICACION_FIJA':
        return 'bg-success/10 text-success border-success/30';
      case 'BONIFICACION_VARIABLE':
        return 'bg-primary/10 text-primary border-primary/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  /** Normaliza un porcentaje que puede venir como string o number desde la API. */
  const pct = (v: number | string | null | undefined): number | null => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  /**
   * "Valores" — desglose por lado (empleado / empresa) para PORCENTAJE, o el
   * monto en COP para VALOR_FIJO. Soporta:
   *  - PORCENTAJE con `porcentaje_empleado` + `porcentaje_empresa` →
   *    `Emp: 4% | Empr: 8.5%` (omitiendo el lado en cero).
   *  - PORCENTAJE legacy (un solo `porcentaje`) → `4%`.
   *  - VALOR_FIJO → COP formateado.
   */
  const valoresDisplay = (concepto: NominaConcepto): string => {
    if (concepto.calculo === 'PORCENTAJE') {
      const emp = pct(concepto.porcentaje_empleado);
      const empresa = pct(concepto.porcentaje_empresa);
      if (emp != null || empresa != null) {
        const parts: string[] = [];
        if (emp != null && emp > 0) parts.push(`Emp: ${emp}%`);
        if (empresa != null && empresa > 0) parts.push(`Empr: ${empresa}%`);
        if (parts.length > 0) return parts.join(' | ');
      }
      const legacy = pct(concepto.porcentaje);
      if (legacy != null) return `${legacy}%`;
      return '-';
    }
    return concepto.valor_referencia != null ? formatCOP(concepto.valor_referencia) : '-';
  };

  /**
   * "Total" — suma del aporte cuando aplica:
   *  - PORCENTAJE con emp+empresa → `${emp + empresa}%` con 2 decimales.
   *  - PORCENTAJE legacy single   → ese mismo valor.
   *  - VALOR_FIJO                 → '-' (el total ya está en la columna Valores).
   */
  const totalDisplay = (concepto: NominaConcepto): string => {
    if (concepto.calculo !== 'PORCENTAJE') return '-';
    const emp = pct(concepto.porcentaje_empleado);
    const empresa = pct(concepto.porcentaje_empresa);
    if (emp != null || empresa != null) {
      const suma = (emp ?? 0) + (empresa ?? 0);
      return `${suma.toFixed(2)}%`;
    }
    const legacy = pct(concepto.porcentaje);
    if (legacy != null) return `${legacy.toFixed(2)}%`;
    return '-';
  };

  /**
   * "Vigencia" — formato `DD/MM/YYYY → DD/MM/YYYY` o `DD/MM/YYYY → Vigente`
   * cuando no hay fecha de cierre. Si no hay `vigente_desde` devolvemos '-'.
   */
  const fmtFecha = (iso?: string | null): string | null => {
    if (!iso) return null;
    // Soporta `YYYY-MM-DD` y `YYYY-MM-DDTHH:mm:ss...`.
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return `${m[3]}/${m[2]}/${m[1]}`;
  };
  const vigenciaDisplay = (concepto: NominaConcepto): string => {
    const desde = fmtFecha(concepto.vigente_desde);
    if (!desde) return '-';
    const hasta = fmtFecha(concepto.vigente_hasta);
    return `${desde} → ${hasta ?? 'Vigente'}`;
  };

  return (
    <>
      {ConfirmDeleteDialog}

      {/* Contenido principal con header H2 — diseño V.12+1 */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Conceptos de Nómina</h2>
          <p className="text-muted-foreground">
            Gestiona aportes legales, deducciones y bonificaciones para el cálculo de nómina
          </p>
        </div>

      <TabLoadingGate loading={loading} message="Cargando conceptos…">
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Aportes y Deducciones
              </CardTitle>
              <CardDescription>
                Configura todos los conceptos que se aplican en la nómina
              </CardDescription>
            </div>
            <Button onClick={handleNuevo}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Concepto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {conceptos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay conceptos registrados</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Agrega aportes, deducciones o bonificaciones para la nómina
              </p>
              <Button onClick={handleNuevo}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Concepto
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valores</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conceptos.map((concepto) => (
                    <TableRow key={concepto.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold uppercase">
                        {concepto.codigo}
                      </TableCell>
                      <TableCell className="font-medium">{concepto.nombre}</TableCell>
                      <TableCell>
                        <Badge className={getTipoColor(concepto.tipo)}>
                          {TIPO_LABEL[concepto.tipo] ?? concepto.tipo ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{valoresDisplay(concepto)}</TableCell>
                      <TableCell>
                        {(() => {
                          const total = totalDisplay(concepto);
                          // Verde brillante cuando hay total real; "-" en muted.
                          return total === '-'
                            ? <span className="text-muted-foreground">-</span>
                            : <span className="font-bold text-success">{total}</span>;
                        })()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {vigenciaDisplay(concepto)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditar(concepto)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(concepto)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </TabLoadingGate>
      </div>
    </>
  );
}
