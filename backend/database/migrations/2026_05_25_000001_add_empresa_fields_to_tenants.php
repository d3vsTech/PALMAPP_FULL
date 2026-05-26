<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('actividad_economica', 200)->nullable()->after('razon_social');
            $table->string('telefono_fijo', 20)->nullable()->after('telefono');
            $table->string('sitio_web', 200)->nullable()->after('correo_contacto');
            $table->string('representante_nombre', 200)->nullable()->after('sitio_web');
            $table->string('representante_cedula', 20)->nullable()->after('representante_nombre');
            $table->string('representante_cargo', 100)->nullable()->after('representante_cedula');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'actividad_economica',
                'telefono_fijo',
                'sitio_web',
                'representante_nombre',
                'representante_cedula',
                'representante_cargo',
            ]);
        });
    }
};
