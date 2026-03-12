import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

// List all elections
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM eleicoes ORDER BY ano DESC').all();
  res.json(rows);
});

// List all cargos
router.get('/cargos', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM cargos ORDER BY descricao').all();
  res.json(rows);
});

// List all parties
router.get('/partidos', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM partidos ORDER BY sigla').all();
  res.json(rows);
});

// List all municipalities
router.get('/municipios', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM municipios ORDER BY nome').all();
  res.json(rows);
});

// List zones by municipality
router.get('/zonas', (req, res) => {
  const db = getDb();
  const { municipio_id } = req.query;
  let query = `SELECT z.*, m.nome as municipio_nome FROM zonas_eleitorais z JOIN municipios m ON z.municipio_id = m.id`;
  const params = [];
  if (municipio_id) {
    query += ' WHERE z.municipio_id = ?';
    params.push(municipio_id);
  }
  query += ' ORDER BY z.numero';
  res.json(db.prepare(query).all(...params));
});

// List locais de votacao
router.get('/locais', (req, res) => {
  const db = getDb();
  const { municipio_id, zona_id } = req.query;
  let query = `SELECT l.*, m.nome as municipio_nome FROM locais_votacao l JOIN municipios m ON l.municipio_id = m.id WHERE 1=1`;
  const params = [];
  if (municipio_id) { query += ' AND l.municipio_id = ?'; params.push(municipio_id); }
  if (zona_id) { query += ' AND l.zona_id = ?'; params.push(zona_id); }
  query += ' ORDER BY l.numero';
  res.json(db.prepare(query).all(...params));
});

export default router;
