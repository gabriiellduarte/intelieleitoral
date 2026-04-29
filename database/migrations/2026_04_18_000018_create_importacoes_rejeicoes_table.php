<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('importacoes_rejeicoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('importacao_id')->constrained('importacoes')->cascadeOnDelete();
            $table->string('tipo_arquivo', 50);
            $table->unsignedBigInteger('numero_linha')->nullable();
            $table->string('motivo', 255);
            $table->text('erro_detalhado')->nullable();
            $table->longText('dados_linha')->nullable();
            $table->timestamps();

            $table->index('importacao_id');
            $table->index('tipo_arquivo');
            $table->index('numero_linha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('importacoes_rejeicoes');
    }
};
