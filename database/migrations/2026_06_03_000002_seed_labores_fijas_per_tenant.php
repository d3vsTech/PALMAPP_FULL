<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Paso 2 de la unificación de Labores: por cada tenant existente, crear las
 * 5 labores fijas del sistema (es_sistema=true) y migrar el catálogo de
 * `precios_palma` (sistema + custom) hacia la tabla `labores` unificada.
 *
 * Estrategia:
 *   1. Sembrar las 5 fijas (COSECHA, PLATEO, PODA, FERTILIZACION, SANIDAD).
 *      Si ya existe un PrecioPalma `es_sistema=true` con el mismo tipo,
 *      copiar su tipo_pago y precio_palma actuales.
 *   2. Copiar cada PrecioPalma personalizado (es_sistema=false) como una
 *      Labor custom con categoria='PALMA', tipo=NULL.
 *   3. Persistir un mapping `_lp_migration_map(precios_palma_id, labor_id)`
 *      para que la migración 000004 pueda re-apuntar jornales.
 *
 * Idempotente vía firstOrCreate (clave por (tenant_id, tipo) en fijas,
 * por (tenant_id, nombre) en custom).
 */
return new class extends Migration
{
    private const NOMBRES_FIJOS = [
        'COSECHA'       => 'Cosecha',
        'PLATEO'        => 'Plateo',
        'PODA'          => 'Poda',
        'FERTILIZACION' => 'Fertilización',
        'SANIDAD'       => 'Sanidad',
    ];

    private const TIPO_PAGO_DEFAULT_FIJOS = [
        'COSECHA'       => 'POR_PALMA',
        'PLATEO'        => 'POR_PALMA',
        'PODA'          => 'POR_PALMA',
        'FERTILIZACION' => 'POR_PALMA',
        'SANIDAD'       => 'JORNAL_FIJO',
    ];

    public function up(): void
    {
        // Tabla temporal de mapping (se elimina en migración 000006).
        if (!Schema::hasTable('_lp_migration_map')) {
            Schema::create('_lp_migration_map', function ($table) {
                $table->unsignedBigInteger('precios_palma_id')->primary();
                $table->unsignedBigInteger('labor_id');
            });
        }

        // Si la tabla precios_palma no existe (entornos limpios) saltar todo.
        if (!Schema::hasTable('precios_palma')) {
            $this->soloSeedFijas();
            return;
        }

        $tenantIds = DB::table('tenants')->pluck('id');
        $now = now();

        foreach ($tenantIds as $tenantId) {
            // ─── 1. Sembrar/actualizar las 5 fijas ───
            foreach (self::NOMBRES_FIJOS as $tipo => $nombreCanonico) {
                $existente = DB::table('labores')
                    ->where('tenant_id', $tenantId)
                    ->where('tipo', $tipo)
                    ->where('es_sistema', true)
                    ->first();

                if ($existente) {
                    continue;
                }

                // Si hay un PrecioPalma fija equivalente, copiar su precio + tipo_pago.
                $precioPalmaFijo = DB::table('precios_palma')
                    ->where('tenant_id', $tenantId)
                    ->where('tipo', $tipo)
                    ->where('es_sistema', true)
                    ->first();

                DB::table('labores')->insert([
                    'tenant_id'    => $tenantId,
                    'categoria'    => 'PALMA',
                    'tipo'         => $tipo,
                    'nombre'       => $nombreCanonico,
                    'tipo_pago'    => $precioPalmaFijo->tipo_pago ?? self::TIPO_PAGO_DEFAULT_FIJOS[$tipo],
                    'precio_palma' => $precioPalmaFijo->precio_palma ?? null,
                    'es_sistema'   => true,
                    'estado'       => $precioPalmaFijo->estado ?? true,
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ]);
            }

            // ─── 2. Migrar PrecioPalma custom (es_sistema=false) → Labor custom ───
            $customLabors = DB::table('precios_palma')
                ->where('tenant_id', $tenantId)
                ->where('es_sistema', false)
                ->get();

            foreach ($customLabors as $pp) {
                $nombre = $pp->nombre ?: 'Labor sin nombre #' . $pp->id;

                // Evitar choque con UNIQUE (tenant_id, nombre) si por alguna razón
                // el nombre ya existe en `labores` (ej. labor de finca homónima).
                $nombreFinal = $nombre;
                $suffix = 0;
                while (DB::table('labores')->where('tenant_id', $tenantId)->where('nombre', $nombreFinal)->exists()) {
                    $suffix++;
                    $nombreFinal = $nombre . " (palma {$suffix})";
                }

                $newId = DB::table('labores')->insertGetId([
                    'tenant_id'    => $tenantId,
                    'categoria'    => 'PALMA',
                    'tipo'         => null,
                    'nombre'       => $nombreFinal,
                    'tipo_pago'    => $pp->tipo_pago,
                    'precio_palma' => $pp->precio_palma,
                    'es_sistema'   => false,
                    'estado'       => (bool) $pp->estado,
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ]);

                DB::table('_lp_migration_map')->insertOrIgnore([
                    'precios_palma_id' => $pp->id,
                    'labor_id'         => $newId,
                ]);
            }
        }
    }

    /**
     * Cuando no existe `precios_palma` (entornos limpios), solo sembrar las
     * 5 fijas por tenant con los defaults convencionales.
     */
    private function soloSeedFijas(): void
    {
        $tenantIds = DB::table('tenants')->pluck('id');
        $now = now();

        foreach ($tenantIds as $tenantId) {
            foreach (self::NOMBRES_FIJOS as $tipo => $nombreCanonico) {
                $existente = DB::table('labores')
                    ->where('tenant_id', $tenantId)
                    ->where('tipo', $tipo)
                    ->where('es_sistema', true)
                    ->exists();

                if ($existente) {
                    continue;
                }

                DB::table('labores')->insert([
                    'tenant_id'    => $tenantId,
                    'categoria'    => 'PALMA',
                    'tipo'         => $tipo,
                    'nombre'       => $nombreCanonico,
                    'tipo_pago'    => self::TIPO_PAGO_DEFAULT_FIJOS[$tipo],
                    'precio_palma' => null,
                    'es_sistema'   => true,
                    'estado'       => true,
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        // Eliminar las labores PALMA creadas en esta migración:
        //   - Fijas (es_sistema=true, categoria=PALMA): siempre se borran.
        //   - Custom (es_sistema=false, categoria=PALMA) si están en el mapping.
        $idsCustomDelMapping = DB::table('_lp_migration_map')->pluck('labor_id')->all();

        DB::table('labores')
            ->where('categoria', 'PALMA')
            ->where('es_sistema', true)
            ->delete();

        if (!empty($idsCustomDelMapping)) {
            DB::table('labores')->whereIn('id', $idsCustomDelMapping)->delete();
        }

        Schema::dropIfExists('_lp_migration_map');
    }
};
