<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('predios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('nombre', 50);
            $table->string('ubicacion', 100);
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->decimal('hectareas_totales', 10, 2)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'estado']);
        });

        Schema::create('semillas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('tipo', 50);
            $table->string('nombre', 50);
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'estado']);
        });

        Schema::create('lotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('predio_id')->constrained('predios');
            $table->string('nombre', 100);
            $table->date('fecha_siembra')->nullable();
            $table->decimal('hectareas_sembradas', 10, 2)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'predio_id']);
            $table->index(['tenant_id', 'estado']);
        });

        Schema::create('semilla_lote', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('lote_id')->constrained('lotes');
            $table->foreignId('semilla_id')->constrained('semillas');
            $table->timestamps();
            $table->unique(['lote_id', 'semilla_id']);
            $table->index('tenant_id');
        });

        Schema::create('sublotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('lote_id')->constrained('lotes');
            $table->string('nombre', 50);
            $table->integer('cantidad_palmas');
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'lote_id']);
        });

        Schema::create('lineas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('sublote_id')->constrained('sublotes');
            $table->integer('numero');
            $table->integer('cantidad_palmas')->default(0);
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'sublote_id']);
            $table->unique(['sublote_id', 'numero']);
        });

        Schema::create('palmas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('sublote_id')->constrained('sublotes');
            $table->string('codigo', 50);
            $table->string('descripcion', 50)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'sublote_id']);
            $table->unique(['sublote_id', 'codigo']);
        });

        Schema::create('promedio_lote', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('lote_id')->constrained('lotes');
            $table->decimal('promedio', 10, 2);
            $table->integer('anio');
            $table->timestamps();
            $table->unique(['lote_id', 'anio']);
            $table->index(['tenant_id', 'anio']);
        });

        Schema::create('precio_cosecha', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('lote_id')->constrained('lotes');
            $table->decimal('precio', 10, 2);
            $table->integer('anio');
            $table->timestamps();
            $table->unique(['lote_id', 'anio']);
            $table->index(['tenant_id', 'anio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('precio_cosecha');
        Schema::dropIfExists('promedio_lote');
        Schema::dropIfExists('palmas');
        Schema::dropIfExists('lineas');
        Schema::dropIfExists('sublotes');
        Schema::dropIfExists('semilla_lote');
        Schema::dropIfExists('lotes');
        Schema::dropIfExists('semillas');
        Schema::dropIfExists('predios');
    }
};
