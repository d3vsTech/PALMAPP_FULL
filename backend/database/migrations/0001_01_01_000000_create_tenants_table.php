<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->enum('tipo_persona', ['NATURAL', 'JURIDICA']);
            $table->string('nit', 20)->nullable()->unique();
            $table->string('razon_social', 200)->nullable();
            $table->string('correo_contacto', 100)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('direccion', 200)->nullable();
            $table->string('departamento', 100)->nullable();
            $table->string('municipio', 100)->nullable();
            $table->string('logo_url', 500)->nullable();
            $table->enum('estado', ['ACTIVO', 'INACTIVO', 'SUSPENDIDO'])->default('ACTIVO');
            $table->date('fecha_activacion')->nullable();
            $table->date('fecha_suspension')->nullable();
            $table->enum('plan', ['BASICO', 'PROFESIONAL', 'ENTERPRISE'])->default('BASICO');
            $table->integer('max_empleados')->nullable();
            $table->integer('max_usuarios')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
