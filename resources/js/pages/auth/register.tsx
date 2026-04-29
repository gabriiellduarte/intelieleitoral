import { Form, Head, Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { home, login } from '@/routes';
import { store } from '@/routes/register';

type Plano = {
    id: number;
    nome: string;
    preco: number;
    limite_usuarios: number;
    recursos: string[];
};

type Props = {
    planos?: Plano[];
    planoSelecionado?: number;
};

const planosDefault: Plano[] = [
    { id: 1, nome: 'Basico', preco: 97, limite_usuarios: 3, recursos: ['Dashboard eleitoral', 'Analise de candidatos', 'Comparativo basico', 'Suporte por email'] },
    { id: 2, nome: 'Profissional', preco: 197, limite_usuarios: 10, recursos: ['Tudo do Basico', 'Estrategia eleitoral', 'Mapa interativo', 'Relatorios avancados', 'Suporte prioritario'] },
    { id: 3, nome: 'Empresarial', preco: 497, limite_usuarios: 50, recursos: ['Tudo do Profissional', 'Importacao de dados', 'API de integracao', 'Usuarios ilimitados', 'Gerente dedicado'] },
];

const metodosPagamento = [
    { id: 'cartao', nome: 'Cartao', detalhe: 'Credito recorrente' },
    { id: 'pix', nome: 'PIX', detalhe: 'Cobranca mensal' },
    { id: 'boleto', nome: 'Boleto', detalhe: 'Vencimento mensal' },
];

const abrangencias = ['Municipal', 'Estadual', 'Federal'];

export default function Register({ planos = planosDefault, planoSelecionado: planoInicial }: Props) {
    const planoInicialValido = planos.some((plano) => plano.id === planoInicial) ? planoInicial : planos[0]?.id;
    const [planoSelecionado, setPlanoSelecionado] = useState<number>(planoInicialValido ?? 1);
    const [metodoPagamento, setMetodoPagamento] = useState('cartao');
    const [abrangencia, setAbrangencia] = useState('Municipal');

    const planoAtual = useMemo(
        () => planos.find((plano) => plano.id === planoSelecionado) ?? planos[0],
        [planos, planoSelecionado],
    );

    return (
        <div >
            <Head title="Cadastro e Pagamento" />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
                <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <Link href={home()} className="inline-flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-black text-white shadow-sm">
                            IE
                        </div>
                        <div>
                            <span className="block text-base font-semibold text-slate-900">Intel Eleitoral</span>
                            <span className="text-xs text-slate-500">Contratacao do acesso SaaS</span>
                        </div>
                    </Link>

                    <p className="text-sm text-slate-500">
                        Ja tem uma conta?{' '}
                        <Link href={login()} className="font-semibold text-emerald-700 hover:text-emerald-800">
                            Entrar
                        </Link>
                    </p>
                </header>

                <main className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <div className="mb-7">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Finalizar cadastro</p>
                            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                                Informe seus dados para ativar o acesso
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                O pagamento ainda e apenas uma etapa visual. Por enquanto o sistema cria a conta, vincula o plano escolhido e libera o acesso do cliente.
                            </p>
                        </div>

                        <div className="mb-7 grid gap-3 sm:grid-cols-3">
                            {planos.map((plano) => (
                                <button
                                    key={plano.id}
                                    type="button"
                                    onClick={() => setPlanoSelecionado(plano.id)}
                                    className={`rounded-lg border p-4 text-left transition ${
                                        planoSelecionado === plano.id
                                            ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-sm font-semibold text-slate-800">{plano.nome}</span>
                                        {planoSelecionado === plano.id && <span className="text-xs font-semibold text-emerald-700">Selecionado</span>}
                                    </div>
                                    <p className="mt-3 text-2xl font-bold text-slate-950">
                                        R$ {plano.preco}
                                        <span className="text-xs font-normal text-slate-500">/mes</span>
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">Ate {plano.limite_usuarios} usuarios</p>
                                </button>
                            ))}
                        </div>

                        <Form
                            {...store.form()}
                            resetOnSuccess={['password', 'password_confirmation']}
                            disableWhileProcessing
                            className="space-y-8"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <input type="hidden" name="plano_id" value={planoSelecionado} />

                                    <div className="space-y-5">
                                        <div>
                                            <h2 className="text-base font-semibold text-slate-900">Dados pessoais</h2>
                                            <p className="mt-1 text-sm text-slate-500">Esses dados identificam o responsavel pelo acesso contratado.</p>
                                        </div>

                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                                                    Nome completo
                                                </Label>
                                                <Input id="name" type="text" required autoFocus tabIndex={1} autoComplete="name" name="name" placeholder="Joao Silva" />
                                                <InputError message={errors.name} />
                                            </div>

                                            <div className="grid gap-1.5">
                                                <Label htmlFor="telefone" className="text-sm font-medium text-slate-700">
                                                    Telefone
                                                </Label>
                                                <Input id="telefone" type="tel" tabIndex={2} autoComplete="tel" name="telefone" placeholder="(95) 99999-9999" />
                                                <InputError message={(errors as Record<string, string>).telefone} />
                                            </div>
                                        </div>

                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                                                    Email
                                                </Label>
                                                <Input id="email" type="email" required tabIndex={3} autoComplete="email" name="email" placeholder="seu@email.com" />
                                                <InputError message={errors.email} />
                                            </div>

                                            <div className="grid gap-1.5">
                                                <Label htmlFor="empresa" className="text-sm font-medium text-slate-700">
                                                    Campanha / Organizacao
                                                </Label>
                                                <Input id="empresa" type="text" tabIndex={4} name="empresa" placeholder="Comite, gabinete ou consultoria" />
                                                <InputError message={(errors as Record<string, string>).empresa} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-5 border-t border-slate-100 pt-7">
                                        <div>
                                            <h2 className="text-base font-semibold text-slate-900">Escopo do acesso</h2>
                                            <p className="mt-1 text-sm text-slate-500">Esta selecao prepara o fluxo comercial para acessos municipal, estadual ou federal.</p>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-3">
                                            {abrangencias.map((item) => (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onClick={() => setAbrangencia(item)}
                                                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                                                        abrangencia === item
                                                            ? 'border-cyan-500 bg-cyan-50 text-cyan-800'
                                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {item}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                                                    Senha
                                                </Label>
                                                <PasswordInput id="password" required tabIndex={5} autoComplete="new-password" name="password" placeholder="Minimo 8 caracteres" />
                                                <InputError message={errors.password} />
                                            </div>

                                            <div className="grid gap-1.5">
                                                <Label htmlFor="password_confirmation" className="text-sm font-medium text-slate-700">
                                                    Confirmar senha
                                                </Label>
                                                <PasswordInput id="password_confirmation" required tabIndex={6} autoComplete="new-password" name="password_confirmation" placeholder="Repita a senha" />
                                                <InputError message={errors.password_confirmation} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-5 border-t border-slate-100 pt-7">
                                        <div>
                                            <h2 className="text-base font-semibold text-slate-900">Metodo de pagamento</h2>
                                            <p className="mt-1 text-sm text-slate-500">Campos sem processamento financeiro nesta versao.</p>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-3">
                                            {metodosPagamento.map((metodo) => (
                                                <button
                                                    key={metodo.id}
                                                    type="button"
                                                    onClick={() => setMetodoPagamento(metodo.id)}
                                                    className={`rounded-lg border p-4 text-left transition ${
                                                        metodoPagamento === metodo.id
                                                            ? 'border-emerald-500 bg-emerald-50'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <span className="block text-sm font-semibold text-slate-900">{metodo.nome}</span>
                                                    <span className="mt-1 block text-xs text-slate-500">{metodo.detalhe}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {metodoPagamento === 'cartao' && (
                                            <div className="grid gap-5 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                                                <div className="grid gap-1.5 sm:col-span-2">
                                                    <Label htmlFor="cartao_nome" className="text-sm font-medium text-slate-700">
                                                        Nome impresso no cartao
                                                    </Label>
                                                    <Input id="cartao_nome" type="text" tabIndex={7} placeholder="Nome do titular" />
                                                </div>
                                                <div className="grid gap-1.5 sm:col-span-2">
                                                    <Label htmlFor="cartao_numero" className="text-sm font-medium text-slate-700">
                                                        Numero do cartao
                                                    </Label>
                                                    <Input id="cartao_numero" type="text" tabIndex={8} placeholder="0000 0000 0000 0000" />
                                                </div>
                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="cartao_validade" className="text-sm font-medium text-slate-700">
                                                        Validade
                                                    </Label>
                                                    <Input id="cartao_validade" type="text" tabIndex={9} placeholder="MM/AA" />
                                                </div>
                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="cartao_cvv" className="text-sm font-medium text-slate-700">
                                                        CVV
                                                    </Label>
                                                    <Input id="cartao_cvv" type="text" tabIndex={10} placeholder="000" />
                                                </div>
                                            </div>
                                        )}

                                        {metodoPagamento !== 'cartao' && (
                                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                                                A geracao de {metodoPagamento === 'pix' ? 'PIX' : 'boleto'} sera conectada futuramente. Nesta etapa o metodo escolhido fica apenas como referencia visual.
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-cyan-600"
                                        tabIndex={11}
                                        data-test="register-user-button"
                                    >
                                        {processing && <Spinner />}
                                        Criar conta e ativar acesso
                                    </Button>
                                </>
                            )}
                        </Form>
                    </section>

                    <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
                        <div className="border-b border-slate-100 pb-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resumo</p>
                            <h2 className="mt-2 text-xl font-bold text-slate-950">{planoAtual?.nome ?? 'Plano selecionado'}</h2>
                            <p className="mt-3 text-3xl font-black text-slate-950">
                                R$ {planoAtual?.preco ?? 0}
                                <span className="text-sm font-normal text-slate-500">/mes</span>
                            </p>
                        </div>

                        <div className="space-y-4 border-b border-slate-100 py-5">
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="text-slate-500">Usuarios inclusos</span>
                                <span className="font-semibold text-slate-900">{planoAtual?.limite_usuarios ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="text-slate-500">Abrangencia</span>
                                <span className="font-semibold text-slate-900">{abrangencia}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="text-slate-500">Pagamento</span>
                                <span className="font-semibold text-slate-900">{metodosPagamento.find((metodo) => metodo.id === metodoPagamento)?.nome}</span>
                            </div>
                        </div>

                        <div className="py-5">
                            <h3 className="text-sm font-semibold text-slate-900">Recursos do plano</h3>
                            <ul className="mt-3 space-y-2">
                                {(planoAtual?.recursos ?? []).map((recurso) => (
                                    <li key={recurso} className="flex items-start gap-2 text-sm text-slate-600">
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        <span>{recurso}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                            Nenhuma cobranca sera processada agora. A integracao de pagamento entra depois, mantendo este mesmo fluxo de compra.
                        </div>
                    </aside>
                </main>
            </div>
        </div>
    );
}

Register.layout = null;
