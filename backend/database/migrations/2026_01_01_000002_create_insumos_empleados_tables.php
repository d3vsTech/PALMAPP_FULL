<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── INSUMOS ───
        Schema::create('insumos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('nombre', 100);
            $table->string('unidad_medida', 100);
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'estado']);
        });

        Schema::create('precio_abono', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('insumo_id')->constrained('insumos');
            $table->decimal('gramos_min', 10, 2);
            $table->decimal('gramos_max', 10, 2);
            $table->decimal('precio_palma', 10, 2);
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'insumo_id']);
        });

        // ─── LABORES ───
        Schema::create('labores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('nombre', 100);
            $table->enum('tipo_pago', ['JORNAL_FIJO', 'POR_PALMA']);
            $table->decimal('valor_base', 10, 2)->nullable();
            $table->enum('unidad_medida', ['PALMAS', 'JORNAL'])->nullable();
            $table->foreignId('insumo_id')->nullable()->constrained('insumos')->nullOnDelete();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'estado']);
        });

        // ─── MODALIDAD CONTRATO ───
        Schema::create('modalidad_contrato', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('nombre', 100);
            $table->string('descripcion', 255)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'estado']);
        });

        // ─── CARGOS ───
        Schema::create('cargos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('modalidad_id')->constrained('modalidad_contrato');
            $table->string('nombre', 100);
            $table->enum('salario_tipo', ['FIJO', 'VARIABLE']);
            $table->decimal('salario', 12, 2)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'estado']);
        });

        // ─── EMPLEADOS ───
        Schema::create('empleados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('cargo_id')->constrained('cargos');
            $table->string('nombres', 100);
            $table->string('apellidos', 100);
            $table->string('tipo_documento', 10)->default('CC');
            $table->string('documento', 50);
            $table->string('correo_electronico', 100)->nullable();
            $table->string('telefono', 50)->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->date('fecha_ingreso');
            $table->date('fecha_retiro')->nullable();
            $table->string('direccion', 200)->nullable();
            $table->string('municipio', 100)->nullable();
            $table->string('departamento', 100)->nullable();
            $table->string('eps', 50);
            $table->string('fondo_pension', 50);
            $table->string('arl', 50);
            $table->string('caja_compensacion', 50)->nullable();
            $table->string('talla_camisa', 10)->nullable();
            $table->string('talla_pantalon', 10)->nullable();
            $table->string('talla_calzado', 5)->nullable();
            $table->enum('tipo_cuenta', ['AHORROS', 'CORRIENTE', 'EFECTIVO'])->default('EFECTIVO');
            $table->string('entidad_bancaria', 50)->nullable();
            $table->string('numero_cuenta', 30)->nullable();
            $table->string('contacto_emergencia_nombre', 100)->nullable();
            $table->string('contacto_emergencia_telefono', 50)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'documento']);
            $table->index(['tenant_id', 'estado']);
            $table->index(['tenant_id', 'cargo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('empleados');
        Schema::dropIfExists('cargos');
        Schema::dropIfExists('modalidad_contrato');
        Schema::dropIfExists('labores');
        Schema::dropIfExists('precio_abono');
        Schema::dropIfExists('insumos');
    }
};
