<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_carrito_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('carrito_id')->constrained('market_carritos')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('market_productos')->cascadeOnDelete();
            $table->unsignedInteger('cantidad');
            $table->timestamps();

            // Un producto por carrito (actualizar cantidad en lugar de duplicar)
            $table->unique(['carrito_id', 'producto_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_carrito_items');
    }
};
