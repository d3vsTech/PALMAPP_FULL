<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('motivos_ausencia', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('nombre', 100);
            $table->string('tipo_base', 30);
            $table->boolean('es_remunerada')->default(false);
            $table->boolean('afecta_nomina')->default(true);
            $table->decimal('porcentaje_pago_default', 5, 2)->default(0);
            $table->boolean('requiere_soporte')->default(false);
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'nombre']);
            $table->index(['tenant_id', 'estado']);
        });

        DB::statement("ALTER TABLE motivos_ausencia ADD CONSTRAINT motivos_ausencia_tipo_base_check CHECK (tipo_base IN (
            'INCAPACIDAD_EPS',
            'INCAPACIDAD_ARL',
            'LICENCIA_MATERNIDAD',
            'LICENCIA_PATERNIDAD',
            'LICENCIA_LUTO',
            'PERMISO_REMUNERADO',
            'PERMISO_NO_REMUNERADO',
            'AUSENCIA_INJUSTIFICADA',
            'CALAMIDAD_DOMESTICA',
            'SUSPENSION_DISCIPLINARIA',
            'OTRO'
        ))");
    }

    public function down(): void
    {
        Schema::dropIfExists('motivos_ausencia');
    }
};
