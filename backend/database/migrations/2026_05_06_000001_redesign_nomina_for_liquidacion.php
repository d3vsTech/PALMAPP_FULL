<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Rediseño del módulo de Nómina para soportar el flujo de liquidación
     * por empleado descrito en docs/API_NOMINA.md (mockups de la UI):
     *
     * - `nominas.estado` se simplifica a BORRADOR | CERRADA (CALCULADA se descarta:
     *   el cálculo es por empleado, no por nómina entera).
     * - `nominas.quincena` deja de ser enum string ('PRIMERA','SEGUNDA') y pasa
     *   a smallint (1, 2, NULL) para coincidir con el código del modelo Nomina.
     * - `nominas.tipo_pago_snapshot` guarda QUINCENAL/MENSUAL al crear, para
     *   blindar nóminas históricas si el tenant cambia su tipo_pago_nomina.
     * - `nomina_empleado.estado` se simplifica a PENDIENTE | LIQUIDADO.
     * - Se agregan columnas para el desprendible: dias_trabajados, subsidio_transporte,
     *   total_incapacidades, snapshots de cargo/predio/SMLV, liquidado_por/at.
     * - `nomina_concepto.subtipo` se amplía con PRESTAMO y AHORRO_VOLUNTARIO.
     *
     * NOTA: usa sintaxis PostgreSQL (CHECK constraints) — los enums de Laravel
     * en Postgres se almacenan como VARCHAR + CHECK, igual que en
     * 2026_05_04_000001_refactor_viajes_to_three_states.
     */
    public function up(): void
    {
        // ─── 1. nominas ──────────────────────────────────────────────────
        // 1.1 Quincena: enum string → smallint (1, 2, NULL)
        Schema::table('nominas', function (Blueprint $table) {
            $table->dropColumn('quincena');
        });
        Schema::table('nominas', function (Blueprint $table) {
            $table->unsignedSmallInteger('quincena')->nullable()->after('tenant_id');
            $table->enum('tipo_pago_snapshot', ['QUINCENAL', 'MENSUAL'])
                ->default('QUINCENAL')
                ->after('quincena');
        });

        // 1.2 Estado: BORRADOR|CALCULADA|CERRADA → BORRADOR|CERRADA
        DB::statement('ALTER TABLE nominas DROP CONSTRAINT IF EXISTS nominas_estado_check');
        DB::statement("UPDATE nominas SET estado = 'BORRADOR' WHERE estado = 'CALCULADA'");
        DB::statement("ALTER TABLE nominas ADD CONSTRAINT nominas_estado_check CHECK (estado IN ('BORRADOR','CERRADA'))");

        // 1.3 Índice único: una nómina por (tenant, año, mes, quincena)
        Schema::table('nominas', function (Blueprint $table) {
            $table->unique(['tenant_id', 'anio', 'mes', 'quincena'], 'nominas_tenant_periodo_unique');
        });

        // ─── 2. nomina_empleado ──────────────────────────────────────────
        // 2.1 Estado: PENDIENTE|CALCULADO|APROBADO → PENDIENTE|LIQUIDADO
        DB::statement('ALTER TABLE nomina_empleado DROP CONSTRAINT IF EXISTS nomina_empleado_estado_check');
        DB::statement("UPDATE nomina_empleado SET estado = 'LIQUIDADO' WHERE estado IN ('CALCULADO','APROBADO')");
        DB::statement("ALTER TABLE nomina_empleado ADD CONSTRAINT nomina_empleado_estado_check CHECK (estado IN ('PENDIENTE','LIQUIDADO'))");

        // 2.2 Nuevas columnas para liquidación + desprendible
        Schema::table('nomina_empleado', function (Blueprint $table) {
            $table->unsignedInteger('dias_trabajados')->default(0)->after('salario_base');
            $table->decimal('subsidio_transporte', 12, 2)->default(0)->after('total_recargos');
            $table->decimal('total_incapacidades', 12, 2)->default(0)->after('total_ausencias_remunerado');

            // Snapshots para blindar el desprendible de cambios futuros
            $table->string('cargo_snapshot', 100)->nullable()->after('subsidio_transporte');
            $table->string('predio_snapshot', 150)->nullable()->after('cargo_snapshot');
            $table->decimal('salario_minimo_snapshot', 12, 2)->nullable()->after('predio_snapshot');

            // Auditoría de la liquidación
            $table->foreignId('liquidado_por')->nullable()->after('estado')->constrained('users')->nullOnDelete();
            $table->dateTime('liquidado_at')->nullable()->after('liquidado_por');
        });

        // ─── 3. nomina_concepto ──────────────────────────────────────────
        // Ampliar subtipo con PRESTAMO y AHORRO_VOLUNTARIO
        DB::statement('ALTER TABLE nomina_concepto DROP CONSTRAINT IF EXISTS nomina_concepto_subtipo_check');
        DB::statement("
            ALTER TABLE nomina_concepto ADD CONSTRAINT nomina_concepto_subtipo_check
            CHECK (subtipo IN (
                'SALUD','PENSION','ARL','FONDO_SOLIDARIDAD',
                'LIBRANZA','EMBARGO','PRESTAMO','AHORRO_VOLUNTARIO',
                'PRODUCTIVIDAD','TRANSPORTE','ALIMENTACION','ANTIGUEDAD','OTRO'
            ))
        ");
    }

    public function down(): void
    {
        // ─── 3. nomina_concepto ──
        // Las filas con subtipos introducidos por el up() (PRESTAMO / AHORRO_VOLUNTARIO)
        // se borran antes de restaurar el CHECK estricto, de lo contrario el ALTER
        // falla con check violation. Un rollback siempre pierde la data que solo
        // tenía sentido bajo el schema nuevo.
        DB::statement('ALTER TABLE nomina_concepto DROP CONSTRAINT IF EXISTS nomina_concepto_subtipo_check');
        DB::statement("DELETE FROM nomina_concepto WHERE subtipo IN ('PRESTAMO','AHORRO_VOLUNTARIO')");
        DB::statement("
            ALTER TABLE nomina_concepto ADD CONSTRAINT nomina_concepto_subtipo_check
            CHECK (subtipo IN (
                'SALUD','PENSION','ARL','FONDO_SOLIDARIDAD',
                'LIBRANZA','EMBARGO',
                'PRODUCTIVIDAD','TRANSPORTE','ALIMENTACION','ANTIGUEDAD','OTRO'
            ))
        ");

        // ─── 2. nomina_empleado ──
        Schema::table('nomina_empleado', function (Blueprint $table) {
            $table->dropForeign(['liquidado_por']);
            $table->dropColumn([
                'dias_trabajados',
                'subsidio_transporte',
                'total_incapacidades',
                'cargo_snapshot',
                'predio_snapshot',
                'salario_minimo_snapshot',
                'liquidado_por',
                'liquidado_at',
            ]);
        });

        // Mapeo del estado nuevo (LIQUIDADO) al equivalente más cercano del viejo
        // set (APROBADO) antes de restaurar el CHECK estricto.
        DB::statement('ALTER TABLE nomina_empleado DROP CONSTRAINT IF EXISTS nomina_empleado_estado_check');
        DB::statement("UPDATE nomina_empleado SET estado = 'APROBADO' WHERE estado = 'LIQUIDADO'");
        DB::statement("ALTER TABLE nomina_empleado ADD CONSTRAINT nomina_empleado_estado_check CHECK (estado IN ('PENDIENTE','CALCULADO','APROBADO'))");

        // ─── 1. nominas ──
        Schema::table('nominas', function (Blueprint $table) {
            $table->dropUnique('nominas_tenant_periodo_unique');
        });

        DB::statement('ALTER TABLE nominas DROP CONSTRAINT IF EXISTS nominas_estado_check');
        DB::statement("ALTER TABLE nominas ADD CONSTRAINT nominas_estado_check CHECK (estado IN ('BORRADOR','CALCULADA','CERRADA'))");

        Schema::table('nominas', function (Blueprint $table) {
            $table->dropColumn(['quincena', 'tipo_pago_snapshot']);
        });
        Schema::table('nominas', function (Blueprint $table) {
            $table->enum('quincena', ['PRIMERA', 'SEGUNDA'])->nullable()->after('tenant_id');
        });
    }
};
