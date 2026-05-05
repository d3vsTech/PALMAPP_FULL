<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('viaje_detalle', function (Blueprint $table) {
            $table->boolean('reconteo_aprobado')->default(false)->after('cosecha_id');
            $table->timestamp('reconteo_aprobado_at')->nullable()->after('reconteo_aprobado');
            $table->foreignId('reconteo_aprobado_por')
                ->nullable()
                ->after('reconteo_aprobado_at')
                ->constrained('users')
                ->nullOnDelete();

            $table->index(['tenant_id', 'reconteo_aprobado']);
        });

        // Unique parcial: una cosecha solo puede estar en un viaje_detalle activo.
        DB::statement('CREATE UNIQUE INDEX viaje_detalle_cosecha_activa_unique
                       ON viaje_detalle (cosecha_id)
                       WHERE estado = true');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS viaje_detalle_cosecha_activa_unique');

        Schema::table('viaje_detalle', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'reconteo_aprobado']);
            $table->dropConstrainedForeignId('reconteo_aprobado_por');
            $table->dropColumn(['reconteo_aprobado', 'reconteo_aprobado_at']);
        });
    }
};
