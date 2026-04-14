<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_config', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained('tenants')->cascadeOnDelete();
            $table->boolean('usa_jornales')->default(false);
            $table->boolean('usa_produccion')->default(false);
            $table->enum('tipo_pago_nomina', ['QUINCENAL', 'MENSUAL'])->default('QUINCENAL');
            $table->string('moneda', 3)->default('COP');
            $table->string('zona_horaria', 50)->default('America/Bogota');
            $table->string('pais', 2)->default('CO');
            $table->enum('metodo_cosecha_default', ['HOMOGENEO', 'NO_HOMOGENEO'])->default('HOMOGENEO');
            $table->decimal('salario_minimo_vigente', 12, 2)->default(0);
            $table->decimal('auxilio_transporte', 12, 2)->default(0);
            $table->boolean('modulo_vacaciones')->default(true);
            $table->boolean('modulo_liquidacion')->default(true);
            $table->boolean('modulo_insumos')->default(true);
            $table->boolean('sync_habilitado')->default(true);
            $table->jsonb('configuracion_extra')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_config');
    }
};
