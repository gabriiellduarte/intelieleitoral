<?php

namespace App\Http\Controllers;

use App\Models\UsuarioCliente;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class PainelController extends Controller
{
    public function index(Request $request): Response
    {
        $cliente = $request->user()->load('plano');

        $usuarios = UsuarioCliente::where('cliente_id', $cliente->id)->get();

        $plano   = $cliente->plano;
        $limite  = $plano?->limite_usuarios ?? 1;
        $total   = $usuarios->count();
        $ativos  = $usuarios->where('ativo', true)->count();

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
            'usuarios' => $usuarios->map(fn($u) => [
                'id'            => $u->id,
                'nome'          => $u->nome,
                'email'         => $u->email,
                'cargo'         => $u->cargo,
                'ativo'         => $u->ativo,
                'ultimo_acesso' => $u->ultimo_acesso?->toDateString(),
            ]),
        ]);
    }

    public function storeUsuario(Request $request): RedirectResponse
    {
        $cliente = $request->user()->load('plano');
        $limite  = $cliente->plano?->limite_usuarios ?? 1;
        $total   = UsuarioCliente::where('cliente_id', $cliente->id)->count();

        if ($total >= $limite) {
            return back()->withErrors(['limite' => "Limite de {$limite} usuários atingido para o seu plano."]);
        }

        $validated = $request->validate([
            'nome'  => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'senha' => 'required|string|min:6',
            'cargo' => 'in:usuario,analista,gerente',
        ]);

        $existe = UsuarioCliente::where('cliente_id', $cliente->id)
            ->where('email', $validated['email'])
            ->exists();

        if ($existe) {
            return back()->withErrors(['email' => 'Este email já está em uso.']);
        }

        UsuarioCliente::create([
            'cliente_id' => $cliente->id,
            'nome'       => $validated['nome'],
            'email'      => $validated['email'],
            'senha'      => Hash::make($validated['senha']),
            'cargo'      => $validated['cargo'] ?? 'usuario',
        ]);

        return back();
    }

    public function updateUsuario(Request $request, UsuarioCliente $usuario): RedirectResponse
    {
        if ($usuario->cliente_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'nome'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'senha' => 'nullable|string|min:6',
            'cargo' => 'sometimes|in:usuario,analista,gerente',
            'ativo' => 'sometimes|boolean',
        ]);

        if (!empty($validated['senha'])) {
            $validated['senha'] = Hash::make($validated['senha']);
        } else {
            unset($validated['senha']);
        }

        $usuario->update($validated);

        return back();
    }

    public function destroyUsuario(Request $request, UsuarioCliente $usuario): RedirectResponse
    {
        if ($usuario->cliente_id !== $request->user()->id) {
            abort(403);
        }

        $usuario->delete();

        return back();
    }
}
