# 🗳️ Agregação de Votos por Município

## ✅ Problema Resolvido

**Antes:** `votos_municipio` estava recebendo valores individuais de cada zona, sem agregar.

**Exemplo do problema:**
```
Candidato X em Fortaleza no 1º turno tem votos em 5 zonas:
- Zona 5: 193 votos
- Zona 10: 87 votos
- Zona 15: 120 votos
- Zona 22: 65 votos
- Zona 33: 45 votos

❌ ANTES: votos_municipio teria apenas o último (45 votos em Zona 33)
✅ DEPOIS: votos_municipio tem 1 linha com 510 votos (soma de todas)
```

---

## 🔧 Como Funciona Agora

### 1. **Etapa de Processamento (Durante o Loop)**

No `processarMatriz()`, para cada linha da `raw_candidatos`:

```php
// Chave única: candidatura_id:municipio_id:nr_turno
$chaveAgregacao = "{$candidaturaId}:{$municipioId}:{$nrTurno}";

// Se é a primeira vez, cria a entrada
if (!isset($agregacaoMunicipio[$chaveAgregacao])) {
    $agregacaoMunicipio[$chaveAgregacao] = [
        'candidatura_id'   => $candidaturaId,
        'municipio_id'     => $municipioId,
        'eleicao_id'       => $eleicaoId,
        'cargo_id'         => $cargoId,
        'nr_turno'         => $nrTurno,
        'total_votos'      => 0,
        'ds_sit_tot_turno' => $sitTurno,
        'importacao_id'    => $importacaoId,
    ];
}

// Soma os votos dessa zona
$agregacaoMunicipio[$chaveAgregacao]['total_votos'] += $totalVotos;

// Atualiza a situação se fornecida
if (!empty($sitTurno)) {
    $agregacaoMunicipio[$chaveAgregacao]['ds_sit_tot_turno'] = $sitTurno;
}
```

### 2. **Etapa de Inserção (Após o Loop)**

Após processar TODAS as linhas do CSV, o array `$agregacaoMunicipio` contém:

```php
[
    "1:2:1" => [
        'candidatura_id'   => 1,
        'municipio_id'     => 2,
        'nr_turno'         => 1,
        'total_votos'      => 510,  // ⭐ SOMA DE TODAS AS ZONAS
        'ds_sit_tot_turno' => 'ELEITO',
        ...
    ],
    "1:2:2" => [
        'candidatura_id'   => 1,
        'municipio_id'     => 2,
        'nr_turno'         => 2,
        'total_votos'      => 540,  // ⭐ 2º turno diferente
        'ds_sit_tot_turno' => 'SUPLENTE',
        ...
    ],
    ...
]
```

Então faz batch insert/update:
```php
foreach ($agregacaoMunicipio as $chave => $dados) {
    DB::table('votos_municipio')->updateOrInsert(
        ['candidatura_id', 'municipio_id', 'nr_turno'],
        $dados
    );
}
```

---

## 📊 Fluxo Completo Agora

```
CSV (múltiplas linhas por candidato/município/turno)
    ↓
raw_candidatos (cópia bruta)
    ↓
processarMatriz() {
    Loop 1: Processa cada linha
    ├── votos_zona: inserir 1 linha por zona
    ├── agregacaoMunicipio: SOMAR votos por municipio+turno
    ├── (candidaturas, eleições, etc.)
    
    Loop 2: Inserir votos_municipio agregados
    └── 1 linha por candidato+municipio+turno com votos SOMADOS
}
```

---

## 🎯 Exemplo Prático Completo

### CSV Original (5 linhas - mesma candidatura, municipio e turno)
```
| SQ_CANDIDATO | NM_CANDIDATO  | CD_MUNICIPIO | NM_MUNICIPIO | NR_ZONA | NR_TURNO | QT_VOTOS_NOMINAIS | DS_SIT_TOT_TURNO |
|     909      | SUZANA FRANÇA |    2700105   | BOA VISTA    |    5    |    1     |      193          | SUPLENTE         |
|     909      | SUZANA FRANÇA |    2700105   | BOA VISTA    |   10    |    1     |       87          | SUPLENTE         |
|     909      | SUZANA FRANÇA |    2700105   | BOA VISTA    |   15    |    1     |      120          | SUPLENTE         |
|     909      | SUZANA FRANÇA |    2700105   | BOA VISTA    |   22    |    1     |       65          | SUPLENTE         |
|     909      | SUZANA FRANÇA |    2700105   | BOA VISTA    |   33    |    1     |       45          | SUPLENTE         |
```

### votos_zona Resultante (5 linhas - 1 por zona)
```
| candidatura_id | zona_id | nr_turno | total_votos | ds_sit_tot_turno |
|       909      |    5    |    1     |     193     | SUPLENTE         |
|       909      |   10    |    1     |      87     | SUPLENTE         |
|       909      |   15    |    1     |     120     | SUPLENTE         |
|       909      |   22    |    1     |      65     | SUPLENTE         |
|       909      |   33    |    1     |      45     | SUPLENTE         |
```

### votos_municipio Resultante (1 linha - agregado)
```
| candidatura_id | municipio_id | nr_turno | total_votos | ds_sit_tot_turno |
|       909      |     214      |    1     |     510     | SUPLENTE         |
```

✅ **510 = 193 + 87 + 120 + 65 + 45**

---

## 🔍 Validar a Agregação

Após a importação, execute:

### 1. Ver agregação em ação
```sql
-- Ver candidato com votos em múltiplas zonas
SELECT 
  vz.candidatura_id,
  COUNT(DISTINCT vz.zona_id) as total_zonas,
  SUM(vz.total_votos) as soma_zonas,
  vm.total_votos as total_municipio,
  vm.nr_turno,
  (SUM(vz.total_votos) = vm.total_votos) as correto
FROM votos_zona vz
JOIN votos_municipio vm 
  ON vm.candidatura_id = vz.candidatura_id 
  AND vm.municipio_id = vz.municipio_id
  AND vm.nr_turno = vz.nr_turno
WHERE vz.eleicao_id = 1
GROUP BY vz.candidatura_id, vm.municipio_id, vm.nr_turno
ORDER BY vz.candidatura_id, vm.municipio_id, vm.nr_turno
LIMIT 20;
```

**Esperado:**
```
| candidatura_id | total_zonas | soma_zonas | total_municipio | nr_turno | correto |
|       909      |      5      |     510    |      510        |    1     |    1    |
|       910      |      3      |     245    |      245        |    1     |    1    |
|       909      |      5      |     540    |      540        |    2     |    1    |
```

### 2. Comparar com agregação manual
```sql
-- Soma manual de zonas
SELECT 
  candidatura_id,
  municipio_id,
  nr_turno,
  SUM(total_votos) as soma_manual
FROM votos_zona
WHERE eleicao_id = 1
GROUP BY candidatura_id, municipio_id, nr_turno
ORDER BY candidatura_id, municipio_id, nr_turno
LIMIT 10;

-- Valores em votos_municipio
SELECT 
  candidatura_id,
  municipio_id,
  nr_turno,
  total_votos
FROM votos_municipio
WHERE eleicao_id = 1
ORDER BY candidatura_id, municipio_id, nr_turno
LIMIT 10;

-- Se forem iguais, agregação está correta ✅
```

### 3. Verificar histórico de turnos
```sql
SELECT 
  c.id,
  p.nome,
  m.nome as municipio,
  vm.nr_turno,
  vm.total_votos,
  vm.ds_sit_tot_turno
FROM votos_municipio vm
JOIN candidaturas c ON c.id = vm.candidatura_id
JOIN pessoas p ON p.id = c.pessoa_id
JOIN municipios m ON m.id = vm.municipio_id
WHERE vm.eleicao_id = 1
  AND vm.candidatura_id IN (909, 910)
ORDER BY p.nome, vm.municipio_id, vm.nr_turno;
```

**Esperado:**
```
| id  | nome             | municipio   | nr_turno | total_votos | ds_sit_tot_turno |
| 909 | SUZANA FRANÇA    | BOA VISTA   |    1     |     510     | SUPLENTE         |
| 909 | SUZANA FRANÇA    | BOA VISTA   |    2     |     540     | ELEITO           |
| 909 | SUZANA FRANÇA    | FORTALEZA   |    1     |     320     | NÃO ELEITO       |
```

---

## 📋 Checklist de Implementação

- [x] Cache `$agregacaoMunicipio` criado e inicializado
- [x] Durante processamento: acumular votos por `candidatura_id:municipio_id:nr_turno`
- [x] Após loop: batch insert de dados agregados
- [x] Batch processing para evitar timeout (lotes de 1000)
- [x] updateOrInsert para evitar duplicatas
- [x] Logging de quantidade de registros inseridos

---

## 🚀 Testar a Importação

### 1. Executar script de limpeza (se houver dados antigos)
```bash
mysql -u root -p inteligenciaeleitoral < fix_constraints.sql
```

### 2. Re-importar CSV
```bash
curl -X POST http://localhost:8000/api/import/v4 \
  -F "file=@votacao_candidato_munzona_2024_RR.csv"
```

### 3. Validar com os queries acima

---

## 💡 Por Que Isso É Importante

✅ **Sem duplicatas**: Uma linha por `candidatura_id + municipio_id + nr_turno`
✅ **Votos corretos**: Soma de TODAS as zonas, não só a última
✅ **Múltiplos turnos**: Cada turno é uma linha separada
✅ **Situação rastreada**: Sabe-se a situação (ELEITO, SUPLENTE, etc) por turno
✅ **Rápido**: Agregação acontece em memória, não em BD
✅ **Seguro**: Dentro de transação, tudo ou nada

---

## 🎯 Resultado Final

```php
// Agora é possível fazer:
$votosMunicipio = DB::table('votos_municipio')
    ->where('candidatura_id', 909)
    ->where('municipio_id', 214)
    ->orderBy('nr_turno')
    ->get();

// Retorna:
// [
//   { nr_turno: 1, total_votos: 510, ds_sit_tot_turno: 'SUPLENTE' },
//   { nr_turno: 2, total_votos: 540, ds_sit_tot_turno: 'ELEITO' }
// ]
```

**Histórico completo por turno, sem duplicatas, com votos agregados corretamente!** ✅
