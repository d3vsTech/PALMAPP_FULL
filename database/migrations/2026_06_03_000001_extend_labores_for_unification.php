<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Paso 1 de la unificación de Labores: extender la tabla `labores` para que
 * pueda representar tanto labores de FINCA (estado actual) como labores de
 * PALMA (fijas del sistema + custom del tenant).
 *
 * No toca datos existentes salvo backfill mínimo: todas las filas actuales
 * son labores de finca, así que reciben categoria=FINCA y tipo_pago=JORNAL_FIJO.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('labores', function (Blueprint $table) {
            $table->enum('categoria', ['PALMA', 'FINCA'])
                  ->default('FINCA')
                  ->after('tenant_id');

            $table->enum('tipo', ['COSECHA', 'PLATEO', 'PODA', 'FERTILIZACION', 'SANIDAD'])
                  ->nullable()
                  ->after('categoria');

            $table->boolean('es_sistema')->default(false)->after('tipo_pago');
        });

        // valor_base → precio_palma. NULL permitido (fijas recién provisionadas
        // sin precio configurado).
        Schema::table('labores', function (Blueprint $table) {
            $table->renameColumn('valor_base', 'precio_palma');
        });

        DB::statement("ALTER TABLE labores ALTER COLUMN precio_palma DROP NOT NULL");
        DB::statement("ALTER TABLE labores ALTER COLUMN precio_palma DROP DEFAULT");

        // Backfill: todas las filas existentes son labores de FINCA con JORNAL_FIJO.
        DB::statement("UPDATE labores SET categoria = 'FINCA', tipo_pago = 'JORNAL_FIJO', es_sistema = false");

        // Índice parcial UNIQUE — PostgreSQL permite múltiples NULL bajo este patrón,
        // así que custom labores (tipo IS NULL) no chocan entre sí ni con las fijas.
        DB::statement("CREATE UNIQUE INDEX labores_tenant_tipo_unique ON labores (tenant_id, tipo) WHERE tipo IS NOT NULL");

        Schema::table('labores', function (Blueprint $table) {
            $table->index(['tenant_id', 'categoria', 'estado'], 'labores_tenant_categoria_estado_idx');
            $table->index(['tenant_id', 'es_sistema'], 'labores_tenant_es_sistema_idx');
        });
    }

    public function down(): void
    {
        Schema::table('labores', function (Blueprint $table) {
            $table->dropIndex('labores_tenant_categoria_estado_idx');
            $table->dropIndex('labores_tenant_es_sistema_idx');
        });

        DB::statement("DROP INDEX IF EXISTS labores_tenant_tipo_unique");

        // valor_base debe regresar a NOT NULL DEFAULT 0 (estado previo).
        DB::statement("UPDATE labores SET precio_palma = 0 WHERE precio_palma IS NULL");
        DB::statement("ALTER TABLE labores ALTER COLUMN precio_palma SET NOT NULL");
        DB::statement("ALTER TABLE labores ALTER COLUMN precio_palma SET DEFAULT 0");

        Schema::table('labores', function (Blueprint $table) {
            $table->renameColumn('precio_palma', 'valor_base');
            $table->dropColumn(['categoria', 'tipo', 'es_sistema']);
        });
    }
};
