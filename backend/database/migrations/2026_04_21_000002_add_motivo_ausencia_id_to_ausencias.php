<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ausencias', function (Blueprint $table) {
            $table->foreignId('motivo_ausencia_id')
                ->nullable()
                ->after('empleado_id')
                ->constrained('motivos_ausencia')
                ->restrictOnDelete();

            $table->text('motivo_rechazo')->nullable()->after('motivo');

            $table->index(['tenant_id', 'motivo_ausencia_id']);
        });
    }

    public function down(): void
    {
        Schema::table('ausencias', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'motivo_ausencia_id']);
            $table->dropForeign(['motivo_ausencia_id']);
            $table->dropColumn(['motivo_ausencia_id', 'motivo_rechazo']);
        });
    }
};
