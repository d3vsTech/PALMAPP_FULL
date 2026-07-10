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
            DB::statement('ALTER TABLE prestamo_cuotas DROP CONSTRAINT IF EXISTS prestamo_cuotas_quincena_check');
            DB::statement('ALTER TABLE prestamo_cuotas ALTER COLUMN quincena DROP NOT NULL');
            DB::statement('ALTER TABLE prestamo_cuotas ADD CONSTRAINT prestamo_cuotas_quincena_check CHECK (quincena IS NULL OR quincena IN (1, 2))');
        } else {
            Schema::table('prestamo_cuotas', function (Blueprint $table) {
                $table->unsignedTinyInteger('quincena')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE prestamo_cuotas DROP CONSTRAINT IF EXISTS prestamo_cuotas_quincena_check');
            DB::statement('UPDATE prestamo_cuotas SET quincena = 1 WHERE quincena IS NULL');
            DB::statement('ALTER TABLE prestamo_cuotas ALTER COLUMN quincena SET NOT NULL');
            DB::statement('ALTER TABLE prestamo_cuotas ADD CONSTRAINT prestamo_cuotas_quincena_check CHECK (quincena IN (1, 2))');
        } else {
            Schema::table('prestamo_cuotas', function (Blueprint $table) {
                $table->unsignedTinyInteger('quincena')->nullable(false)->change();
            });
        }
    }
};
