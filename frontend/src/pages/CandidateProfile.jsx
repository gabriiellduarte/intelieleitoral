import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import StatsCard from '../components/StatsCard';
import ElectoralMap from '../components/ElectoralMap';
import * as api from '../services/api';

const tooltipStyle = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };

export default function CandidateProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCandidateProfile(id).then(d => { setData(d); setLoading(false); });
  }, [id]);

  if (loading || !data) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;

  const { candidato, total, votosMunicipio, votosZona, evolucao } = data;

  const munChart = votosMunicipio.slice(0, 15).map(m => ({
    name: m.municipio_nome,
    votos: m.total_votos,
  }));

  const zonaChart = votosZona.slice(0, 15).map(z => ({
    name: `Z${z.zona_numero} - ${z.municipio_nome}`,
    votos: z.total_votos,
  }));

  const mediaSecao = total.total_secoes > 0 ? Math.round(total.total_votos / total.total_secoes) : 0;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2">
        <i className="fa-solid fa-arrow-left"></i> Voltar
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
            {candidato.numero}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{candidato.nome}</h1>
            <div className="flex gap-3 text-sm text-gray-500">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">{candidato.partido_sigla}</span>
              <span>{candidato.cargo_descricao}</span>
              <span>{candidato.eleicao_ano}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total de Votos" value={total.total_votos || 0} icon="fa-solid fa-check-to-slot" color="blue" />
        <StatsCard title="Comparecimento" value={total.total_comparecimento || 0} icon="fa-solid fa-user-check" color="green" />
        <StatsCard title="Media/Secao" value={mediaSecao} icon="fa-solid fa-chart-bar" color="purple" />
        <StatsCard title="Secoes" value={total.total_secoes || 0} icon="fa-solid fa-list-check" color="amber" />
      </div>

      {/* Map */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Mapa de Votacao</h2>
        <ElectoralMap data={votosMunicipio.map(m => ({ ...m, nome: m.municipio_nome, latitude: m.latitude, longitude: m.longitude }))} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Votacao por Municipio</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={munChart} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={v => v.toLocaleString('pt-BR')} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={120} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString('pt-BR'), 'Votos']} />
              <Bar dataKey="votos" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Votacao por Zona Eleitoral</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={zonaChart} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={v => v.toLocaleString('pt-BR')} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={140} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString('pt-BR'), 'Votos']} />
              <Bar dataKey="votos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolution */}
      {evolucao.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Evolucao entre Eleicoes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolucao.map(e => ({ name: `${e.ano} - ${e.cargo}`, votos: e.total_votos }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => v.toLocaleString('pt-BR')} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString('pt-BR'), 'Votos']} />
              <Line type="monotone" dataKey="votos" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Detalhamento por Municipio</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">#</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Municipio</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Votos</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Secoes</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Media/Secao</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">% Total</th>
              </tr>
            </thead>
            <tbody>
              {votosMunicipio.map((m, i) => (
                <tr key={m.municipio_id || i} className="border-b border-gray-100 hover:bg-blue-50/50">
                  <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                  <td className="py-2 px-3 text-gray-700 font-medium">{m.municipio_nome}</td>
                  <td className="py-2 px-3 text-right font-mono text-blue-600 font-semibold">{m.total_votos.toLocaleString('pt-BR')}</td>
                  <td className="py-2 px-3 text-right text-gray-500">{m.total_secoes}</td>
                  <td className="py-2 px-3 text-right text-gray-500">{m.total_secoes > 0 ? Math.round(m.total_votos / m.total_secoes) : 0}</td>
                  <td className="py-2 px-3 text-right text-gray-500">
                    {total.total_votos > 0 ? ((m.total_votos / total.total_votos) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
