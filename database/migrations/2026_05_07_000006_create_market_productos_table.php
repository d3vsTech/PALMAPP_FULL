<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proveedor_id')->constrained('market_proveedores')->cascadeOnDelete();
            $table->foreignId('categoria_id')->constrained('market_categorias')->restrictOnDelete();
            $table->foreignId('unidad_medida_id')->constrained('market_unidades_medida')->restrictOnDelete();
            $table->string('sku', 50)->nullable()->unique();
            $table->string('nombre', 150);
            $table->text('descripcion');
            $table->jsonb('especificaciones')->nullable();
            $table->decimal('precio_unitario', 12, 2);
            $table->unsignedInteger('stock_disponible')->default(0);
            $table->unsignedInteger('stock_minimo')->nullable();
            $table->string('imagen_principal', 500)->nullable();
            $table->enum('estado', ['activo', 'inactivo', 'agotado'])->default('activo');
            $table->boolean('destacado')->default(false);
            $table->decimal('calificacion_promedio', 3, 2)->default(0);
            $table->unsignedInteger('total_reseñas')->default(0);
            $table->unsignedInteger('unidades_vendidas')->default(0);
            $table->decimal('ingresos_acumulados', 14, 2)->default(0);
            $table->timestamps();

            $table->index(['proveedor_id', 'estado']);
            $table->index('categoria_id');
            $table->index('nombre');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_productos');
    }
};
