<?php

namespace App\Http\Responses;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    /**
     * Redireciona o usuário após o login conforme seu papel e eleições vinculadas.
     *
     * Não utiliza redirect()->intended() para evitar que URLs salvas em sessão
     * (ex.: /dashboard) sobrescrevam o destino correto do sistema.
     */
    public function toResponse($request)
    {
        // Resposta JSON para requisições SPA / API (ex.: Inertia prefetch)
        if ($request->wantsJson()) {
            return response()->json(['two_factor' => false]);
        }

        return redirect($this->resolverDestino($request));
    }

    /**
     * Determina a URL de destino conforme o papel e as eleições do usuário logado.
     */
    private function resolverDestino(Request $request): string
    {
        $usuario = $request->user();

        // Admin SaaS sempre vai para o seletor de eleição
        if ($usuario->role === 'admin_saas') {
            return '/app';
        }

        // Resolve o id do cliente dono das eleições vinculadas
        $clienteId = match ($usuario->role) {
            'sub_usuario' => $usuario->cliente_principal_id,
            'cliente'     => $usuario->id,
            default       => null,
        };

        if (!$clienteId) {
            return '/app';
        }

        // Busca as eleições vinculadas ao cliente
        $eleicoes = DB::table('cliente_eleicoes')
            ->where('cliente_id', $clienteId)
            ->pluck('eleicao_id');

        // Com exatamente uma eleição, vai direto para o dashboard dela
        if ($eleicoes->count() === 1) {
            return "/app/{$eleicoes->first()}/dashboard";
        }

        // Com zero ou mais de uma eleição, vai para o seletor
        return '/app';
    }
}
