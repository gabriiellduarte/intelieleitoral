# 📊 População Direta de votos_municipio

## 🔄 O que Mudou

### ANTES
```
CSV → raw_candidatos → processarMatriz
                          ↓
                    (popula votos_zona)
                          ↓
                    reconstruirVotosMunicipioDaBase
                          ↓
                    (popula votos_municipio por agregação)
```

**Problema**: 2 etapas, risco de inconsistências

### DEPOIS
```
CSV → raw_candidatos → processarMatriz
                          ↓
                    (popula votos_zona)
                    (popula votos_municipio DIRETO)
                          ↓
                    Dados já agregados!
```

**Vantagem**: Tudo em uma única etapa, mais eficiente

---

## ✅ Código Alterado

No método `processarMatriz()`, agora após inserir em `votos_zona`, inserimos direto em `votos_municipio`:

```php
// 2. Criar/atualizar votos_zona
DB::table('votos_zona')->updateOrInsert(
    ['candidatura_id' => $candidaturaId, 'zona_id' => $zonaId, 'nr_turno' => $nrTurno],
    [
        'total_votos' => $totalVotos,
        'ds_sit_tot_turno' => $sitTurno,
        ...
    ]
);

// 3. ⭐ NOVO: Também popular votos_municipio direto
DB::table('votos_municipio')->updateOrInsert(
    ['candidatura_id' => $candidaturaId, 'municipio_id' => $municipioId, 'nr_turno' => $nrTurno],
    [
        'total_votos' => $totalVotos,
        'ds_sit_tot_turno' => $sitTurno,
        ...
    ]
);
```

---

## 📋 Dados Preenchidos

### votos_municipio agora tem:
- ✅ `candidatura_id` - Qual candidato
- ✅ `municipio_id` - Em qual município
- ✅ `eleicao_id` - Qual eleição
- ✅ `cargo_id` - Qual cargo
- ✅ **`nr_turno`** - Qual turno (1º ou 2º)
- ✅ `total_votos` - Votos totais do candidato no município neste turno
- ✅ **`ds_sit_tot_turno`** - Situação (ELEITO, SUPLENTE, NÃO ELEITO)
- ✅ `total_aptos`, `total_comparecimento`, `total_abstencoes` - Preenchidos com 0 por enquanto
- ✅ `importacao_id` - Rastreamento

---

## 🎯 Exemplo Prático

**Cenário**: Candidato X concorre em 2 turnos no município Y

**CSV tem**:
- Linha 10: Candidato X, Município Y, 1º turno, 500 votos, SUPLENTE
- Linha 20: Candidato X, Município Y, 2º turno, 600 votos, ELEITO

**Antes** (com 2 etapas):
```
processarMatriz → insere em votos_zona apenas
reconstruirVotosMunicipioDaBase → agrega votos_zona em votos_municipio
                                    (pode sobrescrever dados)
```

**Depois** (direto):
```
processarMatriz → insere em votos_zona E votos_municipio SIMULTANEAMENTE
                  Ambas tabelas já têm os dados corretos!
```

---

## ✅ Validar

Depois da importação, verificar que `votos_municipio` tem dados:

```sql
-- Ver votos por município (com turno)
SELECT 
  c.id as candidatura_id,
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
LIMIT 10;
```

**Resultado esperado:**
```
| candidatura_id | nome             | municipio   | nr_turno | total_votos | ds_sit_tot_turno |
|      1         | SUZANA FRANÇA    | BOA VISTA   |    1     |     193     | SUPLENTE         |
|      1         | SUZANA FRANÇA    | BOA VISTA   |    2     |     240     | ELEITO           |
|      2         | EDIVALDO SILVA   | BOA VISTA   |    1     |     100     | NÃO ELEITO       |
```

---

## 🚀 Benefícios

✅ **Mais rápido**: Uma única passagem pelos dados
✅ **Mais seguro**: Sem risco de perder dados em agregações
✅ **Mais simples**: Lógica reta, sem múltiplas etapas
✅ **Historicamente correto**: Cada turno rastreado separadamente
✅ **Com situação**: Sabe-se a situação do candidato em cada turno

---

## 📝 Checklist

- [ ] Código atualizado com nova população de votos_municipio
- [ ] Migrations executadas (turno adicionado às tabelas)
- [ ] Script SQL de limpeza executado
- [ ] Re-importar CSV
- [ ] Validar que votos_municipio está preenchido
- [ ] Validar que há registros para cada turno

**Pronto para testar!** 🎉
