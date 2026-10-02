/**
 * Wizard de registro de novedades (API_NOVEDADES §3 a §6).
 *
 * Las cinco pestañas comparten los tres pasos pero confirman contra endpoints
 * distintos: las de ausencia escriben en `ausencias`, Vacaciones crea una
 * solicitud PENDIENTE y Terminación registra el retiro. Esta pantalla orquesta;
 * la forma de cada paso vive en `componentes/`.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BarraPasos } from './componentes/BarraPasos';
import { PasoTipoNovedad } from './componentes/PasoTipoNovedad';
import { PasoDetalles } from './componentes/PasoDetalles';
import { PasoConfirmacion } from './componentes/PasoConfirmacion';
import {
  BORRADOR_VACIO, TOTAL_PASOS, esAusencia, esTerminacion, esVacaciones,
  validarPaso, type BorradorNovedad,
} from './borrador';
import {
  NovedadesErrorCodes, novedadesApi,
  type AdvertenciaNovedad, type InitNovedades,
} from '../../../api/novedades';
import type { ApiError } from '../../../api/client';

/** Las advertencias no bloquean: se muestran y la novedad queda registrada. */
function avisarAdvertencias(advertencias: AdvertenciaNovedad[] = []): void {
  for (const a of advertencias) {
    toast.warning(a.mensaje ?? a.code, { duration: 7000 });
  }
}

/**
 * Traduce los códigos del contrato a algo accionable. El `message` del backend
 * ya es legible, así que solo se reemplaza donde conviene decir qué hacer.
 */
function mensajeError(e: ApiError): string {
  switch (e.code) {
    case NovedadesErrorCodes.NOVEDAD_SOLAPADA:
      return e.message ?? 'El colaborador ya tiene una novedad que cruza esas fechas.';
    case NovedadesErrorCodes.COLABORADOR_SIN_CONTRATO_VIGENTE:
      return e.message ?? 'El colaborador no tenía contrato en alguno de esos días.';
    case NovedadesErrorCodes.VACACIONES_SOLICITUD_RETROACTIVA:
      return 'La solicitud no puede empezar antes de hoy. Un disfrute ya ocurrido se registra desde Liquidaciones.';
    case NovedadesErrorCodes.VACACIONES_INICIO_NO_HABIL:
      return 'Las vacaciones no pueden empezar en domingo, festivo ni sábado no hábil.';
    case NovedadesErrorCodes.COLABORADOR_YA_RETIRADO:
      return e.message ?? 'La ficha ya registra un retiro. Para corregirlo, edita el colaborador.';
    case NovedadesErrorCodes.CONFIG_LEGAL_INCOMPLETA:
      return 'Faltan constantes legales del año. Complétalas en Configuración.';
    default:
      return e.message ?? 'No se pudo registrar la novedad.';
  }
}

export default function NuevaNovedadPage() {
  const navigate = useNavigate();
  const [init, setInit] = useState<InitNovedades | null>(null);
  const [cargando, setCargando] = useState(true);
  const [paso, setPaso] = useState(1);
  const [borrador, setBorrador] = useState<BorradorNovedad>(BORRADOR_VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    novedadesApi
      .init()
      .then((res) => { if (vivo) setInit(res); })
      .catch((err) => {
        if (!vivo) return;
        toast.error((err as ApiError).message ?? 'No se pudo cargar el catálogo de novedades');
      })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  const cambiar = (parcial: Partial<BorradorNovedad>) =>
    setBorrador((prev) => ({ ...prev, ...parcial }));

  const avanzar = () => {
    const error = validarPaso(paso, borrador);
    if (error) { toast.error(error); return; }
    setPaso((p) => p + 1);
  };

  const retroceder = () => {
    if (paso === 1) { navigate('/novedades'); return; }
    setPaso((p) => p - 1);
  };

  const confirmar = async () => {
    if (!borrador.colaboradorId) return;
    setGuardando(true);
    try {
      if (esVacaciones(borrador)) {
        const res = await novedadesApi.vacaciones.solicitar({
          empleado_id: borrador.colaboradorId,
          fecha_inicio: borrador.fechaInicio,
          dias_habiles: borrador.diasHabiles ? Number(borrador.diasHabiles) : undefined,
          fecha_fin: borrador.fechaFin || undefined,
          observacion: borrador.observacion.trim() || undefined,
          documento: borrador.documento ?? undefined,
        });
        toast.success(res.message ?? 'Solicitud de vacaciones registrada');
        avisarAdvertencias(res.advertencias);
        navigate('/novedades?fuente=VACACION');
        return;
      }

      if (esTerminacion(borrador)) {
        const res = await novedadesApi.terminaciones.crear({
          empleado_id: borrador.colaboradorId,
          fecha_retiro: borrador.fechaInicio,
          motivo: borrador.motivoRetiro,
          observaciones: borrador.observacion.trim() || undefined,
          soporte: borrador.documento ?? undefined,
        });
        toast.success(res.message ?? 'Terminación de contrato registrada');
        avisarAdvertencias(res.advertencias);
        navigate('/novedades?fuente=TERMINACION');
        return;
      }

      const res = await novedadesApi.ausencias.crear({
        empleado_id: borrador.colaboradorId,
        motivo_ausencia_id: borrador.motivo!.id,
        fecha_inicio: borrador.fechaInicio,
        fecha_fin: borrador.fechaFin || undefined,
        hora_inicio: borrador.horaInicio || undefined,
        hora_fin: borrador.horaFin || undefined,
        entidad: borrador.entidad.trim() || undefined,
        numero_radicado: borrador.numeroRadicado.trim() || undefined,
        observacion: borrador.observacion.trim() || undefined,
        documento: borrador.documento ?? undefined,
      });
      toast.success(res.message ?? 'Novedad registrada');
      avisarAdvertencias(res.advertencias);
      navigate('/novedades');
    } catch (err) {
      toast.error(mensajeError(err as ApiError), { duration: 8000 });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando catálogo de novedades
      </div>
    );
  }

  if (!init) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/novedades')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />Volver a Novedades
        </Button>
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>No se pudo cargar el catálogo de novedades. Vuelve a intentarlo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/novedades')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />Volver a Novedades
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Registrar Novedad</h1>
        <p className="mt-1 text-muted-foreground">
          Reporta permisos, incapacidades, ausencias, vacaciones o terminaciones de contrato
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-4 sm:p-6">
          <BarraPasos actual={paso} />
        </CardContent>
      </Card>

      {paso === 1 && (
        <PasoTipoNovedad
          categorias={init.categorias}
          categoriaSeleccionada={borrador.categoria}
          motivoSeleccionado={borrador.motivo}
          onSeleccionar={(categoria, motivo) => cambiar({ categoria, motivo })}
        />
      )}

      {paso === 2 && (
        <PasoDetalles
          borrador={borrador}
          categorias={init.categorias}
          soporte={init.parametros.soporte}
          onCambiar={cambiar}
        />
      )}

      {paso === 3 && (
        <PasoConfirmacion
          borrador={borrador}
          categorias={init.categorias}
          estadoInicial={init.estado_inicial_ausencias}
        />
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="outline" onClick={retroceder} disabled={guardando} className="gap-2">
          <ArrowLeft className="h-4 w-4" />{paso === 1 ? 'Cancelar' : 'Anterior'}
        </Button>
        {paso < TOTAL_PASOS ? (
          <Button onClick={avanzar} className="gap-2">
            Siguiente<ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={confirmar} disabled={guardando} className="gap-2 bg-success hover:bg-success/90">
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {esAusencia(borrador) ? 'Registrar Novedad'
              : esVacaciones(borrador) ? 'Registrar Solicitud'
              : 'Registrar Terminación'}
          </Button>
        )}
      </div>
    </div>
  );
}
