import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line,
} from 'recharts';
import ElectoralMap from '@/components/electoral/ElectoralMap';
import CandidatoAvatar from '@/components/electoral/CandidatoAvatar';
import * as api from '@/services/api';

// ── Tipos ──────────────────────────────────────────────────────────────────────

type Candidato = {
    id: number; sq_candidato: string | null; numero: number; situacao: string | null;
    pessoa_id: number; nome: string;
    partido_sigla: string; partido_nome: string; partido_numero: number;
    cargo_descricao: string;
    eleicao_id: number; eleicao_ano: number; eleicao_descricao: string;
};
type Total = {
    total_votos: number; total_aptos: number;
    total_comparecimento: number; total_abstencoes: number; total_secoes: number;
};
type VotoMunicipio = {
    municipio_id: number; municipio_nome: string;
    total_votos: number; total_secoes: number;
    latitude: number; longitude: number;
};
type PontoMapa = {
    id?: number;
    numero?: string | number | null;
    nome?: string;
    municipio_nome?: string;
    latitude: number | null;
    longitude: number | null;
    total_votos: number;
    total_aptos?: number;
};
type VotoZona = {
    zona_id: number; zona_numero: string; municipio_nome: string; total_votos: number;
};
type VotoSecao = {
    id: number;
    secao_numero: number;
    nr_turno: number;
    quantidade_votos: number;
    aptos: number;
    comparecimento: number;
    abstencoes: number;
    zona_numero: string;
    municipio_nome: string;
    local_numero: string | null;
    local_nome: string | null;
    local_endereco: string | null;
};
type HistoricoItem = {
    candidatura_id: number; numero: string; situacao: string | null;
    eleicao_ano: number; eleicao_descricao: string;
    partido_sigla: string; cargo_descricao: string; total_votos: number;
};
type ProfileData = {
    candidato: Candidato;
    total: Total;
    votosMunicipio: VotoMunicipio[];
    votosZona: VotoZona[];
    votosSecao: VotoSecao[];
    mapaZona: PontoMapa[];
    mapaLocal: PontoMapa[];
    historico: HistoricoItem[];
    secoes: { total_votos: number; total_secoes: number; };
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const ttStyle = {
    backgroundColor: '#fff', border: '1px solid #e2e8f0',
    borderRadius: '8px', color: '#334155', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};

function fmt(n: number) {
    return (n ?? 0).toLocaleString('pt-BR');
}

function fmtTooltip(value: unknown) {
    return [fmt(Number(value ?? 0)), 'Votos'];
}

function pct(part: number, total: number) {
    if (!total) return '0%';
    return ((part / total) * 100).toFixed(1) + '%';
}

function situacaoBadge(s: string | null) {
    if (!s || s === '') return null;
    const lower = s.toLowerCase();
    if (lower.includes('eleito'))
        return { label: s, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (lower.includes('não eleito') || lower.includes('nao eleito'))
        return { label: s, cls: 'bg-red-100 text-red-600 border-red-200' };
    if (lower.includes('suplente'))
        return { label: s, cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: s, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
}

// ── Componente principal ───────────────────────────────────────────────────────

type Props = { id: string | number };

export default function CandidatoPage({ id }: Props) {
    const [data, setData]       = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [aba, setAba]         = useState<'visao' | 'candidaturas' | 'detalhe'>('visao');
    const [tipoMapa, setTipoMapa] = useState<'municipio' | 'zona' | 'local'>('municipio');

    useEffect(() => {
        setLoading(true);
        api.getCandidateProfile(id).then(d => {
            setData(d as ProfileData);
            setLoading(false);
        });
    }, [id]);

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-72 gap-3 text-gray-400">
                <i className="fa-solid fa-spinner fa-spin text-4xl text-blue-400"></i>
                <span className="text-sm">Carregando perfil…</span>
            </div>
        );
    }

    const { candidato, total, votosMunicipio, votosZona, votosSecao, mapaZona, mapaLocal, historico, secoes } = data;
    const badge = situacaoBadge(candidato.situacao);

    const munChart  = votosMunicipio.slice(0, 15).map(m => ({ name: m.municipio_nome, votos: m.total_votos }));
    const zonaChart = votosZona.slice(0, 15).map(z => ({ name: `Z${z.zona_numero} – ${z.municipio_nome}`, votos: z.total_votos }));
    const evolucao  = historico.map(h => ({ name: `${h.eleicao_ano} · ${h.cargo_descricao}`, votos: h.total_votos }));
    const mapData   = votosMunicipio.map(m => ({ ...m, nome: m.municipio_nome }));
    const dadosMapa = tipoMapa === 'zona'
        ? mapaZona
        : tipoMapa === 'local'
            ? mapaLocal
            : mapData;
    const rotuloMapa = tipoMapa === 'zona' ? 'por zona' : tipoMapa === 'local' ? 'por local de votação' : 'por município';
    const mediaSecao = (secoes?.total_secoes ?? 0) > 0
        ? Math.round((secoes?.total_votos ?? 0) / secoes.total_secoes)
        : 0;

    return (
        <div>
            <Head title={`${candidato.nome} — Perfil`} />

            <Link
                href="/app/candidatos"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-5 transition-colors"
            >
                <i className="fa-solid fa-arrow-left text-xs"></i> Candidatos
            </Link>

            {/* ── Cartão de perfil ───────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <CandidatoAvatar
                            sqCandidato={candidato.sq_candidato}
                            numero={candidato.numero}
                            size="lg"
                            rounded="2xl"
                            className="shadow-md"
                        />
                        {badge && (
                            <span className={`absolute -bottom-2 -right-2 text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                                {badge.label}
                            </span>
                        )}
                    </div>

                    {/* Dados principais */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-black text-gray-900 leading-tight truncate">{candidato.nome}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200">
                                <i className="fa-solid fa-flag text-xs"></i>
                                {candidato.partido_sigla}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                <i className="fa-solid fa-briefcase text-xs"></i>
                                {candidato.cargo_descricao}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
                                <i className="fa-solid fa-calendar text-xs"></i>
                                {candidato.eleicao_ano}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{candidato.eleicao_descricao}</p>
                    </div>

                    {/* Votos em destaque */}
                    <div className="text-right flex-shrink-0">
                        <p className="text-3xl font-black text-blue-600 tabular-nums">{fmt(total?.total_votos ?? 0)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">votos totais</p>
                    </div>
                </div>
            </div>

            {/* ── Stats ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                    { label: 'Total de Votos',  value: fmt(total?.total_votos ?? 0),          icon: 'fa-check-to-slot', color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
                    { label: 'Comparecimento',  value: fmt(total?.total_comparecimento ?? 0),  icon: 'fa-user-check',    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                    { label: 'Média / Seção',   value: fmt(mediaSecao),                        icon: 'fa-chart-bar',     color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100' },
                    { label: 'Seções',          value: fmt(secoes?.total_secoes ?? 0),           icon: 'fa-list-check',    color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} ${s.border} border rounded-xl p-4`}>
                        <div className="flex items-center gap-2 mb-1">
                            <i className={`fa-solid ${s.icon} ${s.color} text-sm`}></i>
                            <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                        </div>
                        <p className={`text-2xl font-black ${s.color} tabular-nums`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Abas ──────────────────────────────────────────────────────── */}
            <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
                {([
                    { id: 'visao',        label: 'Visão Geral',  icon: 'fa-chart-area'     },
                    { id: 'candidaturas', label: 'Candidaturas', icon: 'fa-calendar-check' },
                    { id: 'detalhe',      label: 'Detalhamento', icon: 'fa-table-list'     },
                ] as const).map(t => (
                    <button
                        key={t.id}
                        onClick={() => setAba(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            aba === t.id
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <i className={`fa-solid ${t.icon} text-xs`}></i>
                        {t.label}
                        {t.id === 'candidaturas' && historico.length > 0 && (
                            <span className="ml-0.5 bg-violet-100 text-violet-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                {historico.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ══ Visão Geral ══════════════════════════════════════════════════ */}
            {aba === 'visao' && (
                <div className="space-y-5">
                    {dadosMapa.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                    <i className="fa-solid fa-map text-blue-500"></i> Mapa de Votação
                                    <span className="text-xs font-normal text-gray-400 normal-case">({rotuloMapa})</span>
                                </h3>
                                <select
                                    value={tipoMapa}
                                    onChange={(evento) => setTipoMapa(evento.target.value as 'municipio' | 'zona' | 'local')}
                                    className="w-full sm:w-56 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="municipio">Por município</option>
                                    <option value="zona">Por zona</option>
                                    <option value="local">Por local de votação</option>
                                </select>
                            </div>
                            <ElectoralMap data={dadosMapa} />
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-city text-violet-500"></i> Por Município
                                <span className="ml-auto text-xs font-normal text-gray-400 normal-case">top {munChart.length}</span>
                            </h3>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={munChart} layout="vertical" margin={{ left: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={v => (v as number).toLocaleString('pt-BR')} />
                                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={130} />
                                    <Tooltip contentStyle={ttStyle} formatter={fmtTooltip} />
                                    <Bar dataKey="votos" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-layer-group text-blue-500"></i> Por Zona Eleitoral
                                <span className="ml-auto text-xs font-normal text-gray-400 normal-case">top {zonaChart.length}</span>
                            </h3>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={zonaChart} layout="vertical" margin={{ left: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={v => (v as number).toLocaleString('pt-BR')} />
                                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={150} />
                                    <Tooltip contentStyle={ttStyle} formatter={fmtTooltip} />
                                    <Bar dataKey="votos" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {evolucao.length > 1 && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-arrow-trend-up text-emerald-500"></i> Evolução entre Eleições
                            </h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={evolucao} margin={{ left: 8, right: 16 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => (v as number).toLocaleString('pt-BR')} />
                                    <Tooltip contentStyle={ttStyle} formatter={fmtTooltip} />
                                    <Line
                                        type="monotone" dataKey="votos" stroke="#3b82f6" strokeWidth={3}
                                        dot={{ fill: '#3b82f6', r: 6, strokeWidth: 2, stroke: '#fff' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* ══ Candidaturas ═════════════════════════════════════════════════ */}
            {aba === 'candidaturas' && (
                <div className="space-y-3">
                    {historico.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 shadow-sm">
                            <i className="fa-solid fa-calendar-xmark text-4xl text-gray-300 mb-3 block"></i>
                            <p>Nenhuma candidatura encontrada</p>
                        </div>
                    ) : historico.map((h, i) => {
                        const isCurrent = h.candidatura_id === Number(id);
                        const b = situacaoBadge(h.situacao);
                        return (
                            <div
                                key={h.candidatura_id}
                                className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                                    isCurrent
                                        ? 'border-blue-300 ring-2 ring-blue-100'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Indicador de posição */}
                                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${
                                            isCurrent
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'bg-white border-gray-200 text-gray-500'
                                        }`}>
                                            {historico.length - i}
                                        </div>
                                        {i < historico.length - 1 && (
                                            <div className="w-0.5 h-4 bg-gray-200 rounded"></div>
                                        )}
                                    </div>

                                    {/* Dados */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-lg font-black text-gray-800">{h.eleicao_ano}</span>
                                            {isCurrent && (
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                                    Visualizando
                                                </span>
                                            )}
                                            {b && (
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${b.cls}`}>
                                                    {b.label}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-700 font-semibold">{h.cargo_descricao}</p>
                                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                                            <span><i className="fa-solid fa-flag mr-1"></i>{h.partido_sigla}</span>
                                            <span><i className="fa-solid fa-hashtag mr-1"></i>Nº {h.numero}</span>
                                        </div>
                                    </div>

                                    {/* Votos + link */}
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-xl font-black text-gray-800 tabular-nums">
                                                {h.total_votos >= 1000
                                                    ? (h.total_votos / 1000).toFixed(1) + 'K'
                                                    : fmt(h.total_votos)}
                                            </p>
                                            <p className="text-xs text-gray-400">votos</p>
                                        </div>
                                        {!isCurrent && (
                                            <Link
                                                href={`/app/candidato/${h.candidatura_id}`}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                            >
                                                Ver detalhes <i className="fa-solid fa-arrow-right text-xs"></i>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══ Detalhamento ═════════════════════════════════════════════════ */}
            {aba === 'detalhe' && (
                <div className="space-y-5">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        {votosMunicipio.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <i className="fa-solid fa-table-list text-4xl text-gray-300 mb-3 block"></i>
                                <p>Sem dados de município disponíveis</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/60">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Município</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Votos</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Seções</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Média/Seção</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">% Total</th>
                                            <th className="py-3 px-4 w-32 hidden md:table-cell"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {votosMunicipio.map((m, i) => {
                                            const media = m.total_secoes > 0 ? Math.round(m.total_votos / m.total_secoes) : 0;
                                            const share = pct(m.total_votos, total?.total_votos ?? 0);
                                            const sharePct = total?.total_votos ? (m.total_votos / total.total_votos) * 100 : 0;
                                            return (
                                                <tr key={m.municipio_id ?? i} className="hover:bg-blue-50/40 transition-colors">
                                                    <td className="py-3 px-4 text-xs text-gray-400 tabular-nums">{i + 1}</td>
                                                    <td className="py-3 px-4 font-semibold text-gray-800">{m.municipio_nome}</td>
                                                    <td className="py-3 px-4 text-right font-black text-blue-600 tabular-nums">{fmt(m.total_votos)}</td>
                                                    <td className="py-3 px-4 text-right text-gray-500 hidden sm:table-cell">{m.total_secoes}</td>
                                                    <td className="py-3 px-4 text-right text-gray-500 hidden sm:table-cell">{fmt(media)}</td>
                                                    <td className="py-3 px-4 text-right text-gray-600 tabular-nums">{share}</td>
                                                    <td className="py-3 px-4 hidden md:table-cell">
                                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full"
                                                                style={{ width: `${Math.min(sharePct * 3, 100)}%` }}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                                            <td colSpan={2} className="py-3 px-4 text-sm font-bold text-gray-700">Total</td>
                                            <td className="py-3 px-4 text-right font-black text-blue-700 tabular-nums">{fmt(total?.total_votos ?? 0)}</td>
                                            <td className="py-3 px-4 text-right font-semibold text-gray-600 hidden sm:table-cell">{fmt(total?.total_secoes ?? 0)}</td>
                                            <td className="py-3 px-4 hidden sm:table-cell"></td>
                                            <td className="py-3 px-4 text-right font-bold text-gray-700">100%</td>
                                            <td className="hidden md:table-cell"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                <i className="fa-solid fa-list-check text-amber-500"></i> Seções em que foi votado
                            </h3>
                            <span className="text-xs text-gray-400">{fmt(votosSecao.length)} registros</span>
                        </div>

                        {votosSecao.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-3 block"></i>
                                <p>Sem votos por seção disponíveis</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Município</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Zona</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seção</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Local</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Votos</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Comparecimento</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Turno</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {votosSecao.map((secao) => (
                                            <tr key={secao.id} className="hover:bg-amber-50/40 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-gray-800">{secao.municipio_nome}</td>
                                                <td className="py-3 px-4 text-right text-gray-600 tabular-nums">{secao.zona_numero}</td>
                                                <td className="py-3 px-4 text-right text-gray-600 tabular-nums">{secao.secao_numero}</td>
                                                <td className="py-3 px-4 text-gray-500 hidden md:table-cell">
                                                    <div className="max-w-90">
                                                        <p className="truncate font-medium text-gray-600">
                                                            {secao.local_nome ?? (secao.local_numero ? `Local ${secao.local_numero}` : '-')}
                                                        </p>
                                                        {secao.local_endereco && (
                                                            <p className="truncate text-xs text-gray-400">{secao.local_endereco}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right font-black text-amber-600 tabular-nums">{fmt(secao.quantidade_votos)}</td>
                                                <td className="py-3 px-4 text-right text-gray-500 hidden sm:table-cell">{fmt(secao.comparecimento)}</td>
                                                <td className="py-3 px-4 text-right text-gray-500 hidden sm:table-cell">{secao.nr_turno}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
