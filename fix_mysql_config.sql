-- ═══════════════════════════════════════════════════════════════════════════════
-- Script para Corrigir Configurações do MySQL
-- Para Importação de Eleições com Arquivo Grande
-- ═══════════════════════════════════════════════════════════════════════════════

-- ⚠️ Executar como root ou usuário com privilégios SUPER

-- 1. Aumentar max_allowed_packet (tamanho máximo de pacote)
SET GLOBAL max_allowed_packet = 67108864;  -- 64MB

-- 2. Aumentar wait_timeout (tempo de inatividade)
SET GLOBAL wait_timeout = 28800;  -- 8 horas

-- 3. Aumentar interactive_timeout
SET GLOBAL interactive_timeout = 28800;  -- 8 horas

-- 4. Configurar max_execution_time
SET GLOBAL max_execution_time = 60000;  -- 60 segundos

-- 5. Verificar se as mudanças foram aplicadas
SHOW VARIABLES LIKE 'max_allowed_packet';
SHOW VARIABLES LIKE 'wait_timeout';
SHOW VARIABLES LIKE 'interactive_timeout';
SHOW VARIABLES LIKE 'max_execution_time';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Valores Esperados após execução:
-- max_allowed_packet: 67108864
-- wait_timeout: 28800
-- interactive_timeout: 28800
-- max_execution_time: 60000
-- ═══════════════════════════════════════════════════════════════════════════════

-- ⚠️ IMPORTANTE: Estas mudanças são TEMPORÁRIAS (sessão atual)
-- Para tornar permanente, edite /etc/mysql/my.cnf ou /etc/my.cnf
-- e adicione/altere estas linhas na seção [mysqld]:
--
-- [mysqld]
-- max_allowed_packet = 67108864
-- wait_timeout = 28800
-- interactive_timeout = 28800
-- max_execution_time = 60000
--
-- Depois reinicie: sudo systemctl restart mysql
