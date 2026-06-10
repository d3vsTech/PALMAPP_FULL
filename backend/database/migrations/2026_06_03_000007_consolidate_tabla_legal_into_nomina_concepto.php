<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── 1. Ampliar enum `tipo` con APORTE_LEGAL ──────────────────────
        DB::statement('ALTER TABLE nomina_concepto DROP CONSTRAINT IF EXISTS nomina_concepto_tipo_check');
        DB::statement("
            ALTER TABLE nomina_concepto ADD CONSTRAINT nomina_concepto_tipo_check
            CHECK (tipo IN (
                'APORTE_LEGAL',
                'DEDUCCION_LEGAL',
                'DEDUCCION_VOLUNTARIA',
                'BONIFICACION_FIJA',
                'BONIFICACION_VARIABLE'
            ))
        ");

        // ─── 2. Añadir columnas nuevas a nomina_concepto ──────────────────
        Schema::table('nomina_concepto', function (Blueprint $table) {
            $table->decimal('porcentaje_empleado', 5, 2)->nullable()->after('valor_referencia');
            $table->decimal('porcentaje_empresa', 5, 2)->nullable()->after('porcentaje_empleado');
            $table->date('vigente_desde')->nullable()->after('porcentaje_empresa');
            $table->date('vigente_hasta')->nullable()->after('vigente_desde');
            $table->boolean('afecta_salario_minimo')->default(false)->after('vigente_hasta');
            $table->string('tipo_remuneracion', 20)->default('REMUNERADO')->after('afecta_salario_minimo');
            $table->index(['tenant_id', 'tipo', 'activo']);
        });

        DB::statement("
            ALTER TABLE nomina_concepto ADD CONSTRAINT nomina_concepto_tipo_remuneracion_check
            CHECK (tipo_remuneracion IN ('REMUNERADO','NO_REMUNERADO'))
        ");

        // ─── 3. Backfill desde nomina_tabla_legal ────────────────────────
        $conceptos = DB::table('nomina_concepto')->get();

        foreach ($conceptos as $c) {
            $ultima = DB::table('nomina_tabla_legal')
                ->where('concepto_id', $c->id)
                ->orderByDesc('vigente_desde')
                ->first();

            $update = [];

            if ($ultima) {
                $update['porcentaje_empleado'] = $ultima->porcentaje_empleado;
                $update['porcentaje_empresa']  = $ultima->porcentaje_empresa;
                $update['vigente_desde']       = $ultima->vigente_desde;
                $update['vigente_hasta']       = $ultima->vigente_hasta;
            } elseif ($c->calculo === 'PORCENTAJE') {
                $update['porcentaje_empleado'] = $c->valor_referencia;
                $update['porcentaje_empresa']  = 0;
                $update['vigente_desde']       = '2022-12-31';
            }

            if (in_array($c->codigo, ['SALUD', 'PENSION', 'ARL'], true)) {
                $update['tipo'] = 'APORTE_LEGAL';
            }

            if (!empty($update)) {
                DB::table('nomina_concepto')->where('id', $c->id)->update($update);
            }
        }

        // ─── 4. Drop nomina_tabla_legal ──────────────────────────────────
        Schema::dropIfExists('nomina_tabla_legal');
    }

    public function down(): void
    {
        // ─── 1. Recrear nomina_tabla_legal con schema original ───────────
        Schema::create('nomina_tabla_legal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('concepto_id')->constrained('nomina_concepto');
            $table->decimal('porcentaje_empleado', 5, 2)->default(0);
            $table->decimal('porcentaje_empresa', 5, 2)->default(0);
            $table->date('vigente_desde');
            $table->date('vigente_hasta')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'concepto_id']);
        });

        // ─── 2. Copiar de vuelta los conceptos con porcentaje ────────────
        $conceptos = DB::table('nomina_concepto')
            ->whereNotNull('porcentaje_empleado')
            ->whereNotNull('vigente_desde')
            ->get();

        foreach ($conceptos as $c) {
            DB::table('nomina_tabla_legal')->insert([
                'tenant_id'           => $c->tenant_id,
                'concepto_id'         => $c->id,
                'porcentaje_empleado' => $c->porcentaje_empleado,
                'porcentaje_empresa'  => $c->porcentaje_empresa ?? 0,
                'vigente_desde'       => $c->vigente_desde,
                'vigente_hasta'       => $c->vigente_hasta,
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);
        }

        // ─── 3. Restaurar enum tipo sin APORTE_LEGAL ─────────────────────
        DB::statement("UPDATE nomina_concepto SET tipo='DEDUCCION_LEGAL' WHERE tipo='APORTE_LEGAL'");
        DB::statement('ALTER TABLE nomina_concepto DROP CONSTRAINT IF EXISTS nomina_concepto_tipo_check');
        DB::statement("
            ALTER TABLE nomina_concepto ADD CONSTRAINT nomina_concepto_tipo_check
            CHECK (tipo IN (
                'DEDUCCION_LEGAL',
                'DEDUCCION_VOLUNTARIA',
                'BONIFICACION_FIJA',
                'BONIFICACION_VARIABLE'
            ))
        ");

        DB::statement('ALTER TABLE nomina_concepto DROP CONSTRAINT IF EXISTS nomina_concepto_tipo_remuneracion_check');

        // ─── 4. Droppear columnas nuevas ─────────────────────────────────
        Schema::table('nomina_concepto', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'tipo', 'activo']);
            $table->dropColumn([
                'porcentaje_empleado',
                'porcentaje_empresa',
                'vigente_desde',
                'vigente_hasta',
                'afecta_salario_minimo',
                'tipo_remuneracion',
            ]);
        });
    }
};
