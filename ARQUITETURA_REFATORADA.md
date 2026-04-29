# 🏗️ Arquitetura Refatorada com Tabela Matriz

## 📍 Resposta: O que é DS_SIT_TOT_TURNO?

A coluna **DS_SIT_TOT_TURNO** que você perguntou antes:
- **Descrição da situação de totalização da candidata ou candidato no turno**
- Indica o **resultado final** do candidato naquele turno específico
- Exemplos: "ELEITO", "NÃO ELEITO", "SEGUNDO TURNO", "SUPLENTE" (como visto nos dados)

Agora faz sentido que tenha "segundo turno" e "não eleito" — são resultados diferentes em turnos/contextos diferentes!

---

## 🗂️ PROPOSTA: Tabela Matriz para Raw_Candidatos

### Migração para Tabela Matriz

**ANTES**: CSV direto → Processamento inline → Tabelas finais (perdendo rastreabilidade)

**DEPOIS**: CSV → `raw_candidatos` (cópia exata) → Validação → Processamento → Tabelas finais

### Migration: raw_candidatos_2024_table.php

```php
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
            $table->string('SG_PARTIDO', 10)->nullable();                // "PDT"
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
            $table->boolean('ST_VOTO_EM_TRANSITO')->nullable();          // S/N - voto em trânsito
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
```

---

## 🔄 Fluxo de 3 Etapas

### Etapa 1️⃣: CSV → raw_candidatos (Cópia Bruta)
```php
/**
 * Copia EXATAMENTE do CSV, nenhuma transformação
 * Rápido: ~100MB em 2-3 segundos
 */
public function importarParaMatriz(UploadedFile $arquivo, int $importacaoId): array
{
    $handle = fopen($arquivo->getRealPath(), 'r');
    $header = fgetcsv($handle, 0, ';'); // Detecta separador
    
    $totalLinhas = 0;
    $lote = [];
    
    while (($row = fgetcsv($handle, 0, ';')) !== false) {
        $totalLinhas++;
        $dados = $this->mapearLinha($header, $row);
        
        $lote[] = array_merge($dados, [
            'importacao_id' => $importacaoId,
            'numero_linha'  => $totalLinhas,
            'status'        => 'pendente',
        ]);
        
        if (count($lote) >= 10000) {
            DB::table('raw_candidatos')->insert($lote);
            $lote = [];
        }
    }
    
    if (!empty($lote)) {
        DB::table('raw_candidatos')->insert($lote);
    }
    
    return ['total_linhas' => $totalLinhas];
}
```

### Etapa 2️⃣: Validação da Matriz
```php
/**
 * Valida campos obrigatórios + tipos de dados
 * Marca erros sem bloquear importação
 */
public function validarMatriz(int $importacaoId): array
{
    $registros = DB::table('raw_candidatos')
        ->where('importacao_id', $importacaoId)
        ->where('status', 'pendente')
        ->get();
    
    foreach ($registros as $linha) {
        $erros = [];
        
        // Validações essenciais
        if (empty($linha->SQ_CANDIDATO) && empty($linha->NR_CANDIDATO)) {
            $erros[] = 'SQ_CANDIDATO ou NR_CANDIDATO obrigatório';
        }
        
        if (empty($linha->ANO_ELEICAO)) {
            $erros[] = 'ANO_ELEICAO obrigatório';
        }
        
        if (empty($linha->CD_MUNICIPIO)) {
            $erros[] = 'CD_MUNICIPIO obrigatório';
        }
        
        // Se houver erros, marca mas não bloqueia
        if (!empty($erros)) {
            DB::table('raw_candidatos')
                ->where('id', $linha->id)
                ->update([
                    'status' => 'erro',
                    'erros'  => json_encode($erros),
                ]);
        }
    }
}
```

### Etapa 3️⃣: raw_candidatos → Tabelas Finais
```php
/**
 * Transforma dados brutos em estrutura normalizada
 * Cria: pessoas, candidaturas, votos_zona, votos_municipio
 */
public function processarMatriz(int $importacaoId): array
{
    $cache = ['eleicao' => [], 'pessoa' => [], 'candidatura' => [], /* ... */];
    $processados = 0;
    $falhas = 0;
    
    // Processa apenas registros com status = 'pendente'
    $registros = DB::table('raw_candidatos')
        ->where('importacao_id', $importacaoId)
        ->where('status', 'pendente')
        ->get();
    
    foreach ($registros as $raw) {
        try {
            // 1. Resolver/criar entidades
            $eleicaoId = $this->resolverEleicao(
                $raw->ANO_ELEICAO,
                $raw->NM_TIPO_ELEICAO,
                $raw->DS_ELEICAO,
                $raw->NR_TURNO,
                $raw->SG_UF,
                $cache,
                $importacaoId
            );
            
            $municipioId = $this->resolverMunicipio(
                $raw->CD_MUNICIPIO,
                $raw->NM_MUNICIPIO,
                $raw->SG_UF,
                $cache,
                $importacaoId
            );
            
            $pessoaId = $this->resolverPessoa(
                $raw->SQ_CANDIDATO,
                $raw->NM_CANDIDATO,
                $raw->NM_URNA_CANDIDATO,
                $raw->NM_SOCIAL_CANDIDATO,
                $cache,
                $importacaoId
            );
            
            $candidaturaId = $this->resolverCandidatura(
                $raw->SQ_CANDIDATO,
                $pessoaId,
                $eleicaoId,
                $raw->CD_CARGO,
                $raw->NR_PARTIDO,
                $raw->NR_CANDIDATO,
                $raw->DS_SIT_TOT_TURNO, // ⭐ Aqui você tem a situação!
                $cache,
                $importacaoId
            );
            
            // 2. Criar votos_zona (agregado por zona)
            DB::table('votos_zona')->updateOrInsert(
                [
                    'candidatura_id' => $candidaturaId,
                    'zona_id'        => $zonaId,
                ],
                [
                    'total_votos'  => $raw->QT_VOTOS_NOMINAIS,
                    'votos_validos'=> $raw->QT_VOTOS_NOMINAIS_VALIDOS,
                    'fonte'        => 'base',
                    'importacao_id'=> $importacaoId,
                ]
            );
            
            // 3. Marcar como processado
            DB::table('raw_candidatos')
                ->where('id', $raw->id)
                ->update(['status' => 'processado']);
            
            $processados++;
            
        } catch (\Throwable $e) {
            DB::table('raw_candidatos')
                ->where('id', $raw->id)
                ->update([
                    'status' => 'erro',
                    'erros'  => json_encode([$e->getMessage()]),
                ]);
            $falhas++;
        }
    }
    
    return ['processados' => $processados, 'falhas' => $falhas];
}
```

---

## 📊 Novo Fluxo do Controller

```php
public function storeV4(Request $request)
{
    $request->validate(['file' => 'required|file|mimes:csv,txt|max:200000']);
    
    $arquivo = $request->file('file');
    
    try {
        // 1. Cria registro de importação
        $importacaoId = DB::table('importacoes')->insertGetId([
            'arquivo_nome' => $arquivo->getClientOriginalName(),
            'tipo'         => 'candidato_munzona',
            'status'       => 'importando_matriz',
            'created_at'   => now(),
        ]);
        
        // 2. CSV → raw_candidatos (rápido, sem transformação)
        $resultado1 = $this->importadorService->importarParaMatriz($arquivo, $importacaoId);
        
        // 3. Valida a matriz
        $this->importadorService->validarMatriz($importacaoId);
        
        // 4. raw_candidatos → tabelas finais
        $resultado2 = $this->importadorService->processarMatriz($importacaoId);
        
        // 5. Atualiza status
        DB::table('importacoes')
            ->where('id', $importacaoId)
            ->update([
                'status'       => 'concluida',
                'total_linhas' => $resultado1['total_linhas'],
                'importados'   => $resultado2['processados'],
                'erros'        => $resultado2['falhas'],
                'updated_at'   => now(),
            ]);
        
        return response()->json([
            'success'       => true,
            'importacao_id' => $importacaoId,
            'total_linhas'  => $resultado1['total_linhas'],
            'importados'    => $resultado2['processados'],
            'erros'         => $resultado2['falhas'],
        ]);
        
    } catch (\Throwable $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
```

---

## 🎁 Benefícios Práticos

### 1️⃣ **Auditoria Completa**
```php
// Ver exatamente o que veio do CSV na linha 42
$linhaOriginal = DB::table('raw_candidatos')
    ->where('importacao_id', 1)
    ->where('numero_linha', 42)
    ->first();

echo $linhaOriginal->DS_SIT_TOT_TURNO; // "SUPLENTE"
```

### 2️⃣ **Reprocessar sem Re-importar**
```php
// Mudou a lógica de processamento?
// Apenas rode novamente!

DB::table('raw_candidatos')
    ->where('importacao_id', 1)
    ->update(['status' => 'pendente']); // Reset

$importadorService->processarMatriz(1); // Processa novamente
```

### 3️⃣ **Validação em Dois Níveis**
```php
// Nível 1: Estrutura do CSV
$erros = $importadorService->validarMatriz($importacaoId);

// Nível 2: Lógica de negócio (dentro de processarMatriz)
// Se a lógica falhar, marca como erro sem perder dados
```

### 4️⃣ **Rastrear Erros por Linha**
```php
// Ver todas as linhas com erro e por quê
$erros = DB::table('raw_candidatos')
    ->where('importacao_id', 1)
    ->where('status', 'erro')
    ->select('numero_linha', 'SQ_CANDIDATO', 'NM_CANDIDATO', 'erros')
    ->get();
```

---

## 📋 Implementação (Ordem de Prioridade)

1. **Criar migration**: `raw_candidatos` ✅
2. **Criar Service**: `ImportadorService` com 3 métodos
3. **Atualizar Controller**: trocar `storeV3` por `storeV4`
4. **Testar com seu CSV real**
5. **Validar dados na matriz**
6. **Validar dados processados**
7. **Remover storeV3 (guardar como backup)**

---

## ⏱️ Tempo Estimado

- Migration + Service: **1-2 horas**
- Testes com seu CSV: **30-45 minutos**
- Ajustes finos: **30 minutos**
- **Total: ~3 horas**

Quer que eu implemente tudo isso? 🚀
