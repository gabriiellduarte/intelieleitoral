import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import StatsCard from '@/components/electoral/StatsCard';
import ElectoralMap from '@/components/electoral/ElectoralMap';
import * as api from '@/services/api';

const ttStyle = { backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', color:'#334155', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' };
const sel = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700';

type Region = { nome: string; percentual: number; votos_candidato: number; aptos?: number };
type AnaliseItem = { nome: string; percentual: number; votos_candidato: number; vencedor?: string; latitude?: number; longitude?: number };
type Candidate = { id: number; numero: number; nome: string; partido_sigla: string; total_votos: number };
type Election  = { id: number; ano: number; descricao: string };
type Cargo     = { id: number; descricao: string };

export default function EstrategiaPage() {
    const [elections,  setElections]  = useState<Election[]>([]);
    const [cargos,     setCargos]     = useState<Cargo[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selElection, setSelElection] = useState('');
    const [selCargo,    setSelCargo]    = useState('');
    const [selCand,     setSelCand]     = useState('');
    const [data,    setData]    = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        Promise.all([api.getElections(), api.getCargos()]).then(([e, c]) => { setElections(e); setCargos(c); });
    }, []);

    useEffect(() => {
        if (selElection || selCargo) {
            const p: Record<string, string> = {};
            if (selElection) p.eleicao_id = selElection;
            if (selCargo)    p.cargo_id   = selCargo;
            api.getCandidates(p).then(setCandidates);
        }
    }, [selElection, selCargo]);

    useEffect(() => {
        if (selCand) {
            setLoading(true);
            api.getEstrategia(selCand).then(d => { setData(d); setLoading(false); });
        }
    }, [selCand]);

    const getBarColor = (pct: number, media: number) => {
        if (pct > media * 1.5) return '#10b981';
        if (pct >= media * 0.7) return '#f59e0b';
        return '#ef4444';
    };

    const redutos      = (data?.redutos      ?? []) as Region[];
    const competitivos = (data?.competitivos  ?? []) as Region[];
    const crescimento  = (data?.crescimento   ?? []) as Region[];
    const analise      = (data?.analise       ?? []) as AnaliseItem[];
    const media        = (data?.mediaPercentual ?? 0) as number;

    const mapData = analise.map(a => ({
        ...a,
        total_votos: a.votos_candidato,
        vencedor: a.percentual > media * 1.5 ? 'A' as const : a.percentual < media * 0.7 ? 'B' as const : 'EMPATE' as const,
    }));

    return (
        <div>
            <Head title="Análise Estratégica" />
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Análise Estratégica</h1>

            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Eleição</label>
                        <select value={selElection} onChange={e => setSelElection(e.target.value)} className={sel}>
                            <option value="">Selecione</option>
                            {elections.map(e => <option key={e.id} value={e.id}>{e.ano} – {e.descricao}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cargo</label>
                        <select value={selCargo} onChange={e => setSelCargo(e.target.value)} className={sel}>
                            <option value="">Selecione</option>
                            {cargos.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Candidato</label>
                        <select value={selCand} onChange={e => setSelCand(e.target.value)} className={sel}>
                            <option value="">Selecione</option>
                            {candidates.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.numero} – {c.nome} ({c.partido_sigla}) – {c.total_votos.toLocaleString('pt-BR')} votos
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading && <div className="flex items-center justify-center h-64 text-gray-400">Analisando…</div>}

            {data && !loading && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <StatsCard title="Redutos Eleitorais"      value={redutos.length}      subtitle="Alta concentração"       color="green" />
                        <StatsCard title="Municípios Competitivos" value={competitivos.length} subtitle="Votação média"           color="amber" />
                        <StatsCard title="Baixa Votação"           value={crescimento.length}  subtitle="Regiões a conquistar"    color="red"   />
                        <StatsCard title="Média Percentual"        value={`${media}%`}          subtitle="Do total do cargo"       color="cyan"  />
                    </div>

                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">Mapa Estratégico</h2>
                        <div className="flex gap-2 mb-2">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Verde = Reduto</span>
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">Amarelo = Competitivo</span>
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Vermelho = Baixa votação</span>
                        </div>
                        <ElectoralMap data={mapData} comparison colorField="votos_candidato" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Redutos */}
                        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-4">Redutos Eleitorais</h3>
                            <div className="space-y-2">
                                {redutos.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded bg-emerald-50">
                                        <span className="text-sm text-gray-700">{r.nome}</span>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-emerald-600">{r.percentual}%</span>
                                            <span className="text-xs text-gray-400 ml-2">{r.votos_candidato.toLocaleString('pt-BR')}</span>
                                        </div>
                                    </div>
                                ))}
                                {redutos.length === 0 && <p className="text-gray-400 text-sm">Nenhum reduto identificado</p>}
                            </div>
                        </div>

                        {/* Competitivos */}
                        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-4">Municípios Competitivos</h3>
                            <div className="space-y-2">
                                {competitivos.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded bg-amber-50">
                                        <span className="text-sm text-gray-700">{r.nome}</span>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-amber-600">{r.percentual}%</span>
                                            <span className="text-xs text-gray-400 ml-2">{r.votos_candidato.toLocaleString('pt-BR')}</span>
                                        </div>
                                    </div>
                                ))}
                                {competitivos.length === 0 && <p className="text-gray-400 text-sm">Nenhum município competitivo</p>}
                            </div>
                        </div>

                        {/* Crescimento */}
                        <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-4">Potencial de Crescimento</h3>
                            <div className="space-y-2">
                                {crescimento.slice(0, 10).map((r, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded bg-red-50">
                                        <div>
                                            <span className="text-sm text-gray-700">{r.nome}</span>
                                            {r.aptos && <span className="text-xs text-gray-400 ml-2">{r.aptos.toLocaleString('pt-BR')} eleitores</span>}
                                        </div>
                                        <span className="text-sm font-bold text-red-600">{r.percentual}%</span>
                                    </div>
                                ))}
                                {crescimento.length === 0 && <p className="text-gray-400 text-sm">Sem áreas de crescimento</p>}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Percentual de Votos por Município</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={analise.map(a => ({ name: a.nome, percentual: a.percentual, votos: a.votos_candidato }))} margin={{ bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" />
                                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${v}%`} />
                                <Tooltip contentStyle={ttStyle} formatter={(v: number, name: string) => [
                                    name === 'percentual' ? `${v}%` : v.toLocaleString('pt-BR'),
                                    name === 'percentual' ? 'Percentual' : 'Votos',
                                ]} />
                                <Bar dataKey="percentual" radius={[4, 4, 0, 0]}>
                                    {analise.map((a, i) => <Cell key={i} fill={getBarColor(a.percentual, media)} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
}
