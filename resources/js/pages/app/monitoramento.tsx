import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import CandidatoAvatar from '@/components/electoral/CandidatoAvatar';
import * as api from '@/services/api';
import type { PaginatedResponse } from '@/services/api';

type CandidatoBusca = {
    id: number;
    sq_candidato: string | null;
    numero: number;
    nome: string;
    partido_sigla: string;
    cargo_descricao: string;
    eleicao_ano: number;
    total_votos: number;
};

type Favorito = CandidatoBusca & {
    situacao: string | null;
    eleicao_descricao: string;
    monitorado_em: string;
    total_secoes: number;
    total_municipios: number;
    total_zonas: number;
    melhor_municipio: string | null;
    melhor_municipio_votos: number;
};

function formatarNumero(valor: number) {
    return Number(valor ?? 0).toLocaleString('pt-BR');
}

function formatarCompacto(valor: number) {
    const numero = Number(valor ?? 0);
    if (numero >= 1_000_000) return `${(numero / 1_000_000).toFixed(1)}M`;
    if (numero >= 1_000) return `${(numero / 1_000).toFixed(1)}K`;
    return formatarNumero(numero);
}

export default function MonitoramentoPage() {
    const [favoritos, setFavoritos] = useState<Favorito[]>([]);
    const [busca, setBusca] = useState('');
    const [resultados, setResultados] = useState<CandidatoBusca[]>([]);
    const [carregandoFavoritos, setCarregandoFavoritos] = useState(true);
    const [buscando, setBuscando] = useState(false);
    const [salvandoId, setSalvandoId] = useState<number | null>(null);
    const [removendoId, setRemovendoId] = useState<number | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    const favoritosIds = useMemo(() => new Set(favoritos.map(f => f.id)), [favoritos]);
    const totalVotos = favoritos.reduce((total, favorito) => total + Number(favorito.total_votos ?? 0), 0);

    const carregarFavoritos = async () => {
        setCarregandoFavoritos(true);
        setErro(null);
        try {
            const resposta = await axios.get('/app/monitoramento/favoritos');
            setFavoritos(resposta.data as Favorito[]);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            setErro(err.response?.data?.message ?? err.message ?? 'Erro ao carregar monitoramento');
        } finally {
            setCarregandoFavoritos(false);
        }
    };

    useEffect(() => {
        void carregarFavoritos();
    }, []);

    useEffect(() => {
        const termo = busca.trim();
        if (termo.length < 2) {
            setResultados([]);
            return;
        }

        const timer = window.setTimeout(() => {
            setBuscando(true);
            api.getCandidates({ search: termo, per_page: 8 })
                .then((res) => {
                    const paginado = res as PaginatedResponse<CandidatoBusca>;
                    setResultados(paginado.data ?? []);
                })
                .catch((error: unknown) => {
                    const err = error as { message?: string };
                    setErro(err.message ?? 'Erro ao buscar candidatos');
                })
                .finally(() => setBuscando(false));
        }, 350);

        return () => window.clearTimeout(timer);
    }, [busca]);

    const adicionarFavorito = async (candidaturaId: number) => {
        setSalvandoId(candidaturaId);
        setErro(null);
        try {
            const resposta = await axios.post('/app/monitoramento/favoritos', { candidatura_id: candidaturaId });
            setFavoritos(resposta.data as Favorito[]);
            setBusca('');
            setResultados([]);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            setErro(err.response?.data?.message ?? err.message ?? 'Erro ao adicionar candidato');
        } finally {
            setSalvandoId(null);
        }
    };

    const removerFavorito = async (candidaturaId: number) => {
        setRemovendoId(candidaturaId);
        setErro(null);
        try {
            const resposta = await axios.delete(`/app/monitoramento/favoritos/${candidaturaId}`);
            setFavoritos(resposta.data as Favorito[]);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            setErro(err.response?.data?.message ?? err.message ?? 'Erro ao remover candidato');
        } finally {
            setRemovendoId(null);
        }
    };

    return (
        <div>
            <Head title="Monitoramento" />

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Monitoramento de Candidatos</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Acompanhe em uma visão resumida os candidatos que importam para sua operação.
                    </p>
                </div>
                <button
                    onClick={() => void carregarFavoritos()}
                    disabled={carregandoFavoritos}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                    <i className={`fa-solid ${carregandoFavoritos ? 'fa-spinner fa-spin' : 'fa-rotate'} text-xs`}></i>
                    Atualizar
                </button>
            </div>

            {erro && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <i className="fa-solid fa-circle-exclamation mr-2"></i>
                    {erro}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
                {[
                    { label: 'Monitorados', value: favoritos.length, icon: 'fa-star', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                    { label: 'Votos somados', value: formatarCompacto(totalVotos), icon: 'fa-check-to-slot', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { label: 'Municípios', value: formatarNumero(favoritos.reduce((sum, f) => sum + Number(f.total_municipios ?? 0), 0)), icon: 'fa-city', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                    { label: 'Zonas', value: formatarNumero(favoritos.reduce((sum, f) => sum + Number(f.total_zonas ?? 0), 0)), icon: 'fa-layer-group', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
                ].map(item => (
                    <div key={item.label} className={`${item.bg} ${item.border} border rounded-xl p-4`}>
                        <div className="flex items-center gap-2 mb-1">
                            <i className={`fa-solid ${item.icon} ${item.color} text-sm`}></i>
                            <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                        </div>
                        <p className={`text-2xl font-black ${item.color} tabular-nums`}>{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 shadow-sm">
                <label htmlFor="busca-monitoramento" className="block text-sm font-semibold text-gray-700 mb-2">
                    Buscar candidato para monitorar
                </label>
                <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input
                        id="busca-monitoramento"
                        type="text"
                        value={busca}
                        onChange={event => setBusca(event.target.value)}
                        placeholder="Digite pelo menos 2 letras do nome"
                        className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    />
                    {buscando && (
                        <i className="fa-solid fa-spinner fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    )}
                </div>

                {resultados.length > 0 && (
                    <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
                        {resultados.map(candidato => {
                            const jaFavorito = favoritosIds.has(candidato.id);
                            return (
                                <div key={candidato.id} className="flex items-center gap-3 p-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                                    <CandidatoAvatar sqCandidato={candidato.sq_candidato} numero={candidato.numero} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 truncate">{candidato.nome}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {candidato.partido_sigla} · {candidato.cargo_descricao} · {candidato.eleicao_ano}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => void adicionarFavorito(candidato.id)}
                                        disabled={jaFavorito || salvandoId === candidato.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-500"
                                    >
                                        <i className={`fa-solid ${salvandoId === candidato.id ? 'fa-spinner fa-spin' : 'fa-star'} text-xs`}></i>
                                        {jaFavorito ? 'Monitorado' : 'Monitorar'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {carregandoFavoritos ? (
                <div className="bg-white border border-gray-200 rounded-xl p-16 text-center text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-400 mb-3 block"></i>
                    Carregando monitoramento...
                </div>
            ) : favoritos.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-16 text-center text-gray-400">
                    <i className="fa-solid fa-star text-4xl text-gray-300 mb-3 block"></i>
                    <p className="font-medium text-gray-500">Nenhum candidato monitorado</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {favoritos.map(favorito => (
                        <div key={favorito.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                            <div className="flex items-start gap-4">
                                <CandidatoAvatar
                                    sqCandidato={favorito.sq_candidato}
                                    numero={favorito.numero}
                                    size="md"
                                    rounded="2xl"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <Link href={`/app/candidato/${favorito.id}`} className="font-bold text-gray-900 hover:text-blue-700 truncate block">
                                                {favorito.nome}
                                            </Link>
                                            <p className="text-xs text-gray-400 mt-1 truncate">
                                                {favorito.partido_sigla} · {favorito.cargo_descricao} · {favorito.eleicao_ano}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => void removerFavorito(favorito.id)}
                                            disabled={removendoId === favorito.id}
                                            className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            title="Remover do monitoramento"
                                        >
                                            <i className={`fa-solid ${removendoId === favorito.id ? 'fa-spinner fa-spin' : 'fa-trash'} text-sm`}></i>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Votos</p>
                                            <p className="text-xl font-black text-blue-600 tabular-nums">{formatarCompacto(favorito.total_votos)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Municípios</p>
                                            <p className="text-xl font-black text-emerald-600 tabular-nums">{formatarNumero(favorito.total_municipios)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Zonas</p>
                                            <p className="text-xl font-black text-violet-600 tabular-nums">{formatarNumero(favorito.total_zonas)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Seções</p>
                                            <p className="text-xl font-black text-amber-600 tabular-nums">{formatarNumero(favorito.total_secoes)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="text-sm text-gray-500">
                                            <i className="fa-solid fa-location-dot text-gray-300 mr-1.5"></i>
                                            Melhor município: <span className="font-semibold text-gray-700">{favorito.melhor_municipio ?? '-'}</span>
                                            {favorito.melhor_municipio && (
                                                <span className="text-gray-400"> · {formatarNumero(favorito.melhor_municipio_votos)} votos</span>
                                            )}
                                        </div>
                                        <Link
                                            href={`/app/candidato/${favorito.id}`}
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800"
                                        >
                                            Ver perfil <i className="fa-solid fa-arrow-right text-xs"></i>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
