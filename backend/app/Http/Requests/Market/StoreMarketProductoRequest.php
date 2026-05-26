<?php

namespace App\Http\Requests\Market;

use Illuminate\Foundation\Http\FormRequest;

class StoreMarketProductoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'categoria_id'     => 'required|integer|exists:market_categorias,id',
            'unidad_medida_id' => 'required|integer|exists:market_unidades_medida,id',
            'sku'              => 'nullable|string|max:50|unique:market_productos,sku',
            'nombre'           => 'required|string|max:150',
            'descripcion'      => 'required|string',
            'especificaciones' => 'nullable|array',
            'precio_unitario'  => 'required|numeric|min:0.01',
            'stock_disponible' => 'required|integer|min:0',
            'stock_minimo'     => 'nullable|integer|min:0',
            'estado'           => 'sometimes|in:activo,inactivo',
            'destacado'        => 'sometimes|boolean',

            'imagen_principal' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:3072',

            'precios_volumen'                          => 'nullable|array|max:10',
            'precios_volumen.*.cantidad_minima'        => 'required_with:precios_volumen|integer|min:2',
            'precios_volumen.*.precio_unidad'          => 'required_with:precios_volumen|numeric|min:0.01',
        ];
    }

    public function messages(): array
    {
        return [
            'categoria_id.required'                        => 'La categoría es obligatoria.',
            'categoria_id.exists'                          => 'La categoría seleccionada no existe.',
            'unidad_medida_id.required'                    => 'La unidad de medida es obligatoria.',
            'unidad_medida_id.exists'                      => 'La unidad de medida seleccionada no existe.',
            'sku.unique'                                   => 'El SKU ya está en uso por otro producto.',
            'sku.max'                                      => 'El SKU no puede exceder 50 caracteres.',
            'nombre.required'                              => 'El nombre del producto es obligatorio.',
            'nombre.max'                                   => 'El nombre no puede exceder 150 caracteres.',
            'descripcion.required'                         => 'La descripción es obligatoria.',
            'precio_unitario.required'                     => 'El precio unitario es obligatorio.',
            'precio_unitario.min'                          => 'El precio unitario debe ser mayor a 0.',
            'stock_disponible.required'                    => 'El stock disponible es obligatorio.',
            'stock_disponible.min'                         => 'El stock no puede ser negativo.',
            'stock_minimo.min'                             => 'El stock mínimo no puede ser negativo.',
            'estado.in'                                    => 'El estado debe ser activo o inactivo.',
            'imagen_principal.image'                       => 'El archivo debe ser una imagen.',
            'imagen_principal.mimes'                       => 'La imagen debe ser jpg, jpeg, png o webp.',
            'imagen_principal.max'                         => 'La imagen no puede superar 3 MB.',
            'precios_volumen.max'                          => 'Máximo 10 escalas de precio por volumen.',
            'precios_volumen.*.cantidad_minima.required_with' => 'La cantidad mínima es obligatoria en cada escala.',
            'precios_volumen.*.cantidad_minima.min'        => 'La cantidad mínima debe ser al menos 2.',
            'precios_volumen.*.precio_unidad.required_with'   => 'El precio es obligatorio en cada escala.',
            'precios_volumen.*.precio_unidad.min'          => 'El precio de escala debe ser mayor a 0.',
        ];
    }
}
