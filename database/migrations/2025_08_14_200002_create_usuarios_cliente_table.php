<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios_cliente', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('users')->cascadeOnDelete();
            $table->string('nome');
            $table->string('email');
            $table->string('senha');
            $table->string('cargo')->default('usuario');
            $table->boolean('ativo')->default(true);
            $table->timestamp('ultimo_acesso')->nullable();
            $table->timestamps();

            $table->unique(['email', 'cliente_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios_cliente');
    }
};
