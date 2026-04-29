<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VotosController extends Controller
{
    // GET /api/votes/dashboard
    public function dashboard(Request $request)
    {
        $eleicaoId     = $request->eleicao_id;
        $cargoId       = $request->cargo_id;
        // Frontend envia candidato_id; mantemos candidatura_id como fallback.
        $candidaturaId = $request->candidato_id ?? $request->candidatura_id;
        $municipioId   = $request->municipio_id;
        $partidoId     = $request->partido_id;

        // ── Top candidatos ────────────────────────────────────────────────────
        $topQ = DB::table('votos_municipio as vm')
            ->join('candidaturas as ct', 'vm.candidatura_id', '=', 'ct.id')
            ->join('pessoas as p',       'ct.pessoa_id',      '=', 'p.id')
            ->join('partidos as pt',     'ct.partido_id',     '=', 'pt.id')
            ->join('cargos as ca',       'vm.cargo_id',       '=', 'ca.id')
            ->select(
                'ct.id', 'ct.numero', 'p.nome',
                'pt.sigla as partido_sigla',
                'ca.descricao as cargo',
                DB::raw('SUM(vm.total_votos) as total_votos')
            )
            ->groupBy('ct.id', 'ct.numero', 'p.nome', 'pt.sigla', 'ca.descricao')
            ->orderByDesc('total_votos')
            ->limit(20);

        if ($eleicaoId)     $topQ->where('vm.eleicao_id', $eleicaoId);
        if ($cargoId)       $topQ->where('vm.cargo_id', $cargoId);
        if ($candidaturaId) $topQ->where('vm.candidatura_id', $candidaturaId);
        if ($municipioId)   $topQ->where('vm.municipio_id', $municipioId);
        if ($partidoId)     $topQ->where('ct.partido_id', $partidoId);

        $topCandidatos = $topQ->get();

        // ── Votos por município (mapa) ────────────────────────────────────────
        $mapQ = DB::table('votos_municipio as vm')
            ->join('municipios as m',    'vm.municipio_id',   '=', 'm.id')
            ->join('candidaturas as ct', 'vm.candidatura_id', '=', 'ct.id')
            ->select(
                'm.id', 'm.nome', 'm.latitude', 'm.longitude',
                DB::raw('SUM(vm.total_votos)          as total_votos'),
                DB::raw('SUM(vm.total_aptos)          as total_aptos'),
                DB::raw('SUM(vm.total_comparecimento) as total_comparecimento'),
                DB::raw('SUM(vm.total_secoes)         as total_secoes')
            )
            ->groupBy('m.id', 'm.nome', 'm.latitude', 'm.longitude')
            ->orderByDesc('total_votos');

        if ($eleicaoId)     $mapQ->where('vm.eleicao_id', $eleicaoId);
        if ($cargoId)       $mapQ->where('vm.cargo_id', $cargoId);
        if ($candidaturaId) $mapQ->where('vm.candidatura_id', $candidaturaId);
        if ($municipioId)   $mapQ->where('vm.municipio_id', $municipioId);
        if ($partidoId)     $mapQ->where('ct.partido_id', $partidoId);

        $votosPorMunicipio = $mapQ->get();

        // ── Top zonas ────────────────────────────────────────────────────────
        $zonaQ = DB::table('votos_zona as vz')
            ->join('zonas_eleitorais as ze', 'vz.zona_id',       '=', 'ze.id')
            ->join('municipios as m',        'ze.municipio_id',  '=', 'm.id')
            ->join('candidaturas as ct',     'vz.candidatura_id','=', 'ct.id')
            ->select(
                'ze.numero as zona_numero',
                'm.nome as municipio_nome',
                DB::raw('SUM(vz.total_votos) as total_votos')
            )
            ->groupBy('ze.id', 'ze.numero', 'm.nome')
            ->orderByDesc('total_votos')
            ->limit(15);

        if ($eleicaoId)     $zonaQ->where('vz.eleicao_id', $eleicaoId);
        if ($cargoId)       $zonaQ->where('vz.cargo_id', $cargoId);
        if ($candidaturaId) $zonaQ->where('vz.candidatura_id', $candidaturaId);
        if ($municipioId)   $zonaQ->where('ze.municipio_id', $municipioId);
        if ($partidoId)     $zonaQ->where('ct.partido_id', $partidoId);

        $topZonas = $zonaQ->get();

        // ── Resumo ────────────────────────────────────────────────────────────
        $sumQ = DB::table('votos_municipio as vm')
            ->join('candidaturas as ct', 'vm.candidatura_id', '=', 'ct.id')
            ->selectRaw('
                COUNT(DISTINCT vm.candidatura_id) as total_candidatos,
                COUNT(DISTINCT vm.municipio_id)   as total_municipios,
                SUM(vm.total_votos)               as total_votos,
                SUM(vm.total_secoes)              as total_secoes
            ');

        if ($eleicaoId)     $sumQ->where('vm.eleicao_id', $eleicaoId);
        if ($cargoId)       $sumQ->where('vm.cargo_id', $cargoId);
        if ($candidaturaId) $sumQ->where('vm.candidatura_id', $candidaturaId);
        if ($municipioId)   $sumQ->where('vm.municipio_id', $municipioId);
        if ($partidoId)     $sumQ->where('ct.partido_id', $partidoId);

        $summary = $sumQ->first();

        return response()->json(compact('topCandidatos', 'votosPorMunicipio', 'topZonas', 'summary'));
    }

    // GET /api/votes/map/locais
    public function mapLocais(Request $request)
    {
        $candidaturaId = $request->candidato_id ?? $request->candidatura_id;

        $q = DB::table('votos as v')
            ->join('secoes as s',          'v.secao_id',         '=', 's.id')
            ->join('locais_votacao as l',   's.local_votacao_id', '=', 'l.id')
            ->join('municipios as m',       'v.municipio_id',     '=', 'm.id')
            ->select(
                'l.id', 'l.numero', 'l.latitude', 'l.longitude',
                'm.nome as municipio_nome',
                DB::raw('SUM(v.votos) as total_votos'),
                DB::raw('SUM(v.aptos) as total_aptos')
            )
            ->groupBy('l.id')
            ->orderByDesc('total_votos');

        if ($request->filled('eleicao_id'))     $q->where('v.eleicao_id', $request->eleicao_id);
        if ($request->filled('cargo_id'))       $q->where('v.cargo_id', $request->cargo_id);
        if ($candidaturaId)                     $q->where('v.candidatura_id', $candidaturaId);
        if ($request->filled('municipio_id'))   $q->where('v.municipio_id', $request->municipio_id);

        return response()->json($q->get());
    }

    // GET /api/votes/secoes
    public function secoes(Request $request)
    {
        $candidaturaId = $request->candidato_id ?? $request->candidatura_id;

        $q = DB::table('votos as v')
            ->join('secoes as s',            'v.secao_id',      '=', 's.id')
            ->join('zonas_eleitorais as ze',  'v.zona_id',       '=', 'ze.id')
            ->join('municipios as m',         'v.municipio_id',  '=', 'm.id')
            ->join('candidaturas as ct',      'v.candidatura_id','=', 'ct.id')
            ->join('pessoas as p',            'ct.pessoa_id',    '=', 'p.id')
            ->join('partidos as pt',          'ct.partido_id',   '=', 'pt.id')
            ->select(
                's.numero as secao_numero',
                'ze.numero as zona_numero',
                'm.nome as municipio_nome',
                'v.votos', 'v.aptos', 'v.comparecimento', 'v.abstencoes',
                'p.nome as candidato_nome',
                'ct.numero as candidato_numero',
                'pt.sigla as partido_sigla'
            )
            ->orderByDesc('v.votos')
            ->limit(500);

        if ($request->filled('eleicao_id'))     $q->where('v.eleicao_id', $request->eleicao_id);
        if ($request->filled('cargo_id'))       $q->where('v.cargo_id', $request->cargo_id);
        if ($candidaturaId)                     $q->where('v.candidatura_id', $candidaturaId);
        if ($request->filled('municipio_id'))   $q->where('v.municipio_id', $request->municipio_id);
        if ($request->filled('zona_id'))        $q->where('v.zona_id', $request->zona_id);

        return response()->json($q->get());
    }
}
