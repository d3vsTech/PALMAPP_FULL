<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Realinea el formulario de extractora con lo que realmente trae la remisión
 * impresa (muestras AGROINCE, Extractora Sabana, Palmagro). La modelación
 * original (`2026_05_04_000002_add_extractora_form_fields_to_viajes`) usaba
 * métricas de pulpa/acidez/humedad y un enum cualitativo
 * (excelente|buena|regular|deficiente) que NO aparecen en las remisiones
 * colombianas; en su lugar las remisiones traen 5 porcentajes por categoría
 * de fruto.
 *
 * `up()` (delta sobre la migración previa, NO un re-create):
 *  1. Drop del índice `(tenant_id, calidad_materia_prima)` y de las 5
 *     columnas obsoletas: `racimos_recibidos`, `temperatura_pulpa`,
 *     `acidez_inicial`, `humedad_semilla`, `calidad_materia_prima`.
 *  2. Add de las 5 columnas nuevas de calificación: `fruto_verde`,
 *     `sobre_maduro`, `podrido`, `pedunculo_largo`, `mal_formado`
 *     (decimal(5,2) nullable, % 0–100 validado en FormRequest).
 *  3. Add índice `(tenant_id, numero_remision_extractora)` para búsqueda
 *     por remisión de extractora.
 *  4. El índice `(tenant_id, fecha_llegada)` y las columnas
 *     `numero_remision_extractora`, `fecha_llegada`, `hora_llegada`,
 *     `observaciones_extractora` se mantienen intactos (los crea la
 *     migración previa y los seguimos usando tal cual).
 *
 * NOTA Postgres: `->after()` es no-op (Postgres no soporta posicionar
 * columnas y Laravel lo ignora silenciosamente para pgsql). Lo dejamos
 * por documentación de intención. Los CHECK constraints atados a una
 * columna (Postgres los crea para enums tipo VARCHAR) se dropean
 * automáticamente cuando se dropea la columna; no hace falta dropearlos
 * manualmente.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('viajes', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'calidad_materia_prima']);

            $table->dropColumn([
                'racimos_recibidos',
                'temperatura_pulpa',
                'acidez_inicial',
                'humedad_semilla',
                'calidad_materia_prima',
            ]);
        });

        Schema::table('viajes', function (Blueprint $table) {
            $table->decimal('fruto_verde', 5, 2)->nullable()->after('hora_llegada');
            $table->decimal('sobre_maduro', 5, 2)->nullable()->after('fruto_verde');
            $table->decimal('podrido', 5, 2)->nullable()->after('sobre_maduro');
            $table->decimal('pedunculo_largo', 5, 2)->nullable()->after('podrido');
            $table->decimal('mal_formado', 5, 2)->nullable()->after('pedunculo_largo');

            $table->index(['tenant_id', 'numero_remision_extractora']);
        });
    }

    public function down(): void
    {
        Schema::table('viajes', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'numero_remision_extractora']);

            $table->dropColumn([
                'fruto_verde',
                'sobre_maduro',
                'podrido',
                'pedunculo_largo',
                'mal_formado',
            ]);
        });

        Schema::table('viajes', function (Blueprint $table) {
            $table->integer('racimos_recibidos')->nullable()->after('hora_llegada');
            $table->decimal('temperatura_pulpa', 5, 2)->nullable()->after('racimos_recibidos');
            $table->decimal('acidez_inicial', 5, 2)->nullable()->after('temperatura_pulpa');
            $table->decimal('humedad_semilla', 5, 2)->nullable()->after('acidez_inicial');
            $table->string('calidad_materia_prima', 20)->nullable()->after('humedad_semilla');

            $table->index(['tenant_id', 'calidad_materia_prima']);
        });
    }
};
