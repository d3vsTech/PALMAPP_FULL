<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agrega `datos_extraidos` (jsonb) a `viaje_documento_bascula` para
     * exponer al frontend los 10 campos normalizados que extrajo Claude
     * sin tener que reparsear el payload crudo de Anthropic en cada GET.
     *
     * El payload crudo sigue viviendo en `respuesta_claude` para auditoría;
     * esta columna es el subset normalizado y validado por el Service.
     */
    public function up(): void
    {
        Schema::table('viaje_documento_bascula', function (Blueprint $table) {
            $table->jsonb('datos_extraidos')->nullable()->after('respuesta_claude');
        });
    }

    public function down(): void
    {
        Schema::table('viaje_documento_bascula', function (Blueprint $table) {
            $table->dropColumn('datos_extraidos');
        });
    }
};
