<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 0. Drop del índice viejo (tenant_id, estado boolean) para liberar el nombre
        //    viajes_tenant_id_estado_index y poder recrearlo sobre el nuevo estado string.
        Schema::table('viajes', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'estado']);
        });

        Schema::table('viajes', function (Blueprint $table) {
            $table->foreignId('empresa_transportadora_id')
                ->nullable()
                ->after('tenant_id')
                ->constrained('empresa_transportadora')
                ->restrictOnDelete();

            $table->foreignId('transportador_id')
                ->nullable()
                ->after('empresa_transportadora_id')
                ->constrained('transportadores')
                ->restrictOnDelete();

            $table->foreignId('extractora_id')
                ->nullable()
                ->after('transportador_id')
                ->constrained('extractoras')
                ->restrictOnDelete();

            $table->string('remision', 30)->nullable()->after('extractora_id');
            $table->time('hora_salida')->nullable()->after('fecha_viaje');

            $table->timestamp('despachado_at')->nullable()->after('observaciones');
            $table->timestamp('llegada_planta_at')->nullable()->after('despachado_at');
            $table->timestamp('finalizado_at')->nullable()->after('llegada_planta_at');

            $table->foreignId('creado_por')
                ->nullable()
                ->after('finalizado_at')
                ->constrained('users')
                ->nullOnDelete();
        });

        // 1. Renombrar columna estado (boolean) -> estado_activo para preservar soft delete
        Schema::table('viajes', function (Blueprint $table) {
            $table->renameColumn('estado', 'estado_activo');
        });

        // 2. Agregar nueva columna estado (string) con máquina de estados + check constraint
        Schema::table('viajes', function (Blueprint $table) {
            $table->string('estado', 20)->default('CREADO')->after('creado_por');
        });

        DB::statement("ALTER TABLE viajes ADD CONSTRAINT viajes_estado_check CHECK (estado IN (
            'CREADO',
            'EN_CAMINO',
            'EN_PLANTA',
            'FINALIZADO'
        ))");

        // 3. Backfill: viajes existentes se asumen cerrados
        DB::statement("UPDATE viajes SET estado = 'FINALIZADO'");

        // 4. Unicidad (tenant_id, remision)
        Schema::table('viajes', function (Blueprint $table) {
            $table->unique(['tenant_id', 'remision']);
            $table->index(['tenant_id', 'estado']);
            $table->index(['tenant_id', 'transportador_id']);
            $table->index(['tenant_id', 'extractora_id']);
        });

        // 5. Eliminar numero_viaje legacy (remision lo reemplaza)
        Schema::table('viajes', function (Blueprint $table) {
            $table->dropColumn('numero_viaje');
        });
    }

    public function down(): void
    {
        Schema::table('viajes', function (Blueprint $table) {
            $table->string('numero_viaje', 100)->nullable()->after('tenant_id');
        });

        Schema::table('viajes', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'remision']);
            $table->dropIndex(['tenant_id', 'estado']);
            $table->dropIndex(['tenant_id', 'transportador_id']);
            $table->dropIndex(['tenant_id', 'extractora_id']);
        });

        DB::statement("ALTER TABLE viajes DROP CONSTRAINT IF EXISTS viajes_estado_check");

        Schema::table('viajes', function (Blueprint $table) {
            $table->dropColumn('estado');
        });

        Schema::table('viajes', function (Blueprint $table) {
            $table->renameColumn('estado_activo', 'estado');
        });

        Schema::table('viajes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('empresa_transportadora_id');
            $table->dropConstrainedForeignId('transportador_id');
            $table->dropConstrainedForeignId('extractora_id');
            $table->dropConstrainedForeignId('creado_por');
            $table->dropColumn([
                'remision', 'hora_salida',
                'despachado_at', 'llegada_planta_at', 'finalizado_at',
            ]);
        });

        // Restaurar el índice original (tenant_id, estado) que vivía en la migración 3.
        Schema::table('viajes', function (Blueprint $table) {
            $table->index(['tenant_id', 'estado']);
        });
    }
};
