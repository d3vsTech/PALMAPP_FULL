<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tercero_precio_abono', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignId('tercero_id')->constrained('terceros')->restrictOnDelete();
            $table->decimal('gramos_min', 10, 2);
            $table->decimal('gramos_max', 10, 2);
            $table->decimal('precio_palma', 12, 2);
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'tercero_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tercero_precio_abono');
    }
};
