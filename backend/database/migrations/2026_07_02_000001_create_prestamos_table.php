<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prestamos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('empleado_id')->constrained('empleados')->restrictOnDelete();
            $table->string('concepto', 150);
            $table->decimal('valor_total', 14, 2);
            $table->unsignedSmallInteger('num_cuotas');
            $table->decimal('cuota_valor', 14, 2);
            $table->unsignedSmallInteger('inicio_anio');
            $table->unsignedTinyInteger('inicio_mes');
            $table->unsignedTinyInteger('inicio_quincena');
            $table->decimal('saldo_pendiente', 14, 2);
            $table->unsignedSmallInteger('cuotas_pagadas')->default(0);
            $table->string('estado', 20)->default('VIGENTE');
            $table->text('observaciones')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE prestamos ADD CONSTRAINT prestamos_estado_check CHECK (estado IN ('VIGENTE','CANCELADO','PAGADO'))");
            DB::statement('ALTER TABLE prestamos ADD CONSTRAINT prestamos_inicio_mes_check CHECK (inicio_mes BETWEEN 1 AND 12)');
            DB::statement('ALTER TABLE prestamos ADD CONSTRAINT prestamos_inicio_quincena_check CHECK (inicio_quincena IN (1, 2))');
            DB::statement('ALTER TABLE prestamos ADD CONSTRAINT prestamos_num_cuotas_check CHECK (num_cuotas >= 1)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('prestamos');
    }
};
