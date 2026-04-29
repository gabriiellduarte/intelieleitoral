# 🗳️ Arquitetura: Importação de Dados de Seções (VOTACAO_SECAO)

**Status:** ✅ Implementado  
**Data:** 19 de Abril de 2026  
**Padrão:** 3 Etapas (Matrix ETL)

---

## 🎯 Objetivo

Importar dados de votação por seção eleitoral (VOTACAO_SECAO) usando arquitetura robusta com 3 etapas:

1. **CSV → raw_secoes** (Cópia bruta)
2. **Validação** da matriz
3. **Transformação** → Tabelas finais

---

## 📐 Arquitetura (3 Etapas)

### ETAPA 1️⃣: Importação Bruta (CSV → raw_secoes)

**Arquivo:** `database/migrations/2026_04_19_000030_create_raw_secoes_table.php`

**Processo:**
- Lê arquivo CSV em lotes de 1000 linhas
- Detecta separador (`;`, `,`, `\t`, `|`)
- Normaliza cabeçalhos (UTF-8, trim, uppercase)
- Converte datas (DD/MM/YYYY → YYYY-MM-DD)
- Converte data/hora
- Mapeia colunas para array associativo
- Insere em `raw_secoes` com metadados

**Resultado:** Tabela `raw_secoes` com cópia 1:1 do CSV

```
CSV (votacao_secao_2024_CE.csv)
  ↓
[detectarSeparador, mapearLinha, converterData]
  ↓
raw_secoes (cópia bruta)
- Todas as colunas TSE
- numero_linha (rastreabilidade)
- status = 'pendente'
- importacao_id (agrupamento)
```

**Colunas da raw_secoes (70+ campos):**
```
DT_GERACAO, HH_GERACAO, ANO_ELEICAO, CD_TIPO_ELEICAO, NM_TIPO_ELEICAO,
CD_PLEITO, DT_PLEITO, NR_TURNO, CD_ELEICAO, DS_ELEICAO,
SG_UF, CD_MUNICIPIO, NM_MUNICIPIO, NR_ZONA, NR_SECAO, NR_LOCAL_VOTACAO,
CD_CARGO_PERGUNTA, DS_CARGO_PERGUNTA, NR_PARTIDO, SG_PARTIDO, NM_PARTIDO,
NR_VOTAVEL, NM_VOTAVEL, CD_TIPO_VOTAVEL, DS_TIPO_VOTAVEL, QT_VOTOS,
QT_APTOS, QT_COMPARECIMENTO, QT_ABSTENCOES, SQ_CANDIDATO,
... (mais 40+ campos técnicos da urna)
```

---

### ETAPA 2️⃣: Validação (raw_secoes → validação)

**Arquivo:** `app/Services/ImportadorSecaoService.php::validarMatriz()`

**Processo:**
- Valida campos obrigatórios:
  - `ANO_ELEICAO`
  - `CD_ELEICAO`
  - `CD_MUNICIPIO`
  - `NR_ZONA`
  - `NR_SECAO`
  - `CD_CARGO_PERGUNTA`

- Valida tipos de dados:
  - `ANO_ELEICAO` é numérico?
  - `CD_MUNICIPIO` é numérico?

- **Resultado:** Marca `status='erro'` com lista de erros em JSON, ou mantém `status='pendente'`

```
raw_secoes (status='pendente')
  ↓
[validarEleicao, validarMunicipio, validarZona, ...]
  ↓
raw_secoes atualizado:
- status='erro'    → erros=[...]
- status='pendente' → pronto para processar
```

---

### ETAPA 3️⃣: Transformação (raw_secoes → Tabelas Finais)

**Arquivo:** `app/Services/ImportadorSecaoService.php::processarMatriz()`

**Processo:**

Para cada linha da `raw_secoes` (com `status='pendente'`):

#### A. Resolver/Criar Entidades (Com Cache em Memória)

```
eleicoes
├── Chave: ANO_ELEICAO | CD_ELEICAO | SG_UF
├── Criação: Se não existe
└── Cache: Evita lookups repetidos

municipios
├── Chave: CD_MUNICIPIO
└── Criação: Se não existe

zonas_eleitorais
├── Chave: NR_ZONA | municipio_id
└── Criação: Se não existe

cargos
├── Chave: CD_CARGO_PERGUNTA
└── Criação: Se não existe

partidos (Se houver NR_PARTIDO)
├── Chave: NR_PARTIDO | SG_PARTIDO
└── Criação: Se não existe

candidaturas (Se houver SQ_CANDIDATO)
├── Chave: SQ_CANDIDATO | eleicao_id
└── Busca: Pode ser null se voto em branco/nulo

locais_votacao
├── Chave: NR_LOCAL_VOTACAO | zona_id
└── Criação: Se não existe
```

#### B. Inserir votos_secao

Para cada linha processada:

```php
votos_secao.updateOrInsert(
    key: [eleicao_id, municipio_id, zona_id, secao_numero, cargo_id, nr_votavel],
    data: {
        candidatura_id: ...,
        partido_id: ...,
        local_votacao_id: ...,
        nr_turno: ...,
        tipo_votavel: 'Nominal' | 'Branco' | 'Nulo' | 'Legenda',
        nome_votavel: ...,
        quantidade_votos: ...,
        aptos: ...,
        comparecimento: ...,
        abstencoes: ...,
        ...
    }
);
```

**Resultado:** 1 linha por `eleicao + municipio + zona + seção + cargo + votável`

```
| eleicao_id | municipio_id | zona_id | secao_numero | cargo_id | nr_votavel | quantidade_votos | tipo_votavel |
|     1      |      214     |    8    |     249      |    11    |     95     |        2         | Branco       |
|     1      |      214     |    8    |     249      |    11    |     96     |        9         | Nulo         |
|     1      |      214     |    8    |     249      |    13    |    40455   |        1         | Nominal      |
```

---

## 📊 Fluxo Visual Completo

```
votacao_secao_2024_CE.csv
│
├─ [ETAPA 1: Importação] ────────────────────────────────────
│  ImportadorSecaoService::importarParaMatriz()
│  • Lê CSV em lotes
│  • Detecta separador
│  • Mapeia colunas
│  • Converte datas
│  • Insere em raw_secoes
│
├─→ raw_secoes (cópia bruta)
│   • Todas as colunas TSE
│   • numero_linha (rastreamento)
│   • status = 'pendente'
│   • importacao_id (agrupamento)
│
├─ [ETAPA 2: Validação] ──────────────────────────────────────
│  ImportadorSecaoService::validarMatriz()
│  • Valida campos obrigatórios
│  • Valida tipos de dados
│  • Marca erros em JSON
│
├─→ raw_secoes (status atualizado)
│   • status = 'pendente' (OK) ou 'erro' (com detalhes)
│
├─ [ETAPA 3: Transformação] ──────────────────────────────────
│  ImportadorSecaoService::processarMatriz()
│
│  A. Loop: Processar cada linha
│     • Resolver eleicoes (cache)
│     • Resolver municipios (cache)
│     • Resolver zonas (cache)
│     • Resolver cargos (cache)
│     • Resolver partidos (cache, se houver)
│     • Resolver candidaturas (cache, se houver)
│     • Resolver locais_votacao (cache)
│     • Inserir votos_secao
│
├─→ eleicoes
├─→ municipios
├─→ zonas_eleitorais
├─→ cargos
├─→ partidos
├─→ candidaturas (se houver voto nominal)
├─→ locais_votacao
└─→ votos_secao (dados finais de votação por seção)
```

---

## 🔑 Características Principais

### 1. **Rastreabilidade Completa**
- `raw_secoes.numero_linha` → Qual linha do CSV?
- `raw_secoes.status` → Processado ou erro?
- `raw_secoes.erros` → Detalhes do erro em JSON
- `*.importacao_id` → Qual import?

### 2. **Validação Robusta**
- Campos obrigatórios verificados
- Tipos de dados validados
- Erros armazenados para análise

### 3. **Performance**
- Batch insert de 1000 registros
- Cache em memória (eleições, municipios, etc)
- Reconexão automática MySQL se cair
- Transações (tudo ou nada)

### 4. **Idempotência**
- `updateOrInsert`: Pode re-rodar sem duplicatas
- `raw_secoes` marca status: pendente, processado, erro
- Pode limpar erros e reprocessar

### 5. **Flexibilidade**
- Detecta automaticamente separador do CSV
- Converte datas em múltiplos formatos
- Normaliza encoding (Latin-1, UTF-8, Windows-1252)
- Trata valores nulos (#NULO, #NE, -1, etc)

---

## 🚀 Como Usar

### 1. Executar Migration

```bash
php artisan migrate
```

**O que faz:**
- ✅ Cria tabela `raw_secoes`
- ✅ Cria índices para performance

### 2. Importar Arquivo

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

### 3. Consultar Status

```bash
curl http://localhost:8000/api/import/secoes/status/1
```

### 4. Ver Erros (Se houver)

```bash
curl http://localhost:8000/api/import/secoes/erros/1
```

---

## 📊 Exemplo Prático

### CSV Original (3 linhas)

```
DT_GERACAO;...;ANO_ELEICAO;CD_ELEICAO;CD_MUNICIPIO;NM_MUNICIPIO;NR_ZONA;NR_SECAO;CD_CARGO_PERGUNTA;NR_VOTAVEL;NM_VOTAVEL;QT_VOTOS;...
09/10/2024;...;2024;619;13501;FORTIM;8;249;11;95;Branco;2;...
09/10/2024;...;2024;619;13501;FORTIM;8;249;11;96;Nulo;9;...
09/10/2024;...;2024;619;13501;FORTIM;8;249;13;40455;JANDIRA DO CAMARÃO;1;...
```

### raw_secoes Resultante

```
| numero_linha | DT_GERACAO | ANO_ELEICAO | CD_ELEICAO | CD_MUNICIPIO | ... | status    |
|      1       | 2024-10-09 |    2024     |    619     |    13501     | ... | pendente  |
|      2       | 2024-10-09 |    2024     |    619     |    13501     | ... | pendente  |
|      3       | 2024-10-09 |    2024     |    619     |    13501     | ... | pendente  |
```

### votos_secao Resultante

```
| eleicao_id | municipio_id | zona_id | secao_numero | cargo_id | nr_votavel | quantidade_votos | tipo_votavel |
|     1      |      214     |    8    |     249      |    11    |     95     |        2         | Branco       |
|     1      |      214     |    8    |     249      |    11    |     96     |        9         | Nulo         |
|     1      |      214     |    8    |     249      |    13    |    40455   |        1         | Nominal      |
```

---

## 🔍 Validação

### Query: Ver dados importados

```sql
SELECT 
  e.ano,
  m.nome as municipio,
  z.numero as zona,
  vs.secao_numero,
  c.descricao as cargo,
  vs.tipo_votavel,
  vs.nome_votavel,
  SUM(vs.quantidade_votos) as total_votos
FROM votos_secao vs
JOIN eleicoes e ON e.id = vs.eleicao_id
JOIN municipios m ON m.id = vs.municipio_id
JOIN zonas_eleitorais z ON z.id = vs.zona_id
JOIN cargos c ON c.id = vs.cargo_id
WHERE vs.eleicao_id = 1
GROUP BY e.id, m.id, z.id, vs.secao_numero, c.id, vs.tipo_votavel
ORDER BY m.nome, z.numero, vs.secao_numero
LIMIT 20;
```

### Query: Ver erros de importação

```sql
SELECT numero_linha, erros
FROM raw_secoes
WHERE status = 'erro'
LIMIT 10;
```

### Query: Contagem de registros

```sql
SELECT 
  'raw_secoes' as tabela, COUNT(*) as total, 
  SUM(CASE WHEN status='pendente' THEN 1 ELSE 0 END) as pendentes,
  SUM(CASE WHEN status='processado' THEN 1 ELSE 0 END) as processados,
  SUM(CASE WHEN status='erro' THEN 1 ELSE 0 END) as erros
FROM raw_secoes
UNION ALL
SELECT 'votos_secao', COUNT(*), 0, 0, 0
FROM votos_secao
UNION ALL
SELECT 'eleicoes', COUNT(*), 0, 0, 0
FROM eleicoes;
```

---

## 📋 Tabelas Envolvidas

| Tabela | Tipo | Descrição |
|--------|------|-----------|
| `raw_secoes` | Matrix | Cópia bruta do CSV (antes de transformação) |
| `eleicoes` | Master | Dados das eleições |
| `municipios` | Master | Dados dos municípios |
| `zonas_eleitorais` | Master | Dados das zonas |
| `cargos` | Master | Dados dos cargos |
| `partidos` | Master | Dados dos partidos |
| `candidaturas` | Master | Dados das candidaturas |
| `locais_votacao` | Master | Locais de votação |
| `votos_secao` | Fact | Dados finais de votação por seção |

---

## 🛠️ Troubleshooting

### Erro: "Duplicate entry"
```sql
-- Verificar duplicatas
SELECT eleicao_id, municipio_id, zona_id, secao_numero, cargo_id, nr_votavel, COUNT(*)
FROM votos_secao
GROUP BY eleicao_id, municipio_id, zona_id, secao_numero, cargo_id, nr_votavel
HAVING COUNT(*) > 1;

-- Limpar e re-importar se necessário
DELETE FROM votos_secao WHERE importacao_id = 1;
DELETE FROM raw_secoes WHERE importacao_id = 1;
```

### Erro: "MySQL server has gone away"
```bash
# Aumentar timeout e packet size em /etc/mysql/my.cnf
max_allowed_packet=256M
wait_timeout=28800
interactive_timeout=28800
```

### Erro: "Unknown column" ou "Undefined column"
```bash
# Verificar que todas as migrations rodaram:
php artisan migrate:status

# Se necessário, rodar novamente:
php artisan migrate
```

---

## 📝 Checklist

- [ ] Migration `create_raw_secoes_table` criada
- [ ] Arquivo `ImportadorSecaoService.php` criado
- [ ] Controller `ImportarSecaoController.php` criado
- [ ] Rota `/api/import/secoes/v1` registrada
- [ ] Migration executada: `php artisan migrate`
- [ ] CSV testado com importação
- [ ] Etapa 1: Linhas importadas corretamente
- [ ] Etapa 2: Validação passa (sem erros críticos)
- [ ] Etapa 3: Dados em `votos_secao` corretos
- [ ] Queries de validação passam

---

## 🎯 Próximas Etapas (Opcionais)

1. **Agregação por cargo/municipio** - Se necessário somar votos por cargo ao invés de por seção
2. **Validação de integridade** - Verificar se soma de seções = total municipal
3. **Reconciliação** - Comparar votos_secao com votos_zona (se aplicável)
4. **Performance** - Adicionar índices específicos conforme queries reais

---

## 📞 Suporte

Se encontrar problemas:

1. Consulte os logs: `storage/logs/laravel.log`
2. Verifique erros com: `curl http://localhost:8000/api/import/secoes/erros/{id}`
3. Valide raw_secoes: `SELECT status, COUNT(*) FROM raw_secoes GROUP BY status;`
4. Confirme migrations: `php artisan migrate:status`

---

**Padrão implementado com sucesso!** ✅

Você agora pode importar dados de seções usando a mesma arquitetura robusta usada para candidatos.
