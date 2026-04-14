<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('precio_abono', function (Blueprint $table) {
            // Eliminar FK e índice de insumo_id
            $table->dropForeign(['insumo_id']);
            $table->dropIndex(['tenant_id', 'insumo_id']);

            // Eliminar columna insumo_id
            $table->dropColumn('insumo_id');

            // Nuevo índice genérico por tenant
            $table->index(['tenant_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::table('precio_abono', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'estado']);

            $table->foreignId('insumo_id')->nullable()->after('tenant_id')->constrained('insumos');
            $table->index(['tenant_id', 'insumo_id']);
        });
    }
};
