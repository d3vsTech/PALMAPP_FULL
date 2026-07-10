<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Pago — {{ $a['tercero']['nombre'] }}</title>
    <style>
        * { font-family: 'Helvetica', Arial, sans-serif; box-sizing: border-box; }
        body { margin: 0; padding: 28px; color: #1f2937; font-size: 11px; background: #fff; }

        /* ── Header ── */
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #166534; }
        .header-finca h1 { font-size: 17px; color: #166534; font-weight: 700; margin: 0 0 4px; }
        .header-finca p  { font-size: 10px; color: #6b7280; line-height: 1.6; margin: 0; }
        .comprobante-badge { text-align: right; vertical-align: top; }
        .comprobante-badge .badge-label { font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px; }
        .comprobante-badge .badge-num { font-size: 14px; font-weight: 700; color: #1f2937; border: 2px solid #1f2937; padding: 6px 14px; display: inline-block; border-radius: 4px; }

        /* ── Período / Fecha ── */
        .periodo-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .periodo-table td { width: 50%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 4px; }
        .periodo-table .plabel { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 3px; }
        .periodo-table .pvalue { font-size: 13px; font-weight: 600; color: #111827; }

        /* ── Beneficiario ── */
        .section-label { font-size: 9px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .benef-table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 16px; }
        .benef-table td { padding: 9px 14px; }
        .benef-table td.right-cell { border-left: 1px solid #e5e7eb; }
        .benef-table tr.bottom-row td { border-top: 1px solid #e5e7eb; }
        .blabel { font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; display: block; margin-bottom: 2px; }
        .bvalue { font-size: 11px; font-weight: 600; color: #111827; }

        /* ── Tabla operarios ── */
        .table-title { font-size: 9px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .detalle { width: 100%; border-collapse: collapse; margin-bottom: 0; }
        .detalle thead tr { background: #166534; }
        .detalle thead th { color: #fff; padding: 7px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; }
        .detalle thead th.right { text-align: right; }
        .detalle tbody tr:nth-child(odd) { background: #fff; }
        .detalle tbody tr:nth-child(even) { background: #f9fafb; }
        .detalle tbody td { padding: 7px 8px; font-size: 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        .detalle tbody td.right { text-align: right; }
        .detalle tbody td.center { text-align: center; }
        .labor-list { font-size: 9px; color: #6b7280; }
        .desc-row td { background: #fefce8 !important; font-size: 9.5px; color: #78350f; padding: 4px 8px 4px 24px; border-bottom: 1px dashed #fde68a; }
        .desc-row td.right { text-align: right; }

        /* ── Total ── */
        .total-section { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .total-section td.tlabel { text-align: right; font-weight: 700; font-size: 12px; color: #374151; padding: 10px 14px 10px 0; }
        .total-section td.tvalue { text-align: right; font-weight: 700; font-size: 17px; color: #166534; padding: 10px 0; width: 160px; }

        /* ── Son ── */
        .son-table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 28px; }
        .son-table td { padding: 10px 16px; }
        .son-table td.son-label { font-size: 10px; color: #6b7280; }
        .son-table td.son-value { text-align: right; font-weight: 700; font-size: 13px; color: #166534; }

        /* ── Firmas ── */
        .firma-table { width: 100%; border-collapse: collapse; margin-top: 36px; }
        .firma-table td { width: 50%; padding: 0 20px; text-align: center; vertical-align: bottom; }
        .firma-name { font-size: 11px; font-weight: 600; color: #1f2937; margin-bottom: 6px; }
        .firma-line { border-top: 1px solid #6b7280; padding-top: 5px; font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; }

        .footer { text-align: center; font-size: 9px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; }

        @php
            $fmt = fn ($n) => '$' . number_format((float) $n, 0, ',', '.');
            $meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
            $fechaPago = !empty($a['acta']['pagado_at']) ? \Carbon\Carbon::parse($a['acta']['pagado_at']) : null;
            $fechaLabel = $fechaPago
                ? (sprintf('%02d', $fechaPago->day) . ' de ' . ($meses[$fechaPago->month - 1]) . ' de ' . $fechaPago->year)
                : '—';
            $docLabel = ($a['tercero']['tipo_persona'] ?? '') === 'JURIDICA' ? 'NIT' : 'Cédula';
            $docValue = ($a['tercero']['tipo_persona'] ?? '') === 'JURIDICA'
                ? ($a['tercero']['nit'] ?? '—')
                : ($a['tercero']['cedula'] ?? '—');
        @endphp
    </style>
</head>
<body>

    {{-- ── Header: finca + comprobante ── --}}
    <table class="header-table">
        <tr>
            <td class="header-finca">
                <h1>{{ $a['tenant']['nombre'] }}</h1>
                <p>
                    NIT: {{ $a['tenant']['nit'] ?? '—' }}<br>
                    {{ $a['tenant']['municipio'] ?? '' }}{{ !empty($a['tenant']['municipio']) ? ', Colombia' : '' }}<br>
                    @if (!empty($a['tenant']['telefono']))Tel {{ $a['tenant']['telefono'] }}@endif
                </p>
            </td>
            <td class="comprobante-badge">
                <span class="badge-label">Comprobante de pago</span>
                <span class="badge-num">No. {{ $a['acta']['numero_comprobante'] }}</span>
            </td>
        </tr>
    </table>

    {{-- ── Período / Fecha de pago ── --}}
    <table class="periodo-table">
        <tr>
            <td style="margin-right: 8px;">
                <span class="plabel">Período</span>
                <span class="pvalue">{{ $a['nomina']['periodo_label'] }}</span>
            </td>
            <td style="margin-left: 8px;">
                <span class="plabel">Fecha de pago</span>
                <span class="pvalue">{{ $fechaLabel }}</span>
            </td>
        </tr>
    </table>

    {{-- ── Beneficiario ── --}}
    <div class="section-label">Señores (Beneficiario)</div>
    <table class="benef-table">
        <tr>
            <td>
                <span class="blabel">Empresa / Razón Social</span>
                <span class="bvalue">{{ $a['tercero']['nombre'] }}</span>
            </td>
            <td class="right-cell">
                <span class="blabel">{{ $docLabel }}</span>
                <span class="bvalue">{{ $docValue }}</span>
            </td>
        </tr>
        <tr class="bottom-row">
            <td>
                <span class="blabel">Contacto</span>
                <span class="bvalue">{{ $a['tercero']['representante'] ?? '—' }}</span>
            </td>
            <td class="right-cell">
                <span class="blabel">Teléfono</span>
                <span class="bvalue">{{ $a['tercero']['telefono'] ?? '—' }}</span>
            </td>
        </tr>
    </table>

    {{-- ── Detalle de operarios ── --}}
    <div class="table-title">Detalle de Servicios Prestados</div>
    <table class="detalle">
        <thead>
            <tr>
                <th style="width:4%">#</th>
                <th style="width:22%">Operario</th>
                <th style="width:11%">Documento</th>
                <th style="width:23%">Cargo / Labores</th>
                <th class="right" style="width:12%">Jornales</th>
                <th class="right" style="width:12%">Cosecha</th>
                <th class="right" style="width:12%">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($a['operarios'] as $i => $op)
                <tr>
                    <td class="center">{{ $i + 1 }}</td>
                    <td>{{ $op['nombre_completo'] }}</td>
                    <td>{{ $op['cedula'] ?? '—' }}</td>
                    <td>
                        {{ $op['cargo'] ?? '—' }}
                        @if (!empty($op['labores_realizadas']))
                            <div class="labor-list">· {{ implode(', ', $op['labores_realizadas']) }}</div>
                        @endif
                    </td>
                    <td class="right">{{ $fmt($op['total_jornales']) }}</td>
                    <td class="right">{{ ((float) $op['total_cosecha']) > 0 ? $fmt($op['total_cosecha']) : '—' }}</td>
                    <td class="right">{{ $fmt($op['subtotal']) }}</td>
                </tr>
                @foreach ($op['descuentos'] as $desc)
                    <tr class="desc-row">
                        <td></td>
                        <td colspan="5">
                            ↳ {{ $desc['concepto_nombre'] ?? $desc['concepto_codigo'] ?? 'Descuento' }}
                            @if (!empty($desc['observacion']))
                                · {{ $desc['observacion'] }}
                            @endif
                        </td>
                        <td class="right">– {{ $fmt($desc['valor']) }}</td>
                    </tr>
                @endforeach
            @endforeach
        </tbody>
    </table>

    {{-- ── Total ── --}}
    <table class="total-section">
        <tr>
            <td class="tlabel">Total a pagar</td>
            <td class="tvalue">{{ $fmt($a['acta']['total_a_transferir']) }}</td>
        </tr>
    </table>

    {{-- ── Son ── --}}
    <table class="son-table">
        <tr>
            <td class="son-label">Son:</td>
            <td class="son-value">{{ $fmt($a['acta']['total_a_transferir']) }} COP</td>
        </tr>
    </table>

    {{-- ── Firmas ── --}}
    <table class="firma-table">
        <tr>
            <td>
                <div class="firma-name">{{ $a['acta']['pagado_por'] ?? 'Administrador' }}</div>
                <div class="firma-line">Elaborado por</div>
            </td>
            <td>
                <div class="firma-name">{{ $a['tercero']['nombre'] }}</div>
                <div class="firma-line">Recibido por</div>
            </td>
        </tr>
    </table>

    <div class="footer">
        Sistema Agro Campo · Nómina #{{ $a['nomina']['id'] }} · Comprobante {{ $a['acta']['numero_comprobante'] }}
    </div>

</body>
</html>
