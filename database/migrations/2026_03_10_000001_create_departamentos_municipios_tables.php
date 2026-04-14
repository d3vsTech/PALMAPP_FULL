<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departamentos', function (Blueprint $table) {
            $table->char('codigo', 2)->primary();
            $table->string('nombre', 100);
            $table->index('nombre');
        });

        Schema::create('municipios', function (Blueprint $table) {
            $table->char('codigo', 5)->primary();
            $table->string('nombre', 100);
            $table->char('departamento_codigo', 2);
            $table->foreign('departamento_codigo')
                  ->references('codigo')
                  ->on('departamentos')
                  ->restrictOnDelete();
            $table->index(['departamento_codigo', 'nombre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('municipios');
        Schema::dropIfExists('departamentos');
    }
};
