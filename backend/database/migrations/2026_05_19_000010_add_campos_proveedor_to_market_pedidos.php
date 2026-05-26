<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('market_pedidos', function (Blueprint $table) {
            $table->enum('prioridad', ['normal', 'alta', 'urgente'])->default('normal')->after('notas');
            $table->enum('estado_pago', ['pendiente', 'pagado'])->default('pendiente')->after('prioridad');
            $table->string('numero_guia', 100)->nullable()->after('estado_pago');
        });
    }

    public function down(): void
    {
        Schema::table('market_pedidos', function (Blueprint $table) {
            $table->dropColumn(['prioridad', 'estado_pago', 'numero_guia']);
        });
    }
};
