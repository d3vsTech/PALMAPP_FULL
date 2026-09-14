/**
 * Tarjeta de desprendible de una fila liquidada (diseño V.25). Pinta lo
 * que ya trae el período (§2.5) y, al desplegar, el comprobante legal
 * completo del backend (§6.1): componentes de la base, descuentos de
 * días, método de liquidación con sus normas y advertencias.
 *
 * El desglose se pide solo al abrirlo para no disparar una petición por
 * colaborador al entrar al período.
 */
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import {
  TrendingUp, Loader2, FileDown, Banknote, Undo2, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import type { DesprendibleLiquidacion, LiquidacionFila } from '../../../../api/liquidaciones';
import { formatFecha } from '../../../utils/fecha';
import { fmtCOP, getIniciales, TEXTOS_PERIODO, type TipoPeriodoDetalle } from './textos';

interface Props {
  fila: LiquidacionFila;
  tipo: TipoPeriodoDetalle;
  anio: number;
  /** Comprobante completo, si ya se cargó. */
  detalle?: DesprendibleLiquidacion;
  cargandoDetalle: boolean;
  expandido: boolean;
  onToggleDetalle: () => void;
  descargandoPdf: boolean;
  onDescargarPdf: () => void;
  onRegistrarGiro: () => void;
  onAnularGiro: () => void;
}

/** Fila de "etiqueta ... valor" del cuerpo del desprendible. */
function Linea({ label, valor, fuerte }: { label: string; valor: React.ReactNode; fuerte?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs uppercase tracking-wide font-medium ${fuerte ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
        {label}
      </span>
      <span className={`text-sm ${fuerte ? 'font-bold text-primary' : 'font-medium'}`}>{valor}</span>
    </div>
  );
}

export default function DesprendibleFilaCard({
  fila, tipo, anio, detalle, cargandoDetalle, expandido, onToggleDetalle,
  descargandoPdf, onDescargarPdf, onRegistrarGiro, onAnularGiro,
}: Props) {
  const txt = TEXTOS_PERIODO[tipo];
  const esCesantias = tipo === 'CESANTIAS';
  const col = fila.empleado;
  const girada = fila.estado_pago !== 'PENDIENTE';

  const metodoLabel = fila.metodo_base === 'ULTIMO_SALARIO'
    ? 'Último salario'
    : fila.metodo_base === 'PROMEDIO'
      ? 'Promedio devengado'
      : fila.metodo_base === 'MANUAL'
        ? 'Ajuste manual'
        : null;

  return (
    <Card className="border-border overflow-hidden print:break-inside-avoid">
      {/* Encabezado del desprendible */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background">
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
          {getIniciales(col.nombre_completo)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{col.nombre_completo}</p>
          <p className="text-xs text-muted-foreground truncate">{col.cargo ?? '—'}</p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <p className="text-xs text-muted-foreground">Fondo</p>
          <p className="text-sm font-medium">{col.fondo_cesantias ?? '—'}</p>
        </div>
      </div>

      {/* Barra de datos */}
      <div className="grid grid-cols-3 divide-x divide-border bg-muted/20 border-b border-border">
        <div className="px-5 py-3">
          <p className="text-xs text-muted-foreground mb-0.5">Cédula</p>
          <p className="text-sm font-medium">{col.documento}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-muted-foreground mb-0.5">{esCesantias ? 'Días Computados' : 'Días Base'}</p>
          <p className="text-sm font-medium">
            {esCesantias ? fila.dias_computados : (fila.dias_base_intereses ?? fila.dias_computados)}
          </p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-muted-foreground mb-0.5">{esCesantias ? 'Período' : 'Tasa'}</p>
          <p className="text-sm font-medium">
            {esCesantias ? anio : `${fila.tasa_aplicada ?? 12}% anual`}
          </p>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Base de cálculo */}
        <div className="bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-2 px-5 pt-4 pb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Base de Cálculo</span>
            {metodoLabel && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground ml-auto">{metodoLabel}</span>
            )}
          </div>

          {esCesantias ? (
            <>
              {/* El desglose viene del comprobante legal; sin él se muestra
                  la base prestacional que ya trae el período. */}
              {detalle && (
                <div className="px-5 pb-1 space-y-2">
                  <Linea label="Salario Básico" valor={fmtCOP(detalle.base.salario_basico)} />
                  <Linea
                    label="Auxilio de Transporte"
                    valor={detalle.base.auxilio_transporte > 0
                      ? fmtCOP(detalle.base.auxilio_transporte)
                      : <span className="text-muted-foreground">$0</span>}
                  />
                  <Linea
                    label="Promedio Variables"
                    valor={detalle.base.promedio_variables > 0
                      ? fmtCOP(detalle.base.promedio_variables)
                      : <span className="text-muted-foreground">$0</span>}
                  />
                </div>
              )}
              <div className={`mx-5 ${detalle ? 'my-3' : 'mt-1 mb-3'} border-t border-primary/20`} />
              <div className="px-5 pb-4">
                <Linea label="Base Prestacional" valor={fmtCOP(fila.base_prestacional)} fuerte />
              </div>
            </>
          ) : (
            <>
              <div className="px-5 pb-1 space-y-2">
                <Linea label="Saldo Cesantías" valor={fmtCOP(fila.saldo_cesantias ?? fila.base_prestacional)} />
                <Linea
                  label="Tasa de Interés"
                  valor={<>{fila.tasa_aplicada ?? 12}% anual <span className="text-muted-foreground text-xs">(Ley 52/75)</span></>}
                />
                <Linea label="Días Base" valor={fila.dias_base_intereses ?? fila.dias_computados} />
              </div>
              <div className="mx-5 my-3 border-t border-primary/20" />
              <div className="flex justify-between items-center px-5 pb-4">
                <span className="text-xs uppercase tracking-wide font-bold text-primary">Fórmula</span>
                <span className="text-xs text-primary">
                  {detalle?.resultado.formula_aplicada ?? txt.formulaGenerica}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Resultado */}
        {esCesantias && (
          <div className="px-5 pt-4 pb-2 space-y-2">
            <Linea label="Días" valor={fila.dias_computados} />
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Fórmula</span>
              <span className="text-xs text-muted-foreground">
                {detalle?.resultado.formula_aplicada ?? txt.formulaGenerica}
              </span>
            </div>
          </div>
        )}
        <div className={`mx-5 border-t-2 border-primary/20 ${esCesantias ? '' : 'mt-4'}`} />
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-sm uppercase tracking-wide font-bold">{txt.totalCardLabel}</span>
          <span className="text-xl font-bold text-primary">{fmtCOP(fila.valor_final)}</span>
        </div>

        {/* Estado del giro */}
        <div className={`px-5 py-3 border-t border-border ${girada ? 'bg-success/5' : 'bg-orange-50'}`}>
          {girada ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-success">{txt.giradoLabel}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fila.fecha_pago ? formatFecha(fila.fecha_pago) : ''}
                  {fila.metodo_pago ? ` · ${fila.metodo_pago}` : ''}
                  {fila.referencia_pago ? ` · Ref ${fila.referencia_pago}` : ''}
                  {esCesantias && fila.fondo_consignacion ? ` · ${fila.fondo_consignacion}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-success">{fmtCOP(fila.valor_pagado ?? fila.valor_final)}</p>
                {fila.dias_mora != null && fila.dias_mora > 0 && (
                  <p className="text-xs text-orange-600">{fila.dias_mora} día(s) de mora</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs uppercase tracking-wide font-semibold text-orange-700">
              Pendiente por {esCesantias ? 'consignar' : 'pagar'}
            </p>
          )}
        </div>

        {/* Desglose legal completo (§6.1) */}
        {expandido && (
          <div className="px-5 py-4 border-t border-border bg-muted/10 space-y-4">
            {cargandoDetalle && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando desglose...
              </div>
            )}

            {detalle && (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Tiempo de servicio
                  </p>
                  <div className="space-y-1.5">
                    <Linea label="Desde" valor={formatFecha(detalle.dias.fecha_computo_desde)} />
                    <Linea label="Hasta" valor={formatFecha(detalle.dias.fecha_computo_hasta)} />
                    <Linea label="Días de vinculación" valor={detalle.dias.dias_vinculacion} />
                    {detalle.dias.dias_descontados > 0 && (
                      <Linea label="Días descontados" valor={detalle.dias.dias_descontados} />
                    )}
                  </div>
                  {detalle.dias.detalle_descuentos.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {detalle.dias.detalle_descuentos.map((d, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          {d.tipo.replace(/_/g, ' ').toLowerCase()}: {formatFecha(d.desde)} a {formatFecha(d.hasta)} ({d.dias} días)
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {esCesantias && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Componentes del período
                    </p>
                    <div className="space-y-1.5">
                      <Linea label="Ordinario" valor={fmtCOP(detalle.base.componentes.ordinario)} />
                      <Linea label="Variables" valor={fmtCOP(detalle.base.componentes.variables)} />
                      <Linea label="Auxilio devengado" valor={fmtCOP(detalle.base.componentes.auxilio_devengado)} />
                      {detalle.base.componentes.bonificaciones_excluidas > 0 && (
                        <Linea label="Bonificaciones excluidas" valor={fmtCOP(detalle.base.componentes.bonificaciones_excluidas)} />
                      )}
                      <Linea label="Meses base" valor={detalle.base.meses_base} />
                      <Linea label="Cobertura de nóminas" valor={`${detalle.base.cobertura_nominas_pct}%`} />
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Método de liquidación
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{detalle.metodo_liquidacion.texto}</p>
                  {detalle.metodo_liquidacion.normas.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      <span className="font-medium text-foreground">Normas:</span> {detalle.metodo_liquidacion.normas.join(' · ')}
                    </p>
                  )}
                </div>

                {detalle.advertencias.length > 0 && (
                  <div className="space-y-1.5">
                    {detalle.advertencias.map((a, i) => (
                      <p key={i} className="text-xs text-orange-700 flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {a.mensaje ?? a.code}
                      </p>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Comprobante {detalle.numero_comprobante} · Liquidado el {detalle.liquidacion.fecha_humana} por {detalle.liquidacion.liquidado_por}
                </p>
              </>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-border flex-wrap print:hidden">
          <Button variant="ghost" size="sm" onClick={onToggleDetalle} className="gap-1.5">
            {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expandido ? 'Ocultar desglose' : 'Ver desglose'}
          </Button>
          <div className="ml-auto flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onDescargarPdf} disabled={descargandoPdf} className="gap-1.5">
              {descargandoPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Desprendible PDF
            </Button>
            {girada ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAnularGiro}
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Undo2 className="h-4 w-4" />
                Anular
              </Button>
            ) : (
              <Button size="sm" onClick={onRegistrarGiro} className="gap-1.5">
                <Banknote className="h-4 w-4" />
                {txt.girarFila}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
