<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('viaje_detalle', function (Blueprint $table) {
            $table->integer('gajos_en_viaje')->nullable()->after('cosecha_id');
            // NULL = modo legacy: todos los gajos de la cosecha van en este viaje.
            // Valor explícito = split parcial (N gajos de esta cosecha van en este viaje).
        });

        // Antes: 1 cosecha solo en 1 viaje activo a la vez.
        // Nuevo: 1 cosecha puede estar en N viajes distintos (split),
        //        pero NO puede aparecer dos veces en el mismo viaje.
        DB::statement('DROP INDEX IF EXISTS viaje_detalle_cosecha_activa_unique');
        DB::statement('
            CREATE UNIQUE INDEX viaje_detalle_cosecha_viaje_unique
            ON viaje_detalle (cosecha_id, viaje_id)
            WHERE estado = true
        ');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS viaje_detalle_cosecha_viaje_unique');
        DB::statement('
            CREATE UNIQUE INDEX viaje_detalle_cosecha_activa_unique
            ON viaje_detalle (cosecha_id)
            WHERE estado = true
        ');

        Schema::table('viaje_detalle', function (Blueprint $table) {
            $table->dropColumn('gajos_en_viaje');
        });
    }
};
