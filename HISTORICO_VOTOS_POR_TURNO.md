# 🗳️ Histórico de Votos por Turno

## 🔴 Problema Identificado

Você tinha dados de **1º e 2º turno** no CSV, mas a importação estava:
- ✅ Importando votos do 1º turno corretamente
- ❌ **Sobrescrevendo** com votos do 2º turno (perdendo histórico do 1º)

**Por quê?** A tabela `votos_zona` não tinha a coluna `NR_TURNO` na chave única.

```
ANTES (problema):
┌─────────────────────────────────────────┐
│ candidatura_id │ zona_id │ total_votos │
├────────────────┼─────────┼─────────────┤
│       1        │    5    │     193     │  ← 1º turno
│       1        │    5    │     240     │  ← 2º turno (SOBRESCREVE!)
└─────────────────────────────────────────┘
```

## ✅ Solução Implementada

Adicionar **NR_TURNO** e **DS_SIT_TOT_TURNO** às tabelas de votos:

```
DEPOIS (correto):
┌──────────────┬─────────┬──────────┬──────────────────────┐
│ candidatura  │ zona_id │ nr_turno │ total_votos │ status │
├──────────────┼─────────┼──────────┼─────────────┼────────┤
│       1      │    5    │    1     │     193     │ SUPLENTE
│       1      │    5    │    2     │     240     │ ELEITO
└──────────────┴─────────┴──────────┴─────────────┴────────┘
```

---

## 📝 Migrations Criadas

### 1. `2026_04_18_000020_add_turno_to_votos_zona_table.php`
Adiciona a `votos_zona`:
- ✅ `nr_turno` - Número do turno (1 ou 2)
- ✅ `ds_sit_tot_turno` - Situação final (ELEITO, SUPLENTE, NÃO ELEITO, etc)
- ✅ Atualiza chave única para `[candidatura_id, zona_id, nr_turno]`

### 2. `2026_04_18_000021_add_turno_to_votos_municipio_table.php`
Adiciona a `votos_municipio`:
- ✅ `nr_turno` - Número do turno
- ✅ `ds_sit_tot_turno` - Situação final
- ✅ Atualiza chave única para `[candidatura_id, municipio_id, nr_turno]`

---

## 🔄 O que foi Alterado no Código

### Service (`ImportadorService.php`)

**Antes:**
```php
DB::table('votos_zona')->updateOrInsert(
    ['candidatura_id' => $candidaturaId, 'zona_id' => $zonaId],
    ['total_votos' => 193, ...]
);
```

**Depois:**
```php
$nrTurno = (int) ($raw->NR_TURNO ?? 1);

DB::table('votos_zona')->updateOrInsert(
    ['candidatura_id' => $candidaturaId, 'zona_id' => $zonaId, 'nr_turno' => $nrTurno],
    [
        'nr_turno'        => $nrTurno,
        'total_votos'     => 193,
        'ds_sit_tot_turno'=> 'SUPLENTE',  // ⭐ Novo!
        ...
    ]
);
```

---

## 📊 Exemplo Prático

### Cenário: Candidato concorre em 1º e 2º turno

**CSV tem:**
- Linha 42: SUZANA FRANÇA - 1º turno - 193 votos - SUPLENTE
- Linha 85: SUZANA FRANÇA - 2º turno - 240 votos - ELEITO

**Antes (problema):**
```sql
SELECT * FROM votos_zona WHERE candidatura_id = 1;

-- Retorna apenas o 2º turno (193 foi perdido!)
| candidatura_id | zona_id | nr_turno | total_votos |
|      1         |    5    |    1     |     240     |
```

**Depois (correto):**
```sql
SELECT * FROM votos_zona WHERE candidatura_id = 1;

-- Retorna AMBOS os turnos!
| candidatura_id | zona_id | nr_turno | total_votos | ds_sit_tot_turno |
|      1         |    5    |    1     |     193     | SUPLENTE         |
|      1         |    5    |    2     |     240     | ELEITO           |
```

---

## 🚀 Como Aplicar

### 1. Executar as Migrations
```bash
php artisan migrate
```

Isso vai:
- Adicionar colunas `nr_turno` e `ds_sit_tot_turno`
- Atualizar as chaves únicas
- Manter dados existentes com `nr_turno = 1` (padrão)

### 2. Deletar dados antigos (se houver)
```bash
# Opcional: se quiser re-importar tudo
php artisan migrate:rollback --step=2  # Desfaz as 2 últimas migrations
php artisan migrate                    # Re-executa
```

### 3. Re-importar CSV
```bash
curl -X POST http://localhost:8000/api/import/v4 \
  -F "file=@votacao_candidato_munzona_2024_RR.csv"
```

---

## 🔍 Validar Resultado

Depois de importar, verificar:

### Votos por zona (com turno)
```sql
SELECT 
  c.id as candidatura_id,
  p.nome,
  vz.nr_turno,
  vz.total_votos,
  vz.ds_sit_tot_turno,
  COUNT(DISTINCT vz.zona_id) as total_zonas
FROM votos_zona vz
JOIN candidaturas c ON c.id = vz.candidatura_id
JOIN pessoas p ON p.id = c.pessoa_id
WHERE vz.eleicao_id = 1
GROUP BY c.id, p.nome, vz.nr_turno, vz.total_votos, vz.ds_sit_tot_turno
ORDER BY p.nome, vz.nr_turno;
```

**Resultado esperado:**
```
| candidatura_id | nome             | nr_turno | total_votos | ds_sit_tot_turno | total_zonas |
|      1         | SUZANA FRANÇA    |    1     |     193     | SUPLENTE         |      5      |
|      1         | SUZANA FRANÇA    |    2     |     240     | ELEITO           |      5      |
|      2         | EDIVALDO SILVA   |    1     |     215     | NÃO ELEITO       |      2      |
```

### Votos por município (com turno)
```sql
SELECT 
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
ORDER BY p.nome, vm.nr_turno;
```

---

## 💡 O que Isso Permite

✅ **Histórico completo** de votos por turno
✅ **Análise de evolução** (votos 1º turno vs 2º turno)
✅ **Rastrear situação** do candidato em cada turno
✅ **Não perder dados** quando há múltiplos turnos

---

## 📋 Checklist

- [ ] Executar `php artisan migrate`
- [ ] Validar que novas colunas foram criadas
- [ ] Re-importar CSV
- [ ] Verificar que ambos os turnos aparecem
- [ ] Validar DS_SIT_TOT_TURNO está preenchido corretamente

---

## 🚨 Importante

Se você já tinha dados importados **antes dessa mudança**:

1. **Opção A: Manter dados antigos**
   - Os dados existentes vão ter `nr_turno = 1` (padrão)
   - Novos dados de turno 2 vão ser criados como registros novos
   - ✅ Sem perda de dados

2. **Opção B: Re-importar tudo**
   ```bash
   # Deletar dados antigos
   DELETE FROM votos_zona WHERE importacao_id = 1;
   DELETE FROM votos_municipio WHERE importacao_id = 1;
   
   # Re-importar
   curl -X POST http://localhost:8000/api/import/v4 \
     -F "file=@votacao_candidato_munzona_2024_RR.csv"
   ```

---

## 🎯 Resultado Final

Você agora pode:

```php
// Ver todos os votos de um candidato por turno
$votos = DB::table('votos_zona')
    ->where('candidatura_id', 1)
    ->orderBy('nr_turno')
    ->get();

foreach ($votos as $voto) {
    echo "Turno {$voto->nr_turno}: {$voto->total_votos} votos ({$voto->ds_sit_tot_turno})\n";
}

// Resultado:
// Turno 1: 193 votos (SUPLENTE)
// Turno 2: 240 votos (ELEITO)
```

**Problema resolvido!** ✅
