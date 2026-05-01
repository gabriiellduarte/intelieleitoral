<?php

use App\Http\Controllers\GerenteController;
use App\Http\Controllers\PainelController;
use App\Http\Controllers\Electoral\AppDashboardController;
use App\Http\Controllers\Electoral\AppComparacaoController;
use App\Http\Controllers\Electoral\AppCandidatoController;
use App\Http\Controllers\Electoral\AppCandidatosController;
use App\Http\Controllers\Electoral\AppEstrategiaController;
use App\Http\Controllers\Electoral\AppImportarController;
use App\Http\Controllers\Electoral\AppLocaisVotacaoController;
use App\Http\Controllers\Electoral\AppMonitoramentoController;
use App\Http\Controllers\Electoral\AppMunicipiosController;
use App\Models\Plano;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

// Landing page
Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
        'planos'      => Plano::where('ativo', true)->get()->map(fn($p) => [
            'id'              => $p->id,
            'nome'            => $p->nome,
            'preco'           => $p->preco,
            'limite_usuarios' => $p->limite_usuarios,
            'recursos'        => $p->recursos ?? [],
        ]),
    ]);
})->name('home');

// Painel do Cliente
Route::middleware(['auth'])->group(function () {
    Route::get('/painel', [PainelController::class, 'index'])->name('painel');
    Route::post('/painel/assinatura/cancelar', [PainelController::class, 'cancelarAssinatura'])->name('painel.assinatura.cancelar');
    Route::post('/painel/usuarios', [PainelController::class, 'storeUsuario'])->name('painel.usuarios.store');
    Route::put('/painel/usuarios/{usuario}', [PainelController::class, 'updateUsuario'])->name('painel.usuarios.update');
    Route::delete('/painel/usuarios/{usuario}', [PainelController::class, 'destroyUsuario'])->name('painel.usuarios.destroy');
});

// Painel do Gerente SaaS
Route::middleware(['auth'])->group(function () {
    Route::get('/gerente', [GerenteController::class, 'index'])->name('gerente');
    Route::post('/gerente/clientes/{cliente}/toggle', [GerenteController::class, 'toggleCliente'])->name('gerente.clientes.toggle');
    Route::delete('/gerente/clientes/{cliente}', [GerenteController::class, 'destroyCliente'])->name('gerente.clientes.destroy');
    Route::put('/gerente/clientes/{cliente}/plano', [GerenteController::class, 'updatePlano'])->name('gerente.clientes.plano');
    Route::put('/gerente/clientes/{cliente}/eleicoes', [GerenteController::class, 'syncEleicoes'])->name('gerente.clientes.eleicoes');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('inicio', 'welcome')->name('dashboard');
});

// ─── App Eleitoral ────────────────────────────────────────────────────────────

// Seletor de eleição — ponto de entrada após login
Route::middleware(['auth'])->get('/app', function () {
    $user = auth()->user();

    $resolverClienteId = function () use ($user): ?int {
        if ($user->role === 'cliente') {
            return $user->id;
        }

        if ($user->role === 'sub_usuario') {
            return $user->cliente_principal_id;
        }

        // Compatibilidade temporária com legado em usuarios_cliente
        $subUsuarioLegado = DB::table('usuarios_cliente')
            ->where('email', $user->email)
            ->first();

        return $subUsuarioLegado?->cliente_id;
    };

    $clienteId = $resolverClienteId();

    // Eleições acessíveis ao usuário
    $temVinculos = $clienteId
        ? DB::table('cliente_eleicoes')->where('cliente_id', $clienteId)->exists()
        : false;

    if ($user->role === 'admin_saas') {
        $eleicoes = DB::table('eleicoes')
            ->select('id', 'ano', 'descricao')
            ->orderByDesc('ano')
            ->orderBy('descricao')
            ->get();
    } elseif ($user->role === 'sub_usuario') {
        $clienteAtivo = DB::table('users')
            ->where('id', $clienteId)
            ->where('ativo', true)
            ->exists();

        if (!$clienteAtivo) {
            abort(403, 'Cliente principal está inativo.');
        }

        $eleicoes = $temVinculos
            ? DB::table('eleicoes as e')
                ->join('cliente_eleicoes as ce', 'ce.eleicao_id', '=', 'e.id')
                ->where('ce.cliente_id', $clienteId)
                ->select('e.id', 'e.ano', 'e.descricao')
                ->orderByDesc('e.ano')
                ->orderBy('e.descricao')
                ->get()
            : collect();
    } elseif ($temVinculos) {
        $eleicoes = DB::table('eleicoes as e')
            ->join('cliente_eleicoes as ce', 'ce.eleicao_id', '=', 'e.id')
            ->where('ce.cliente_id', $clienteId)
            ->select('e.id', 'e.ano', 'e.descricao')
            ->orderByDesc('e.ano')
            ->orderBy('e.descricao')
            ->get();
    } else {
        // Cliente sem vínculo não pode visualizar eleições
        $eleicoes = collect();
    }

    // Auto-redireciona se só tiver uma eleição disponível
    if ($eleicoes->count() === 1) {
        return redirect()->route('app.dashboard', ['eleicao' => $eleicoes->first()->id]);
    }

    return Inertia::render('app/selecionar-eleicao', ['eleicoes' => $eleicoes]);
})->name('app.selecionar');

// Importação — apenas admin, sem contexto de eleição
Route::middleware(['auth'])->prefix('app')->group(function () {
    Route::get('/importar', [AppImportarController::class, 'index'])->name('app.importar');
});

// Rotas escopadas por eleição
Route::middleware(['auth', 'eleicao.acesso'])->prefix('app/{eleicao}')->group(function () {
    Route::get('/dashboard', [AppDashboardController::class, 'index'])->name('app.dashboard');

    Route::get('/candidatos', [AppCandidatosController::class, 'index'])->name('app.candidatos');
    Route::get('/candidato/{candidatura}', [AppCandidatoController::class, 'show'])
        ->where('candidatura', '[0-9]+')
        ->name('app.candidato');

    Route::get('/comparacao', [AppComparacaoController::class, 'index'])->name('app.comparacao');
    Route::get('/estrategia', [AppEstrategiaController::class, 'index'])->name('app.estrategia');

    Route::get('/monitoramento', [AppMonitoramentoController::class, 'index'])->name('app.monitoramento');
    Route::get('/monitoramento/favoritos', [AppMonitoramentoController::class, 'favoritos'])->name('app.monitoramento.favoritos');
    Route::post('/monitoramento/favoritos', [AppMonitoramentoController::class, 'store'])->name('app.monitoramento.favoritos.store');
    Route::delete('/monitoramento/favoritos/{candidaturaId}', [AppMonitoramentoController::class, 'destroy'])
        ->where('candidaturaId', '[0-9]+')
        ->name('app.monitoramento.favoritos.destroy');

    Route::get('/municipios', [AppMunicipiosController::class, 'index'])->name('app.municipios.index');
    Route::get('/municipios/{id}', [AppMunicipiosController::class, 'show'])->name('app.municipios.show');
    Route::post('/municipios', [AppMunicipiosController::class, 'store'])->name('app.municipios.store');
    Route::put('/municipios/{id}', [AppMunicipiosController::class, 'update'])->name('app.municipios.update');
    Route::delete('/municipios/{id}', [AppMunicipiosController::class, 'destroy'])->name('app.municipios.destroy');

    Route::get('/locais-votacao', [AppLocaisVotacaoController::class, 'index'])->name('app.locais-votacao.index');
    Route::post('/locais-votacao', [AppLocaisVotacaoController::class, 'store'])->name('app.locais-votacao.store');
    Route::put('/locais-votacao/{id}', [AppLocaisVotacaoController::class, 'update'])->name('app.locais-votacao.update');
    Route::delete('/locais-votacao/{id}', [AppLocaisVotacaoController::class, 'destroy'])->name('app.locais-votacao.destroy');
});

require __DIR__.'/settings.php';
