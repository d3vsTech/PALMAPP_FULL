<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Data migration: actualiza los porcentajes de recargo dominical/festivo
 * según la Ley 2466 de 2025 (vigente desde su promulgación).
 *
 * Cambios:
 *   HRD  75  → 90   (recargo dominical/festivo)
 *   HEDF 100 → 115  (90 + 25 extra diurno)
 *   HENF 150 → 165  (90 + 75 extra nocturno)
 *   RND  110 → 125  (90 + 35 recargo nocturno)
 *
 * HED (25), HEN (75), RN (35) no cambian.
 *
 * Idempotente: solo actualiza filas donde el valor coincide con el porcentaje
 * anterior, evitando pisar personalizaciones del admin.
 */
return new class extends Migration
{
    private const CAMBIOS = [
        ['codigo' => 'HRD',  'de' => 75.00,  'a' => 90.00],
        ['codigo' => 'HEDF', 'de' => 100.00, 'a' => 115.00],
        ['codigo' => 'HENF', 'de' => 150.00, 'a' => 165.00],
        ['codigo' => 'RND',  'de' => 110.00, 'a' => 125.00],
    ];

    public function up(): void
    {
        foreach (self::CAMBIOS as $cambio) {
            DB::table('tipos_hora_extra')
                ->where('codigo', $cambio['codigo'])
                ->where('porcentaje_recargo', $cambio['de'])
                ->update(['porcentaje_recargo' => $cambio['a']]);
        }
    }

    public function down(): void
    {
        foreach (self::CAMBIOS as $cambio) {
            DB::table('tipos_hora_extra')
                ->where('codigo', $cambio['codigo'])
                ->where('porcentaje_recargo', $cambio['a'])
                ->update(['porcentaje_recargo' => $cambio['de']]);
        }
    }
};
