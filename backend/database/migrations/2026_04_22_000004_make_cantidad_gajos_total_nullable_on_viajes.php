<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE viajes ALTER COLUMN cantidad_gajos_total DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement('UPDATE viajes SET cantidad_gajos_total = 0 WHERE cantidad_gajos_total IS NULL');
        DB::statement('ALTER TABLE viajes ALTER COLUMN cantidad_gajos_total SET NOT NULL');
    }
};
