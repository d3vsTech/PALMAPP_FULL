<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabla de snapshots que relaciona cada HoraExtra liquidada con el
     * NominaEmpleado que la incluyó. Se crea un registro al cerrar la
     * nómina, capturando el valor_calculado al momento del cierre.
     */
    public function up(): void
    {
        Schema::create('nomina_hora_extra_ref', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('nomina_empleado_id')->constrained('nomina_empleado');
            $table->foreignId('hora_extra_id')->constrained('horas_extra');
            $table->decimal('valor_snapshot', 12, 2);
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'nomina_empleado_id']);
            $table->unique(['nomina_empleado_id', 'hora_extra_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nomina_hora_extra_ref');
    }
};
