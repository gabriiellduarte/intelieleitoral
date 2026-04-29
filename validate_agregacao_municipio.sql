-- ═══════════════════════════════════════════════════════════════════════════════
-- Script para Validar Agregação de votos_municipio
-- ═══════════════════════════════════════════════════════════════════════════════
-- Este script verifica se votos_municipio tem votos SOMADOS de todas as zonas

-- ═══════════════════════════════════════════════════════════════════════════════
-- TESTE 1: Comparar soma de votos_zona vs votos_municipio
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
    'COMPARAÇÃO votos_zona vs votos_municipio' as teste,
    COUNT(*) as total_registros,
    SUM(CASE WHEN soma_zonas = total_municipio THEN 1 ELSE 0 END) as corretos,
    SUM(CASE WHEN soma_zonas != total_municipio THEN 1 ELSE 0 END) as incorretos,
    CASE
        WHEN SUM(CASE WHEN soma_zonas != total_municipio THEN 1 ELSE 0 END) = 0 THEN '✅ CORRETO'
        ELSE '❌ ERRO: Votos não conferem'
    END as status
FROM (
    SELECT
        vz.candidatura_id,
        vz.municipio_id,
        vz.nr_turno,
        SUM(vz.total_votos) as soma_zonas,
        (SELECT vm.total_votos
         FROM votos_municipio vm
         WHERE vm.candidatura_id = vz.candidatura_id
           AND vm.municipio_id = vz.municipio_id
           AND vm.nr_turno = vz.nr_turno
         LIMIT 1) as total_municipio,
        COUNT(DISTINCT vz.zona_id) as total_zonas
    FROM votos_zona vz
    WHERE vz.fonte = 'base'
    GROUP BY vz.candidatura_id, vz.municipio_id, vz.nr_turno
) verificacao;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TESTE 2: Detalhe de candidatos com votos em múltiplas zonas
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
    'CANDIDATOS COM MÚLTIPLAS ZONAS' as teste,
    vz.candidatura_id,
    p.nome,
    m.nome as municipio,
    vz.nr_turno,
    COUNT(DISTINCT vz.zona_id) as total_zonas,
    SUM(vz.total_votos) as soma_zonas,
    (SELECT vm.total_votos FROM votos_municipio vm
     WHERE vm.candidatura_id = vz.candidatura_id
       AND vm.municipio_id = vz.municipio_id
       AND vm.nr_turno = vz.nr_turno) as total_municipio,
    CASE
        WHEN SUM(vz.total_votos) = (SELECT vm.total_votos FROM votos_municipio vm
                                   WHERE vm.candidatura_id = vz.candidatura_id
                                     AND vm.municipio_id = vz.municipio_id
                                     AND vm.nr_turno = vz.nr_turno)
        THEN '✅'
        ELSE '❌'
    END as status
FROM votos_zona vz
JOIN candidaturas c ON c.id = vz.candidatura_id
JOIN pessoas p ON p.id = c.pessoa_id
JOIN municipios m ON m.id = vz.municipio_id
WHERE vz.fonte = 'base'
GROUP BY vz.candidatura_id, vz.municipio_id, vz.nr_turno, p.nome, m.nome
HAVING COUNT(DISTINCT vz.zona_id) > 1
ORDER BY p.nome, m.nome, vz.nr_turno
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TESTE 3: Histórico de turnos por candidato
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
    'HISTÓRICO DE TURNOS' as teste,
    p.nome,
    m.nome as municipio,
    vm.nr_turno,
    vm.total_votos,
    vm.ds_sit_tot_turno as situacao,
    (SELECT COUNT(DISTINCT zona_id) FROM votos_zona vz
     WHERE vz.candidatura_id = vm.candidatura_id
       AND vz.municipio_id = vm.municipio_id
       AND vz.nr_turno = vm.nr_turno) as total_zonas
FROM votos_municipio vm
JOIN candidaturas c ON c.id = vm.candidatura_id
JOIN pessoas p ON p.id = c.pessoa_id
JOIN municipios m ON m.id = vm.municipio_id
WHERE vm.fonte = 'base' OR vm.fonte IS NULL
ORDER BY p.nome, m.nome, vm.nr_turno
LIMIT 30;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TESTE 4: Contagem de registros por turno
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
    'DISTRIBUIÇÃO POR TURNO' as teste,
    '1º Turno' as descricao,
    COUNT(*) as total_votos_zona,
    (SELECT COUNT(*) FROM votos_municipio WHERE nr_turno = 1) as total_votos_municipio,
    SUM(total_votos) as soma_votos_zona,
    (SELECT SUM(total_votos) FROM votos_municipio WHERE nr_turno = 1) as soma_votos_municipio
FROM votos_zona
WHERE nr_turno = 1 AND fonte = 'base'

UNION ALL

SELECT
    'DISTRIBUIÇÃO POR TURNO' as teste,
    '2º Turno' as descricao,
    COUNT(*) as total_votos_zona,
    (SELECT COUNT(*) FROM votos_municipio WHERE nr_turno = 2) as total_votos_municipio,
    SUM(total_votos) as soma_votos_zona,
    (SELECT SUM(total_votos) FROM votos_municipio WHERE nr_turno = 2) as soma_votos_municipio
FROM votos_zona
WHERE nr_turno = 2 AND fonte = 'base';

-- ═══════════════════════════════════════════════════════════════════════════════
-- TESTE 5: Duplicatas em votos_municipio
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
    'VERIFICAÇÃO DE DUPLICATAS' as teste,
    candidatura_id,
    municipio_id,
    nr_turno,
    COUNT(*) as total
FROM votos_municipio
WHERE fonte = 'base' OR fonte IS NULL
GROUP BY candidatura_id, municipio_id, nr_turno
HAVING COUNT(*) > 1
LIMIT 10;

-- Se nenhum resultado, significa ✅ sem duplicatas

-- ═══════════════════════════════════════════════════════════════════════════════
-- TESTE 6: Resumo Final
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
    'RESUMO FINAL' as teste,
    (SELECT COUNT(*) FROM votos_zona WHERE fonte = 'base') as total_votos_zona,
    (SELECT COUNT(*) FROM votos_municipio WHERE fonte = 'base' OR fonte IS NULL) as total_votos_municipio,
    (SELECT COUNT(DISTINCT candidatura_id, municipio_id, nr_turno) FROM votos_zona WHERE fonte = 'base') as combinacoes_unicas,
    CASE
        WHEN (SELECT COUNT(*) FROM votos_municipio vm WHERE fonte = 'base' OR fonte IS NULL) =
             (SELECT COUNT(DISTINCT candidatura_id, municipio_id, nr_turno) FROM votos_zona WHERE fonte = 'base')
        THEN '✅ CORRETO: votos_municipio tem 1 linha por combinação única'
        ELSE '❌ ERRO: Número de registros não confere'
    END as status;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Se todos os testes passarem:
-- ✅ votos_municipio está CORRETAMENTE agregado
-- ✅ Sem duplicatas
-- ✅ Votos somados de todas as zonas
-- ✅ Histórico de múltiplos turnos preservado
-- ═══════════════════════════════════════════════════════════════════════════════
