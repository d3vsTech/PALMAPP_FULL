<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Separa la semántica del precio en `tercero_labor_precios`:
     *
     * - `precio_palma`   → monto cuando `tipo_pago='POR_PALMA'`
     * - `tarifa_jornal`  → monto cuando `tipo_pago='JORNAL_FIJO'` (NUEVA)
     *
     * Hasta hoy, `JornalCalculationService` reusa `precio_palma` para ambos modos
     * (app/Services/JornalCalculationService.php:100-106). El backfill copia el
     * valor existente a la nueva columna para preservar el cálculo, y el CHECK
     * fuerza coherencia con `tipo_pago` a futuro.
     *
     * Decisión arquitectónica: tarifa uniforme por contratista (no override por
     * operario). Ver docs/PLAN_NOMINA_TERCEROS.md decisiones 4 y 6.
     */
    public function up(): void
    {
        Schema::table('tercero_labor_precios', function (Blueprint $table) {
            $table->decimal('tarifa_jornal', 12, 2)
                ->nullable()
                ->after('precio_palma');
        });

        // Backfill: filas con JORNAL_FIJO copian precio_palma → tarifa_jornal
        DB::statement("
            UPDATE tercero_labor_precios
            SET tarifa_jornal = precio_palma
            WHERE tipo_pago = 'JORNAL_FIJO' AND tarifa_jornal IS NULL
        ");

        // CHECK constraint solo en PostgreSQL (SQLite no soporta ADD CONSTRAINT post-creación)
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                ALTER TABLE tercero_labor_precios ADD CONSTRAINT tercero_labor_precios_tipo_pago_monto_check
                CHECK (
                    tipo_pago IS NULL
                    OR (tipo_pago = 'POR_PALMA' AND precio_palma IS NOT NULL)
                    OR (tipo_pago = 'JORNAL_FIJO' AND tarifa_jornal IS NOT NULL)
                )
            ");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE tercero_labor_precios DROP CONSTRAINT IF EXISTS tercero_labor_precios_tipo_pago_monto_check');
        }

        Schema::table('tercero_labor_precios', function (Blueprint $table) {
            $table->dropColumn('tarifa_jornal');
        });
    }
};
