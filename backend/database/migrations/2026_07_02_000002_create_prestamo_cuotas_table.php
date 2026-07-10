<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prestamo_cuotas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('prestamo_id')->constrained('prestamos')->cascadeOnDelete();
            $table->unsignedSmallInteger('numero_cuota');
            $table->unsignedSmallInteger('anio');
            $table->unsignedTinyInteger('mes');
            $table->unsignedTinyInteger('quincena');
            $table->decimal('monto', 14, 2);
            $table->string('estado', 20)->default('PENDIENTE');
            $table->foreignId('nomina_empleado_id')->nullable()->constrained('nomina_empleado')->nullOnDelete();
            $table->foreignId('nomina_empleado_concepto_id')->nullable()->constrained('nomina_empleado_concepto')->nullOnDelete();
            $table->foreignId('aplicada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('aplicada_at')->nullable();
            $table->timestamps();

            $table->unique(['prestamo_id', 'numero_cuota'], 'prestamo_cuotas_numero_unique');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE prestamo_cuotas ADD CONSTRAINT prestamo_cuotas_estado_check CHECK (estado IN ('PENDIENTE','APLICADA'))");
            DB::statement('ALTER TABLE prestamo_cuotas ADD CONSTRAINT prestamo_cuotas_mes_check CHECK (mes BETWEEN 1 AND 12)');
            DB::statement('ALTER TABLE prestamo_cuotas ADD CONSTRAINT prestamo_cuotas_quincena_check CHECK (quincena IN (1, 2))');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('prestamo_cuotas');
    }
};
