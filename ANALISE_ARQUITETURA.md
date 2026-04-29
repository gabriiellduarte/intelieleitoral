# Análise de Arquitetura - Sistema de Importação Eleitoral

## 🔴 PROBLEMA ATUAL

Seu sistema **processa e insere dados direto nas tabelas finais**, sem manter um registro bruto do CSV. Isso causa:

### 1. **Sem rastreabilidade da fonte**
- Não há registro exato do que veio do CSV
- Difícil auditar erros de transformação
- Impossível reconstruir dados se lógica mudar

### 2. **Transformação e persistência acopladas**
- Dados já estão "processados" ao entrar no DB
- Difícil alterar regras de negócio sem re-importar
- Lógica espalhada no `ImportarController`

### 3. **Sem reprocessamento**
- Se mudar a lógica de transformação, precisa re-importar tudo
- Sem forma de validar o processamento sem guardar originais

### 4. **Acoplamento alto**
- 90% do código em `storeV3()` mistura: leitura CSV + validação + transformação + persistência
- Difícil testar cada etapa isoladamente

## ✅ SOLUÇÃO RECOMENDADA

### Arquitetura de Duas Camadas

```
┌─────────────────────────────────────────────────────────────┐
│ CSV IMPORTADO                                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ TABELA MATRIZ (raw_candidatos, raw_votos_secao, etc)       │
│ - Espelha exatamente o CSV                                  │
│ - Dados brutos, sem transformação                           │
│ - Uma linha = uma linha do CSV                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼ (Função de Processamento)
┌─────────────────────────────────────────────────────────────┐
│ TABELAS NORMALIZADAS (pessoas, candidaturas, votos, etc)   │
│ - Dados transformados, validados, cruzados                  │
│ - Reutilizáveis para análise                                │
└─────────────────────────────────────────────────────────────┘
```

### Benefícios Imediatos

✅ **Auditoria completa**: Sempre pode voltar ao CSV original  
✅ **Reprocessamento**: Muda a lógica? Processa novamente sem re-importar  
✅ **Validação em dois níveis**: Estrutura do CSV + Lógica de negócio  
✅ **Testes isolados**: Testa CSV→Matriz separado de Matriz→Tabelas finais  
✅ **Histórico**: Rastreia todas as transformações  
✅ **Correções**: Sem perder dados originais  

---

## 📋 IMPLEMENTAÇÃO PRÁTICA

### 1️⃣ Criar Tabelas Matriz

```php
// database/migrations/2026_04_18_create_raw_candidatos_table.php
Schema::create('raw_candidatos', function (Blueprint $table) {
    $table->id();
    $table->foreignId('importacao_id')->constrained('importacoes')->cascadeOnDelete();
    
    // Copiar EXATAMENTE as colunas do CSV
    $table->string('SQ_CANDIDATO')->nullable();
    $table->string('NR_CANDIDATO')->nullable();
    $table->string('NM_URNA_CANDIDATO')->nullable();
    $table->string('NM_CANDIDATO')->nullable();
    $table->string('NM_SOCIAL_CANDIDATO')->nullable();
    $table->string('DS_SITUACAO_CANDIDATURA')->nullable();
    
    $table->integer('ANO_ELEICAO')->nullable();
    $table->string('NM_TIPO_ELEICAO')->nullable();
    $table->string('DS_ELEICAO')->nullable();
    $table->integer('NR_TURNO')->nullable();
    $table->string('SG_UF')->nullable();
    
    $table->integer('CD_MUNICIPIO')->nullable();
    $table->string('NM_MUNICIPIO')->nullable();
    $table->string('NR_ZONA')->nullable();
    
    $table->string('CD_CARGO')->nullable();
    $table->string('DS_CARGO')->nullable();
    
    $table->integer('NR_PARTIDO')->nullable();
    $table->string('SG_PARTIDO')->nullable();
    $table->string('NM_PARTIDO')->nullable();
    
    $table->integer('QT_VOTOS_NOMINAIS')->nullable();
    $table->integer('QT_VOTOS_NOMINAIS_VALIDOS')->nullable();
    
    // Metadados de importação
    $table->integer('numero_linha')->nullable();
    $table->string('status')->default('pendente'); // pendente, processado, erro
    $table->json('erros')->nullable();
    
    $table->timestamps();
    
    $table->index(['importacao_id', 'status']);
    $table->index('numero_linha');
});

// database/migrations/2026_04_18_create_raw_votos_secao_table.php
Schema::create('raw_votos_secao', function (Blueprint $table) {
    $table->id();
    $table->foreignId('importacao_id')->constrained('importacoes')->cascadeOnDelete();
    
    // Copiar EXATAMENTE as colunas do CSV
    $table->string('SQ_CANDIDATO')->nullable();
    $table->string('NR_VOTAVEL')->nullable();
    $table->string('NM_VOTAVEL')->nullable();
    $table->integer('QT_VOTOS')->nullable();
    
    $table->string('CD_CARGO')->nullable();
    $table->string('DS_CARGO')->nullable();
    
    $table->integer('ANO_ELEICAO')->nullable();
    $table->string('NM_TIPO_ELEICAO')->nullable();
    $table->string('DS_ELEICAO')->nullable();
    $table->integer('NR_TURNO')->nullable();
    $table->string('SG_UF')->nullable();
    
    $table->integer('CD_MUNICIPIO')->nullable();
    $table->string('NM_MUNICIPIO')->nullable();
    $table->string('NR_ZONA')->nullable();
    $table->string('NR_SECAO')->nullable();
    $table->string('NR_LOCAL_VOTACAO')->nullable();
    $table->string('NM_LOCAL_VOTACAO')->nullable();
    $table->text('DS_LOCAL_VOTACAO_ENDERECO')->nullable();
    
    // Metadados
    $table->integer('numero_linha')->nullable();
    $table->string('status')->default('pendente'); // pendente, processado, erro
    $table->json('erros')->nullable();
    
    $table->timestamps();
    
    $table->index(['importacao_id', 'status']);
});
```

### 2️⃣ Refatorar Importador em 3 Etapas

```php
// app/Services/ImportadorService.php
class ImportadorService
{
    /**
     * ETAPA 1: CSV → Tabela Matriz (rápido, sem validação)
     */
    public function importarParaMatriz(UploadedFile $arquivo, int $importacaoId): array
    {
        $handle = fopen($arquivo->getRealPath(), 'r');
        $header = fgetcsv($handle, 0, $this->detectarSeparador($arquivo));
        
        $totalLinhas = 0;
        $lote = [];
        
        while (($row = fgetcsv($handle, 0, $separador)) !== false) {
            $totalLinhas++;
            $dados = $this->mapearLinha($header, $row);
            
            $lote[] = array_merge($dados, [
                'importacao_id' => $importacaoId,
                'numero_linha'  => $totalLinhas,
                'status'        => 'pendente',
                'created_at'    => now(),
            ]);
            
            if (count($lote) >= 5000) {
                DB::table('raw_candidatos')->insert($lote);
                $lote = [];
            }
        }
        
        if (!empty($lote)) {
            DB::table('raw_candidatos')->insert($lote);
        }
        
        fclose($handle);
        return ['total_linhas' => $totalLinhas];
    }
    
    /**
     * ETAPA 2: Validação da Matriz
     */
    public function validarMatriz(int $importacaoId): array
    {
        $registros = DB::table('raw_candidatos')
            ->where('importacao_id', $importacaoId)
            ->where('status', 'pendente')
            ->get();
        
        $erros = [];
        
        foreach ($registros as $registro) {
            $errosRegistro = [];
            
            // Validações
            if (empty($registro->SQ_CANDIDATO) && empty($registro->NR_CANDIDATO)) {
                $errosRegistro[] = 'SQ_CANDIDATO ou NR_CANDIDATO obrigatório';
            }
            
            if (empty($registro->ANO_ELEICAO)) {
                $errosRegistro[] = 'ANO_ELEICAO obrigatório';
            }
            
            if (!empty($errosRegistro)) {
                DB::table('raw_candidatos')
                    ->where('id', $registro->id)
                    ->update([
                        'status' => 'erro',
                        'erros'  => json_encode($errosRegistro),
                    ]);
                $erros[$registro->numero_linha] = $errosRegistro;
            }
        }
        
        return $erros;
    }
    
    /**
     * ETAPA 3: Matriz → Tabelas Finais (transformação + persistência)
     */
    public function processarMatriz(int $importacaoId): array
    {
        $cache = ['eleicao' => [], 'partido' => [], /* ... */ ];
        $importados = 0;
        $erros = 0;
        
        DB::transaction(function () use ($importacaoId, &$cache, &$importados, &$erros) {
            $registros = DB::table('raw_candidatos')
                ->where('importacao_id', $importacaoId)
                ->where('status', 'pendente')
                ->get();
            
            foreach ($registros as $registro) {
                try {
                    // Converter para array associativo
                    $dados = (array) $registro;
                    
                    // Chamar processador original
                    $eleicaoId = $this->processarCandidatoMunzona($dados, $cache, $importacaoId);
                    
                    if ($eleicaoId) {
                        DB::table('raw_candidatos')
                            ->where('id', $registro->id)
                            ->update(['status' => 'processado']);
                        $importados++;
                    } else {
                        DB::table('raw_candidatos')
                            ->where('id', $registro->id)
                            ->update(['status' => 'erro', 'erros' => json_encode(['Falha ao processar'])]);
                        $erros++;
                    }
                } catch (\Throwable $e) {
                    DB::table('raw_candidatos')
                        ->where('id', $registro->id)
                        ->update(['status' => 'erro', 'erros' => json_encode([$e->getMessage()])]);
                    $erros++;
                }
            }
        });
        
        return ['importados' => $importados, 'erros' => $erros];
    }
}
```

### 3️⃣ Novo Fluxo do Controller

```php
// app/Http/Controllers/Electoral/ImportarController.php
public function storeV4(Request $request)
{
    $request->validate(['file' => 'required|file|mimes:csv,txt|max:200000']);
    $arquivo = $request->file('file');
    
    DB::beginTransaction();
    try {
        // 1️⃣ Registra importação
        $importacaoId = DB::table('importacoes')->insertGetId([
            'arquivo_nome' => $arquivo->getClientOriginalName(),
            'tipo'         => 'candidato_munzona',
            'status'       => 'importando_matriz',
            'created_at'   => now(),
        ]);
        
        // 2️⃣ CSV → Matriz (rápido, sem validação)
        $resultado1 = $this->importadorService->importarParaMatriz($arquivo, $importacaoId);
        
        // 3️⃣ Valida matriz
        $errosValidacao = $this->importadorService->validarMatriz($importacaoId);
        
        // 4️⃣ Matriz → Tabelas finais (com validação)
        $resultado2 = $this->importadorService->processarMatriz($importacaoId);
        
        // 5️⃣ Atualiza status
        DB::table('importacoes')
            ->where('id', $importacaoId)
            ->update([
                'status'       => 'concluida',
                'total_linhas' => $resultado1['total_linhas'],
                'importados'   => $resultado2['importados'],
                'erros'        => $resultado2['erros'],
                'updated_at'   => now(),
            ]);
        
        DB::commit();
        
        return response()->json([
            'success'      => true,
            'importacao_id'=> $importacaoId,
            'total_linhas' => $resultado1['total_linhas'],
            'importados'   => $resultado2['importados'],
            'erros'        => $resultado2['erros'],
        ]);
        
    } catch (\Throwable $e) {
        DB::rollBack();
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
```

---

## 🎯 ROADMAP DE MIGRAÇÃO

### Fase 1: Preparação (1-2 horas)
- [ ] Criar tabelas matriz (`raw_candidatos`, `raw_votos_secao`)
- [ ] Criar `ImportadorService` com 3 etapas

### Fase 2: Testes (2-3 horas)
- [ ] Testar com CSV pequeno
- [ ] Validar dados na tabela matriz
- [ ] Testar reprocessamento

### Fase 3: Migração (1 hora)
- [ ] Trocar endpoint para nova versão
- [ ] Manter versão antiga funcionando em paralelo
- [ ] Validar com dados reais

### Fase 4: Limpeza (30 min)
- [ ] Remover versão antiga (`storeV3`)
- [ ] Atualizar documentação
- [ ] Consolidar testes

---

## 📊 COMPARAÇÃO

| Aspecto | ANTES (V3) | DEPOIS (V4) |
|---------|-----------|-----------|
| **Rastreabilidade** | ❌ Perdida | ✅ Completa |
| **Reprocessamento** | ❌ Re-importar | ✅ Processa novamente |
| **Auditoria** | ❌ Difícil | ✅ Fácil |
| **Isolamento de testes** | ❌ Acoplado | ✅ 3 etapas claras |
| **Flexibilidade** | ❌ Rígida | ✅ Modular |
| **Tempo de import** | ✅ Rápido | ✅ Rápido (fase 1) |

---

## 💡 EXEMPLOS DE USO

### Reprocessar dados
```php
// Alterou lógica? Processa novamente
$importadorService->processarMatriz($importacaoId);
```

### Validar antes de processar
```php
$erros = $importadorService->validarMatriz($importacaoId);
if (empty($erros)) {
    $importadorService->processarMatriz($importacaoId);
}
```

### Auditoria completa
```php
// Ver exatamente o que veio do CSV
$linhasOriginais = DB::table('raw_candidatos')
    ->where('importacao_id', $importacaoId)
    ->where('numero_linha', 42)
    ->first();

// Ver como foi processado
$candidatura = DB::table('candidaturas')
    ->where('importacao_id', $importacaoId)
    ->where('sq_candidato', $linhasOriginais->SQ_CANDIDATO)
    ->first();
```

---

## 🚀 Próximos Passos

1. Você quer que eu implemente essa refatoração?
2. Quer começar pelos candidatos ou votos por seção primeiro?
3. Quer que eu crie os testes também?
