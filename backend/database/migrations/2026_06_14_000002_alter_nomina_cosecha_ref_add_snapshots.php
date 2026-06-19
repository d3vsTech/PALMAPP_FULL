<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nomina_cosecha_ref', function (Blueprint $table) {
            // Gajos que le correspondieron a este empleado (FLOOR(gajos_efectivos / N))
            $table->unsignedInteger('gajos_asignados')->nullable()->after('valor_snapshot');

            // Snapshot del precio_cosecha ($/kg) vigente al momento de liquidar
            $table->decimal('precio_cosecha_snapshot', 12, 2)->nullable()->after('gajos_asignados');

            // Snapshot del promedio de promedios del lote en el período de nómina
            $table->decimal('promedio_promedios_snapshot', 12, 4)->nullable()->after('precio_cosecha_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('nomina_cosecha_ref', function (Blueprint $table) {
            $table->dropColumn([
                'gajos_asignados',
                'precio_cosecha_snapshot',
                'promedio_promedios_snapshot',
            ]);
        });
    }
};
