<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── 1. Extender precios_palma ────────────────────────────────────
        Schema::table('precios_palma', function (Blueprint $table) {
            $table->enum('tipo_pago', ['POR_PALMA', 'JORNAL_FIJO'])
                  ->default('JORNAL_FIJO')
                  ->after('tipo');

            $table->string('nombre', 100)->nullable()->after('tipo_pago');

            $table->boolean('es_sistema')->default(true)->after('nombre');
        });

        // Data migration: asignar tipo_pago correcto a registros existentes
        DB::statement("UPDATE precios_palma SET tipo_pago = 'POR_PALMA'   WHERE tipo IN ('PLATEO', 'PODA')");
        DB::statement("UPDATE precios_palma SET tipo_pago = 'JORNAL_FIJO' WHERE tipo IN ('SANIDAD', 'OTROS')");

        // Índice UNIQUE (tenant_id, nombre) — MySQL permite múltiples NULLs en UNIQUE
        Schema::table('precios_palma', function (Blueprint $table) {
            $table->unique(['tenant_id', 'nombre'], 'precios_palma_tenant_nombre_unique');
        });

        // ─── 2. Agregar labor_palma_id a jornales ─────────────────────────
        Schema::table('jornales', function (Blueprint $table) {
            $table->unsignedBigInteger('labor_palma_id')->nullable()->after('labor_id');

            $table->foreign('labor_palma_id', 'fk_jornales_labor_palma')
                  ->references('id')
                  ->on('precios_palma')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('jornales', function (Blueprint $table) {
            $table->dropForeign('fk_jornales_labor_palma');
            $table->dropColumn('labor_palma_id');
        });

        Schema::table('precios_palma', function (Blueprint $table) {
            $table->dropUnique('precios_palma_tenant_nombre_unique');
            $table->dropColumn(['tipo_pago', 'nombre', 'es_sistema']);
        });
    }
};
