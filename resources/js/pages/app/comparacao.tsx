import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatsCard from '@/components/electoral/StatsCard';
import ElectoralMap from '@/components/electoral/ElectoralMap';
import * as api from '@/services/api';

const ttStyle = { backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', color:'#334155', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' };
const sel = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700';

type Candidate = { id: number; numero: number; nome: string; partido_sigla: string };
type Election  = { id: number; ano: number; descricao: string };
type Cargo     = { id: number; descricao: string };

export default function ComparacaoPage() {
    const [elections, setElections] = useState<Election[]>([]);
    const [cargos,    setCargos]    = useState<Cargo[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selElection, setSelElection] = useState('');
    const [selCargo,    setSelCargo]    = useState('');
    const [candA, setCandA] = useState('');
    const [candB, setCandB] = useState('');
    const [comp,  setComp]  = useState<Record<string, unknown> | null>(null);
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

    const doCompare = () => {
        if (!candA || !candB) return;
        setLoading(true);
        api.getComparison({ candidato_a: candA, candidato_b: candB })
            .then(d => { setComp(d); setLoading(false); });
    };

    const ca = (comp?.candidatoA ?? {}) as Record<string, unknown>;
    const cb = (comp?.candidatoB ?? {}) as Record<string, unknown>;

    const chartData = ((comp?.comparison ?? []) as Record<string, unknown>[]).map(c => ({
        name:               c.municipio_nome as string,
        [ca.nome as string]: c.votos_a,
        [cb.nome as string]: c.votos_b,
    }));

    const mapData = ((comp?.comparison ?? []) as Record<string, unknown>[]).map(c => ({
        ...c,
        nome: c.municipio_nome as string,
        total_votos: Math.abs(c.diferenca as number),
        vencedor: c.vencedor as 'A' | 'B' | 'EMPATE',
        latitude: c.latitude as number,
        longitude: c.longitude as number,
    }));

    return (
        <div>
            <Head title="Comparação de Candidatos" />
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Comparação de Candidatos</h1>

            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                        <label className="block text-xs font-medium text-blue-600 mb-1">Candidato A (Azul)</label>
                        <select value={candA} onChange={e => setCandA(e.target.value)} className="w-full bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                            <option value="">Selecione</option>
                            {candidates.map(c => <option key={c.id} value={c.id}>{c.numero} – {c.nome} ({c.partido_sigla})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-red-600 mb-1">Candidato B (Vermelho)</label>
                        <select value={candB} onChange={e => setCandB(e.target.value)} className="w-full bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                            <option value="">Selecione</option>
                            {candidates.map(c => <option key={c.id} value={c.id}>{c.numero} – {c.nome} ({c.partido_sigla})</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={doCompare}
                            disabled={!candA || !candB || loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Comparando…' : 'Comparar'}
                        </button>
                    </div>
                </div>
            </div>

            {comp && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <StatsCard title={ca.nome as string} value={comp.totalA as number} subtitle={`${ca.partido_sigla} – #${ca.numero}`} color="blue" />
                        <StatsCard title={cb.nome as string} value={comp.totalB as number} subtitle={`${cb.partido_sigla} – #${cb.numero}`} color="red" />
                        <StatsCard title="Diferença" value={Math.abs(comp.diferenca as number)} subtitle={`Vantagem: ${(comp.diferenca as number) > 0 ? ca.nome : cb.nome}`} color="purple" />
                        <StatsCard title="Municípios Vencidos" value={`${comp.municipiosA} x ${comp.municipiosB}`} subtitle="A vs B" color="amber" />
                    </div>

                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">Mapa Comparativo</h2>
                        <div className="flex gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">Azul = {ca.nome as string}</span>
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Vermelho = {cb.nome as string}</span>
                        </div>
                        <ElectoralMap data={mapData} comparison />
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Votos por Município</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={chartData} margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => v.toLocaleString('pt-BR')} />
                                <Tooltip contentStyle={ttStyle} formatter={(v: number) => [v.toLocaleString('pt-BR'), 'Votos']} />
                                <Legend />
                                <Bar dataKey={ca.nome as string} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey={cb.nome as string} fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Detalhamento por Município</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-2 px-3 text-gray-500">Município</th>
                                        <th className="text-right py-2 px-3 text-blue-600">{ca.nome as string}</th>
                                        <th className="text-right py-2 px-3 text-red-600">{cb.nome as string}</th>
                                        <th className="text-right py-2 px-3 text-gray-500">Diferença</th>
                                        <th className="text-center py-2 px-3 text-gray-500">Vencedor</th>
                                        <th className="text-right py-2 px-3 text-gray-500">% A</th>
                                        <th className="text-right py-2 px-3 text-gray-500">% B</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {((comp.comparison ?? []) as Record<string, unknown>[]).map((c, i) => (
                                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-2 px-3 text-gray-700 font-medium">{c.municipio_nome as string}</td>
                                            <td className="py-2 px-3 text-right font-mono text-blue-600">{(c.votos_a as number).toLocaleString('pt-BR')}</td>
                                            <td className="py-2 px-3 text-right font-mono text-red-600">{(c.votos_b as number).toLocaleString('pt-BR')}</td>
                                            <td className={`py-2 px-3 text-right font-mono ${(c.diferenca as number) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                {(c.diferenca as number) > 0 ? '+' : ''}{(c.diferenca as number).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.vencedor === 'A' ? 'bg-blue-100 text-blue-700' : c.vencedor === 'B' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {c.vencedor === 'A' ? (ca.nome as string).split(' ')[0] : c.vencedor === 'B' ? (cb.nome as string).split(' ')[0] : 'Empate'}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-right text-gray-500">{c.percentual_a as number}%</td>
                                            <td className="py-2 px-3 text-right text-gray-500">{c.percentual_b as number}%</td>
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
