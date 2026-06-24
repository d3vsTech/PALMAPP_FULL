<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tercero_labor_precios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignId('tercero_id')->constrained('terceros')->restrictOnDelete();
            $table->foreignId('labor_id')->constrained('labores')->restrictOnDelete();
            $table->decimal('precio_palma', 12, 2);
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'tercero_id', 'labor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tercero_labor_precios');
    }
};
