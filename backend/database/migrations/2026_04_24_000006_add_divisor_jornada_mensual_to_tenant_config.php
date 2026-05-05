<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mueve el divisor de jornada mensual desde config/horas_extra.php
     * a una columna per-tenant en tenant_config. Permite que cada finca
     * elija entre 240 (CST tradicional, 48h/sem) y 210 (Ley 2101/2021,
     * 42h/sem) sin intervenciones en el código.
     */
    public function up(): void
    {
        Schema::table('tenant_config', function (Blueprint $table) {
            $table->smallInteger('divisor_jornada_mensual')->default(240)->after('auxilio_transporte');
        });
    }

    public function down(): void
    {
        Schema::table('tenant_config', function (Blueprint $table) {
            $table->dropColumn('divisor_jornada_mensual');
        });
    }
};
