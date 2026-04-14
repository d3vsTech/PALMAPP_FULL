<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('palmas', function (Blueprint $table) {
            $table->foreignId('linea_id')
                ->nullable()
                ->after('sublote_id')
                ->constrained('lineas')
                ->nullOnDelete();
            $table->index(['linea_id']);
        });
    }

    public function down(): void
    {
        Schema::table('palmas', function (Blueprint $table) {
            $table->dropForeign(['linea_id']);
            $table->dropIndex(['linea_id']);
            $table->dropColumn('linea_id');
        });
    }
};
