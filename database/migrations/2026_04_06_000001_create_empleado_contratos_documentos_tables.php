<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── NUEVOS CAMPOS EN EMPLEADOS ───
        Schema::table('empleados', function (Blueprint $table) {
            $table->date('fecha_expedicion_documento')->nullable()->after('documento');
            $table->string('lugar_expedicion', 100)->nullable()->after('fecha_expedicion_documento');
        });

        // ─── CONTRATOS DEL EMPLEADO ───
        Schema::create('empleado_contratos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('empleado_id')->constrained('empleados');
            $table->foreignId('modalidad_id')->constrained('modalidad_contrato');
            $table->foreignId('cargo_id')->constrained('cargos');
            $table->date('fecha_inicio');
            $table->date('fecha_terminacion')->nullable();
            $table->decimal('salario', 12, 2)->nullable();
            $table->enum('estado_contrato', ['VIGENTE', 'TERMINADO'])->default('VIGENTE');
            $table->string('adjunto_path', 500)->nullable();
            $table->string('adjunto_nombre_original', 255)->nullable();
            $table->string('observacion', 500)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'empleado_id']);
            $table->index(['tenant_id', 'empleado_id', 'estado_contrato']);
            $table->index(['tenant_id', 'estado']);
        });

        // ─── DOCUMENTOS DEL EMPLEADO ───
        Schema::create('empleado_documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('empleado_id')->constrained('empleados');
            $table->string('categoria', 50);
            $table->string('tipo_documento', 80);
            $table->string('nombre_archivo', 255);
            $table->string('archivo_path', 500);
            $table->string('archivo_nombre_original', 255);
            $table->string('mime_type', 100)->nullable();
            $table->unsignedInteger('archivo_tamano')->nullable();
            $table->date('fecha_documento')->nullable();
            $table->string('observacion', 500)->nullable();
            $table->foreignId('subido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'empleado_id']);
            $table->index(['tenant_id', 'empleado_id', 'categoria']);
            $table->index(['tenant_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('empleado_documentos');
        Schema::dropIfExists('empleado_contratos');

        Schema::table('empleados', function (Blueprint $table) {
            $table->dropColumn(['fecha_expedicion_documento', 'lugar_expedicion']);
        });
    }
};
