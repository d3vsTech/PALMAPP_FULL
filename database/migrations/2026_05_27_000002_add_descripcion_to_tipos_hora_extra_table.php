<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tipos_hora_extra', function (Blueprint $table) {
            $table->string('descripcion', 150)->nullable()->after('paga_hora_completa');
        });
    }

    public function down(): void
    {
        Schema::table('tipos_hora_extra', function (Blueprint $table) {
            $table->dropColumn('descripcion');
        });
    }
};
