<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_pedido_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_id')->constrained('market_pedidos')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('market_productos')->restrictOnDelete();
            $table->unsignedInteger('cantidad');
            // Snapshot del precio y nombre al momento del pedido para inmutabilidad histórica
            $table->decimal('precio_unitario', 12, 2);
            $table->decimal('subtotal', 14, 2);
            $table->decimal('descuento', 12, 2)->default(0);
            $table->string('nombre_producto', 200);
            $table->timestamp('created_at')->useCurrent();

            $table->index('pedido_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_pedido_items');
    }
};
