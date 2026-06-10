<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('motivos_ausencia', function (Blueprint $table) {
            $table->string('condicion', 100)->nullable()->after('color');
            $table->string('norma_legal', 50)->nullable()->after('condicion');
            $table->string('formula_calculo', 200)->nullable()->after('norma_legal');
            $table->boolean('afecta_seguridad_social')->default(false)->after('formula_calculo');
            $table->boolean('afecta_parafiscales')->default(false)->after('afecta_seguridad_social');
            $table->boolean('afecta_prestaciones')->default(false)->after('afecta_parafiscales');
        });
    }

    public function down(): void
    {
        Schema::table('motivos_ausencia', function (Blueprint $table) {
            $table->dropColumn([
                'condicion',
                'norma_legal',
                'formula_calculo',
                'afecta_seguridad_social',
                'afecta_parafiscales',
                'afecta_prestaciones',
            ]);
        });
    }
};
