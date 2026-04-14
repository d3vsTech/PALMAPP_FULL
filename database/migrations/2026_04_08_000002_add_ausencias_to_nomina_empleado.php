<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nomina_empleado', function (Blueprint $table) {
            $table->decimal('dias_ausencia_descontados', 6, 2)
                ->default(0)
                ->after('total_cosecha');

            $table->decimal('total_ausencias_descuento', 12, 2)
                ->default(0)
                ->after('dias_ausencia_descontados');

            $table->decimal('total_ausencias_remunerado', 12, 2)
                ->default(0)
                ->after('total_ausencias_descuento');
        });
    }

    public function down(): void
    {
        Schema::table('nomina_empleado', function (Blueprint $table) {
            $table->dropColumn([
                'dias_ausencia_descontados',
                'total_ausencias_descuento',
                'total_ausencias_remunerado',
            ]);
        });
    }
};
