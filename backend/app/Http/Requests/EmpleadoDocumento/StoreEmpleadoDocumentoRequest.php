<?php

namespace App\Http\Requests\EmpleadoDocumento;

use App\Constants\DocumentoCategoria;
use Illuminate\Foundation\Http\FormRequest;

class StoreEmpleadoDocumentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'archivo'          => 'required|file|max:10240|mimes:pdf,jpg,jpeg,png,webp',
            'categoria'        => 'required|string',
            'tipo_documento'   => 'required|string|max:80',
            'nombre_archivo'   => 'sometimes|string|max:255',
            'fecha_documento'  => 'nullable|date|before_or_equal:today',
            'observacion'      => 'nullable|string|max:500',
        ];
    }

    public function after(): array
    {
        return [
            function ($validator) {
                $categoria = $this->input('categoria');
                $tipo = $this->input('tipo_documento');

                if ($categoria && ! DocumentoCategoria::categoriaValida($categoria)) {
                    $validator->errors()->add('categoria', 'La categoría seleccionada no es válida');
                    return;
                }

                if ($categoria && $tipo && ! DocumentoCategoria::tipoValido($categoria, $tipo)) {
                    $validator->errors()->add('tipo_documento', 'El tipo de documento no es válido para la categoría seleccionada');
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'archivo.required'     => 'El archivo es obligatorio',
            'archivo.file'         => 'Debe ser un archivo válido',
            'archivo.max'          => 'El archivo no puede superar los 10 MB',
            'archivo.mimes'        => 'El archivo debe ser PDF, imagen (JPG, PNG, WebP) o documento (DOC, DOCX, XLS, XLSX)',
            'categoria.required'   => 'La categoría es obligatoria',
            'tipo_documento.required' => 'El tipo de documento es obligatorio',
            'fecha_documento.before_or_equal' => 'La fecha del documento no puede ser futura',
            'observacion.max'      => 'La observación no puede superar los 500 caracteres',
        ];
    }
}
