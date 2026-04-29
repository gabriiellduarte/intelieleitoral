<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tabelas = [
        'eleicoes',
        'cargos',
        'partidos',
        'pessoas',
        'municipios',
        'candidaturas',
        'zonas_eleitorais',
        'secoes',
        'votos_municipio',
        'votos_zona',
        'votos',
    ];

    public function up(): void
    {
        foreach ($this->tabelas as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->foreignId('importacao_id')
                    ->nullable()
                    ->constrained('importacoes')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tabelas as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->dropConstrainedForeignId('importacao_id');
            });
        }
    }
};
