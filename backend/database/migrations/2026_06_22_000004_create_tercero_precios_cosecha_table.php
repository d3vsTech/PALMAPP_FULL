<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tercero_precios_cosecha', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignId('tercero_id')->constrained('terceros')->restrictOnDelete();
            $table->foreignId('lote_id')->constrained('lotes')->restrictOnDelete();
            $table->smallInteger('anio');
            $table->decimal('precio', 12, 2);
            $table->timestamps();

            $table->unique(['tenant_id', 'tercero_id', 'lote_id', 'anio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tercero_precios_cosecha');
    }
};
