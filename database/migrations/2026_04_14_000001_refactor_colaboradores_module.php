<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── 1. AGREGAR NUEVAS COLUMNAS A EMPLEADOS ───
        Schema::table('empleados', function (Blueprint $table) {
            $table->string('segundo_nombre', 50)->nullable()->after('nombres');
            $table->string('segundo_apellido', 50)->nullable()->after('apellidos');

            // Cargo directo (temporalmente nullable para data migration)
            $table->string('cargo', 100)->nullable()->after('lugar_expedicion');
            $table->decimal('salario_base', 12, 2)->nullable()->after('cargo');
            $table->enum('modalidad_pago', ['FIJO', 'PRODUCCION'])->nullable()->after('salario_base');

            // Predio asignado
            $table->foreignId('predio_id')->nullable()->after('modalidad_pago')
                ->constrained('predios')->nullOnDelete();
        });

        // ─── 2. RENOMBRAR COLUMNAS DE NOMBRE ───
        Schema::table('empleados', function (Blueprint $table) {
            $table->renameColumn('nombres', 'primer_nombre');
        });

        Schema::table('empleados', function (Blueprint $table) {
            $table->renameColumn('apellidos', 'primer_apellido');
        });

        // ─── 3. DATA MIGRATION: POBLAR NUEVOS CAMPOS DESDE CARGOS ───
        DB::statement("
            UPDATE empleados
            SET cargo = c.nombre,
                salario_base = COALESCE(c.salario, 0),
                modalidad_pago = CASE WHEN c.salario_tipo = 'VARIABLE' THEN 'PRODUCCION' ELSE 'FIJO' END
            FROM cargos c
            WHERE empleados.cargo_id = c.id
        ");

        // Fallback para empleados sin cargo válido
        DB::statement("
            UPDATE empleados
            SET cargo = 'Sin cargo', salario_base = 0, modalidad_pago = 'FIJO'
            WHERE cargo IS NULL
        ");

        // Llenar fecha_expedicion_documento nulas
        DB::statement("
            UPDATE empleados
            SET fecha_expedicion_documento = fecha_nacimiento
            WHERE fecha_expedicion_documento IS NULL
        ");

        // ─── 4. HACER COLUMNAS NOT NULL, AJUSTAR TAMAÑOS, QUITAR CARGO_ID ───
        Schema::table('empleados', function (Blueprint $table) {
            $table->string('cargo', 100)->nullable(false)->change();
            $table->decimal('salario_base', 12, 2)->nullable(false)->change();
            $table->date('fecha_expedicion_documento')->nullable(false)->change();
            $table->string('primer_nombre', 50)->change();
            $table->string('primer_apellido', 50)->change();
        });

        // Enum no soporta ->change() en Laravel, usar ALTER directo
        DB::statement('ALTER TABLE empleados ALTER COLUMN modalidad_pago SET NOT NULL');

        Schema::table('empleados', function (Blueprint $table) {
            $table->dropForeign(['cargo_id']);
            $table->dropIndex('empleados_tenant_id_cargo_id_index');
            $table->dropColumn('cargo_id');

            $table->index(['tenant_id', 'modalidad_pago']);
            $table->index(['tenant_id', 'predio_id']);
        });

        // ─── 5. SIMPLIFICAR EMPLEADO_CONTRATOS ───
        Schema::table('empleado_contratos', function (Blueprint $table) {
            $table->dropForeign(['modalidad_id']);
            $table->dropColumn('modalidad_id');
            $table->dropForeign(['cargo_id']);
            $table->dropColumn('cargo_id');
        });

        // ─── 6. DATA MIGRATION: ACTUALIZAR DOCUMENTOS EXISTENTES ───
        DB::table('empleado_documentos')->where('tipo_documento', 'CEDULA')
            ->update(['tipo_documento' => 'DOCUMENTO_DE_IDENTIDAD']);

        DB::table('empleado_documentos')->where('tipo_documento', 'AUTORIZACION_DATOS')
            ->update(['tipo_documento' => 'AUTORIZACION_DATOS_PERSONALES']);

        DB::table('empleado_documentos')->where('tipo_documento', 'FICHA_INGRESO')
            ->update(['categoria' => 'OTROS']);

        DB::table('empleado_documentos')
            ->where('categoria', 'SST')
            ->whereNotIn('tipo_documento', ['EXAMEN_DE_INGRESO'])
            ->update(['categoria' => 'OTROS']);

        DB::table('empleado_documentos')
            ->where('tipo_documento', 'EXAMEN_INGRESO')
            ->update(['tipo_documento' => 'EXAMEN_DE_INGRESO']);

        DB::table('empleado_documentos')
            ->where('categoria', 'FINALIZACION_CONTRATO')
            ->update(['tipo_documento' => 'FINALIZACION_CONTRATO']);

        DB::table('empleado_documentos')
            ->where('categoria', 'DESPRENDIBLES')
            ->update(['tipo_documento' => 'DESPRENDIBLES']);
    }

    public function down(): void
    {
        // ─── REVERTIR EMPLEADO_CONTRATOS ───
        Schema::table('empleado_contratos', function (Blueprint $table) {
            $table->foreignId('modalidad_id')->nullable()->after('empleado_id')
                ->constrained('modalidad_contrato');
            $table->foreignId('cargo_id')->nullable()->after('modalidad_id')
                ->constrained('cargos');
        });

        // ─── REVERTIR EMPLEADOS ───
        Schema::table('empleados', function (Blueprint $table) {
            $table->foreignId('cargo_id')->nullable()->after('tenant_id')
                ->constrained('cargos');
        });

        Schema::table('empleados', function (Blueprint $table) {
            $table->dropIndex('empleados_tenant_id_modalidad_pago_index');
            $table->dropIndex('empleados_tenant_id_predio_id_index');
            $table->dropForeign(['predio_id']);
            $table->dropColumn([
                'segundo_nombre', 'segundo_apellido',
                'cargo', 'salario_base', 'modalidad_pago', 'predio_id',
            ]);
        });

        Schema::table('empleados', function (Blueprint $table) {
            $table->renameColumn('primer_nombre', 'nombres');
        });

        Schema::table('empleados', function (Blueprint $table) {
            $table->renameColumn('primer_apellido', 'apellidos');
        });

        Schema::table('empleados', function (Blueprint $table) {
            $table->string('nombres', 100)->change();
            $table->string('apellidos', 100)->change();
            $table->date('fecha_expedicion_documento')->nullable()->change();
            $table->index(['tenant_id', 'cargo_id']);
        });
    }
};
