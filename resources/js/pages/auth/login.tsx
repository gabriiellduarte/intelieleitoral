import { Form, Head } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register, home } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({ status, canResetPassword, canRegister }: Props) {
    return (
        <div className="w-full max-w-md">
                {/* Logo / brand */}
                <div className="text-center mb-8">
                    <Link href={home()} className="inline-flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md">
                            <span className="text-white font-bold text-xl">IE</span>
                        </div>
                        <span className="text-gray-900 font-semibold text-lg">Intel Eleitoral</span>
                    </Link>
                    <h1 className="mt-4 text-2xl font-bold text-gray-900">Acesse sua conta</h1>
                    <p className="mt-1 text-sm text-gray-500">Digite seu email e senha para entrar</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                    {status && (
                        <div className="mb-6 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm text-center font-medium">
                            {status}
                        </div>
                    )}

                    <Form
                        {...store.form()}
                        resetOnSuccess={['password']}
                        className="flex flex-col gap-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-5">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="email" className="text-gray-700 font-medium text-sm">
                                            Email
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            required
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="email"
                                            placeholder="seu@email.com"
                                            className="bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password" className="text-gray-700 font-medium text-sm">
                                                Senha
                                            </Label>
                                            {canResetPassword && (
                                                <Link
                                                    href={request()}
                                                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                                    tabIndex={5}
                                                >
                                                    Esqueceu a senha?
                                                </Link>
                                            )}
                                        </div>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            required
                                            tabIndex={2}
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                            className="bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="remember" name="remember" tabIndex={3} />
                                        <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                                            Lembrar de mim
                                        </Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        tabIndex={4}
                                        disabled={processing}
                                        data-test="login-button"
                                        className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-2.5 rounded-xl shadow-sm transition-all"
                                    >
                                        {processing && <Spinner />}
                                        Entrar
                                    </Button>
                                </div>

                                {canRegister && (
                                    <p className="text-center text-sm text-gray-500">
                                        Não tem uma conta?{' '}
                                        <Link
                                            href={register()}
                                            tabIndex={6}
                                            className="text-emerald-600 hover:text-emerald-700 font-medium"
                                        >
                                            Criar conta
                                        </Link>
                                    </p>
                                )}
                            </>
                        )}
                    </Form>
                </div>

                <p className="mt-6 text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} Intel Eleitoral. Todos os direitos reservados.
                </p>
            </div>
    );
}

Login.layout = null;
