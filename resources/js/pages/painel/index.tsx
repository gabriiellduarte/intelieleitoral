import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { home } from '@/routes';
import painel from '@/routes/painel';
import { logout } from '@/routes';

type Plano = {
    nome: string;
    preco: number;
    recursos: string[];
};

type Stats = {
    plano: Plano | null;
    usuarios: {
        total: number;
        ativos: number;
        limite: number;
    };
};

type Usuario = {
    id: number;
    nome: string;
    email: string;
    cargo: 'usuario' | 'analista' | 'gerente';
    ativo: boolean;
    ultimo_acesso: string | null;
};

type Props = {
    stats: Stats;
    usuarios: Usuario[];
};

const cargoLabel: Record<string, string> = {
    usuario: 'Usuário',
    analista: 'Analista',
    gerente: 'Gerente',
};

const cargoColor: Record<string, string> = {
    usuario: 'bg-gray-100 text-gray-700',
    analista: 'bg-blue-100 text-blue-700',
    gerente: 'bg-purple-100 text-purple-700',
};

type ModalState =
    | { type: 'closed' }
    | { type: 'novo' }
    | { type: 'editar'; usuario: Usuario }
    | { type: 'excluir'; usuario: Usuario };

export default function PainelIndex({ stats, usuarios }: Props) {
    const [aba, setAba] = useState<'dashboard' | 'usuarios'>('dashboard');
    const [modal, setModal] = useState<ModalState>({ type: 'closed' });
    const [form, setForm] = useState({ nome: '', email: '', senha: '', cargo: 'usuario', ativo: true });
    const [erros, setErros] = useState<Record<string, string>>({});
    const [processando, setProcessando] = useState(false);

    const abrirNovo = () => {
        setForm({ nome: '', email: '', senha: '', cargo: 'usuario', ativo: true });
        setErros({});
        setModal({ type: 'novo' });
    };

    const abrirEditar = (u: Usuario) => {
        setForm({ nome: u.nome, email: u.email, senha: '', cargo: u.cargo, ativo: u.ativo });
        setErros({});
        setModal({ type: 'editar', usuario: u });
    };

    const salvarNovo = () => {
        setProcessando(true);
        router.post(painel.usuarios.store.url(), form, {
            onError: (e) => { setErros(e); setProcessando(false); },
            onSuccess: () => { setModal({ type: 'closed' }); setProcessando(false); },
        });
    };

    const salvarEditar = (id: number) => {
        setProcessando(true);
        router.put(painel.usuarios.update.url(id), form, {
            onError: (e) => { setErros(e); setProcessando(false); },
            onSuccess: () => { setModal({ type: 'closed' }); setProcessando(false); },
        });
    };

    const confirmarExcluir = (u: Usuario) => setModal({ type: 'excluir', usuario: u });

    const excluir = (id: number) => {
        router.delete(painel.usuarios.destroy.url(id), {
            onSuccess: () => setModal({ type: 'closed' }),
        });
    };

    const { plano, usuarios: statsUsuarios } = stats;
    const pct = statsUsuarios.limite > 0 ? Math.round((statsUsuarios.total / statsUsuarios.limite) * 100) : 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title="Painel do Cliente" />

            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href={home()} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">IE</span>
                        </div>
                        <span className="font-semibold text-gray-900 hidden sm:block">Intel Eleitoral</span>
                    </Link>

                    <nav className="flex items-center gap-1">
                        <button
                            onClick={() => setAba('dashboard')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => setAba('usuarios')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === 'usuarios' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Usuários
                            {usuarios.length > 0 && (
                                <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full">{usuarios.length}</span>
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

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

                {/* ─── DASHBOARD ─── */}
                {aba === 'dashboard' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Visão Geral</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Resumo do seu plano e uso da plataforma</p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl border border-l-4 border-l-emerald-400 border-gray-200 shadow-sm p-5">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Plano Atual</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{plano?.nome ?? '—'}</p>
                                <p className="text-sm text-gray-500 mt-0.5">R$ {plano?.preco ?? 0}/mês</p>
                            </div>
                            <div className="bg-white rounded-xl border border-l-4 border-l-blue-400 border-gray-200 shadow-sm p-5">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Usuários Ativos</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{statsUsuarios.ativos}</p>
                                <p className="text-sm text-gray-500 mt-0.5">de {statsUsuarios.total} cadastrados</p>
                            </div>
                            <div className="bg-white rounded-xl border border-l-4 border-l-amber-400 border-gray-200 shadow-sm p-5">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Capacidade</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{statsUsuarios.total}/{statsUsuarios.limite}</p>
                                <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                                    <div
                                        className={`h-1.5 rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{pct}% utilizado</p>
                            </div>
                        </div>

                        {/* Recursos do plano */}
                        {plano && plano.recursos.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h3 className="font-semibold text-gray-800 mb-4">Recursos incluídos no plano {plano.nome}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {plano.recursos.map((r) => (
                                        <div key={r} className="flex items-center gap-2 text-sm text-gray-600">
                                            <span className="text-emerald-500 font-bold">✓</span> {r}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {usuarios.length === 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
                                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">👥</span>
                                </div>
                                <h3 className="font-semibold text-gray-800 mb-1">Nenhum usuário cadastrado</h3>
                                <p className="text-sm text-gray-500 mb-4">Adicione membros da equipe para começar a usar a plataforma.</p>
                                <button
                                    onClick={() => { setAba('usuarios'); abrirNovo(); }}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:from-emerald-600 hover:to-cyan-600 transition-all"
                                >
                                    + Adicionar usuário
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── USUÁRIOS ─── */}
                {aba === 'usuarios' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Usuários</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {statsUsuarios.total} de {statsUsuarios.limite} usuários utilizados
                                </p>
                            </div>
                            {statsUsuarios.total < statsUsuarios.limite && (
                                <button
                                    onClick={abrirNovo}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:from-emerald-600 hover:to-cyan-600 transition-all"
                                >
                                    + Novo usuário
                                </button>
                            )}
                        </div>

                        {usuarios.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
                                <p className="text-gray-400">Nenhum usuário cadastrado ainda.</p>
                                <button onClick={abrirNovo} className="mt-3 text-emerald-600 text-sm font-medium hover:underline">
                                    Adicionar primeiro usuário
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cargo</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {usuarios.map((u) => (
                                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                                            {u.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                        </div>
                                                        <span className="font-medium text-gray-900">{u.nome}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cargoColor[u.cargo] ?? 'bg-gray-100 text-gray-600'}`}>
                                                        {cargoLabel[u.cargo] ?? u.cargo}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {u.ativo ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => abrirEditar(u)}
                                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => confirmarExcluir(u)}
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
                        )}
                    </div>
                )}
            </main>

            {/* ─── MODAL NOVO / EDITAR ─── */}
            {(modal.type === 'novo' || modal.type === 'editar') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-5">
                            {modal.type === 'novo' ? 'Novo Usuário' : 'Editar Usuário'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={form.nome}
                                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-emerald-400"
                                    placeholder="Nome completo"
                                />
                                {erros.nome && <p className="text-xs text-red-500 mt-1">{erros.nome}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-emerald-400"
                                    placeholder="email@exemplo.com"
                                />
                                {erros.email && <p className="text-xs text-red-500 mt-1">{erros.email}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Senha {modal.type === 'editar' && <span className="text-gray-400 font-normal">(deixe em branco para manter)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={form.senha}
                                    onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-emerald-400"
                                    placeholder="••••••••"
                                />
                                {erros.senha && <p className="text-xs text-red-500 mt-1">{erros.senha}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                                <select
                                    value={form.cargo}
                                    onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-emerald-400"
                                >
                                    <option value="usuario">Usuário</option>
                                    <option value="analista">Analista</option>
                                    <option value="gerente">Gerente</option>
                                </select>
                            </div>
                            {modal.type === 'editar' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="ativo"
                                        checked={form.ativo}
                                        onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                                        className="rounded border-gray-300 text-emerald-500"
                                    />
                                    <label htmlFor="ativo" className="text-sm text-gray-700 cursor-pointer">Usuário ativo</label>
                                </div>
                            )}
                            {erros.limite && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{erros.limite}</p>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setModal({ type: 'closed' })}
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={processando}
                                onClick={() => modal.type === 'novo' ? salvarNovo() : salvarEditar(modal.usuario.id)}
                                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold hover:from-emerald-600 hover:to-cyan-600 transition-all disabled:opacity-60"
                            >
                                {processando ? 'Salvando…' : 'Salvar'}
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
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir usuário</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Tem certeza que deseja excluir <strong>{modal.usuario.nome}</strong>? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setModal({ type: 'closed' })}
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => excluir(modal.usuario.id)}
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

PainelIndex.layout = null;
