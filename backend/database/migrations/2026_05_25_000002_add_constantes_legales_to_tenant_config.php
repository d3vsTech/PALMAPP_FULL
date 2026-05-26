<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_config', function (Blueprint $table) {
            $table->smallInteger('anio_vigente')->nullable()->after('pais');
            $table->decimal('tasa_interes_cesantias', 5, 2)->default(12.00)->after('anio_vigente');
            $table->string('fecha_limite_consignacion_cesantias', 30)->default('14 de febrero')->after('tasa_interes_cesantias');
            $table->string('fecha_limite_pago_intereses_cesantias', 30)->default('31 de enero')->after('fecha_limite_consignacion_cesantias');
            $table->string('fecha_limite_prima_primer_semestre', 30)->default('30 de junio')->after('fecha_limite_pago_intereses_cesantias');
            $table->string('fecha_limite_prima_segundo_semestre', 30)->default('20 de diciembre')->after('fecha_limite_prima_primer_semestre');
            $table->smallInteger('dias_vacaciones_anuales')->default(15)->after('fecha_limite_prima_segundo_semestre');
            $table->smallInteger('dias_anio_comercial')->default(360)->after('dias_vacaciones_anuales');
            $table->smallInteger('dias_mes_comercial')->default(30)->after('dias_anio_comercial');
        });
    }

    public function down(): void
    {
        Schema::table('tenant_config', function (Blueprint $table) {
            $table->dropColumn([
                'anio_vigente',
                'tasa_interes_cesantias',
                'fecha_limite_consignacion_cesantias',
                'fecha_limite_pago_intereses_cesantias',
                'fecha_limite_prima_primer_semestre',
                'fecha_limite_prima_segundo_semestre',
                'dias_vacaciones_anuales',
                'dias_anio_comercial',
                'dias_mes_comercial',
            ]);
        });
    }
};
