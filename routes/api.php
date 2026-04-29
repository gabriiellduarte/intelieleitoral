<?php

use App\Http\Controllers\Electoral\CandidatosController;
use App\Http\Controllers\Electoral\ComparacaoController;
use App\Http\Controllers\Electoral\EleicoesController;
use App\Http\Controllers\Electoral\AppGeocodingController;
use App\Http\Controllers\Electoral\ImportarController;
use App\Http\Controllers\Electoral\ImportarSecaoController;
use App\Http\Controllers\Electoral\StatusController;
use App\Http\Controllers\Electoral\VotosController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Electoral Intelligence – API Routes
|--------------------------------------------------------------------------
| Todas as rotas abaixo são automaticamente prefixadas com /api pelo
| bootstrap/app.php (chave `api:`).
| Middlewares: api (sem CSRF), sem autenticação obrigatória (frontend
| gerencia o token via Bearer interceptado no services/api.ts).
|--------------------------------------------------------------------------
*/

// Status geral do banco
Route::get('/status', [StatusController::class, 'index']);

// Eleições / lookup
Route::prefix('elections')->group(function () {
    Route::get('/',            [EleicoesController::class, 'index']);
    Route::get('/cargos',      [EleicoesController::class, 'cargos']);
    Route::get('/partidos',    [EleicoesController::class, 'partidos']);
    Route::get('/municipios',  [EleicoesController::class, 'municipios']);
    Route::get('/zonas',       [EleicoesController::class, 'zonas']);
    Route::get('/locais',      [EleicoesController::class, 'locais']);
});

// Candidatos
Route::prefix('candidates')->group(function () {
    Route::get('/',      [CandidatosController::class, 'index']);
    Route::get('/{id}',  [CandidatosController::class, 'show'])->where('id', '[0-9]+');
});

// Votos
Route::prefix('votes')->group(function () {
    Route::get('/dashboard',  [VotosController::class, 'dashboard']);
    Route::get('/map/locais', [VotosController::class, 'mapLocais']);
    Route::get('/secoes',     [VotosController::class, 'secoes']);
});

// Comparação e estratégia
Route::prefix('comparison')->group(function () {
    Route::get('/',                   [ComparacaoController::class, 'index']);
    Route::get('/estrategia/{id}',    [ComparacaoController::class, 'estrategia'])->where('id', '[0-9]+');
});

// Importação de arquivos CSV do TSE
Route::post('/import/v3', [ImportarController::class, 'storeV3']);
Route::post('/import/v4', [ImportarController::class, 'storeV4']);
Route::post('/import/secoes/v1', [ImportarSecaoController::class, 'storeV1']);
Route::get('/import/secoes/status/{id}', [ImportarSecaoController::class, 'status']);
Route::get('/import/secoes/erros/{id}', [ImportarSecaoController::class, 'erros']);
Route::get('/imports', [ImportarController::class, 'historico']);
Route::post('/imports/{id}/gerar', [ImportarController::class, 'processarV4'])->where('id', '[0-9]+');
Route::delete('/imports/{id}', [ImportarController::class, 'destroy'])->where('id', '[0-9]+');

// Geocodificação
Route::middleware('throttle:20,1')->post('/geocoding/coordenadas', [AppGeocodingController::class, 'obterCoordenadas']);
