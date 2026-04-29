import { Head, Link } from '@inertiajs/react';

type Municipio = {
    id: number;
    nome: string;
    uf: string | null;
    codigo_ibge: string | null;
    codigo_tse: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    created_at: string;
    updated_at: string;
};

type ResumoMunicipio = {
    total_zonas: number;
    total_secoes: number;
    total_locais: number;
    total_candidatos: number;
};

type SecaoMunicipio = {
    id: number;
    secao_numero: string;
    zona_numero: string;
    local_nome: string | null;
    local_endereco: string | null;
    total_votos: number;
    total_candidaturas: number;
};

type CandidatoMunicipio = {
    candidatura_id: number;
    nome: string;
    nome_urna: string | null;
    numero: string | null;
    partido_sigla: string | null;
    cargo_descricao: string | null;
    situacao: string | null;
    nr_turno: number;
    total_votos: number;
    total_secoes: number;
    total_aptos: number;
    total_comparecimento: number;
    total_abstencoes: number;
    ds_sit_tot_turno: string | null;
};

type PropsPagina = {
    municipio?: Municipio;
    resumo?: ResumoMunicipio;
    secoes?: SecaoMunicipio[];
    candidatos?: CandidatoMunicipio[];
    erro?: string;
};

function formatarNumero(valor: number | string | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') {
        return '-';
    }

    const numero = Number(valor);
    if (Number.isNaN(numero)) {
        return String(valor);
    }

    return numero.toLocaleString('pt-BR');
}

function formatarCoordenada(valor: number | string | null | undefined): string {
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

export default function MunicipioPage({
    municipio,
    resumo,
    secoes = [],
    candidatos = [],
    erro,
}: PropsPagina) {
    const totalVotosMunicipio = candidatos.reduce((acumulador, candidato) => {
        return acumulador + Number(candidato.total_votos ?? 0);
    }, 0);

    return (
        <div>
            <Head title={municipio ? `Município ${municipio.nome}` : 'Município'} />

            <Link
                href="/app/municipios"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-5 transition-colors"
            >
                <i className="fa-solid fa-arrow-left text-xs"></i>
                Municípios
            </Link>

            {erro && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {erro}
                </div>
            )}

            {municipio && (
                <>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-5 shadow-sm">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{municipio.nome}</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    UF: {municipio.uf ?? '-'} • Código TSE: {municipio.codigo_tse ?? '-'} • Código IBGE: {municipio.codigo_ibge ?? '-'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                                <p>Latitude: <span className="font-medium text-gray-800">{formatarCoordenada(municipio.latitude)}</span></p>
                                <p>Longitude: <span className="font-medium text-gray-800">{formatarCoordenada(municipio.longitude)}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Zonas</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{formatarNumero(resumo?.total_zonas ?? 0)}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Seções</p>
                            <p className="text-2xl font-bold text-emerald-900 mt-1">{formatarNumero(resumo?.total_secoes ?? 0)}</p>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                            <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Locais</p>
                            <p className="text-2xl font-bold text-amber-900 mt-1">{formatarNumero(resumo?.total_locais ?? 0)}</p>
                        </div>
                        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                            <p className="text-xs text-violet-700 font-semibold uppercase tracking-wide">Candidatos</p>
                            <p className="text-2xl font-bold text-violet-900 mt-1">{formatarNumero(resumo?.total_candidatos ?? 0)}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Votos Somados</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{formatarNumero(totalVotosMunicipio)}</p>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-5">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-700">Seções vinculadas ao município</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-225">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Zona</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Seção</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Local</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Endereço</th>
                                        <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Votos</th>
                                        <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Candidaturas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {secoes.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                                                Nenhuma seção vinculada encontrada.
                                            </td>
                                        </tr>
                                    )}

                                    {secoes.map((secao) => (
                                        <tr key={secao.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                                            <td className="px-4 py-3 text-sm text-gray-700">{secao.zona_numero}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{secao.secao_numero}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{secao.local_nome ?? '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{secao.local_endereco ?? '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatarNumero(secao.total_votos)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatarNumero(secao.total_candidaturas)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-700">Candidatos vinculados ao município</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-225">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Nome</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Partido</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Cargo</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Número</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Turno</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Situação</th>
                                        <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Votos</th>
                                        <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Seções</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidatos.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                                                Nenhum candidato vinculado encontrado.
                                            </td>
                                        </tr>
                                    )}

                                    {candidatos.map((candidato) => (
                                        <tr key={`${candidato.candidatura_id}-${candidato.nr_turno}`} className="border-b border-gray-100 hover:bg-gray-50/60">
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{candidato.nome_urna || candidato.nome}</span>
                                                    {candidato.nome_urna && (
                                                        <span className="text-xs text-gray-500">{candidato.nome}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{candidato.partido_sigla ?? '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{candidato.cargo_descricao ?? '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{candidato.numero ?? '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{formatarNumero(candidato.nr_turno)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{candidato.ds_sit_tot_turno ?? candidato.situacao ?? '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatarNumero(candidato.total_votos)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatarNumero(candidato.total_secoes)}</td>
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
