<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nomina_promedio_lote', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('nomina_id');
            $table->unsignedBigInteger('lote_id');
            $table->decimal('promedio_auto', 10, 4);
            $table->decimal('promedio_manual', 10, 4)->nullable();
            $table->decimal('promedio_efectivo', 10, 4);
            $table->unsignedBigInteger('ajustado_por')->nullable();
            $table->timestamp('ajustado_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('nomina_id')->references('id')->on('nominas')->onDelete('cascade');
            $table->foreign('lote_id')->references('id')->on('lotes');
            $table->foreign('ajustado_por')->references('id')->on('users');

            $table->unique(['nomina_id', 'lote_id']);
            $table->index(['tenant_id', 'nomina_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nomina_promedio_lote');
    }
};
