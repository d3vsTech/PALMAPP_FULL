<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── OPERACIONES (Planilla diaria) ───
        Schema::create('operaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->date('fecha');
            $table->time('hora_inicio')->nullable();
            $table->time('hora_fin')->nullable();
            $table->enum('estado', ['BORRADOR', 'APROBADA'])->default('BORRADOR');
            $table->boolean('hubo_lluvia')->default(false);
            $table->time('hora_inicio_lluvia')->nullable();
            $table->time('hora_fin_lluvia')->nullable();
            $table->string('observaciones', 500)->nullable();
            $table->foreignId('creado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprobado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprobado_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'fecha']);
            $table->index(['tenant_id', 'estado']);
            // Una sola operación por tenant por fecha
            $table->unique(['tenant_id', 'fecha']);
        });

        // ─── Agregar operacion_id a jornales ───
        Schema::table('jornales', function (Blueprint $table) {
            $table->foreignId('operacion_id')
                ->nullable()
                ->after('tenant_id')
                ->constrained('operaciones')
                ->nullOnDelete();

            $table->index(['tenant_id', 'operacion_id']);
        });

        // ─── Agregar operacion_id a registro_cosecha ───
        Schema::table('registro_cosecha', function (Blueprint $table) {
            $table->foreignId('operacion_id')
                ->nullable()
                ->after('tenant_id')
                ->constrained('operaciones')
                ->nullOnDelete();

            $table->index(['tenant_id', 'operacion_id']);
        });
    }

    public function down(): void
    {
        Schema::table('registro_cosecha', function (Blueprint $table) {
            $table->dropForeign(['operacion_id']);
            $table->dropColumn('operacion_id');
        });

        Schema::table('jornales', function (Blueprint $table) {
            $table->dropForeign(['operacion_id']);
            $table->dropColumn('operacion_id');
        });

        Schema::dropIfExists('operaciones');
    }
};
