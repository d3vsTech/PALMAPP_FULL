<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('palmas', function (Blueprint $table) {
            // Índice para getMaxContador: ORDER BY id DESC WHERE sublote_id = ?
            $table->index(['sublote_id', 'id'], 'palmas_sublote_id_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('palmas', function (Blueprint $table) {
            $table->dropIndex('palmas_sublote_id_id_index');
        });
    }
};
