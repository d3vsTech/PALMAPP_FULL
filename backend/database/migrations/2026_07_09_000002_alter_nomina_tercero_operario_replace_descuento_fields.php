<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Reemplaza el descuento único de PR-4.1 y el ajuste libre por la nueva
     * arquitectura de múltiples descuentos con concepto (tabla
     * `nomina_tercero_operario_descuento`).
     *
     * Agrega `total_jornales` y `total_cosecha` explícitos para que el cálculo
     * del subtotal sea transparente:
     *   subtotal = total_jornales + total_cosecha − SUM(descuentos.valor)
     *
     * `dropForeign` es silencioso en SQLite (tests in-memory); en PostgreSQL
     * elimina el constraint antes de dropColumn.
     */
    public function up(): void
    {
        Schema::table('nomina_tercero_operario', function (Blueprint $table) {
            $table->dropForeign(['descuento_concepto_id']);
            $table->dropColumn(['ajuste', 'descuento_concepto_id', 'descuento_valor', 'descuento_observacion']);

            $table->decimal('total_jornales', 14, 2)->default(0)->after('subtotal');
            $table->decimal('total_cosecha', 14, 2)->default(0)->after('total_jornales');
        });
    }

    public function down(): void
    {
        Schema::table('nomina_tercero_operario', function (Blueprint $table) {
            $table->dropColumn(['total_jornales', 'total_cosecha']);

            $table->decimal('ajuste', 12, 2)->default(0)->after('tarifa_dia');
            $table->foreignId('descuento_concepto_id')
                ->nullable()
                ->after('ajuste')
                ->constrained('nomina_concepto')
                ->restrictOnDelete();
            $table->decimal('descuento_valor', 12, 2)->default(0)->after('descuento_concepto_id');
            $table->string('descuento_observacion', 255)->nullable()->after('descuento_valor');
        });
    }
};
