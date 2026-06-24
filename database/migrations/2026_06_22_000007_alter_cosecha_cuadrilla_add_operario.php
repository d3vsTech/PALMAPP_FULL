<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cosecha_cuadrilla', function (Blueprint $table) {
            // Hacer empleado_id nullable para soportar operarios
            $table->foreignId('empleado_id')->nullable()->change();

            // Nuevas FK para operarios de terceros
            $table->foreignId('operario_id')
                ->nullable()
                ->after('empleado_id')
                ->constrained('operarios')
                ->restrictOnDelete();

            $table->foreignId('tercero_id')
                ->nullable()
                ->after('operario_id')
                ->constrained('terceros')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cosecha_cuadrilla', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tercero_id');
            $table->dropConstrainedForeignId('operario_id');
            $table->foreignId('empleado_id')->nullable(false)->change();
        });
    }
};
