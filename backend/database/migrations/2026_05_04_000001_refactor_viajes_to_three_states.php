<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Refactor de la máquina de estados de viajes: 4 estados → 3 estados.
 *
 *   CREADO ──▶ EN_CAMINO ──▶ EN_PLANTA ──▶ FINALIZADO   (anterior)
 *   CREADO ──▶ EN_VALIDACION ──▶ FINALIZADO             (nuevo)
 *
 * Motivo: la realidad operativa (fincas que pagan por jornal vs. por producción)
 * no encaja en la cascada de 4 pasos. EN_VALIDACION combina los antiguos
 * EN_CAMINO/EN_PLANTA y representa el momento en que el camión llegó a la
 * extractora y se está validando lo que reportaron.
 *
 * Como el módulo está en desarrollo y no hay datos vivos, la migración es
 * destructiva: re-mapea cualquier estado legacy a la nueva enum sin backfill
 * complejo.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE viajes DROP CONSTRAINT IF EXISTS viajes_estado_check');

        // Re-mapeo defensivo (entornos de dev que tengan filas con la enum vieja).
        DB::statement("UPDATE viajes SET estado = 'EN_VALIDACION' WHERE estado IN ('EN_CAMINO', 'EN_PLANTA')");

        DB::statement("ALTER TABLE viajes ADD CONSTRAINT viajes_estado_check CHECK (estado IN (
            'CREADO',
            'EN_VALIDACION',
            'FINALIZADO'
        ))");

        Schema::table('viajes', function (Blueprint $table) {
            $table->timestamp('validacion_at')->nullable()->after('despachado_at');
        });

        // Backfill del nuevo timestamp para filas existentes ya validadas.
        DB::statement('UPDATE viajes SET validacion_at = COALESCE(llegada_planta_at, despachado_at) WHERE estado IN (\'EN_VALIDACION\', \'FINALIZADO\')');
    }

    public function down(): void
    {
        Schema::table('viajes', function (Blueprint $table) {
            $table->dropColumn('validacion_at');
        });

        DB::statement('ALTER TABLE viajes DROP CONSTRAINT IF EXISTS viajes_estado_check');

        DB::statement("UPDATE viajes SET estado = 'EN_PLANTA' WHERE estado = 'EN_VALIDACION'");

        DB::statement("ALTER TABLE viajes ADD CONSTRAINT viajes_estado_check CHECK (estado IN (
            'CREADO',
            'EN_CAMINO',
            'EN_PLANTA',
            'FINALIZADO'
        ))");
    }
};
