<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_pedidos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->foreignId('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignId('proveedor_id')->constrained('market_proveedores')->restrictOnDelete();
            $table->enum('estado', [
                'pendiente', 'confirmado', 'preparando',
                'en_transito', 'entregado', 'cancelado',
            ])->default('pendiente');
            $table->decimal('subtotal', 14, 2);
            $table->decimal('costo_envio', 12, 2)->default(0);
            $table->decimal('total', 14, 2);
            $table->string('metodo_pago', 60)->default('Transferencia Bancaria');
            $table->string('direccion_entrega', 500);
            $table->text('notas')->nullable();
            $table->timestamp('fecha_pedido')->useCurrent();
            $table->date('fecha_entrega_estimada')->nullable();
            $table->timestamp('fecha_entrega_real')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'estado']);
            $table->index(['proveedor_id', 'estado']);
            $table->index('fecha_pedido');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_pedidos');
    }
};
