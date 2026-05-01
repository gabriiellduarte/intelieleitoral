<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureEleicaoAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user      = $request->user();
        $eleicaoId = $request->route('eleicao');

        if (!$eleicaoId || !$user) {
            return $next($request);
        }

        // Admin SaaS tem acesso irrestrito
        if ($user->role === 'admin_saas') {
            return $next($request);
        }

        // Resolve o cliente dono da assinatura:
        // - se o usuário logado É o comprador (role=cliente), ele mesmo é o cliente
        // - se for um sub-usuário (usuarios_cliente), busca o cliente_id dele
        $clienteId = $this->resolverClienteId($user);

        if (!$clienteId) {
            abort(403, 'Conta sem assinatura ativa.');
        }

        // Sub-usuário depende do status do cliente principal
        if ($user->role === 'sub_usuario') {
            $clienteAtivo = DB::table('users')
                ->where('id', $clienteId)
                ->where('ativo', true)
                ->exists();

            if (!$clienteAtivo) {
                abort(403, 'Cliente principal está inativo.');
            }
        }

        // Se a conta não tem nenhuma eleição vinculada, libera tudo (retrocompatibilidade)
        $temVinculos = DB::table('cliente_eleicoes')
            ->where('cliente_id', $clienteId)
            ->exists();

        if (!$temVinculos) {
            return $next($request);
        }

        $temAcesso = DB::table('cliente_eleicoes')
            ->where('cliente_id', $clienteId)
            ->where('eleicao_id', $eleicaoId)
            ->exists();

        if (!$temAcesso) {
            abort(403, 'Sua assinatura não inclui acesso a esta eleição.');
        }

        return $next($request);
    }

    private function resolverClienteId(mixed $user): ?int
    {
        // Comprador direto
        if ($user->role === 'cliente') {
            return $user->id;
        }

        // Sub-usuário já migrado para a tabela users
        if ($user->role === 'sub_usuario') {
            return $user->cliente_principal_id;
        }

        // Fallback temporário para legado em usuarios_cliente
        $subUsuario = DB::table('usuarios_cliente')
            ->where('email', $user->email)
            ->first();

        return $subUsuario?->cliente_id ?? null;
    }
}
