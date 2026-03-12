import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatsCard from '../components/StatsCard';
import ElectoralMap from '../components/ElectoralMap';
import * as api from '../services/api';

const tooltipStyle = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };
const selectClass = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700";

export default function Comparison() {
  const [elections, setElections] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [selectedCargo, setSelectedCargo] = useState('');
  const [candidateA, setCandidateA] = useState('');
  const [candidateB, setCandidateB] = useState('');
  const [comparison, setComparison] = useState(null);
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

  const doCompare = () => {
    if (!candidateA || !candidateB) return;
    setLoading(true);
    api.getComparison({ candidato_a: candidateA, candidato_b: candidateB })
      .then(d => { setComparison(d); setLoading(false); });
  };

  const chartData = comparison?.comparison?.map(c => ({
    name: c.municipio_nome,
    [comparison.candidatoA.nome]: c.votos_a,
    [comparison.candidatoB.nome]: c.votos_b,
  })) || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Comparacao de Candidatos</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <label className="block text-xs font-medium text-blue-600 mb-1">Candidato A (Azul)</label>
            <select value={candidateA} onChange={e => setCandidateA(e.target.value)} className="w-full bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              <option value="">Selecione</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.numero} - {c.nome} ({c.partido_sigla})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-red-600 mb-1">Candidato B (Vermelho)</label>
            <select value={candidateB} onChange={e => setCandidateB(e.target.value)} className="w-full bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              <option value="">Selecione</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.numero} - {c.nome} ({c.partido_sigla})</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={doCompare}
              disabled={!candidateA || !candidateB || loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 transition-all"
            >
              {loading ? 'Comparando...' : 'Comparar'}
            </button>
          </div>
        </div>
      </div>

      {comparison && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatsCard title={comparison.candidatoA.nome} value={comparison.totalA} subtitle={`${comparison.candidatoA.partido_sigla} - #${comparison.candidatoA.numero}`} color="blue" />
            <StatsCard title={comparison.candidatoB.nome} value={comparison.totalB} subtitle={`${comparison.candidatoB.partido_sigla} - #${comparison.candidatoB.numero}`} color="red" />
            <StatsCard title="Diferenca" value={Math.abs(comparison.diferenca)} subtitle={`Vantagem: ${comparison.diferenca > 0 ? comparison.candidatoA.nome : comparison.candidatoB.nome}`} color="purple" />
            <StatsCard title="Municipios Vencidos" value={`${comparison.municipiosA} x ${comparison.municipiosB}`} subtitle="A vs B" color="amber" />
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Mapa Comparativo</h2>
            <div className="flex gap-2 mb-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">Azul = {comparison.candidatoA.nome}</span>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Vermelho = {comparison.candidatoB.nome}</span>
            </div>
            <ElectoralMap
              data={comparison.comparison.map(c => ({ ...c, nome: c.municipio_nome, total_votos: Math.abs(c.diferenca) }))}
              comparison={true}
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Votos por Municipio</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => v.toLocaleString('pt-BR')} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString('pt-BR'), 'Votos']} />
                <Legend />
                <Bar dataKey={comparison.candidatoA.nome} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey={comparison.candidatoB.nome} fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Detalhamento por Municipio</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500">Municipio</th>
                    <th className="text-right py-2 px-3 text-blue-600">{comparison.candidatoA.nome}</th>
                    <th className="text-right py-2 px-3 text-red-600">{comparison.candidatoB.nome}</th>
                    <th className="text-right py-2 px-3 text-gray-500">Diferenca</th>
                    <th className="text-center py-2 px-3 text-gray-500">Vencedor</th>
                    <th className="text-right py-2 px-3 text-gray-500">% A</th>
                    <th className="text-right py-2 px-3 text-gray-500">% B</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.comparison.map((c, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-700 font-medium">{c.municipio_nome}</td>
                      <td className="py-2 px-3 text-right font-mono text-blue-600">{c.votos_a.toLocaleString('pt-BR')}</td>
                      <td className="py-2 px-3 text-right font-mono text-red-600">{c.votos_b.toLocaleString('pt-BR')}</td>
                      <td className={`py-2 px-3 text-right font-mono ${c.diferenca > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {c.diferenca > 0 ? '+' : ''}{c.diferenca.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.vencedor === 'A' ? 'bg-blue-100 text-blue-700' : c.vencedor === 'B' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                          {c.vencedor === 'A' ? comparison.candidatoA.nome.split(' ')[0] : c.vencedor === 'B' ? comparison.candidatoB.nome.split(' ')[0] : 'Empate'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500">{c.percentual_a}%</td>
                      <td className="py-2 px-3 text-right text-gray-500">{c.percentual_b}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
