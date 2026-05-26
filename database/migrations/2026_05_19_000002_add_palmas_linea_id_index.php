<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Usar SQL directo con IF NOT EXISTS para no fallar si el índice ya existe
        DB::statement('CREATE INDEX IF NOT EXISTS palmas_linea_id_index ON palmas (linea_id)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS palmas_linea_id_index');
    }
};
