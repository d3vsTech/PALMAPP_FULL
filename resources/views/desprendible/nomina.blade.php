<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Desprendible — {{ $d['empleado']['nombre_completo'] }}</title>
    <style>
        * { font-family: 'Helvetica', Arial, sans-serif; box-sizing: border-box; }
        body { margin: 0; padding: 24px; color: #1f2937; font-size: 11px; }
        h1 { font-size: 18px; margin: 0 0 4px; color: #14532d; }
        h2 { font-size: 13px; margin: 16px 0 8px; color: #166534; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .header-table td { padding: 8px; vertical-align: top; background: #f9fafb; border: 1px solid #e5e7eb; width: 50%; }
        .header-table .label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .header-table .value { font-size: 12px; font-weight: 600; color: #111827; }
        .section { background: #f0fdf4; border-left: 4px solid #84cc16; padding: 10px 12px; margin-bottom: 12px; }
        .section.deducciones { background: #fef2f2; border-left-color: #ef4444; }
        .section h3 { color: #166534; font-size: 11px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .section.deducciones h3 { color: #991b1b; }
        .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
        .row.bold { font-weight: 700; border-top: 1px solid #d1d5db; padding-top: 6px; margin-top: 6px; font-size: 12px; }
        .total { background: #f3f4f6; border: 1px solid #d1d5db; padding: 12px; margin-top: 12px; font-size: 16px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; color: #166534; }
        .firma-table { width: 100%; margin-top: 32px; }
        .firma-cell { border-top: 1px solid #6b7280; padding-top: 6px; text-align: center; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
        .footer { text-align: center; font-size: 10px; color: #6b7280; margin-top: 16px; }
        .grupo-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
        .grupo-table th { background: #ecfccb; color: #166534; padding: 6px 4px; text-align: left; font-size: 9px; text-transform: uppercase; }
        .grupo-table td { padding: 4px; border-bottom: 1px solid #e5e7eb; }
        .grupo-table .total-row td { background: #f3f4f6; font-weight: 700; }
        .right { text-align: right; }
        .center { text-align: center; }
        .grupo-titulo { background: #ecfccb; color: #166534; padding: 6px 10px; font-weight: 700; font-size: 11px; margin: 14px 0 0; border-radius: 4px 4px 0 0; }
        @php
            $fmt = fn ($n) => '$' . number_format((float) $n, 0, ',', '.');
        @endphp
    </style>
</head>
<body>
    <h1>Desprendible de Nómina</h1>
    <div style="font-size: 10px; color: #6b7280; margin-bottom: 14px;">
        FINCA <strong style="color: #166534;">{{ strtoupper($d['finca'] ?? '—') }}</strong>
    </div>

    <table class="header-table">
        <tr>
            <td>
                <div class="label">Nombre</div>
                <div class="value">{{ $d['empleado']['nombre_completo'] }}</div>
            </td>
            <td>
                <div class="label">Cédula</div>
                <div class="value">{{ $d['empleado']['documento'] ?? '—' }}</div>
            </td>
        </tr>
        <tr>
            <td>
                <div class="label">Fecha</div>
                <div class="value">{{ $d['liquidacion']['fecha_humana'] ?? $d['liquidacion']['fecha'] ?? '—' }}</div>
            </td>
            <td>
                <div class="label">Período</div>
                <div class="value">{{ $d['nomina']['periodo_label'] }}</div>
            </td>
        </tr>
        <tr>
            <td>
                <div class="label">Base</div>
                <div class="value">{{ $d['empleado']['salario_tipo'] }}</div>
            </td>
            <td>
                <div class="label">Días cancelados</div>
                <div class="value">{{ $d['liquidacion']['dias_trabajados'] }}</div>
            </td>
        </tr>
    </table>

    @if ($d['empleado']['salario_tipo'] === 'VARIABLE' && !empty($d['resumen_trabajo']))
        @php $rt = $d['resumen_trabajo']; @endphp

        @if (!empty($rt['cosecha']['filas']))
            <div class="grupo-titulo">Cosecha</div>
            <table class="grupo-table">
                <thead>
                    <tr>
                        <th>Fecha</th><th>Lote</th><th>Sublote</th><th>Cosecha</th>
                        <th class="right">Racimos</th><th class="right">Prom.</th>
                        <th class="right">Peso (kg)</th><th class="right">Precio/kg</th>
                        <th class="right">Total</th><th class="right">Jornal</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($rt['cosecha']['filas'] as $f)
                    <tr>
                        <td>{{ $f['fecha'] }}</td>
                        <td>{{ $f['lote'] }}</td>
                        <td>{{ $f['sublote'] }}</td>
                        <td>{{ $f['cosecha'] }}</td>
                        <td class="right">{{ $f['racimos'] }}</td>
                        <td class="right">{{ number_format($f['promedio_kg'], 1) }}</td>
                        <td class="right">{{ number_format($f['peso_kg'], 0) }}</td>
                        <td class="right">{{ $fmt($f['precio_kg']) }}</td>
                        <td class="right">{{ $fmt($f['total_cosecha']) }}</td>
                        <td class="right">{{ $fmt($f['jornal']) }}</td>
                    </tr>
                    @endforeach
                    <tr class="total-row">
                        <td colspan="4">Subtotal Cosecha</td>
                        <td class="right">{{ $rt['cosecha']['subtotal_racimos'] }}</td>
                        <td></td>
                        <td class="right">{{ number_format($rt['cosecha']['subtotal_peso'], 0) }}</td>
                        <td></td>
                        <td class="right">{{ $fmt($rt['cosecha']['subtotal_valor']) }}</td>
                        <td class="right">{{ $fmt($rt['cosecha']['subtotal_jornal']) }}</td>
                    </tr>
                </tbody>
            </table>
        @endif

        @foreach (['plateo' => 'Plateo', 'poda' => 'Poda', 'fertilizacion' => 'Fertilización'] as $key => $label)
            @if (!empty($rt[$key]['filas']))
                <div class="grupo-titulo">{{ $label }}</div>
                <table class="grupo-table">
                    <thead>
                        <tr>
                            <th>Fecha</th><th>Lote</th><th>Sublote</th>
                            <th class="right">Palmas</th><th class="right">Precio/palma</th>
                            <th class="right">Total</th><th class="right">Jornal</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($rt[$key]['filas'] as $f)
                        <tr>
                            <td>{{ $f['fecha'] }}</td>
                            <td>{{ $f['lote'] }}</td>
                            <td>{{ $f['sublote'] }}</td>
                            <td class="right">{{ $f['palmas'] }}</td>
                            <td class="right">{{ $fmt($f['precio_palma']) }}</td>
                            <td class="right">{{ $fmt($f['total_palmas']) }}</td>
                            <td class="right">{{ $fmt($f['jornal']) }}</td>
                        </tr>
                        @endforeach
                        <tr class="total-row">
                            <td colspan="3">Subtotal {{ strtoupper($label) }}</td>
                            <td class="right">{{ $rt[$key]['subtotal_palmas'] }}</td>
                            <td></td>
                            <td class="right">{{ $fmt($rt[$key]['subtotal_valor']) }}</td>
                            <td class="right">{{ $fmt($rt[$key]['subtotal_jornal']) }}</td>
                        </tr>
                    </tbody>
                </table>
            @endif
        @endforeach

        @foreach (['sanidad' => 'Sanidad', 'otros' => 'Otros'] as $key => $label)
            @if (!empty($rt[$key]['filas']))
                <div class="grupo-titulo">{{ $label }}</div>
                <table class="grupo-table">
                    <thead>
                        <tr>
                            <th>Fecha</th><th>Lote</th><th>Sublote</th><th>Descripción</th>
                            <th class="right">Jornal</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($rt[$key]['filas'] as $f)
                        <tr>
                            <td>{{ $f['fecha'] }}</td>
                            <td>{{ $f['lote'] }}</td>
                            <td>{{ $f['sublote'] }}</td>
                            <td>{{ $f['descripcion'] }}</td>
                            <td class="right">{{ $fmt($f['jornal']) }}</td>
                        </tr>
                        @endforeach
                        <tr class="total-row">
                            <td colspan="4">Subtotal {{ strtoupper($label) }}</td>
                            <td class="right">{{ $fmt($rt[$key]['subtotal_jornal']) }}</td>
                        </tr>
                    </tbody>
                </table>
            @endif
        @endforeach

        @if (!empty($rt['finca']['filas']))
            <div class="grupo-titulo">Labores de Finca</div>
            <table class="grupo-table">
                <thead><tr><th>Fecha</th><th>Labor</th><th>Lugar</th><th class="right">Jornal</th></tr></thead>
                <tbody>
                    @foreach ($rt['finca']['filas'] as $f)
                    <tr>
                        <td>{{ $f['fecha'] }}</td>
                        <td>{{ $f['labor'] }}</td>
                        <td>{{ $f['lugar'] }}</td>
                        <td class="right">{{ $fmt($f['jornal']) }}</td>
                    </tr>
                    @endforeach
                    <tr class="total-row">
                        <td colspan="3">Subtotal Finca</td>
                        <td class="right">{{ $fmt($rt['finca']['subtotal_jornal']) }}</td>
                    </tr>
                </tbody>
            </table>
        @endif
    @endif

    <h2>Devengado</h2>
    <div class="section">
        @if ($d['empleado']['salario_tipo'] === 'FIJO')
            <div class="row"><span>SUELDO BÁSICO</span><span>{{ $fmt($d['empleado']['salario_base']) }}</span></div>
        @else
            <div class="row"><span>BASE (JORNALES)</span><span>{{ $fmt($d['liquidacion']['total_jornales'] + $d['liquidacion']['total_cosecha']) }}</span></div>
        @endif
        @if ($d['liquidacion']['total_horas_extra'] > 0)
            <div class="row"><span>HORAS EXTRA</span><span>{{ $fmt($d['liquidacion']['total_horas_extra']) }}</span></div>
        @endif
        @if ($d['liquidacion']['total_recargos'] > 0)
            <div class="row"><span>RECARGOS</span><span>{{ $fmt($d['liquidacion']['total_recargos']) }}</span></div>
        @endif
        @if ($d['liquidacion']['total_incapacidades'] > 0)
            <div class="row"><span>INCAPACIDADES</span><span>{{ $fmt($d['liquidacion']['total_incapacidades']) }}</span></div>
        @endif
        @foreach ($d['liquidacion']['bonificaciones'] as $b)
            <div class="row"><span>{{ strtoupper($b['observacion'] ?? $b['nombre']) }}</span><span>{{ $fmt($b['valor']) }}</span></div>
        @endforeach
        <div class="row bold"><span>TOTAL BRUTO</span><span>{{ $fmt($d['liquidacion']['total_devengado'] + $d['liquidacion']['total_bonificaciones']) }}</span></div>
        @if ($d['liquidacion']['subsidio_transporte'] > 0)
            <div class="row"><span>SUBSIDIO TRANSPORTE</span><span>{{ $fmt($d['liquidacion']['subsidio_transporte']) }}</span></div>
        @endif
    </div>

    <h2>Deducciones</h2>
    <div class="section deducciones">
        @forelse ($d['liquidacion']['deducciones'] as $de)
            <div class="row">
                <span>{{ strtoupper($de['nombre']) }}{{ $de['porcentaje'] ? ' (' . number_format($de['porcentaje'], 0) . '%)' : '' }}</span>
                <span>{{ $fmt($de['valor']) }}</span>
            </div>
        @empty
            <div class="row"><span>Sin deducciones</span><span>$0</span></div>
        @endforelse
    </div>

    <div class="total"><span>TOTAL NETO</span><span>{{ $fmt($d['liquidacion']['total_neto']) }}</span></div>

    <table class="firma-table">
        <tr>
            <td style="width: 50%; padding: 24px 12px 0;"><div class="firma-cell">Firma recibido</div></td>
            <td style="width: 50%; padding: 24px 12px 0;"><div class="firma-cell">Huella</div></td>
        </tr>
    </table>

    <div class="footer">
        Este desprendible es un documento oficial de pago. Consérvelo para sus registros.
    </div>
</body>
</html>
