<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cambiar default de 'PROPIETARIO' a 'USUARIO'
        Schema::table('tenant_user', function (Blueprint $table) {
            $table->string('rol', 30)->default('USUARIO')->change();
        });

        // Migrar roles antiguos a USUARIO
        DB::table('tenant_user')
            ->whereIn('rol', ['LIDER DE CAMPO', 'PROPIETARIO'])
            ->update(['rol' => 'USUARIO']);

        // Eliminar roles Spatie que ya no se usan
        DB::table('roles')
            ->whereIn('name', ['LIDER DE CAMPO', 'PROPIETARIO'])
            ->delete();

        // Limpiar asignaciones de roles eliminados en model_has_roles
        // (las FK con cascade deberían manejar esto, pero por seguridad)
        DB::table('model_has_roles')
            ->whereNotIn('role_id', DB::table('roles')->pluck('id'))
            ->delete();
    }

    public function down(): void
    {
        Schema::table('tenant_user', function (Blueprint $table) {
            $table->string('rol', 30)->default('PROPIETARIO')->change();
        });
    }
};
