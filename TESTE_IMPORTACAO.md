# 🧪 Teste da Nova Arquitetura de Importação

## Pré-requisitos

1. ✅ Migration criada: `2026_04_18_000019_create_raw_candidatos_table.php`
2. ✅ Service criado: `app/Services/ImportadorService.php`
3. ✅ Controller atualizado: `storeV4()` adicionado

## Passos para Testar

### 1️⃣ Executar Migration

```bash
php artisan migrate
```

Deve criar a tabela `raw_candidatos` com todas as 55+ colunas do CSV.

### 2️⃣ Atualizar as Rotas

Adicionar no arquivo `routes/api.php`:

```php
use App\Http\Controllers\Electoral\ImportarController;

Route::post('/import/v4', [ImportarController::class, 'storeV4']);
```

### 3️⃣ Testar com o CSV Real

#### Via Postman/Thunder Client

```
POST http://seu-dominio/api/import/v4

Body: form-data
  - file: votacao_candidato_munzona_2024_RR.csv
```

#### Via cURL

```bash
curl -X POST http://seu-dominio/api/import/v4 \
  -F "file=@votacao_candidato_munzona_2024_RR.csv"
```

#### Via Laravel Tinker

```php
php artisan tinker

$arquivo = new Symfony\Component\HttpFoundation\File\UploadedFile(
    '/caminho/para/votacao_candidato_munzona_2024_RR.csv',
    'votacao_candidato_munzona_2024_RR.csv',
    'text/csv'
);

$request = new Illuminate\Http\Request();
$request->files->set('file', $arquivo);

$controller = new App\Http\Controllers\Electoral\ImportarController();
$response = $controller->storeV4($request);

echo json_encode(json_decode($response->getContent()), JSON_PRETTY_PRINT);
```

## 📊 Resposta Esperada

### Sucesso

```json
{
  "success": true,
  "importacao_id": 1,
  "total_linhas": 1234,
  "importados": 1150,
  "erros": 84,
  "validacao": {
    "erros_validacao": 84,
    "primeiros_erros": {
      "10": ["ANO_ELEICAO obrigatório"],
      "42": ["CD_MUNICIPIO obrigatório"]
    }
  }
}
```

## 🔍 Verificação nos Dados

Após sucesso, verificar:

### 1. Tabela raw_candidatos

```sql
-- Ver quantas linhas foram importadas
SELECT COUNT(*) FROM raw_candidatos WHERE importacao_id = 1;

-- Ver status dos registros
SELECT 
  status, 
  COUNT(*) as total 
FROM raw_candidatos 
WHERE importacao_id = 1 
GROUP BY status;

-- Ver exemplos com erro
SELECT 
  numero_linha, 
  SQ_CANDIDATO, 
  NM_CANDIDATO, 
  status, 
  erros 
FROM raw_candidatos 
WHERE importacao_id = 1 AND status = 'erro' 
LIMIT 10;

-- Ver exemplo processado
SELECT 
  numero_linha, 
  SQ_CANDIDATO, 
  NM_CANDIDATO, 
  DS_SIT_TOT_TURNO,  -- ⭐ A coluna que você perguntou!
  status 
FROM raw_candidatos 
WHERE importacao_id = 1 AND status = 'processado' 
LIMIT 5;
```

### 2. Tabelas Finais

```sql
-- Candidaturas criadas
SELECT COUNT(*) FROM candidaturas 
WHERE importacao_id = 1;

-- Pessoas criadas
SELECT COUNT(*) FROM pessoas 
WHERE importacao_id = 1;

-- Votos por zona criados
SELECT COUNT(*) FROM votos_zona 
WHERE importacao_id = 1;

-- Eleições criadas
SELECT * FROM eleicoes 
WHERE importacao_id = 1;

-- Exemplo: Uma candidatura com a situação
SELECT 
  c.id, 
  p.nome, 
  c.numero,
  c.situacao,
  e.descricao as eleicao,
  COUNT(vz.id) as total_zonas
FROM candidaturas c
JOIN pessoas p ON p.id = c.pessoa_id
JOIN eleicoes e ON e.id = c.eleicao_id
LEFT JOIN votos_zona vz ON vz.candidatura_id = c.id
WHERE c.importacao_id = 1
GROUP BY c.id, p.nome, c.numero, c.situacao, e.descricao
LIMIT 10;
```

## 🎯 O que Validar

### ✅ Tabela raw_candidatos
- [ ] Todas as 55+ colunas preenchidas corretamente
- [ ] `numero_linha` corresponde à linha do CSV
- [ ] `DS_SIT_TOT_TURNO` contém valores como "SUPLENTE", "NÃO ELEITO", "ELEITO"
- [ ] Erros marcados corretamente no campo `erros`

### ✅ Processamento
- [ ] Candidaturas criadas a partir dos dados brutos
- [ ] Pessoas reutilizadas corretamente (mesmo sq_candidato = mesma pessoa)
- [ ] Votos por zona agregados
- [ ] Eleição criada com o ano correto (2024)

### ✅ Rastreabilidade
- [ ] Pode voltar do `votos_zona` → `raw_candidatos` → CSV original
- [ ] `numero_linha` permite auditar exatamente qual linha do CSV gerou qual registro

## 🐛 Troubleshooting

### Erro: "Table not found: raw_candidatos"
- Executar: `php artisan migrate`

### Erro: "Class ImportadorService not found"
- Verificar namespace: `App\Services\ImportadorService`
- Verificar arquivo: `app/Services/ImportadorService.php`

### Erro: "Maximum execution time exceeded"
- Aumentar `max_execution_time` no `php.ini`
- Ou usar importação em lotes menores

### Dados não aparecem em candidaturas
- Verificar status em `raw_candidatos`
- Verificar se há erros no campo `erros`
- Rodar validação manualmente: `$importadorService->validarMatriz($importacaoId)`

## 🚀 Próximos Passos

Após validar tudo:

1. **Teste de reprocessamento** (prove que pode rodar novamente sem re-importar)
   ```php
   // Reset status
   DB::table('raw_candidatos')
     ->where('importacao_id', 1)
     ->update(['status' => 'pendente']);
   
   // Processa novamente
   $importadorService->processarMatriz(1);
   ```

2. **Teste de auditoria** (rastreie um candidato específico)
   ```php
   // Ver dados brutos
   $raw = DB::table('raw_candidatos')
     ->where('importacao_id', 1)
     ->where('numero_linha', 42)
     ->first();
   
   // Ver como foi processado
   $cand = DB::table('candidaturas')
     ->where('sq_candidato', $raw->SQ_CANDIDATO)
     ->where('eleicao_id', $raw->eleicao_id)
     ->first();
   ```

3. **Deprecar storeV3** (quando V4 estiver 100% estável)
   - Manter V3 como backup por 1 mês
   - Documentar migração para usuários

---

## 📝 Notas Importantes

- **Dados brutos**: `raw_candidatos` espelha EXATAMENTE o CSV
- **Sem transformação**: Primeira etapa é rápida (load dos dados)
- **Validação separada**: Detecta problemas sem perder dados
- **Reprocessável**: Pode mudar lógica e processar novamente
- **Auditável**: Sempre consegue rastrear até o CSV original

Bom teste! 🎉
