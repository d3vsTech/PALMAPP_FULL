<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_pedido_estados_historial', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_id')->constrained('market_pedidos')->cascadeOnDelete();
            $table->string('estado_anterior', 40)->nullable();
            $table->string('estado_nuevo', 40);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('comentario')->nullable();
            $table->timestamp('fecha_cambio')->useCurrent();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['pedido_id', 'fecha_cambio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_pedido_estados_historial');
    }
};
