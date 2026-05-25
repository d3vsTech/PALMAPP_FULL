import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  ArrowLeft, ShoppingCart, Star, Package, Shield, CheckCircle,
  Plus, Minus, Store, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { marketApi, toNumber, buildImagenUrl, type Producto } from '../../../api/market';

export default function ProductoDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  const productoId = id ? parseInt(id) : null;

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);
  /** Índice de la imagen actualmente seleccionada en la galería. */
  const [imagenActiva, setImagenActiva] = useState(0);

  useEffect(() => {
    if (!productoId) return;
    setCargando(true);
    setImagenActiva(0);
    marketApi.producto(productoId)
      .then((res) => setProducto(res.data))
      .catch((e: any) => {
        toast.error(e?.message ?? 'Producto no encontrado');
        navigate('/market');
      })
      .finally(() => setCargando(false));
  }, [productoId, navigate]);

  // Navegación con teclado (←/→) cuando hay galería con más de 1 imagen.
  useEffect(() => {
    if (!producto) return;
    const onKey = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input/textarea.
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const total = (producto.imagenes?.length ?? 0) + (producto.imagen_principal ? 1 : 0);
      if (total <= 1) return;
      if (e.key === 'ArrowLeft') {
        setImagenActiva(i => (i - 1 + total) % total);
      } else if (e.key === 'ArrowRight') {
        setImagenActiva(i => (i + 1) % total);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [producto]);

  /**
   * Galería unificada: imagen_principal primero + array de imágenes después,
   * sin duplicados por URL. Si no hay nada, queda vacío y se muestra un
   * placeholder.
   *
   * Defensivo a variaciones de shape del backend:
   * - El array puede venir como `imagenes`, `galeria`, `gallery`,
   *   `imagenes_galeria` o `productos_imagenes`.
   * - Cada item puede tener su URL en `url`, `imagen`, `imagen_url`, `path`
   *   o `src`. Si el item es directamente un string, se usa como URL.
   * - El campo de orden puede ser `orden` u `order`.
   */
  const galeria = useMemo(() => {
    if (!producto) return [] as { url: string; alt?: string; orden: number }[];

    // Tipos relajados para acceder a campos que pueden no estar en el type.
    const p = producto as unknown as Record<string, unknown>;

    const candidatos = [
      'imagenes', 'galeria', 'gallery',
      'imagenes_galeria', 'productos_imagenes', 'imagenes_extras',
    ];
    let arr: unknown[] = [];
    for (const campo of candidatos) {
      const v = p[campo];
      if (Array.isArray(v) && v.length > 0) { arr = v; break; }
    }

    const extraerUrl = (item: unknown): { url: string; alt?: string; orden: number } | null => {
      if (typeof item === 'string') {
        return item ? { url: item, orden: 0 } : null;
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const url = (o.url ?? o.imagen ?? o.imagen_url ?? o.path ?? o.src) as string | undefined;
        if (!url || typeof url !== 'string') return null;
        const orden = typeof o.orden === 'number'
          ? o.orden
          : typeof o.order === 'number' ? o.order : 0;
        const alt = (o.alt_text ?? o.alt ?? o.descripcion ?? null) as string | null;
        return { url, alt: alt ?? undefined, orden };
      }
      return null;
    };

    const items: { url: string; alt?: string; orden: number }[] = [];
    const vistos = new Set<string>();

    // 1) imagen_principal va primero (suele ser la portada).
    if (producto.imagen_principal) {
      items.push({ url: producto.imagen_principal, alt: producto.nombre, orden: -1 });
      vistos.add(producto.imagen_principal);
    }

    // 2) Resto de imágenes, ordenadas por `orden`.
    arr.forEach((raw) => {
      const parsed = extraerUrl(raw);
      if (!parsed) return;
      if (vistos.has(parsed.url)) return;
      vistos.add(parsed.url);
      items.push({
        url: parsed.url,
        alt: parsed.alt ?? producto.nombre,
        orden: parsed.orden,
      });
    });

    return items.sort((a, b) => a.orden - b.orden);
  }, [producto]);

  // Calcular precio según volumen + descuento
  const precioInfo = useMemo(() => {
    if (!producto) return { precio: 0, descuento: 0, base: 0 };
    const base = toNumber(producto.precio_unitario);
    const escalas = (producto.precios_volumen ?? [])
      .filter((pv) => (pv.activo ?? true))
      .map((pv) => ({ cantidad_minima: pv.cantidad_minima, precio: toNumber(pv.precio_unidad) }))
      .sort((a, b) => b.cantidad_minima - a.cantidad_minima);
    const aplicable = escalas.find((p) => cantidad >= p.cantidad_minima);
    const precio = aplicable ? aplicable.precio : base;
    const descuento = base > 0 ? Math.round(((base - precio) / base) * 100) : 0;
    return { precio, descuento, base };
  }, [producto, cantidad]);

  const agregarAlCarrito = async (irACheckout = false) => {
    if (!producto) return;
    if (cantidad > producto.stock_disponible) {
      toast.error(`Solo hay ${producto.stock_disponible} disponibles`);
      return;
    }
    setAgregando(true);
    try {
      await marketApi.agregarItem(producto.id, cantidad);
      toast.success(`${cantidad} × ${producto.nombre} agregado al carrito`);
      navigate(irACheckout ? '/market/checkout' : '/market/carrito');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo agregar al carrito');
    } finally {
      setAgregando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando producto...
      </div>
    );
  }

  if (!producto) {
    return <div className="text-center py-20 text-muted-foreground">Producto no encontrado.</div>;
  }

  const subtotal = precioInfo.precio * cantidad;
  const rating = Number(producto.calificacion_promedio ?? 0);
  const especEntries = Object.entries(producto.especificaciones ?? {});

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-foreground">{producto.nombre}</h1>
              {producto.stock_bajo && <Badge className="bg-amber-500">Stock limitado</Badge>}
              {producto.destacado && <Badge className="bg-primary">Destacado</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Columna izquierda */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galería estilo Mercado Libre: miniaturas verticales a la izquierda
              + imagen principal grande a la derecha. Hover en miniatura cambia
              la imagen principal automáticamente (sin necesidad de clic).
              En móvil colapsa a tira horizontal abajo. */}
          <Card className="border-border overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* ─── Columna miniaturas (vertical en desktop, horizontal en móvil) */}
              {galeria.length > 1 && (
                <div className="order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-border bg-card">
                  <div className="flex lg:flex-col gap-2 p-3 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden lg:max-h-[520px]">
                    {galeria.map((img, i) => {
                      const activa = i === imagenActiva;
                      return (
                        <button
                          key={`${img.url}-${i}`}
                          type="button"
                          onClick={() => setImagenActiva(i)}
                          onMouseEnter={() => setImagenActiva(i)}
                          className={`h-14 w-14 shrink-0 rounded-md overflow-hidden border-2 transition-all bg-white ${
                            activa
                              ? 'border-primary ring-1 ring-primary/30'
                              : 'border-border/60 hover:border-primary/60'
                          }`}
                          aria-label={`Imagen ${i + 1} de ${galeria.length}`}
                        >
                          <img
                            src={buildImagenUrl(img.url)}
                            alt={img.alt ?? `${producto.nombre} ${i + 1}`}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Imagen principal */}
              <div className="order-1 lg:order-2 flex-1 relative h-[420px] sm:h-[500px] lg:h-[600px] bg-white flex items-center justify-center overflow-hidden">
                {galeria.length > 0 ? (
                  <img
                    key={galeria[imagenActiva].url}
                    src={buildImagenUrl(galeria[imagenActiva].url)}
                    alt={galeria[imagenActiva].alt ?? producto.nombre}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Package className="h-32 w-32 text-muted-foreground/30" />
                )}

                {/* Contador "1 / 5" abajo a la derecha — sin flechas, sin
                    overlays clickables. La navegación se hace solo con las
                    miniaturas (hover/clic) o con teclado ←/→. */}
                {galeria.length > 1 && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm border border-border text-xs font-medium">
                    {imagenActiva + 1} / {galeria.length}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Información del producto */}
          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Descripción</h2>
                <p className="text-muted-foreground">{producto.descripcion}</p>
              </div>

              {especEntries.length > 0 && (
                <>
                  <div className="h-px bg-border" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Especificaciones Técnicas
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {especEntries.map(([key, value]) => (
                        <div key={key} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {producto.precios_volumen && producto.precios_volumen.length > 0 && (
                <>
                  <div className="h-px bg-border" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Precios por Volumen</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {producto.precios_volumen.map((nivel, i) => {
                        const precio = toNumber(nivel.precio_unidad);
                        const descuento =
                          precioInfo.base > 0
                            ? Math.round(((precioInfo.base - precio) / precioInfo.base) * 100)
                            : 0;
                        const aplicado = cantidad >= nivel.cantidad_minima;
                        return (
                          <Card
                            key={i}
                            className={`border-2 ${
                              aplicado ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    {nivel.cantidad_minima}+ unidades
                                  </p>
                                  <p className="text-xl font-bold text-success">
                                    ${precio.toLocaleString('es-CO')}
                                  </p>
                                </div>
                                {descuento > 0 && (
                                  <Badge className="bg-success">{descuento}% OFF</Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Información del proveedor */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{producto.proveedor.nombre_empresa}</h3>
                    {(() => {
                      const ratingProv = Number(producto.proveedor.calificacion_promedio ?? 0);
                      const mostrar = ratingProv > 0 ? ratingProv : 5;
                      return (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < Math.floor(mostrar)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-muted'
                                }`}
                              />
                            ))}
                          </div>
                          {ratingProv > 0 && (
                            <span className="text-sm text-muted-foreground">
                              ({ratingProv.toFixed(1)})
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    {producto.proveedor.ciudad && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {producto.proveedor.ciudad}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Beneficios */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-sm">Compra segura</p>
                  <p className="text-xs text-muted-foreground">Garantía de calidad</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Stock disponible</p>
                  <p className="text-xs text-muted-foreground">{producto.stock_disponible} unidades</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Columna derecha: Compra */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            <Card className="border-border">
              <CardContent className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const ratingMostrar = rating > 0 ? rating : 5;
                      return [...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(ratingMostrar)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted'
                          }`}
                        />
                      ));
                    })()}
                    <span className="text-sm text-muted-foreground">
                      {rating > 0
                        ? `${rating.toFixed(1)}${producto.total_resenas != null ? ` · ${producto.total_resenas} reseñas` : ''}`
                        : 'Sin reseñas todavía'}
                    </span>
                  </div>
                  <Badge variant="outline" className="mb-4">{producto.categoria.nombre}</Badge>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Precio unitario</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-3xl font-bold text-success">
                      ${precioInfo.precio.toLocaleString('es-CO')}
                    </p>
                    {precioInfo.descuento > 0 && (
                      <Badge className="bg-success">{precioInfo.descuento}% OFF</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    por {producto.unidad_medida.abreviatura}
                  </p>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <p className="text-sm font-medium mb-2">Cantidad</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                      disabled={cantidad <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={cantidad}
                      onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center"
                      min="1"
                      max={producto.stock_disponible}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCantidad(Math.min(producto.stock_disponible, cantidad + 1))}
                      disabled={cantidad >= producto.stock_disponible}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">${subtotal.toLocaleString('es-CO')}</span>
                  </div>

                  <div className="h-px bg-border my-2" />

                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-success">
                      ${subtotal.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    onClick={() => agregarAlCarrito(true)}
                    className="w-full gap-2"
                    size="lg"
                    disabled={agregando || producto.stock_disponible <= 0}
                  >
                    {agregando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Comprar ahora
                  </Button>
                  <Button
                    onClick={() => agregarAlCarrito(false)}
                    variant="outline"
                    className="w-full gap-2"
                    size="lg"
                    disabled={agregando || producto.stock_disponible <= 0}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Agregar al carrito
                  </Button>
                </div>
              </CardContent>
            </Card>

            {precioInfo.descuento > 0 && (
              <Card className="border-success bg-success/5">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-success">
                    ¡Ahorras $
                    {((precioInfo.base - precioInfo.precio) * cantidad).toLocaleString('es-CO')}
                    {' '}comprando {cantidad} unidades!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
