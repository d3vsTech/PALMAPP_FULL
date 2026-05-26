<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empleados', function (Blueprint $table) {
            $table->string('eps', 50)->nullable()->change();
            $table->string('fondo_pension', 50)->nullable()->change();
            $table->string('arl', 50)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('empleados', function (Blueprint $table) {
            $table->string('eps', 50)->nullable(false)->default('')->change();
            $table->string('fondo_pension', 50)->nullable(false)->default('')->change();
            $table->string('arl', 50)->nullable(false)->default('')->change();
        });
    }
};
