<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ausencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('operacion_id')->constrained('operaciones')->restrictOnDelete();
            $table->foreignId('empleado_id')->constrained('empleados')->restrictOnDelete();

            $table->string('tipo', 30);
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->integer('dias_calendario')->default(0);
            $table->integer('dias_habiles')->default(0);

            $table->boolean('es_remunerada')->default(false);
            $table->boolean('afecta_nomina')->default(true);
            $table->decimal('porcentaje_pago', 5, 2)->default(0);

            $table->decimal('valor_dia_base', 12, 2)->nullable();
            $table->decimal('valor_calculado', 12, 2)->nullable();

            $table->string('entidad', 100)->nullable();
            $table->string('numero_radicado', 50)->nullable();
            $table->text('motivo')->nullable();
            $table->string('documento_soporte', 500)->nullable();

            $table->enum('estado', ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'LIQUIDADA'])->default('PENDIENTE');
            $table->foreignId('aprobado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprobado_at')->nullable();

            $table->foreignId('nomina_id')->nullable()->constrained('nominas')->restrictOnDelete();
            $table->foreignId('creado_por')->nullable()->constrained('users')->nullOnDelete();

            $table->uuid('sync_uuid')->nullable()->unique();
            $table->enum('sync_estado', ['LOCAL', 'SINCRONIZADO'])->default('SINCRONIZADO');

            $table->timestamps();

            $table->index(['tenant_id', 'operacion_id']);
            $table->index(['tenant_id', 'empleado_id', 'fecha_inicio']);
            $table->index(['tenant_id', 'fecha_inicio', 'fecha_fin']);
            $table->index(['tenant_id', 'estado']);
            $table->index(['tenant_id', 'nomina_id']);
        });

        // Check constraint para validar el catálogo de tipos a nivel de DB
        DB::statement("ALTER TABLE ausencias ADD CONSTRAINT ausencias_tipo_check CHECK (tipo IN (
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
        Schema::dropIfExists('ausencias');
    }
};
