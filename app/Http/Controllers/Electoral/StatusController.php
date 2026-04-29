<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class StatusController extends Controller
{
    public function index()
    {
        $eleicoes     = DB::table('eleicoes')->count();
        $pessoas      = DB::table('pessoas')->count();
        $candidaturas = DB::table('candidaturas')->count();
        $votos        = DB::table('votos_municipio')->sum('total_votos');
        $municipios   = DB::table('municipios')->count();

        return response()->json([
            'eleicoes'     => $eleicoes,
            'pessoas'      => $pessoas,
            'candidaturas' => $candidaturas,
            'candidatos'   => $candidaturas, // alias para compatibilidade
            'votos'        => $votos,
            'municipios'   => $municipios,
            'hasData'      => $votos > 0,
        ]);
    }
}
