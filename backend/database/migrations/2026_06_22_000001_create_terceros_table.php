<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terceros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->restrictOnDelete();

            $table->enum('tipo_persona', ['JURIDICA', 'NATURAL']);

            // Persona Jurídica
            $table->string('nit', 20)->nullable();
            $table->string('razon_social', 150)->nullable();
            $table->string('representante', 150)->nullable();

            // Persona Natural
            $table->string('cedula', 20)->nullable();
            $table->string('nombre_completo', 150)->nullable();

            // Compartidos
            $table->string('nombre_comercial', 150)->nullable();
            $table->string('telefono', 30)->nullable();
            $table->string('email', 100)->nullable();
            $table->boolean('estado')->default(true);

            $table->timestamps();

            $table->unique(['tenant_id', 'nit']);
            $table->unique(['tenant_id', 'cedula']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terceros');
    }
};
