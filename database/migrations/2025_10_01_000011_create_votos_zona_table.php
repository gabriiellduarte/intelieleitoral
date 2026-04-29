<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('votos_zona', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidatura_id')->constrained('candidaturas')->cascadeOnDelete();
            $table->foreignId('zona_id')->constrained('zonas_eleitorais')->cascadeOnDelete();
            $table->foreignId('eleicao_id')->constrained('eleicoes')->cascadeOnDelete();
            $table->integer('nr_turno')->default(1);
            $table->foreignId('cargo_id')->constrained('cargos')->cascadeOnDelete();
            $table->unsignedBigInteger('total_votos')->default(0);
            // votos_nominais_validos: preenchido pelo arquivo base (candidato_munzona)
            $table->unsignedBigInteger('votos_nominais_validos')->nullable();
            $table->unsignedBigInteger('total_aptos')->default(0);
            $table->unsignedInteger('total_secoes')->default(0);
            // fonte: 'base' = veio do arquivo candidato_munzona (total oficial do TSE)
            //        'agregado' = calculado somando as seções importadas
            $table->string('fonte', 20)->default('agregado');
            
            $table->string('ds_sit_tot_turno', 100)->nullable();
            $table->timestamps();

            $table->unique(['candidatura_id', 'zona_id']);
            $table->index('eleicao_id');
            $table->index('zona_id');
            $table->index('cargo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('votos_zona');
    }
};
