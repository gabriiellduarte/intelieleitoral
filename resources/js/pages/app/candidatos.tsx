import { Head, Link } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '@/services/api';
import type { PaginatedResponse } from '@/services/api';
import CandidatoAvatar from '@/components/electoral/CandidatoAvatar';

// ── Tipos ──────────────────────────────────────────────────────────────────────

type Candidato = {
    id: number;
    sq_candidato: string | null;
    numero: number;
    situacao: string | null;
    pessoa_id: number;
    nome: string;
    partido_sigla: string;
    partido_nome: string;
    partido_numero: number;
    cargo_descricao: string;
    eleicao_id: number;
    eleicao_ano: number;
    eleicao_descricao: string;
    total_votos: number;
};

type Filtros = {
    eleicao_id: string;
    cargo_id: string;
    partido_id: string;
    search: string;
    per_page: string;
};

type Election = { id: number; ano: number; turno: number; descricao: string };
type Cargo    = { id: number; descricao: string };
type Partido  = { id: number; sigla: string; nome: string };

// ── Helpers visuais ────────────────────────────────────────────────────────────

const PARTY_COLORS: Record<string, string> = {
    PT:           'bg-red-100    text-red-700    border-red-200',
    PL:           'bg-blue-100   text-blue-700   border-blue-200',
    PP:           'bg-sky-100    text-sky-700    border-sky-200',
    PSDB:         'bg-cyan-100   text-cyan-700   border-cyan-200',
    MDB:          'bg-amber-100  text-amber-700  border-amber-200',
    REPUBLICANOS: 'bg-orange-100 text-orange-700 border-orange-200',
    UNIÃO:        'bg-violet-100 text-violet-700 border-violet-200',
    PDT:          'bg-rose-100   text-rose-700   border-rose-200',
    PSD:          'bg-teal-100   text-teal-700   border-teal-200',
};

function partidoColor(sigla: string) {
    return PARTY_COLORS[sigla?.toUpperCase()] ?? 'bg-gray-100 text-gray-600 border-gray-200';
}

function formatVotes(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K';
    return n.toLocaleString('pt-BR');
}

const PER_PAGE_OPTIONS = ['10', '25', '50', '100'];

// ── Paginação ──────────────────────────────────────────────────────────────────

type PaginacaoProps = {
    meta: PaginatedResponse<unknown>;
    onPage: (p: number) => void;
};

function Paginacao({ meta, onPage }: PaginacaoProps) {
    const { current_page, last_page, from, to, total } = meta;
    if (last_page <= 1) return null;

    // Gera janela de páginas ao redor da atual
    const pages: (number | '...')[] = [];
    const delta = 2;
    for (let i = 1; i <= last_page; i++) {
        if (i === 1 || i === last_page || (i >= current_page - delta && i <= current_page + delta)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
                Mostrando <span className="font-semibold text-gray-600">{from}–{to}</span> de <span className="font-semibold text-gray-600">{total.toLocaleString('pt-BR')}</span> candidatos
            </p>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPage(current_page - 1)}
                    disabled={current_page === 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>

                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`d${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPage(p as number)}
                            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                                p === current_page
                                    ? 'bg-blue-600 text-white border border-blue-600'
                                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    onClick={() => onPage(current_page + 1)}
                    disabled={current_page === last_page}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>
            </div>
        </div>
    );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function CandidatosPage() {
    const [paginado, setPaginado]       = useState<PaginatedResponse<Candidato> | null>(null);
    const [loading, setLoading]         = useState(false);
    const [elections, setElections]     = useState<Election[]>([]);
    const [cargos, setCargos]           = useState<Cargo[]>([]);
    const [partidos, setPartidos]       = useState<Partido[]>([]);
    const [page, setPage]               = useState(1);
    const [filtros, setFiltros]         = useState<Filtros>({
        eleicao_id: '', cargo_id: '', partido_id: '', search: '', per_page: '25',
    });
    const [searchInput, setSearchInput] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Carrega opções dos filtros uma vez
    useEffect(() => {
        Promise.all([api.getElections(), api.getCargos(), api.getPartidos()]).then(([e, c, p]) => {
            setElections(e as Election[]);
            setCargos(c as Cargo[]);
            setPartidos(p as Partido[]);
        });
    }, []);

    // Busca paginada sempre que filtros ou página mudam
    const buscar = useCallback(() => {
        setLoading(true);
        const params: Record<string, string> = { page: String(page), per_page: filtros.per_page };
        if (filtros.eleicao_id) params.eleicao_id = filtros.eleicao_id;
        if (filtros.cargo_id)   params.cargo_id   = filtros.cargo_id;
        if (filtros.partido_id) params.partido_id = filtros.partido_id;
        if (filtros.search)     params.search     = filtros.search;

        api.getCandidates(params)
            .then(res => setPaginado(res as PaginatedResponse<Candidato>))
            .finally(() => setLoading(false));
    }, [filtros, page]);

    useEffect(() => { buscar(); }, [buscar]);

    // Debounce no campo de busca
    const handleSearch = (value: string) => {
        setSearchInput(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            setFiltros(f => ({ ...f, search: value }));
        }, 400);
    };

    const setFiltro = (key: keyof Filtros, value: string) => {
        setPage(1);
        setFiltros(f => ({ ...f, [key]: value }));
    };

    const limparFiltros = () => {
        setSearchInput('');
        setPage(1);
        setFiltros({ eleicao_id: '', cargo_id: '', partido_id: '', search: '', per_page: filtros.per_page });
    };

    const temFiltro = !!(filtros.eleicao_id || filtros.cargo_id || filtros.partido_id || filtros.search);
    const candidatos = paginado?.data ?? [];
    const maxVotos   = Math.max(...candidatos.map(c => c.total_votos), 1);

    // Offset global para numeração contínua (#)
    const offset = paginado ? (paginado.current_page - 1) * paginado.per_page : 0;

    return (
        <div>
            <Head title="Candidatos" />

            {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white shadow-sm">
                        <i className="fa-solid fa-users text-base"></i>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 leading-tight">Candidatos</h1>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {loading
                                ? 'Buscando…'
                                : paginado
                                    ? `${paginado.total.toLocaleString('pt-BR')} candidato${paginado.total !== 1 ? 's' : ''}`
                                    : '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Filtros ───────────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 shadow-sm">
                <div className="flex flex-col md:flex-row gap-3">

                    {/* Busca */}
                    <div className="relative flex-1">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                        <input
                            type="text"
                            placeholder="Buscar por nome…"
                            value={searchInput}
                            onChange={e => handleSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                        />
                        {searchInput && (
                            <button
                                onClick={() => handleSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                        )}
                    </div>

                    {/* Eleição */}
                    <select
                        value={filtros.eleicao_id}
                        onChange={e => setFiltro('eleicao_id', e.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-700"
                    >
                        <option value="">Todas as eleições</option>
                        {elections.map(e => (
                            <option key={e.id} value={e.id}>{e.turno}º Turno — {e.descricao}</option>
                        ))}
                    </select>

                    {/* Cargo */}
                    <select
                        value={filtros.cargo_id}
                        onChange={e => setFiltro('cargo_id', e.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-700"
                    >
                        <option value="">Todos os cargos</option>
                        {cargos.map(c => (
                            <option key={c.id} value={c.id}>{c.descricao}</option>
                        ))}
                    </select>

                    {/* Partido */}
                    <select
                        value={filtros.partido_id}
                        onChange={e => setFiltro('partido_id', e.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-700"
                    >
                        <option value="">Todos os partidos</option>
                        {partidos.map(p => (
                            <option key={p.id} value={p.id}>{p.sigla} — {p.nome}</option>
                        ))}
                    </select>

                    {temFiltro && (
                        <button
                            onClick={limparFiltros}
                            className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                        >
                            <i className="fa-solid fa-filter-slash mr-1.5"></i>Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tabela ────────────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-400"></i>
                        <span className="text-sm">Carregando candidatos…</span>
                    </div>
                ) : candidatos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                        <i className="fa-solid fa-user-slash text-4xl text-gray-300"></i>
                        <p className="font-medium text-gray-500">Nenhum candidato encontrado</p>
                        {temFiltro && (
                            <button onClick={limparFiltros} className="text-sm text-blue-600 hover:underline">
                                Limpar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/60">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidato</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Partido</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Cargo</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Eleição</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Votos</th>
                                        <th className="py-3 px-4 w-20"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {candidatos.map((c, i) => (
                                        <tr
                                            key={c.id}
                                            className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                                            onClick={() => { window.location.href = `/app/candidato/${c.id}`; }}
                                        >
                                            {/* Rank global */}
                                            <td className="py-3 px-4 text-gray-400 font-mono text-xs tabular-nums">
                                                {offset + i + 1}
                                            </td>

                                            {/* Candidato */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <CandidatoAvatar
                                                        sqCandidato={c.sq_candidato}
                                                        numero={c.numero}
                                                        index={offset + i}
                                                        size="sm"
                                                    />
                                                    <div>
                                                        <p className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors leading-tight">{c.nome}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{c.situacao || 'Candidato'}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Partido */}
                                            <td className="py-3 px-4 hidden md:table-cell">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${partidoColor(c.partido_sigla)}`}>
                                                    {c.partido_sigla}
                                                </span>
                                            </td>

                                            {/* Cargo */}
                                            <td className="py-3 px-4 hidden lg:table-cell text-gray-600 text-xs">{c.cargo_descricao}</td>

                                            {/* Eleição */}
                                            <td className="py-3 px-4 hidden lg:table-cell text-gray-500 text-xs">{c.eleicao_ano}</td>

                                            {/* Votos */}
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="font-bold text-gray-800 tabular-nums">{formatVotes(c.total_votos)}</span>
                                                    <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 rounded-full"
                                                            style={{ width: `${(c.total_votos / maxVotos) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Ação */}
                                            <td className="py-3 px-4">
                                                <Link
                                                    href={`/app/candidato/${c.id}`}
                                                    onClick={e => e.stopPropagation()}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                                                >
                                                    Ver <i className="fa-solid fa-arrow-right text-xs"></i>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Rodapé: paginação + por página ──────────────── */}
                        {paginado && (
                            <div className="px-4 pb-4 pt-2">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <Paginacao meta={paginado} onPage={p => setPage(p)} />

                                    {/* Por página */}
                                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                                        <span>Por página:</span>
                                        <div className="flex gap-1">
                                            {PER_PAGE_OPTIONS.map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => { setPage(1); setFiltros(f => ({ ...f, per_page: opt })); }}
                                                    className={`w-9 h-7 rounded-md text-xs font-medium border transition-colors ${
                                                        filtros.per_page === opt
                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
