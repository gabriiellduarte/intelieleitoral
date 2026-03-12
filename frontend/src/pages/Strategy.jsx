import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import StatsCard from '../components/StatsCard';
import ElectoralMap from '../components/ElectoralMap';
import * as api from '../services/api';

const tooltipStyle = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };
const selectClass = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700";

export default function Strategy() {
  const [elections, setElections] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [selectedCargo, setSelectedCargo] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.getElections(), api.getCargos()]).then(([e, c]) => { setElections(e); setCargos(c); });
  }, []);

  useEffect(() => {
    if (selectedElection || selectedCargo) {
      const params = {};
      if (selectedElection) params.eleicao_id = selectedElection;
      if (selectedCargo) params.cargo_id = selectedCargo;
      api.getCandidates(params).then(setCandidates);
    }
  }, [selectedElection, selectedCargo]);

  useEffect(() => {
    if (selectedCandidate) {
      setLoading(true);
      api.getEstrategia(selectedCandidate).then(d => { setData(d); setLoading(false); });
    }
  }, [selectedCandidate]);

  const getBarColor = (percentual, media) => {
    if (percentual > media * 1.5) return '#10b981';
    if (percentual >= media * 0.7) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Analise Estrategica</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Eleicao</label>
            <select value={selectedElection} onChange={e => setSelectedElection(e.target.value)} className={selectClass}>
              <option value="">Selecione</option>
              {elections.map(e => <option key={e.id} value={e.id}>{e.ano} - {e.descricao}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cargo</label>
            <select value={selectedCargo} onChange={e => setSelectedCargo(e.target.value)} className={selectClass}>
              <option value="">Selecione</option>
              {cargos.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Candidato</label>
            <select value={selectedCandidate} onChange={e => setSelectedCandidate(e.target.value)} className={selectClass}>
              <option value="">Selecione</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.numero} - {c.nome} ({c.partido_sigla}) - {c.total_votos} votos</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center h-64 text-gray-400">Analisando...</div>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatsCard title="Redutos Eleitorais" value={data.redutos.length} subtitle="Alta concentracao de votos" color="green" />
            <StatsCard title="Municipios Competitivos" value={data.competitivos.length} subtitle="Votacao media" color="amber" />
            <StatsCard title="Baixa Votacao" value={data.baixaVotacao.length} subtitle="Regioes a conquistar" color="red" />
            <StatsCard title="Media Percentual" value={`${data.mediaPercentual}%`} subtitle="Do total de votos do cargo" color="cyan" />
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Mapa Estrategico</h2>
            <div className="flex gap-2 mb-2">
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Verde = Reduto</span>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">Amarelo = Competitivo</span>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Vermelho = Baixa votacao</span>
            </div>
            <ElectoralMap
              data={data.analise.map(a => ({
                ...a,
                total_votos: a.votos_candidato,
                vencedor: a.percentual > data.mediaPercentual * 1.5 ? 'A' : a.percentual < data.mediaPercentual * 0.7 ? 'B' : 'EMPATE',
              }))}
              comparison={true}
              colorField="votos_candidato"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-4">Redutos Eleitorais</h3>
              <div className="space-y-2">
                {data.redutos.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-emerald-50">
                    <span className="text-sm text-gray-700">{r.nome}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-600">{r.percentual}%</span>
                      <span className="text-xs text-gray-400 ml-2">{r.votos_candidato.toLocaleString('pt-BR')} votos</span>
                    </div>
                  </div>
                ))}
                {data.redutos.length === 0 && <p className="text-gray-400 text-sm">Nenhum reduto identificado</p>}
              </div>
            </div>

            <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-4">Municipios Competitivos</h3>
              <div className="space-y-2">
                {data.competitivos.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-amber-50">
                    <span className="text-sm text-gray-700">{r.nome}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-amber-600">{r.percentual}%</span>
                      <span className="text-xs text-gray-400 ml-2">{r.votos_candidato.toLocaleString('pt-BR')} votos</span>
                    </div>
                  </div>
                ))}
                {data.competitivos.length === 0 && <p className="text-gray-400 text-sm">Nenhum municipio competitivo</p>}
              </div>
            </div>

            <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-4">Potencial de Crescimento</h3>
              <div className="space-y-2">
                {data.crescimento.slice(0, 10).map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-red-50">
                    <div>
                      <span className="text-sm text-gray-700">{r.nome}</span>
                      <span className="text-xs text-gray-400 ml-2">{r.aptos.toLocaleString('pt-BR')} eleitores</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-red-600">{r.percentual}%</span>
                    </div>
                  </div>
                ))}
                {data.crescimento.length === 0 && <p className="text-gray-400 text-sm">Sem areas de crescimento</p>}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Percentual de Votos por Municipio</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.analise.map(a => ({ name: a.nome, percentual: a.percentual, votos: a.votos_candidato }))} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [name === 'percentual' ? `${v}%` : v.toLocaleString('pt-BR'), name === 'percentual' ? 'Percentual' : 'Votos']} />
                <Bar dataKey="percentual" radius={[4, 4, 0, 0]}>
                  {data.analise.map((a, i) => (
                    <Cell key={i} fill={getBarColor(a.percentual, data.mediaPercentual)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
