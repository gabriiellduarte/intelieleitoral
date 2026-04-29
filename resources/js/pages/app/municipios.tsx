import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import axios from 'axios';
import * as api from '@/services/api';

type Municipio = {
    id: number;
    nome: string;
    uf: string | null;
    codigo_ibge: string | null;
    codigo_tse: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
};

type PaginadoMunicipios = {
    data: Municipio[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type Filtros = {
    search: string;
    uf: string;
    per_page: string;
};

type PropsPagina = {
    municipios: PaginadoMunicipios;
    filtros: Filtros;
    ufs: string[];
};

type DadosFormularioMunicipio = {
    nome: string;
    uf: string;
    codigo_ibge: string;
    codigo_tse: string;
    latitude: string;
    longitude: string;
};

type ErrosGlobais = Record<string, string>;

type PropsCompartilhadas = {
    flash?: {
        success?: string;
    };
    errors?: ErrosGlobais;
};

const OPCOES_POR_PAGINA = ['10', '15', '25', '50', '100'];

function formatarNumero(valor: string | number | null): string {
    if (valor === null || valor === undefined || valor === '') {
        return '-';
    }

    const numero = Number(valor);
    if (Number.isNaN(numero)) {
        return String(valor);
    }

    return numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 7,
    });
}

function montarDadosIniciais(municipio?: Municipio): DadosFormularioMunicipio {
    return {
        nome: municipio?.nome ?? '',
        uf: municipio?.uf ?? '',
        codigo_ibge: municipio?.codigo_ibge ?? '',
        codigo_tse: municipio?.codigo_tse ?? '',
        latitude: municipio?.latitude !== null && municipio?.latitude !== undefined ? String(municipio.latitude) : '',
        longitude: municipio?.longitude !== null && municipio?.longitude !== undefined ? String(municipio.longitude) : '',
    };
}

export default function MunicipiosPage({ municipios, filtros, ufs }: PropsPagina) {
    const { flash, errors } = usePage<PropsCompartilhadas>().props;

    const [filtroBusca, setFiltroBusca] = useState(filtros.search ?? '');
    const [filtroUf, setFiltroUf] = useState(filtros.uf ?? '');
    const [filtroPorPagina, setFiltroPorPagina] = useState(filtros.per_page ?? String(municipios.per_page));

    const [municipioEmEdicao, setMunicipioEmEdicao] = useState<Municipio | null>(null);
    const [carregandoCoordenadas, setCarregandoCoordenadas] = useState(false);
    const [mensagemCoordenadas, setMensagemCoordenadas] = useState<string | null>(null);

    const formularioCriacao = useForm<DadosFormularioMunicipio>(montarDadosIniciais());
    const formularioEdicao = useForm<DadosFormularioMunicipio>(montarDadosIniciais());

    const resumoPaginacao = useMemo(() => {
        const inicio = municipios.from ?? 0;
        const fim = municipios.to ?? 0;
        return `Mostrando ${inicio} - ${fim} de ${municipios.total.toLocaleString('pt-BR')} municípios`;
    }, [municipios.from, municipios.to, municipios.total]);

    const aplicarFiltros = () => {
        router.get('/app/municipios', {
            search: filtroBusca,
            uf: filtroUf,
            per_page: filtroPorPagina,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const trocarPagina = (pagina: number) => {
        router.get('/app/municipios', {
            search: filtroBusca,
            uf: filtroUf,
            per_page: filtroPorPagina,
            page: pagina,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const limparFiltros = () => {
        setFiltroBusca('');
        setFiltroUf('');
        setFiltroPorPagina('15');

        router.get('/app/municipios', {
            search: '',
            uf: '',
            per_page: '15',
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const enviarCriacao = (evento: React.FormEvent<HTMLFormElement>) => {
        evento.preventDefault();

        formularioCriacao.transform((dados) => ({
            ...dados,
            uf: dados.uf.trim().toUpperCase(),
        }));

        formularioCriacao.post('/app/municipios', {
            preserveScroll: true,
            onSuccess: () => {
                formularioCriacao.reset();
            },
        });
    };

    const abrirModalEdicao = (municipio: Municipio) => {
        setMunicipioEmEdicao(municipio);
        formularioEdicao.setData(montarDadosIniciais(municipio));
        formularioEdicao.clearErrors();
        setMensagemCoordenadas(null);
    };

    const fecharModalEdicao = () => {
        setMunicipioEmEdicao(null);
        formularioEdicao.reset();
        formularioEdicao.clearErrors();
        setMensagemCoordenadas(null);
    };

    const obterCoordenadasAutomaticas = async () => {
        const nomeCidade = formularioEdicao.data.nome.trim();
        if (!nomeCidade) {
            setMensagemCoordenadas('Informe o nome do município antes de buscar coordenadas.');
            return;
        }

        setCarregandoCoordenadas(true);
        setMensagemCoordenadas(null);

        try {
            const resposta = await api.obterCoordenadasGoogle({
                cidade: nomeCidade,
                uf: formularioEdicao.data.uf.trim(),
                pais: 'Brasil',
            }) as {
                latitude: number;
                longitude: number;
                endereco_formatado?: string | null;
            };

            formularioEdicao.setData('latitude', resposta.latitude.toFixed(7));
            formularioEdicao.setData('longitude', resposta.longitude.toFixed(7));

            const endereco = resposta.endereco_formatado ? ` Endereço: ${resposta.endereco_formatado}.` : '';
            setMensagemCoordenadas(`Coordenadas obtidas com sucesso.${endereco}`);
        } catch (erro: unknown) {
            let mensagem = 'Nao foi possivel obter coordenadas automaticamente.';

            if (axios.isAxiosError(erro)) {
                const erroApi = erro.response?.data as { error?: string } | undefined;
                if (erroApi?.error) {
                    mensagem = erroApi.error;
                }
            }

            setMensagemCoordenadas(mensagem);
        } finally {
            setCarregandoCoordenadas(false);
        }
    };

    const enviarEdicao = (evento: React.FormEvent<HTMLFormElement>) => {
        evento.preventDefault();
        if (!municipioEmEdicao) {
            return;
        }

        formularioEdicao.transform((dados) => ({
            ...dados,
            uf: dados.uf.trim().toUpperCase(),
        }));

        formularioEdicao.put(`/app/municipios/${municipioEmEdicao.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                fecharModalEdicao();
            },
        });
    };

    const excluirMunicipio = (municipio: Municipio) => {
        const confirmou = window.confirm(`Deseja realmente excluir o município ${municipio.nome}?`);
        if (!confirmou) {
            return;
        }

        router.delete(`/app/municipios/${municipio.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <div>
            <Head title="Municípios" />

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-sm">
                        <i className="fa-solid fa-city text-base"></i>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 leading-tight">Municípios</h1>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {municipios.total.toLocaleString('pt-BR')} registros
                        </p>
                    </div>
                </div>
            </div>

            {flash?.success && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {flash.success}
                </div>
            )}

            {errors?.municipio && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errors.municipio}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Novo município</h2>
                <form onSubmit={enviarCriacao} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <input
                        value={formularioCriacao.data.nome}
                        onChange={(evento) => formularioCriacao.setData('nome', evento.target.value)}
                        className="lg:col-span-2 py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome"
                    />
                    <input
                        value={formularioCriacao.data.uf}
                        onChange={(evento) => formularioCriacao.setData('uf', evento.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="UF"
                        maxLength={2}
                    />
                    <input
                        value={formularioCriacao.data.codigo_ibge}
                        onChange={(evento) => formularioCriacao.setData('codigo_ibge', evento.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Código IBGE"
                    />
                    <input
                        value={formularioCriacao.data.codigo_tse}
                        onChange={(evento) => formularioCriacao.setData('codigo_tse', evento.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Código TSE"
                    />
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={formularioCriacao.processing}
                            className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                        >
                            {formularioCriacao.processing ? 'Salvando...' : 'Adicionar'}
                        </button>
                    </div>
                </form>

                {Object.keys(formularioCriacao.errors).length > 0 && (
                    <div className="mt-3 text-xs text-red-600 space-y-1">
                        {Object.entries(formularioCriacao.errors).map(([chave, mensagem]) => (
                            <p key={chave}>{mensagem}</p>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                        value={filtroBusca}
                        onChange={(evento) => setFiltroBusca(evento.target.value)}
                        className="md:col-span-2 py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Buscar por nome, código TSE ou IBGE"
                    />
                    <select
                        value={filtroUf}
                        onChange={(evento) => setFiltroUf(evento.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todas as UFs</option>
                        {ufs.map((uf) => (
                            <option key={uf} value={uf}>{uf}</option>
                        ))}
                    </select>
                    <select
                        value={filtroPorPagina}
                        onChange={(evento) => setFiltroPorPagina(evento.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {OPCOES_POR_PAGINA.map((opcao) => (
                            <option key={opcao} value={opcao}>{opcao} por página</option>
                        ))}
                    </select>
                </div>

                <div className="mt-3 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={aplicarFiltros}
                        className="py-2 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                    >
                        Filtrar
                    </button>
                    <button
                        type="button"
                        onClick={limparFiltros}
                        className="py-2 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                        Limpar
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-225">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Nome</th>
                                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">UF</th>
                                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Código TSE</th>
                                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Código IBGE</th>
                                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Latitude</th>
                                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Longitude</th>
                                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {municipios.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                                        Nenhum município encontrado.
                                    </td>
                                </tr>
                            )}

                            {municipios.data.map((municipio) => (
                                <tr
                                    key={municipio.id}
                                    className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                                    onClick={() => router.visit(`/app/municipios/${municipio.id}`)}
                                >
                                    <td className="px-4 py-3 text-sm font-medium text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <i className="fa-solid fa-circle-info text-blue-500 text-xs"></i>
                                            <span>{municipio.nome}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{municipio.uf ?? '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{municipio.codigo_tse ?? '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{municipio.codigo_ibge ?? '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatarNumero(municipio.latitude)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatarNumero(municipio.longitude)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={(evento) => {
                                                    evento.stopPropagation();
                                                    abrirModalEdicao(municipio);
                                                }}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(evento) => {
                                                    evento.stopPropagation();
                                                    excluirMunicipio(municipio);
                                                }}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                                            >
                                                Excluir
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">{resumoPaginacao}</p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => trocarPagina(municipios.current_page - 1)}
                            disabled={municipios.current_page <= 1}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <span className="text-xs text-gray-500">
                            Página {municipios.current_page} de {municipios.last_page}
                        </span>
                        <button
                            type="button"
                            onClick={() => trocarPagina(municipios.current_page + 1)}
                            disabled={municipios.current_page >= municipios.last_page}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            </div>

            {municipioEmEdicao && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                            <h3 className="text-base font-semibold text-gray-800">Editar município</h3>
                            <button
                                type="button"
                                onClick={fecharModalEdicao}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={enviarEdicao} className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-gray-500">Nome</label>
                                    <input
                                        value={formularioEdicao.data.nome}
                                        onChange={(evento) => formularioEdicao.setData('nome', evento.target.value)}
                                        className="mt-1 w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500">UF</label>
                                    <input
                                        value={formularioEdicao.data.uf}
                                        onChange={(evento) => formularioEdicao.setData('uf', evento.target.value)}
                                        className="mt-1 w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        maxLength={2}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Código IBGE</label>
                                    <input
                                        value={formularioEdicao.data.codigo_ibge}
                                        onChange={(evento) => formularioEdicao.setData('codigo_ibge', evento.target.value)}
                                        className="mt-1 w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Código TSE</label>
                                    <input
                                        value={formularioEdicao.data.codigo_tse}
                                        onChange={(evento) => formularioEdicao.setData('codigo_tse', evento.target.value)}
                                        className="mt-1 w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Latitude</label>
                                    <input
                                        value={formularioEdicao.data.latitude}
                                        onChange={(evento) => formularioEdicao.setData('latitude', evento.target.value)}
                                        className="mt-1 w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Longitude</label>
                                    <input
                                        value={formularioEdicao.data.longitude}
                                        onChange={(evento) => formularioEdicao.setData('longitude', evento.target.value)}
                                        className="mt-1 w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={obterCoordenadasAutomaticas}
                                        disabled={carregandoCoordenadas}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-sm text-white font-medium hover:bg-cyan-700 disabled:opacity-60"
                                    >
                                        <i className={`fa-solid ${carregandoCoordenadas ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'} text-xs`}></i>
                                        {carregandoCoordenadas ? 'Buscando coordenadas...' : 'Obter coordenadas'}
                                    </button>

                                    {mensagemCoordenadas && (
                                        <p className="text-xs text-gray-600">{mensagemCoordenadas}</p>
                                    )}
                                </div>
                            </div>

                            {Object.keys(formularioEdicao.errors).length > 0 && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 space-y-1">
                                    {Object.entries(formularioEdicao.errors).map(([chave, mensagem]) => (
                                        <p key={chave}>{mensagem}</p>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={fecharModalEdicao}
                                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={formularioEdicao.processing}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {formularioEdicao.processing ? 'Salvando...' : 'Salvar alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
