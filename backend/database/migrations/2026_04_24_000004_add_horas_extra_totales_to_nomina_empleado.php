<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agrega totales de horas extras y recargos a `nomina_empleado`.
     *
     * Granularidad separada porque bajo el CST colombiano las prestaciones
     * sociales se calculan distinto sobre horas extras (es_extra=true) vs.
     * recargos puros como RN/RND (es_extra=false). El servicio de liquidación
     * podrá sumar ambos campos al total_devengado pero mantener la pista
     * para reportes legales (autoliquidación a UGPP, DIAN, etc.).
     */
    public function up(): void
    {
        Schema::table('nomina_empleado', function (Blueprint $table) {
            $table->decimal('total_horas_extra', 12, 2)->default(0)->after('total_ausencias_remunerado');
            $table->decimal('total_recargos', 12, 2)->default(0)->after('total_horas_extra');
        });
    }

    public function down(): void
    {
        Schema::table('nomina_empleado', function (Blueprint $table) {
            $table->dropColumn(['total_horas_extra', 'total_recargos']);
        });
    }
};
