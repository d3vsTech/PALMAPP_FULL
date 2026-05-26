<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('importaciones_productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proveedor_id')->constrained('market_proveedores')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('nombre_archivo_original', 255);
            $table->string('archivo_path', 500);

            $table->unsignedInteger('total_filas')->default(0);
            $table->unsignedInteger('filas_exitosas')->default(0);
            $table->unsignedInteger('filas_fallidas')->default(0);

            $table->string('estado', 20)->default('PENDIENTE')->index();

            $table->jsonb('resultados')->nullable();
            $table->text('error_fatal')->nullable();

            $table->timestamp('iniciado_at')->nullable();
            $table->timestamp('finalizado_at')->nullable();
            $table->timestamps();

            $table->index(['proveedor_id', 'estado']);
            $table->index(['proveedor_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('importaciones_productos');
    }
};
