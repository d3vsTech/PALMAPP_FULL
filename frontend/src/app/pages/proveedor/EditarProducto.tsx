import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, Save, Plus, Trash2, Upload, Package, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  proveedorApi, toNumber, buildImagenUrl,
  type CategoriaRefProv, type UnidadMedidaProv,
  type ProductoUpdatePayload, type ProductoProv,
} from '../../../api/proveedor';

interface PrecioVolumenLocal {
  cantidad_minima: number;
  precio_unidad: number;
}

export default function EditarProducto() {
  const navigate = useNavigate();
  const { id } = useParams();
  const productoId = id ? parseInt(id) : null;

  const [categorias, setCategorias] = useState<CategoriaRefProv[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedidaProv[]>([]);

  const [producto, setProducto] = useState<ProductoProv | null>(null);
  const [cargando, setCargando] = useState(true);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sku, setSku] = useState('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [unidadId, setUnidadId] = useState<string>('');
  const [precio, setPrecio] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  const [stockMin, setStockMin] = useState<string>('');
  const [destacado, setDestacado] = useState(false);
  const [activo, setActivo] = useState(true);
  const [precVolumen, setPrecVolumen] = useState<PrecioVolumenLocal[]>([]);
  const [imagenNueva, setImagenNueva] = useState<File | null>(null);

  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!productoId) return;
    setCargando(true);
    Promise.all([
      proveedorApi.producto(productoId),
      proveedorApi.categorias(),
      proveedorApi.unidadesMedida(),
    ])
      .then(([prodRes, catsRes, udsRes]) => {
        const p = prodRes.data;
        setProducto(p);
        setNombre(p.nombre);
        setDescripcion(p.descripcion);
        setSku(p.sku ?? '');
        setCategoriaId(String(p.categoria_id));
        setUnidadId(String(p.unidad_medida_id));
        setPrecio(String(toNumber(p.precio_unitario)));
        setStock(String(p.stock_disponible));
        setStockMin(String(p.stock_minimo ?? 0));
        setDestacado(!!p.destacado);
        setActivo(p.estado === 'activo');
        setPrecVolumen(
          (p.precios_volumen ?? []).map((pv) => ({
            cantidad_minima: pv.cantidad_minima,
            precio_unidad: toNumber(pv.precio_unidad),
          })),
        );
        setCategorias(catsRes.data);
        setUnidades(udsRes.data);
      })
      .catch((e: any) => {
        toast.error(e?.message ?? 'Producto no encontrado');
        navigate('/proveedor/productos');
      })
      .finally(() => setCargando(false));
  }, [productoId, navigate]);

  const agregarPV = () => setPrecVolumen((prev) => [...prev, { cantidad_minima: 0, precio_unidad: 0 }]);
  const quitarPV = (i: number) => setPrecVolumen((prev) => prev.filter((_, idx) => idx !== i));
  const actualizarPV = (i: number, campo: keyof PrecioVolumenLocal, valor: number) =>
    setPrecVolumen((prev) => prev.map((pv, idx) => (idx === i ? { ...pv, [campo]: valor } : pv)));

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImagenNueva(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoId) return;

    const precioNum = Number(precio);
    const stockNum = Number(stock);
    const stockMinNum = Number(stockMin) || 0;

    if (!nombre.trim() || !descripcion.trim() || !categoriaId || !unidadId) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }
    if (!precioNum || precioNum <= 0) {
      toast.error('El precio debe ser mayor a 0');
      return;
    }

    setEnviando(true);
    try {
      const payload: ProductoUpdatePayload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        sku: sku.trim() || undefined,
        categoria_id: parseInt(categoriaId),
        unidad_medida_id: parseInt(unidadId),
        precio_unitario: precioNum,
        stock_disponible: stockNum,
        stock_minimo: stockMinNum,
        destacado,
        estado: activo ? 'activo' : 'inactivo',
        precios_volumen: precVolumen,
      };
      await proveedorApi.editarProducto(productoId, payload);

      if (imagenNueva) {
        try {
          await proveedorApi.subirImagenPrincipal(productoId, imagenNueva);
        } catch (err: any) {
          toast.warning(`Producto guardado, pero falló la imagen: ${err?.message ?? ''}`);
        }
      }

      toast.success('Producto actualizado exitosamente');
      navigate('/proveedor/productos');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/productos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cargando...</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando producto...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/productos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Editar Producto</h1>
          <p className="text-muted-foreground mt-1">{producto?.nombre ?? 'Actualiza la información del producto'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">
                    Nombre del producto <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Fertilizante NPK 15-15-15"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">
                    Descripción <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Describe las características y beneficios del producto..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="categoria">
                      Categoría <span className="text-destructive">*</span>
                    </Label>
                    <Select value={categoriaId} onValueChange={setCategoriaId}>
                      <SelectTrigger id="categoria">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unidad">
                      Unidad de medida <span className="text-destructive">*</span>
                    </Label>
                    <Select value={unidadId} onValueChange={setUnidadId}>
                      <SelectTrigger id="unidad">
                        <SelectValue placeholder="Seleccionar unidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.abreviatura}{u.nombre ? ` · ${u.nombre}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">Referencia del producto</Label>
                  <Input
                    id="sku"
                    placeholder="Opcional (código interno del producto)"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Precio e inventario */}
            <Card>
              <CardHeader>
                <CardTitle>Precio e Inventario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="precio">
                      Precio unitario <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                      <Input
                        id="precio"
                        type="number"
                        placeholder="0"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        className="pl-6"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock">
                      Stock disponible <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      placeholder="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      min="0"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock-min">Stock mínimo</Label>
                    <Input
                      id="stock-min"
                      type="number"
                      placeholder="0"
                      value={stockMin}
                      onChange={(e) => setStockMin(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Precios por volumen */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Precios por Volumen</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Opcional: Ofrece descuentos por cantidad</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={agregarPV} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {precVolumen.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay precios por volumen configurados
                  </p>
                ) : (
                  precVolumen.map((pv, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs">Cantidad mínima</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={pv.cantidad_minima}
                            onChange={(e) => actualizarPV(index, 'cantidad_minima', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Precio por unidad</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                            <Input
                              type="number"
                              placeholder="0"
                              value={pv.precio_unidad}
                              onChange={(e) => actualizarPV(index, 'precio_unidad', parseInt(e.target.value) || 0)}
                              className="pl-6"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => quitarPV(index)}
                        className="text-destructive hover:text-destructive mt-6"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Imagen del producto */}
            <Card>
              <CardHeader>
                <CardTitle>Imagen del Producto</CardTitle>
                <p className="text-sm text-muted-foreground">Opcional</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  {imagenNueva ? (
                    <img src={URL.createObjectURL(imagenNueva)} alt="" className="w-full h-full object-cover" />
                  ) : producto?.imagen_principal ? (
                    <img src={buildImagenUrl(producto.imagen_principal)} alt={producto.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      id="imagen-upload"
                      accept="image/*"
                      onChange={handleImagenChange}
                      className="hidden"
                    />
                    <label htmlFor="imagen-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {imagenNueva ? imagenNueva.name : 'Cambiar imagen'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG hasta 3MB</p>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estado */}
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={activo} onCheckedChange={(v) => setActivo(!!v)} />
                  <span className="text-sm">Producto activo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={destacado} onCheckedChange={(v) => setDestacado(!!v)} />
                  <span className="text-sm">Marcar como destacado</span>
                </label>
              </CardContent>
            </Card>

            {/* Acciones */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="submit" className="w-full gap-2" disabled={enviando}>
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {enviando ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/proveedor/productos')}
                  disabled={enviando}
                >
                  Cancelar
                </Button>
              </CardContent>
            </Card>

            {/* Información */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Nota:</span> Los cambios se aplicarán
                  inmediatamente en el marketplace.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
