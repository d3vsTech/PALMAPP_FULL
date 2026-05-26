<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Factura {{ $pedido->codigo }}</title>
    <style>
        * { font-family: 'Helvetica', Arial, sans-serif; box-sizing: border-box; }
        body { margin: 0; padding: 32px; color: #1f2937; font-size: 11px; }

        .header-wrap { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .header-wrap td { vertical-align: top; padding: 0; }
        .empresa-nombre { font-size: 18px; font-weight: 700; color: #166534; margin: 0 0 4px; }
        .empresa-info { font-size: 10px; color: #374151; line-height: 1.6; }
        .pedido-box { text-align: right; }
        .pedido-box .ref { font-size: 11px; color: #374151; line-height: 1.8; }
        .pedido-box .ref strong { color: #111827; }

        .titulo { text-align: center; font-size: 15px; font-weight: 700; letter-spacing: 2px;
                  text-transform: uppercase; border-top: 2px solid #166534;
                  border-bottom: 2px solid #166534; padding: 10px 0; margin: 20px 0; color: #166534; }

        .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase;
                         letter-spacing: 1px; color: #166534; border-bottom: 1px solid #d1d5db;
                         padding-bottom: 4px; margin: 16px 0 10px; }

        .cliente-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .cliente-table td { padding: 4px 6px; vertical-align: top; }
        .cliente-table .label { color: #6b7280; width: 110px; }
        .cliente-table .value { color: #111827; font-weight: 600; }

        .productos-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
        .productos-table th { background: #f0fdf4; color: #166534; font-size: 9px;
                               text-transform: uppercase; padding: 7px 10px; text-align: left;
                               border-bottom: 1px solid #d1d5db; }
        .productos-table th.right { text-align: right; }
        .productos-table td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; color: #1f2937; }
        .productos-table td.right { text-align: right; }
        .productos-table tbody tr:nth-child(even) td { background: #f9fafb; }

        .total-row td { background: #f0fdf4; font-weight: 700; font-size: 13px;
                        padding: 10px 10px; border-top: 2px solid #166534; }
        .total-row td.right { text-align: right; color: #166534; }

        .pago-wrap { margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px 14px; }
        .pago-row { display: table; width: 100%; font-size: 10px; padding: 2px 0; }
        .pago-label { display: table-cell; color: #6b7280; width: 150px; }
        .pago-value { display: table-cell; color: #111827; font-weight: 600; }

        .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .badge-pendiente { background: #fef3c7; color: #92400e; }
        .badge-pagado    { background: #d1fae5; color: #065f46; }

        .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 10px;
                  text-align: center; font-size: 9px; color: #9ca3af; }

        @php
            $fmt = fn ($n) => '$' . number_format((float) $n, 0, ',', '.');
        @endphp
    </style>
</head>
<body>

    {{-- ══════════════ CABECERA ══════════════ --}}
    <table class="header-wrap">
        <tr>
            <td style="width: 55%;">
                <div class="empresa-nombre">{{ $pedido->proveedor->nombre_empresa }}</div>
                <div class="empresa-info">
                    NIT: {{ $pedido->proveedor->nit ?? '—' }}<br>
                    {{ $pedido->proveedor->direccion ?? '' }}
                    @if($pedido->proveedor->ciudad), {{ $pedido->proveedor->ciudad }}@endif
                    <br>
                    @if($pedido->proveedor->telefono)Tel: {{ $pedido->proveedor->telefono }}<br>@endif
                    {{ $pedido->proveedor->email ?? '' }}
                </div>
            </td>
            <td class="pedido-box">
                <div class="ref">
                    <strong>Pedido:</strong> {{ $pedido->codigo }}<br>
                    <strong>Fecha:</strong> {{ $pedido->fecha_pedido->format('j/n/Y') }}<br>
                    <strong>Estado:</strong>
                    @php
                        $etiquetas = [
                            'pendiente'   => 'Pendiente Confirmación',
                            'confirmado'  => 'Confirmado',
                            'preparando'  => 'En Preparación',
                            'en_transito' => 'En Tránsito',
                            'entregado'   => 'Entregado',
                            'cancelado'   => 'Cancelado',
                        ];
                    @endphp
                    {{ $etiquetas[$pedido->estado] ?? $pedido->estado }}<br>
                    @if($pedido->numero_guia)
                        <strong>Guía:</strong> {{ $pedido->numero_guia }}<br>
                    @endif
                    @if($pedido->fecha_entrega_estimada)
                        <strong>Entrega est.:</strong> {{ $pedido->fecha_entrega_estimada->format('j/n/Y') }}
                    @endif
                </div>
            </td>
        </tr>
    </table>

    {{-- ══════════════ TÍTULO ══════════════ --}}
    <div class="titulo">Factura de Venta</div>

    {{-- ══════════════ DATOS DEL CLIENTE ══════════════ --}}
    <div class="section-title">Datos del Cliente</div>
    <table class="cliente-table">
        <tr>
            <td class="label">Cliente</td>
            <td class="value">{{ $pedido->tenant->nombre }}</td>
            <td class="label">Teléfono</td>
            <td class="value">{{ $pedido->tenant->telefono ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Dirección de entrega</td>
            <td class="value" colspan="3">{{ $pedido->direccion_entrega }}</td>
        </tr>
        @if($pedido->notas)
        <tr>
            <td class="label">Notas</td>
            <td class="value" colspan="3">{{ $pedido->notas }}</td>
        </tr>
        @endif
    </table>

    {{-- ══════════════ DETALLE DE PRODUCTOS ══════════════ --}}
    <div class="section-title">Detalle de Productos</div>
    <table class="productos-table">
        <thead>
            <tr>
                <th style="width: 45%;">Producto</th>
                <th>Cantidad</th>
                <th class="right">P. Unitario</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($pedido->items as $item)
            <tr>
                <td>{{ $item->nombre_producto }}</td>
                <td>
                    {{ $item->cantidad }}
                    @if($item->producto)
                        {{ optional($item->producto->unidadMedida)->abreviatura ?? '' }}
                    @endif
                </td>
                <td class="right">{{ $fmt($item->precio_unitario) }}</td>
                <td class="right">{{ $fmt($item->subtotal) }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            @if((float) $pedido->costo_envio > 0)
            <tr>
                <td colspan="3" class="right" style="padding: 6px 10px; color: #6b7280;">Envío</td>
                <td class="right" style="padding: 6px 10px; color: #6b7280;">{{ $fmt($pedido->costo_envio) }}</td>
            </tr>
            @endif
            <tr class="total-row">
                <td colspan="3">TOTAL</td>
                <td class="right">{{ $fmt($pedido->total) }}</td>
            </tr>
        </tfoot>
    </table>

    {{-- ══════════════ INFORMACIÓN DE PAGO ══════════════ --}}
    <div class="pago-wrap">
        <div class="pago-row">
            <span class="pago-label">Método de pago:</span>
            <span class="pago-value">{{ $pedido->metodo_pago ?? '—' }}</span>
        </div>
        <div class="pago-row" style="margin-top: 4px;">
            <span class="pago-label">Estado de pago:</span>
            <span class="pago-value">
                @if($pedido->estado_pago === 'pagado')
                    <span class="badge badge-pagado">Pagado</span>
                @else
                    <span class="badge badge-pendiente">Pendiente</span>
                @endif
            </span>
        </div>
    </div>

    {{-- ══════════════ PIE ══════════════ --}}
    <div class="footer">
        Documento generado el {{ now()->format('d/m/Y') }} — AGRO CAMPO · Módulo Market
    </div>

</body>
</html>
