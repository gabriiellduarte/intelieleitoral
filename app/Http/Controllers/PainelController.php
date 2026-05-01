<?php

namespace App\Http\Controllers;

use App\Models\PagamentoAssinatura;
use App\Models\User;
use App\Services\AsaasService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class PainelController extends Controller
{
    public function index(Request $request): Response
    {
        $cliente = $request->user()->load('plano');

        $usuarios = User::query()
            ->where('role', 'sub_usuario')
            ->where('cliente_principal_id', $cliente->id)
            ->get();

        $plano   = $cliente->plano;
        $limite  = $plano?->limite_usuarios ?? 1;
        $total   = $usuarios->count();
        $ativos  = $usuarios->where('ativo', true)->count();

        $pagamentos = PagamentoAssinatura::query()
            ->where('cliente_id', $cliente->id)
            ->with('plano:id,nome')
            ->orderByDesc('pago_em')
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        $renovaEm = $cliente->assinatura_renova_em;
        if (!$renovaEm && $cliente->ativo) {
            $ultimoPagamentoAprovado = $pagamentos->firstWhere('status', 'pago');
            $renovaEm = $ultimoPagamentoAprovado?->pago_em?->copy()->addMonthNoOverflow();
        }

        $statusAssinatura = 'inativa';
        if ($cliente->ativo) {
            $statusAssinatura = $cliente->assinatura_cancelar_no_fim_ciclo
                ? 'cancelamento_pendente'
                : 'ativa';
        }

        return Inertia::render('painel/index', [
            'stats' => [
                'plano'    => $plano ? [
                    'nome'     => $plano->nome,
                    'preco'    => $plano->preco,
                    'recursos' => $plano->recursos ?? [],
                ] : null,
                'usuarios' => [
                    'total'  => $total,
                    'ativos' => $ativos,
                    'limite' => $limite,
                ],
            ],
            'assinatura' => [
                'status' => $statusAssinatura,
                'renova_em' => $renovaEm?->toDateString(),
                'cancelar_no_fim_ciclo' => (bool) $cliente->assinatura_cancelar_no_fim_ciclo,
                'cancelada_em' => $cliente->assinatura_cancelada_em?->toDateTimeString(),
            ],
            'pagamentos' => $pagamentos->map(fn($pagamento) => [
                'id' => $pagamento->id,
                'valor' => $pagamento->valor,
                'moeda' => $pagamento->moeda,
                'status' => $pagamento->status,
                'metodo_pagamento' => $pagamento->metodo_pagamento,
                'referencia' => $pagamento->referencia_externa,
                'pago_em' => $pagamento->pago_em?->toDateTimeString(),
                'plano_nome' => $pagamento->plano?->nome,
            ]),
            'usuarios' => $usuarios->map(fn($u) => [
                'id'            => $u->id,
                'nome'          => $u->name,
                'email'         => $u->email,
                'cargo'         => $u->cargo,
                'ativo'         => $u->ativo,
                'ultimo_acesso' => $u->ultimo_acesso?->toDateString(),
            ]),
        ]);
    }

    public function cancelarAssinatura(Request $request): RedirectResponse
    {
        $cliente = $request->user()->load('plano');

        if ($cliente->role !== 'cliente') {
            abort(403);
        }

        if (!$cliente->plano_id) {
            return back()->withErrors([
                'assinatura' => 'Nenhuma assinatura ativa foi encontrada para cancelamento.',
            ]);
        }

        if ($cliente->assinatura_cancelar_no_fim_ciclo) {
            return back();
        }

        $cliente->update([
            'assinatura_cancelar_no_fim_ciclo' => true,
            'assinatura_cancelada_em' => now(),
            'assinatura_renova_em' => $cliente->assinatura_renova_em ?? now()->addMonthNoOverflow(),
        ]);

        // Sincroniza o cancelamento com o Asaas quando há uma assinatura registrada
        if ($cliente->asaas_assinatura_id) {
            try {
                app(AsaasService::class)->cancelarAssinatura($cliente->asaas_assinatura_id);

                $cliente->update(['assinatura_asaas_status' => 'cancelada']);
            } catch (\Throwable $e) {
                // Falha na API do Asaas não impede o cancelamento local;
                // o webhook posterior irá sincronizar o status
                Log::channel('stack')->warning('[PainelController] Falha ao cancelar assinatura no Asaas', [
                    'cliente_id'          => $cliente->id,
                    'asaas_assinatura_id' => $cliente->asaas_assinatura_id,
                    'erro'                => $e->getMessage(),
                ]);
            }
        }

        return back()->with('success', 'Assinatura marcada para cancelamento no fim do ciclo atual.');
    }

    public function storeUsuario(Request $request): RedirectResponse
    {
        $cliente = $request->user()->load('plano');
        $limite  = $cliente->plano?->limite_usuarios ?? 1;
        $total   = User::query()
            ->where('role', 'sub_usuario')
            ->where('cliente_principal_id', $cliente->id)
            ->count('*');

        if ($total >= $limite) {
            return back()->withErrors(['limite' => "Limite de {$limite} usuários atingido para o seu plano."]);
        }

        $validated = $request->validate([
            'nome'  => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'senha' => 'required|string|min:6',
            'cargo' => 'in:usuario,analista,gerente',
        ]);

        $existe = User::query()
            ->where('email', $validated['email'])
            ->exists();

        if ($existe) {
            return back()->withErrors(['email' => 'Este email já está em uso.']);
        }

        User::create([
            'cliente_principal_id' => $cliente->id,
            'name'                 => $validated['nome'],
            'email'                => $validated['email'],
            'password'             => Hash::make($validated['senha']),
            'cargo'                => $validated['cargo'] ?? 'usuario',
            'role'                 => 'sub_usuario',
            'ativo'                => true,
        ]);

        return back();
    }

    public function updateUsuario(Request $request, User $usuario): RedirectResponse
    {
        if ($usuario->role !== 'sub_usuario' || $usuario->cliente_principal_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'nome'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'senha' => 'nullable|string|min:6',
            'cargo' => 'sometimes|in:usuario,analista,gerente',
            'ativo' => 'sometimes|boolean',
        ]);

        if (!empty($validated['email'])) {
            $emailEmUso = User::query()
                ->where('email', $validated['email'])
                ->where('id', '!=', $usuario->id)
                ->exists();

            if ($emailEmUso) {
                return back()->withErrors(['email' => 'Este email já está em uso.']);
            }
        }

        $dadosAtualizacao = [
            'name'  => $validated['nome'] ?? $usuario->name,
            'email' => $validated['email'] ?? $usuario->email,
            'cargo' => $validated['cargo'] ?? $usuario->cargo,
            'ativo' => $validated['ativo'] ?? $usuario->ativo,
        ];

        if (!empty($validated['senha'])) {
            $dadosAtualizacao['password'] = Hash::make($validated['senha']);
        }

        $usuario->update($dadosAtualizacao);

        return back();
    }

    public function destroyUsuario(Request $request, User $usuario): RedirectResponse
    {
        if ($usuario->role !== 'sub_usuario' || $usuario->cliente_principal_id !== $request->user()->id) {
            abort(403);
        }

        User::query()->whereKey($usuario->id)->delete();

        return back();
    }
}
