<?php

namespace App\Http\Controllers;

use App\Models\Plano;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GerenteController extends Controller
{
    public function index(): Response
    {
        $clientes = User::where('role', 'cliente')
            ->with('plano')
            ->withCount('subUsuarios')
            ->get();

        $planos = Plano::withCount(['clientes as total_clientes'])->get();

        $totalClientes = $clientes->count();
        $ativos        = $clientes->where('ativo', true)->count();
        $totalUsuarios = User::where('role', 'sub_usuario')->count();

        $clientesPorPlano = $planos->map(fn($p) => [
            'nome'  => $p->nome,
            'preco' => $p->preco,
            'total' => $p->total_clientes,
        ]);

        // Eleições vinculadas por cliente (agrupadas)
        $eleicoesPorCliente = DB::table('cliente_eleicoes')
            ->select('cliente_id', DB::raw('GROUP_CONCAT(eleicao_id) as eleicao_ids'))
            ->groupBy('cliente_id')
            ->get()
            ->keyBy('cliente_id');

        $eleicoes = DB::table('eleicoes')
            ->select('id', 'ano', 'descricao')
            ->orderByDesc('ano')
            ->orderBy('descricao')
            ->get();

        return Inertia::render('gerente/index', [
            'dashboard' => [
                'clientes' => [
                    'total'  => $totalClientes,
                    'ativos' => $ativos,
                ],
                'usuarios' => [
                    'total' => $totalUsuarios,
                ],
                'clientesPorPlano' => $clientesPorPlano,
                'receitaMensal'    => [],
            ],
            'clientes' => $clientes->map(fn($c) => [
                'id'                 => $c->id,
                'nome'               => $c->name,
                'email'              => $c->email,
                'empresa'            => $c->empresa,
                'plano_nome'         => $c->plano?->nome,
                'plano_preco'        => $c->plano?->preco,
                'limite_usuarios'    => $c->plano?->limite_usuarios ?? 0,
                'total_usuarios'     => $c->sub_usuarios_count,
                'ativo'              => $c->ativo,
                'criado_em'          => $c->created_at?->toDateString(),
                'eleicoes_vinculadas' => isset($eleicoesPorCliente[$c->id])
                    ? array_map('intval', explode(',', $eleicoesPorCliente[$c->id]->eleicao_ids))
                    : [],
            ]),
            'planos' => $planos->map(fn($p) => [
                'id'              => $p->id,
                'nome'            => $p->nome,
                'preco'           => $p->preco,
                'limite_usuarios' => $p->limite_usuarios,
                'recursos'        => $p->recursos ?? [],
            ]),
            'eleicoes' => $eleicoes->map(fn($e) => [
                'id'        => $e->id,
                'ano'       => $e->ano,
                'descricao' => $e->descricao,
            ]),
        ]);
    }

    public function toggleCliente(User $cliente): RedirectResponse
    {
        if ($cliente->role !== 'cliente') abort(403);
        $cliente->update(['ativo' => !$cliente->ativo]);
        return back();
    }

    public function destroyCliente(User $cliente): RedirectResponse
    {
        if ($cliente->role !== 'cliente') abort(403);
        $cliente->delete();
        return back();
    }

    public function updatePlano(Request $request, User $cliente): RedirectResponse
    {
        if ($cliente->role !== 'cliente') abort(403);
        $request->validate(['plano_id' => 'required|exists:planos,id']);
        $cliente->update(['plano_id' => $request->plano_id]);
        return back();
    }

    public function syncEleicoes(Request $request, User $cliente): RedirectResponse
    {
        if ($cliente->role !== 'cliente') abort(403);

        $request->validate([
            'eleicao_ids'   => 'present|array',
            'eleicao_ids.*' => 'integer|exists:eleicoes,id',
        ]);

        $ids = collect($request->eleicao_ids)->unique()->values();

        DB::transaction(function () use ($cliente, $ids) {
            DB::table('cliente_eleicoes')->where('cliente_id', $cliente->id)->delete();

            $rows = $ids->map(fn($eleicaoId) => [
                'cliente_id'  => $cliente->id,
                'eleicao_id'  => $eleicaoId,
                'created_at'  => now(),
                'updated_at'  => now(),
            ])->all();

            if (!empty($rows)) {
                DB::table('cliente_eleicoes')->insert($rows);
            }
        });

        return back();
    }
}
