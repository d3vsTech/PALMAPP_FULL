<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Paso 6 (final): eliminar la tabla `precios_palma` y la tabla auxiliar
 * `_lp_migration_map`. A partir de aquí toda la lógica de labores vive en
 * la tabla unificada `labores`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('_lp_migration_map');
        Schema::dropIfExists('precios_palma');
    }

    public function down(): void
    {
        // Recreación mínima del esquema previo para que el rollback no rompa
        // migraciones más antiguas. No re-pobla datos: confía en que las
        // migraciones anteriores se ejecutan en reversa para restaurar contenido.
        Schema::create('precios_palma', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->enum('tipo', ['PLATEO', 'PODA', 'SANIDAD', 'OTROS'])->nullable();
            $table->enum('tipo_pago', ['POR_PALMA', 'JORNAL_FIJO'])->default('JORNAL_FIJO');
            $table->string('nombre', 100)->nullable();
            $table->decimal('precio_palma', 12, 2)->nullable();
            $table->boolean('es_sistema')->default(true);
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'tipo'], 'precios_palma_tenant_tipo_unique');
            $table->unique(['tenant_id', 'nombre'], 'precios_palma_tenant_nombre_unique');
            $table->index(['tenant_id', 'estado']);
        });

        Schema::create('_lp_migration_map', function ($table) {
            $table->unsignedBigInteger('precios_palma_id')->primary();
            $table->unsignedBigInteger('labor_id');
        });
    }
};
