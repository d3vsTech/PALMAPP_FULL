<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Eliminar el unique constraint (lote_id, anio) — la tabla pasa a ser histórica
        // con múltiples registros por lote (uno por viaje homogéneo finalizado + baselines admin)
        Schema::table('promedio_lote', function (Blueprint $table) {
            $table->dropUnique(['lote_id', 'anio']);
        });

        Schema::table('promedio_lote', function (Blueprint $table) {
            // Fecha en la que se registró el promedio (fecha_viaje o fecha manual del admin)
            $table->date('fecha')->nullable()->after('anio');

            // FK al viaje que generó este promedio. NULL = baseline configurado por admin.
            $table->foreignId('viaje_id')
                ->nullable()
                ->after('fecha')
                ->constrained('viajes')
                ->nullOnDelete();

            // Índice compuesto para consultas de período en sumarCosecha / NominaCalculationService
            $table->index(['tenant_id', 'lote_id', 'fecha'], 'promedio_lote_tenant_lote_fecha_idx');
        });
    }

    public function down(): void
    {
        Schema::table('promedio_lote', function (Blueprint $table) {
            $table->dropIndex('promedio_lote_tenant_lote_fecha_idx');
            $table->dropConstrainedForeignId('viaje_id');
            $table->dropColumn('fecha');
        });

        // Restaurar el unique (solo si no hay duplicados — puede fallar en BD con historial)
        Schema::table('promedio_lote', function (Blueprint $table) {
            $table->unique(['lote_id', 'anio']);
        });
    }
};
