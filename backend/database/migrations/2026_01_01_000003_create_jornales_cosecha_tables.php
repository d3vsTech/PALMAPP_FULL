<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── JORNALES ───
        Schema::create('jornales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('empleado_id')->constrained('empleados');
            $table->foreignId('labor_id')->constrained('labores');
            $table->foreignId('lote_id')->nullable()->constrained('lotes')->nullOnDelete();
            $table->foreignId('sublote_id')->nullable()->constrained('sublotes')->nullOnDelete();
            $table->date('fecha');
            $table->decimal('dias_jornal', 4, 2)->default(1.00);
            $table->integer('cantidad_palmas')->nullable();
            $table->integer('gramos_por_palma')->nullable();
            $table->decimal('valor_insumo', 10, 2)->nullable();
            $table->decimal('valor_unitario', 10, 2);
            $table->decimal('valor_total', 10, 2);
            $table->string('observacion', 255)->nullable();
            $table->uuid('sync_uuid')->nullable()->unique();
            $table->enum('sync_estado', ['LOCAL', 'SINCRONIZADO'])->default('SINCRONIZADO');
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'fecha']);
            $table->index(['tenant_id', 'empleado_id', 'fecha']);
            $table->index(['tenant_id', 'estado']);
        });

        // ─── VIAJES ───
        Schema::create('viajes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('numero_viaje', 100);
            $table->string('placa_vehiculo', 20);
            $table->string('nombre_conductor', 100)->nullable();
            $table->date('fecha_viaje');
            $table->decimal('peso_viaje', 10, 2)->nullable();
            $table->integer('cantidad_gajos_total');
            $table->string('observaciones', 255)->nullable();
            $table->boolean('es_homogeneo')->default(true);
            $table->uuid('sync_uuid')->nullable()->unique();
            $table->enum('sync_estado', ['LOCAL', 'SINCRONIZADO'])->default('SINCRONIZADO');
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'fecha_viaje']);
            $table->index(['tenant_id', 'estado']);
        });

        // ─── REGISTRO COSECHA ───
        Schema::create('registro_cosecha', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('lote_id')->constrained('lotes');
            $table->foreignId('sublote_id')->constrained('sublotes');
            $table->date('fecha');
            $table->integer('gajos_reportados');
            $table->integer('gajos_reconteo')->nullable();
            $table->decimal('peso_confirmado', 10, 2)->nullable();
            $table->decimal('precio_cosecha', 10, 2)->nullable();
            $table->decimal('promedio_kg_gajo', 10, 2)->nullable();
            $table->decimal('valor_total', 10, 2)->nullable();
            $table->uuid('sync_uuid')->nullable()->unique();
            $table->enum('sync_estado', ['LOCAL', 'SINCRONIZADO'])->default('SINCRONIZADO');
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'fecha']);
            $table->index(['tenant_id', 'lote_id']);
        });

        // ─── VIAJE DETALLE ───
        Schema::create('viaje_detalle', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('viaje_id')->constrained('viajes');
            $table->foreignId('cosecha_id')->constrained('registro_cosecha');
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'viaje_id']);
        });

        // ─── COSECHA CUADRILLA ───
        Schema::create('cosecha_cuadrilla', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('cosecha_id')->constrained('registro_cosecha');
            $table->foreignId('empleado_id')->constrained('empleados');
            $table->decimal('peso_calculado_empleado', 10, 2)->nullable();
            $table->decimal('valor_calculado', 10, 2)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'cosecha_id']);
            $table->index(['tenant_id', 'empleado_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cosecha_cuadrilla');
        Schema::dropIfExists('viaje_detalle');
        Schema::dropIfExists('registro_cosecha');
        Schema::dropIfExists('viajes');
        Schema::dropIfExists('jornales');
    }
};
