<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Elimina la columna legacy `jornales.horas_extra`. Era una reserva del
     * redesign de abril/2026 que nunca se conectó al endpoint de jornales y
     * está siendo reemplazada por la nueva tabla `horas_extra` con su
     * propia máquina de estados y cálculo (CST arts. 168/179 + Ley 789/2002).
     */
    public function up(): void
    {
        Schema::table('jornales', function (Blueprint $table) {
            $table->dropColumn('horas_extra');
        });
    }

    public function down(): void
    {
        Schema::table('jornales', function (Blueprint $table) {
            $table->decimal('horas_extra', 5, 2)->nullable();
        });
    }
};
