<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->restrictOnDelete();
            $table->foreignId('tercero_id')->constrained('terceros')->restrictOnDelete();

            $table->string('nombres', 100);
            $table->string('apellidos', 100);
            $table->string('cedula', 20)->nullable();
            $table->string('cargo', 100)->nullable();

            // Almacenados como string (nombre), no FK — igual que Empleado
            $table->string('eps', 50)->nullable();
            $table->string('arl', 50)->nullable();

            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'tercero_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operarios');
    }
};
