<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_config', function (Blueprint $table) {
            $table->boolean('modulo_market')->default(false)->after('modulo_configuracion');
        });
    }

    public function down(): void
    {
        Schema::table('tenant_config', function (Blueprint $table) {
            $table->dropColumn('modulo_market');
        });
    }
};
