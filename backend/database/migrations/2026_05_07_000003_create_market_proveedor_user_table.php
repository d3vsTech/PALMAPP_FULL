<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_proveedor_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proveedor_id')->constrained('market_proveedores')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('rol', ['ADMIN', 'OPERADOR'])->default('ADMIN');
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->unique(['proveedor_id', 'user_id']);
            $table->index(['user_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_proveedor_user');
    }
};
