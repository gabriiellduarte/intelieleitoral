import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Filters from '../components/Filters';
import StatsCard from '../components/StatsCard';
import ElectoralMap from '../components/ElectoralMap';
import * as api from '../services/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
const tooltipStyle = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getDashboard(filters).then(d => { setData(d); setLoading(false); });
  }, [filters]);

  if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;

  const topMunicipios = data.votosPorMunicipio?.slice(0, 10).map(m => ({
    name: m.nome,
    votos: m.total_votos,
  })) || [];

  const topZonas = data.topZonas?.slice(0, 10).map(z => ({
    name: `Z${z.zona_numero} - ${z.municipio_nome}`,
    votos: z.total_votos,
  })) || [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white">
          <i className="fa-solid fa-landmark text-lg"></i>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Painel de Inteligencia Eleitoral
          </h1>
          <p className="text-xs text-gray-400">Roraima - Dados TSE</p>
        </div>
      </div>

      <Filters filters={filters} onChange={setFilters} />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total de Votos" value={data.summary?.total_votos || 0} icon="fa-solid fa-box-ballot" color="blue" />
        <StatsCard title="Candidatos" value={data.summary?.total_candidatos || 0} icon="fa-solid fa-users" color="purple" />
        <StatsCard title="Municipios" value={data.summary?.total_municipios || 0} icon="fa-solid fa-city" color="green" />
        <StatsCard title="Secoes" value={data.summary?.total_secoes || 0} icon="fa-solid fa-list-check" color="amber" />
      </div>

      {/* Map */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Distribuicao Geografica de Votos</h2>
        <ElectoralMap
          data={data.votosPorMunicipio}
          onClick={(m) => setFilters(f => ({ ...f, municipio_id: m.id }))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Candidates */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Ranking de Candidatos</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {data.topCandidatos?.map((c, i) => (
              <div
                key={c.id}
                onClick={() => navigate(`/candidato/${c.id}`)}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 cursor-pointer transition-colors border border-transparent hover:border-blue-200"
              >
                <span className="text-xs font-bold text-gray-400 w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{c.nome}</div>
                  <div className="text-xs text-gray-400">{c.partido_sigla} | {c.cargo} | #{c.numero}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-600">{c.total_votos.toLocaleString('pt-BR')}</div>
                  <div className="text-xs text-gray-400">votos</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Municipalities Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Votos por Municipio</h3>
          {topMunicipios.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topMunicipios} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={v => v.toLocaleString('pt-BR')} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={120} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString('pt-BR'), 'Votos']} />
                <Bar dataKey="votos" radius={[0, 4, 4, 0]}>
                  {topMunicipios.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-400">Sem dados</div>
          )}
        </div>
      </div>

      {/* Zonas Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Top Zonas Eleitorais</h3>
          {topZonas.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topZonas} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={v => v.toLocaleString('pt-BR')} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={140} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString('pt-BR'), 'Votos']} />
                <Bar dataKey="votos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-400">Sem dados</div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Distribuicao por Municipio</h3>
          {data.votosPorMunicipio?.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={data.votosPorMunicipio.slice(0, 8).map(m => ({ name: m.nome, value: m.total_votos }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.votosPorMunicipio.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString('pt-BR'), 'Votos']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-400">Sem dados</div>
          )}
        </div>
      </div>
    </div>
  );
}
