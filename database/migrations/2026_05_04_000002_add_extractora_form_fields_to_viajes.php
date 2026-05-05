<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega a `viajes` los campos del "Formulario de Extractora" que se hidratan
 * cuando el viaje pasa a EN_VALIDACION (vía OCR o captura manual).
 *
 * Estos datos los reporta la extractora al recibir el camión: número interno
 * de remisión de la extractora, fecha/hora de llegada efectiva, racimos
 * recibidos según su conteo, y métricas de calidad de la materia prima
 * (temperatura pulpa, acidez, humedad de semilla, calificación cualitativa).
 *
 * Todas las columnas son nullable: las fincas que pagan por jornal pueden
 * cerrar viajes sin estos datos, y el OCR solo hidrata los campos que pudo
 * extraer con suficiente confianza.
 *
 * `calidad_materia_prima` se valida en FormRequest (sin CHECK en BD) para
 * permitir variantes futuras sin migración.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('viajes', function (Blueprint $table) {
            $table->string('numero_remision_extractora', 50)->nullable()->after('peso_viaje');
            $table->date('fecha_llegada')->nullable()->after('numero_remision_extractora');
            $table->time('hora_llegada')->nullable()->after('fecha_llegada');
            $table->integer('racimos_recibidos')->nullable()->after('hora_llegada');
            $table->decimal('temperatura_pulpa', 5, 2)->nullable()->after('racimos_recibidos');
            $table->decimal('acidez_inicial', 5, 2)->nullable()->after('temperatura_pulpa');
            $table->decimal('humedad_semilla', 5, 2)->nullable()->after('acidez_inicial');
            $table->string('calidad_materia_prima', 20)->nullable()->after('humedad_semilla');
            $table->string('observaciones_extractora', 500)->nullable()->after('calidad_materia_prima');

            $table->index(['tenant_id', 'fecha_llegada']);
            $table->index(['tenant_id', 'calidad_materia_prima']);
        });
    }

    public function down(): void
    {
        Schema::table('viajes', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'fecha_llegada']);
            $table->dropIndex(['tenant_id', 'calidad_materia_prima']);

            $table->dropColumn([
                'numero_remision_extractora',
                'fecha_llegada',
                'hora_llegada',
                'racimos_recibidos',
                'temperatura_pulpa',
                'acidez_inicial',
                'humedad_semilla',
                'calidad_materia_prima',
                'observaciones_extractora',
            ]);
        });
    }
};
