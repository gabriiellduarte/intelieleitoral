import fs from 'fs';
import { parse } from 'csv-parse';
import { getDb, MUNICIPIO_COORDS, normalizeText } from './database.js';

export async function importCSV(filePath) {
  const db = getDb();

  const records = [];
  const parser = fs.createReadStream(filePath, { encoding: 'latin1' })
    .pipe(parse({
      delimiter: ';',
      columns: true,
      quote: '"',
      skip_empty_lines: true,
      relax_column_count: true,
    }));

  for await (const record of parser) {
    records.push(record);
  }

  console.log(`Parsed ${records.length} records from ${filePath}`);

  // Caches for lookups
  const eleicaoCache = new Map();
  const partidoCache = new Map();
  const municipioCache = new Map();
  const zonaCache = new Map();
  const localCache = new Map();
  const cargoCache = new Map();
  const candidatoCache = new Map();
  const secaoCache = new Map();

  // Prepared statements
  const stmts = {
    eleicao: db.prepare(`INSERT OR IGNORE INTO eleicoes (ano, tipo, descricao, turno, uf) VALUES (?, ?, ?, ?, ?)`),
    getEleicao: db.prepare(`SELECT id FROM eleicoes WHERE ano = ? AND tipo = ? AND turno = ? AND uf = ?`),
    partido: db.prepare(`INSERT OR IGNORE INTO partidos (numero, sigla, nome) VALUES (?, ?, ?)`),
    getPartido: db.prepare(`SELECT id FROM partidos WHERE numero = ? AND sigla = ?`),
    municipio: db.prepare(`INSERT OR IGNORE INTO municipios (codigo, nome, uf, latitude, longitude) VALUES (?, ?, ?, ?, ?)`),
    getMunicipio: db.prepare(`SELECT id FROM municipios WHERE codigo = ?`),
    zona: db.prepare(`INSERT OR IGNORE INTO zonas_eleitorais (numero, municipio_id) VALUES (?, ?)`),
    getZona: db.prepare(`SELECT id FROM zonas_eleitorais WHERE numero = ? AND municipio_id = ?`),
    local: db.prepare(`INSERT OR IGNORE INTO locais_votacao (numero, municipio_id, latitude, longitude) VALUES (?, ?, ?, ?)`),
    getLocal: db.prepare(`SELECT id FROM locais_votacao WHERE numero = ? AND municipio_id = ?`),
    cargo: db.prepare(`INSERT OR IGNORE INTO cargos (codigo, descricao) VALUES (?, ?)`),
    getCargo: db.prepare(`SELECT id FROM cargos WHERE codigo = ?`),
    candidato: db.prepare(`INSERT OR IGNORE INTO candidatos (numero, nome, partido_id, cargo_id, eleicao_id) VALUES (?, ?, ?, ?, ?)`),
    getCandidato: db.prepare(`SELECT id FROM candidatos WHERE numero = ? AND nome = ? AND cargo_id = ? AND eleicao_id = ?`),
    secao: db.prepare(`INSERT OR IGNORE INTO secoes (numero, zona_id, local_votacao_id, municipio_id) VALUES (?, ?, ?, ?)`),
    getSecao: db.prepare(`SELECT id FROM secoes WHERE numero = ? AND zona_id = ? AND municipio_id = ?`),
    voto: db.prepare(`INSERT OR IGNORE INTO votos (eleicao_id, candidato_id, municipio_id, zona_id, secao_id, cargo_id, votos, aptos, comparecimento, abstencoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  };

  function getOrCache(cache, key, getter) {
    if (cache.has(key)) return cache.get(key);
    const result = getter();
    cache.set(key, result);
    return result;
  }

  const insertAll = db.transaction(() => {
    let count = 0;
    for (const r of records) {
      const ano = parseInt(normalizeText(r.ANO_ELEICAO));
      const tipo = normalizeText(r.NM_TIPO_ELEICAO);
      const descricao = normalizeText(r.DS_ELEICAO);
      const turno = parseInt(normalizeText(r.NR_TURNO)) || 1;
      const uf = normalizeText(r.SG_UF);
      const cdMunicipio = parseInt(normalizeText(r.CD_MUNICIPIO));
      const nmMunicipio = normalizeText(r.NM_MUNICIPIO);
      const nrZona = parseInt(normalizeText(r.NR_ZONA));
      const nrSecao = parseInt(normalizeText(r.NR_SECAO));
      const nrLocal = parseInt(normalizeText(r.NR_LOCAL_VOTACAO));
      const cdCargo = parseInt(normalizeText(r.CD_CARGO_PERGUNTA));
      const dsCargo = normalizeText(r.DS_CARGO_PERGUNTA);
      const nrPartido = parseInt(normalizeText(r.NR_PARTIDO));
      const sgPartido = normalizeText(r.SG_PARTIDO);
      const nmPartido = normalizeText(r.NM_PARTIDO);
      const nrVotavel = parseInt(normalizeText(r.NR_VOTAVEL));
      const nmVotavel = normalizeText(r.NM_VOTAVEL);
      const qtVotos = parseInt(normalizeText(r.QT_VOTOS)) || 0;
      const qtAptos = parseInt(normalizeText(r.QT_APTOS)) || 0;
      const qtComparecimento = parseInt(normalizeText(r.QT_COMPARECIMENTO)) || 0;
      const qtAbstencoes = parseInt(normalizeText(r.QT_ABSTENCOES)) || 0;
      const cdTipoVotavel = parseInt(normalizeText(r.CD_TIPO_VOTAVEL));

      // Skip non-nominal votes (brancos, nulos, etc.) unless they are nominal candidates
      // CD_TIPO_VOTAVEL: 1 = Nominal, 2 = Legenda, 3 = Branco/Nulo

      if (isNaN(ano) || isNaN(cdMunicipio)) continue;

      // Eleicao
      const eleicaoKey = `${ano}-${tipo}-${turno}-${uf}`;
      const eleicaoId = getOrCache(eleicaoCache, eleicaoKey, () => {
        stmts.eleicao.run(ano, tipo, descricao, turno, uf);
        return stmts.getEleicao.get(ano, tipo, turno, uf).id;
      });

      // Partido
      const partidoKey = `${nrPartido}-${sgPartido}`;
      const partidoId = getOrCache(partidoCache, partidoKey, () => {
        stmts.partido.run(nrPartido, sgPartido, nmPartido);
        return stmts.getPartido.get(nrPartido, sgPartido).id;
      });

      // Municipio
      const coords = MUNICIPIO_COORDS[nmMunicipio] || { lat: null, lng: null };
      const municipioId = getOrCache(municipioCache, cdMunicipio, () => {
        stmts.municipio.run(cdMunicipio, nmMunicipio, uf, coords.lat, coords.lng);
        return stmts.getMunicipio.get(cdMunicipio).id;
      });

      // Zona
      const zonaKey = `${nrZona}-${municipioId}`;
      const zonaId = getOrCache(zonaCache, zonaKey, () => {
        stmts.zona.run(nrZona, municipioId);
        return stmts.getZona.get(nrZona, municipioId).id;
      });

      // Local de votacao (use municipality coords with small offset for local)
      const localKey = `${nrLocal}-${municipioId}`;
      const localLat = coords.lat ? coords.lat + (nrLocal % 100) * 0.002 - 0.1 : null;
      const localLng = coords.lng ? coords.lng + (nrLocal % 100) * 0.002 - 0.1 : null;
      const localId = getOrCache(localCache, localKey, () => {
        stmts.local.run(nrLocal, municipioId, localLat, localLng);
        return stmts.getLocal.get(nrLocal, municipioId).id;
      });

      // Cargo
      const cargoId = getOrCache(cargoCache, cdCargo, () => {
        stmts.cargo.run(cdCargo, dsCargo);
        return stmts.getCargo.get(cdCargo).id;
      });

      // Candidato
      const candidatoKey = `${nrVotavel}-${nmVotavel}-${cargoId}-${eleicaoId}`;
      const candidatoId = getOrCache(candidatoCache, candidatoKey, () => {
        stmts.candidato.run(nrVotavel, nmVotavel, partidoId, cargoId, eleicaoId);
        return stmts.getCandidato.get(nrVotavel, nmVotavel, cargoId, eleicaoId).id;
      });

      // Secao
      const secaoKey = `${nrSecao}-${zonaId}-${municipioId}`;
      const secaoId = getOrCache(secaoCache, secaoKey, () => {
        stmts.secao.run(nrSecao, zonaId, localId, municipioId);
        return stmts.getSecao.get(nrSecao, zonaId, municipioId).id;
      });

      // Voto
      stmts.voto.run(eleicaoId, candidatoId, municipioId, zonaId, secaoId, cargoId, qtVotos, qtAptos, qtComparecimento, qtAbstencoes);

      count++;
      if (count % 50000 === 0) console.log(`  Processed ${count} records...`);
    }
    console.log(`  Total: ${count} records inserted`);
  });

  insertAll();

  // Build aggregate tables
  console.log('Building aggregate tables...');
  buildAggregates(db);

  return records.length;
}

function buildAggregates(db) {
  db.exec(`DELETE FROM votos_municipio`);
  db.exec(`DELETE FROM votos_zona`);

  db.exec(`
    INSERT INTO votos_municipio (eleicao_id, candidato_id, municipio_id, cargo_id, total_votos, total_aptos, total_comparecimento, total_abstencoes, total_secoes)
    SELECT
      v.eleicao_id, v.candidato_id, v.municipio_id, v.cargo_id,
      SUM(v.votos), SUM(v.aptos), SUM(v.comparecimento), SUM(v.abstencoes), COUNT(DISTINCT v.secao_id)
    FROM votos v
    GROUP BY v.eleicao_id, v.candidato_id, v.municipio_id, v.cargo_id
  `);

  db.exec(`
    INSERT INTO votos_zona (eleicao_id, candidato_id, zona_id, cargo_id, total_votos, total_aptos, total_comparecimento, total_abstencoes, total_secoes)
    SELECT
      v.eleicao_id, v.candidato_id, v.zona_id, v.cargo_id,
      SUM(v.votos), SUM(v.aptos), SUM(v.comparecimento), SUM(v.abstencoes), COUNT(DISTINCT v.secao_id)
    FROM votos v
    GROUP BY v.eleicao_id, v.candidato_id, v.zona_id, v.cargo_id
  `);

  console.log('Aggregate tables built successfully');
}
