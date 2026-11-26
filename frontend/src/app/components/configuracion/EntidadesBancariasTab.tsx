import { useEffect, useState } from 'react';
import { ConfigSection, ConfigEmpty, ConfigRowActions } from './ConfigSection';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { TabLoadingGate } from './TabLoadingGate';
import {
  configuracionApi,
  type EntidadBancaria,
} from '../../../api/configuracion';

const FORM_VACIO = { nombre: '', codigo: '', contacto: '' };

/** Catálogo inicial de bancos colombianos sembrado en background si el tenant
 *  no tiene entidades bancarias todavía. Códigos oficiales Superfinanciera. */
const BANCOS_DEFAULT: Array<{ nombre: string; codigo: string }> = [
  { nombre: 'Banco de Bogotá',          codigo: '001' },
  { nombre: 'Banco Popular',            codigo: '002' },
  { nombre: 'Bancolombia',              codigo: '007' },
  { nombre: 'Citibank',                 codigo: '009' },
  { nombre: 'Banco GNB Sudameris',      codigo: '012' },
  { nombre: 'BBVA Colombia',            codigo: '013' },
  { nombre: 'Banco de Occidente',       codigo: '023' },
  { nombre: 'Banco Caja Social',        codigo: '032' },
  { nombre: 'Banco Agrario',            codigo: '040' },
  { nombre: 'Banco Davivienda',         codigo: '051' },
  { nombre: 'Banco AV Villas',          codigo: '052' },
  { nombre: 'Banco Pichincha',          codigo: '060' },
  { nombre: 'Bancoomeva',               codigo: '061' },
  { nombre: 'Banco Falabella',          codigo: '062' },
  { nombre: 'Banco Finandina',          codigo: '063' },
  { nombre: 'Banco Cooperativo Coopcentral', codigo: '066' },
  { nombre: 'Banco Mundo Mujer',        codigo: '069' },
  { nombre: 'Bancamía',                 codigo: '070' },
  { nombre: 'Banco WWB',                codigo: '083' },
  { nombre: 'Banco Serfinanza',         codigo: '085' },
  { nombre: 'Banco Itaú',               codigo: '014' },
  { nombre: 'Scotiabank Colpatria',     codigo: '019' },
  { nombre: 'Nequi',                    codigo: '507' },
];

export function EntidadesBancariasTab() {
  const [entidades, setEntidades] = useState<EntidadBancaria[]>([]);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [entidadEdit, setEntidadEdit] = useState<EntidadBancaria | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await configuracionApi.entidadesBancarias.listar({ per_page: 100 });
        if (cancelado) return;
        if ((res.data ?? []).length > 0) {
          setEntidades(res.data);
          setLoading(false);
          return;
        }
        // Lista vacía → sembramos los bancos colombianos en background.
        const creados: EntidadBancaria[] = [];
        for (const b of BANCOS_DEFAULT) {
          try {
            const r = await configuracionApi.entidadesBancarias.crear({
              nombre: b.nombre,
              codigo: b.codigo,
            });
            creados.push(r.data);
          } catch { /* skip duplicados / fallos puntuales */ }
        }
        if (!cancelado) {
          setEntidades(creados);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelado) {
          toast.error(e?.message ?? 'No se pudieron cargar las entidades bancarias');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const handleOpenModal = (entidad?: EntidadBancaria) => {
    if (entidad) {
      setEntidadEdit(entidad);
      setFormData({
        nombre: entidad.nombre,
        codigo: entidad.codigo ?? '',
        contacto: entidad.contacto ?? '',
      });
    } else {
      setEntidadEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error('Ingresa el nombre de la entidad bancaria');
      return;
    }

    try {
      const payload = {
        nombre: formData.nombre.trim(),
        codigo: formData.codigo.trim() || null,
        contacto: formData.contacto.trim() || null,
      };
      if (entidadEdit) {
        const res = await configuracionApi.entidadesBancarias.editar(entidadEdit.id, payload);
        setEntidades((prev) => prev.map((e) => (e.id === entidadEdit.id ? res.data : e)));
        toast.success('Entidad bancaria actualizada');
      } else {
        const res = await configuracionApi.entidadesBancarias.crear(payload);
        setEntidades((prev) => [...prev, res.data]);
        toast.success('Entidad bancaria agregada correctamente');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la entidad bancaria');
      }
    }
  };

  const eliminarEntidad = (entidad: EntidadBancaria) => {
    confirmDelete({
      title: 'Eliminar entidad bancaria',
      description: `¿Estás seguro de eliminar "${entidad.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await configuracionApi.entidadesBancarias.eliminar(entidad.id);
          setEntidades((prev) => prev.filter((e) => e.id !== entidad.id));
          toast.success('Entidad bancaria eliminada correctamente');
        } catch (e: any) {
          toast.error(e?.message ?? 'No se pudo eliminar la entidad bancaria');
        }
      },
    });
  };

  return (
    <>
      {ConfirmDeleteDialog}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entidadEdit ? 'Editar entidad bancaria' : 'Nueva entidad bancaria'}
            </DialogTitle>
            <DialogDescription>
              Banco o entidad financiera con la que se pagan los colaboradores.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre de la entidad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Bancolombia"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo">Código bancario (opcional)</Label>
              <Input
                id="codigo"
                placeholder="001"
                value={formData.codigo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, codigo: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contacto">Contacto (opcional)</Label>
              <Input
                id="contacto"
                placeholder="01-8000-912345"
                value={formData.contacto}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, contacto: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TabLoadingGate loading={loading} message="Cargando entidades bancarias…">
      <ConfigSection
        title="Entidades bancarias"
        description="Bancos y entidades financieras."
        flush
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus strokeWidth={2} />
            Nueva entidad
          </Button>
        }
      >
        {entidades.length === 0 ? (
          <ConfigEmpty
            title="Sin entidades bancarias"
            description="Agrega los bancos con los que pagas a los colaboradores."
            action={
              <Button onClick={() => handleOpenModal()}>
                <Plus strokeWidth={2} />
                Agregar entidad
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Entidad</TableHead>
                <TableHead className="hidden sm:table-cell">Código</TableHead>
                <TableHead className="hidden sm:table-cell">Contacto</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...entidades]
                .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' }))
                .map((entidad) => (
                  <TableRow key={entidad.id}>
                    <TableCell className="pl-5">
                      <span className="font-semibold text-foreground">{entidad.nombre}</span>
                      <span className="block text-xs text-muted-foreground sm:hidden">
                        {[entidad.codigo && `Código ${entidad.codigo}`, entidad.contacto]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </TableCell>
                    <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                      {entidad.codigo || '—'}
                    </TableCell>
                    <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                      {entidad.contacto || '—'}
                    </TableCell>
                    <TableCell className="pr-3 text-right">
                      <ConfigRowActions
                        label={entidad.nombre}
                        onEdit={() => handleOpenModal(entidad)}
                        onDelete={() => eliminarEntidad(entidad)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </ConfigSection>
      </TabLoadingGate>
    </>
  );
}
