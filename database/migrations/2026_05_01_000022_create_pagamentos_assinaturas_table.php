<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagamentos_assinaturas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('plano_id')->nullable()->constrained('planos')->nullOnDelete();
            $table->decimal('valor', 10, 2);
            $table->string('moeda', 10)->default('BRL');
            $table->string('status', 30)->default('pago');
            $table->string('metodo_pagamento', 80)->nullable();
            $table->string('referencia_externa')->nullable();
            $table->timestamp('pago_em')->nullable();
            $table->timestamps();

            $table->index(['cliente_id', 'pago_em']);
            $table->index('status');
            $table->index('referencia_externa');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagamentos_assinaturas');
    }
};
