<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agrega el descuento por operario en el acta de tercero.
     *
     * Motivación: la pantalla "Liquidación de Terceros" necesita descontar
     * conceptos específicos (herramienta extraviada, adelanto, uniforme…)
     * con trazabilidad — hoy solo existe `ajuste` numérico bruto sin concepto.
     *
     * La coherencia entre `descuento_valor > 0` y `descuento_concepto_id != null`
     * se valida en `ActualizarOperarioActaRequest` (no en la BD) para dar
     * mejores mensajes de error.
     *
     * Ver docs/API_NOMINA.md §7.4 (fórmula: subtotal = dias × tarifa + ajuste − descuento_valor).
     */
    public function up(): void
    {
        Schema::table('nomina_tercero_operario', function (Blueprint $table) {
            $table->foreignId('descuento_concepto_id')
                ->nullable()
                ->after('ajuste')
                ->constrained('nomina_concepto')
                ->restrictOnDelete();
            $table->decimal('descuento_valor', 12, 2)->default(0)->after('descuento_concepto_id');
            $table->string('descuento_observacion', 255)->nullable()->after('descuento_valor');
        });
    }

    public function down(): void
    {
        Schema::table('nomina_tercero_operario', function (Blueprint $table) {
            $table->dropForeign(['descuento_concepto_id']);
            $table->dropColumn(['descuento_concepto_id', 'descuento_valor', 'descuento_observacion']);
        });
    }
};
