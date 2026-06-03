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
import { Plus, Edit, Trash2, CheckCircle, X, FileText } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { toast } from 'sonner';
import {
  nominaApi,
  NominaErrorCodes,
  type NominaConcepto,
  type TipoConcepto,
} from '../../../api/nomina';
import { formatCOP } from '../lib/format';

const TIPO_LABEL: Record<TipoConcepto, string> = {
  APORTE_LEGAL: 'Aporte Legal',
  DEDUCCION_LEGAL: 'Deducción Legal',
  DEDUCCION_VOLUNTARIA: 'Deducción Voluntaria',
  BONIFICACION_FIJA: 'Bonificación Fija',
  BONIFICACION_VARIABLE: 'Bonificación Variable',
};

/** Lee la bandera de obligatorio aceptando ambos nombres del backend. */
function leerObligatorio(c: NominaConcepto): boolean {
  return !!(c.es_obligatorio ?? c.obligatorio);
}

export function ConceptosNominaTab() {
  const navigate = useNavigate();
  const [conceptos, setConceptos] = useState<NominaConcepto[]>([]);

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    nominaApi.conceptos
      .listar()
      .then((res) => setConceptos(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los conceptos'));
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

  const valorDisplay = (concepto: NominaConcepto) => {
    if (concepto.calculo === 'PORCENTAJE') {
      return concepto.porcentaje != null ? `${concepto.porcentaje}%` : '-';
    }
    return concepto.valor_referencia != null ? formatCOP(concepto.valor_referencia) : '-';
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
                    <TableHead>Op</TableHead>
                    <TableHead>Cálculo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Aplica A</TableHead>
                    <TableHead className="text-center">Auto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conceptos.map((concepto) => (
                    <TableRow key={concepto.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold">
                        {concepto.codigo}
                      </TableCell>
                      <TableCell className="font-medium">{concepto.nombre}</TableCell>
                      <TableCell>
                        <Badge className={getTipoColor(concepto.tipo)}>
                          {(TIPO_LABEL[concepto.tipo] ?? concepto.tipo ?? '—').split(' ')[0]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-bold ${
                            concepto.operacion === 'SUMA' ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {concepto.operacion === 'SUMA' ? '+' : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {concepto.calculo}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">{valorDisplay(concepto)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{concepto.aplica_a}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {leerObligatorio(concepto) ? (
                          <CheckCircle className="h-4 w-4 text-success mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
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
      </div>
    </>
  );
}
