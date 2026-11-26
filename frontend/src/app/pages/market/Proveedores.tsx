import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Search, Store, ChevronRight, Star, Package } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import { Calificacion } from '../../components/market/piezas';
import { num } from '../../lib/formato';

interface Proveedor {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  ubicacion: string;
  rating: number;
  totalReviews: number;
  totalVentas: number;
  productosActivos: number;
  certificaciones: string[];
  tiempoEntrega: string;
}

// Mock data
const proveedoresData: Proveedor[] = [
  {
    id: 'prov1',
    nombre: 'AgroInsumos del Valle',
    descripcion: 'Especialistas en fertilizantes y agroquímicos de alta calidad',
    categoria: 'Fertilizantes y Agroquímicos',
    ubicacion: 'Valle del Cauca',
    rating: 4.7,
    totalReviews: 342,
    totalVentas: 1250,
    productosActivos: 45,
    certificaciones: ['ICA', 'ISO 9001'],
    tiempoEntrega: '3-5 días',
  },
  {
    id: 'prov2',
    nombre: 'QuímicosAgro',
    descripcion: 'Proveedor líder en soluciones químicas para agricultura',
    categoria: 'Agroquímicos',
    ubicacion: 'Antioquia',
    rating: 4.5,
    totalReviews: 218,
    totalVentas: 890,
    productosActivos: 32,
    certificaciones: ['ICA', 'BPA'],
    tiempoEntrega: '2-4 días',
  },
  {
    id: 'prov3',
    nombre: 'Herramientas del Campo',
    descripcion: 'Equipamiento y herramientas para trabajo agrícola',
    categoria: 'Herramientas',
    ubicacion: 'Cundinamarca',
    rating: 4.8,
    totalReviews: 456,
    totalVentas: 2100,
    productosActivos: 78,
    certificaciones: ['ISO 9001'],
    tiempoEntrega: '1-3 días',
  },
  {
    id: 'prov4',
    nombre: 'BioAgro',
    descripcion: 'Productos orgánicos y soluciones biológicas sostenibles',
    categoria: 'Productos Orgánicos',
    ubicacion: 'Quindío',
    rating: 4.9,
    totalReviews: 189,
    totalVentas: 550,
    productosActivos: 28,
    certificaciones: ['Orgánico', 'Fair Trade', 'BPA'],
    tiempoEntrega: '4-6 días',
  },
  {
    id: 'prov5',
    nombre: 'Nutrientes Premium',
    descripcion: 'Fertilizantes especializados y nutrición vegetal',
    categoria: 'Fertilizantes',
    ubicacion: 'Risaralda',
    rating: 4.6,
    totalReviews: 294,
    totalVentas: 780,
    productosActivos: 38,
    certificaciones: ['ICA', 'ISO 9001'],
    tiempoEntrega: '3-5 días',
  },
  {
    id: 'prov6',
    nombre: 'SemillasTop',
    descripcion: 'Semillas certificadas y material vegetal de calidad',
    categoria: 'Semillas',
    ubicacion: 'Caldas',
    rating: 4.4,
    totalReviews: 167,
    totalVentas: 420,
    productosActivos: 22,
    certificaciones: ['ICA'],
    tiempoEntrega: '5-7 días',
  },
];

export default function Proveedores() {
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [ordenamiento, setOrdenamiento] = useState('relevancia');

  const categorias = ['todos', ...new Set(proveedoresData.map(p => p.categoria))];

  const q = busqueda.toLowerCase();
  const proveedoresFiltrados = proveedoresData.filter(proveedor => {
    const coincideBusqueda =
      proveedor.nombre.toLowerCase().includes(q) ||
      proveedor.descripcion.toLowerCase().includes(q) ||
      proveedor.ubicacion.toLowerCase().includes(q);
    const coincideCategoria = categoriaFiltro === 'todos' || proveedor.categoria === categoriaFiltro;
    return coincideBusqueda && coincideCategoria;
  });

  if (ordenamiento === 'rating') {
    proveedoresFiltrados.sort((a, b) => b.rating - a.rating);
  } else if (ordenamiento === 'ventas') {
    proveedoresFiltrados.sort((a, b) => b.totalVentas - a.totalVentas);
  } else if (ordenamiento === 'productos') {
    proveedoresFiltrados.sort((a, b) => b.productosActivos - a.productosActivos);
  }

  const proveedoresTotales = proveedoresData.length;
  const ratingPromedio = proveedoresData.reduce((sum, p) => sum + p.rating, 0) / proveedoresData.length;
  const productosTotales = proveedoresData.reduce((sum, p) => sum + p.productosActivos, 0);

  const limpiar = () => {
    setBusqueda('');
    setCategoriaFiltro('todos');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/market"
        eyebrow="Tienda de insumos"
        title="Proveedores"
        description="Empresas que venden insumos y equipos en la tienda."
      />

      <StatStrip
        items={[
          { label: 'Proveedores activos', value: proveedoresTotales, icon: Store, tone: 'green' },
          { label: 'Calificación promedio', value: ratingPromedio.toLocaleString('es-CO', { maximumFractionDigits: 1, minimumFractionDigits: 1 }), unit: 'de 5', icon: Star, tone: 'amber' },
          { label: 'Productos disponibles', value: num(productosTotales), note: 'en el catálogo', icon: Package, tone: 'lime' },
        ]}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <Input
            type="search"
            placeholder="Buscar por nombre, descripción o ubicación"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="pl-9"
            aria-label="Buscar proveedores"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger className="w-full sm:w-60" aria-label="Categoría">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'todos' ? 'Todas las categorías' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ordenamiento} onValueChange={setOrdenamiento}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Ordenar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevancia">Relevancia</SelectItem>
              <SelectItem value="rating">Mejor calificación</SelectItem>
              <SelectItem value="ventas">Más ventas</SelectItem>
              <SelectItem value="productos">Más productos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {proveedoresFiltrados.length === 0 ? (
        <Card className="items-center py-14 text-center">
          <div className="space-y-1">
            <h3>No se encontraron proveedores</h3>
            <p className="max-w-sm text-sm text-muted-foreground">Prueba con otra búsqueda o categoría.</p>
          </div>
          <Button variant="outline" onClick={limpiar}>Limpiar filtros</Button>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-[13px] font-medium text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">Proveedor</th>
                <th className="hidden px-4 py-2.5 text-left font-semibold md:table-cell">Ubicación</th>
                <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Calificación</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold lg:table-cell">Productos</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold lg:table-cell">Ventas</th>
                <th className="hidden px-4 py-2.5 text-left font-semibold xl:table-cell">Certificaciones</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {proveedoresFiltrados.map(proveedor => (
                <tr
                  key={proveedor.id}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => navigate(`/market/proveedores/${proveedor.id}`)}
                >
                  <td className="max-w-0 px-5 py-3 sm:max-w-none">
                    <Link
                      to={`/market/proveedores/${proveedor.id}`}
                      onClick={e => e.stopPropagation()}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {proveedor.nombre}
                    </Link>
                    <span className="block break-words text-xs text-muted-foreground">{proveedor.categoria}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground sm:hidden">
                      <Calificacion valor={proveedor.rating} />
                      <span>{proveedor.ubicacion}</span>
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{proveedor.ubicacion}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Calificacion valor={proveedor.rating} detalle={`(${num(proveedor.totalReviews)})`} />
                  </td>
                  <td className="hidden px-4 py-3 text-right lg:table-cell">{num(proveedor.productosActivos)}</td>
                  <td className="hidden px-4 py-3 text-right lg:table-cell">{num(proveedor.totalVentas)}</td>
                  <td className="hidden px-4 py-3 xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {proveedor.certificaciones.map(cert => (
                        <Badge key={cert} variant="secondary">{cert}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
