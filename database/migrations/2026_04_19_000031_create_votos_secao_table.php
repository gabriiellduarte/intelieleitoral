<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Cria a tabela votos_secao que armazena dados de votação por seção
     */
    public function up(): void
    {
        Schema::create('votos_secao', function (Blueprint $table) {
            $table->id();

            // ═══════════════════════════════════════════════════════════════════
            // CHAVES ESTRANGEIRAS
            // ═══════════════════════════════════════════════════════════════════
            $table->unsignedBigInteger('eleicao_id');
            $table->unsignedBigInteger('municipio_id');
            $table->unsignedBigInteger('zona_id');
            $table->unsignedBigInteger('cargo_id');
            $table->unsignedBigInteger('candidatura_id')->nullable(); // Null para votos em branco/nulo
            $table->unsignedBigInteger('partido_id')->nullable(); // Se houver voto em legenda
            $table->unsignedBigInteger('local_votacao_id')->nullable(); // Local de votação

            // ═══════════════════════════════════════════════════════════════════
            // DADOS DA SEÇÃO
            // ═══════════════════════════════════════════════════════════════════
            $table->integer('secao_numero'); // Número da seção
            $table->integer('nr_turno')->default(1); // Turno (1 ou 2)
            $table->integer('nr_votavel'); // Número do votável (candidato, partido, 95=branco, 96=nulo, 97=anulado)

            // ═══════════════════════════════════════════════════════════════════
            // DADOS DO VOTO
            // ═══════════════════════════════════════════════════════════════════
            $table->string('tipo_votavel', 50)->nullable(); // Nominal, Branco, Nulo, Legenda
            $table->string('nome_votavel', 255)->nullable(); // Nome do votável
            $table->integer('quantidade_votos')->default(0); // Quantidade de votos

            // ═══════════════════════════════════════════════════════════════════
            // DADOS DE APURAÇÃO DA SEÇÃO
            // ═══════════════════════════════════════════════════════════════════
            $table->integer('aptos')->default(0); // Quantidade de aptos
            $table->integer('comparecimento')->default(0); // Quantidade de comparecimento
            $table->integer('abstencoes')->default(0); // Quantidade de abstenções

            // ═══════════════════════════════════════════════════════════════════
            // RASTREABILIDADE
            // ═══════════════════════════════════════════════════════════════════
            $table->unsignedBigInteger('importacao_id')->nullable();
            $table->string('fonte', 50)->default('base'); // base, correcao, etc

            // ═══════════════════════════════════════════════════════════════════
            // TIMESTAMPS
            // ═══════════════════════════════════════════════════════════════════
            $table->timestamps();

            // ═══════════════════════════════════════════════════════════════════
            // CHAVES ESTRANGEIRAS E ÍNDICES
            // ═══════════════════════════════════════════════════════════════════
            $table->foreign('eleicao_id')->references('id')->on('eleicoes');
            $table->foreign('municipio_id')->references('id')->on('municipios');
            $table->foreign('zona_id')->references('id')->on('zonas_eleitorais');
            $table->foreign('cargo_id')->references('id')->on('cargos');
            $table->foreign('candidatura_id')->references('id')->on('candidaturas')->nullable();
            $table->foreign('partido_id')->references('id')->on('partidos')->nullable();
            $table->foreign('local_votacao_id')->references('id')->on('locais_votacao')->nullable();
            $table->foreign('importacao_id')->references('id')->on('importacoes')->nullable();

            // ═══════════════════════════════════════════════════════════════════
            // ÍNDICES PARA PERFORMANCE
            // ═══════════════════════════════════════════════════════════════════
            $table->index('eleicao_id');
            $table->index('municipio_id');
            $table->index('zona_id');
            $table->index('secao_numero');
            $table->index('cargo_id');
            $table->index('candidatura_id');
            $table->index('partido_id');
            $table->index('nr_votavel');
            $table->index('importacao_id');

            // Índice único: Um registro por eleicao + municipio + zona + seção + cargo + votável
            $table->unique([
                'eleicao_id',
                'municipio_id',
                'zona_id',
                'secao_numero',
                'cargo_id',
                'nr_votavel',
            ], 'votos_secao_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('votos_secao');
    }
};
