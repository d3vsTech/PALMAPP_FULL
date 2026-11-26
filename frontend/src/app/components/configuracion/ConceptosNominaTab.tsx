import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { ConfigSection, ConfigEmpty, ConfigRowActions } from './ConfigSection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Plus } from 'lucide-react';
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
import { formatFecha } from '../../utils/fecha';

const TIPO_BADGE: Record<
  TipoConcepto,
  { label: string; variant: 'info' | 'destructive' | 'warning' | 'success' | 'default' }
> = {
  APORTE_LEGAL: { label: 'Aporte legal', variant: 'info' },
  DEDUCCION_LEGAL: { label: 'Deducción legal', variant: 'destructive' },
  DEDUCCION_VOLUNTARIA: { label: 'Deducción voluntaria', variant: 'warning' },
  BONIFICACION_FIJA: { label: 'Bonificación fija', variant: 'success' },
  BONIFICACION_VARIABLE: { label: 'Bonificación variable', variant: 'default' },
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
   *    `Trabajador 4% · Empresa 8.5%` (omitiendo el lado en cero).
   *  - PORCENTAJE legacy (un solo `porcentaje`) → `4%`.
   *  - VALOR_FIJO → COP formateado.
   */
  const valoresDisplay = (concepto: NominaConcepto): string => {
    if (concepto.calculo === 'PORCENTAJE') {
      const emp = pct(concepto.porcentaje_empleado);
      const empresa = pct(concepto.porcentaje_empresa);
      if (emp != null || empresa != null) {
        const parts: string[] = [];
        if (emp != null && emp > 0) parts.push(`Trabajador ${emp}%`);
        if (empresa != null && empresa > 0) parts.push(`Empresa ${empresa}%`);
        if (parts.length > 0) return parts.join(' · ');
      }
      const legacy = pct(concepto.porcentaje);
      if (legacy != null) return `${legacy}%`;
      return '—';
    }
    return concepto.valor_referencia != null ? formatCOP(concepto.valor_referencia) : '—';
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
   * "Vigencia" — formato `DD/MM/YYYY a DD/MM/YYYY` o `DD/MM/YYYY a hoy`
   * cuando no hay fecha de cierre. Si no hay `vigente_desde` devolvemos '-'.
   */
  const fmtFecha = (iso?: string | null): string | null => {
    const r = formatFecha(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });
    return r === '—' ? null : r;
  };
  const vigenciaDisplay = (concepto: NominaConcepto): string => {
    const desde = fmtFecha(concepto.vigente_desde);
    if (!desde) return '—';
    const hasta = fmtFecha(concepto.vigente_hasta);
    return `${desde} a ${hasta ?? 'hoy'}`;
  };

  return (
    <>
      {ConfirmDeleteDialog}

      <div className="space-y-6">
      <TabLoadingGate loading={loading} message="Cargando conceptos…">
      <ConfigSection
        title="Aportes y deducciones"
        description="Aportes legales, deducciones y bonificaciones que entran en el cálculo de la nómina."
        flush
        actions={
          <Button onClick={handleNuevo}>
            <Plus strokeWidth={2} />
            Nuevo concepto
          </Button>
        }
      >
        {conceptos.length === 0 ? (
          <ConfigEmpty
            title="Sin conceptos registrados"
            description="Agrega aportes, deducciones o bonificaciones para la nómina."
            action={
              <Button onClick={handleNuevo}>
                <Plus strokeWidth={2} />
                Agregar concepto
              </Button>
            }
          />
        ) : (
          <Table className="min-w-[840px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Concepto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valores</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead className="w-24 pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...conceptos]
                .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' }))
                .map((concepto) => {
                  const total = totalDisplay(concepto);
                  const tipo = TIPO_BADGE[concepto.tipo];
                  return (
                    <TableRow key={concepto.id}>
                      <TableCell className="pl-5">
                        <button
                          type="button"
                          onClick={() => handleEditar(concepto)}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {concepto.nombre}
                        </button>
                        <p className="text-xs text-muted-foreground">{concepto.codigo}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tipo?.variant ?? 'secondary'}>
                          {tipo?.label ?? concepto.tipo ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {valoresDisplay(concepto)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {total === '-' ? '—' : total}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vigenciaDisplay(concepto)}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <ConfigRowActions
                          label={concepto.nombre}
                          onEdit={() => handleEditar(concepto)}
                          onDelete={() => handleDelete(concepto)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )}
      </ConfigSection>
      </TabLoadingGate>
      </div>
    </>
  );
}
