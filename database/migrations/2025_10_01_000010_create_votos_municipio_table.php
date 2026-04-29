<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('votos_municipio', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidatura_id')->constrained('candidaturas')->cascadeOnDelete();
            $table->foreignId('municipio_id')->constrained('municipios')->cascadeOnDelete();
            $table->foreignId('eleicao_id')->constrained('eleicoes')->cascadeOnDelete();
            $table->integer('nr_turno')->default(1);
            $table->foreignId('cargo_id')->constrained('cargos')->cascadeOnDelete();
            $table->unsignedBigInteger('total_votos')->default(0);
            $table->unsignedBigInteger('total_aptos')->default(0);
            $table->unsignedBigInteger('total_comparecimento')->default(0);
            $table->unsignedBigInteger('total_abstencoes')->default(0);
            $table->unsignedInteger('total_secoes')->default(0);
            // Adicionar coluna para armazenar a situação do candidato neste turno
            $table->string('ds_sit_tot_turno', 100)->nullable();
            $table->timestamps();

            $table->unique(['candidatura_id', 'municipio_id']);
            $table->index('eleicao_id');
            $table->index('municipio_id');
            $table->index('cargo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('votos_municipio');
    }
};
