<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tercero_labor_precios', function (Blueprint $table) {
            $table->enum('tipo_pago', ['POR_PALMA', 'JORNAL_FIJO'])
                ->nullable()
                ->after('labor_id');
        });
    }

    public function down(): void
    {
        Schema::table('tercero_labor_precios', function (Blueprint $table) {
            $table->dropColumn('tipo_pago');
        });
    }
};
