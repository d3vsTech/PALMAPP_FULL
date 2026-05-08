<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_carritos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->timestamps();

            // Un carrito activo por finca; se crea on-demand y se vacía tras checkout
            $table->unique('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_carritos');
    }
};
