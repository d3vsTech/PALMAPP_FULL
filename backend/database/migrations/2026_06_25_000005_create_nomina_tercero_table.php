<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Resumen por empresa contratista para una nómina (acta de pago al tercero).
     *
     * Una fila por (nomina_id, tercero_id). Agrega totales y guarda el estado del
     * giro bancario al contratista. Las líneas por operario viven en la tabla
     * complementaria `nomina_tercero_operario`.
     *
     * Sin `ajuste_manual` a nivel acta — los ajustes se hacen a granularidad de
     * operario. Ver docs/PLAN_NOMINA_TERCEROS.md sección A.4.
     */
    public function up(): void
    {
        Schema::create('nomina_tercero', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignId('nomina_id')->constrained('nominas')->restrictOnDelete();
            $table->foreignId('tercero_id')->constrained('terceros')->restrictOnDelete();

            $table->unsignedInteger('total_dias')->default(0);
            $table->decimal('total_jornales', 14, 2)->default(0);
            $table->decimal('total_cosecha', 14, 2)->default(0);
            $table->decimal('total_bruto', 14, 2)->default(0);
            $table->decimal('total_a_transferir', 14, 2)->default(0);

            $table->enum('estado_pago', ['PENDIENTE', 'PAGADO'])->default('PENDIENTE');
            $table->string('orden_pago_numero', 50)->nullable();
            $table->dateTime('pagado_at')->nullable();
            $table->foreignId('pagado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('metodo_pago', ['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE'])->nullable();
            $table->string('referencia_pago', 100)->nullable();
            $table->text('observacion')->nullable();

            $table->timestamps();

            $table->unique(['nomina_id', 'tercero_id'], 'nomina_tercero_unique');
            $table->index(['tenant_id', 'nomina_id'], 'nomina_tercero_tenant_nomina_idx');
            $table->index(['tenant_id', 'tercero_id', 'estado_pago'], 'nomina_tercero_tenant_tercero_estado_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nomina_tercero');
    }
};
