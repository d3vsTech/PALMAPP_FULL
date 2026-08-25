import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
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
  ArrowLeft, Plus, Trash2, Upload, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  proveedorApi,
  type ProductoCreatePayload, type CategoriaRefProv, type UnidadMedidaProv,
} from '../../../api/proveedor';

interface PrecioVolumenLocal {
  cantidad_minima: number;
  precio_unidad: number;
}

// ── Formato moneda COP (puntos como separadores de miles) ───────────────────
const formatCOP = (n: number | string): string => {
  const num = typeof n === 'number' ? n : parseFloat(String(n));
  if (!Number.isFinite(num) || num === 0) return '';
  return Math.trunc(num).toLocaleString('es-CO');
};
const parseCOP = (s: string): number => {
  const cleaned = String(s).replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
};

export default function NuevoProducto() {
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState<CategoriaRefProv[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedidaProv[]>([]);

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
  const [imagen, setImagen] = useState<File | null>(null);

  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    // wizard-init trae categorías + unidades_medida en 1 sola petición.
    proveedorApi.wizardInitProductos()
      .then(({ data }) => {
        setCategorias(data.categorias as any);
        setUnidades(data.unidades_medida as any);
      })
      .catch((e: any) => toast.error(e?.message ?? 'Error al cargar catálogos'));
  }, []);

  const agregarPV = () => setPrecVolumen((prev) => [...prev, { cantidad_minima: 0, precio_unidad: 0 }]);
  const quitarPV = (i: number) => setPrecVolumen((prev) => prev.filter((_, idx) => idx !== i));
  const actualizarPV = (i: number, campo: keyof PrecioVolumenLocal, valor: number) =>
    setPrecVolumen((prev) => prev.map((pv, idx) => (idx === i ? { ...pv, [campo]: valor } : pv)));

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImagen(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const precioNum = parseCOP(precio);
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
    if (precVolumen.some((pv) => pv.cantidad_minima <= 0 || pv.precio_unidad <= 0)) {
      toast.error('Los precios por volumen deben tener cantidad y precio > 0');
      return;
    }

    setEnviando(true);
    try {
      const payload: ProductoCreatePayload = {
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
      // Imagen incluida en el mismo multipart (API §4: campo imagen_principal).
      await proveedorApi.crearProducto(payload, imagen || null);

      toast.success('Producto creado exitosamente');
      navigate('/proveedor/productos');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al crear el producto');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/productos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nuevo Producto</h1>
          <p className="text-muted-foreground mt-1">Agrega un nuevo producto a tu catálogo</p>
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
                  <Label htmlFor="sku">Ref:</Label>
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
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={precio}
                        onChange={(e) => setPrecio(formatCOP(parseCOP(e.target.value)))}
                        className="pl-6"
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
                      type="number" step="0.001"
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
                      type="number" step="0.001"
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
                            type="number" step="0.001"
                            placeholder="0"
                            value={pv.cantidad_minima}
                            onChange={(e) => actualizarPV(index, 'cantidad_minima', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Precio por unidad</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={formatCOP(pv.precio_unidad)}
                              onChange={(e) => actualizarPV(index, 'precio_unidad', parseCOP(e.target.value))}
                              className="pl-6"
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
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer overflow-hidden">
                    <input
                      type="file"
                      id="imagen-upload"
                      accept="image/*"
                      onChange={handleImagenChange}
                      className="hidden"
                    />
                    <label htmlFor="imagen-upload" className="cursor-pointer block">
                      {imagen ? (
                        <>
                          <img
                            src={URL.createObjectURL(imagen)}
                            alt={imagen.name}
                            className="mx-auto mb-2 max-h-32 rounded"
                          />
                          <p className="text-sm text-muted-foreground">{imagen.name}</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Haz clic para subir una imagen
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG hasta 3MB</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Acciones */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="submit" className="w-full gap-2" disabled={enviando}>
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {enviando ? 'Creando...' : 'Crear Producto'}
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
                  <span className="font-medium text-foreground">Nota:</span> Una vez creado el producto, estará
                  disponible en el marketplace para que los clientes lo compren.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
