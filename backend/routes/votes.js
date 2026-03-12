import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

// Dashboard data
router.get('/dashboard', (req, res) => {
  const db = getDb();
  const { eleicao_id, cargo_id, candidato_id, municipio_id, zona_id, partido_id } = req.query;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (eleicao_id) { whereClause += ' AND vm.eleicao_id = ?'; params.push(eleicao_id); }
  if (cargo_id) { whereClause += ' AND vm.cargo_id = ?'; params.push(cargo_id); }
  if (candidato_id) { whereClause += ' AND vm.candidato_id = ?'; params.push(candidato_id); }
  if (municipio_id) { whereClause += ' AND vm.municipio_id = ?'; params.push(municipio_id); }
  if (partido_id) { whereClause += ' AND c.partido_id = ?'; params.push(partido_id); }

  // Top candidates
  const topCandidatos = db.prepare(`
    SELECT c.id, c.numero, c.nome, p.sigla as partido_sigla, ca.descricao as cargo,
           SUM(vm.total_votos) as total_votos
    FROM votos_municipio vm
    JOIN candidatos c ON vm.candidato_id = c.id
    JOIN partidos p ON c.partido_id = p.id
    JOIN cargos ca ON vm.cargo_id = ca.id
    ${whereClause}
    GROUP BY c.id
    ORDER BY total_votos DESC
    LIMIT 20
  `).all(...params);

  // Votes by municipality (for map)
  let mapWhere = 'WHERE 1=1';
  const mapParams = [];
  if (eleicao_id) { mapWhere += ' AND vm.eleicao_id = ?'; mapParams.push(eleicao_id); }
  if (cargo_id) { mapWhere += ' AND vm.cargo_id = ?'; mapParams.push(cargo_id); }
  if (candidato_id) { mapWhere += ' AND vm.candidato_id = ?'; mapParams.push(candidato_id); }
  if (partido_id) { mapWhere += ' AND c.partido_id = ?'; mapParams.push(partido_id); }

  const votosPorMunicipio = db.prepare(`
    SELECT m.id, m.nome, m.latitude, m.longitude,
           SUM(vm.total_votos) as total_votos,
           SUM(vm.total_aptos) as total_aptos,
           SUM(vm.total_comparecimento) as total_comparecimento,
           SUM(vm.total_secoes) as total_secoes
    FROM votos_municipio vm
    JOIN municipios m ON vm.municipio_id = m.id
    JOIN candidatos c ON vm.candidato_id = c.id
    ${mapWhere}
    GROUP BY m.id
    ORDER BY total_votos DESC
  `).all(...mapParams);

  // Top zones
  let zonaWhere = 'WHERE 1=1';
  const zonaParams = [];
  if (eleicao_id) { zonaWhere += ' AND vz.eleicao_id = ?'; zonaParams.push(eleicao_id); }
  if (cargo_id) { zonaWhere += ' AND vz.cargo_id = ?'; zonaParams.push(cargo_id); }
  if (candidato_id) { zonaWhere += ' AND vz.candidato_id = ?'; zonaParams.push(candidato_id); }
  if (partido_id) { zonaWhere += ' AND c.partido_id = ?'; zonaParams.push(partido_id); }

  const topZonas = db.prepare(`
    SELECT ze.numero as zona_numero, m.nome as municipio_nome,
           SUM(vz.total_votos) as total_votos
    FROM votos_zona vz
    JOIN zonas_eleitorais ze ON vz.zona_id = ze.id
    JOIN municipios m ON ze.municipio_id = m.id
    JOIN candidatos c ON vz.candidato_id = c.id
    ${zonaWhere}
    GROUP BY ze.id
    ORDER BY total_votos DESC
    LIMIT 15
  `).all(...zonaParams);

  // Summary
  const summary = db.prepare(`
    SELECT COUNT(DISTINCT vm.candidato_id) as total_candidatos,
           COUNT(DISTINCT vm.municipio_id) as total_municipios,
           SUM(vm.total_votos) as total_votos,
           SUM(vm.total_secoes) as total_secoes
    FROM votos_municipio vm
    JOIN candidatos c ON vm.candidato_id = c.id
    ${whereClause}
  `).get(...params);

  res.json({
    topCandidatos,
    votosPorMunicipio,
    topZonas,
    summary,
  });
});

// Map data - votes by local de votacao
router.get('/map/locais', (req, res) => {
  const db = getDb();
  const { eleicao_id, cargo_id, candidato_id, municipio_id } = req.query;

  let whereClause = 'WHERE 1=1';
  const params = [];
  if (eleicao_id) { whereClause += ' AND v.eleicao_id = ?'; params.push(eleicao_id); }
  if (cargo_id) { whereClause += ' AND v.cargo_id = ?'; params.push(cargo_id); }
  if (candidato_id) { whereClause += ' AND v.candidato_id = ?'; params.push(candidato_id); }
  if (municipio_id) { whereClause += ' AND v.municipio_id = ?'; params.push(municipio_id); }

  const locais = db.prepare(`
    SELECT l.id, l.numero, l.latitude, l.longitude, m.nome as municipio_nome,
           SUM(v.votos) as total_votos, SUM(v.aptos) as total_aptos
    FROM votos v
    JOIN secoes s ON v.secao_id = s.id
    JOIN locais_votacao l ON s.local_votacao_id = l.id
    JOIN municipios m ON v.municipio_id = m.id
    ${whereClause}
    GROUP BY l.id
    ORDER BY total_votos DESC
  `).all(...params);

  res.json(locais);
});

// Detailed section data
router.get('/secoes', (req, res) => {
  const db = getDb();
  const { eleicao_id, cargo_id, candidato_id, municipio_id, zona_id } = req.query;

  let whereClause = 'WHERE 1=1';
  const params = [];
  if (eleicao_id) { whereClause += ' AND v.eleicao_id = ?'; params.push(eleicao_id); }
  if (cargo_id) { whereClause += ' AND v.cargo_id = ?'; params.push(cargo_id); }
  if (candidato_id) { whereClause += ' AND v.candidato_id = ?'; params.push(candidato_id); }
  if (municipio_id) { whereClause += ' AND v.municipio_id = ?'; params.push(municipio_id); }
  if (zona_id) { whereClause += ' AND v.zona_id = ?'; params.push(zona_id); }

  const secoes = db.prepare(`
    SELECT s.numero as secao_numero, ze.numero as zona_numero, m.nome as municipio_nome,
           v.votos, v.aptos, v.comparecimento, v.abstencoes,
           c.nome as candidato_nome, c.numero as candidato_numero, p.sigla as partido_sigla
    FROM votos v
    JOIN secoes s ON v.secao_id = s.id
    JOIN zonas_eleitorais ze ON v.zona_id = ze.id
    JOIN municipios m ON v.municipio_id = m.id
    JOIN candidatos c ON v.candidato_id = c.id
    JOIN partidos p ON c.partido_id = p.id
    ${whereClause}
    ORDER BY v.votos DESC
    LIMIT 500
  `).all(...params);

  res.json(secoes);
});

export default router;
