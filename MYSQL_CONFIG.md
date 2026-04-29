# 🔧 Configuração do MySQL para Importação

## ⚠️ Erro: "MySQL server has gone away"

Este erro ocorre quando:
1. A query é muito grande (muitos registros de uma vez)
2. O `max_allowed_packet` é pequeno (padrão: 4MB)
3. Timeout de conexão foi atingido

---

## ✅ Solução

### 1. Aumentar `max_allowed_packet` (Recomendado)

#### Opção A: Temporário (sessão atual)
```sql
SET GLOBAL max_allowed_packet = 67108864;  -- 64MB
```

#### Opção B: Permanente (recomendado)

**No arquivo `my.cnf` ou `my.ini`:**

Encontre a seção `[mysqld]` e adicione/altere:

```ini
[mysqld]
max_allowed_packet = 67108864  # 64MB (padrão é 4MB)
```

Depois reinicie o MySQL:

```bash
# macOS
mysql.server restart

# Linux
sudo systemctl restart mysql

# Windows
net stop MySQL80
net start MySQL80
```

#### Opção C: Via Docker

Se estiver usando Docker, adicione ao `docker-compose.yml`:

```yaml
services:
  mysql:
    image: mysql:8.0
    command: --max_allowed_packet=67108864
    environment:
      MYSQL_ROOT_PASSWORD: root
```

### 2. Verificar Configuração Atual

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
```

Deve retornar algo como:
```
+--------------------+----------+
| Variable_name      | Value    |
+--------------------+----------+
| max_allowed_packet | 67108864 |
+--------------------+----------+
```

---

## 📊 Tamanhos Recomendados

| Tamanho de Arquivo | max_allowed_packet | Recomendação |
|-------------------|------------------|--------------|
| < 10MB | 16MB | Mínimo |
| 10-50MB | 32MB | Bom |
| 50-100MB | 64MB | Ótimo |
| > 100MB | 128MB | Máximo |

---

## 🔍 Outras Configurações Importantes

```sql
-- Aumentar timeout de conexão (padrão: 600s)
SET GLOBAL wait_timeout = 28800;
SET GLOBAL interactive_timeout = 28800;

-- Aumentar tempo máximo de execução de query
SET GLOBAL max_execution_time = 60000;  -- 60 segundos

-- Ver todas as configurações relacionadas
SHOW VARIABLES LIKE '%timeout%';
SHOW VARIABLES LIKE '%packet%';
SHOW VARIABLES LIKE '%memory%';
```

---

## 🐳 Arquivo Docker Completo (Recomendado)

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: mysql_inteligencia_eleitoral
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: inteligenciaeleitoral
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: >
      --max_allowed_packet=67108864
      --wait_timeout=28800
      --interactive_timeout=28800
      --default-storage-engine=InnoDB
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci

volumes:
  mysql_data:
```

Executar:
```bash
docker-compose up -d
```

---

## 📝 Arquivo `.env` (Laravel)

Se necessário, você pode configurar também:

```env
# Timeout de conexão PHP
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=inteligenciaeleitoral
DB_USERNAME=root
DB_PASSWORD=root

# Não há timeout aqui no .env, mas pode ser configurado no my.cnf
```

---

## 🔨 Troubleshooting

### Erro: "Can't connect after reconnect"
```bash
# Reiniciar MySQL
sudo systemctl restart mysql
```

### Erro: "Packets out of order"
```sql
-- Redefinir conexão
SET SESSION max_allowed_packet = 67108864;
```

### Erro: "Lost connection to MySQL server"
- Aumentar `max_allowed_packet`
- Aumentar `wait_timeout`
- Verificar se MySQL está rodando: `mysql -u root -p -e "SELECT 1;"`

---

## ✅ Checklist de Aplicação

- [ ] Editar `my.cnf` ou `my.ini`
- [ ] Aumentar `max_allowed_packet` para **64MB ou mais**
- [ ] Reiniciar MySQL
- [ ] Verificar com: `SHOW VARIABLES LIKE 'max_allowed_packet';`
- [ ] Tentar importação novamente

---

## 🚀 Testar Após Configuração

```bash
# Se estiver usando Laravel
php artisan migrate  # Recria tabelas se necessário

# Testar importação com arquivo pequeno primeiro
curl -X POST http://localhost:8000/api/import/v4 \
  -F "file=@votacao_candidato_munzona_2024_RR.csv"
```

---

## 📋 Resumo

**O que foi alterado no código:**
- Reduzido tamanho do lote de **10.000 para 1.000** registros
- Adicionada reconexão automática se conexão cair
- Adicionado logging para rastrear progresso

**O que você deve fazer:**
1. Aumentar `max_allowed_packet` no MySQL para **64MB ou mais**
2. Reiniciar MySQL
3. Tentar importação novamente

Depois disso deve funcionar! ✅
