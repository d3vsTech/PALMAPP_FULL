import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  marketProveedoresAdminApi,
  type Departamento,
  type Municipio,
} from '../../../api/marketProveedoresAdmin';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';

export interface ProveedorFormData {
  nombre_empresa: string;
  nit: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  descripcion: string;
  logo_url: string;
}

const FORM_VACIO: ProveedorFormData = {
  nombre_empresa: '',
  nit: '',
  telefono: '',
  email: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  descripcion: '',
  logo_url: '',
};

interface CrearProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProveedorFormData) => Promise<void> | void;
  proveedorData?: Partial<ProveedorFormData> | null;
  isEdit?: boolean;
  isSaving?: boolean;
}

function armarFormulario(data?: Partial<ProveedorFormData> | null): ProveedorFormData {
  return { ...FORM_VACIO, ...data };
}

export default function CrearProveedorModal({
  isOpen,
  onClose,
  onSave,
  proveedorData,
  isEdit = false,
  isSaving = false,
}: CrearProveedorModalProps) {
  const [formData, setFormData] = useState<ProveedorFormData>(() => armarFormulario(proveedorData));
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [cargandoDeptos, setCargandoDeptos] = useState(false);
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false);

  useEffect(() => {
    if (isOpen) setFormData(armarFormulario(proveedorData));
  }, [isOpen, proveedorData]);

  useEffect(() => {
    if (!isOpen) return;
    setCargandoDeptos(true);
    marketProveedoresAdminApi.departamentos()
      .then((r) => setDepartamentos(r.data ?? []))
      .catch((e) => console.error('Error cargando departamentos:', e))
      .finally(() => setCargandoDeptos(false));
  }, [isOpen]);

  // Los municipios dependen del departamento: cambia uno, se recargan los otros.
  useEffect(() => {
    if (!formData.departamento) {
      setMunicipios([]);
      return;
    }
    const depto = departamentos.find((d) => d.nombre === formData.departamento);
    if (!depto) return;

    setCargandoMunicipios(true);
    marketProveedoresAdminApi.municipios(depto.codigo)
      .then((r) => setMunicipios(r.data ?? []))
      .catch((e) => console.error('Error cargando municipios:', e))
      .finally(() => setCargandoMunicipios(false));
  }, [formData.departamento, departamentos]);

  const actualizar = <K extends keyof ProveedorFormData>(campo: K, valor: ProveedorFormData[K]) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  };

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.departamento) {
      toast.error('Selecciona un departamento');
      return;
    }
    if (!formData.ciudad) {
      toast.error('Selecciona una ciudad');
      return;
    }
    await onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(abierto) => { if (!abierto && !isSaving) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza los datos de la empresa proveedora.'
              : 'Registra una empresa proveedora del marketplace.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-5">
          <div className="max-h-[60vh] space-y-5 overflow-y-auto custom-scrollbar pr-1">
            <section className="space-y-4">
              <h3>Información de la empresa</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="prov-nombre">Nombre de la empresa</Label>
                  <Input
                    id="prov-nombre"
                    required
                    maxLength={150}
                    value={formData.nombre_empresa}
                    onChange={(e) => actualizar('nombre_empresa', e.target.value)}
                    placeholder="AgroInsumos del Valle S.A.S"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prov-nit">NIT</Label>
                  <Input
                    id="prov-nit"
                    maxLength={20}
                    value={formData.nit}
                    onChange={(e) => actualizar('nit', e.target.value)}
                    placeholder="900123456-7"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prov-telefono">Teléfono</Label>
                  <Input
                    id="prov-telefono"
                    type="tel"
                    required
                    maxLength={20}
                    value={formData.telefono}
                    onChange={(e) => actualizar('telefono', e.target.value)}
                    placeholder="3157890123"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="prov-email">Correo electrónico</Label>
                  <Input
                    id="prov-email"
                    type="email"
                    required
                    maxLength={150}
                    value={formData.email}
                    onChange={(e) => actualizar('email', e.target.value)}
                    placeholder="ventas@empresa.com"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3>Ubicación</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="prov-direccion">Dirección</Label>
                  <Input
                    id="prov-direccion"
                    required
                    maxLength={255}
                    value={formData.direccion}
                    onChange={(e) => actualizar('direccion', e.target.value)}
                    placeholder="Calle 15 #23-45"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prov-departamento">Departamento</Label>
                  <Select
                    value={formData.departamento}
                    disabled={cargandoDeptos}
                    onValueChange={(v) => {
                      actualizar('departamento', v);
                      actualizar('ciudad', '');
                    }}
                  >
                    <SelectTrigger id="prov-departamento">
                      <SelectValue placeholder={cargandoDeptos ? 'Cargando…' : 'Selecciona un departamento'} />
                    </SelectTrigger>
                    <SelectContent>
                      {departamentos.map((d) => (
                        <SelectItem key={d.codigo} value={d.nombre}>{d.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prov-ciudad">Ciudad</Label>
                  <Select
                    value={formData.ciudad}
                    disabled={!formData.departamento || cargandoMunicipios}
                    onValueChange={(v) => actualizar('ciudad', v)}
                  >
                    <SelectTrigger id="prov-ciudad">
                      <SelectValue placeholder={
                        !formData.departamento
                          ? 'Primero el departamento'
                          : cargandoMunicipios ? 'Cargando…' : 'Selecciona una ciudad'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {municipios.map((m) => (
                        <SelectItem key={m.codigo} value={m.nombre}>{m.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3>Información adicional</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prov-descripcion">Descripción</Label>
                  <Textarea
                    id="prov-descripcion"
                    rows={3}
                    value={formData.descripcion}
                    onChange={(e) => actualizar('descripcion', e.target.value)}
                    placeholder="Qué vende la empresa y a quién"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prov-logo">URL del logo</Label>
                  <Input
                    id="prov-logo"
                    type="url"
                    maxLength={500}
                    value={formData.logo_url}
                    onChange={(e) => actualizar('logo_url', e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
