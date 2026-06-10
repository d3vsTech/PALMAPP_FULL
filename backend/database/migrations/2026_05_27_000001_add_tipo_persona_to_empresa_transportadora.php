<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empresa_transportadora', function (Blueprint $table) {
            $table->string('tipo_persona', 10)->default('JURIDICA')->after('razon_social');
        });

        DB::statement("
            ALTER TABLE empresa_transportadora
            ADD CONSTRAINT empresa_transportadora_tipo_persona_check
            CHECK (tipo_persona IN ('JURIDICA','NATURAL'))
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE empresa_transportadora
            DROP CONSTRAINT IF EXISTS empresa_transportadora_tipo_persona_check
        ");

        Schema::table('empresa_transportadora', function (Blueprint $table) {
            $table->dropColumn('tipo_persona');
        });
    }
};
