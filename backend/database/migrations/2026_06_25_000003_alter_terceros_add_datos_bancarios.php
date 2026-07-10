<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Datos bancarios para el giro de pagos a contratistas (terceros).
     *
     * Los campos quedan NULL en BD; `RegistrarPagoTerceroRequest` los exige solo
     * cuando `metodo_pago='TRANSFERENCIA'`. Para EFECTIVO/CHEQUE no se validan.
     *
     * Ver docs/PLAN_NOMINA_TERCEROS.md secciones A.2 y F.5.
     */
    public function up(): void
    {
        Schema::table('terceros', function (Blueprint $table) {
            $table->string('banco', 100)->nullable()->after('email');
            $table->enum('tipo_cuenta', ['AHORROS', 'CORRIENTE'])->nullable()->after('banco');
            $table->string('numero_cuenta', 50)->nullable()->after('tipo_cuenta');
            $table->string('titular_cuenta', 150)->nullable()->after('numero_cuenta');
        });
    }

    public function down(): void
    {
        Schema::table('terceros', function (Blueprint $table) {
            $table->dropColumn(['banco', 'tipo_cuenta', 'numero_cuenta', 'titular_cuenta']);
        });
    }
};
