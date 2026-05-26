<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('market_proveedores', function (Blueprint $table) {
            // Bancario
            $table->foreignId('banco_id')->nullable()->after('total_ventas')
                ->constrained('market_bancos')->nullOnDelete();
            $table->enum('tipo_cuenta', ['ahorros', 'corriente'])->nullable()->after('banco_id');
            $table->string('numero_cuenta', 30)->nullable()->after('tipo_cuenta');
            $table->string('titular_cuenta', 150)->nullable()->after('numero_cuenta');

            // Envíos
            $table->foreignId('transportadora_id')->nullable()->after('titular_cuenta')
                ->constrained('market_transportadoras')->nullOnDelete();
            $table->unsignedSmallInteger('tiempo_preparacion_horas')->default(24)->after('transportadora_id');
            $table->decimal('monto_envio_gratis', 12, 2)->nullable()->after('tiempo_preparacion_horas');
            $table->boolean('permitir_recoger_tienda')->default(false)->after('monto_envio_gratis');

            // Notificaciones (jsonb con 5 booleanos)
            $table->jsonb('notificaciones_config')->nullable()->after('permitir_recoger_tienda');
        });
    }

    public function down(): void
    {
        Schema::table('market_proveedores', function (Blueprint $table) {
            $table->dropConstrainedForeignId('banco_id');
            $table->dropConstrainedForeignId('transportadora_id');
            $table->dropColumn([
                'tipo_cuenta',
                'numero_cuenta',
                'titular_cuenta',
                'tiempo_preparacion_horas',
                'monto_envio_gratis',
                'permitir_recoger_tienda',
                'notificaciones_config',
            ]);
        });
    }
};
