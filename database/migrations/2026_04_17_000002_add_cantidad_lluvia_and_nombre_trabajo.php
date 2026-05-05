<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('operaciones', function (Blueprint $table) {
            $table->decimal('cantidad_lluvia', 6, 2)->nullable()->after('hubo_lluvia');
        });

        Schema::table('jornales', function (Blueprint $table) {
            $table->string('nombre_trabajo', 255)->nullable()->after('descripcion');
        });
    }

    public function down(): void
    {
        Schema::table('jornales', function (Blueprint $table) {
            $table->dropColumn('nombre_trabajo');
        });

        Schema::table('operaciones', function (Blueprint $table) {
            $table->dropColumn('cantidad_lluvia');
        });
    }
};
