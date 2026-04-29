<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Cria a tabela raw_secoes que é uma cópia bruta dos dados CSV
     * de VOTACAO_SECAO, antes de qualquer transformação.
     */
    public function up(): void
    {
        Schema::create('raw_secoes', function (Blueprint $table) {
            $table->id();

            // ═══════════════════════════════════════════════════════════════════
            // METADADOS DA IMPORTAÇÃO
            // ═══════════════════════════════════════════════════════════════════
            $table->unsignedBigInteger('importacao_id')->nullable();
            $table->integer('numero_linha')->nullable(); // Qual linha do CSV
            $table->enum('status', ['pendente', 'processado', 'erro'])->default('pendente');
            $table->json('erros')->nullable(); // Lista de erros se status='erro'

            // ═══════════════════════════════════════════════════════════════════
            // DADOS DE GERAÇÃO
            // ═══════════════════════════════════════════════════════════════════
            $table->date('DT_GERACAO')->nullable(); // Data da extração
            $table->time('HH_GERACAO')->nullable(); // Hora da extração

            // ═══════════════════════════════════════════════════════════════════
            // DADOS DA ELEIÇÃO
            // ═══════════════════════════════════════════════════════════════════
            $table->integer('ANO_ELEICAO')->nullable();
            $table->integer('CD_TIPO_ELEICAO'); // 1=Suplementar, 2=Ordinária, 3=Consulta
            $table->string('NM_TIPO_ELEICAO', 100);
            $table->integer('CD_PLEITO')->nullable(); // Código do pleito
            $table->date('DT_PLEITO')->nullable(); // Data do pleito
            $table->integer('NR_TURNO'); // Número do turno (1 ou 2)
            $table->integer('CD_ELEICAO'); // Código único da eleição
            $table->string('DS_ELEICAO', 255); // Descrição da eleição
            $table->date('DT_ELEICAO')->nullable(); // Data da eleição

            // ═══════════════════════════════════════════════════════════════════
            // ABRANGÊNCIA TERRITORIAL
            // ═══════════════════════════════════════════════════════════════════
            $table->string('TP_ABRANGENCIA', 20)->nullable(); // Municipal, Estadual, Federal
            $table->string('SG_UF', 2); // Sigla da UF
            $table->string('SG_UE', 10)->nullable(); // Sigla da Unidade Eleitoral
            $table->string('NM_UE', 100)->nullable(); // Nome da Unidade Eleitoral

            // ═══════════════════════════════════════════════════════════════════
            // LOCALIZAÇÃO: MUNICÍPIO
            // ═══════════════════════════════════════════════════════════════════
            $table->integer('CD_MUNICIPIO'); // Código TSE do município
            $table->string('NM_MUNICIPIO', 100); // Nome do município

            // ═══════════════════════════════════════════════════════════════════
            // LOCALIZAÇÃO: ZONA E SEÇÃO
            // ═══════════════════════════════════════════════════════════════════
            $table->integer('NR_ZONA'); // Número da zona
            $table->integer('NR_SECAO'); // Número da seção
            $table->integer('NR_LOCAL_VOTACAO'); // Número do local de votação
            $table->string('NM_LOCAL_VOTACAO', 150)->nullable(); // Nome do local de votação
            $table->string('DS_LOCAL_VOTACAO_ENDERECO', 255)->nullable(); // Endereço do local

            // ═══════════════════════════════════════════════════════════════════
            // DADOS DO CARGO/PERGUNTA
            // ═══════════════════════════════════════════════════════════════════
            $table->integer('CD_CARGO')->nullable(); // Código do cargo (layout resumido)
            $table->string('DS_CARGO', 100)->nullable(); // Descrição do cargo (layout resumido)
            $table->integer('CD_CARGO_PERGUNTA')->nullable(); // Código do cargo
            $table->string('DS_CARGO_PERGUNTA', 100)->nullable(); // Descrição do cargo
            $table->string('DS_CARGO_PERGUNTA_SECAO', 100)->nullable(); // Descrição no contexto da seção

            // ═══════════════════════════════════════════════════════════════════
            // DADOS DO VOTÁVEL (Candidato, Partido, Voto em branco, etc)
            // ═══════════════════════════════════════════════════════════════════
            $table->integer('NR_VOTAVEL')->nullable(); // Número do votável (candidato, partido, 95=branco, 96=nulo, 97=anulado)
            $table->string('NM_VOTAVEL', 255)->nullable(); // Nome do votável
            $table->integer('CD_TIPO_VOTAVEL')->nullable(); // Tipo de voto (1=Nominal, 2=Branco, 3=Nulo, 4=Legenda)
            $table->string('DS_TIPO_VOTAVEL', 50)->nullable(); // Descrição do tipo de voto
            $table->integer('NR_PARTIDO')->nullable(); // Número do partido
            $table->string('SG_PARTIDO', 50)->nullable(); // Sigla do partido
            $table->string('NM_PARTIDO', 100)->nullable(); // Nome do partido
            $table->string('SQ_CANDIDATO', 20)->nullable(); // Sequencial do candidato

            // ═══════════════════════════════════════════════════════════════════
            // DADOS DE VOTAÇÃO
            // ═══════════════════════════════════════════════════════════════════
            $table->integer('QT_VOTOS')->nullable(); // Quantidade de votos
            $table->integer('QT_VOTOS_NOMINAIS')->nullable();
            $table->integer('QT_VOTOS_BRANCOS')->nullable();
            $table->integer('QT_VOTOS_NULOS')->nullable();
            $table->integer('QT_VOTOS_LEGENDA')->nullable();
            $table->integer('QT_VOTOS_ANULADOS_APU_SEP')->nullable();

            // ═══════════════════════════════════════════════════════════════════
            // DADOS DE APURAÇÃO
            // ═══════════════════════════════════════════════════════════════════
            $table->integer('QT_APTOS'); // Quantidade de aptos
            $table->integer('QT_COMPARECIMENTO'); // Quantidade de comparecimento
            $table->integer('QT_ABSTENCOES'); // Quantidade de abstenções
            $table->integer('CD_TIPO_URNA')->nullable(); // Código do tipo de urna
            $table->string('DS_TIPO_URNA', 50)->nullable(); // Descrição do tipo de urna

            // ═══════════════════════════════════════════════════════════════════
            // DADOS TÉCNICOS DA URNA
            // ═══════════════════════════════════════════════════════════════════
            $table->integer('NR_URNA_EFETIVADA')->nullable(); // Número da urna
            $table->string('CD_CARGA_1_URNA_EFETIVADA', 50)->nullable(); // Carga 1
            $table->string('CD_CARGA_2_URNA_EFETIVADA', 50)->nullable(); // Carga 2
            $table->string('CD_FLASHCARD_URNA_EFETIVADA', 50)->nullable(); // Flashcard
            $table->dateTime('DT_CARGA_URNA_EFETIVADA')->nullable(); // Data/hora da carga

            // ═══════════════════════════════════════════════════════════════════
            // OUTROS DADOS
            // ═══════════════════════════════════════════════════════════════════
            $table->string('DS_SECOES_AGREGADAS', 255)->nullable(); // Seções agregadas
            $table->dateTime('DT_ABERTURA')->nullable(); // Data/hora da abertura
            $table->dateTime('DT_ENCERRAMENTO')->nullable(); // Data/hora do encerramento
            $table->integer('QT_ELEI_BIOM_SEM_HABILITACAO')->nullable(); // Eleitores biométricos sem habilitação
            $table->dateTime('DT_EMISSAO_BU')->nullable(); // Data/hora da emissão do BU
            $table->dateTime('DT_BU_RECEBIDO')->nullable(); // Data/hora do recebimento do BU
            $table->dateTime('DT_RECEBIMENTO_BU_HOR_TSE')->nullable(); // Data/hora de recebimento do BU no TSE
            $table->dateTime('DT_PRIM_TOT_PARCIAL_HOR_TSE')->nullable(); // Data/hora da primeira totalização parcial no TSE
            $table->integer('NR_JUNTA_APURADORA')->nullable(); // Número da junta apuradora
            $table->integer('NR_TURMA_APURADORA')->nullable(); // Número da turma apuradora
            $table->string('DS_ORIGEM_VOTO', 50)->nullable();
            $table->string('ST_SECAO_INSTALADA', 5)->nullable();
            $table->string('ST_SECAO_ANULADA', 5)->nullable();
            $table->integer('CD_MODELO_URNA')->nullable();
            $table->string('DS_MODELO_URNA', 100)->nullable();

            // ═══════════════════════════════════════════════════════════════════
            // TIMESTAMPS
            // ═══════════════════════════════════════════════════════════════════
            $table->timestamps();

            // ═══════════════════════════════════════════════════════════════════
            // ÍNDICES
            // ═══════════════════════════════════════════════════════════════════
            $table->index('importacao_id');
            $table->index('status');
            $table->index('numero_linha');
            $table->index(['CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO']);
            $table->index(['ANO_ELEICAO', 'CD_ELEICAO']);
            $table->index('SQ_CANDIDATO');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('raw_secoes');
    }
};
