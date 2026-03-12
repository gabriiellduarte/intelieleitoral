import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

// List candidates with filters
router.get('/', (req, res) => {
  const db = getDb();
  const { eleicao_id, cargo_id, partido_id, numero, search } = req.query;

  let query = `
    SELECT c.*, p.sigla as partido_sigla, p.nome as partido_nome, p.numero as partido_numero,
           ca.descricao as cargo_descricao, e.ano as eleicao_ano, e.descricao as eleicao_descricao,
           COALESCE(tv.total, 0) as total_votos
    FROM candidatos c
    JOIN partidos p ON c.partido_id = p.id
    JOIN cargos ca ON c.cargo_id = ca.id
    JOIN eleicoes e ON c.eleicao_id = e.id
    LEFT JOIN (SELECT candidato_id, SUM(total_votos) as total FROM votos_municipio GROUP BY candidato_id) tv ON tv.candidato_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (eleicao_id) { query += ' AND c.eleicao_id = ?'; params.push(eleicao_id); }
  if (cargo_id) { query += ' AND c.cargo_id = ?'; params.push(cargo_id); }
  if (partido_id) { query += ' AND c.partido_id = ?'; params.push(partido_id); }
  if (numero) { query += ' AND c.numero = ?'; params.push(numero); }
  if (search) { query += ' AND c.nome LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY total_votos DESC';

  res.json(db.prepare(query).all(...params));
});

// Get candidate profile
router.get('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const candidato = db.prepare(`
    SELECT c.*, p.sigla as partido_sigla, p.nome as partido_nome, p.numero as partido_numero,
           ca.descricao as cargo_descricao, e.ano as eleicao_ano, e.descricao as eleicao_descricao
    FROM candidatos c
    JOIN partidos p ON c.partido_id = p.id
    JOIN cargos ca ON c.cargo_id = ca.id
    JOIN eleicoes e ON c.eleicao_id = e.id
    WHERE c.id = ?
  `).get(id);

  if (!candidato) return res.status(404).json({ error: 'Candidato não encontrado' });

  // Votes by municipality
  const votosMunicipio = db.prepare(`
    SELECT vm.*, m.nome as municipio_nome, m.latitude, m.longitude
    FROM votos_municipio vm
    JOIN municipios m ON vm.municipio_id = m.id
    WHERE vm.candidato_id = ?
    ORDER BY vm.total_votos DESC
  `).all(id);

  // Votes by zone
  const votosZona = db.prepare(`
    SELECT vz.*, ze.numero as zona_numero, m.nome as municipio_nome
    FROM votos_zona vz
    JOIN zonas_eleitorais ze ON vz.zona_id = ze.id
    JOIN municipios m ON ze.municipio_id = m.id
    WHERE vz.candidato_id = ?
    ORDER BY vz.total_votos DESC
  `).all(id);

  // Total votes
  const total = db.prepare(`
    SELECT SUM(total_votos) as total_votos, SUM(total_aptos) as total_aptos,
           SUM(total_comparecimento) as total_comparecimento, SUM(total_abstencoes) as total_abstencoes,
           SUM(total_secoes) as total_secoes
    FROM votos_municipio WHERE candidato_id = ?
  `).get(id);

  // Evolution across elections (same number, same cargo description)
  const evolucao = db.prepare(`
    SELECT e.ano, SUM(vm.total_votos) as total_votos, ca.descricao as cargo
    FROM candidatos c2
    JOIN votos_municipio vm ON vm.candidato_id = c2.id
    JOIN eleicoes e ON c2.eleicao_id = e.id
    JOIN cargos ca ON c2.cargo_id = ca.id
    WHERE c2.numero = ? AND c2.nome = ?
    GROUP BY e.ano, ca.descricao
    ORDER BY e.ano
  `).all(candidato.numero, candidato.nome);

  res.json({
    candidato,
    total,
    votosMunicipio,
    votosZona,
    evolucao,
  });
});

export default router;
