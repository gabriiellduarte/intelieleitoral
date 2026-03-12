import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

// Compare two candidates
router.get('/', (req, res) => {
  const db = getDb();
  const { candidato_a, candidato_b } = req.query;

  if (!candidato_a || !candidato_b) {
    return res.status(400).json({ error: 'candidato_a e candidato_b são obrigatórios' });
  }

  // Get candidate info
  const getCandidate = (id) => db.prepare(`
    SELECT c.*, p.sigla as partido_sigla, p.nome as partido_nome,
           ca.descricao as cargo_descricao, e.ano as eleicao_ano
    FROM candidatos c
    JOIN partidos p ON c.partido_id = p.id
    JOIN cargos ca ON c.cargo_id = ca.id
    JOIN eleicoes e ON c.eleicao_id = e.id
    WHERE c.id = ?
  `).get(id);

  const candA = getCandidate(candidato_a);
  const candB = getCandidate(candidato_b);

  if (!candA || !candB) {
    return res.status(404).json({ error: 'Candidato não encontrado' });
  }

  // Votes by municipality for each candidate
  const getVotesByMunicipio = (id) => db.prepare(`
    SELECT vm.municipio_id, m.nome as municipio_nome, m.latitude, m.longitude,
           vm.total_votos, vm.total_aptos, vm.total_comparecimento
    FROM votos_municipio vm
    JOIN municipios m ON vm.municipio_id = m.id
    WHERE vm.candidato_id = ?
    ORDER BY m.nome
  `).all(id);

  const votosA = getVotesByMunicipio(candidato_a);
  const votosB = getVotesByMunicipio(candidato_b);

  // Merge municipality data
  const munMap = new Map();
  for (const v of votosA) {
    munMap.set(v.municipio_id, {
      municipio_id: v.municipio_id,
      municipio_nome: v.municipio_nome,
      latitude: v.latitude,
      longitude: v.longitude,
      votos_a: v.total_votos,
      votos_b: 0,
      aptos: v.total_aptos,
    });
  }
  for (const v of votosB) {
    if (munMap.has(v.municipio_id)) {
      munMap.get(v.municipio_id).votos_b = v.total_votos;
    } else {
      munMap.set(v.municipio_id, {
        municipio_id: v.municipio_id,
        municipio_nome: v.municipio_nome,
        latitude: v.latitude,
        longitude: v.longitude,
        votos_a: 0,
        votos_b: v.total_votos,
        aptos: v.total_aptos,
      });
    }
  }

  const comparison = Array.from(munMap.values()).map(m => ({
    ...m,
    diferenca: m.votos_a - m.votos_b,
    vencedor: m.votos_a > m.votos_b ? 'A' : m.votos_b > m.votos_a ? 'B' : 'EMPATE',
    percentual_a: m.votos_a + m.votos_b > 0 ? ((m.votos_a / (m.votos_a + m.votos_b)) * 100).toFixed(1) : 0,
    percentual_b: m.votos_a + m.votos_b > 0 ? ((m.votos_b / (m.votos_a + m.votos_b)) * 100).toFixed(1) : 0,
  }));

  // Totals
  const totalA = votosA.reduce((s, v) => s + v.total_votos, 0);
  const totalB = votosB.reduce((s, v) => s + v.total_votos, 0);

  res.json({
    candidatoA: candA,
    candidatoB: candB,
    totalA,
    totalB,
    diferenca: totalA - totalB,
    comparison: comparison.sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca)),
    municipiosA: comparison.filter(c => c.vencedor === 'A').length,
    municipiosB: comparison.filter(c => c.vencedor === 'B').length,
  });
});

// Strategic analysis for a candidate
router.get('/estrategia/:candidato_id', (req, res) => {
  const db = getDb();
  const { candidato_id } = req.params;

  const candidato = db.prepare(`
    SELECT c.*, p.sigla as partido_sigla, ca.descricao as cargo_descricao, e.ano
    FROM candidatos c
    JOIN partidos p ON c.partido_id = p.id
    JOIN cargos ca ON c.cargo_id = ca.id
    JOIN eleicoes e ON c.eleicao_id = e.id
    WHERE c.id = ?
  `).get(candidato_id);

  if (!candidato) return res.status(404).json({ error: 'Candidato não encontrado' });

  // Get all votes for this candidate's election/cargo
  const totalPorMunicipio = db.prepare(`
    SELECT m.id as municipio_id, m.nome, m.latitude, m.longitude,
           SUM(vm.total_votos) as total_geral, SUM(vm.total_aptos) as total_aptos
    FROM votos_municipio vm
    JOIN municipios m ON vm.municipio_id = m.id
    WHERE vm.eleicao_id = ? AND vm.cargo_id = ?
    GROUP BY m.id
  `).all(candidato.eleicao_id, candidato.cargo_id);

  const votosCandidato = db.prepare(`
    SELECT vm.municipio_id, vm.total_votos
    FROM votos_municipio vm
    WHERE vm.candidato_id = ?
  `).all(candidato_id);

  const votosMap = new Map(votosCandidato.map(v => [v.municipio_id, v.total_votos]));

  const analise = totalPorMunicipio.map(m => {
    const votosCand = votosMap.get(m.municipio_id) || 0;
    const percentual = m.total_geral > 0 ? (votosCand / m.total_geral * 100) : 0;
    return {
      municipio_id: m.municipio_id,
      nome: m.nome,
      latitude: m.latitude,
      longitude: m.longitude,
      votos_candidato: votosCand,
      votos_total: m.total_geral,
      aptos: m.total_aptos,
      percentual: parseFloat(percentual.toFixed(2)),
    };
  }).sort((a, b) => b.percentual - a.percentual);

  // Classify municipalities
  const avgPercentual = analise.reduce((s, a) => s + a.percentual, 0) / analise.length;

  const redutos = analise.filter(a => a.percentual > avgPercentual * 1.5);
  const competitivos = analise.filter(a => a.percentual >= avgPercentual * 0.7 && a.percentual <= avgPercentual * 1.5);
  const baixaVotacao = analise.filter(a => a.percentual < avgPercentual * 0.7);

  // Potencial de crescimento (municípios grandes com baixo percentual)
  const crescimento = analise
    .filter(a => a.percentual < avgPercentual && a.aptos > 1000)
    .sort((a, b) => b.aptos - a.aptos);

  res.json({
    candidato,
    analise,
    mediaPercentual: parseFloat(avgPercentual.toFixed(2)),
    redutos,
    competitivos,
    baixaVotacao,
    crescimento,
  });
});

export default router;
