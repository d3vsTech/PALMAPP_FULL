<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Snapshot del paso 3 del wizard de nómina ("Validar Cosecha").
     *
     * Compara cosecha registrada por colaboradores del período (jornales+cosechas)
     * contra el total de remisiones de extractora. El admin puede ajustar promedios
     * por lote hasta cerrar la diferencia y confirmar. El resultado se persiste
     * aquí como snapshot auditable.
     *
     * UNIQUE en `nomina_id` permite reejecutar el paso 3 mediante upsert mientras
     * la nómina esté en BORRADOR — el último snapshot pisa al anterior.
     *
     * Ver docs/PLAN_NOMINA_TERCEROS.md sección A.6.
     */
    public function up(): void
    {
        Schema::create('nomina_validacion_cosecha', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignId('nomina_id')->constrained('nominas')->restrictOnDelete();

            $table->decimal('total_kg_colaboradores', 14, 2)->default(0);
            $table->decimal('total_kg_extractora', 14, 2)->default(0);
            $table->decimal('diferencia_kg', 14, 2)->default(0);
            $table->json('detalle_por_colaborador')->nullable();

            $table->foreignId('validado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('validado_at')->nullable();

            $table->timestamps();

            $table->unique('nomina_id', 'nomina_validacion_cosecha_nomina_unique');
            $table->index(['tenant_id', 'nomina_id'], 'nvc_tenant_nomina_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nomina_validacion_cosecha');
    }
};
