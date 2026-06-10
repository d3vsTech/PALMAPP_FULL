<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ausencias', function (Blueprint $table) {
            $table->boolean('afecta_seguridad_social')->default(false)->after('porcentaje_pago');
            $table->boolean('afecta_parafiscales')->default(false)->after('afecta_seguridad_social');
            $table->boolean('afecta_prestaciones')->default(false)->after('afecta_parafiscales');
        });
    }

    public function down(): void
    {
        Schema::table('ausencias', function (Blueprint $table) {
            $table->dropColumn([
                'afecta_seguridad_social',
                'afecta_parafiscales',
                'afecta_prestaciones',
            ]);
        });
    }
};
