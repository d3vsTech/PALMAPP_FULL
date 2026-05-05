<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('horas_extra', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('operacion_id')->constrained('operaciones')->restrictOnDelete();
            $table->foreignId('empleado_id')->constrained('empleados')->restrictOnDelete();
            $table->foreignId('tipo_hora_extra_id')->constrained('tipos_hora_extra')->restrictOnDelete();

            $table->string('codigo', 10);
            $table->decimal('porcentaje_recargo', 5, 2);
            $table->boolean('paga_hora_completa');

            $table->decimal('cantidad_horas', 5, 2);
            $table->decimal('valor_hora_base', 12, 2);
            $table->decimal('valor_calculado', 12, 2);

            $table->text('observacion')->nullable();

            $table->enum('estado', ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'LIQUIDADA'])->default('PENDIENTE');
            $table->text('motivo_rechazo')->nullable();
            $table->foreignId('aprobado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprobado_at')->nullable();

            $table->foreignId('nomina_id')->nullable()->constrained('nominas')->restrictOnDelete();
            $table->foreignId('creado_por')->nullable()->constrained('users')->nullOnDelete();

            $table->uuid('sync_uuid')->nullable()->unique();
            $table->enum('sync_estado', ['LOCAL', 'SINCRONIZADO'])->default('SINCRONIZADO');

            $table->timestamps();

            $table->index(['tenant_id', 'operacion_id']);
            $table->index(['tenant_id', 'empleado_id']);
            $table->index(['tenant_id', 'estado']);
            $table->index(['tenant_id', 'nomina_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('horas_extra');
    }
};
