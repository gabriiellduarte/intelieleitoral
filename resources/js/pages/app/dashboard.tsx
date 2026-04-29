import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Filters, { type FilterState } from '@/components/electoral/Filters';
import StatsCard from '@/components/electoral/StatsCard';
import ElectoralMap from '@/components/electoral/ElectoralMap';
import * as api from '@/services/api';

const COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1','#14b8a6','#f97316'];
const ttStyle = { backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', color:'#334155', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' };

function formatarTooltip(valor: unknown) {
    const numero = Number(valor ?? 0);
    return [numero.toLocaleString('pt-BR'), 'Votos'];
}

type PropsDashboard = {
    filtropopulados?: {
        eleicoes?: { id: number; ano: number; descricao: string }[];
        cargos: { id: number; descricao: string }[];
        partidos: { id: number; sigla: string; nome?: string }[];
        municipios: { id: number; nome: string }[];
        candidatos: { id: number; nome: string; numero?: number; partido_sigla?: string }[];
    };
};

export default function AppDashboard() {
    const { url, props } = usePage<PropsDashboard>();
    const [currentPath, queryString] = url.split('?');
    const eleicaoAtiva = useMemo(() => {
        return new URLSearchParams(queryString ?? '').get('eleicao_id') ?? '';
    }, [queryString]);

    const filtrosPopulados = useMemo(() => {
        return {
            eleicoes: props.filtropopulados?.eleicoes ?? [],
            cargos: props.filtropopulados?.cargos ?? [],
            partidos: props.filtropopulados?.partidos ?? [],
            municipios: props.filtropopulados?.municipios ?? [],
            candidatos: props.filtropopulados?.candidatos ?? [],
        };
    }, [props.filtropopulados]);

    const [filters, setFilters] = useState<FilterState>(() => ({ eleicao_id: eleicaoAtiva }));
    const [data, setData]       = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        setFilters((filtrosAtuais) => ({
            ...filtrosAtuais,
            eleicao_id: eleicaoAtiva,
        }));
    }, [eleicaoAtiva]);

    useEffect(() => {
        const filtrosComEleicaoAtiva = {
            ...filters,
            eleicao_id: eleicaoAtiva || filters.eleicao_id,
        };

        api.getDashboard(filtrosComEleicaoAtiva).then(setData);
    }, [filters, eleicaoAtiva]);

    const alterarFiltros = (novosFiltros: FilterState) => {
        const novaEleicao = String(novosFiltros.eleicao_id ?? '');

        if (novaEleicao && novaEleicao !== eleicaoAtiva) {
            const params = new URLSearchParams(queryString ?? '');
            params.set('eleicao_id', novaEleicao);

            router.visit(`${currentPath}?${params.toString()}`, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
            return;
        }

        setFilters({
            ...novosFiltros,
            eleicao_id: eleicaoAtiva,
        });
    };

    if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;

    const topMunicipios = ((data.votosPorMunicipio as { nome: string; total_votos: number }[]) ?? [])
        .slice(0, 10).map(m => ({ name: m.nome, votos: m.total_votos }));

    const topZonas = ((data.topZonas as { zona_numero: number; municipio_nome: string; total_votos: number }[]) ?? [])
        .slice(0, 10).map(z => ({ name: `Z${z.zona_numero} – ${z.municipio_nome}`, votos: z.total_votos }));

    const summary = (data.summary ?? {}) as Record<string, number>;
    const topCandidatos = (data.topCandidatos ?? []) as { id: number; nome: string; partido_sigla: string; cargo: string; numero: number; total_votos: number }[];
    const votosPorMunicipio = (data.votosPorMunicipio ?? []) as { id: number; nome: string; total_votos: number; latitude: number; longitude: number }[];

    return (
        <div>
            <Head title="Dashboard" />

            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white">
                    <i className="fa-solid fa-landmark text-lg"></i>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Painel de Inteligência Eleitoral</h1>
                </div>
            </div>

            <Filters filters={filters} onChange={alterarFiltros} filtrosPopulados={filtrosPopulados} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatsCard title="Total de Votos"  value={summary.total_votos   ?? 0} icon="fa-solid fa-check-to-slot" color="blue"   />
                <StatsCard title="Candidatos"       value={summary.total_candidatos ?? 0} icon="fa-solid fa-users"          color="purple" />
                <StatsCard title="Municípios"       value={summary.total_municipios  ?? 0} icon="fa-solid fa-city"            color="green"  />
                <StatsCard title="Seções"           value={summary.total_secoes      ?? 0} icon="fa-solid fa-list-check"      color="amber"  />
            </div>

            <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Distribuição Geográfica de Votos</h2>
                <ElectoralMap
                    data={votosPorMunicipio}
                    onClick={(m) => setFilters(f => ({ ...f, municipio_id: m.id }))}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Ranking */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Ranking de Candidatos</h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {topCandidatos.map((c, i) => (
                            <div
                                key={c.id}
                                onClick={() => router.visit(`/app/candidato/${c.id}`)}
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

                {/* Municípios chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Votos por Município</h3>
                    {topMunicipios.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={topMunicipios} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={v => v.toLocaleString('pt-BR')} />
                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={120} />
                                <Tooltip contentStyle={ttStyle} formatter={formatarTooltip} />
                                <Bar dataKey="votos" radius={[0, 4, 4, 0]}>
                                    {topMunicipios.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="h-[400px] flex items-center justify-center text-gray-400">Sem dados</div>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Zonas */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Top Zonas Eleitorais</h3>
                    {topZonas.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={topZonas} layout="vertical" margin={{ left: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={v => v.toLocaleString('pt-BR')} />
                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={140} />
                                <Tooltip contentStyle={ttStyle} formatter={formatarTooltip} />
                                <Bar dataKey="votos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="h-[350px] flex items-center justify-center text-gray-400">Sem dados</div>}
                </div>

                {/* Pie */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Distribuição por Município</h3>
                    {votosPorMunicipio.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={votosPorMunicipio.slice(0, 8).map(m => ({ name: m.nome, value: m.total_votos }))}
                                    cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="value"
                                >
                                    {votosPorMunicipio.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={ttStyle} formatter={formatarTooltip} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-[350px] flex items-center justify-center text-gray-400">Sem dados</div>}
                </div>
            </div>
        </div>
    );
}
