<?php

namespace App\Services\Market;

use App\Models\Market\MarketPedido;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class MarketFacturaService
{
    public function pdf(MarketPedido $pedido): Response
    {
        $pedido->load([
            'proveedor',
            'items.producto:id,nombre,imagen_principal',
            'tenant',
        ]);

        $pdf = Pdf::loadView('market.factura', compact('pedido'))
            ->setPaper('letter')
            ->setOption('isPhpEnabled', true)
            ->setOption('defaultFont', 'sans-serif');

        $filename = "Factura-{$pedido->codigo}.pdf";

        return $pdf->download($filename);
    }
}
