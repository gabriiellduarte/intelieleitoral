<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidaturas', function (Blueprint $table) {
            $table->id();
            // sq_candidato: código sequencial único do TSE por eleição — chave de cruzamento
            // entre o arquivo base (candidato_munzona) e o arquivo de seções
            $table->string('sq_candidato', 30)->nullable();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->foreignId('eleicao_id')->constrained('eleicoes')->cascadeOnDelete();
            $table->foreignId('cargo_id')->constrained('cargos')->cascadeOnDelete();
            $table->foreignId('partido_id')->constrained('partidos')->cascadeOnDelete();
            $table->string('numero', 10)->nullable();
            $table->string('situacao', 80)->nullable();
            $table->string('nome_urna')->nullable();
            $table->string('numero_processo', 30)->nullable();
            $table->timestamps();

            $table->unique(['pessoa_id', 'eleicao_id', 'cargo_id']);
            $table->index(['sq_candidato', 'eleicao_id'], 'candidaturas_sq_eleicao_idx');
            $table->index('eleicao_id');
            $table->index('cargo_id');
            $table->index('partido_id');
            $table->index('numero');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidaturas');
    }
};
