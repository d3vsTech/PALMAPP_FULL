<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Descuentos identificados por concepto aplicados a un operario dentro del
     * acta de pago al contratista. Reemplaza el descuento único de PR-4.1
     * (`nomina_tercero_operario.descuento_*`) para soportar múltiples descuentos
     * con trazabilidad de concepto por operario.
     *
     * FK a `nomina_tercero_operario` con CASCADE para que al eliminar la línea
     * del operario se borren sus descuentos automáticamente.
     */
    public function up(): void
    {
        Schema::create('nomina_tercero_operario_descuento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignId('nomina_tercero_operario_id')
                ->constrained('nomina_tercero_operario')
                ->cascadeOnDelete();
            $table->foreignId('concepto_id')
                ->constrained('nomina_concepto')
                ->restrictOnDelete();
            $table->decimal('valor', 12, 2)->default(0);
            $table->string('observacion', 255)->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'nomina_tercero_operario_id'], 'ntod_tenant_nto_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nomina_tercero_operario_descuento');
    }
};
