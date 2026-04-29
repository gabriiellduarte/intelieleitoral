<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('votos', function (Blueprint $table) {
            $table->id();
            // candidatura_id é nullable: votos especiais (branco, nulo, legenda)
            // não têm candidato vinculado mas precisam ser armazenados
            $table->foreignId('candidatura_id')->nullable()->constrained('candidaturas')->cascadeOnDelete();
            // nr_votavel: número do votável vindo do arquivo de seções
            //   - candidatos nominais: número do candidato (ex: "13", "22")
            //   - branco: "95" | nulo: "96" | legenda: número do partido
            $table->string('nr_votavel', 20)->nullable();
            // nm_votavel: nome legível — útil para votos especiais onde não há candidatura
            $table->string('nm_votavel', 200)->nullable();
            // tipo_voto: 'nominal' = vinculado a candidatura | 'especial' = branco/nulo/legenda
            $table->string('tipo_voto', 20)->default('nominal');
            $table->foreignId('secao_id')->constrained('secoes')->cascadeOnDelete();
            $table->foreignId('zona_id')->constrained('zonas_eleitorais')->cascadeOnDelete();
            $table->foreignId('municipio_id')->constrained('municipios')->cascadeOnDelete();
            $table->foreignId('eleicao_id')->constrained('eleicoes')->cascadeOnDelete();
            $table->foreignId('cargo_id')->nullable()->constrained('cargos')->cascadeOnDelete();
            $table->unsignedBigInteger('votos')->default(0);
            $table->unsignedBigInteger('aptos')->default(0);
            $table->unsignedBigInteger('comparecimento')->default(0);
            $table->unsignedBigInteger('abstencoes')->default(0);
            $table->timestamps();

            // Chave única: (nr_votavel, secao_id) — cobre candidatos nominais e votos especiais
            $table->unique(['nr_votavel', 'secao_id','eleicao_id','cargo_id'], 'votos_nr_votavel_secao_unique');
            $table->index('eleicao_id');
            $table->index('municipio_id');
            $table->index('zona_id');
            $table->index('secao_id');
            $table->index('candidatura_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('votos');
    }
};
