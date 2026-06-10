<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('labores', function (Blueprint $table) {
            $table->enum('tipo_pago', ['POR_PALMA', 'JORNAL_FIJO'])
                  ->default('JORNAL_FIJO')
                  ->after('valor_base');
        });
    }

    public function down(): void
    {
        Schema::table('labores', function (Blueprint $table) {
            $table->dropColumn('tipo_pago');
        });
    }
};
