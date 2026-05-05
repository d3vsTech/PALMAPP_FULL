<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabla de documentos de báscula adjuntos a un viaje. Cada fila representa
     * una foto o PDF de un ticket/remisión de báscula cuyo peso neto se
     * extrae vía Claude Vision y se usa para hidratar `viajes.peso_viaje`
     * y avanzar la máquina de estados (EN_CAMINO → EN_PLANTA → FINALIZADO).
     */
    public function up(): void
    {
        Schema::create('viaje_documento_bascula', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('viaje_id')->constrained('viajes')->restrictOnDelete();

            $table->string('archivo_path', 500);
            $table->string('archivo_nombre_original', 255);
            $table->string('mime_type', 50);
            $table->integer('archivo_tamano');

            $table->string('estado_ocr', 20)->default('PENDIENTE');
            $table->decimal('peso_extraido', 10, 2)->nullable();
            $table->decimal('confianza', 4, 3)->nullable();
            $table->string('modelo_usado', 50)->nullable();
            $table->jsonb('respuesta_claude')->nullable();
            $table->text('error_mensaje')->nullable();
            $table->smallInteger('intentos')->default(0);
            $table->timestamp('procesado_at')->nullable();

            $table->foreignId('creado_por')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['tenant_id', 'viaje_id']);
            $table->index(['tenant_id', 'estado_ocr']);
        });

        DB::statement("ALTER TABLE viaje_documento_bascula ADD CONSTRAINT viaje_documento_bascula_estado_ocr_check CHECK (estado_ocr IN (
            'PENDIENTE',
            'PROCESANDO',
            'COMPLETADO',
            'REVISION_MANUAL',
            'FALLIDO'
        ))");
    }

    public function down(): void
    {
        Schema::dropIfExists('viaje_documento_bascula');
    }
};
