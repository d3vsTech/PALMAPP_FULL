<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Paso 5: finalizar el esquema de `jornales`.
 *
 *  - Drop FK + columna `labor_palma_id` (ya reemplazada por labor_id).
 *  - Hacer `labor_id` NOT NULL (todos los jornales tienen labor tras 000004).
 *  - Eliminar 'OTROS' del enum `tipo`: los jornales legacy con tipo='OTROS'
 *    quedan con tipo=NULL y su labor custom "Otros (legacy)" como referente.
 *
 * PostgreSQL: el ENUM de Laravel se implementa como CHECK constraint
 * `jornales_tipo_check`. Para cambiarlo: drop + recreate.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─── 1. Drop labor_palma_id ───
        if (Schema::hasColumn('jornales', 'labor_palma_id')) {
            Schema::table('jornales', function (Blueprint $table) {
                $table->dropForeign('fk_jornales_labor_palma');
                $table->dropColumn('labor_palma_id');
            });
        }

        // ─── 2. labor_id NOT NULL ───
        DB::statement("ALTER TABLE jornales ALTER COLUMN labor_id SET NOT NULL");

        // ─── 3. Reducir enum `tipo`: dropear 'OTROS' ───
        // Antes de modificar el CHECK, mover los registros con tipo='OTROS' a NULL.
        DB::statement("UPDATE jornales SET tipo = NULL WHERE tipo = 'OTROS'");

        DB::statement("ALTER TABLE jornales DROP CONSTRAINT IF EXISTS jornales_tipo_check");
        DB::statement("
            ALTER TABLE jornales ADD CONSTRAINT jornales_tipo_check
            CHECK (tipo IN ('PLATEO','PODA','FERTILIZACION','SANIDAD'))
        ");
    }

    public function down(): void
    {
        // ─── 3. Restaurar enum con 'OTROS' ───
        DB::statement("ALTER TABLE jornales DROP CONSTRAINT IF EXISTS jornales_tipo_check");
        DB::statement("
            ALTER TABLE jornales ADD CONSTRAINT jornales_tipo_check
            CHECK (tipo IN ('PLATEO','PODA','FERTILIZACION','SANIDAD','OTROS'))
        ");

        // No reasignamos automáticamente NULL → 'OTROS': es lossy y rompería el modelo
        // si una labor custom no estaba originalmente bajo el tipo OTROS legado.

        // ─── 2. labor_id vuelve a NULLABLE ───
        DB::statement("ALTER TABLE jornales ALTER COLUMN labor_id DROP NOT NULL");

        // ─── 1. Restaurar labor_palma_id ───
        Schema::table('jornales', function (Blueprint $table) {
            $table->unsignedBigInteger('labor_palma_id')->nullable()->after('labor_id');
        });

        if (Schema::hasTable('precios_palma')) {
            Schema::table('jornales', function (Blueprint $table) {
                $table->foreign('labor_palma_id', 'fk_jornales_labor_palma')
                      ->references('id')
                      ->on('precios_palma')
                      ->nullOnDelete();
            });
        }
    }
};
