-- ═══════════════════════════════════════════════════════════════════════════════
-- Script para Limpar Constraints e Índices Problemáticos
-- ═══════════════════════════════════════════════════════════════════════════════

-- ⚠️ Executar como root ou usuário com privilégios

-- Passo 1: Desabilitar verificação de foreign keys
SET FOREIGN_KEY_CHECKS=0;

-- Passo 2: Dropar índice único antigo de votos_zona (se existir)
-- Este é o culpado do erro "Duplicate entry"
ALTER TABLE votos_zona DROP INDEX IF EXISTS votos_zona_candidatura_id_zona_id_unique;

-- Passo 3: Dropar índice único antigo de votos_municipio (se existir)
ALTER TABLE votos_municipio DROP INDEX IF EXISTS votos_municipio_candidatura_id_municipio_id_unique;

-- Passo 4: Reabilitar verificação de foreign keys
SET FOREIGN_KEY_CHECKS=1;

-- Passo 5: Adicionar CD_ELEICAO à tabela eleicoes (se não existir)
ALTER TABLE eleicoes ADD COLUMN cd_eleicao INT NULLABLE AFTER ano;

-- Passo 6: Verificar se os índices novos com turno existem
-- Se não existirem, criar:
ALTER TABLE votos_zona ADD UNIQUE KEY IF NOT EXISTS votos_zona_candidatura_id_zona_id_turno_unique
  (candidatura_id, zona_id, nr_turno);

ALTER TABLE votos_municipio ADD UNIQUE KEY IF NOT EXISTS votos_municipio_candidatura_id_municipio_id_turno_unique
  (candidatura_id, municipio_id, nr_turno);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Validar mudanças
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ver índices de votos_zona
SHOW INDEX FROM votos_zona;

-- Ver índices de votos_municipio
SHOW INDEX FROM votos_municipio;

-- Ver colunas de eleicoes
DESCRIBE eleicoes;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Se tudo funcionou, você verá:
-- - votos_zona: índice único em (candidatura_id, zona_id, nr_turno)
-- - votos_municipio: índice único em (candidatura_id, municipio_id, nr_turno)
-- - eleicoes: coluna cd_eleicao adicionada
-- ═══════════════════════════════════════════════════════════════════════════════
