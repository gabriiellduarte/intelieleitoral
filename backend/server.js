import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getDb } from './database.js';
import { importCSV } from './importer.js';
import electionsRouter from './routes/elections.js';
import candidatesRouter from './routes/candidates.js';
import votesRouter from './routes/votes.js';
import comparisonRouter from './routes/comparison.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// File upload
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// Routes
app.use('/api/elections', electionsRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/votes', votesRouter);
app.use('/api/comparison', comparisonRouter);

// Upload CSV
app.post('/api/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    console.log(`Importing ${req.file.originalname}...`);
    const count = await importCSV(req.file.path);
    res.json({ success: true, records: count });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import status
app.get('/api/status', (req, res) => {
  const db = getDb();
  const eleicoes = db.prepare('SELECT COUNT(*) as count FROM eleicoes').get();
  const candidatos = db.prepare('SELECT COUNT(*) as count FROM candidatos').get();
  const votos = db.prepare('SELECT COUNT(*) as count FROM votos').get();
  const municipios = db.prepare('SELECT COUNT(*) as count FROM municipios').get();
  res.json({
    eleicoes: eleicoes.count,
    candidatos: candidatos.count,
    votos: votos.count,
    municipios: municipios.count,
    hasData: votos.count > 0,
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Electoral Intelligence API running on http://localhost:${PORT}`);
  getDb(); // Initialize DB
});
