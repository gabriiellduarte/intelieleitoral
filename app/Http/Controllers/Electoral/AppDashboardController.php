<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use App\Models\Cargo;
use App\Models\VotosMunicipio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AppDashboardController extends Controller
{
    /**
     * Renderiza o dashboard principal com dados de votação
     */
    public function index(Request $request, int $eleicao)
    {
        $eleicaoId = $eleicao;

        $eleicoes      = DB::table('eleicoes')
            ->select('id', 'ano', 'descricao')
            ->orderByDesc('ano')
            ->orderBy('descricao')
            ->get();

        $cargos        = DB::table('votos_municipio as vm')
            ->join('cargos as c', 'vm.cargo_id', '=', 'c.id')
            ->where('vm.eleicao_id', $eleicaoId)
            ->select('c.id', 'c.descricao')
            ->distinct()
            ->orderBy('c.descricao')
            ->get();

        $partidos       = DB::table('votos_municipio as vm')
            ->join('candidaturas as ct', 'vm.candidatura_id', '=', 'ct.id')
            ->join('partidos as p', 'ct.partido_id', '=', 'p.id')
            ->where('vm.eleicao_id', $eleicaoId)
            ->select('p.id', 'p.sigla')
            ->distinct()
            ->orderBy('p.sigla')
            ->get();
            
        $municipio     = DB::table('votos_municipio as vm')
            ->join('municipios as m', 'vm.municipio_id', '=', 'm.id')
            ->where('vm.eleicao_id', $eleicaoId)
            ->select('m.id', 'm.nome')
            ->distinct()
            ->orderBy('m.nome')
            ->get();
            
        $candidatos = DB::table('votos_municipio as vm')
            ->join('candidaturas as ct', 'vm.candidatura_id', '=', 'ct.id')
            ->join('pessoas as p', 'ct.pessoa_id', '=', 'p.id')
            ->where('vm.eleicao_id', $eleicaoId)
            ->select('ct.id', 'p.nome')
            ->distinct()
            ->orderBy('p.nome')
            ->get();    

        $cargoId       = $request->input('cargo_id');
        $candidaturaId = $request->input('candidato_id');
        $municipioId   = $request->input('municipio_id');
        $partidoId     = $request->input('partido_id');

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

        // ── Votos por município (para o mapa) ────────────────────────────────
        $mapQ = DB::table('votos_municipio as vm')
            ->join('municipios as m',    'vm.municipio_id',   '=', 'm.id')
            ->join('candidaturas as ct', 'vm.candidatura_id', '=', 'ct.id')
            ->select(
                'm.id', 'm.nome', 'm.latitude', 'm.longitude',
                DB::raw('SUM(vm.total_votos) as total_votos'),
                DB::raw('SUM(vm.total_aptos) as total_aptos'),
                DB::raw('SUM(vm.total_comparecimento) as total_comparecimento'),
                DB::raw('SUM(vm.total_secoes) as total_secoes')
            )
            ->groupBy('m.id', 'm.nome', 'm.latitude', 'm.longitude')
            ->orderByDesc('total_votos');

        if ($eleicaoId)     $mapQ->where('vm.eleicao_id', $eleicaoId);
        if ($cargoId)       $mapQ->where('vm.cargo_id', $cargoId);
        if ($candidaturaId) $mapQ->where('vm.candidatura_id', $candidaturaId);
        if ($partidoId)     $mapQ->where('ct.partido_id', $partidoId);

        $votosPorMunicipio = $mapQ->get();

        // ── Top zonas eleitorais ──────────────────────────────────────────────
        $zonaQ = DB::table('votos_zona as vz')
            ->join('zonas_eleitorais as ze', 'vz.zona_id', '=', 'ze.id')
            ->join('municipios as m',        'ze.municipio_id', '=', 'm.id')
            ->join('candidaturas as ct',     'vz.candidatura_id', '=', 'ct.id')
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
        if ($partidoId)     $zonaQ->where('ct.partido_id', $partidoId);

        $topZonas = $zonaQ->get();

        // ── Resumo estatístico ────────────────────────────────────────────────
        $summaryQ = DB::table('votos_municipio as vm')
            ->join('candidaturas as ct', 'vm.candidatura_id', '=', 'ct.id')
            ->select(
                DB::raw('COUNT(DISTINCT vm.candidatura_id) as total_candidatos'),
                DB::raw('COUNT(DISTINCT vm.municipio_id) as total_municipios'),
                DB::raw('SUM(vm.total_votos) as total_votos'),
                DB::raw('SUM(vm.total_secoes) as total_secoes')
            );

        if ($eleicaoId)     $summaryQ->where('vm.eleicao_id', $eleicaoId);
        if ($cargoId)       $summaryQ->where('vm.cargo_id', $cargoId);
        if ($candidaturaId) $summaryQ->where('vm.candidatura_id', $candidaturaId);
        if ($municipioId)   $summaryQ->where('vm.municipio_id', $municipioId);
        if ($partidoId)     $summaryQ->where('ct.partido_id', $partidoId);

        $summary = $summaryQ->first();

        return Inertia::render('app/dashboard', [
            'topCandidatos'      => $topCandidatos,
            'votosPorMunicipio'  => $votosPorMunicipio,
            'topZonas'           => $topZonas,
            'summary'            => $summary,
            'filtropopulados'    => [
                'eleicoes'  => $eleicoes,
                'cargos'    => $cargos,
                'partidos'  => $partidos,
                'municipios'=> $municipio,
                'candidatos'=> $candidatos,
            ],
            'filtros'            => [
                'eleicaoId'      => $eleicaoId,
                'cargoId'        => $cargoId,
                'candidaturaId'  => $candidaturaId,
                'municipioId'    => $municipioId,
                'partidoId'      => $partidoId,
            ],
        ]);
    }
}
