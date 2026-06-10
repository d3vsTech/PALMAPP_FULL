<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Paso 4: re-apuntar todos los jornales al esquema unificado de `labores`.
 *
 * Estados de origen:
 *   - PALMA + labor_palma_id NOT NULL  → modo catálogo OTROS (custom). Usa
 *     mapping _lp_migration_map para encontrar la Labor equivalente.
 *   - PALMA + tipo ∈ {PLATEO, PODA, FERTILIZACION, SANIDAD} con labor_palma_id NULL
 *     → apuntar a la Labor fija del mismo tipo del tenant.
 *   - PALMA + tipo='OTROS' con labor_palma_id NULL → "OTROS legacy".
 *     Crear (firstOrCreate) una Labor "Otros (legacy)" custom por tenant,
 *     inactiva, y re-apuntar ahí.
 *   - FINCA → ya tienen labor_id válido, no cambian.
 *
 * Tras esta migración: jornales.labor_id queda 100% poblado y consistente con
 * el modelo unificado. La columna labor_palma_id y el enum 'OTROS' se eliminan
 * en la migración 000005.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        // ─── 1. labor_palma_id (catálogo OTROS) → labor_id vía mapping ───
        if (Schema::hasColumn('jornales', 'labor_palma_id') && Schema::hasTable('_lp_migration_map')) {
            DB::statement("
                UPDATE jornales j
                SET labor_id = m.labor_id
                FROM _lp_migration_map m
                WHERE j.labor_palma_id = m.precios_palma_id
            ");
        }

        // ─── 2. PALMA fijas (PLATEO/PODA/FERTILIZACION/SANIDAD) ───
        DB::statement("
            UPDATE jornales j
            SET labor_id = l.id
            FROM labores l
            WHERE l.tenant_id = j.tenant_id
              AND l.es_sistema = true
              AND l.tipo = j.tipo
              AND j.categoria = 'PALMA'
              AND j.tipo IN ('PLATEO','PODA','FERTILIZACION','SANIDAD')
              AND (j.labor_id IS NULL OR j.labor_id NOT IN (SELECT id FROM labores))
        ");

        // ─── 3. OTROS legacy → crear "Otros (legacy)" custom por tenant ───
        $tenantsConOtrosLegacy = DB::table('jornales')
            ->where('categoria', 'PALMA')
            ->where('tipo', 'OTROS')
            ->whereNull('labor_palma_id')
            ->select('tenant_id')
            ->distinct()
            ->pluck('tenant_id');

        foreach ($tenantsConOtrosLegacy as $tenantId) {
            $nombre = 'Otros (legacy)';
            $nombreFinal = $nombre;
            $suffix = 0;

            $existing = DB::table('labores')
                ->where('tenant_id', $tenantId)
                ->where('nombre', $nombre)
                ->where('categoria', 'PALMA')
                ->first();

            if ($existing) {
                $laborLegacyId = $existing->id;
            } else {
                while (DB::table('labores')->where('tenant_id', $tenantId)->where('nombre', $nombreFinal)->exists()) {
                    $suffix++;
                    $nombreFinal = $nombre . " {$suffix}";
                }

                $laborLegacyId = DB::table('labores')->insertGetId([
                    'tenant_id'    => $tenantId,
                    'categoria'    => 'PALMA',
                    'tipo'         => null,
                    'nombre'       => $nombreFinal,
                    'tipo_pago'    => 'JORNAL_FIJO',
                    'precio_palma' => null,
                    'es_sistema'   => false,
                    'estado'       => false, // oculta en dropdowns nuevos
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ]);
            }

            DB::table('jornales')
                ->where('tenant_id', $tenantId)
                ->where('categoria', 'PALMA')
                ->where('tipo', 'OTROS')
                ->whereNull('labor_palma_id')
                ->update(['labor_id' => $laborLegacyId]);
        }

        // ─── Sanity check ───
        $sinLabor = DB::table('jornales')->whereNull('labor_id')->count();
        if ($sinLabor > 0) {
            throw new \RuntimeException(
                "Migración abortada: {$sinLabor} jornales quedaron sin labor_id. " .
                "Revisar datos antes de continuar."
            );
        }
    }

    public function down(): void
    {
        // No hay rollback exacto: esta migración solo actualizó valores existentes
        // de labor_id. La FK a precios_palma se recupera en la migración 000005 down().
        // Las labores "Otros (legacy)" creadas aquí no se borran automáticamente:
        // operacionalmente son inofensivas (estado=false) y borrarlas rompería
        // jornales históricos.
    }
};
