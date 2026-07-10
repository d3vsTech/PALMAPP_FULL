<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Detalle por operario dentro del acta de pago al contratista.
     *
     * Una fila por (nomina_tercero_id, operario_id). `dias` y `tarifa_dia`
     * se precalculan a partir de jornales+cosechas pero pueden editarse desde
     * la pantalla de liquidación del tercero (el valor persistido prevalece
     * sobre el cálculo automático).
     *
     * `labores_realizadas` es un snapshot JSON de los tipos de labor realizados
     * por el operario en el período, para alimentar el acta sin re-leer jornales.
     *
     * Ver docs/PLAN_NOMINA_TERCEROS.md sección A.5.
     */
    public function up(): void
    {
        Schema::create('nomina_tercero_operario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignId('nomina_tercero_id')->constrained('nomina_tercero')->restrictOnDelete();
            $table->foreignId('operario_id')->constrained('operarios')->restrictOnDelete();

            $table->unsignedInteger('dias')->default(0);
            $table->decimal('tarifa_dia', 12, 2)->default(0);
            $table->decimal('ajuste', 12, 2)->default(0);
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->json('labores_realizadas')->nullable();
            $table->text('observacion')->nullable();

            $table->timestamps();

            $table->unique(['nomina_tercero_id', 'operario_id'], 'nomina_tercero_operario_unique');
            $table->index(['tenant_id', 'nomina_tercero_id'], 'nto_tenant_nomina_tercero_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nomina_tercero_operario');
    }
};
