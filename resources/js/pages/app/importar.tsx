import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import * as api from '@/services/api';
import type { TipoImportacaoV3 } from '@/services/api';

type StatusData = { eleicoes: number; candidatos: number; votos: number; municipios: number };
type Election   = { id: number; ano: number; tipo?: string; descricao?: string; turno?: number; uf: string };
type Candidate  = { id: number; nome: string; numero: number; cargo_descricao?: string; partido_sigla?: string };
type HistoricoImportacao = {
    id: number;
    arquivo_nome: string;
    tipo: string | null;
    status: 'processando' | 'importando_matriz' | 'matriz_importada' | 'gerando' | 'concluida' | 'falha';
    total_linhas: number;
    importados: number;
    erros: number;
    created_at: string;
};
type Divergencia = {
    sq_candidato: string;
    candidato_nome: string;
    nr_zona: string;
    municipio_nome: string;
    votos_base: number;
    votos_secoes: number;
    divergencia: number;
};

export default function ImportarPage() {
    const [status,    setStatus]    = useState<StatusData | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result,    setResult]    = useState<{ importados?: number; erros?: number; tipo?: string; total_linhas?: number; status?: string; message?: string } | null>(null);
    const [error,     setError]     = useState<string | null>(null);
    const [divergencias, setDivergencias] = useState<Divergencia[]>([]);
    const [tipoImportacao, setTipoImportacao] = useState<TipoImportacaoV3>('candidato_munzona');
    const [tab,       setTab]       = useState<'upload' | 'generation' | 'history' | 'elections' | 'candidates'>('upload');
    const [elections,  setElections]  = useState<Election[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [historicoImportacoes, setHistoricoImportacoes] = useState<HistoricoImportacao[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [carregandoHistorico, setCarregandoHistorico] = useState(false);
    const [excluindoImportacaoId, setExcluindoImportacaoId] = useState<number | null>(null);
    const [gerandoImportacaoId, setGerandoImportacaoId] = useState<number | null>(null);

    useEffect(() => { loadStatus(); }, []);

    const loadStatus = async () => {
        try { setStatus(await api.getStatus()); } catch { /* silencioso */ }
    };

    const loadElections = async () => {
        setLoadingData(true);
        try { setElections(await api.getElections()); } finally { setLoadingData(false); }
    };

    const loadCandidates = async () => {
        setLoadingData(true);
        try {
            const response = await api.getCandidates({ first: 100 });
            setCandidates(response.data as unknown as Candidate[]);
        } finally {
            setLoadingData(false);
        }
    };

    const loadHistoricoImportacoes = async () => {
        setCarregandoHistorico(true);
        try {
            setHistoricoImportacoes(await api.getHistoricoImportacoes());
        } finally {
            setCarregandoHistorico(false);
        }
    };

    const excluirImportacao = async (importacaoId: number) => {
        const confirmar = window.confirm('Deseja realmente excluir esta importação e todos os dados vinculados a ela?');
        if (!confirmar) return;

        setExcluindoImportacaoId(importacaoId);
        setError(null);
        try {
            await api.excluirImportacao(importacaoId);
            await Promise.all([loadHistoricoImportacoes(), loadStatus()]);
        } catch (err: unknown) {
            const erro = err as { response?: { data?: { error?: string } }; message?: string };
            setError(erro.response?.data?.error ?? erro.message ?? 'Erro ao excluir importação');
        } finally {
            setExcluindoImportacaoId(null);
        }
    };

    const gerarImportacao = async (importacaoId: number) => {
        setGerandoImportacaoId(importacaoId);
        setError(null);
        setResult(null);
        try {
            const res = await api.gerarImportacao(importacaoId);
            setResult(res);
            await Promise.all([loadHistoricoImportacoes(), loadStatus()]);
        } catch (err: unknown) {
            const erro = err as { response?: { data?: { error?: string } }; message?: string };
            setError(erro.response?.data?.error ?? erro.message ?? 'Erro ao gerar dados da importação');
        } finally {
            setGerandoImportacaoId(null);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true); setError(null); setResult(null); setDivergencias([]);
        try {
            const res = await api.importFile(file, tipoImportacao);
            setResult(res);
            setTimeout(() => {
                void loadStatus();
                void loadHistoricoImportacoes();
            }, 1000);
        } catch (err: unknown) {
            const httpErr = err as { response?: { data?: { error?: string; divergencias?: Divergencia[] } }; message?: string };
            setError(httpErr.response?.data?.error ?? httpErr.message ?? 'Erro desconhecido');
            setDivergencias(httpErr.response?.data?.divergencias ?? []);
        } finally {
            setUploading(false);
            // Limpa o input para permitir reenviar o mesmo arquivo após erro
            (e.target as HTMLInputElement).value = '';
        }
    };

    const tabs = [
        { id: 'upload'    as const, label: '📤 Upload de Dados',  icon: 'fa-cloud-arrow-up' },
        { id: 'generation'as const, label: '⚙️ Geração',          icon: 'fa-gears' },
        { id: 'history'   as const, label: '🕘 Histórico',         icon: 'fa-clock-rotate-left' },
        { id: 'elections' as const, label: '📋 Eleições',          icon: 'fa-ballot'         },
        { id: 'candidates'as const, label: '👥 Candidatos',        icon: 'fa-users'          },
    ];

    const importacoesParaGerar = historicoImportacoes.filter(
        item => ['candidato_munzona', 'votos_secao', 'boletim_urna'].includes(item.tipo ?? '') && item.status === 'matriz_importada',
    );

    const textoStatus = (statusImportacao: HistoricoImportacao['status']) => {
        const labels: Record<HistoricoImportacao['status'], string> = {
            processando: 'processando',
            importando_matriz: 'importando matriz',
            matriz_importada: 'matriz importada',
            gerando: 'gerando',
            concluida: 'concluida',
            falha: 'falha',
        };

        return labels[statusImportacao] ?? statusImportacao;
    };

    const classeStatus = (statusImportacao: HistoricoImportacao['status']) => {
        if (statusImportacao === 'concluida') return 'bg-emerald-100 text-emerald-700';
        if (statusImportacao === 'falha') return 'bg-red-100 text-red-700';
        if (statusImportacao === 'matriz_importada') return 'bg-blue-100 text-blue-700';
        return 'bg-amber-100 text-amber-700';
    };

    const nomeTipoImportacao = (tipo?: string | null) => {
        if (tipo === 'candidato_munzona') return 'Arquivo Base';
        if (tipo === 'votos_secao') return 'Votos por Seção';
        if (tipo === 'municipio_referencia') return 'Referência de Municípios';
        if (tipo === 'boletim_urna') return 'Boletim de Urna';
        return tipo ?? '—';
    };

    return (
        <div>
            <Head title="Importar Dados" />
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Importar e Gerenciar Dados do TSE</h1>

            {/* Status */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Status do Banco de Dados</h2>
                {status ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Eleições',   val: status.eleicoes,                       bg: 'bg-blue-50   border-blue-100',   txt: 'text-blue-700'   },
                            { label: 'Candidatos', val: status.candidatos,                     bg: 'bg-purple-50 border-purple-100', txt: 'text-purple-700' },
                            { label: 'Votos',      val: `${(status.votos/1e6).toFixed(1)}M`,  bg: 'bg-emerald-50 border-emerald-100',txt: 'text-emerald-700'},
                            { label: 'Municípios', val: status.municipios,                     bg: 'bg-amber-50  border-amber-100',  txt: 'text-amber-700'  },
                        ].map(item => (
                            <div key={item.label} className={`${item.bg} border rounded-lg p-4`}>
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">{item.label}</div>
                                <div className={`text-3xl font-bold ${item.txt} mt-1`}>{item.val}</div>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-gray-400">Carregando…</p>}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => {
                            setTab(t.id);
                            if (t.id === 'history' && historicoImportacoes.length === 0) void loadHistoricoImportacoes();
                            if (t.id === 'generation') void loadHistoricoImportacoes();
                            if (t.id === 'elections' && elections.length === 0) loadElections();
                            if (t.id === 'candidates' && candidates.length === 0) loadCandidates();
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <i className={`fa-solid ${t.icon} mr-2`}></i>{t.label}
                    </button>
                ))}
            </div>

            {/* ─── Upload ─── */}
            {tab === 'upload' && (
                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-700 mb-2">Upload de Arquivo CSV</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            Faça upload de arquivos CSV do TSE (Boletim de Urna). O sistema processará e adicionará automaticamente aos dados existentes.
                        </p>

                        <div className="mb-6">
                            <label htmlFor="tipo-importacao" className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de arquivo
                            </label>
                            <select
                                id="tipo-importacao"
                                value={tipoImportacao}
                                onChange={(evento) => {
                                    setTipoImportacao(evento.target.value as TipoImportacaoV3);
                                    setError(null); setResult(null); setDivergencias([]);
                                }}
                                disabled={uploading}
                                className="w-full md:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            >
                                <option value="municipio_referencia">🏙️ Referência de Municípios — Tabela TSE/IBGE</option>
                                <option value="candidato_munzona">📊 Arquivo Base — Candidatos por Município/Zona</option>
                                <option value="votos_secao">📋 Votos por Seção — Com endereço do local</option>
                                <option value="boletim_urna">🗳️ Boletim de Urna — Participação eleitoral por seção</option>
                            </select>

                            {/* Descrição contextual do tipo selecionado */}
                            {tipoImportacao === 'municipio_referencia' && (
                                <p className="mt-2 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                                    <i className="fa-solid fa-map-location-dot mr-1.5"></i>
                                    <strong>Referência de Municípios:</strong> importa a tabela oficial TSE/IBGE com os códigos
                                    e nomes de todos os municípios. Recomendado importar <strong>antes</strong> dos demais arquivos
                                    para garantir o vínculo correto entre os códigos TSE e IBGE.
                                </p>
                            )}
                            {tipoImportacao === 'candidato_munzona' && (
                                <p className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                    <i className="fa-solid fa-circle-info mr-1.5"></i>
                                    <strong>Arquivo Base:</strong> importa candidatos, partidos e o total oficial de votos por zona.
                                    Este arquivo deve ser importado <strong>primeiro</strong>.
                                </p>
                            )}
                            {tipoImportacao === 'votos_secao' && (
                                <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
                                    <strong>Votos por Seção:</strong> detalha os votos por seção com nome e endereço do local de votação.
                                    Certifique-se de ter importado o <strong>arquivo base primeiro</strong>.
                                    A importação será bloqueada se a soma das seções não bater com os totais oficiais.
                                </p>
                            )}
                            {tipoImportacao === 'boletim_urna' && (
                                <p className="mt-2 text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                                    <i className="fa-solid fa-box-ballot mr-1.5"></i>
                                    <strong>Boletim de Urna:</strong> complementa os dados de participação — preenche aptos,
                                    comparecimento e abstenções por seção, além do tipo de voto explícito (Nominal/Branco/Nulo/Legenda).
                                    Se o <strong>Votos por Seção</strong> já foi importado, atualiza os registros existentes sem perder o vínculo com candidatos.
                                </p>
                            )}
                        </div>

                        <label className="block cursor-pointer">
                            <div className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${uploading ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
                                {uploading ? (
                                    <div className="text-blue-600">
                                        <i className="fa-solid fa-spinner fa-spin text-4xl mb-3 block"></i>
                                        <p className="font-semibold">Processando arquivo…</p>
                                        <p className="text-xs text-gray-500 mt-2">Isso pode levar alguns segundos</p>
                                    </div>
                                ) : (
                                    <div className="text-gray-600">
                                        <i className="fa-solid fa-cloud-arrow-up text-4xl mb-3 block text-blue-500"></i>
                                        <p className="font-semibold text-gray-800">Clique para selecionar arquivo CSV</p>
                                        <p className="text-xs text-gray-500 mt-2">Formato: CSV do TSE com delimitador ";"</p>
                                    </div>
                                )}
                            </div>
                            <input type="file" accept=".csv" onChange={handleUpload} disabled={uploading} className="hidden" />
                        </label>

                        {result && (
                            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                                <i className="fa-solid fa-check-circle text-emerald-600 text-xl mt-0.5"></i>
                                <div>
                                    <p className="text-emerald-800 font-semibold">
                                        {result.status === 'matriz_importada' ? 'Arquivo importado para a matriz!' : 'Operação concluída com sucesso!'}
                                    </p>
                                    <p className="text-sm text-emerald-700 mt-1">
                                        {result.status === 'matriz_importada'
                                            ? `${(result.total_linhas ?? 0).toLocaleString('pt-BR')} linhas espelhadas na tabela principal`
                                            : `${(result.importados ?? 0).toLocaleString('pt-BR')} registros gerados`}
                                        {(result.erros ?? 0) > 0 && ` · ${(result.erros ?? 0).toLocaleString('pt-BR')} com erro`}
                                    </p>
                                    {result.message && <p className="text-xs text-emerald-600 mt-1">{result.message}</p>}
                                    {result.tipo && (
                                        <p className="text-xs text-emerald-600 mt-1">
                                            Tipo: {
                                                result.tipo === 'candidato_munzona'    ? 'Arquivo Base' :
                                                result.tipo === 'votos_secao'          ? 'Votos por Seção' :
                                                result.tipo === 'municipio_referencia' ? 'Referência de Municípios' :
                                                result.tipo === 'boletim_urna'         ? 'Boletim de Urna' :
                                                result.tipo
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-6 space-y-3">
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                                    <i className="fa-solid fa-exclamation-circle text-red-600 text-xl mt-0.5"></i>
                                    <div>
                                        <p className="text-red-800 font-semibold">Erro na importação</p>
                                        <p className="text-sm text-red-700 mt-1">{error}</p>
                                    </div>
                                </div>

                                {divergencias.length > 0 && (
                                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                        <p className="text-sm font-semibold text-orange-800 mb-3">
                                            <i className="fa-solid fa-scale-unbalanced mr-1.5"></i>
                                            {divergencias.length} divergência(s) encontrada(s) entre as seções e o arquivo base:
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-orange-200">
                                                        {['Candidato','Município','Zona','Votos Base','Votos Seções','Diferença'].map(h => (
                                                            <th key={h} className="text-left py-2 px-3 font-semibold text-orange-700">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {divergencias.map((d, i) => (
                                                        <tr key={i} className="border-b border-orange-100">
                                                            <td className="py-2 px-3 text-orange-900 font-medium">{d.candidato_nome}</td>
                                                            <td className="py-2 px-3 text-orange-800">{d.municipio_nome}</td>
                                                            <td className="py-2 px-3 text-orange-800">{d.nr_zona}</td>
                                                            <td className="py-2 px-3 text-orange-800">{d.votos_base.toLocaleString('pt-BR')}</td>
                                                            <td className="py-2 px-3 text-orange-800">{d.votos_secoes.toLocaleString('pt-BR')}</td>
                                                            <td className="py-2 px-3 font-bold text-red-700">{d.divergencia.toLocaleString('pt-BR')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Como obter os dados</h2>
                        <ol className="space-y-3 text-sm text-gray-600">
                            {[
                                <>Acesse <a href="https://www.tse.jus.br/eleitor" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">o portal do TSE</a></>,
                                'Navegue até "Dados Abertos" → "Eleições"',
                                'Baixe os arquivos CSV de "Boletim de Urna" (formato CSV, delimitador ";")',
                                'Faça upload aqui — o sistema adicionará automaticamente aos dados existentes',
                            ].map((step, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="text-blue-600 font-bold shrink-0">{i + 1}</span>
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}

            {/* ─── Geração ─── */}
            {tab === 'generation' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-700">Geração das Tabelas Finais</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Execute a geração depois que o arquivo estiver espelhado na tabela principal.
                            </p>
                        </div>
                        <button
                            onClick={() => void loadHistoricoImportacoes()}
                            disabled={carregandoHistorico}
                            className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                            <i className={`fa-solid ${carregandoHistorico ? 'fa-spinner fa-spin' : 'fa-rotate'} mr-2`}></i>
                            Atualizar
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <i className="fa-solid fa-exclamation-circle text-red-600 text-xl mt-0.5"></i>
                            <div>
                                <p className="text-red-800 font-semibold">Erro na geração</p>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {result && result.status !== 'matriz_importada' && (
                        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                            <i className="fa-solid fa-check-circle text-emerald-600 text-xl mt-0.5"></i>
                            <div>
                                <p className="text-emerald-800 font-semibold">Geração concluída</p>
                                <p className="text-sm text-emerald-700 mt-1">
                                    {(result.importados ?? 0).toLocaleString('pt-BR')} registros gerados
                                    {(result.erros ?? 0) > 0 && ` · ${(result.erros ?? 0).toLocaleString('pt-BR')} com erro`}
                                </p>
                            </div>
                        </div>
                    )}

                    {carregandoHistorico ? (
                        <div className="text-center py-8"><i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i></div>
                    ) : importacoesParaGerar.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <i className="fa-solid fa-inbox text-3xl text-gray-300 mb-2 block"></i>
                            Nenhuma importação aguardando geração
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        {['ID','Arquivo','Tipo','Linhas','Status','Data','Ações'].map(h => (
                                            <th key={h} className="text-left py-3 px-4 font-semibold text-gray-700">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {importacoesParaGerar.map(item => (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 font-semibold text-gray-800">#{item.id}</td>
                                            <td className="py-3 px-4 text-gray-700 max-w-90 truncate" title={item.arquivo_nome}>{item.arquivo_nome}</td>
                                            <td className="py-3 px-4 text-gray-600">{nomeTipoImportacao(item.tipo)}</td>
                                            <td className="py-3 px-4 text-gray-600">{item.total_linhas.toLocaleString('pt-BR')}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${classeStatus(item.status)}`}>
                                                    {textoStatus(item.status)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">{new Date(item.created_at).toLocaleString('pt-BR')}</td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => void gerarImportacao(item.id)}
                                                    disabled={gerandoImportacaoId === item.id}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                                                >
                                                    <i className={`fa-solid ${gerandoImportacaoId === item.id ? 'fa-spinner fa-spin' : 'fa-gears'} mr-1.5`}></i>
                                                    Gerar dados
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Histórico ─── */}
            {tab === 'history' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 gap-3">
                        <h2 className="text-lg font-semibold text-gray-700">Histórico de Importações</h2>
                        <button
                            onClick={() => void loadHistoricoImportacoes()}
                            disabled={carregandoHistorico}
                            className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                            <i className={`fa-solid ${carregandoHistorico ? 'fa-spinner fa-spin' : 'fa-rotate'} mr-2`}></i>
                            Atualizar
                        </button>
                    </div>

                    {carregandoHistorico ? (
                        <div className="text-center py-8"><i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i></div>
                    ) : historicoImportacoes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <i className="fa-solid fa-inbox text-3xl text-gray-300 mb-2 block"></i>
                            Nenhuma importação registrada
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        {['ID','Arquivo','Tipo','Status','Linhas','Importados','Erros','Data','Ações'].map(h => (
                                            <th key={h} className="text-left py-3 px-4 font-semibold text-gray-700">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {historicoImportacoes.map(item => (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 font-semibold text-gray-800">#{item.id}</td>
                                            <td className="py-3 px-4 text-gray-700 max-w-70 truncate" title={item.arquivo_nome}>{item.arquivo_nome}</td>
                                            <td className="py-3 px-4 text-gray-600">{nomeTipoImportacao(item.tipo)}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${classeStatus(item.status)}`}>
                                                    {textoStatus(item.status)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">{item.total_linhas.toLocaleString('pt-BR')}</td>
                                            <td className="py-3 px-4 text-gray-600">{item.importados.toLocaleString('pt-BR')}</td>
                                            <td className="py-3 px-4 text-gray-600">{item.erros.toLocaleString('pt-BR')}</td>
                                            <td className="py-3 px-4 text-gray-600">{new Date(item.created_at).toLocaleString('pt-BR')}</td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => void excluirImportacao(item.id)}
                                                    disabled={excluindoImportacaoId === item.id}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                                                >
                                                    <i className={`fa-solid ${excluindoImportacaoId === item.id ? 'fa-spinner fa-spin' : 'fa-trash'} mr-1.5`}></i>
                                                    Excluir
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Eleições ─── */}
            {tab === 'elections' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Eleições Importadas</h2>
                    {loadingData ? (
                        <div className="text-center py-8"><i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i></div>
                    ) : elections.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <i className="fa-solid fa-inbox text-3xl text-gray-300 mb-2 block"></i>
                            Nenhuma eleição importada ainda
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        {['Ano','Tipo','Descrição','Turno','Estado'].map(h => (
                                            <th key={h} className="text-left py-3 px-4 font-semibold text-gray-700">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {elections.map(el => (
                                        <tr key={el.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 font-semibold text-gray-800">{el.ano}</td>
                                            <td className="py-3 px-4 text-gray-600">{el.tipo ?? '—'}</td>
                                            <td className="py-3 px-4 text-gray-600">{el.descricao ?? '—'}</td>
                                            <td className="py-3 px-4 text-gray-600">{el.turno ?? 1}</td>
                                            <td className="py-3 px-4">
                                                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{el.uf}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Candidatos ─── */}
            {tab === 'candidates' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Candidatos Importados</h2>
                    {loadingData ? (
                        <div className="text-center py-8"><i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i></div>
                    ) : candidates.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <i className="fa-solid fa-inbox text-3xl text-gray-300 mb-2 block"></i>
                            Nenhum candidato importado ainda
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {candidates.slice(0, 50).map(c => (
                                <div key={c.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800">{c.nome}</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">#{c.numero}</span>
                                            {c.cargo_descricao && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">{c.cargo_descricao}</span>}
                                            {c.partido_sigla   && <span className="text-xs bg-green-100  text-green-700  px-2 py-1 rounded">{c.partido_sigla}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {candidates.length > 50 && (
                                <p className="text-center text-sm text-gray-500 py-4">Mostrando 50 de {candidates.length} candidatos</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
