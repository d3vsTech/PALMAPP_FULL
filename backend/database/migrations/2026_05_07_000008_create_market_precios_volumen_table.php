<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_precios_volumen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('market_productos')->cascadeOnDelete();
            $table->unsignedInteger('cantidad_minima');
            $table->decimal('precio_unidad', 12, 2);
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index('producto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_precios_volumen');
    }
};
