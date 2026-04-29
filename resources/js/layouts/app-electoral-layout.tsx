import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { logout } from '@/routes';

type PropsCompartilhadas = {
    auth?: {
        user?: {
            name?: string;
            email?: string;
        };
    };
    eleicao_id?: number | string | null;
};

export default function AppElectoralLayout({ children }: { children: React.ReactNode }) {
    const { auth, eleicao_id } = usePage<PropsCompartilhadas>().props;
    const { url } = usePage();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const currentPath = url.split('?')[0];
    const base = eleicao_id ? `/app/${eleicao_id}` : '/app';

    const navItems = [
        { href: `${base}/dashboard`,      icon: 'fa-chart-pie',       label: 'Dashboard'     },
        { href: `${base}/monitoramento`,  icon: 'fa-star',            label: 'Monitoramento' },
        { href: `${base}/candidatos`,     icon: 'fa-users',           label: 'Candidatos'    },
        { href: `${base}/municipios`,     icon: 'fa-city',            label: 'Municípios'    },
        { href: `${base}/locais-votacao`, icon: 'fa-location-dot',    label: 'Locais'        },
        { href: `${base}/comparacao`,     icon: 'fa-scale-balanced',  label: 'Comparação'    },
        { href: `${base}/estrategia`,     icon: 'fa-bullseye',        label: 'Estratégia'    },
    ];

    const doLogout = () => router.post(logout.url());

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* ── mobile topbar ── */}
            <header className="lg:hidden bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14 sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">IE</span>
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">Intel Eleitoral</span>
                </div>
                <button onClick={() => setSidebarOpen(v => !v)} className="text-gray-500 hover:text-gray-700">
                    <i className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
                </button>
            </header>

            <div className="flex flex-1">
                {/* ── sidebar ── */}
                <aside className={`
                    fixed lg:static inset-y-0 left-0 z-30
                    w-60 bg-white border-r border-gray-200
                    flex flex-col
                    transform transition-transform duration-200
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0
                `}>
                    {/* Logo */}
                    <div className="hidden lg:flex items-center gap-2 px-5 h-16 border-b border-gray-200 shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow">
                            <span className="text-white font-bold text-sm">IE</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">Intel Eleitoral</p>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3">
                        {/* Trocar eleição */}
                        <div className="px-3 mb-4">
                            <Link
                                href="/app"
                                onClick={() => setSidebarOpen(false)}
                                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                <i className="fa-solid fa-repeat text-[10px]"></i>
                                Trocar eleição
                            </Link>
                        </div>

                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-3 mb-2">Análise</p>
                        {navItems.map(item => {
                            const active = currentPath === item.href || currentPath.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-colors
                                        ${active
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                                    `}
                                >
                                    <i className={`fa-solid ${item.icon} w-4 text-center ${active ? 'text-blue-600' : 'text-gray-400'}`}></i>
                                    {item.label}
                                </Link>
                            );
                        })}

                        {/* Importar — admin */}
                        <div className="border-t border-gray-200 mt-4 pt-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-3 mb-2">Admin</p>
                            <Link
                                href="/app/importar"
                                onClick={() => setSidebarOpen(false)}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-colors
                                    ${currentPath === '/app/importar'
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                                `}
                            >
                                <i className={`fa-solid fa-cloud-arrow-up w-4 text-center ${currentPath === '/app/importar' ? 'text-blue-600' : 'text-gray-400'}`}></i>
                                Importar
                            </Link>
                        </div>

                        <div className="border-t border-gray-200 mt-4 pt-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-3 mb-2">Conta</p>
                            <Link
                                href="/painel"
                                onClick={() => setSidebarOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            >
                                <i className="fa-solid fa-gear w-4 text-center text-gray-400"></i>
                                Meu Painel
                            </Link>
                        </div>
                    </nav>

                    {/* User / Logout */}
                    <div className="border-t border-gray-200 p-4 shrink-0">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {auth?.user?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-gray-800 truncate">{auth?.user?.name ?? 'Usuário'}</p>
                                <p className="text-xs text-gray-400 truncate">{auth?.user?.email ?? ''}</p>
                            </div>
                        </div>
                        <button
                            onClick={doLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                            <i className="fa-solid fa-right-from-bracket text-sm"></i>
                            Sair
                        </button>
                    </div>
                </aside>

                {/* Overlay mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-20 bg-black/30 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* ── main content ── */}
                <main className="flex-1 min-w-0 overflow-y-auto">
                    <link
                        rel="stylesheet"
                        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
                    />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
