# 🔧 Resolução: Erros de Constraint e Turno

## 🔴 Problemas Identificados

1. **Erro de constraint**: `Duplicate entry '909-59' for key 'votos_zona_candidatura_id_zona_id_unique'`
   - Causa: Índice único antigo ainda existe (não foi dropado corretamente pela migration)

2. **Falta de coluna**: Tabela `eleicoes` não tem `cd_eleicao`
   - Causa: Migration não adicionou a coluna

---

## ✅ Solução Rápida (Recomendada)

### Passo 1: Executar Script de Limpeza
```bash
mysql -u root -p inteligenciaeleitoral < fix_constraints.sql
```

Ou execute manualmente no MySQL Workbench/phpMyAdmin:

```sql
SET FOREIGN_KEY_CHECKS=0;

-- Dropar índices antigos problemáticos
ALTER TABLE votos_zona DROP INDEX IF EXISTS votos_zona_candidatura_id_zona_id_unique;
ALTER TABLE votos_municipio DROP INDEX IF EXISTS votos_municipio_candidatura_id_municipio_id_unique;

-- Adicionar CD_ELEICAO à eleicoes
ALTER TABLE eleicoes ADD COLUMN cd_eleicao INT NULLABLE AFTER ano;

-- Criar índices novos com turno
ALTER TABLE votos_zona ADD UNIQUE KEY votos_zona_candidatura_id_zona_id_turno_unique
  (candidatura_id, zona_id, nr_turno);

ALTER TABLE votos_municipio ADD UNIQUE KEY votos_municipio_candidatura_id_municipio_id_turno_unique
  (candidatura_id, municipio_id, nr_turno);

SET FOREIGN_KEY_CHECKS=1;
```

### Passo 2: Rodar as Migrations
```bash
php artisan migrate
```

Deve executar:
- `2026_04_18_000021_add_turno_to_votos_municipio_table.php`
- `2026_04_18_000022_add_cd_eleicao_to_eleicoes_table.php`

### Passo 3: Deletar Dados Antigos (Opcional)
Se a importação anterior falhou parcialmente:

```bash
DELETE FROM raw_candidatos WHERE importacao_id = 1;
DELETE FROM votos_zona WHERE importacao_id = 1;
DELETE FROM votos_municipio WHERE importacao_id = 1;
DELETE FROM importacoes WHERE id = 1;
```

### Passo 4: Re-importar
```bash
curl -X POST http://localhost:8000/api/import/v4 \
  -F "file=@votacao_candidato_munzona_2024_RR.csv"
```

---

## 📊 Validar Resultado

Depois de aplicar, verificar:

### Votos com turno
```sql
SELECT nr_turno, total_votos, ds_sit_tot_turno 
FROM votos_zona 
WHERE candidatura_id = 909 AND zona_id = 59
ORDER BY nr_turno;
```

Deve retornar 2 linhas (1º e 2º turno) ou mais, não duplicatas.

### Eleições com CD_ELEICAO
```sql
SELECT * FROM eleicoes LIMIT 5;
```

Deve mostrar coluna `cd_eleicao`.

---

## 🛠️ Se Ainda Houver Problema

### Erro: "Cannot add or update a child row"
```bash
# Limpar tudo e começar do zero
php artisan migrate:refresh

# Re-importar
curl -X POST http://localhost:8000/api/import/v4 \
  -F "file=@votacao_candidato_munzona_2024_RR.csv"
```

### Erro: "Duplicate key"
```sql
-- Ver dados duplicados
SELECT candidatura_id, zona_id, nr_turno, COUNT(*) 
FROM votos_zona 
GROUP BY candidatura_id, zona_id, nr_turno 
HAVING COUNT(*) > 1;

-- Se houver, deletar importação problemática e re-importar
DELETE FROM votos_zona WHERE importacao_id = 1;
DELETE FROM raw_candidatos WHERE importacao_id = 1;
```

---

## 📝 Checklist

- [ ] Executar `fix_constraints.sql`
- [ ] Rodar `php artisan migrate`
- [ ] Validar índices com `SHOW INDEX FROM votos_zona`
- [ ] Validar coluna cd_eleicao com `DESCRIBE eleicoes`
- [ ] Deletar dados antigos se necessário
- [ ] Re-importar CSV
- [ ] Verificar que agora tem 2 registros por candidato (1º e 2º turno)

---

## 🎯 Esperado após Resolução

✅ Tabela `votos_zona` com índice único em `(candidatura_id, zona_id, nr_turno)`
✅ Tabela `votos_municipio` com índice único em `(candidatura_id, municipio_id, nr_turno)`
✅ Coluna `cd_eleicao` em `eleicoes`
✅ Sem mais erros de constraint
✅ Histórico completo de votos por turno

Agora sim deve funcionar! 🚀
