import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { home, logout } from '@/routes';
import gerente from '@/routes/gerente';

type DashboardData = {
    clientes: { total: number; ativos: number };
    usuarios: { total: number };
    clientesPorPlano: { nome: string; preco: number; total: number }[];
    receitaMensal: unknown[];
};

type Cliente = {
    id: number;
    nome: string;
    email: string;
    empresa: string | null;
    plano_nome: string | null;
    plano_preco: number | null;
    limite_usuarios: number;
    total_usuarios: number;
    ativo: boolean;
    criado_em: string | null;
    eleicoes_vinculadas: number[];
};

type Plano = {
    id: number;
    nome: string;
    preco: number;
    limite_usuarios: number;
    recursos: string[];
};

type Eleicao = {
    id: number;
    ano: number;
    descricao: string | null;
};

type Props = {
    dashboard: DashboardData;
    clientes: Cliente[];
    planos: Plano[];
    eleicoes: Eleicao[];
};

type ModalState =
    | { type: 'closed' }
    | { type: 'plano'; cliente: Cliente }
    | { type: 'eleicoes'; cliente: Cliente }
    | { type: 'excluir'; cliente: Cliente };

export default function GerenteIndex({ dashboard, clientes, planos, eleicoes }: Props) {
    const [aba, setAba] = useState<'dashboard' | 'clientes'>('dashboard');
    const [busca, setBusca] = useState('');
    const [modal, setModal] = useState<ModalState>({ type: 'closed' });
    const [planoId, setPlanoId] = useState<number>(0);
    const [eleicoesSelecionadas, setEleicoesSelecionadas] = useState<number[]>([]);
    const [buscaEleicao, setBuscaEleicao] = useState('');

    const clientesFiltrados = clientes.filter(c =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.email.toLowerCase().includes(busca.toLowerCase()) ||
        (c.empresa ?? '').toLowerCase().includes(busca.toLowerCase())
    );

    const abrirPlano = (c: Cliente) => {
        setPlanoId(planos.find(p => p.nome === c.plano_nome)?.id ?? 0);
        setModal({ type: 'plano', cliente: c });
    };

    const salvarPlano = (clienteId: number) => {
        router.put(gerente.clientes.plano.url(clienteId), { plano_id: planoId }, {
            onSuccess: () => setModal({ type: 'closed' }),
        });
    };

    const abrirEleicoes = (c: Cliente) => {
        setEleicoesSelecionadas([...c.eleicoes_vinculadas]);
        setBuscaEleicao('');
        setModal({ type: 'eleicoes', cliente: c });
    };

    const toggleEleicao = (id: number) => {
        setEleicoesSelecionadas(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    const salvarEleicoes = (clienteId: number) => {
        router.put(gerente.clientes.eleicoes.url(clienteId), { eleicao_ids: eleicoesSelecionadas }, {
            onSuccess: () => setModal({ type: 'closed' }),
        });
    };

    const toggleAtivo = (c: Cliente) => {
        router.post(gerente.clientes.toggle.url(c.id));
    };

    const confirmarExcluir = (c: Cliente) => setModal({ type: 'excluir', cliente: c });

    const excluir = (id: number) => {
        router.delete(gerente.clientes.destroy.url(id), {
            onSuccess: () => setModal({ type: 'closed' }),
        });
    };

    const receitaTotal = dashboard.clientesPorPlano.reduce((acc, p) => acc + p.preco * p.total, 0);

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title="Painel Gerente" />

            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={home()} className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">IE</span>
                            </div>
                            <span className="font-semibold text-gray-900 hidden sm:block">Intel Eleitoral</span>
                        </Link>
                        <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            ⚙ Gerente SaaS
                        </span>
                    </div>

                    <nav className="flex items-center gap-1">
                        <button
                            onClick={() => setAba('dashboard')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => setAba('clientes')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === 'clientes' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Clientes
                            {clientes.length > 0 && (
                                <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{clientes.length}</span>
                            )}
                        </button>
                    </nav>

                    <button
                        onClick={() => router.post(logout.url())}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Sair
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                {/* ─── DASHBOARD ─── */}
                {aba === 'dashboard' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Visão Geral da Plataforma</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Monitoramento de clientes, planos e receita</p>
                        </div>

                        {/* KPIs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl border border-l-4 border-l-emerald-400 border-gray-200 shadow-sm p-5">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Clientes</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{dashboard.clientes.total}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-l-4 border-l-blue-400 border-gray-200 shadow-sm p-5">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Clientes Ativos</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{dashboard.clientes.ativos}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {dashboard.clientes.total > 0
                                        ? Math.round((dashboard.clientes.ativos / dashboard.clientes.total) * 100)
                                        : 0}% do total
                                </p>
                            </div>
                            <div className="bg-white rounded-xl border border-l-4 border-l-purple-400 border-gray-200 shadow-sm p-5">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Usuários</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{dashboard.usuarios.total}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-l-4 border-l-cyan-400 border-gray-200 shadow-sm p-5">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Receita Estimada</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    R$ {receitaTotal.toLocaleString('pt-BR')}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">por mês</p>
                            </div>
                        </div>

                        {/* Clientes por plano */}
                        {dashboard.clientesPorPlano.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h3 className="font-semibold text-gray-800 mb-5">Distribuição por Plano</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {dashboard.clientesPorPlano.map((p) => {
                                        const pct = dashboard.clientes.total > 0
                                            ? Math.round((p.total / dashboard.clientes.total) * 100)
                                            : 0;
                                        return (
                                            <div key={p.nome} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-gray-700 text-sm">{p.nome}</span>
                                                    <span className="text-xs text-gray-400">R$ {p.preco}/mês</span>
                                                </div>
                                                <p className="text-2xl font-bold text-gray-900">{p.total}</p>
                                                <p className="text-xs text-gray-400 mb-2">clientes ({pct}%)</p>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── CLIENTES ─── */}
                {aba === 'clientes' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Clientes</h2>
                                <p className="text-sm text-gray-500 mt-0.5">{clientes.length} clientes cadastrados</p>
                            </div>
                            <input
                                type="text"
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                placeholder="Buscar cliente..."
                                className="w-full sm:w-64 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-emerald-400"
                            />
                        </div>

                        {clientesFiltrados.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
                                <p className="text-gray-400">Nenhum cliente encontrado.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Plano</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Usuários</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {clientesFiltrados.map((c) => (
                                                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                                                {c.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900">{c.nome}</p>
                                                                <p className="text-xs text-gray-400">{c.email}</p>
                                                                {c.empresa && <p className="text-xs text-gray-400">{c.empresa}</p>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 hidden md:table-cell">
                                                        <span className="text-gray-700 font-medium">{c.plano_nome ?? '—'}</span>
                                                        {c.plano_preco && (
                                                            <p className="text-xs text-gray-400">R$ {c.plano_preco}/mês</p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 hidden lg:table-cell">
                                                        <span className="text-gray-700">{c.total_usuarios}/{c.limite_usuarios}</span>
                                                        <div className="w-16 bg-gray-100 rounded-full h-1 mt-1">
                                                            <div
                                                                className="h-1 bg-emerald-400 rounded-full"
                                                                style={{ width: c.limite_usuarios > 0 ? `${Math.min(100, (c.total_usuarios / c.limite_usuarios) * 100)}%` : '0%' }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {c.ativo ? 'Ativo' : 'Suspenso'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => abrirPlano(c)}
                                                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                            >
                                                                Plano
                                                            </button>
                                                            <button
                                                                onClick={() => abrirEleicoes(c)}
                                                                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                                                                title={`${c.eleicoes_vinculadas.length} eleição(ões) vinculada(s)`}
                                                            >
                                                                Eleições {c.eleicoes_vinculadas.length > 0 && (
                                                                    <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                                                                        {c.eleicoes_vinculadas.length}
                                                                    </span>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => toggleAtivo(c)}
                                                                className={`text-xs font-medium ${c.ativo ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                                                            >
                                                                {c.ativo ? 'Suspender' : 'Ativar'}
                                                            </button>
                                                            <button
                                                                onClick={() => confirmarExcluir(c)}
                                                                className="text-xs text-red-500 hover:text-red-600 font-medium"
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
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ─── MODAL ALTERAR PLANO ─── */}
            {modal.type === 'plano' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Alterar Plano</h3>
                        <p className="text-sm text-gray-500 mb-5">Cliente: <strong>{modal.cliente.nome}</strong></p>

                        <div className="space-y-2 mb-6">
                            {planos.map((p) => (
                                <label
                                    key={p.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${planoId === p.id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <input
                                        type="radio"
                                        name="plano"
                                        value={p.id}
                                        checked={planoId === p.id}
                                        onChange={() => setPlanoId(p.id)}
                                        className="text-emerald-500"
                                    />
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm text-gray-800">{p.nome}</p>
                                        <p className="text-xs text-gray-400">R$ {p.preco}/mês · {p.limite_usuarios} usuários</p>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setModal({ type: 'closed' })}
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => salvarPlano(modal.cliente.id)}
                                disabled={planoId === 0}
                                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold hover:from-emerald-600 hover:to-cyan-600 transition-all disabled:opacity-60"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL ELEIÇÕES ─── */}
            {modal.type === 'eleicoes' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Eleições Vinculadas</h3>
                        <p className="text-sm text-gray-500 mb-5">
                            Cliente: <strong>{modal.cliente.nome}</strong>
                        </p>

                        {eleicoes.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">Nenhuma eleição cadastrada no sistema.</p>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={buscaEleicao}
                                    onChange={e => setBuscaEleicao(e.target.value)}
                                    placeholder="Buscar por nome ou ano..."
                                    className="w-full px-3 py-2 mb-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-purple-400"
                                    autoFocus
                                />

                                {eleicoesSelecionadas.length > 0 && (
                                    <p className="text-xs text-purple-600 font-medium mb-2">
                                        {eleicoesSelecionadas.length} selecionada(s)
                                        {buscaEleicao && ' — limpe a busca para ver todas'}
                                    </p>
                                )}

                                <div className="space-y-1.5 mb-5 max-h-64 overflow-y-auto pr-1">
                                    {(() => {
                                        const termo = buscaEleicao.toLowerCase().trim();
                                        const filtradas = termo
                                            ? eleicoes.filter(e =>
                                                String(e.ano).includes(termo) ||
                                                (e.descricao ?? '').toLowerCase().includes(termo)
                                              )
                                            : eleicoes;

                                        if (filtradas.length === 0) {
                                            return (
                                                <p className="text-sm text-gray-400 text-center py-6">
                                                    Nenhuma eleição encontrada para "{buscaEleicao}".
                                                </p>
                                            );
                                        }

                                        return filtradas.map((e) => {
                                            const marcada = eleicoesSelecionadas.includes(e.id);
                                            return (
                                                <label
                                                    key={e.id}
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${marcada ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:border-gray-300 bg-white'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={marcada}
                                                        onChange={() => toggleEleicao(e.id)}
                                                        className="accent-purple-600 w-4 h-4 shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm text-gray-800">{e.ano}</p>
                                                        {e.descricao && (
                                                            <p className="text-xs text-gray-400 truncate">{e.descricao}</p>
                                                        )}
                                                    </div>
                                                    {marcada && (
                                                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                                                    )}
                                                </label>
                                            );
                                        });
                                    })()}
                                </div>
                            </>
                        )}

                        <p className="text-xs text-gray-400 mb-4">
                            {eleicoesSelecionadas.length === 0
                                ? 'Sem eleições selecionadas — cliente verá todas as eleições.'
                                : `${eleicoesSelecionadas.length} eleição(ões) selecionada(s).`}
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setModal({ type: 'closed' })}
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => salvarEleicoes(modal.cliente.id)}
                                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-semibold hover:from-purple-600 hover:to-blue-600 transition-all"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL EXCLUIR ─── */}
            {modal.type === 'excluir' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-red-500 text-xl">⚠</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir cliente</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Tem certeza que deseja excluir <strong>{modal.cliente.nome}</strong> e todos os seus dados? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setModal({ type: 'closed' })}
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => excluir(modal.cliente.id)}
                                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

GerenteIndex.layout = null;
