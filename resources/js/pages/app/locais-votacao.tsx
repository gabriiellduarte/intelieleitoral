import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';
import * as api from '@/services/api';

type LocalVotacao = {
    id: number;
    municipio_id: number;
    zona_id: number | null;
    numero: string | null;
    nome: string | null;
    endereco: string | null;
    bairro: string | null;
    cep: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
    municipio_nome: string | null;
    municipio_uf: string | null;
    zona_numero: string | number | null;
};

type MunicipioOpcao = {
    id: number;
    nome: string;
    uf: string | null;
};

type ZonaOpcao = {
    id: number;
    numero: string | number;
    municipio_id: number;
    municipio_nome: string;
    municipio_uf: string | null;
};

type PaginadoLocais = {
    data: LocalVotacao[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type Filtros = {
    search: string;
    municipio_id: string;
    zona_id: string;
    per_page: string;
};

type PropsPagina = {
    locais: PaginadoLocais;
    filtros: Filtros;
    municipios: MunicipioOpcao[];
    zonas: ZonaOpcao[];
};

type DadosFormularioLocal = {
    municipio_id: string;
    zona_id: string;
    numero: string;
    nome: string;
    endereco: string;
    bairro: string;
    cep: string;
    latitude: string;
    longitude: string;
};

type ErrosGlobais = Record<string, string>;

type OpcaoSelect = {
    value: string;
    label: string;
};

type PropsCompartilhadas = {
    flash?: {
        success?: string;
    };
    errors?: ErrosGlobais;
};

const OPCOES_POR_PAGINA = ['10', '15', '25', '50', '100'];

const estilosSelect: StylesConfig<OpcaoSelect, false> = {
    control: (base, state) => ({
        ...base,
        minHeight: 40,
        borderColor: state.isFocused ? '#3b82f6' : '#e5e7eb',
        borderRadius: 8,
        backgroundColor: '#f9fafb',
        boxShadow: state.isFocused ? '0 0 0 2px rgb(59 130 246 / 0.25)' : 'none',
        ':hover': {
            borderColor: state.isFocused ? '#3b82f6' : '#e5e7eb',
        },
    }),
    input: (base) => ({
        ...base,
        color: '#374151',
        fontSize: 14,
    }),
    placeholder: (base) => ({
        ...base,
        color: '#9ca3af',
        fontSize: 14,
    }),
    singleValue: (base) => ({
        ...base,
        color: '#374151',
        fontSize: 14,
    }),
    menu: (base) => ({
        ...base,
        zIndex: 60,
    }),
    option: (base, state) => ({
        ...base,
        fontSize: 14,
        backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : '#fff',
        color: state.isSelected ? '#fff' : '#374151',
    }),
};

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

function montarDadosIniciais(local?: LocalVotacao): DadosFormularioLocal {
    return {
        municipio_id: local?.municipio_id ? String(local.municipio_id) : '',
        zona_id: local?.zona_id ? String(local.zona_id) : '',
        numero: local?.numero ?? '',
        nome: local?.nome ?? '',
        endereco: local?.endereco ?? '',
        bairro: local?.bairro ?? '',
        cep: local?.cep ?? '',
        latitude: local?.latitude !== null && local?.latitude !== undefined ? String(local.latitude) : '',
        longitude: local?.longitude !== null && local?.longitude !== undefined ? String(local.longitude) : '',
    };
}

function montarNomeMunicipio(municipio?: MunicipioOpcao): string {
    if (!municipio) {
        return '';
    }

    return municipio.uf ? `${municipio.nome} - ${municipio.uf}` : municipio.nome;
}

function encontrarOpcao(opcoes: OpcaoSelect[], valor: string): OpcaoSelect | null {
    if (!valor) {
        return null;
    }

    return opcoes.find((opcao) => opcao.value === valor) ?? null;
}

export default function LocaisVotacaoPage({ locais, filtros, municipios, zonas }: PropsPagina) {
    const { flash, errors } = usePage<PropsCompartilhadas>().props;

    const [filtroBusca, setFiltroBusca] = useState(filtros.search ?? '');
    const [filtroMunicipioId, setFiltroMunicipioId] = useState(filtros.municipio_id ?? '');
    const [filtroZonaId, setFiltroZonaId] = useState(filtros.zona_id ?? '');
    const [filtroPorPagina, setFiltroPorPagina] = useState(filtros.per_page ?? String(locais.per_page));

    const [localEmEdicao, setLocalEmEdicao] = useState<LocalVotacao | null>(null);
    const [carregandoCoordenadasCriacao, setCarregandoCoordenadasCriacao] = useState(false);
    const [carregandoCoordenadasEdicao, setCarregandoCoordenadasEdicao] = useState(false);
    const [mensagemCoordenadasCriacao, setMensagemCoordenadasCriacao] = useState<string | null>(null);
    const [mensagemCoordenadasEdicao, setMensagemCoordenadasEdicao] = useState<string | null>(null);

    const formularioCriacao = useForm<DadosFormularioLocal>(montarDadosIniciais());
    const formularioEdicao = useForm<DadosFormularioLocal>(montarDadosIniciais());

    const zonasFiltradasCriacao = useMemo(() => {
        if (!formularioCriacao.data.municipio_id) {
            return zonas;
        }

        return zonas.filter((zona) => String(zona.municipio_id) === formularioCriacao.data.municipio_id);
    }, [formularioCriacao.data.municipio_id, zonas]);

    const zonasFiltradasEdicao = useMemo(() => {
        if (!formularioEdicao.data.municipio_id) {
            return zonas;
        }

        return zonas.filter((zona) => String(zona.municipio_id) === formularioEdicao.data.municipio_id);
    }, [formularioEdicao.data.municipio_id, zonas]);

    const zonasFiltradasBusca = useMemo(() => {
        if (!filtroMunicipioId) {
            return zonas;
        }

        return zonas.filter((zona) => String(zona.municipio_id) === filtroMunicipioId);
    }, [filtroMunicipioId, zonas]);

    const opcoesMunicipios = useMemo<OpcaoSelect[]>(() => {
        return municipios.map((municipio) => ({
            value: String(municipio.id),
            label: montarNomeMunicipio(municipio),
        }));
    }, [municipios]);

    const montarOpcoesZonas = (zonasDisponiveis: ZonaOpcao[]): OpcaoSelect[] => {
        return zonasDisponiveis.map((zona) => ({
            value: String(zona.id),
            label: `Zona ${zona.numero} - ${zona.municipio_nome}`,
        }));
    };

    const opcoesZonasCriacao = useMemo(() => montarOpcoesZonas(zonasFiltradasCriacao), [zonasFiltradasCriacao]);
    const opcoesZonasEdicao = useMemo(() => montarOpcoesZonas(zonasFiltradasEdicao), [zonasFiltradasEdicao]);
    const opcoesZonasBusca = useMemo(() => montarOpcoesZonas(zonasFiltradasBusca), [zonasFiltradasBusca]);

    const opcoesPorPagina = useMemo<OpcaoSelect[]>(() => {
        return OPCOES_POR_PAGINA.map((opcao) => ({
            value: opcao,
            label: `${opcao} por página`,
        }));
    }, []);

    const resumoPaginacao = useMemo(() => {
        const inicio = locais.from ?? 0;
        const fim = locais.to ?? 0;
        return `Mostrando ${inicio} - ${fim} de ${locais.total.toLocaleString('pt-BR')} locais`;
    }, [locais.from, locais.to, locais.total]);

    const aplicarFiltros = () => {
        router.get('/app/locais-votacao', {
            search: filtroBusca,
            municipio_id: filtroMunicipioId,
            zona_id: filtroZonaId,
            per_page: filtroPorPagina,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const trocarPagina = (pagina: number) => {
        router.get('/app/locais-votacao', {
            search: filtroBusca,
            municipio_id: filtroMunicipioId,
            zona_id: filtroZonaId,
            per_page: filtroPorPagina,
            page: pagina,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const limparFiltros = () => {
        setFiltroBusca('');
        setFiltroMunicipioId('');
        setFiltroZonaId('');
        setFiltroPorPagina('15');

        router.get('/app/locais-votacao', {
            search: '',
            municipio_id: '',
            zona_id: '',
            per_page: '15',
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const abrirModalEdicao = (local: LocalVotacao) => {
        setLocalEmEdicao(local);
        formularioEdicao.setData(montarDadosIniciais(local));
        formularioEdicao.clearErrors();
        setMensagemCoordenadasEdicao(null);
    };

    const fecharModalEdicao = () => {
        setLocalEmEdicao(null);
        formularioEdicao.reset();
        formularioEdicao.clearErrors();
        setMensagemCoordenadasEdicao(null);
    };

    const buscarCoordenadas = async (
        formulario: typeof formularioCriacao,
        definirCarregamento: (valor: boolean) => void,
        definirMensagem: (valor: string | null) => void,
    ) => {
        const municipioSelecionado = municipios.find(
            (municipio) => String(municipio.id) === formulario.data.municipio_id,
        );

        if (!municipioSelecionado) {
            definirMensagem('Selecione o município antes de buscar coordenadas.');
            return;
        }

        definirCarregamento(true);
        definirMensagem(null);

        try {
            const resposta = await api.obterCoordenadasGoogle({
                cidade: municipioSelecionado.nome,
                uf: municipioSelecionado.uf ?? undefined,
                endereco: [formulario.data.nome.trim(), formulario.data.endereco.trim(), formulario.data.bairro.trim()]
                    .filter(Boolean)
                    .join(', '),
                pais: 'Brasil',
            }) as {
                latitude: number;
                longitude: number;
                endereco_formatado?: string | null;
            };

            formulario.setData('latitude', resposta.latitude.toFixed(7));
            formulario.setData('longitude', resposta.longitude.toFixed(7));

            const endereco = resposta.endereco_formatado ? ` Endereço: ${resposta.endereco_formatado}.` : '';
            definirMensagem(`Coordenadas obtidas com sucesso.${endereco}`);
        } catch (erro: unknown) {
            let mensagem = 'Nao foi possivel obter coordenadas automaticamente.';

            if (axios.isAxiosError(erro)) {
                const erroApi = erro.response?.data as { error?: string } | undefined;
                if (erroApi?.error) {
                    mensagem = erroApi.error;
                }
            }

            definirMensagem(mensagem);
        } finally {
            definirCarregamento(false);
        }
    };

    const enviarCriacao = (evento: React.FormEvent<HTMLFormElement>) => {
        evento.preventDefault();

        formularioCriacao.post('/app/locais-votacao', {
            preserveScroll: true,
            onSuccess: () => {
                formularioCriacao.reset();
                setMensagemCoordenadasCriacao(null);
            },
        });
    };

    const enviarEdicao = (evento: React.FormEvent<HTMLFormElement>) => {
        evento.preventDefault();
        if (!localEmEdicao) {
            return;
        }

        formularioEdicao.put(`/app/locais-votacao/${localEmEdicao.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                fecharModalEdicao();
            },
        });
    };

    const excluirLocal = (local: LocalVotacao) => {
        const nomeExibicao = local.nome ?? `Local ${local.numero ?? local.id}`;
        const confirmou = window.confirm(`Deseja realmente excluir o local de votação ${nomeExibicao}?`);
        if (!confirmou) {
            return;
        }

        router.delete(`/app/locais-votacao/${local.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <div>
            <Head title="Locais de votação" />

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-sm">
                        <i className="fa-solid fa-location-dot text-base"></i>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 leading-tight">Locais de votação</h1>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {locais.total.toLocaleString('pt-BR')} registros
                        </p>
                    </div>
                </div>
            </div>

            {flash?.success && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {flash.success}
                </div>
            )}

            {errors?.local && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errors.local}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Novo local de votação</h2>
                <form onSubmit={enviarCriacao} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Select
                        value={encontrarOpcao(opcoesMunicipios, formularioCriacao.data.municipio_id)}
                        onChange={(opcao) => {
                            formularioCriacao.setData('municipio_id', opcao?.value ?? '');
                            formularioCriacao.setData('zona_id', '');
                        }}
                        options={opcoesMunicipios}
                        placeholder="Selecione o município"
                        isClearable
                        styles={estilosSelect}
                    />
                    <Select
                        value={encontrarOpcao(opcoesZonasCriacao, formularioCriacao.data.zona_id)}
                        onChange={(opcao) => formularioCriacao.setData('zona_id', opcao?.value ?? '')}
                        options={opcoesZonasCriacao}
                        placeholder="Sem zona específica"
                        isClearable
                        styles={estilosSelect}
                    />
                    <input
                        value={formularioCriacao.data.numero}
                        onChange={(evento) => formularioCriacao.setData('numero', evento.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Número"
                    />
                    <input
                        value={formularioCriacao.data.nome}
                        onChange={(evento) => formularioCriacao.setData('nome', evento.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome do local"
                    />
                    <input
                        value={formularioCriacao.data.endereco}
                        onChange={(evento) => formularioCriacao.setData('endereco', evento.target.value)}
                        className="lg:col-span-2 py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Endereço"
                    />
                    <input
                        value={formularioCriacao.data.bairro}
                        onChange={(evento) => formularioCriacao.setData('bairro', evento.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Bairro"
                    />
                    <input
                        value={formularioCriacao.data.cep}
                        onChange={(evento) => formularioCriacao.setData('cep', evento.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="CEP"
                    />
                    <input
                        value={formularioCriacao.data.latitude}
                        onChange={(evento) => formularioCriacao.setData('latitude', evento.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Latitude"
                    />
                    <input
                        value={formularioCriacao.data.longitude}
                        onChange={(evento) => formularioCriacao.setData('longitude', evento.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Longitude"
                    />
                    <div className="lg:col-span-2 flex flex-col sm:flex-row sm:items-center gap-2">
                        <button
                            type="button"
                            onClick={() => buscarCoordenadas(formularioCriacao, setCarregandoCoordenadasCriacao, setMensagemCoordenadasCriacao)}
                            disabled={carregandoCoordenadasCriacao}
                            className="inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 disabled:opacity-60"
                        >
                            <i className={`fa-solid ${carregandoCoordenadasCriacao ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'} text-xs`}></i>
                            {carregandoCoordenadasCriacao ? 'Buscando coordenadas...' : 'Obter coordenadas'}
                        </button>
                        <button
                            type="submit"
                            disabled={formularioCriacao.processing}
                            className="py-2 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                        >
                            {formularioCriacao.processing ? 'Salvando...' : 'Adicionar'}
                        </button>
                    </div>
                </form>

                {mensagemCoordenadasCriacao && (
                    <p className="mt-3 text-xs text-gray-600">{mensagemCoordenadasCriacao}</p>
                )}

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
                        placeholder="Buscar por nome, número, endereço ou município"
                    />
                    <Select
                        value={encontrarOpcao(opcoesMunicipios, filtroMunicipioId)}
                        onChange={(opcao) => {
                            setFiltroMunicipioId(opcao?.value ?? '');
                            setFiltroZonaId('');
                        }}
                        options={opcoesMunicipios}
                        placeholder="Todos os municípios"
                        isClearable
                        styles={estilosSelect}
                    />
                    <Select
                        value={encontrarOpcao(opcoesZonasBusca, filtroZonaId)}
                        onChange={(opcao) => setFiltroZonaId(opcao?.value ?? '')}
                        options={opcoesZonasBusca}
                        placeholder="Todas as zonas"
                        isClearable
                        styles={estilosSelect}
                    />
                    <Select
                        value={encontrarOpcao(opcoesPorPagina, filtroPorPagina)}
                        onChange={(opcao) => setFiltroPorPagina(opcao?.value ?? '15')}
                        options={opcoesPorPagina}
                        placeholder="Por página"
                        isClearable={false}
                        styles={estilosSelect}
                    />
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
                    <table className="w-full min-w-275">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Local</th>
                                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Município</th>
                                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Zona</th>
                                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Endereço</th>
                                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">CEP</th>
                                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Latitude</th>
                                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Longitude</th>
                                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locais.data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                                        Nenhum local de votação encontrado.
                                    </td>
                                </tr>
                            )}

                            {locais.data.map((local) => (
                                <tr key={local.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        <div className="font-medium">{local.nome ?? `Local ${local.numero ?? local.id}`}</div>
                                        <div className="text-xs text-gray-500">Número: {local.numero ?? '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {local.municipio_nome ?? '-'}
                                        {local.municipio_uf ? ` - ${local.municipio_uf}` : ''}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{local.zona_numero ?? '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {[local.endereco, local.bairro].filter(Boolean).join(' - ') || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{local.cep ?? '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatarNumero(local.latitude)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatarNumero(local.longitude)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => abrirModalEdicao(local)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => excluirLocal(local)}
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
                            onClick={() => trocarPagina(locais.current_page - 1)}
                            disabled={locais.current_page <= 1}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <span className="text-xs text-gray-500">
                            Página {locais.current_page} de {locais.last_page}
                        </span>
                        <button
                            type="button"
                            onClick={() => trocarPagina(locais.current_page + 1)}
                            disabled={locais.current_page >= locais.last_page}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            </div>

            {localEmEdicao && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                            <h3 className="text-base font-semibold text-gray-800">Editar local de votação</h3>
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
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Município</label>
                                    <Select
                                        value={encontrarOpcao(opcoesMunicipios, formularioEdicao.data.municipio_id)}
                                        onChange={(opcao) => {
                                            formularioEdicao.setData('municipio_id', opcao?.value ?? '');
                                            formularioEdicao.setData('zona_id', '');
                                        }}
                                        options={opcoesMunicipios}
                                        placeholder="Selecione o município"
                                        isClearable
                                        styles={estilosSelect}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Zona eleitoral</label>
                                    <Select
                                        value={encontrarOpcao(opcoesZonasEdicao, formularioEdicao.data.zona_id)}
                                        onChange={(opcao) => formularioEdicao.setData('zona_id', opcao?.value ?? '')}
                                        options={opcoesZonasEdicao}
                                        placeholder="Sem zona específica"
                                        isClearable
                                        styles={estilosSelect}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Número</label>
                                    <input
                                        value={formularioEdicao.data.numero}
                                        onChange={(evento) => formularioEdicao.setData('numero', evento.target.value)}
                                        className="mt-1 w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Nome</label>
                                    <input
                                        value={formularioEdicao.data.nome}
                                        onChange={(evento) => formularioEdicao.setData('nome', evento.target.value)}
                                        className="mt-1 w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-gray-500">Endereço</label>
                                    <input
                                        value={formularioEdicao.data.endereco}
                                        onChange={(evento) => formularioEdicao.setData('endereco', evento.target.value)}
                                        className="mt-1 w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Bairro</label>
                                    <input
                                        value={formularioEdicao.data.bairro}
                                        onChange={(evento) => formularioEdicao.setData('bairro', evento.target.value)}
                                        className="mt-1 w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500">CEP</label>
                                    <input
                                        value={formularioEdicao.data.cep}
                                        onChange={(evento) => formularioEdicao.setData('cep', evento.target.value)}
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
                                        onClick={() => buscarCoordenadas(formularioEdicao, setCarregandoCoordenadasEdicao, setMensagemCoordenadasEdicao)}
                                        disabled={carregandoCoordenadasEdicao}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-sm text-white font-medium hover:bg-cyan-700 disabled:opacity-60"
                                    >
                                        <i className={`fa-solid ${carregandoCoordenadasEdicao ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'} text-xs`}></i>
                                        {carregandoCoordenadasEdicao ? 'Buscando coordenadas...' : 'Obter coordenadas'}
                                    </button>

                                    {mensagemCoordenadasEdicao && (
                                        <p className="text-xs text-gray-600">{mensagemCoordenadasEdicao}</p>
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
