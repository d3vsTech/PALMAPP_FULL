<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empleado_contratos', function (Blueprint $table) {
            $table->index(
                ['tenant_id', 'empleado_id', 'estado_contrato', 'fecha_inicio'],
                'idx_emp_contratos_vigente_lookup',
            );
        });
    }

    public function down(): void
    {
        Schema::table('empleado_contratos', function (Blueprint $table) {
            $table->dropIndex('idx_emp_contratos_vigente_lookup');
        });
    }
};
