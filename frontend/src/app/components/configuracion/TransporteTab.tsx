import { useEffect, useState } from 'react';
import { cached } from '../../../api/cache';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Edit, Building2, User, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
  empresasTransportadorasApi,
  transportadoresApi,
  type EmpresaTransportadora,
  type Transportador,
} from '../../../api/viajes';

type EmpresaConContador = EmpresaTransportadora & { transportadores_count?: number };

const FORM_EMPRESA_VACIO = {
  tipo_persona: 'JURIDICA' as 'JURIDICA' | 'NATURAL',
  razon_social: '',
  nit: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  email: '',
  contacto_nombre: '',
  observaciones: '',
};

const FORM_CONDUCTOR_VACIO = {
  empresa_transportadora_id: '',
  nombres: '',
  apellidos: '',
  numero_documento: '',
  telefono: '',
  placa_vehiculo: '',
};

export function TransporteTab() {
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const [empresas, setEmpresas] = useState<EmpresaConContador[]>([]);
  const [conductores, setConductores] = useState<Transportador[]>([]);
  const [loading, setLoading] = useState(true);

  const [empresasExpandidas, setEmpresasExpandidas] = useState<number[]>([]);
  const [openModalEmpresa, setOpenModalEmpresa] = useState(false);
  const [openModalConductor, setOpenModalConductor] = useState(false);
  const [empresaEdit, setEmpresaEdit] = useState<EmpresaTransportadora | null>(null);
  const [conductorEdit, setConductorEdit] = useState<Transportador | null>(null);

  const [formEmpresa, setFormEmpresa] = useState(FORM_EMPRESA_VACIO);
  const [formConductor, setFormConductor] = useState(FORM_CONDUCTOR_VACIO);

  const cargarEmpresas = () => {
    empresasTransportadorasApi
      .listar({ per_page: 100, with_transportadores_count: true })
      .then((res) => setEmpresas(res.data as EmpresaConContador[]))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las empresas'));
  };

  const cargarConductores = () => {
    transportadoresApi
      .listar({ per_page: 100 })
      .then((res) => setConductores(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los conductores'));
  };

  useEffect(() => {
    // Cargo empresas + conductores en paralelo; loading se apaga cuando ambos terminen.
    Promise.allSettled([
      cached('config:transporte-empresas', () => empresasTransportadorasApi.listar({ per_page: 100, with_transportadores_count: true }))
        .then((res) => setEmpresas(res.data as EmpresaConContador[])),
      cached('config:transporte-conductores', () => transportadoresApi.listar({ per_page: 100 }))
        .then((res) => setConductores(res.data)),
    ]).finally(() => setLoading(false));
  }, []);

  // Toggle expandir/contraer empresa
  const toggleEmpresa = (empresaId: number) => {
    setEmpresasExpandidas((prev) =>
      prev.includes(empresaId)
        ? prev.filter((id) => id !== empresaId)
        : [...prev, empresaId],
    );
  };

  // Funciones para Empresas
  const handleOpenModalEmpresa = (empresa?: EmpresaTransportadora) => {
    if (empresa) {
      setEmpresaEdit(empresa);
      setFormEmpresa({
        tipo_persona: empresa.tipo_persona ?? 'JURIDICA',
        razon_social: empresa.razon_social ?? '',
        nit: empresa.nit ?? '',
        telefono: empresa.telefono ?? '',
        direccion: empresa.direccion ?? '',
        ciudad: empresa.ciudad ?? '',
        email: empresa.email ?? '',
        contacto_nombre: empresa.contacto_nombre ?? '',
        observaciones: empresa.observaciones ?? '',
      });
    } else {
      setEmpresaEdit(null);
      setFormEmpresa(FORM_EMPRESA_VACIO);
    }
    setOpenModalEmpresa(true);
  };

  const handleSaveEmpresa = async () => {
    if (!formEmpresa.razon_social.trim()) {
      toast.error('Ingresa el nombre de la empresa');
      return;
    }
    if (!formEmpresa.nit.trim()) {
      toast.error('Ingresa el NIT de la empresa');
      return;
    }

    try {
      const payload: Partial<EmpresaTransportadora> = {
        tipo_persona: formEmpresa.tipo_persona,
        razon_social: formEmpresa.razon_social.trim(),
        nit: formEmpresa.nit.trim(),
        telefono: formEmpresa.telefono.trim() || null,
        direccion: formEmpresa.direccion.trim() || null,
        ciudad: formEmpresa.ciudad.trim() || null,
        email: formEmpresa.email.trim() || null,
        contacto_nombre: formEmpresa.contacto_nombre.trim() || null,
        observaciones: formEmpresa.observaciones.trim() || null,
      };

      if (empresaEdit) {
        const res = await empresasTransportadorasApi.editar(empresaEdit.id, payload);
        setEmpresas((prev) =>
          prev.map((e) =>
            e.id === empresaEdit.id
              ? { ...e, ...res.data, transportadores_count: e.transportadores_count }
              : e,
          ),
        );
        toast.success('Empresa actualizada');
      } else {
        const res = await empresasTransportadorasApi.crear(payload);
        setEmpresas((prev) => [...prev, { ...res.data, transportadores_count: 0 }]);
        toast.success('Empresa agregada correctamente');
      }
      setOpenModalEmpresa(false);
    } catch (e: any) {
      if (e?.errors?.nit) {
        toast.error(e.errors.nit[0] ?? 'Ya existe una empresa con este NIT');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else if (e?.message?.toLowerCase().includes('nit')) {
        toast.error('Ya existe una empresa con este NIT');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la empresa');
      }
    }
  };

  const eliminarEmpresa = (empresa: EmpresaConContador) => {
    if ((empresa.transportadores_count ?? 0) > 0) {
      toast.error('No puedes eliminar una empresa con conductores asociados');
      return;
    }

    confirmDelete({
      title: 'Eliminar empresa',
      description: `¿Estás seguro de eliminar "${empresa.razon_social}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await empresasTransportadorasApi.eliminar(empresa.id);
          setEmpresas((prev) => prev.filter((e) => e.id !== empresa.id));
          toast.success('Empresa eliminada correctamente');
        } catch (e: any) {
          toast.error(e?.message ?? 'No se pudo eliminar la empresa');
        }
      },
    });
  };

  // Funciones para Conductores
  const handleOpenModalConductor = (empresaId: number, conductor?: Transportador) => {
    if (conductor) {
      setConductorEdit(conductor);
      setFormConductor({
        empresa_transportadora_id: String(conductor.empresa_transportadora_id),
        nombres: conductor.nombres ?? '',
        apellidos: conductor.apellidos ?? '',
        numero_documento: conductor.numero_documento ?? '',
        telefono: conductor.telefono ?? '',
        placa_vehiculo: conductor.placa_vehiculo ?? '',
      });
    } else {
      setConductorEdit(null);
      setFormConductor({ ...FORM_CONDUCTOR_VACIO, empresa_transportadora_id: String(empresaId) });
    }
    setOpenModalConductor(true);
  };

  const handleSaveConductor = async () => {
    if (!formConductor.nombres.trim() || !formConductor.apellidos.trim()) {
      toast.error('Nombres y apellidos son obligatorios');
      return;
    }
    if (!formConductor.empresa_transportadora_id) {
      toast.error('Selecciona una empresa');
      return;
    }

    try {
      const payload: Partial<Transportador> = {
        empresa_transportadora_id: Number(formConductor.empresa_transportadora_id),
        nombres: formConductor.nombres.trim(),
        apellidos: formConductor.apellidos.trim(),
        tipo_documento: 'CC',
        numero_documento: formConductor.numero_documento.trim() || null,
        telefono: formConductor.telefono.trim() || null,
        placa_vehiculo: formConductor.placa_vehiculo.trim(),
      };

      if (conductorEdit) {
        const res = await transportadoresApi.editar(conductorEdit.id, payload);
        setConductores((prev) => prev.map((c) => (c.id === conductorEdit.id ? res.data : c)));
        toast.success('Conductor actualizado');
      } else {
        const res = await transportadoresApi.crear(payload);
        setConductores((prev) => [...prev, res.data]);
        toast.success('Conductor agregado correctamente');
      }
      setOpenModalConductor(false);
      cargarEmpresas();
    } catch (e: any) {
      if (e?.errors?.placa_vehiculo) {
        toast.error(e.errors.placa_vehiculo[0] ?? 'Ya existe un conductor con esta placa');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else if (e?.message?.toLowerCase().includes('placa')) {
        toast.error('Ya existe un conductor con esta placa');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el conductor');
      }
    }
  };

  const eliminarConductor = (conductor: Transportador) => {
    confirmDelete({
      title: 'Eliminar conductor',
      description: `¿Estás seguro de eliminar a "${conductor.nombres} ${conductor.apellidos}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await transportadoresApi.eliminar(conductor.id);
          setConductores((prev) => prev.filter((c) => c.id !== conductor.id));
          toast.success('Conductor eliminado correctamente');
          cargarEmpresas();
        } catch (e: any) {
          toast.error(e?.message ?? 'No se pudo eliminar el conductor');
        }
      },
    });
  };

  // Obtener conductores de una empresa
  const getConductoresPorEmpresa = (empresaId: number) => {
    return conductores.filter((c) => c.empresa_transportadora_id === empresaId);
  };

  return (
    <>
      {ConfirmDeleteDialog}

      {/* Modal Empresa */}
      <Dialog open={openModalEmpresa} onOpenChange={setOpenModalEmpresa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {empresaEdit ? 'Editar Empresa de Transporte' : 'Nueva Empresa de Transporte'}
            </DialogTitle>
            <DialogDescription>
              Compañía de transporte de carga
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">
                Tipo <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formEmpresa.tipo_persona}
                onValueChange={(value: 'JURIDICA' | 'NATURAL') =>
                  setFormEmpresa((prev) => ({ ...prev, tipo_persona: value }))
                }
              >
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JURIDICA">Persona Jurídica</SelectItem>
                  <SelectItem value="NATURAL">Persona Natural</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formEmpresa.tipo_persona === 'JURIDICA' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nombre-empresa">
                    Nombre de la Empresa <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombre-empresa"
                    placeholder="Ej: Transportes del Valle S.A.S."
                    value={formEmpresa.razon_social}
                    onChange={(e) =>
                      setFormEmpresa((prev) => ({ ...prev, razon_social: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nit">
                    NIT <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nit"
                    placeholder="900.111.222-1"
                    value={formEmpresa.nit}
                    onChange={(e) =>
                      setFormEmpresa((prev) => ({ ...prev, nit: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contacto-empresa">Contacto</Label>
                  <Input
                    id="contacto-empresa"
                    placeholder="+57 300 444 5555"
                    value={formEmpresa.telefono}
                    onChange={(e) =>
                      setFormEmpresa((prev) => ({ ...prev, telefono: e.target.value }))
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nombre-natural">
                    Nombre Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombre-natural"
                    placeholder="Ej: Juan Pérez García"
                    value={formEmpresa.razon_social}
                    onChange={(e) =>
                      setFormEmpresa((prev) => ({ ...prev, razon_social: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cedula">
                    Cédula / NIT <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cedula"
                    placeholder="16.123.456"
                    value={formEmpresa.nit}
                    onChange={(e) =>
                      setFormEmpresa((prev) => ({ ...prev, nit: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="razon-social">Razón Social / Nombre Comercial</Label>
                  <Input
                    id="razon-social"
                    placeholder="Ej: Transporte JP"
                    value={formEmpresa.contacto_nombre}
                    onChange={(e) =>
                      setFormEmpresa((prev) => ({ ...prev, contacto_nombre: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="celular-natural">Celular</Label>
                  <Input
                    id="celular-natural"
                    placeholder="+57 300 555 6666"
                    value={formEmpresa.telefono}
                    onChange={(e) =>
                      setFormEmpresa((prev) => ({ ...prev, telefono: e.target.value }))
                    }
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModalEmpresa(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmpresa}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Conductor */}
      <Dialog open={openModalConductor} onOpenChange={setOpenModalConductor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {conductorEdit ? 'Editar Conductor' : 'Nuevo Conductor'}
            </DialogTitle>
            <DialogDescription>
              Conductor y su vehículo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="empresa_transportadora_id">
                Empresa de Transporte <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formConductor.empresa_transportadora_id}
                onValueChange={(value) =>
                  setFormConductor((prev) => ({ ...prev, empresa_transportadora_id: value }))
                }
              >
                <SelectTrigger id="empresa_transportadora_id">
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={String(empresa.id)}>
                      {empresa.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombres-conductor">
                  Nombres <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombres-conductor"
                  placeholder="Ej: Carlos"
                  value={formConductor.nombres}
                  onChange={(e) =>
                    setFormConductor((prev) => ({ ...prev, nombres: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apellidos-conductor">
                  Apellidos <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="apellidos-conductor"
                  placeholder="Ej: Martínez"
                  value={formConductor.apellidos}
                  onChange={(e) =>
                    setFormConductor((prev) => ({ ...prev, apellidos: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cedula-conductor">Cédula</Label>
              <Input
                id="cedula-conductor"
                placeholder="16.123.456"
                value={formConductor.numero_documento}
                onChange={(e) =>
                  setFormConductor((prev) => ({ ...prev, numero_documento: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                placeholder="+57 300 777 8888"
                value={formConductor.telefono}
                onChange={(e) =>
                  setFormConductor((prev) => ({ ...prev, telefono: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="placa">Placa del Vehículo</Label>
              <Input
                id="placa"
                placeholder="ABC-123"
                value={formConductor.placa_vehiculo}
                onChange={(e) =>
                  setFormConductor((prev) => ({ ...prev, placa_vehiculo: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModalConductor(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConductor}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TabLoadingGate loading={loading} message="Cargando transporte…">
      {/* Empresas de Transporte con Conductores */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transportadores</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Empresas de transporte y sus conductores</p>
            </div>
            <Button onClick={() => handleOpenModalEmpresa()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Empresa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {empresas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay empresas de transporte registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {empresas.map((empresa) => {
                const conductoresEmpresa = getConductoresPorEmpresa(empresa.id);
                const estaExpandida = empresasExpandidas.includes(empresa.id);
                const tipo = empresa.tipo_persona ?? 'JURIDICA';

                return (
                  <div
                    key={empresa.id}
                    className="rounded-lg border border-border bg-muted/30"
                  >
                    {/* Cabecera de la empresa */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEmpresa(empresa.id)}
                          className="h-8 w-8 p-0"
                        >
                          {estaExpandida ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{empresa.razon_social}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              tipo === 'NATURAL'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            }`}>
                              {tipo === 'NATURAL' ? 'P. Natural' : 'P. Jurídica'}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {conductoresEmpresa.length} {conductoresEmpresa.length === 1 ? 'conductor' : 'conductores'}
                            </span>
                          </div>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            {tipo === 'JURIDICA' && empresa.nit && <span>NIT: {empresa.nit}</span>}
                            {tipo === 'NATURAL' && empresa.nit && <span>CC: {empresa.nit}</span>}
                            {tipo === 'NATURAL' && empresa.contacto_nombre && <span>Razón Social: {empresa.contacto_nombre}</span>}
                            {empresa.telefono && <span>Tel: {empresa.telefono}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModalEmpresa(empresa)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarEmpresa(empresa)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Conductores (cuando está expandida) */}
                    {estaExpandida && (
                      <div className="border-t border-border bg-muted/10 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Conductores</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenModalConductor(empresa.id)}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Agregar Conductor
                          </Button>
                        </div>

                        {conductoresEmpresa.length === 0 ? (
                          <div className="text-center py-6 text-sm text-muted-foreground">
                            No hay conductores registrados para esta empresa
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {conductoresEmpresa.map((conductor) => (
                              <div
                                key={conductor.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {conductor.nombres} {conductor.apellidos}
                                  </p>
                                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                    {conductor.numero_documento && <span>CC: {conductor.numero_documento}</span>}
                                    {conductor.telefono && <span>Tel: {conductor.telefono}</span>}
                                    {conductor.placa_vehiculo && <span>Placa: {conductor.placa_vehiculo}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenModalConductor(empresa.id, conductor)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarConductor(conductor)}
                                    className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </TabLoadingGate>
    </>
  );
}
