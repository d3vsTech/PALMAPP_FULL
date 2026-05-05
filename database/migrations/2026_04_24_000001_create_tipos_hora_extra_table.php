<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tipos_hora_extra', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('codigo', 10);
            $table->string('nombre', 100);
            $table->decimal('porcentaje_recargo', 5, 2);
            $table->string('franja_horaria', 20);
            $table->boolean('aplica_festivo')->default(false);
            $table->boolean('es_extra')->default(true);
            $table->boolean('paga_hora_completa')->default(true);
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'codigo']);
            $table->index(['tenant_id', 'estado']);
        });

        DB::statement("ALTER TABLE tipos_hora_extra ADD CONSTRAINT tipos_hora_extra_codigo_check CHECK (codigo IN (
            'HED',
            'HEN',
            'RN',
            'HRD',
            'HEDF',
            'HENF',
            'RND'
        ))");

        DB::statement("ALTER TABLE tipos_hora_extra ADD CONSTRAINT tipos_hora_extra_franja_horaria_check CHECK (franja_horaria IN (
            'DIURNO',
            'NOCTURNO',
            'MIXTO'
        ))");
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_hora_extra');
    }
};
