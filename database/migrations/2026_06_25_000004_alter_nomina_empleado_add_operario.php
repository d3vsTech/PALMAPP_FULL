<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Extiende `nomina_empleado` para soportar operarios de contratistas:
     *
     * - `empleado_id`  → nullable (sigue obligatorio cuando la fila es de empleado)
     * - `operario_id`  → nueva FK nullable a `operarios`
     * - `tercero_id`   → nueva FK nullable a `terceros` (snapshot del contratista)
     * - `salario_tipo` → nullable (queda NULL para filas de operario)
     *
     * Reglas blindadas con CHECK constraints (PostgreSQL):
     * - XOR: exactamente uno de `empleado_id` u `operario_id` presente
     * - Si la fila es de operario, `tercero_id` es obligatorio (snapshot)
     *
     * No se agrega 'TERCERO' al enum salario_tipo: el motor ramifica por
     * `operario_id IS NOT NULL`. Ver docs/PLAN_NOMINA_TERCEROS.md decisión 5.
     */
    public function up(): void
    {
        Schema::table('nomina_empleado', function (Blueprint $table) {
            $table->foreignId('empleado_id')->nullable()->change();

            $table->foreignId('operario_id')
                ->nullable()
                ->after('empleado_id')
                ->constrained('operarios')
                ->restrictOnDelete();

            $table->foreignId('tercero_id')
                ->nullable()
                ->after('operario_id')
                ->constrained('terceros')
                ->restrictOnDelete();

            $table->index(['tenant_id', 'nomina_id', 'tercero_id'], 'ne_tenant_nomina_tercero_idx');
            $table->index(['tenant_id', 'operario_id'], 'ne_tenant_operario_idx');
        });

        if (DB::getDriverName() === 'pgsql') {
            // salario_tipo: el enum en Postgres es VARCHAR + CHECK; basta con
            // soltar el NOT NULL — el CHECK existente sigue restringiendo valores.
            DB::statement('ALTER TABLE nomina_empleado ALTER COLUMN salario_tipo DROP NOT NULL');

            // XOR: exactamente uno de empleado_id u operario_id presente
            DB::statement("
                ALTER TABLE nomina_empleado ADD CONSTRAINT nomina_empleado_xor_check
                CHECK (
                    (empleado_id IS NOT NULL AND operario_id IS NULL)
                    OR (empleado_id IS NULL AND operario_id IS NOT NULL)
                )
            ");

            // operario_id implica tercero_id (snapshot obligatorio)
            DB::statement("
                ALTER TABLE nomina_empleado ADD CONSTRAINT nomina_empleado_operario_tercero_check
                CHECK (operario_id IS NULL OR tercero_id IS NOT NULL)
            ");
        } else {
            // SQLite: usar Schema builder para soltar el NOT NULL de salario_tipo
            Schema::table('nomina_empleado', function (Blueprint $table) {
                $table->string('salario_tipo', 50)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE nomina_empleado DROP CONSTRAINT IF EXISTS nomina_empleado_operario_tercero_check');
            DB::statement('ALTER TABLE nomina_empleado DROP CONSTRAINT IF EXISTS nomina_empleado_xor_check');
        }

        // Antes de restaurar NOT NULL hay que limpiar filas de operario
        // (no tienen salario_tipo) — un rollback siempre pierde data nueva.
        DB::statement("DELETE FROM nomina_empleado WHERE operario_id IS NOT NULL");
        DB::statement("UPDATE nomina_empleado SET salario_tipo = 'FIJO' WHERE salario_tipo IS NULL");

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE nomina_empleado ALTER COLUMN salario_tipo SET NOT NULL');
        } else {
            Schema::table('nomina_empleado', function (Blueprint $table) {
                $table->string('salario_tipo', 50)->nullable(false)->change();
            });
        }

        Schema::table('nomina_empleado', function (Blueprint $table) {
            $table->dropIndex('ne_tenant_operario_idx');
            $table->dropIndex('ne_tenant_nomina_tercero_idx');
            $table->dropConstrainedForeignId('tercero_id');
            $table->dropConstrainedForeignId('operario_id');
            $table->foreignId('empleado_id')->nullable(false)->change();
        });
    }
};
