<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('importacoes', function (Blueprint $table) {
            $table->id();
            $table->string('arquivo_nome');
            $table->string('tipo', 40)->nullable();
            $table->string('status', 20)->default('processando');
            $table->unsignedInteger('total_linhas')->default(0);
            $table->unsignedInteger('importados')->default(0);
            $table->unsignedInteger('erros')->default(0);
            $table->text('mensagem_erro')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('importacoes');
    }
};
