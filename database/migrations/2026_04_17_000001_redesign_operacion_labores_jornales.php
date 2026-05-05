<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ───────────────────────────────────────────────────────────────
        // 1. operaciones: quitar campos de lluvia detallada
        // ───────────────────────────────────────────────────────────────
        Schema::table('operaciones', function (Blueprint $table) {
            $table->dropColumn(['hora_inicio_lluvia', 'hora_fin_lluvia']);
        });

        // ───────────────────────────────────────────────────────────────
        // 2. Drop FKs que apuntan a jornales (para poder recrearla)
        // ───────────────────────────────────────────────────────────────
        Schema::table('nomina_jornal_ref', function (Blueprint $table) {
            $table->dropForeign(['jornal_id']);
        });

        Schema::dropIfExists('jornales');

        // ───────────────────────────────────────────────────────────────
        // 3. labores: simplificar a catálogo de Labores de Finca
        //    Drop columnas innecesarias y constraint de tipo_pago.
        // ───────────────────────────────────────────────────────────────
        DB::statement("ALTER TABLE labores DROP CONSTRAINT IF EXISTS labores_tipo_pago_check");

        Schema::table('labores', function (Blueprint $table) {
            $table->dropForeign(['insumo_id']);
            $table->dropColumn(['tipo_pago', 'unidad_medida', 'insumo_id']);
        });

        // valor_base pasa a ser NOT NULL porque ahora es el precio fijo de la labor de finca
        DB::statement("UPDATE labores SET valor_base = 0 WHERE valor_base IS NULL");
        DB::statement("ALTER TABLE labores ALTER COLUMN valor_base SET NOT NULL");
        DB::statement("ALTER TABLE labores ALTER COLUMN valor_base SET DEFAULT 0");

        // UNIQUE (tenant_id, nombre) para evitar duplicados por tenant
        Schema::table('labores', function (Blueprint $table) {
            $table->unique(['tenant_id', 'nombre'], 'labores_tenant_nombre_unique');
        });

        // ───────────────────────────────────────────────────────────────
        // 4. precios_palma: config per-tenant para PLATEO/PODA/SANIDAD/OTROS
        // ───────────────────────────────────────────────────────────────
        Schema::create('precios_palma', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->enum('tipo', ['PLATEO', 'PODA', 'SANIDAD', 'OTROS']);
            $table->decimal('precio_palma', 12, 2)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'tipo'], 'precios_palma_tenant_tipo_unique');
            $table->index(['tenant_id', 'estado']);
        });

        // ───────────────────────────────────────────────────────────────
        // 5. jornales: rediseño con discriminador categoria + tipo
        // ───────────────────────────────────────────────────────────────
        Schema::create('jornales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('operacion_id')->constrained('operaciones')->restrictOnDelete();
            $table->foreignId('empleado_id')->constrained('empleados');

            $table->enum('categoria', ['PALMA', 'FINCA']);
            $table->enum('tipo', ['PLATEO', 'PODA', 'FERTILIZACION', 'SANIDAD', 'OTROS'])->nullable();
            $table->foreignId('labor_id')->nullable()->constrained('labores')->restrictOnDelete();

            $table->foreignId('lote_id')->nullable()->constrained('lotes')->nullOnDelete();
            $table->foreignId('sublote_id')->nullable()->constrained('sublotes')->nullOnDelete();

            $table->integer('cantidad_palmas')->nullable();

            $table->foreignId('insumo_id')->nullable()->constrained('insumos')->nullOnDelete();
            $table->integer('gramos_por_palma')->nullable();

            $table->text('descripcion')->nullable();

            $table->string('ubicacion', 255)->nullable();
            $table->decimal('horas_extra', 5, 2)->nullable();

            $table->decimal('valor_unitario', 12, 2)->nullable();
            $table->decimal('precio_insumo_snapshot', 12, 2)->nullable();
            $table->decimal('valor_total', 12, 2)->nullable();

            $table->text('observacion')->nullable();
            $table->uuid('sync_uuid')->nullable()->unique();
            $table->enum('sync_estado', ['LOCAL', 'SINCRONIZADO'])->default('SINCRONIZADO');
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'operacion_id', 'empleado_id']);
            $table->index(['tenant_id', 'categoria', 'tipo']);
            $table->index(['tenant_id', 'estado']);
        });

        // ───────────────────────────────────────────────────────────────
        // 6. Reconstruir FK nomina_jornal_ref.jornal_id → jornales.id
        // ───────────────────────────────────────────────────────────────
        Schema::table('nomina_jornal_ref', function (Blueprint $table) {
            $table->foreign('jornal_id')->references('id')->on('jornales')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        // ───────────────────────────────────────────────────────────────
        // Rollback: volver al estado anterior (esquema previo a este redesign)
        // ───────────────────────────────────────────────────────────────
        Schema::table('nomina_jornal_ref', function (Blueprint $table) {
            $table->dropForeign(['jornal_id']);
        });

        Schema::dropIfExists('jornales');
        Schema::dropIfExists('precios_palma');

        // Restaurar labores a su forma anterior (tipo_pago, insumo_id, unidad_medida)
        Schema::table('labores', function (Blueprint $table) {
            $table->dropUnique('labores_tenant_nombre_unique');
        });

        DB::statement("ALTER TABLE labores ALTER COLUMN valor_base DROP NOT NULL");
        DB::statement("ALTER TABLE labores ALTER COLUMN valor_base DROP DEFAULT");

        Schema::table('labores', function (Blueprint $table) {
            $table->string('tipo_pago', 30)->default('JORNAL_FIJO');
            $table->enum('unidad_medida', ['PALMAS', 'JORNAL'])->nullable();
            $table->foreignId('insumo_id')->nullable()->constrained('insumos')->nullOnDelete();
        });

        DB::statement("ALTER TABLE labores ADD CONSTRAINT labores_tipo_pago_check CHECK (tipo_pago IN ('JORNAL_FIJO', 'POR_PALMA_INSUMO', 'POR_PALMA_SIMPLE'))");

        // Recrear jornales con el esquema previo (mínimo viable para que el rollback no rompa migraciones anteriores)
        Schema::create('jornales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('operacion_id')->constrained('operaciones')->restrictOnDelete();
            $table->foreignId('empleado_id')->constrained('empleados');
            $table->foreignId('labor_id')->constrained('labores');
            $table->foreignId('lote_id')->nullable()->constrained('lotes')->nullOnDelete();
            $table->foreignId('sublote_id')->nullable()->constrained('sublotes')->nullOnDelete();
            $table->string('tipo_pago', 20);
            $table->decimal('dias_jornal', 4, 2)->default(1.00);
            $table->integer('cantidad_palmas')->nullable();
            $table->integer('gramos_por_palma')->nullable();
            $table->decimal('precio_insumo_snapshot', 10, 2)->nullable();
            $table->decimal('valor_unitario', 10, 2);
            $table->decimal('valor_total', 10, 2);
            $table->string('observacion', 255)->nullable();
            $table->uuid('sync_uuid')->nullable()->unique();
            $table->enum('sync_estado', ['LOCAL', 'SINCRONIZADO'])->default('SINCRONIZADO');
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'empleado_id', 'operacion_id']);
            $table->index(['tenant_id', 'estado']);
        });

        DB::statement("ALTER TABLE jornales ADD CONSTRAINT jornales_tipo_pago_check CHECK (tipo_pago IN ('JORNAL_FIJO', 'POR_PALMA_INSUMO', 'POR_PALMA_SIMPLE'))");

        Schema::table('nomina_jornal_ref', function (Blueprint $table) {
            $table->foreign('jornal_id')->references('id')->on('jornales');
        });

        // Restaurar operaciones.hora_inicio_lluvia / hora_fin_lluvia
        Schema::table('operaciones', function (Blueprint $table) {
            $table->time('hora_inicio_lluvia')->nullable();
            $table->time('hora_fin_lluvia')->nullable();
        });
    }
};
