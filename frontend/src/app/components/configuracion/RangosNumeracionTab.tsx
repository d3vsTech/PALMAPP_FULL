/**
 * RangosNumeracionTab — configuración de rangos de numeración manual para
 * documentos del módulo Viajes (§18 API_PARAMETRICAS.md).
 *
 * Cada rango define: `tipo_documento` + `prefijo` + `numero_desde` +
 * `numero_hasta` + `numero_actual` + `descripcion` + `estado`.
 *
 * Reglas (§18):
 *  - `tipo_documento` y `prefijo` son INMUTABLES tras crear.
 *  - `numero_actual` no se puede editar si el rango tiene viajes activos
 *    (backend responde 409 `RANGO_CON_VIAJES`).
 *  - `DELETE` es soft (marca `estado = false`).
 *  - El uso del rango en viajes es OPCIONAL — si un viaje no incluye
 *    `rango_numeracion_id`, el backend usa el formato automático
 *    `REM-{YYYY}-{NNN}`.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
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
import { Switch } from '../ui/switch';
import { Plus, Edit, Search, X, Info, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import {
  rangosNumeracionApi,
  RangosNumeracionErrorCodes,
  type RangoNumeracion,
  type TipoDocumentoRango,
} from '../../../api/rangosNumeracion';

// ── Tipos ────────────────────────────────────────────────────────────────

interface FormState {
  prefijo: string;
  numero_desde: string;
  numero_hasta: string;
  numero_actual: string;
  descripcion: string;
}

const FORM_VACIO: FormState = {
  prefijo: '',
  numero_desde: '1',
  numero_hasta: '',
  numero_actual: '1',
  descripcion: '',
};

// Tamaño de página fijo: la tabla siempre pagina de a 10 filas. Antes había
// un dropdown "Mostrar N registros" pero el volumen típico por finca es tan
// bajo (< 20 rangos) que ese selector no aportaba nada.
const PAGE_SIZE = 10;

// Único tipo de documento manejado por este módulo. La UI ya no muestra
// selector: se persiste `tipo_documento: 'REMISION'` fijo por default.
const TIPO_DOCUMENTO_FIJO: TipoDocumentoRango = 'REMISION';

export function RangosNumeracionTab() {
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  // ── Estado ─────────────────────────────────────────────────────────────
  // Fuente de verdad: backend §18. Cargamos el listado con
  // `rangosNumeracionApi.listar()` al montar y tras cada mutación exitosa.
  const [rangos, setRangos] = useState<RangoNumeracion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toggleandoId, setToggleandoId] = useState<number | null>(null);

  const recargar = async () => {
    setCargando(true);
    try {
      // Pedimos hasta 100 rangos — la UI hace filtrado y paginación local
      // porque el volumen típico es muy pequeño (< 20 por finca).
      // `estado` sin valor trae activos e inactivos.
      const res = await rangosNumeracionApi.listar({ per_page: 100 });
      setRangos(res.data ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudieron cargar los rangos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void recargar();
  }, []);

  // Filtros — solo por prefijo (el único tipo manejado es Remisión).
  const [filtroPrefijoInput, setFiltroPrefijoInput] = useState('');
  const [filtroPrefijo, setFiltroPrefijo] = useState('');

  // Paginación
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;

  // Modal crear / editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<RangoNumeracion | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [erroresForm, setErroresForm] = useState<Partial<Record<keyof FormState, string>>>({});
  // Autofill: mientras el usuario NO haya editado manualmente el "Número
  // Actual", debe reflejar el valor de "Número Desde". Se marca `true` en
  // cuanto el usuario escribe en el input de Número Actual.
  const [numeroActualTocado, setNumeroActualTocado] = useState(false);

  // ── Filtrado ───────────────────────────────────────────────────────────
  const rangosFiltrados = useMemo(() => {
    return rangos.filter((r) => {
      if (filtroPrefijo.trim()) {
        const q = filtroPrefijo.trim().toLowerCase();
        if (!r.prefijo.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rangos, filtroPrefijo]);

  const totalPaginas = Math.max(1, Math.ceil(rangosFiltrados.length / pageSize));
  const pageSafe = Math.min(page, totalPaginas);
  const rangosPagina = rangosFiltrados.slice(
    (pageSafe - 1) * pageSize,
    pageSafe * pageSize,
  );

  const buscar = () => {
    setFiltroPrefijo(filtroPrefijoInput);
    setPage(1);
  };

  const limpiarFiltros = () => {
    setFiltroPrefijoInput('');
    setFiltroPrefijo('');
    setPage(1);
  };

  // ── Modal ──────────────────────────────────────────────────────────────
  const abrirCrear = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setErroresForm({});
    // Al crear, arrancamos con el flag apagado para que el "Número Actual"
    // siga a "Número Desde" hasta que el usuario decida cambiarlo.
    setNumeroActualTocado(false);
    setModalAbierto(true);
  };

  const abrirEditar = (r: RangoNumeracion) => {
    setEditando(r);
    setForm({
      prefijo: r.prefijo,
      numero_desde: String(r.numero_desde),
      numero_hasta: String(r.numero_hasta),
      numero_actual: String(r.numero_actual),
      descripcion: r.descripcion ?? '',
    });
    setErroresForm({});
    // En edición el valor ya viene decidido por el usuario, no queremos
    // que cambiar "Número Desde" lo sobrescriba.
    setNumeroActualTocado(true);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
    setForm(FORM_VACIO);
    setErroresForm({});
    setNumeroActualTocado(false);
  };

  const setCampo = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    if (erroresForm[k]) setErroresForm((prev) => ({ ...prev, [k]: undefined }));
  };

  const validar = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.prefijo.trim()) errs.prefijo = 'El prefijo es obligatorio';

    const desde = parseInt(form.numero_desde);
    const hasta = parseInt(form.numero_hasta);
    const actual = parseInt(form.numero_actual);

    if (!Number.isFinite(desde) || desde < 1) errs.numero_desde = 'Debe ser un número mayor a 0';
    if (!Number.isFinite(hasta) || hasta < 1) errs.numero_hasta = 'Debe ser un número mayor a 0';
    if (Number.isFinite(desde) && Number.isFinite(hasta) && hasta < desde) {
      errs.numero_hasta = 'Debe ser mayor o igual al número desde';
    }
    if (!Number.isFinite(actual) || actual < 1) errs.numero_actual = 'Debe ser un número mayor a 0';
    if (
      Number.isFinite(desde) && Number.isFinite(hasta) && Number.isFinite(actual)
      && (actual < desde || actual > hasta)
    ) {
      errs.numero_actual = 'Debe estar entre el número desde y el número hasta';
    }

    setErroresForm(errs);
    return Object.keys(errs).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);

    // Nota §18: `tipo_documento` y `prefijo` son inmutables tras crear;
    // en edición solo enviamos los campos que la API acepta.
    try {
      if (editando) {
        const res = await rangosNumeracionApi.editar(editando.id, {
          numero_hasta: parseInt(form.numero_hasta),
          numero_actual: parseInt(form.numero_actual),
          descripcion: form.descripcion.trim() || null,
        });
        setRangos((prev) =>
          prev.map((r) => (r.id === editando.id ? res.data : r)),
        );
        toast.success('Rango actualizado correctamente');
      } else {
        const res = await rangosNumeracionApi.crear({
          tipo_documento: TIPO_DOCUMENTO_FIJO,
          prefijo: form.prefijo.trim().toUpperCase(),
          numero_desde: parseInt(form.numero_desde),
          numero_hasta: parseInt(form.numero_hasta),
          numero_actual: parseInt(form.numero_actual),
          descripcion: form.descripcion.trim() || null,
        });
        setRangos((prev) => [...prev, res.data]);
        toast.success('Rango creado correctamente');
      }
      cerrarModal();
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === RangosNumeracionErrorCodes.RANGO_PREFIJO_DUPLICADO) {
        // El backend enforcing `unique(tenant_id, prefijo)`.
        setErroresForm((prev) => ({
          ...prev,
          prefijo: 'Ya existe un rango con este prefijo',
        }));
        toast.error(`Ya existe un rango con el prefijo "${form.prefijo.trim().toUpperCase()}"`);
      } else if (code === RangosNumeracionErrorCodes.RANGO_CON_VIAJES) {
        // Solo aparece al editar `numero_actual` de un rango con viajes
        // ya emitidos (no se permite manipular consecutivos usados).
        setErroresForm((prev) => ({
          ...prev,
          numero_actual: 'El rango ya tiene viajes emitidos, no se puede cambiar el consecutivo',
        }));
        toast.error('No se puede modificar el consecutivo: el rango ya tiene viajes emitidos');
      } else {
        toast.error(err?.message ?? 'No se pudo guardar el rango');
      }
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (r: RangoNumeracion) => {
    // PUT con solo `estado` — el backend valida y actualiza. No usamos
    // DELETE porque queremos poder reactivar el rango después (los soft
    // deletes solo aceptan un solo estado de baja).
    setToggleandoId(r.id);
    const nuevoEstado = !r.estado;
    try {
      const res = await rangosNumeracionApi.editar(r.id, { estado: nuevoEstado });
      setRangos((prev) => prev.map((x) => (x.id === r.id ? res.data : x)));
      toast.success(nuevoEstado ? 'Rango activado' : 'Rango desactivado');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo cambiar el estado del rango');
    } finally {
      setToggleandoId(null);
    }
  };

  const eliminarRango = (r: RangoNumeracion) => {
    confirmDelete({
      title: '¿Eliminar rango de numeración?',
      description: `Se inactivará el rango "${r.prefijo}". Los viajes ya emitidos con este rango conservan su remisión.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await rangosNumeracionApi.eliminar(r.id);
          // §18: DELETE es soft — marca `estado = false`. Refrescamos con
          // el listado para reflejar el cambio en el switch de la fila.
          await recargar();
          toast.success('Rango inactivado');
        } catch (err: any) {
          const code = err?.code ?? '';
          if (code === RangosNumeracionErrorCodes.RANGO_CON_VIAJES) {
            toast.error(
              'No se puede eliminar: el rango tiene viajes activos asociados. Puedes desactivarlo con el switch en su lugar.',
            );
          } else {
            toast.error(err?.message ?? 'No se pudo eliminar el rango');
          }
        }
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {ConfirmDeleteDialog}

      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rangos de numeración manual</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configura los prefijos y consecutivos de remisiones y notas
                asociadas a los viajes.
              </p>
            </div>
            <Button onClick={abrirCrear}>
              <Plus className="mr-2 h-4 w-4" />
              Crear nuevo
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Filtros — solo por prefijo (único tipo = Remisión).
              Input + botón "Buscar" en la misma fila para un layout compacto. */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Filtro de búsqueda
            </h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="filtro-prefijo" className="text-sm">
                  Prefijo
                </Label>
                <Input
                  id="filtro-prefijo"
                  value={filtroPrefijoInput}
                  onChange={(e) => setFiltroPrefijoInput(e.target.value)}
                  placeholder="Escribe un prefijo…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') buscar();
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={buscar} variant="outline" className="gap-2">
                  <Search className="h-4 w-4" />
                  Buscar
                </Button>
                {filtroPrefijo && (
                  <Button variant="ghost" onClick={limpiarFiltros} className="gap-2">
                    <X className="h-4 w-4" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[80px] text-center">Nro.</TableHead>
                  <TableHead>Prefijo</TableHead>
                  <TableHead className="text-center">Número Desde</TableHead>
                  <TableHead className="text-center">Número Hasta</TableHead>
                  <TableHead className="text-center">Número Actual</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando rangos…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rangosPagina.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      {rangos.length === 0
                        ? 'Aún no has creado ningún rango de numeración.'
                        : 'No hay resultados para los filtros aplicados.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  rangosPagina.map((r, idx) => (
                    <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {(pageSafe - 1) * pageSize + idx + 1}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{r.prefijo}</TableCell>
                      <TableCell className="text-center text-sm">{r.numero_desde}</TableCell>
                      <TableCell className="text-center text-sm">{r.numero_hasta}</TableCell>
                      <TableCell className="text-center text-sm font-medium text-primary">
                        {r.numero_actual}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex items-center gap-2 mr-2">
                            <Switch
                              checked={r.estado}
                              onCheckedChange={() => toggleActivo(r)}
                              disabled={toggleandoId === r.id}
                              aria-label={r.estado ? 'Desactivar rango' : 'Activar rango'}
                            />
                            <span className={`text-xs font-medium ${r.estado ? 'text-success' : 'text-muted-foreground'}`}>
                              {r.estado ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Editar rango"
                            onClick={() => abrirEditar(r)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Eliminar rango"
                            onClick={() => eliminarRango(r)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {rangosFiltrados.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
              <p className="text-muted-foreground">
                Mostrando registros del{' '}
                <span className="font-medium text-foreground">
                  {(pageSafe - 1) * pageSize + 1}
                </span>{' '}
                al{' '}
                <span className="font-medium text-foreground">
                  {Math.min(pageSafe * pageSize, rangosFiltrados.length)}
                </span>{' '}
                de{' '}
                <span className="font-medium text-foreground">
                  {rangosFiltrados.length}
                </span>
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe === 1}
                >
                  Anterior
                </Button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <Button
                    key={n}
                    variant={n === pageSafe ? 'default' : 'ghost'}
                    size="sm"
                    className="min-w-[36px]"
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pageSafe === totalPaginas}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal crear / editar */}
      <Dialog open={modalAbierto} onOpenChange={(o) => (o ? null : cerrarModal())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando ? 'Editar Rango de Numeración' : 'Crear nuevo Rango de Numeración'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="prefijo" className="text-sm">
                Prefijo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="prefijo"
                value={form.prefijo}
                onChange={(e) => setCampo('prefijo', e.target.value.toUpperCase())}
                placeholder="Ej: R-A"
                maxLength={20}
                disabled={!!editando}
                className={`${erroresForm.prefijo ? 'border-destructive' : ''} ${editando ? 'bg-muted/40' : ''}`}
              />
              {editando ? (
                <p className="text-xs text-muted-foreground">
                  El prefijo no se puede modificar después de crear el rango.
                </p>
              ) : null}
              {erroresForm.prefijo && (
                <p className="text-xs text-destructive">{erroresForm.prefijo}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="numero-desde" className="text-sm">
                  Número Desde <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="numero-desde"
                  type="number"
                  min={1}
                  value={form.numero_desde}
                  disabled={!!editando}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCampo('numero_desde', v);
                    // Autofill: si el usuario aún no editó "Número Actual"
                    // manualmente, lo mantenemos sincronizado con "Desde".
                    if (!numeroActualTocado) {
                      setCampo('numero_actual', v);
                    }
                  }}
                  className={`${erroresForm.numero_desde ? 'border-destructive' : ''} ${editando ? 'bg-muted/40' : ''}`}
                />
                {erroresForm.numero_desde && (
                  <p className="text-xs text-destructive">{erroresForm.numero_desde}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="numero-hasta" className="text-sm">
                  Número Hasta <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="numero-hasta"
                  type="number"
                  min={1}
                  value={form.numero_hasta}
                  onChange={(e) => setCampo('numero_hasta', e.target.value)}
                  className={erroresForm.numero_hasta ? 'border-destructive' : ''}
                />
                {erroresForm.numero_hasta && (
                  <p className="text-xs text-destructive">{erroresForm.numero_hasta}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="numero-actual" className="text-sm">
                Número Actual <span className="text-destructive">*</span>
              </Label>
              <Input
                id="numero-actual"
                type="number"
                min={1}
                value={form.numero_actual}
                onChange={(e) => {
                  // El usuario toca el campo: dejamos de sincronizarlo
                  // automáticamente con "Número Desde".
                  setNumeroActualTocado(true);
                  setCampo('numero_actual', e.target.value);
                }}
                className={erroresForm.numero_actual ? 'border-destructive' : ''}
              />
              {erroresForm.numero_actual && (
                <p className="text-xs text-destructive">{erroresForm.numero_actual}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Consecutivo que se asignará al próximo documento.
                {editando && ' Si el rango ya tiene viajes emitidos, el backend rechaza el cambio.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion" className="text-sm">
                Descripción
              </Label>
              <Input
                id="descripcion"
                value={form.descripcion}
                onChange={(e) => setCampo('descripcion', e.target.value)}
                placeholder="Nota interna sobre el uso del rango"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">Opcional. Máximo 200 caracteres.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cerrarModal} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              onClick={guardar}
              disabled={guardando}
              className="bg-success hover:bg-success/90 gap-2"
            >
              {guardando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
