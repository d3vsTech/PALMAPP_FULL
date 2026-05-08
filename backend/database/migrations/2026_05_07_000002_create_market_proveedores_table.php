<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_proveedores', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_empresa', 150);
            $table->string('nit', 20)->nullable()->unique();
            $table->string('telefono', 20);
            $table->string('email', 150)->unique();
            $table->string('direccion', 255);
            $table->string('ciudad', 80);
            $table->string('departamento', 80);
            $table->text('descripcion')->nullable();
            $table->string('logo_url', 500)->nullable();
            $table->enum('estado', ['activo', 'inactivo', 'suspendido'])->default('activo');
            $table->decimal('calificacion_promedio', 3, 2)->default(0);
            $table->unsignedInteger('total_ventas')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_proveedores');
    }
};
