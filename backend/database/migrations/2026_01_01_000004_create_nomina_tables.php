<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nomina_concepto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('nombre', 100);
            $table->string('codigo', 20);
            $table->enum('tipo', ['DEDUCCION_LEGAL', 'DEDUCCION_VOLUNTARIA', 'BONIFICACION_FIJA', 'BONIFICACION_VARIABLE']);
            $table->enum('subtipo', ['SALUD', 'PENSION', 'ARL', 'FONDO_SOLIDARIDAD', 'LIBRANZA', 'EMBARGO', 'PRODUCTIVIDAD', 'TRANSPORTE', 'ALIMENTACION', 'ANTIGUEDAD', 'OTRO']);
            $table->enum('operacion', ['SUMA', 'RESTA']);
            $table->enum('calculo', ['PORCENTAJE', 'VALOR_FIJO', 'FORMULA']);
            $table->decimal('valor_referencia', 12, 4)->default(0);
            $table->enum('base_calculo', ['SALARIO_BASE', 'TOTAL_DEVENGADO', 'SALARIO_MINIMO', 'MANUAL'])->default('TOTAL_DEVENGADO');
            $table->enum('aplica_a', ['FIJO', 'VARIABLE', 'AMBOS'])->default('AMBOS');
            $table->boolean('es_obligatorio')->default(false);
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'codigo']);
            $table->index(['tenant_id', 'activo']);
        });

        Schema::create('nomina_tabla_legal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('concepto_id')->constrained('nomina_concepto');
            $table->decimal('porcentaje_empleado', 5, 2)->default(0);
            $table->decimal('porcentaje_empresa', 5, 2)->default(0);
            $table->date('vigente_desde');
            $table->date('vigente_hasta')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'concepto_id']);
        });

        Schema::create('nominas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->enum('quincena', ['PRIMERA', 'SEGUNDA'])->nullable();
            $table->integer('mes');
            $table->integer('anio');
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->decimal('total_fijos', 14, 2)->default(0);
            $table->decimal('total_variables', 14, 2)->default(0);
            $table->decimal('total_bonificaciones', 14, 2)->default(0);
            $table->decimal('total_deducciones', 14, 2)->default(0);
            $table->decimal('total_general', 14, 2)->default(0);
            $table->enum('estado', ['BORRADOR', 'CALCULADA', 'CERRADA'])->default('BORRADOR');
            $table->foreignId('cerrada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('cerrada_at')->nullable();
            $table->text('observacion')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'estado']);
            $table->index(['tenant_id', 'anio', 'mes']);
        });

        Schema::create('nomina_empleado', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('nomina_id')->constrained('nominas');
            $table->foreignId('empleado_id')->constrained('empleados');
            $table->enum('salario_tipo', ['FIJO', 'VARIABLE']);
            $table->decimal('salario_base', 12, 2)->default(0);
            $table->decimal('total_jornales', 12, 2)->default(0);
            $table->decimal('total_cosecha', 12, 2)->default(0);
            $table->decimal('total_devengado', 12, 2)->default(0);
            $table->decimal('total_bonificaciones', 12, 2)->default(0);
            $table->decimal('total_deducciones', 12, 2)->default(0);
            $table->decimal('total_neto', 12, 2)->default(0);
            $table->enum('estado', ['PENDIENTE', 'CALCULADO', 'APROBADO'])->default('PENDIENTE');
            $table->timestamps();
            $table->index(['tenant_id', 'nomina_id']);
            $table->index(['tenant_id', 'empleado_id']);
            $table->unique(['nomina_id', 'empleado_id']);
        });

        Schema::create('nomina_empleado_concepto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('nomina_empleado_id')->constrained('nomina_empleado');
            $table->foreignId('concepto_id')->constrained('nomina_concepto');
            $table->enum('operacion', ['SUMA', 'RESTA']);
            $table->decimal('valor_calculado', 12, 2)->default(0);
            $table->decimal('porcentaje_aplicado', 7, 4)->nullable();
            $table->decimal('base_aplicada', 12, 2)->nullable();
            $table->boolean('es_manual')->default(false);
            $table->string('observacion', 255)->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'nomina_empleado_id']);
        });

        Schema::create('nomina_jornal_ref', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('nomina_empleado_id')->constrained('nomina_empleado');
            $table->foreignId('jornal_id')->constrained('jornales');
            $table->decimal('valor_snapshot', 12, 2);
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'nomina_empleado_id']);
            $table->unique(['nomina_empleado_id', 'jornal_id']);
        });

        Schema::create('nomina_cosecha_ref', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('nomina_empleado_id')->constrained('nomina_empleado');
            $table->foreignId('cosecha_cuadrilla_id')->constrained('cosecha_cuadrilla');
            $table->decimal('valor_snapshot', 12, 2);
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'nomina_empleado_id']);
            $table->unique(['nomina_empleado_id', 'cosecha_cuadrilla_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nomina_cosecha_ref');
        Schema::dropIfExists('nomina_jornal_ref');
        Schema::dropIfExists('nomina_empleado_concepto');
        Schema::dropIfExists('nomina_empleado');
        Schema::dropIfExists('nominas');
        Schema::dropIfExists('nomina_tabla_legal');
        Schema::dropIfExists('nomina_concepto');
    }
};
