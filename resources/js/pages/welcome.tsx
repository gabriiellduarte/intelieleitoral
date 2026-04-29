import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { home, login, register } from '@/routes';

type Plano = {
    id: number;
    nome: string;
    preco: number;
    limite_usuarios: number;
    recursos: string[];
};

type Props = {
    canRegister?: boolean;
    planos?: Plano[];
};

const features = [
    { icon: 'fa-chart-pie', title: 'Dashboard Inteligente', desc: 'Visualize dados eleitorais com gráficos interativos e análises em tempo real de todos os candidatos e regiões.' },
    { icon: 'fa-map-location-dot', title: 'Mapa Eleitoral', desc: 'Geolocalização de votos por município, zona e seção com mapa interativo detalhado de Roraima.' },
    { icon: 'fa-scale-balanced', title: 'Comparativo Avançado', desc: 'Compare candidatos lado a lado com métricas de desempenho, evolução e alcance territorial.' },
    { icon: 'fa-bullseye', title: 'Estratégia Política', desc: 'Identifique oportunidades, redutos eleitorais e crie estratégias baseadas em dados históricos.' },
    { icon: 'fa-users-gear', title: 'Gestão de Equipe', desc: 'Gerencie sua equipe com diferentes níveis de acesso, controlando quem vê o quê na plataforma.' },
    { icon: 'fa-shield-halved', title: 'Dados Seguros', desc: 'Seus dados protegidos com criptografia de ponta. Backup automático e controle total de acesso.' },
];

const testimonials = [
    { nome: 'Ricardo Mendes', cargo: 'Coordenador de Campanha', texto: 'A plataforma transformou nossa forma de analisar dados eleitorais. Conseguimos identificar zonas com potencial que jamais imaginaríamos.', avatar: 'RM' },
    { nome: 'Ana Beatriz Silva', cargo: 'Consultora Política', texto: 'Interface intuitiva e dados precisos. A ferramenta de comparação entre candidatos é absolutamente indispensável para qualquer estrategista.', avatar: 'AS' },
    { nome: 'Carlos Eduardo Lima', cargo: 'Diretor de Marketing Político', texto: 'Reduzimos em 60% o tempo de análise eleitoral. Os mapas de calor nos deram vantagens estratégicas que fizeram a diferença.', avatar: 'CL' },
];

const planosDefault: Plano[] = [
    { id: 1, nome: 'Básico', preco: 97, limite_usuarios: 3, recursos: ['Dashboard eleitoral', 'Análise de candidatos', 'Comparativo básico', 'Suporte por email'] },
    { id: 2, nome: 'Profissional', preco: 197, limite_usuarios: 10, recursos: ['Tudo do Básico', 'Estratégia eleitoral', 'Mapa interativo completo', 'Relatórios avançados', 'Suporte prioritário'] },
    { id: 3, nome: 'Empresarial', preco: 497, limite_usuarios: 50, recursos: ['Tudo do Profissional', 'Importação de dados', 'API de integração', 'Usuários ilimitados', 'Gerente de conta dedicado', 'SLA garantido'] },
];

export default function Welcome({ canRegister = true, planos = planosDefault }: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const planoPadrao = planos[1]?.id ?? planos[0]?.id ?? 1;
    const cadastroPadraoHref = register({ query: { plano: planoPadrao } });

    return (
        <div className="min-h-screen overflow-x-hidden bg-gray-50 text-gray-900">
            <Head title="Intel Eleitoral — Dados que vencem eleições">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
            </Head>

            {/* Ambient */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute left-[-10%] top-[-20%] h-[600px] w-[600px] rounded-full bg-emerald-400/[0.07] blur-[140px]" />
                <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-400/[0.07] blur-[130px]" />
            </div>

            {/* Nav */}
            <nav className="relative z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <Link href={home()} className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-[11px] font-black text-white">IE</div>
                        <span className="text-[15px] font-semibold tracking-tight text-gray-800">Intel Eleitoral</span>
                    </Link>

                    <div className="hidden items-center gap-8 md:flex">
                        <a href="#features" className="text-[13px] text-gray-500 transition-colors hover:text-gray-800">Recursos</a>
                        <a href="#pricing" className="text-[13px] text-gray-500 transition-colors hover:text-gray-800">Planos</a>
                        <a href="#testimonials" className="text-[13px] text-gray-500 transition-colors hover:text-gray-800">Depoimentos</a>
                        <Link href={login()} className="text-[13px] font-medium text-gray-600 transition-colors hover:text-gray-900">Entrar</Link>
                        {canRegister && (
                            <Link href={cadastroPadraoHref} className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-[13px] font-semibold text-white transition-all hover:shadow-md hover:shadow-emerald-200">
                                Começar Agora
                            </Link>
                        )}
                    </div>

                    <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-9 w-9 items-center justify-center text-gray-500 md:hidden">
                        <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'} text-lg`} />
                    </button>
                </div>

                {menuOpen && (
                    <div className="space-y-3 border-t border-gray-200 bg-white px-6 py-4 md:hidden">
                        <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600">Recursos</a>
                        <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600">Planos</a>
                        <a href="#testimonials" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600">Depoimentos</a>
                        <div className="flex gap-3 pt-2">
                            <Link href={login()} className="text-sm font-medium text-gray-700">Entrar</Link>
                            {canRegister && (
                                <Link href={cadastroPadraoHref} className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white">Começar</Link>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero */}
            <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-20 md:pt-32">
                <div className="max-w-3xl">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        <span className="text-[11px] font-medium uppercase tracking-widest text-emerald-700">Plataforma de Inteligência Eleitoral</span>
                    </div>

                    <h1 className="mb-6 text-4xl font-bold leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
                        <span className="text-gray-900">Dados que</span><br />
                        <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">vencem eleições</span>
                    </h1>

                    <p className="mb-10 max-w-xl text-base leading-relaxed text-gray-500 md:text-lg">
                        Transforme dados do TSE em estratégias vencedoras. Análise completa de candidatos, votações e tendências eleitorais com inteligência artificial.
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        {canRegister && (
                            <Link href={cadastroPadraoHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-7 py-3.5 text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-200">
                                Começar Gratuitamente <i className="fa-solid fa-arrow-right text-xs" />
                            </Link>
                        )}
                        <a href="#features" className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-7 py-3.5 text-[14px] font-medium text-gray-600 transition-all hover:bg-gray-100">
                            Ver Recursos
                        </a>
                    </div>
                </div>

                <div className="mt-20 grid grid-cols-2 gap-4 border-t border-gray-200 pt-10 md:grid-cols-4">
                    {[
                        { value: '15M+', label: 'Votos Analisados' },
                        { value: '200+', label: 'Campanhas Atendidas' },
                        { value: '99.9%', label: 'Disponibilidade' },
                        { value: '5min', label: 'Setup Inicial' },
                    ].map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="bg-gradient-to-r from-gray-900 to-gray-500 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">{stat.value}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-wider text-gray-400">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                        Tudo que você precisa para<br /><span className="text-emerald-600">dominar o cenário eleitoral</span>
                    </h2>
                    <p className="mx-auto max-w-lg text-gray-500">Ferramentas poderosas construídas por especialistas em análise de dados políticos</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {features.map((f, i) => (
                        <div key={i} className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-50">
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 transition-colors group-hover:bg-emerald-100">
                                <i className={`fa-solid ${f.icon} text-sm text-emerald-600`} />
                            </div>
                            <h3 className="mb-2 text-[15px] font-semibold text-gray-800">{f.title}</h3>
                            <p className="text-[13px] leading-relaxed text-gray-500">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                        Planos que <span className="text-cyan-600">cabem na sua estratégia</span>
                    </h2>
                    <p className="mx-auto max-w-lg text-gray-500">Escolha o plano ideal para o tamanho da sua operação política</p>
                </div>
                <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
                    {planos.map((plano, i) => {
                        const isPopular = i === 1;
                        return (
                            <div key={plano.id} className={`relative rounded-2xl bg-white ${isPopular ? 'shadow-xl shadow-emerald-100 ring-2 ring-emerald-500' : 'border border-gray-200 shadow-sm'}`}>
                                {isPopular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                                        Mais Popular
                                    </div>
                                )}
                                <div className="flex h-full flex-col rounded-2xl p-7">
                                    <h3 className="text-lg font-bold text-gray-800">{plano.nome}</h3>
                                    <div className="mb-6 mt-4">
                                        <span className="text-4xl font-black tracking-tight text-gray-900">R$ {plano.preco}</span>
                                        <span className="text-sm text-gray-400">/mês</span>
                                    </div>
                                    <div className="mb-4 border-b border-gray-100 pb-4 text-[12px] text-gray-400">
                                        Até <span className="font-semibold text-gray-700">{plano.limite_usuarios}</span> usuários
                                    </div>
                                    <ul className="mb-8 flex-1 space-y-3">
                                        {plano.recursos.map((r, j) => (
                                            <li key={j} className="flex items-start gap-2.5 text-[13px] text-gray-600">
                                                <i className="fa-solid fa-check mt-1 shrink-0 text-[10px] text-emerald-500" />
                                                {r}
                                            </li>
                                        ))}
                                    </ul>
                                    {canRegister && (
                                        <Link href={register({ query: { plano: plano.id } })} className={`block rounded-xl py-3 text-center text-[13px] font-semibold transition-all ${isPopular ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-md hover:shadow-emerald-200' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                            Escolher {plano.nome}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Testimonials */}
            <section id="testimonials" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Quem usa, <span className="text-emerald-600">recomenda</span></h2>
                </div>
                <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
                    {testimonials.map((t, i) => (
                        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <div className="mb-4 flex items-center gap-1">
                                {[1,2,3,4,5].map(s => <i key={s} className="fa-solid fa-star text-[11px] text-amber-400" />)}
                            </div>
                            <p className="mb-6 text-[13px] italic leading-relaxed text-gray-500">"{t.texto}"</p>
                            <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-cyan-100 text-[11px] font-bold text-emerald-700">{t.avatar}</div>
                                <div>
                                    <div className="text-[13px] font-semibold text-gray-800">{t.nome}</div>
                                    <div className="text-[11px] text-gray-400">{t.cargo}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
                <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-10 text-center md:p-16">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                        Pronto para transformar sua<br /><span className="text-emerald-600">estratégia eleitoral?</span>
                    </h2>
                    <p className="mx-auto mb-8 max-w-lg text-gray-500">Comece agora e tenha acesso a todos os dados eleitorais de Roraima em minutos.</p>
                    {canRegister && (
                        <Link href={cadastroPadraoHref} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-4 text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-200">
                            Criar Conta Gratuita <i className="fa-solid fa-arrow-right text-xs" />
                        </Link>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-gray-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-[10px] font-black text-white">IE</div>
                        <span className="text-[13px] text-gray-400">Intel Eleitoral &copy; {new Date().getFullYear()}</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-[12px] text-gray-400 transition-colors hover:text-gray-700">Termos de Uso</a>
                        <a href="#" className="text-[12px] text-gray-400 transition-colors hover:text-gray-700">Privacidade</a>
                        <a href="#" className="text-[12px] text-gray-400 transition-colors hover:text-gray-700">Contato</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
