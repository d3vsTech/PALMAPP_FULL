<?php

namespace App\Http\Requests\Market;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMarketProductoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $productoId = $this->route('id');

        return [
            'categoria_id'     => 'sometimes|integer|exists:market_categorias,id',
            'unidad_medida_id' => 'sometimes|integer|exists:market_unidades_medida,id',
            'sku'              => "sometimes|nullable|string|max:50|unique:market_productos,sku,{$productoId}",
            'nombre'           => 'sometimes|string|max:150',
            'descripcion'      => 'sometimes|string',
            'especificaciones' => 'sometimes|nullable|array',
            'precio_unitario'  => 'sometimes|numeric|min:0.01',
            'stock_disponible' => 'sometimes|integer|min:0',
            'stock_minimo'     => 'sometimes|nullable|integer|min:0',
            'estado'           => 'sometimes|in:activo,inactivo',
            'destacado'        => 'sometimes|boolean',

            'imagen_principal' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:3072',

            'precios_volumen'                          => 'sometimes|nullable|array|max:10',
            'precios_volumen.*.cantidad_minima'        => 'required_with:precios_volumen|integer|min:2',
            'precios_volumen.*.precio_unidad'          => 'required_with:precios_volumen|numeric|min:0.01',
        ];
    }

    public function messages(): array
    {
        return [
            'categoria_id.exists'                          => 'La categoría seleccionada no existe.',
            'unidad_medida_id.exists'                      => 'La unidad de medida seleccionada no existe.',
            'sku.unique'                                   => 'El SKU ya está en uso por otro producto.',
            'sku.max'                                      => 'El SKU no puede exceder 50 caracteres.',
            'nombre.max'                                   => 'El nombre no puede exceder 150 caracteres.',
            'precio_unitario.min'                          => 'El precio unitario debe ser mayor a 0.',
            'stock_disponible.min'                         => 'El stock no puede ser negativo.',
            'stock_minimo.min'                             => 'El stock mínimo no puede ser negativo.',
            'estado.in'                                    => 'El estado debe ser activo o inactivo.',
            'imagen_principal.image'                       => 'El archivo debe ser una imagen.',
            'imagen_principal.mimes'                       => 'La imagen debe ser jpg, jpeg, png o webp.',
            'imagen_principal.max'                         => 'La imagen no puede superar 3 MB.',
            'precios_volumen.max'                          => 'Máximo 10 escalas de precio por volumen.',
            'precios_volumen.*.cantidad_minima.min'        => 'La cantidad mínima debe ser al menos 2.',
            'precios_volumen.*.precio_unidad.min'          => 'El precio de escala debe ser mayor a 0.',
        ];
    }
}
