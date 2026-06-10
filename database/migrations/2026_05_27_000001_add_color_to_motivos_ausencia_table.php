<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('motivos_ausencia', function (Blueprint $table) {
            $table->string('color', 7)->nullable()->after('estado');
        });
    }

    public function down(): void
    {
        Schema::table('motivos_ausencia', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};
