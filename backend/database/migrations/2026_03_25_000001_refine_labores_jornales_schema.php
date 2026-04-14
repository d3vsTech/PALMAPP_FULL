<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── 1. Expandir labores.tipo_pago: POR_PALMA → POR_PALMA_INSUMO / POR_PALMA_SIMPLE ───
        DB::statement("ALTER TABLE labores DROP CONSTRAINT IF EXISTS labores_tipo_pago_check");
        DB::statement("ALTER TABLE labores ADD CONSTRAINT labores_tipo_pago_check CHECK (tipo_pago IN ('JORNAL_FIJO', 'POR_PALMA_INSUMO', 'POR_PALMA_SIMPLE'))");

        // Data migration: reclasificar registros existentes
        DB::statement("UPDATE labores SET tipo_pago = 'POR_PALMA_INSUMO' WHERE tipo_pago = 'POR_PALMA' AND insumo_id IS NOT NULL");
        DB::statement("UPDATE labores SET tipo_pago = 'POR_PALMA_SIMPLE' WHERE tipo_pago = 'POR_PALMA' AND insumo_id IS NULL");

        // ─── 2. jornales: operacion_id NOT NULL ───
        // Primero eliminar la FK con nullOnDelete y recrear sin ella
        Schema::table('jornales', function (Blueprint $table) {
            $table->dropForeign(['operacion_id']);
        });

        // Hacer NOT NULL (asumimos que todos los jornales ya tienen operacion_id asignado)
        DB::statement("ALTER TABLE jornales ALTER COLUMN operacion_id SET NOT NULL");

        Schema::table('jornales', function (Blueprint $table) {
            $table->foreign('operacion_id')->references('id')->on('operaciones')->restrictOnDelete();
        });

        // ─── 3. Eliminar jornales.fecha y sus índices ───
        Schema::table('jornales', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'fecha']);
            $table->dropIndex(['tenant_id', 'empleado_id', 'fecha']);
            $table->dropColumn('fecha');

            // Nuevo índice que reemplaza el anterior
            $table->index(['tenant_id', 'empleado_id', 'operacion_id']);
        });

        // ─── 4. Renombrar jornales.valor_insumo → precio_insumo_snapshot ───
        Schema::table('jornales', function (Blueprint $table) {
            $table->renameColumn('valor_insumo', 'precio_insumo_snapshot');
        });

        // ─── 5. Agregar jornales.tipo_pago (snapshot del tipo de pago al crear) ───
        DB::statement("ALTER TABLE jornales ADD COLUMN tipo_pago VARCHAR(20)");
        DB::statement("ALTER TABLE jornales ADD CONSTRAINT jornales_tipo_pago_check CHECK (tipo_pago IN ('JORNAL_FIJO', 'POR_PALMA_INSUMO', 'POR_PALMA_SIMPLE'))");

        // Backfill desde labores
        DB::statement("UPDATE jornales SET tipo_pago = labores.tipo_pago FROM labores WHERE jornales.labor_id = labores.id");

        // Hacer NOT NULL después del backfill
        DB::statement("ALTER TABLE jornales ALTER COLUMN tipo_pago SET NOT NULL");

        // ─── 6. registro_cosecha: operacion_id NOT NULL ───
        Schema::table('registro_cosecha', function (Blueprint $table) {
            $table->dropForeign(['operacion_id']);
        });

        DB::statement("ALTER TABLE registro_cosecha ALTER COLUMN operacion_id SET NOT NULL");

        Schema::table('registro_cosecha', function (Blueprint $table) {
            $table->foreign('operacion_id')->references('id')->on('operaciones')->restrictOnDelete();
        });

        // ─── 7. Eliminar registro_cosecha.fecha y sus índices ───
        Schema::table('registro_cosecha', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'fecha']);
            $table->dropColumn('fecha');
        });
    }

    public function down(): void
    {
        // ─── 7. Restaurar registro_cosecha.fecha ───
        Schema::table('registro_cosecha', function (Blueprint $table) {
            $table->date('fecha')->nullable()->after('sublote_id');
            $table->index(['tenant_id', 'fecha']);
        });

        // Backfill fecha desde operaciones
        DB::statement("UPDATE registro_cosecha SET fecha = operaciones.fecha FROM operaciones WHERE registro_cosecha.operacion_id = operaciones.id");

        // ─── 6. registro_cosecha: operacion_id nullable de nuevo ───
        Schema::table('registro_cosecha', function (Blueprint $table) {
            $table->dropForeign(['operacion_id']);
        });

        DB::statement("ALTER TABLE registro_cosecha ALTER COLUMN operacion_id DROP NOT NULL");

        Schema::table('registro_cosecha', function (Blueprint $table) {
            $table->foreign('operacion_id')->references('id')->on('operaciones')->nullOnDelete();
        });

        // ─── 5. Quitar jornales.tipo_pago ───
        DB::statement("ALTER TABLE jornales DROP CONSTRAINT IF EXISTS jornales_tipo_pago_check");
        Schema::table('jornales', function (Blueprint $table) {
            $table->dropColumn('tipo_pago');
        });

        // ─── 4. Renombrar precio_insumo_snapshot → valor_insumo ───
        Schema::table('jornales', function (Blueprint $table) {
            $table->renameColumn('precio_insumo_snapshot', 'valor_insumo');
        });

        // ─── 3. Restaurar jornales.fecha ───
        Schema::table('jornales', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'empleado_id', 'operacion_id']);
            $table->date('fecha')->nullable()->after('sublote_id');
            $table->index(['tenant_id', 'fecha']);
            $table->index(['tenant_id', 'empleado_id', 'fecha']);
        });

        // Backfill fecha desde operaciones
        DB::statement("UPDATE jornales SET fecha = operaciones.fecha FROM operaciones WHERE jornales.operacion_id = operaciones.id");

        // ─── 2. jornales: operacion_id nullable de nuevo ───
        Schema::table('jornales', function (Blueprint $table) {
            $table->dropForeign(['operacion_id']);
        });

        DB::statement("ALTER TABLE jornales ALTER COLUMN operacion_id DROP NOT NULL");

        Schema::table('jornales', function (Blueprint $table) {
            $table->foreign('operacion_id')->references('id')->on('operaciones')->nullOnDelete();
        });

        // ─── 1. Restaurar labores.tipo_pago original ───
        DB::statement("UPDATE labores SET tipo_pago = 'POR_PALMA' WHERE tipo_pago IN ('POR_PALMA_INSUMO', 'POR_PALMA_SIMPLE')");
        DB::statement("ALTER TABLE labores DROP CONSTRAINT IF EXISTS labores_tipo_pago_check");
        DB::statement("ALTER TABLE labores ADD CONSTRAINT labores_tipo_pago_check CHECK (tipo_pago IN ('JORNAL_FIJO', 'POR_PALMA'))");
    }
};
