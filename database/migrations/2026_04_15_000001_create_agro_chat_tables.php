<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agro_chat_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('titulo', 200)->default('');
            $table->timestampsTz();

            $table->index(['user_id', 'tenant_id', 'updated_at'], 'idx_agro_chat_sessions_user_tenant');
        });

        Schema::create('agro_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('agro_chat_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('role', 20); // 'user' | 'assistant' | 'system' | 'tool'
            $table->text('content');
            $table->jsonb('tool_calls')->nullable();
            $table->integer('tokens_in')->nullable();
            $table->integer('tokens_out')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['session_id', 'created_at'], 'idx_agro_chat_messages_session');
            $table->index(['user_id', 'created_at'], 'idx_agro_chat_messages_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agro_chat_messages');
        Schema::dropIfExists('agro_chat_sessions');
    }
};
