import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'electoral.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000');
    db.pragma('foreign_keys = ON');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS eleicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ano INTEGER NOT NULL,
      tipo TEXT,
      descricao TEXT,
      turno INTEGER DEFAULT 1,
      uf TEXT,
      UNIQUE(ano, tipo, turno, uf)
    );

    CREATE TABLE IF NOT EXISTS partidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL,
      sigla TEXT NOT NULL,
      nome TEXT,
      UNIQUE(numero, sigla)
    );

    CREATE TABLE IF NOT EXISTS municipios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo INTEGER NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      uf TEXT,
      latitude REAL,
      longitude REAL
    );

    CREATE TABLE IF NOT EXISTS zonas_eleitorais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL,
      municipio_id INTEGER NOT NULL,
      UNIQUE(numero, municipio_id),
      FOREIGN KEY (municipio_id) REFERENCES municipios(id)
    );

    CREATE TABLE IF NOT EXISTS locais_votacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL,
      nome TEXT,
      endereco TEXT,
      latitude REAL,
      longitude REAL,
      municipio_id INTEGER NOT NULL,
      zona_id INTEGER,
      UNIQUE(numero, municipio_id),
      FOREIGN KEY (municipio_id) REFERENCES municipios(id),
      FOREIGN KEY (zona_id) REFERENCES zonas_eleitorais(id)
    );

    CREATE TABLE IF NOT EXISTS cargos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo INTEGER NOT NULL UNIQUE,
      descricao TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS candidatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL,
      nome TEXT NOT NULL,
      partido_id INTEGER,
      cargo_id INTEGER,
      eleicao_id INTEGER,
      UNIQUE(numero, nome, cargo_id, eleicao_id),
      FOREIGN KEY (partido_id) REFERENCES partidos(id),
      FOREIGN KEY (cargo_id) REFERENCES cargos(id),
      FOREIGN KEY (eleicao_id) REFERENCES eleicoes(id)
    );

    CREATE TABLE IF NOT EXISTS secoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL,
      zona_id INTEGER NOT NULL,
      local_votacao_id INTEGER,
      municipio_id INTEGER NOT NULL,
      UNIQUE(numero, zona_id, municipio_id),
      FOREIGN KEY (zona_id) REFERENCES zonas_eleitorais(id),
      FOREIGN KEY (local_votacao_id) REFERENCES locais_votacao(id),
      FOREIGN KEY (municipio_id) REFERENCES municipios(id)
    );

    CREATE TABLE IF NOT EXISTS votos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eleicao_id INTEGER NOT NULL,
      candidato_id INTEGER NOT NULL,
      municipio_id INTEGER NOT NULL,
      zona_id INTEGER NOT NULL,
      secao_id INTEGER NOT NULL,
      cargo_id INTEGER NOT NULL,
      votos INTEGER DEFAULT 0,
      aptos INTEGER DEFAULT 0,
      comparecimento INTEGER DEFAULT 0,
      abstencoes INTEGER DEFAULT 0,
      UNIQUE(eleicao_id, candidato_id, secao_id, cargo_id),
      FOREIGN KEY (eleicao_id) REFERENCES eleicoes(id),
      FOREIGN KEY (candidato_id) REFERENCES candidatos(id),
      FOREIGN KEY (municipio_id) REFERENCES municipios(id),
      FOREIGN KEY (zona_id) REFERENCES zonas_eleitorais(id),
      FOREIGN KEY (secao_id) REFERENCES secoes(id),
      FOREIGN KEY (cargo_id) REFERENCES cargos(id)
    );

    CREATE TABLE IF NOT EXISTS votos_municipio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eleicao_id INTEGER NOT NULL,
      candidato_id INTEGER NOT NULL,
      municipio_id INTEGER NOT NULL,
      cargo_id INTEGER NOT NULL,
      total_votos INTEGER DEFAULT 0,
      total_aptos INTEGER DEFAULT 0,
      total_comparecimento INTEGER DEFAULT 0,
      total_abstencoes INTEGER DEFAULT 0,
      total_secoes INTEGER DEFAULT 0,
      UNIQUE(eleicao_id, candidato_id, municipio_id, cargo_id),
      FOREIGN KEY (eleicao_id) REFERENCES eleicoes(id),
      FOREIGN KEY (candidato_id) REFERENCES candidatos(id),
      FOREIGN KEY (municipio_id) REFERENCES municipios(id),
      FOREIGN KEY (cargo_id) REFERENCES cargos(id)
    );

    CREATE TABLE IF NOT EXISTS votos_zona (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eleicao_id INTEGER NOT NULL,
      candidato_id INTEGER NOT NULL,
      zona_id INTEGER NOT NULL,
      cargo_id INTEGER NOT NULL,
      total_votos INTEGER DEFAULT 0,
      total_aptos INTEGER DEFAULT 0,
      total_comparecimento INTEGER DEFAULT 0,
      total_abstencoes INTEGER DEFAULT 0,
      total_secoes INTEGER DEFAULT 0,
      UNIQUE(eleicao_id, candidato_id, zona_id, cargo_id),
      FOREIGN KEY (eleicao_id) REFERENCES eleicoes(id),
      FOREIGN KEY (candidato_id) REFERENCES candidatos(id),
      FOREIGN KEY (zona_id) REFERENCES zonas_eleitorais(id),
      FOREIGN KEY (cargo_id) REFERENCES cargos(id)
    );

    CREATE INDEX IF NOT EXISTS idx_votos_eleicao ON votos(eleicao_id);
    CREATE INDEX IF NOT EXISTS idx_votos_candidato ON votos(candidato_id);
    CREATE INDEX IF NOT EXISTS idx_votos_municipio ON votos(municipio_id);
    CREATE INDEX IF NOT EXISTS idx_votos_zona ON votos(zona_id);
    CREATE INDEX IF NOT EXISTS idx_votos_cargo ON votos(cargo_id);
    CREATE INDEX IF NOT EXISTS idx_votos_mun_eleicao ON votos_municipio(eleicao_id, cargo_id);
    CREATE INDEX IF NOT EXISTS idx_votos_mun_candidato ON votos_municipio(candidato_id);
    CREATE INDEX IF NOT EXISTS idx_votos_zona_eleicao ON votos_zona(eleicao_id, cargo_id);
    CREATE INDEX IF NOT EXISTS idx_candidatos_eleicao ON candidatos(eleicao_id);
    CREATE INDEX IF NOT EXISTS idx_candidatos_cargo ON candidatos(cargo_id);
    CREATE INDEX IF NOT EXISTS idx_candidatos_numero ON candidatos(numero);
  `);
}

// Roraima municipality coordinates
export const MUNICIPIO_COORDS = {
  'BOA VISTA': { lat: 2.8195, lng: -60.6714 },
  'ALTO ALEGRE': { lat: 2.9904, lng: -61.3106 },
  'AMAJARI': { lat: 3.6507, lng: -61.3681 },
  'BONFIM': { lat: 3.3614, lng: -59.8343 },
  'CANTA': { lat: 2.6098, lng: -60.5991 },
  'CANTÁ': { lat: 2.6098, lng: -60.5991 },
  'CARACARAI': { lat: 1.8108, lng: -61.1278 },
  'CARACARAÍ': { lat: 1.8108, lng: -61.1278 },
  'CAROEBE': { lat: 0.8841, lng: -59.6959 },
  'IRACEMA': { lat: 2.1818, lng: -61.0448 },
  'MUCAJAI': { lat: 2.4399, lng: -60.9090 },
  'MUCAJAÍ': { lat: 2.4399, lng: -60.9090 },
  'NORMANDIA': { lat: 3.8797, lng: -59.6245 },
  'PACARAIMA': { lat: 4.4791, lng: -61.1477 },
  'RORAINOPOLIS': { lat: 0.9411, lng: -60.4378 },
  'RORAINÓPOLIS': { lat: 0.9411, lng: -60.4378 },
  'SAO JOAO DA BALIZA': { lat: 0.9579, lng: -59.9091 },
  'SÃO JOÃO DA BALIZA': { lat: 0.9579, lng: -59.9091 },
  'SAO LUIZ': { lat: 1.0126, lng: -60.1574 },
  'SÃO LUIZ': { lat: 1.0126, lng: -60.1574 },
  'UIRAMUTA': { lat: 4.5994, lng: -60.1785 },
  'UIRAMUTÃ': { lat: 4.5994, lng: -60.1785 },
};

export function normalizeText(text) {
  if (!text) return '';
  return text.replace(/"/g, '').trim();
}
