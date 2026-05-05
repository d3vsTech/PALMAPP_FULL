<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('empresa_transportadora', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');

            $table->string('razon_social', 150);
            $table->string('nit', 30);

            $table->string('telefono', 30)->nullable();
            $table->string('direccion', 200)->nullable();
            $table->string('ciudad', 100)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('contacto_nombre', 150)->nullable();
            $table->text('observaciones')->nullable();

            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'nit']);
            $table->index(['tenant_id', 'estado']);
        });

        Schema::create('transportadores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('empresa_transportadora_id')
                ->constrained('empresa_transportadora')
                ->restrictOnDelete();

            $table->string('nombres', 100);
            $table->string('apellidos', 100);
            $table->string('placa_vehiculo', 20);

            $table->string('tipo_documento', 15)->nullable();
            $table->string('numero_documento', 30)->nullable();
            $table->string('telefono', 30)->nullable();
            $table->string('licencia_conduccion', 30)->nullable();
            $table->date('licencia_vencimiento')->nullable();
            $table->string('tipo_vehiculo', 50)->nullable();
            $table->decimal('capacidad_kg', 10, 2)->nullable();
            $table->text('observaciones')->nullable();

            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'placa_vehiculo']);
            $table->index(['tenant_id', 'empresa_transportadora_id']);
            $table->index(['tenant_id', 'estado']);
        });

        Schema::create('extractoras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');

            $table->string('razon_social', 150);
            $table->string('nit', 30);
            $table->string('ubicacion', 200);

            $table->char('departamento_codigo', 2)->nullable();
            $table->char('municipio_codigo', 5)->nullable();
            $table->foreign('departamento_codigo')
                ->references('codigo')
                ->on('departamentos')
                ->nullOnDelete();
            $table->foreign('municipio_codigo')
                ->references('codigo')
                ->on('municipios')
                ->nullOnDelete();

            $table->string('ciudad', 100)->nullable();
            $table->string('telefono', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('contacto_nombre', 150)->nullable();
            $table->decimal('distancia_km', 6, 2)->nullable();
            $table->text('observaciones')->nullable();

            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'nit']);
            $table->index(['tenant_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('extractoras');
        Schema::dropIfExists('transportadores');
        Schema::dropIfExists('empresa_transportadora');
    }
};
