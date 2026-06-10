<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Permite al admin del tenant configurar los días de corte de cada
     * quincena (sección "Fechas de Corte" en Configuración → Nómina).
     *
     * Defaults reproducen el comportamiento legacy hard-coded:
     *   Q1: 1 → 15
     *   Q2: 16 → 31 (el cálculo aplica min(31, último día del mes))
     *
     * Para `dia_fin_q2`, el valor 31 se interpreta como "último día del mes".
     */
    public function up(): void
    {
        Schema::table('tenant_config', function (Blueprint $table) {
            $table->unsignedTinyInteger('dia_inicio_q1')->default(1)->after('divisor_jornada_mensual');
            $table->unsignedTinyInteger('dia_fin_q1')->default(15)->after('dia_inicio_q1');
            $table->unsignedTinyInteger('dia_inicio_q2')->default(16)->after('dia_fin_q1');
            $table->unsignedTinyInteger('dia_fin_q2')->default(31)->after('dia_inicio_q2');
        });
    }

    public function down(): void
    {
        Schema::table('tenant_config', function (Blueprint $table) {
            $table->dropColumn(['dia_inicio_q1', 'dia_fin_q1', 'dia_inicio_q2', 'dia_fin_q2']);
        });
    }
};
