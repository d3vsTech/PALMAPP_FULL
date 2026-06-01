import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Edit } from 'lucide-react';
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
import { extractorasApi, type Extractora } from '../../../api/viajes';
import { getDepartamentos, getMunicipios } from '../../../api/plantacion';

type DaneItem = { codigo: string; nombre: string };

const FORM_VACIO = {
  razon_social: '',
  nit: '',
  ubicacion: '',
  ciudad: '',
  departamento_codigo: '',
  municipio_codigo: '',
  telefono: '',
  telefono_fijo: '',
  email: '',
  contacto_nombre: '',
  observaciones: '',
};

export function ExtractorasTab() {
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const [extractoras, setExtractoras] = useState<Extractora[]>([]);

  const [openModal, setOpenModal] = useState(false);
  const [extractoraEdit, setExtractoraEdit] = useState<Extractora | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  // Selects encadenados Departamento → Ciudad/Municipio (DANE).
  const [departamentos, setDepartamentos] = useState<DaneItem[]>([]);
  const [municipios, setMunicipios] = useState<DaneItem[]>([]);

  useEffect(() => {
    extractorasApi
      .listar({ per_page: 100 })
      .then((res) => setExtractoras(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las extractoras'));
  }, []);

  useEffect(() => {
    getDepartamentos()
      .then((res) => setDepartamentos(res.data ?? []))
      .catch(() => { /* fallback: el select queda vacío, pero el modal sigue funcional */ });
  }, []);

  // Cuando cambia el departamento, recargar municipios.
  useEffect(() => {
    if (!formData.departamento_codigo) {
      setMunicipios([]);
      return;
    }
    getMunicipios(formData.departamento_codigo)
      .then((res) => setMunicipios(res.data ?? []))
      .catch(() => setMunicipios([]));
  }, [formData.departamento_codigo]);

  const handleOpenModal = (extractora?: Extractora) => {
    if (extractora) {
      setExtractoraEdit(extractora);
      setFormData({
        razon_social: extractora.razon_social ?? '',
        nit: extractora.nit ?? '',
        ubicacion: extractora.ubicacion ?? '',
        ciudad: extractora.ciudad ?? '',
        departamento_codigo: extractora.departamento_codigo ?? '',
        municipio_codigo: extractora.municipio_codigo ?? '',
        telefono: extractora.telefono ?? '',
        telefono_fijo: extractora.telefono_fijo ?? '',
        email: extractora.email ?? '',
        contacto_nombre: extractora.contacto_nombre ?? '',
        observaciones: extractora.observaciones ?? '',
      });
    } else {
      setExtractoraEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.razon_social.trim()) {
      toast.error('Ingresa el nombre de la extractora');
      return;
    }
    if (!formData.nit.trim()) {
      toast.error('Ingresa el NIT de la extractora');
      return;
    }

    try {
      const payload: Partial<Extractora> = {
        razon_social: formData.razon_social.trim(),
        nit: formData.nit.trim(),
        ubicacion: formData.ubicacion.trim(),
        ciudad: formData.ciudad.trim() || null,
        departamento_codigo: formData.departamento_codigo || null,
        municipio_codigo: formData.municipio_codigo || null,
        telefono: formData.telefono.trim() || null,
        telefono_fijo: formData.telefono_fijo.trim() || null,
        email: formData.email.trim() || null,
        contacto_nombre: formData.contacto_nombre.trim() || null,
        observaciones: formData.observaciones.trim() || null,
      };

      if (extractoraEdit) {
        const res = await extractorasApi.editar(extractoraEdit.id, payload);
        setExtractoras((prev) => prev.map((e) => (e.id === extractoraEdit.id ? res.data : e)));
        toast.success('Extractora actualizada');
      } else {
        const res = await extractorasApi.crear(payload);
        setExtractoras((prev) => [...prev, res.data]);
        toast.success('Extractora agregada correctamente');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors?.nit) {
        toast.error(e.errors.nit[0] ?? 'Ya existe una extractora con este NIT');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else if (e?.message?.toLowerCase().includes('nit')) {
        toast.error('Ya existe una extractora con este NIT');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la extractora');
      }
    }
  };

  const eliminarExtractora = (extractora: Extractora) => {
    confirmDelete({
      title: 'Eliminar extractora',
      description: `¿Estás seguro de eliminar "${extractora.razon_social}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await extractorasApi.eliminar(extractora.id);
          setExtractoras((prev) => prev.filter((e) => e.id !== extractora.id));
          toast.success('Extractora eliminada correctamente');
        } catch (e: any) {
          toast.error(e?.message ?? 'No se pudo eliminar la extractora');
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
              {extractoraEdit ? 'Editar Extractora' : 'Nueva Extractora'}
            </DialogTitle>
            <DialogDescription>
              Planta extractora de aceite de palma
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Información de la Empresa */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Información de la Empresa</h3>

              <div className="space-y-2">
                <Label htmlFor="razon_social">
                  Nombre de la Extractora <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="razon_social"
                  placeholder="Ej: Extractora del Cauca S.A."
                  value={formData.razon_social}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, razon_social: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nit">
                  NIT <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nit"
                  placeholder="800.123.456-1"
                  value={formData.nit}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nit: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departamento_codigo">Departamento</Label>
                  <select
                    id="departamento_codigo"
                    value={formData.departamento_codigo}
                    onChange={(e) => {
                      const codigo = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        departamento_codigo: codigo,
                        municipio_codigo: '',
                        ciudad: '',
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Seleccionar departamento...</option>
                    {departamentos.map((d) => (
                      <option key={d.codigo} value={d.codigo}>{d.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <select
                    id="ciudad"
                    value={formData.municipio_codigo}
                    onChange={(e) => {
                      const codigo = e.target.value;
                      const nombre = municipios.find((m) => m.codigo === codigo)?.nombre ?? '';
                      setFormData((prev) => ({ ...prev, municipio_codigo: codigo, ciudad: nombre }));
                    }}
                    disabled={!formData.departamento_codigo}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar ciudad...</option>
                    {municipios.map((m) => (
                      <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ubicacion">Dirección</Label>
                <Input
                  id="ubicacion"
                  placeholder="Ej: Cra 10 # 20-30"
                  value={formData.ubicacion}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ubicacion: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm text-muted-foreground">Información de Contacto</h3>

              <div className="space-y-2">
                <Label htmlFor="contacto_nombre">Contacto</Label>
                <Input
                  id="contacto_nombre"
                  placeholder="Ej: Juan Pérez"
                  value={formData.contacto_nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contacto_nombre: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Celular</Label>
                  <Input
                    id="telefono"
                    placeholder="+57 300 111 2222"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, telefono: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono_fijo">Teléfono Fijo</Label>
                  <Input
                    id="telefono_fijo"
                    placeholder="+57 (2) 123 4567"
                    value={formData.telefono_fijo}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, telefono_fijo: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contacto@extractora.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
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

      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Extractoras</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Plantas extractoras de aceite de palma</p>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Extractora
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {extractoras.map((extractora) => (
              <div
                key={extractora.id}
                className="p-4 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{extractora.razon_social}</p>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      {extractora.nit && <span>NIT: {extractora.nit}</span>}
                      {extractora.ciudad && <span>📍 {extractora.ciudad}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(extractora)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarExtractora(extractora)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Información de contacto */}
                {(extractora.contacto_nombre || extractora.telefono || extractora.email || extractora.ubicacion) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm pt-3 border-t border-border">
                    {extractora.contacto_nombre && (
                      <div>
                        <span className="text-muted-foreground">Contacto:</span>
                        <span className="ml-2 font-medium">{extractora.contacto_nombre}</span>
                      </div>
                    )}
                    {extractora.telefono && (
                      <div>
                        <span className="text-muted-foreground">Celular:</span>
                        <span className="ml-2 font-medium">{extractora.telefono}</span>
                      </div>
                    )}
                    {extractora.telefono_fijo && (
                      <div>
                        <span className="text-muted-foreground">Tel. Fijo:</span>
                        <span className="ml-2 font-medium">{extractora.telefono_fijo}</span>
                      </div>
                    )}
                    {extractora.email && (
                      <div>
                        <span className="text-muted-foreground">Correo:</span>
                        <span className="ml-2 font-medium">{extractora.email}</span>
                      </div>
                    )}
                    {extractora.ubicacion && (
                      <div className="md:col-span-2">
                        <span className="text-muted-foreground">Dirección:</span>
                        <span className="ml-2 font-medium">{extractora.ubicacion}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
