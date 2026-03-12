import { useState, useEffect } from 'react';
import * as api from '../services/api';

export default function Filters({ filters, onChange }) {
  const [elections, setElections] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([api.getElections(), api.getCargos(), api.getPartidos(), api.getMunicipios()])
      .then(([e, c, p, m]) => { setElections(e); setCargos(c); setPartidos(p); setMunicipios(m); });
  }, []);

  useEffect(() => {
    const params = {};
    if (filters.eleicao_id) params.eleicao_id = filters.eleicao_id;
    if (filters.cargo_id) params.cargo_id = filters.cargo_id;
    if (filters.partido_id) params.partido_id = filters.partido_id;
    if (search) params.search = search;
    api.getCandidates(params).then(setCandidates);
  }, [filters.eleicao_id, filters.cargo_id, filters.partido_id, search]);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value || '' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Eleicao</label>
          <select
            value={filters.eleicao_id || ''}
            onChange={e => handleChange('eleicao_id', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas</option>
            {elections.map(e => (
              <option key={e.id} value={e.id}>{e.ano} - {e.descricao}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Cargo</label>
          <select
            value={filters.cargo_id || ''}
            onChange={e => handleChange('cargo_id', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {cargos.map(c => (
              <option key={c.id} value={c.id}>{c.descricao}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Partido</label>
          <select
            value={filters.partido_id || ''}
            onChange={e => handleChange('partido_id', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {partidos.map(p => (
              <option key={p.id} value={p.id}>{p.sigla} - {p.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Municipio</label>
          <select
            value={filters.municipio_id || ''}
            onChange={e => handleChange('municipio_id', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {municipios.map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Candidato</label>
          <select
            value={filters.candidato_id || ''}
            onChange={e => handleChange('candidato_id', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {candidates.slice(0, 100).map(c => (
              <option key={c.id} value={c.id}>{c.numero} - {c.nome} ({c.partido_sigla})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nome do candidato..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
