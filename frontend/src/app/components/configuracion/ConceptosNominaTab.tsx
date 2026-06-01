import { useEffect, useState } from 'react';
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
import { Plus, Edit, Trash2, CheckCircle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { toast } from 'sonner';
import { Checkbox } from '../ui/checkbox';
import {
  nominaApi,
  NominaErrorCodes,
  type NominaConcepto,
  type TipoConcepto,
} from '../../../api/nomina';
import { formatCOP, formatThousands, parseCOP } from '../lib/format';

const TIPO_LABEL: Record<TipoConcepto, string> = {
  DEDUCCION_LEGAL: 'Deducción Legal',
  DEDUCCION_VOLUNTARIA: 'Deducción Voluntaria',
  BONIFICACION_FIJA: 'Bonificación Fija',
  BONIFICACION_VARIABLE: 'Bonificación Variable',
};

type BaseCalculo = 'Total Devengado' | 'Salario Base' | 'SMMLV' | 'Manual';
type BaseCalculoApi = 'TOTAL_DEVENGADO' | 'SALARIO_BASE' | 'SALARIO_MINIMO' | 'MANUAL';

const BASE_CALCULO_TO_API: Record<BaseCalculo, BaseCalculoApi> = {
  'Total Devengado': 'TOTAL_DEVENGADO',
  'Salario Base': 'SALARIO_BASE',
  'SMMLV': 'SALARIO_MINIMO',
  'Manual': 'MANUAL',
};

const BASE_CALCULO_FROM_API: Record<BaseCalculoApi, BaseCalculo> = {
  TOTAL_DEVENGADO: 'Total Devengado',
  SALARIO_BASE: 'Salario Base',
  SALARIO_MINIMO: 'SMMLV',
  MANUAL: 'Manual',
};

type FormState = {
  codigo: string;
  nombre: string;
  tipo: TipoConcepto;
  operacion: 'SUMA' | 'RESTA';
  calculo: 'PORCENTAJE' | 'VALOR_FIJO';
  valor_referencia: string;
  base_calculo: BaseCalculo;
  aplica_a: 'FIJO' | 'VARIABLE' | 'AMBOS';
  es_obligatorio: boolean;
};

const FORM_VACIO: FormState = {
  codigo: '',
  nombre: '',
  tipo: 'DEDUCCION_LEGAL',
  operacion: 'RESTA',
  calculo: 'PORCENTAJE',
  valor_referencia: '',
  base_calculo: 'Total Devengado',
  aplica_a: 'AMBOS',
  es_obligatorio: false,
};

function esDeduccion(tipo: TipoConcepto) {
  return tipo === 'DEDUCCION_LEGAL' || tipo === 'DEDUCCION_VOLUNTARIA';
}

/** Lee la bandera de obligatorio aceptando ambos nombres del backend. */
function leerObligatorio(c: NominaConcepto): boolean {
  return !!(c.es_obligatorio ?? c.obligatorio);
}

export function ConceptosNominaTab() {
  const [conceptos, setConceptos] = useState<NominaConcepto[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [conceptoEdit, setConceptoEdit] = useState<NominaConcepto | null>(null);
  const [formData, setFormData] = useState<FormState>(FORM_VACIO);

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    nominaApi.conceptos
      .listar()
      .then((res) => setConceptos(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los conceptos'));
  }, []);

  const handleOpenModal = (concepto?: NominaConcepto) => {
    if (concepto) {
      setConceptoEdit(concepto);
      setFormData({
        codigo: concepto.codigo,
        nombre: concepto.nombre,
        tipo: concepto.tipo,
        operacion: concepto.operacion,
        calculo: concepto.calculo,
        valor_referencia:
          concepto.calculo === 'PORCENTAJE'
            ? concepto.porcentaje != null
              ? String(concepto.porcentaje)
              : ''
            : concepto.valor_referencia != null
            ? formatThousands(concepto.valor_referencia)
            : '',
        base_calculo:
          BASE_CALCULO_FROM_API[concepto.base_calculo as BaseCalculoApi] ??
          (concepto.base_calculo as BaseCalculo) ??
          'Total Devengado',
        aplica_a: concepto.aplica_a,
        es_obligatorio: leerObligatorio(concepto),
      });
    } else {
      setConceptoEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!conceptoEdit && !formData.codigo.trim()) {
      toast.error('El código es obligatorio');
      return;
    }
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!formData.valor_referencia.trim()) {
      toast.error('El valor de referencia es obligatorio');
      return;
    }

    try {
      // Si es PORCENTAJE el valor es un % (ej "4" o "12.5"), no se formatea como dinero.
      // Si es VALOR_FIJO, el input tiene puntos de miles y hay que limpiarlos.
      const valorNum =
        formData.calculo === 'PORCENTAJE'
          ? Number(formData.valor_referencia)
          : Number(parseCOP(formData.valor_referencia));
      if (conceptoEdit) {
        const payload = {
          nombre: formData.nombre.trim(),
          aplica_a: formData.aplica_a,
          base_calculo: BASE_CALCULO_TO_API[formData.base_calculo],
          es_obligatorio: formData.es_obligatorio,
          ...(conceptoEdit.calculo === 'PORCENTAJE'
            ? { porcentaje: valorNum }
            : { valor_referencia: valorNum }),
        };
        const res = await nominaApi.conceptos.editar(conceptoEdit.id, payload);
        setConceptos((prev) => prev.map((c) => (c.id === conceptoEdit.id ? res.data : c)));
        toast.success(res.message ?? 'Concepto actualizado');
      } else {
        const payload = {
          codigo: formData.codigo.trim(),
          nombre: formData.nombre.trim(),
          tipo: formData.tipo,
          subtipo: 'OTRO' as const,
          operacion: formData.operacion,
          calculo: formData.calculo,
          aplica_a: formData.aplica_a,
          base_calculo: BASE_CALCULO_TO_API[formData.base_calculo],
          es_obligatorio: formData.es_obligatorio,
          ...(formData.calculo === 'PORCENTAJE'
            ? { porcentaje: valorNum }
            : { valor_referencia: valorNum }),
        };
        const res = await nominaApi.conceptos.crear(payload);
        setConceptos((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Concepto creado');
      }
      setOpenModal(false);
    } catch (e: any) {
      // El backend devuelve "The codigo has already been taken" cuando otro
      // concepto del tenant (incluso inactivo o soft-deleted) ya usa ese código.
      // Como la lista del tab sólo muestra activos, el usuario lo ve "vacío" y
      // se confunde — damos un mensaje accionable.
      const errCodigo = e?.errors?.codigo?.[0] as string | undefined;
      if (errCodigo && /already been taken|has already|ya/i.test(errCodigo)) {
        toast.error(
          `El código "${formData.codigo}" ya está registrado en este tenant ` +
          `(posiblemente como inactivo). Usa otro código o reactiva el existente.`,
        );
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el concepto');
      }
    }
  };

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

  const getTipoColor = (tipo: TipoConcepto) => {
    switch (tipo) {
      case 'DEDUCCION_LEGAL':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'DEDUCCION_VOLUNTARIA':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'BONIFICACION_FIJA':
        return 'bg-success/10 text-success border-success/30';
      case 'BONIFICACION_VARIABLE':
        return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  const valorDisplay = (concepto: NominaConcepto) => {
    if (concepto.calculo === 'PORCENTAJE') {
      return concepto.porcentaje != null ? `${concepto.porcentaje}%` : '-';
    }
    return concepto.valor_referencia != null ? formatCOP(concepto.valor_referencia) : '-';
  };

  const valorPreview = () => {
    if (!formData.valor_referencia) return '-';
    return formData.calculo === 'PORCENTAJE'
      ? `${formData.valor_referencia}%`
      : formatCOP(parseCOP(formData.valor_referencia));
  };

  const inmutable = !!conceptoEdit;

  return (
    <>
      {ConfirmDeleteDialog}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {conceptoEdit ? 'Editar Concepto' : 'Nuevo Concepto de Nómina'}
            </DialogTitle>
            <DialogDescription>
              Define una deducción o bonificación para aplicar en la nómina
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Código */}
              <div className="space-y-2">
                <Label htmlFor="codigo">
                  Código <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="codigo"
                  placeholder="SALUD EMP"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, codigo: e.target.value.toUpperCase() }))
                  }
                  className="uppercase"
                  disabled={inmutable}
                />
              </div>

              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="nombre">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  placeholder="Salud Empleado"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label htmlFor="tipo">
                  Tipo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: TipoConcepto) => {
                    setFormData((prev) => ({
                      ...prev,
                      tipo: value,
                      operacion: esDeduccion(value) ? 'RESTA' : 'SUMA',
                    }));
                  }}
                  disabled={inmutable}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEDUCCION_LEGAL">Deducción Legal</SelectItem>
                    <SelectItem value="DEDUCCION_VOLUNTARIA">Deducción Voluntaria</SelectItem>
                    <SelectItem value="BONIFICACION_FIJA">Bonificación Fija</SelectItem>
                    <SelectItem value="BONIFICACION_VARIABLE">Bonificación Variable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Operación */}
              <div className="space-y-2">
                <Label htmlFor="operacion">Operación</Label>
                <Select
                  value={formData.operacion}
                  onValueChange={(value: 'SUMA' | 'RESTA') =>
                    setFormData((prev) => ({ ...prev, operacion: value }))
                  }
                  disabled
                >
                  <SelectTrigger id="operacion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUMA">SUMA (+)</SelectItem>
                    <SelectItem value="RESTA">RESTA (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Cálculo */}
              <div className="space-y-2">
                <Label htmlFor="calculo">
                  Tipo de Cálculo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.calculo}
                  onValueChange={(value: 'PORCENTAJE' | 'VALOR_FIJO') =>
                    setFormData((prev) => ({ ...prev, calculo: value }))
                  }
                  disabled={inmutable}
                >
                  <SelectTrigger id="calculo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PORCENTAJE">PORCENTAJE (%)</SelectItem>
                    <SelectItem value="VALOR_FIJO">VALOR FIJO ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Valor Referencia */}
              <div className="space-y-2">
                <Label htmlFor="valorReferencia">
                  Valor Referencia <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  {formData.calculo === 'VALOR_FIJO' && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  )}
                  <Input
                    id="valorReferencia"
                    inputMode={formData.calculo === 'PORCENTAJE' ? 'decimal' : 'numeric'}
                    placeholder={formData.calculo === 'PORCENTAJE' ? '4' : '200.000'}
                    value={formData.valor_referencia}
                    onChange={(e) => {
                      const v =
                        formData.calculo === 'PORCENTAJE'
                          ? e.target.value
                          : formatThousands(parseCOP(e.target.value));
                      setFormData((prev) => ({ ...prev, valor_referencia: v }));
                    }}
                    className={formData.calculo === 'VALOR_FIJO' ? 'pl-7 pr-8' : 'pr-8'}
                  />
                  {formData.calculo === 'PORCENTAJE' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  )}
                </div>
              </div>

              {/* Base de Cálculo */}
              <div className="space-y-2">
                <Label htmlFor="baseCalculo">
                  Base de Cálculo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.base_calculo}
                  onValueChange={(value: BaseCalculo) =>
                    setFormData((prev) => ({ ...prev, base_calculo: value }))
                  }
                >
                  <SelectTrigger id="baseCalculo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Total Devengado">Total Devengado</SelectItem>
                    <SelectItem value="Salario Base">Salario Base</SelectItem>
                    <SelectItem value="SMMLV">SMMLV</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Aplica A */}
              <div className="space-y-2">
                <Label htmlFor="aplicaA">
                  Aplica A <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.aplica_a}
                  onValueChange={(value: 'FIJO' | 'VARIABLE' | 'AMBOS') =>
                    setFormData((prev) => ({ ...prev, aplica_a: value }))
                  }
                >
                  <SelectTrigger id="aplicaA">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIJO">Empleados FIJO</SelectItem>
                    <SelectItem value="VARIABLE">Empleados VARIABLE</SelectItem>
                    <SelectItem value="AMBOS">AMBOS tipos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* Obligatorio */}
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <Checkbox
                id="esObligatorio"
                checked={formData.es_obligatorio}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, es_obligatorio: checked === true }))
                }
                className="mt-0.5"
              />
              <div className="space-y-1">
                <label
                  htmlFor="esObligatorio"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Concepto obligatorio
                </label>
                <p className="text-xs text-muted-foreground">
                  Si está activo, el concepto no se puede eliminar (ej. SALUD, PENSIÓN).
                </p>
              </div>
            </div>

            {/* Preview */}
            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="pt-6">
                <h4 className="text-sm font-semibold mb-3">Resumen del Concepto</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Código:</span>
                    <span className="font-semibold">{formData.codigo || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <Badge className={getTipoColor(formData.tipo)}>
                      {TIPO_LABEL[formData.tipo]}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Operación:</span>
                    <span className="font-semibold">
                      {formData.operacion === 'SUMA' ? '+' : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cálculo:</span>
                    <span className="font-semibold">
                      {formData.calculo} de {valorPreview()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base:</span>
                    <span className="font-semibold">{formData.base_calculo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aplica a:</span>
                    <span className="font-semibold">{formData.aplica_a}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conceptos de Nómina</CardTitle>
              <CardDescription>
                Deducciones y bonificaciones que se aplican en cada nómina
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Concepto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {conceptos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="mb-2 text-lg font-semibold">No hay conceptos registrados</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comienza agregando tu primer concepto de nómina
              </p>
              <Button onClick={() => handleOpenModal()}>
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
                          {TIPO_LABEL[concepto.tipo].split(' ')[0]}
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
                            onClick={() => handleOpenModal(concepto)}
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
    </>
  );
}
