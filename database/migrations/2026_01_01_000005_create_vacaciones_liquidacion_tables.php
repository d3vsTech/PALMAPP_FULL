<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vacaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('empleado_id')->constrained('empleados');
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->integer('dias_habiles')->default(0);
            $table->integer('dias_calendario')->default(0);
            $table->decimal('valor_dia', 12, 2)->default(0);
            $table->decimal('total_pagado', 12, 2)->default(0);
            $table->enum('estado', ['PENDIENTE', 'APROBADA', 'PAGADA', 'CANCELADA'])->default('PENDIENTE');
            $table->foreignId('aprobado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('nomina_id')->nullable()->constrained('nominas')->nullOnDelete();
            $table->text('observacion')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'empleado_id']);
            $table->index(['tenant_id', 'estado']);
        });

        Schema::create('vacacion_acumulado', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('empleado_id')->constrained('empleados');
            $table->decimal('dias_generados', 6, 2)->default(0);
            $table->decimal('dias_tomados', 6, 2)->default(0);
            $table->decimal('dias_pagados', 6, 2)->default(0);
            $table->decimal('dias_disponibles', 6, 2)->default(0);
            $table->date('fecha_corte');
            $table->timestamps();
            $table->index(['tenant_id', 'empleado_id']);
        });

        Schema::create('liquidaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('empleado_id')->constrained('empleados');
            $table->date('fecha_retiro');
            $table->enum('motivo_retiro', [
                'RENUNCIA', 'DESPIDO_SIN_JUSTA_CAUSA', 'DESPIDO_CON_JUSTA_CAUSA',
                'MUTUO_ACUERDO', 'FALLECIMIENTO', 'PENSION',
            ]);
            $table->decimal('salario_base', 12, 2)->default(0);
            $table->date('fecha_ingreso');
            $table->integer('dias_trabajados')->default(0);
            $table->decimal('valor_cesantias', 12, 2)->default(0);
            $table->decimal('valor_intereses_ces', 12, 2)->default(0);
            $table->decimal('valor_prima', 12, 2)->default(0);
            $table->decimal('valor_vacaciones', 12, 2)->default(0);
            $table->decimal('valor_indemnizacion', 12, 2)->default(0);
            $table->decimal('valor_bonificaciones', 12, 2)->default(0);
            $table->decimal('valor_salud', 12, 2)->default(0);
            $table->decimal('valor_pension', 12, 2)->default(0);
            $table->decimal('valor_otras_deducciones', 12, 2)->default(0);
            $table->decimal('total_bruto', 12, 2)->default(0);
            $table->decimal('total_deducciones', 12, 2)->default(0);
            $table->decimal('total_neto', 12, 2)->default(0);
            $table->enum('estado', ['BORRADOR', 'APROBADA', 'PAGADA'])->default('BORRADOR');
            $table->foreignId('aprobado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->text('observacion')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'empleado_id']);
            $table->index(['tenant_id', 'estado']);
        });

        Schema::create('liquidacion_detalle', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('liquidacion_id')->constrained('liquidaciones');
            $table->foreignId('concepto_id')->nullable()->constrained('nomina_concepto')->nullOnDelete();
            $table->string('nombre_concepto', 150);
            $table->enum('tipo', ['DEVENGO', 'DEDUCCION']);
            $table->enum('operacion', ['SUMA', 'RESTA']);
            $table->decimal('dias_base', 6, 2)->nullable();
            $table->decimal('valor_base', 12, 2)->nullable();
            $table->decimal('valor', 12, 2)->default(0);
            $table->string('formula_aplicada', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['tenant_id', 'liquidacion_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('liquidacion_detalle');
        Schema::dropIfExists('liquidaciones');
        Schema::dropIfExists('vacacion_acumulado');
        Schema::dropIfExists('vacaciones');
    }
};
