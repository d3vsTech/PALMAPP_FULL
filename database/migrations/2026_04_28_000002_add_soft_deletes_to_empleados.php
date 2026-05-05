<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empleados', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Reemplazar UNIQUE (tenant_id, documento) por índice parcial WHERE deleted_at IS NULL
        // para permitir recrear empleados con el mismo documento tras un soft delete.
        Schema::table('empleados', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'documento']);
        });

        DB::statement('CREATE UNIQUE INDEX empleados_tenant_doc_active_unique
                       ON empleados (tenant_id, documento) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS empleados_tenant_doc_active_unique');

        Schema::table('empleados', function (Blueprint $table) {
            $table->unique(['tenant_id', 'documento']);
        });

        Schema::table('empleados', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
