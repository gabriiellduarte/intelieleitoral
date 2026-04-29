import { Head, router } from '@inertiajs/react';

type Eleicao = {
    id: number;
    ano: number;
    descricao: string | null;
};

type Props = {
    eleicoes: Eleicao[];
};

export default function SelecionarEleicao({ eleicoes }: Props) {
    const selecionar = (eleicaoId: number) => {
        router.visit(`/app/${eleicaoId}/dashboard`);
    };

    return (
        <>
            <Head title="Selecionar Eleição" />

            <link
                rel="stylesheet"
                href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
            />

            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="w-full max-w-lg">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 items-center justify-center shadow-lg mb-4">
                            <span className="text-white font-bold text-xl">IE</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Intel Eleitoral</h1>
                        <p className="text-gray-500 mt-1 text-sm">Selecione a eleição para continuar</p>
                    </div>

                    {/* Lista de eleições */}
                    {eleicoes.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                            <i className="fa-solid fa-circle-exclamation text-3xl text-gray-300 mb-3"></i>
                            <p className="text-gray-500 text-sm">Nenhuma eleição disponível para sua conta.</p>
                            <p className="text-gray-400 text-xs mt-1">Entre em contato com o administrador.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {eleicoes.map((eleicao) => (
                                <button
                                    key={eleicao.id}
                                    onClick={() => selecionar(eleicao.id)}
                                    className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-4 flex items-center gap-4 hover:border-blue-400 hover:shadow-md transition-all text-left group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                                        <i className="fa-solid fa-ballot-check text-blue-600 text-sm"></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm">{eleicao.ano}</p>
                                        <p className="text-gray-500 text-xs truncate">{eleicao.descricao ?? 'Eleição'}</p>
                                    </div>
                                    <i className="fa-solid fa-chevron-right text-gray-300 group-hover:text-blue-500 transition-colors text-xs"></i>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
