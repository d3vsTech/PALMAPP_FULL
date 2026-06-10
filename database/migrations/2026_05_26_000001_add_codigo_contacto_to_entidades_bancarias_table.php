<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entidades_bancarias', function (Blueprint $table) {
            $table->string('codigo', 10)->nullable()->after('nombre');
            $table->string('contacto', 50)->nullable()->after('codigo');
        });
    }

    public function down(): void
    {
        Schema::table('entidades_bancarias', function (Blueprint $table) {
            $table->dropColumn(['codigo', 'contacto']);
        });
    }
};
