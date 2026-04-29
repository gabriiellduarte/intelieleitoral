# 🔧 Corrigir Erro: "MySQL server has gone away"

## 📍 O Problema

```
SQLSTATE[HY000]: General error: 2006 MySQL server has gone away
```

Isso significa: **A conexão MySQL foi fechada enquanto você estava importando**.

---

## ✅ Solução Rápida (2 minutos)

### Passo 1: Executar Script SQL

Abra seu cliente MySQL (MySQL Workbench, phpMyAdmin, terminal, etc) e execute:

```sql
SET GLOBAL max_allowed_packet = 67108864;
SET GLOBAL wait_timeout = 28800;
```

Ou use o script pronto:

```bash
# Via MySQL CLI
mysql -u root -p < fix_mysql_config.sql

# Substituindo valores
mysql -u root -pSEU_PASSWORD inteligenciaeleitoral < fix_mysql_config.sql
```

### Passo 2: Tentar Importação Novamente

```bash
curl -X POST http://seu-dominio/api/import/v4 \
  -F "file=@votacao_candidato_munzona_2024_RR.csv"
```

---

## 🔍 Verificar Configuração

```sql
-- Mostrar valores atuais
SHOW VARIABLES LIKE 'max_allowed_packet';
SHOW VARIABLES LIKE 'wait_timeout';
```

Deve retornar:
```
max_allowed_packet: 67108864  ✅
wait_timeout: 28800           ✅
```

---

## 🛠️ Se Ainda Não Funcionar

### Opção A: Aumentar Ainda Mais

```sql
SET GLOBAL max_allowed_packet = 134217728;  -- 128MB
SET GLOBAL wait_timeout = 36000;            -- 10 horas
```

### Opção B: Fazer Permanente (Recomendado)

1. Encontre o arquivo `my.cnf`:
   ```bash
   # macOS com Homebrew
   /usr/local/etc/my.cnf
   
   # Linux
   /etc/mysql/my.cnf
   
   # Windows
   C:\ProgramData\MySQL\MySQL Server 8.0\my.ini
   ```

2. Edite e adicione na seção `[mysqld]`:
   ```ini
   [mysqld]
   max_allowed_packet = 67108864
   wait_timeout = 28800
   ```

3. Reinicie MySQL:
   ```bash
   # macOS
   brew services restart mysql
   
   # Linux
   sudo systemctl restart mysql
   
   # Windows
   net stop MySQL80 && net start MySQL80
   ```

4. Verifique:
   ```bash
   mysql -u root -p -e "SHOW VARIABLES LIKE 'max_allowed_packet';"
   ```

---

## 📝 Alterações Feitas no Código

O arquivo `ImportadorService.php` foi atualizado para:

✅ **Reduzir tamanho do lote** (10.000 → 1.000)
```php
$tamanhoLote = 1000; // Era 10000
```

✅ **Adicionar reconexão automática**
```php
if (strpos($e->getMessage(), 'gone away') !== false) {
    DB::reconnect();
    DB::table('raw_candidatos')->insert($lote);
}
```

✅ **Adicionar logging**
```php
\Log::info("Importar: {$totalLinhas} linhas processadas");
```

---

## 📊 Checklist de Resolução

- [ ] Executar `SET GLOBAL max_allowed_packet = 67108864;`
- [ ] Verificar com `SHOW VARIABLES LIKE 'max_allowed_packet';`
- [ ] Tentar importação novamente
- [ ] Se sucesso → Tornar permanente (editar `my.cnf`)
- [ ] Se falha → Aumentar mais (128MB) e tentar novamente

---

## 🚀 Próxima Tentativa

Depois de executar o script SQL:

```bash
# Terminal/PowerShell
curl -X POST http://localhost:8000/api/import/v4 \
  -F "file=@votacao_candidato_munzona_2024_RR.csv"
```

Deve retornar algo como:
```json
{
  "success": true,
  "importacao_id": 1,
  "total_linhas": 1234,
  "importados": 1150,
  "erros": 84
}
```

---

## 💡 Por que isso aconteceu

1. CSV grande (muitos registros)
2. Tentando inserir 10.000 registros por vez
3. MySQL timeout padrão (4MB max_allowed_packet)
4. Conexão encerrada pelo servidor

**Solução:**
- Inserir em lotes menores (1.000 em vez de 10.000)
- Aumentar limite do MySQL (4MB → 64MB)
- Reconectar automaticamente se cair

---

## 📞 Se Ainda Tiver Problemas

1. Verificar logs do MySQL:
   ```bash
   tail -f /var/log/mysql/error.log
   ```

2. Verificar todas as configurações:
   ```sql
   SHOW VARIABLES LIKE 'max%';
   SHOW VARIABLES LIKE '%timeout%';
   ```

3. Testar com arquivo menor primeiro (primeiras 100 linhas)

---

**Esperado que agora funcione! ✅**
