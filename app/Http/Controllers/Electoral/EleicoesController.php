<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EleicoesController extends Controller
{
    // GET /api/elections
    public function index()
    {
        $rows = DB::table('eleicoes')->orderByDesc('ano')->get();
        return response()->json($rows);
    }

    // GET /api/elections/cargos
    public function cargos()
    {
        $rows = DB::table('cargos')->orderBy('descricao')->get();
        return response()->json($rows);
    }

    // GET /api/elections/partidos
    public function partidos()
    {
        $rows = DB::table('partidos')->orderBy('sigla')->get();
        return response()->json($rows);
    }

    // GET /api/elections/municipios
    public function municipios()
    {
        $rows = DB::table('municipios')->orderBy('nome')->get();
        return response()->json($rows);
    }

    // GET /api/elections/zonas?municipio_id=
    public function zonas(Request $request)
    {
        $q = DB::table('zonas_eleitorais as z')
            ->join('municipios as m', 'z.municipio_id', '=', 'm.id')
            ->select('z.*', 'm.nome as municipio_nome')
            ->orderBy('z.numero');

        if ($request->filled('municipio_id')) {
            $q->where('z.municipio_id', $request->municipio_id);
        }

        return response()->json($q->get());
    }

    // GET /api/elections/locais?municipio_id=&zona_id=
    public function locais(Request $request)
    {
        $q = DB::table('locais_votacao as l')
            ->join('municipios as m', 'l.municipio_id', '=', 'm.id')
            ->select('l.*', 'm.nome as municipio_nome')
            ->orderBy('l.numero');

        if ($request->filled('municipio_id')) {
            $q->where('l.municipio_id', $request->municipio_id);
        }
        if ($request->filled('zona_id')) {
            $q->where('l.zona_id', $request->zona_id);
        }

        return response()->json($q->get());
    }
}
