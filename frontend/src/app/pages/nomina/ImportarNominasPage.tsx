/**
 * Importación masiva de nóminas históricas (API_NOMINA §16).
 *
 * El wizard de nómina sigue siendo el camino normal. Esta pantalla es para lo
 * que la finca ya pagó antes de usar el sistema y trae en una hoja de cálculo.
 *
 * Tres cosas que esta pantalla hace distinto de los demás cargues:
 *
 *  1. No hay nada que decidir sobre el cálculo: el cargue **no recalcula**.
 *     Lo que el cliente pagó es la verdad, y lo que no cuadra avisa en vez de
 *     bloquear. Por eso la revisión es la pantalla entera, no un paso previo.
 *
 *  2. Lo más importante de la revisión es la **cobertura**: quién tenía
 *     contrato vigente en el período y no aparece en el archivo. Eso no lo
 *     puede ver el usuario en su Excel, y es lo que deja una base incompleta
 *     en las cesantías y la prima de esa persona.
 *
 *  3. `sobrescribir` reescribe **todas** las filas ya cargadas, no solo la que
 *     cambió. Por eso el interruptor solo aparece cuando hay alguna, y al
 *     tocarlo se vuelve a validar.
 */
import { useNavigate } from 'react-router';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { ACCEPT_NOMINAS } from '../../../api/importarNominas';
import {
  BotonesPlantilla, CabecerasIgnoradas, EstadoValidacion, PasoCard, Regla,
  VistaPreviaPlantilla, ZonaArchivo,
} from '../liquidaciones/historico/comunes';
import { useCargueNominas } from './importar/useCargueNominas';
import { COLUMNAS_NOMINAS, FILAS_NOMINAS } from './importar/plantillas';
import { AyudaColumnas } from './importar/AyudaColumnas';
import { PanelPeriodos } from './importar/PanelPeriodos';
import { AvisosCargueNominas } from './importar/AvisosCargueNominas';

function Indicador({ titulo, valor, tono }: { titulo: string; valor: string; tono?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className={`text-2xl font-bold ${tono ?? 'text-foreground'}`}>{valor}</p>
    </div>
  );
}

function pesos(valor: string | undefined): string {
  const n = Number(valor ?? 0);
  if (Number.isNaN(n)) return '—';
  return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

export default function ImportarNominasPage() {
  const navigate = useNavigate();
  const cargue = useCargueNominas(() => navigate('/nomina'));
  const { analisis } = cargue;

  const resumen = analisis?.resumen;
  const conError = resumen?.con_error ?? 0;
  const yaCargadas = resumen?.ya_cargadas ?? 0;
  const aEscribir = (resumen?.validas ?? 0) + (resumen?.a_sobrescribir ?? 0);
  const puedeImportar = !!analisis && conError === 0 && aEscribir > 0 && !cargue.importando;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/nomina')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Volver a Nómina
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Importar histórico</h1>
        <p className="mt-1 text-muted-foreground">
          Carga los períodos de nómina que pagaste antes del sistema
        </p>
      </div>

      <PasoCard
        n={1}
        titulo="Descarga la plantilla"
        subtitulo="Trae los colaboradores en una lista desplegable y una hoja con la ayuda de cada columna"
        accion={
          <BotonesPlantilla
            descargando={cargue.descargando}
            onDescargar={cargue.descargarPlantilla}
          />
        }
      >
        <VistaPreviaPlantilla columnas={COLUMNAS_NOMINAS} filas={FILAS_NOMINAS} />
        <AyudaColumnas />
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <Regla n={1}>
            Una fila es <strong className="text-foreground">un colaborador en un período</strong>.
            Las filas con las mismas fechas forman una nómina histórica, ya cerrada.
          </Regla>
          <Regla n={2}>
            Solo cuatro columnas son obligatorias: la cédula, las dos fechas y el{' '}
            <strong className="text-foreground">devengado_total</strong>. Lo demás se guarda tal
            cual si viene, y si no, no pasa nada.
          </Regla>
          <Regla n={3}>
            <strong className="text-foreground">devengado_total</strong> va{' '}
            <strong className="text-foreground">sin el auxilio ni las bonificaciones</strong>, que
            tienen su propia columna. Conviene traer siempre el{' '}
            <strong className="text-foreground">neto</strong>: es el control de que la fila no
            quedó corrida.
          </Regla>
          <Regla n={4}>
            <strong className="text-foreground">gajos</strong> y{' '}
            <strong className="text-foreground">promedio_kg_gajo</strong> son el registro de cómo
            se le pagó la cosecha a esa persona. No suman nada; salen en el desprendible.
          </Regla>
          <Regla n={5}>
            Carga antes los <strong className="text-foreground">contratos</strong> con su fecha de
            ingreso: sin ellos las prestaciones no cuentan esos días como cubiertos.
          </Regla>
        </div>
        <p className="text-xs text-muted-foreground">
          El cargue no recalcula nada: ni jornales, ni dominicales, ni deducciones. Tampoco marca
          ausencias ni horas extra, ni aplica cuotas de préstamos. Registra lo que se pagó.
        </p>
      </PasoCard>

      <PasoCard n={2} titulo="Sube el archivo" subtitulo="Se revisa al instante, sin guardar nada">
        <ZonaArchivo
          archivo={cargue.archivo}
          analisis={analisis?.archivo}
          detalle={resumen ? `${resumen.filas} filas leídas` : undefined}
          onArchivo={cargue.tomarArchivo}
          onQuitar={cargue.quitarArchivo}
          inputRef={cargue.inputRef}
          accept={ACCEPT_NOMINAS}
        />
        <EstadoValidacion validando={cargue.validando} error={cargue.error} />
        {analisis && <CabecerasIgnoradas cabeceras={analisis.archivo?.cabeceras_ignoradas ?? []} />}
      </PasoCard>

      {analisis && resumen && (
        <>
          <PasoCard
            n={3}
            titulo="Revisa lo que se va a cargar"
            subtitulo="Período por período, con quién queda pagado y quién no"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador
                titulo="Nóminas"
                valor={`${resumen.nominas.total}`}
                tono="text-success"
              />
              <Indicador
                titulo="Con error"
                valor={`${conError}`}
                tono={conError > 0 ? 'text-destructive' : undefined}
              />
              <Indicador titulo="Colaboradores" valor={`${resumen.colaboradores}`} />
              <Indicador titulo="Neto del archivo" valor={pesos(resumen.total_neto)} />
            </div>

            <AvisosCargueNominas avisos={analisis.advertencias} />

            {yaCargadas > 0 && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={cargue.sobrescribir}
                  onCheckedChange={(v) => cargue.cambiarSobrescribir(v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium">Sobrescribir las filas ya cargadas</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {yaCargadas} fila{yaCargadas === 1 ? '' : 's'} de este archivo ya está
                    {yaCargadas === 1 ? '' : 'n'} en el sistema y se omite
                    {yaCargadas === 1 ? '' : 'n'}. Al marcarlo se reescriben todas con lo que trae
                    el archivo, no solo la que corregiste.
                  </span>
                </span>
              </label>
            )}

            <PanelPeriodos nominas={analisis.nominas} filas={analisis.filas} />
          </PasoCard>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {conError > 0 && (
              <p className="text-sm text-destructive">
                Corrige las {conError} fila{conError === 1 ? '' : 's'} con error. Si una falla, no
                entra ninguna nómina.
              </p>
            )}
            <Button
              onClick={() => void cargue.importar()}
              disabled={!puedeImportar}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {cargue.importando ? 'Cargando...' : `Importar ${aEscribir} fila(s)`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
