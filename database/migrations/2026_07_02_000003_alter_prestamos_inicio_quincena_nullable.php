<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE prestamos DROP CONSTRAINT IF EXISTS prestamos_inicio_quincena_check');
            DB::statement('ALTER TABLE prestamos ALTER COLUMN inicio_quincena DROP NOT NULL');
            DB::statement('ALTER TABLE prestamos ADD CONSTRAINT prestamos_inicio_quincena_check CHECK (inicio_quincena IS NULL OR inicio_quincena IN (1, 2))');
        } else {
            Schema::table('prestamos', function (Blueprint $table) {
                $table->unsignedTinyInteger('inicio_quincena')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE prestamos DROP CONSTRAINT IF EXISTS prestamos_inicio_quincena_check');
            DB::statement('UPDATE prestamos SET inicio_quincena = 1 WHERE inicio_quincena IS NULL');
            DB::statement('ALTER TABLE prestamos ALTER COLUMN inicio_quincena SET NOT NULL');
            DB::statement('ALTER TABLE prestamos ADD CONSTRAINT prestamos_inicio_quincena_check CHECK (inicio_quincena IN (1, 2))');
        } else {
            Schema::table('prestamos', function (Blueprint $table) {
                $table->unsignedTinyInteger('inicio_quincena')->nullable(false)->change();
            });
        }
    }
};
