<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Agregar campos multi-tenant a users
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_super_admin')->default(false)->after('password');
            $table->boolean('status')->default(true)->after('is_super_admin');
        });

        // Pivot usuarios ↔ tenants
        Schema::create('tenant_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('rol', 30)->default('PROPIETARIO');
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'user_id']);
            $table->index(['user_id', 'estado']);
        });

        // Auditorías
        Schema::create('auditorias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('usuario', 40);
            $table->string('correo', 60);
            $table->string('accion', 50)->index();
            $table->string('modulo', 50)->nullable()->index();
            $table->string('observaciones', 900);
            $table->string('direccion_ip', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->jsonb('datos_anteriores')->nullable();
            $table->jsonb('datos_nuevos')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditorias');
        Schema::dropIfExists('tenant_user');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_super_admin', 'status']);
        });
    }
};
