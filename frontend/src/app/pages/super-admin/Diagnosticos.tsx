import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, Code, Database, HardDrive, Loader2, RefreshCw, Server, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchConToken } from '../../../api/request';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import PageHeader from '../../components/common/PageHeader';

/** Lo que devuelve `GET /api/v1/admin/diagnostics`. Todo llega ya formateado. */
interface Diagnostico {
  aplicacion?: { nombre?: string; laravel?: string; entorno?: string; timezone?: string };
  servidor?: { hostname?: string; sistema_operativo?: string; servidor_web?: string; tiempo_actividad?: string };
  php?: { version?: string; memoria_limite?: string; memoria_uso_actual?: string; extensiones_cargadas?: string | number };
  disco?: { total?: string; usado?: string; libre?: string; uso_porcentaje?: string };
  base_datos?: { driver?: string; version?: string; peso_mb?: string; peso?: string; tablas?: string | number; conexion?: string };
  cache?: { driver?: string; estado?: string };
}

type Dato = { label: string; valor: string | number | undefined };

export default function Diagnosticos() {
  const { token } = useAuth();
  const [datos, setDatos] = useState<Diagnostico | null>(null);
  const [loading, setLoading] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [error, setError] = useState('');
  const [actualizado, setActualizado] = useState<Date | null>(null);

  const cargar = useCallback(async () => {
    if (!token) return;
    setRecargando(true);
    setError('');
    try {
      const respuesta = await fetchConToken('/api/v1/admin/diagnostics', token);
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado?.message ?? 'El servidor no respondió los diagnósticos');
      setDatos(resultado.data);
      setActualizado(new Date());
    } catch (err) {
      console.error('Error al cargar diagnósticos:', err);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los diagnósticos');
    } finally {
      setLoading(false);
      setRecargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const bloques: { titulo: string; icono: typeof Code; datos: Dato[] }[] = [
    {
      titulo: 'Aplicación',
      icono: Code,
      datos: [
        { label: 'Nombre', valor: datos?.aplicacion?.nombre },
        { label: 'Versión de Laravel', valor: datos?.aplicacion?.laravel },
        { label: 'Entorno', valor: datos?.aplicacion?.entorno },
        { label: 'Zona horaria', valor: datos?.aplicacion?.timezone },
      ],
    },
    {
      titulo: 'Servidor',
      icono: Server,
      datos: [
        { label: 'Hostname', valor: datos?.servidor?.hostname },
        { label: 'Sistema operativo', valor: datos?.servidor?.sistema_operativo },
        { label: 'Servidor web', valor: datos?.servidor?.servidor_web },
        { label: 'Tiempo encendido', valor: datos?.servidor?.tiempo_actividad },
      ],
    },
    {
      titulo: 'PHP',
      icono: Zap,
      datos: [
        { label: 'Versión', valor: datos?.php?.version },
        { label: 'Límite de memoria', valor: datos?.php?.memoria_limite },
        { label: 'Memoria en uso', valor: datos?.php?.memoria_uso_actual },
        { label: 'Extensiones activas', valor: datos?.php?.extensiones_cargadas },
      ],
    },
    {
      titulo: 'Disco',
      icono: HardDrive,
      datos: [
        { label: 'Total', valor: datos?.disco?.total },
        { label: 'Usado', valor: datos?.disco?.usado },
        { label: 'Libre', valor: datos?.disco?.libre },
        { label: 'Porcentaje de uso', valor: datos?.disco?.uso_porcentaje },
      ],
    },
    {
      titulo: 'Base de datos',
      icono: Database,
      datos: [
        { label: 'Motor', valor: datos?.base_datos?.driver },
        { label: 'Versión', valor: datos?.base_datos?.version },
        { label: 'Peso total', valor: datos?.base_datos?.peso_mb ?? datos?.base_datos?.peso },
        { label: 'Tablas', valor: datos?.base_datos?.tablas },
        { label: 'Conexión', valor: datos?.base_datos?.conexion },
      ],
    },
    {
      titulo: 'Caché',
      icono: Activity,
      datos: [
        { label: 'Motor', valor: datos?.cache?.driver },
        { label: 'Estado', valor: datos?.cache?.estado },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super admin"
        title="Diagnósticos del sistema"
        description="Estado del servidor y de la aplicación en este momento."
        actions={
          <Button variant="outline" onClick={() => void cargar()} disabled={recargando}>
            {recargando
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" strokeWidth={2} />}
            Actualizar
          </Button>
        }
      />

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {actualizado && (
        <p className="text-[13px] text-muted-foreground">
          Última lectura: {actualizado.toLocaleString('es-CO', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {bloques.map((bloque) => {
          const Icono = bloque.icono;
          // Sin datos no se puede afirmar que el bloque esté bien.
          const responde = bloque.datos.some((d) => d.valor !== undefined && d.valor !== null && d.valor !== '');
          return (
            <Card key={bloque.titulo} className="gap-4">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icono className="h-4 w-4" strokeWidth={2} />
                  </span>
                  {bloque.titulo}
                </CardTitle>
                {loading
                  ? <Badge variant="secondary">Leyendo</Badge>
                  : responde
                    ? <Badge variant="success">Responde</Badge>
                    : <Badge variant="warning">Sin datos</Badge>}
              </CardHeader>
              <CardContent>
                <dl className="space-y-2.5 text-sm">
                  {bloque.datos.map((dato) => (
                    <div key={dato.label} className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{dato.label}</dt>
                      <dd className="break-all text-right font-semibold text-foreground">
                        {loading ? '…' : (dato.valor ?? '—')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="gap-2">
        <CardHeader>
          <CardTitle>Cómo se lee esta pantalla</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Los datos corresponden al momento de la última lectura, no se actualizan solos.
            Usa el botón Actualizar cuando necesites el estado del momento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
