/**
 * Listado de novedades laborales.
 *
 * Los filtros corren en memoria porque la fuente es mock. Cuando entre el
 * endpoint se mueven al backend y solo cambia el origen de `NOVEDADES_MOCK`.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Plus, Search, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { NOVEDADES_MOCK } from './mock';
import { TIPOS_NOVEDAD, formatFecha, type Novedad, type TipoNovedad } from './tipos';
import { DetalleNovedadDialog } from './componentes/DetalleNovedadDialog';

interface Filtros {
  busqueda: string;
  tipo: TipoNovedad | '';
  desde: string;
  hasta: string;
}

const FILTROS_VACIOS: Filtros = { busqueda: '', tipo: '', desde: '', hasta: '' };

function coincide(novedad: Novedad, filtros: Filtros): boolean {
  const texto = filtros.busqueda.toLowerCase();
  const porTexto = !texto
    || novedad.colaborador.toLowerCase().includes(texto)
    || TIPOS_NOVEDAD[novedad.tipo].label.toLowerCase().includes(texto);
  // Las fechas son ISO `YYYY-MM-DD`, así que se comparan como texto.
  return porTexto
    && (!filtros.tipo  || novedad.tipo === filtros.tipo)
    && (!filtros.desde || novedad.fechaInicio >= filtros.desde)
    && (!filtros.hasta || novedad.fechaInicio <= filtros.hasta);
}

export default function NovedadesPage() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [novedadVer, setNovedadVer] = useState<Novedad | null>(null);

  const hayFiltros = Object.values(filtros).some(Boolean);

  const cambiar = (parcial: Partial<Filtros>) =>
    setFiltros((prev) => ({ ...prev, ...parcial }));

  const filtradas = useMemo(
    () => NOVEDADES_MOCK
      .filter((n) => coincide(n, filtros))
      .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro)),
    [filtros],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Novedades</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gestión de permisos, incapacidades, ausencias y terminaciones de contrato
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:shrink-0">
          {/* El cargue masivo aún no tiene pantalla ni endpoint. El botón queda
              en el diseño, avisando en vez de navegar a una ruta inexistente. */}
          <Button
            variant="outline"
            onClick={() => toast.info('El cargue masivo de novedades todavía no está disponible')}
            className="w-full gap-2 border-2 border-primary text-primary hover:bg-primary/5 sm:w-auto"
          >
            <Upload className="h-4 w-4" />
            Importar Novedades
          </Button>
          <Button onClick={() => navigate('/novedades/nueva')} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Nueva Novedad
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador..."
            value={filtros.busqueda}
            onChange={(e) => cambiar({ busqueda: e.target.value })}
            className="h-8 pl-8 text-sm"
          />
        </div>

        <select
          value={filtros.tipo}
          onChange={(e) => cambiar({ tipo: e.target.value as TipoNovedad | '' })}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Tipo de novedad</option>
          {(Object.keys(TIPOS_NOVEDAD) as TipoNovedad[]).map((key) => (
            <option key={key} value={key}>{TIPOS_NOVEDAD[key].label}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="text-xs">Desde</span>
          <Input
            type="date"
            value={filtros.desde}
            onChange={(e) => cambiar({ desde: e.target.value })}
            className="h-8 w-36 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="text-xs">Hasta</span>
          <Input
            type="date"
            value={filtros.hasta}
            onChange={(e) => cambiar({ hasta: e.target.value })}
            className="h-8 w-36 text-sm"
          />
        </div>

        {hayFiltros && (
          <button
            onClick={() => setFiltros(FILTROS_VACIOS)}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />Limpiar
          </button>
        )}
      </div>

      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Colaborador</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Tipo de novedad</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Fecha inicio</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Fecha fin</th>
                  <th className="p-4 text-center text-sm font-semibold text-muted-foreground">Días</th>
                  <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No se encontraron novedades
                    </td>
                  </tr>
                ) : filtradas.map((n, idx) => {
                  const tipo = TIPOS_NOVEDAD[n.tipo];
                  return (
                    <tr
                      key={n.id}
                      className={`border-b border-border transition-colors last:border-0 hover:bg-muted/20 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{n.colaborador}</span>
                          <span className="text-xs text-muted-foreground">{n.cedula}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${tipo.dot}`} />
                          <Badge variant="outline" className={`text-xs ${tipo.color}`}>{tipo.label}</Badge>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{formatFecha(n.fechaInicio)}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">
                          {n.dias > 0 ? formatFecha(n.fechaFin) : '—'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-semibold text-foreground">
                          {n.dias > 0 ? n.dias : '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNovedadVer(n)}
                            className="hover:border-primary hover:bg-primary/10 hover:text-primary"
                          >
                            Ver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{filtradas.length}</span> novedades registradas
            </p>
          </div>
        </CardContent>
      </Card>

      <DetalleNovedadDialog
        novedad={novedadVer}
        onCerrar={() => setNovedadVer(null)}
      />
    </div>
  );
}
