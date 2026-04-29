# ✅ Arquivos Criados: Importação de Seções

**Data:** 19 de Abril de 2026  
**Status:** Completo com Modelos

---

## 📂 Estrutura de Arquivos

### 1. **Migrations** (Database)

#### `database/migrations/2026_04_19_000001_create_importacoes_table.php`
- Tabela `importacoes` para rastrear importações
- Campos: tipo, status, arquivo, total_linhas, processados, erros, metadados
- Status: pendente, processando, concluido, erro

#### `database/migrations/2026_04_19_000030_create_raw_secoes_table.php`
- Tabela `raw_secoes` (cópia bruta do CSV)
- 70+ colunas espelhando VOTACAO_SECAO
- Campos de metadados: numero_linha, status, erros

### 2. **Modelos** (Eloquent ORM)

#### `app/Models/Importacao.php`
```php
- Rastreamento de importações
- Relações com RawCandidato e RawSecao
- Métodos helpers: isProcessing(), isCompleted(), hasErrors(), taxaSucesso()
```

#### `app/Models/RawCandidato.php`
```php
- Mapeia tabela raw_candidatos
- Scopes: pendente(), processado(), comErro()
- Método: temErros(), getErrorosFormatados()
```

#### `app/Models/RawSecao.php`
```php
- Mapeia tabela raw_secoes
- Scopes: pendente(), processado(), comErro()
- Método: temErros(), getErrorosFormatados()
```

### 3. **Serviços** (Business Logic)

#### `app/Services/ImportadorSecaoService.php`
```php
- Etapa 1: importarParaMatriz()
  - CSV → raw_secoes
  - Batch de 1000 linhas
  - Detecção de separador
  - Conversão de datas
  
- Etapa 2: validarMatriz()
  - Verifica campos obrigatórios
  - Valida tipos de dados
  
- Etapa 3: processarMatriz()
  - Resolve entidades (eleicoes, municipios, etc)
  - Cache em memória
  - Popula votos_secao
  - Transações ACID
  
- Utilitários:
  - detectarSeparador()
  - mapearLinha()
  - converterData()
  - converterDataHora()
  - normalizarTexto()
  - normalizarHora()
```

### 4. **Controllers** (API Endpoints)

#### `app/Http/Controllers/Electoral/ImportarSecaoController.php`
```php
POST   /api/import/secoes/v1
       - Orquestra 3 etapas
       - Retorna: importacao_id, etapa1, etapa2, etapa3

GET    /api/import/secoes/status/{id}
       - Consulta status de importação

GET    /api/import/secoes/erros/{id}
       - Lista erros encontrados
```

### 5. **Documentação**

#### `ARQUITETURA_IMPORTACAO_SECOES.md`
- Explicação detalhada das 3 etapas
- Fluxo visual
- Exemplo prático
- Queries de validação
- Troubleshooting

#### `PADRAO_MATRIZ_ETL.md`
- Padrão geral reutilizável
- Comparação candidatos vs seções
- Características do padrão
- Performance e escalabilidade
- Extensibilidade para novos tipos

---

## 🚀 Como Usar

### 1. Executar Migrations

```bash
php artisan migrate
```

Isso cria:
- `importacoes` - Rastreamento
- `raw_candidatos` - Candidatos (já existia)
- `raw_secoes` - Seções (novo)

### 2. Registrar Rotas (Se não automático)

```php
// routes/api.php
use App\Http\Controllers\Electoral\ImportarSecaoController;

Route::post('/import/secoes/v1', [ImportarSecaoController::class, 'storeV1']);
Route::get('/import/secoes/status/{importacao_id}', [ImportarSecaoController::class, 'status']);
Route::get('/import/secoes/erros/{importacao_id}', [ImportarSecaoController::class, 'erros']);
```

### 3. Importar Arquivo

```bash
curl -X POST http://localhost:8000/api/import/secoes/v1 \
  -F "file=@votacao_secao_2024_CE.csv"
```

**Resposta esperada:**
```json
{
  "importacao_id": 1,
  "tipo": "VOTACAO_SECAO",
  "etapa1": {"total_linhas": 50000, "status": "sucesso"},
  "etapa2": {"total_erros": 0, "erros_por_linha": {}},
  "etapa3": {"processados": 50000, "falhas": 0},
  "status": "sucesso"
}
```

### 4. Consultar Status

```bash
curl http://localhost:8000/api/import/secoes/status/1
```

### 5. Ver Erros

```bash
curl http://localhost:8000/api/import/secoes/erros/1
```

---

## 📊 Fluxo Completo

```
votacao_secao_2024_CE.csv
    ↓
[ETAPA 1] Lê arquivo em lotes
    - detectarSeparador()
    - mapearLinha()
    - converterData() / converterDataHora()
    - normalizar encoding
    ↓
raw_secoes (cópia bruta, 70+ campos)
    ↓
[ETAPA 2] Validação
    - Campos obrigatórios
    - Tipos de dados
    - Marca status='erro' ou status='pendente'
    ↓
raw_secoes (status atualizado)
    ↓
[ETAPA 3] Transformação (com cache em memória)
    - Resolver eleicoes
    - Resolver municipios
    - Resolver zonas
    - Resolver cargos
    - Resolver partidos
    - Resolver locais_votacao
    - Resolver candidaturas (se houver)
    - Inserir votos_secao
    - Marca status='processado'
    ↓
Tabelas finais:
    - eleicoes
    - municipios
    - zonas_eleitorais
    - cargos
    - partidos
    - locais_votacao
    - candidaturas (se houver)
    - votos_secao ✅
```

---

## 🧪 Validação

### Ver dados importados

```sql
SELECT 
  e.ano, m.nome, z.numero, vs.secao_numero,
  c.descricao, vs.tipo_votavel, vs.nome_votavel, vs.quantidade_votos
FROM votos_secao vs
JOIN eleicoes e ON e.id = vs.eleicao_id
JOIN municipios m ON m.id = vs.municipio_id
JOIN zonas_eleitorais z ON z.id = vs.zona_id
JOIN cargos c ON c.id = vs.cargo_id
WHERE vs.eleicao_id = 1
LIMIT 20;
```

### Ver status de importação

```sql
SELECT id, tipo, status, total_linhas, processados, erros 
FROM importacoes 
ORDER BY created_at DESC 
LIMIT 5;
```

### Ver erros

```sql
SELECT numero_linha, erros 
FROM raw_secoes 
WHERE status = 'erro' 
LIMIT 10;
```

### Contagem de registros

```sql
SELECT 
  'raw_secoes' as tabela,
  COUNT(*) as total,
  SUM(CASE WHEN status='pendente' THEN 1 ELSE 0 END) as pendentes,
  SUM(CASE WHEN status='processado' THEN 1 ELSE 0 END) as processados,
  SUM(CASE WHEN status='erro' THEN 1 ELSE 0 END) as erros
FROM raw_secoes
UNION ALL
SELECT 'votos_secao', COUNT(*), 0, 0, 0 FROM votos_secao;
```

---

## 📝 Checklist de Implementação

- [x] Migration `importacoes` criada
- [x] Migration `raw_secoes` criada
- [x] Modelo `Importacao` criado
- [x] Modelo `RawCandidato` criado
- [x] Modelo `RawSecao` criado
- [x] `ImportadorSecaoService` implementado
- [x] `ImportarSecaoController` implementado
- [x] Documentação `ARQUITETURA_IMPORTACAO_SECOES.md` criada
- [x] Documentação `PADRAO_MATRIZ_ETL.md` criada
- [ ] Rotas registradas em `routes/api.php`
- [ ] `php artisan migrate` executado
- [ ] Teste de importação realizado
- [ ] Validação de dados confirmada

---

## 🔧 Próximos Passos

### Imediatos (Antes de usar)

1. **Executar migration:**
   ```bash
   php artisan migrate
   ```

2. **Registrar rotas** (se não automático):
   ```php
   // Em routes/api.php
   Route::post('/import/secoes/v1', [\App\Http\Controllers\Electoral\ImportarSecaoController::class, 'storeV1']);
   Route::get('/import/secoes/status/{id}', [\App\Http\Controllers\Electoral\ImportarSecaoController::class, 'status']);
   Route::get('/import/secoes/erros/{id}', [\App\Http\Controllers\Electoral\ImportarSecaoController::class, 'erros']);
   ```

3. **Testar:**
   ```bash
   curl -X POST http://localhost:8000/api/import/secoes/v1 \
     -F "file=@bu-fortim.csv"
   ```

### Opcionais (Melhorias futuras)

1. **Agregação por cargo/municipio** - Se necessário resumir dados
2. **Validação de integridade** - Comparar soma de seções com total
3. **Índices adicionais** - Conforme queries reais
4. **Cache Redis** - Para performance em arquivos grandes

---

## 📊 Resumo de Modelos

| Modelo | Tabela | Campos | Uso |
|--------|--------|--------|-----|
| `Importacao` | `importacoes` | 7 | Rastreamento de imports |
| `RawCandidato` | `raw_candidatos` | 55+ | Cópia bruta candidatos |
| `RawSecao` | `raw_secoes` | 70+ | Cópia bruta seções |

---

## 🎯 Benefícios da Arquitetura

✅ **Rastreabilidade** - Histórico completo de cada importação  
✅ **Reprocessamento** - Pode-se reprocessar dados sem duplicatas  
✅ **Validação** - Erros detectados e armazenados  
✅ **Performance** - Cache em memória e batch processing  
✅ **Escalabilidade** - Mesmo padrão para novos tipos de dados  
✅ **Robustez** - Transações ACID e reconexão automática  

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique logs: `storage/logs/laravel.log`
2. Consulte erros: `GET /api/import/secoes/erros/{id}`
3. Valide raw_secoes: `SELECT status, COUNT(*) FROM raw_secoes GROUP BY status;`
4. Verifique migrations: `php artisan migrate:status`

---

**Implementação concluída! ✅**

Todos os modelos, migrations, serviços e controllers foram criados e documentados.

Próximo passo: Executar `php artisan migrate` e testar a importação.
