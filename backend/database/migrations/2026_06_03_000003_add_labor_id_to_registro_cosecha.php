<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Paso 3: agregar `labor_id` a `registro_cosecha` como snapshot de la labor
 * COSECHA que aplica al momento del registro. Esto permite que el servicio
 * de cosecha decida POR_PALMA vs JORNAL_FIJO sin tener que resolver la labor
 * al vuelo. Las cosechas históricas reciben el labor_id de la fija COSECHA
 * del tenant (existe gracias a la migración 000002).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('registro_cosecha', function (Blueprint $table) {
            $table->foreignId('labor_id')
                  ->nullable()
                  ->after('sublote_id')
                  ->constrained('labores')
                  ->nullOnDelete();
        });

        // Backfill: apuntar cada cosecha existente a la labor fija COSECHA de su tenant.
        DB::statement("
            UPDATE registro_cosecha rc
            SET labor_id = l.id
            FROM labores l
            WHERE l.tenant_id = rc.tenant_id
              AND l.tipo = 'COSECHA'
              AND l.es_sistema = true
              AND rc.labor_id IS NULL
        ");
    }

    public function down(): void
    {
        Schema::table('registro_cosecha', function (Blueprint $table) {
            $table->dropForeign(['labor_id']);
            $table->dropColumn('labor_id');
        });
    }
};
