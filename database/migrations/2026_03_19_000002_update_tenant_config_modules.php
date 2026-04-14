<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_config', function (Blueprint $table) {
            // ── Eliminar columnas viejas ──
            $table->dropColumn([
                'usa_jornales',
                'usa_produccion',
                'metodo_cosecha_default',
                'modulo_vacaciones',
                'modulo_liquidacion',
                'modulo_insumos',
            ]);

            // ── Nuevos módulos (siempre true por defecto) ──
            $table->boolean('modulo_dashboard')->default(true)->after('tenant_id');
            $table->boolean('modulo_plantacion')->default(true)->after('modulo_dashboard');
            $table->boolean('modulo_colaboradores')->default(true)->after('modulo_plantacion');
            $table->boolean('modulo_nomina')->default(true)->after('modulo_colaboradores');
            $table->boolean('modulo_operaciones')->default(true)->after('modulo_nomina');
            $table->boolean('modulo_viajes')->default(true)->after('modulo_operaciones');
            $table->boolean('modulo_usuarios')->default(true)->after('modulo_viajes');
            $table->boolean('modulo_configuracion')->default(true)->after('modulo_usuarios');
        });
    }

    public function down(): void
    {
        Schema::table('tenant_config', function (Blueprint $table) {
            $table->dropColumn([
                'modulo_dashboard',
                'modulo_plantacion',
                'modulo_colaboradores',
                'modulo_nomina',
                'modulo_operaciones',
                'modulo_viajes',
                'modulo_usuarios',
                'modulo_configuracion',
            ]);

            $table->boolean('usa_jornales')->default(false)->after('tenant_id');
            $table->boolean('usa_produccion')->default(false)->after('usa_jornales');
            $table->enum('metodo_cosecha_default', ['HOMOGENEO', 'NO_HOMOGENEO'])->default('HOMOGENEO')->after('pais');
            $table->boolean('modulo_vacaciones')->default(true)->after('auxilio_transporte');
            $table->boolean('modulo_liquidacion')->default(true)->after('modulo_vacaciones');
            $table->boolean('modulo_insumos')->default(true)->after('modulo_liquidacion');
        });
    }
};
