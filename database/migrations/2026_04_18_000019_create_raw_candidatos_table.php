<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Esta tabela espelha EXATAMENTE as colunas do CSV
     * "votacao_candidato_munzona_2024_RR.csv"
     *
     * Cada linha do CSV = uma linha nesta tabela
     * Nenhuma transformação, apenas dados brutos
     */
    public function up(): void
    {
        Schema::create('raw_candidatos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('importacao_id')->constrained('importacoes')->cascadeOnDelete();

            // ═══════════════════════════════════════════════════════════════
            // METADADOS DE GERAÇÃO DO ARQUIVO (do TSE)
            // ═══════════════════════════════════════════════════════════════
            $table->date('DT_GERACAO')->nullable();                // Data da extração
            $table->time('HH_GERACAO')->nullable();                // Hora da extração

            // ═══════════════════════════════════════════════════════════════
            // IDENTIFICAÇÃO DA ELEIÇÃO
            // ═══════════════════════════════════════════════════════════════
            $table->integer('ANO_ELEICAO')->nullable();            // Ano da eleição (2024)
            $table->integer('CD_TIPO_ELEICAO')->nullable();        // 1=Suplementar, 2=Ordinária, 3=Consulta
            $table->string('NM_TIPO_ELEICAO', 100)->nullable();    // "Eleição Ordinária"
            $table->integer('NR_TURNO')->nullable();               // 1º ou 2º turno
            $table->integer('CD_ELEICAO')->nullable();             // Código TSE da eleição
            $table->string('DS_ELEICAO', 255)->nullable();         // "ELEIÇÕES MUNICIPAIS 2024"
            $table->date('DT_ELEICAO')->nullable();                // Data da eleição (06/10/2024)

            // ═══════════════════════════════════════════════════════════════
            // ABRANGÊNCIA GEOGRÁFICA
            // ═══════════════════════════════════════════════════════════════
            $table->string('TP_ABRANGENCIA', 5)->nullable();       // "M"=Municipal
            $table->string('SG_UF', 2)->nullable();                // "RR" (Roraima), "BR"=Nacional, "VT"=Trânsito
            $table->string('SG_UE', 10)->nullable();               // "03018" código do UE (unidade eleitoral)
            $table->string('NM_UE', 100)->nullable();              // "BOA VISTA"
            $table->integer('CD_MUNICIPIO')->nullable();           // 3018 (código TSE do município)
            $table->string('NM_MUNICIPIO', 100)->nullable();       // "BOA VISTA"
            $table->string('NR_ZONA', 10)->nullable();             // Zona eleitoral (1, 5, etc)

            // ═══════════════════════════════════════════════════════════════
            // IDENTIFICAÇÃO DO CARGO
            // ═══════════════════════════════════════════════════════════════
            $table->integer('CD_CARGO')->nullable();               // 13=Vereador
            $table->string('DS_CARGO', 100)->nullable();           // "Vereador"

            // ═══════════════════════════════════════════════════════════════
            // IDENTIFICAÇÃO DO CANDIDATO
            // ═══════════════════════════════════════════════════════════════
            $table->string('SQ_CANDIDATO', 30)->nullable();        // 230002186566 - sequencial único TSE
            $table->integer('NR_CANDIDATO')->nullable();           // 12444 - número da urna
            $table->string('NM_CANDIDATO', 255)->nullable();       // Nome completo
            $table->string('NM_URNA_CANDIDATO', 255)->nullable();  // Nome na urna
            $table->string('NM_SOCIAL_CANDIDATO', 255)->nullable(); // Nome social (se houver)

            // ═══════════════════════════════════════════════════════════════
            // SITUAÇÃO DO REGISTRO (até 2022)
            // ═══════════════════════════════════════════════════════════════
            $table->integer('CD_SITUACAO_CANDIDATURA')->nullable();      // Código da situação
            $table->string('DS_SITUACAO_CANDIDATURA', 100)->nullable();  // Descrição da situação
            $table->integer('CD_DETALHE_SITUACAO_CAND')->nullable();     // Código detalhe
            $table->string('DS_DETALHE_SITUACAO_CAND', 100)->nullable(); // Descrição detalhe

            // ═══════════════════════════════════════════════════════════════
            // SITUAÇÃO DO JULGAMENTO (a partir de 2024) ⭐
            // ═══════════════════════════════════════════════════════════════
            $table->integer('CD_SITUACAO_JULGAMENTO')->nullable();       // Código julgamento
            $table->string('DS_SITUACAO_JULGAMENTO', 100)->nullable();   // Descrição julgamento

            // ═══════════════════════════════════════════════════════════════
            // SITUAÇÃO DE CASSAÇÃO (a partir de 2024)
            // ═══════════════════════════════════════════════════════════════
            $table->integer('CD_SITUACAO_CASSACAO')->nullable();         // Código cassação
            $table->string('DS_SITUACAO_CASSACAO', 100)->nullable();     // Descrição cassação

            // ═══════════════════════════════════════════════════════════════
            // SITUAÇÃO DE DESCONSTITUIÇÃO DO DIPLOMA (a partir de 2024)
            // ═══════════════════════════════════════════════════════════════
            $table->integer('CD_SITUACAO_DCONST_DIPLOMA')->nullable();   // Código desconstituição
            $table->string('DS_SITUACAO_DCONST_DIPLOMA', 100)->nullable(); // Descrição desconstituição

            // ═══════════════════════════════════════════════════════════════
            // IDENTIFICAÇÃO DO PARTIDO / AGREMIAÇÃO
            // ═══════════════════════════════════════════════════════════════
            $table->string('TP_AGREMIACAO', 50)->nullable();             // "PARTIDO ISOLADO", "COLIGAÇÃO", "FEDERAÇÃO"
            $table->integer('NR_PARTIDO')->nullable();                   // 12 (número do partido)
            $table->string('SG_PARTIDO', 50)->nullable();                // "PDT"
            $table->string('NM_PARTIDO', 255)->nullable();               // "Partido Democrático Trabalhista"

            // Federação (se for o caso)
            $table->integer('NR_FEDERACAO')->nullable();                 // Número da federação
            $table->string('NM_FEDERACAO', 255)->nullable();             // Nome da federação
            $table->string('SG_FEDERACAO', 20)->nullable();              // Sigla da federação
            $table->text('DS_COMPOSICAO_FEDERACAO')->nullable();         // Composição (ex: PT/PC do B)

            // Coligação (se for o caso)
            $table->string('SQ_COLIGACAO', 30)->nullable();              // Sequencial da coligação
            $table->string('NM_COLIGACAO', 255)->nullable();             // Nome da coligação
            $table->text('DS_COMPOSICAO_COLIGACAO')->nullable();         // Composição (ex: PT,PC do B)

            // ═══════════════════════════════════════════════════════════════
            // RESULTADOS ELEITORAIS
            // ═══════════════════════════════════════════════════════════════
            $table->string('ST_VOTO_EM_TRANSITO')->nullable();          // S/N - voto em trânsito
            $table->integer('QT_VOTOS_NOMINAIS')->nullable();            // Total de votos
            $table->string('NM_TIPO_DESTINACAO_VOTOS', 100)->nullable();  // "Válido", "Anulado", etc
            $table->integer('QT_VOTOS_NOMINAIS_VALIDOS')->nullable();    // Votos válidos

            // ═══════════════════════════════════════════════════════════════
            // ⭐ SITUAÇÃO FINAL DO CANDIDATO NO TURNO (resposta da sua dúvida)
            // ═══════════════════════════════════════════════════════════════
            $table->integer('CD_SIT_TOT_TURNO')->nullable();             // Código: "5" para SUPLENTE
            $table->string('DS_SIT_TOT_TURNO', 100)->nullable();         // Descrição: "SUPLENTE", "NÃO ELEITO", "ELEITO", "SEGUNDO TURNO", etc

            // ═══════════════════════════════════════════════════════════════
            // METADADOS DE PROCESSAMENTO
            // ═══════════════════════════════════════════════════════════════
            $table->integer('numero_linha')->nullable();                 // Linha no CSV (para rastreamento)
            $table->enum('status', ['pendente', 'processado', 'erro'])->default('pendente');
            $table->json('erros')->nullable();                           // Erros encontrados ao processar

            $table->timestamps();

            // ÍNDICES PARA PERFORMANCE
            $table->index(['importacao_id', 'status']);
            $table->index('SQ_CANDIDATO');                               // Busca rápida por candidato
            $table->index(['ANO_ELEICAO', 'SG_UF', 'NR_TURNO']);         // Filtros comuns
            $table->index('CD_MUNICIPIO');                               // Filtro geográfico
            $table->index('NR_ZONA');                                    // Filtro por zona
            $table->index('numero_linha');                               // Rastreamento
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('raw_candidatos');
    }
};
