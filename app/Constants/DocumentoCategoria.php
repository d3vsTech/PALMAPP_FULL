<?php

namespace App\Constants;

class DocumentoCategoria
{
    public const CATEGORIAS = [
        'DATOS_BASE' => [
            'label' => 'Datos base',
            'unico_por_tipo' => true,
            'tipos' => [
                'DOCUMENTO_DE_IDENTIDAD' => 'Documento de identidad',
                'HOJA_DE_VIDA' => 'Hoja de vida',
                'ANTECEDENTES' => 'Antecedentes',
                'AUTORIZACION_DATOS_PERSONALES' => 'Autorización de datos personales',
            ],
        ],
        'CONTRATACION_LABORAL' => [
            'label' => 'Contratación laboral',
            'unico_por_tipo' => true,
            'tipos' => [
                'CONTRATO_DE_TRABAJO' => 'Contrato de trabajo',
                'ACUERDO_DE_CONFIDENCIALIDAD' => 'Acuerdo de confidencialidad',
            ],
        ],
        'SST' => [
            'label' => 'SST',
            'unico_por_tipo' => true,
            'tipos' => [
                'EXAMEN_DE_INGRESO' => 'Examen de ingreso',
            ],
        ],
        'PERMISOS_LICENCIAS' => [
            'label' => 'Permisos, Licencias e Incapacidades',
            'unico_por_tipo' => false,
            'permite_tipo_personalizado' => true,
            'tipos' => [],
        ],
        'FINALIZACION_CONTRATO' => [
            'label' => 'Finalización de contrato',
            'unico_por_tipo' => false,
            'tipos' => [
                'FINALIZACION_CONTRATO' => 'Finalización de contrato',
            ],
        ],
        'DESPRENDIBLES' => [
            'label' => 'Desprendibles',
            'unico_por_tipo' => false,
            'tipos' => [
                'DESPRENDIBLES' => 'Desprendibles',
            ],
        ],
        'OTROS' => [
            'label' => 'Otros',
            'unico_por_tipo' => false,
            'permite_tipo_personalizado' => true,
            'tipos' => [],
        ],
    ];

    public static function categorias(): array
    {
        return array_keys(self::CATEGORIAS);
    }

    public static function categoriasConLabel(): array
    {
        return array_map(fn($cat) => $cat['label'], self::CATEGORIAS);
    }

    public static function tiposPorCategoria(string $categoria): array
    {
        return self::CATEGORIAS[$categoria]['tipos'] ?? [];
    }

    public static function esUnicoPorTipo(string $categoria): bool
    {
        return self::CATEGORIAS[$categoria]['unico_por_tipo'] ?? false;
    }

    public static function permiteTipoPersonalizado(string $categoria): bool
    {
        return self::CATEGORIAS[$categoria]['permite_tipo_personalizado'] ?? false;
    }

    public static function categoriaValida(string $categoria): bool
    {
        return array_key_exists($categoria, self::CATEGORIAS);
    }

    public static function tipoValido(string $categoria, string $tipo): bool
    {
        if (! self::categoriaValida($categoria)) {
            return false;
        }

        if (self::permiteTipoPersonalizado($categoria)) {
            return true;
        }

        return array_key_exists($tipo, self::CATEGORIAS[$categoria]['tipos']);
    }
}
