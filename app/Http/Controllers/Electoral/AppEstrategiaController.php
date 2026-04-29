<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AppEstrategiaController extends Controller
{
    /**
     * Renderiza a página de análise estratégica
     * Exibe dados de votação e análises para auxiliar na estratégia eleitoral
     */
    public function index(Request $request, int $eleicao)
    {
        $eleicaoId   = $eleicao;
        $cargoId     = $request->input('cargo_id');
        $municipioId = $request->input('municipio_id');
        $partidoId   = $request->input('partido_id');

        // ── Candidatos por força política ─────────────────────────────────────
        $candidatosQ = DB::table('candidaturas as ct')
            ->join('pessoas as p',   'ct.pessoa_id',  '=', 'p.id')
            ->join('partidos as pt', 'ct.partido_id', '=', 'pt.id')
            ->join('cargos as ca',   'ct.cargo_id',   '=', 'ca.id')
            ->leftJoinSub(
                DB::table('votos_municipio')
                    ->select('candidatura_id', DB::raw('SUM(total_votos) as total'))
                    ->groupBy('candidatura_id'),
                'tv',
                'tv.candidatura_id', '=', 'ct.id'
            )
            ->select(
                'ct.id',
                'ct.numero',
                'p.nome',
                'pt.id as partido_id',
                'pt.sigla as partido_sigla',
                'ca.descricao as cargo',
                DB::raw('COALESCE(tv.total, 0) as total_votos')
            )
            ->orderByDesc('total_votos');

        if ($eleicaoId) $candidatosQ->where('ct.eleicao_id', $eleicaoId);
        if ($cargoId)   $candidatosQ->where('ct.cargo_id', $cargoId);
        if ($partidoId) $candidatosQ->where('ct.partido_id', $partidoId);

        $candidatos = $candidatosQ->get();

        // ── Desempenho por município ──────────────────────────────────────────
        $desempenhoQ = DB::table('votos_municipio as vm')
            ->join('municipios as m',    'vm.municipio_id',   '=', 'm.id')
            ->join('candidaturas as ct', 'vm.candidatura_id', '=', 'ct.id')
            ->join('partidos as pt',     'ct.partido_id',     '=', 'pt.id')
            ->select(
                'm.id as municipio_id',
                'm.nome as municipio_nome',
                'm.latitude',
                'm.longitude',
                'pt.sigla as partido_sigla',
                DB::raw('SUM(vm.total_votos) as votos_partido'),
                DB::raw('SUM(vm.total_aptos) as total_aptos'),
                DB::raw('COUNT(DISTINCT vm.candidatura_id) as total_candidatos')
            )
            ->groupBy('m.id', 'm.nome', 'm.latitude', 'm.longitude', 'pt.sigla')
            ->orderByDesc('votos_partido');

        if ($eleicaoId) $desempenhoQ->where('vm.eleicao_id', $eleicaoId);
        if ($cargoId)   $desempenhoQ->where('vm.cargo_id', $cargoId);
        if ($municipioId) $desempenhoQ->where('vm.municipio_id', $municipioId);
        if ($partidoId) $desempenhoQ->where('ct.partido_id', $partidoId);

        $desempenho = $desempenhoQ->get();

        // ── Distribuição por partido (gráfico pizza) ──────────────────────────
        $partidosQ = DB::table('votos_municipio as vm')
            ->join('candidaturas as ct', 'vm.candidatura_id', '=', 'ct.id')
            ->join('partidos as pt',     'ct.partido_id',     '=', 'pt.id')
            ->select(
                'pt.id',
                'pt.sigla',
                'pt.nome',
                DB::raw('SUM(vm.total_votos) as total_votos')
            )
            ->groupBy('pt.id', 'pt.sigla', 'pt.nome')
            ->orderByDesc('total_votos');

        if ($eleicaoId) $partidosQ->where('vm.eleicao_id', $eleicaoId);
        if ($cargoId)   $partidosQ->where('vm.cargo_id', $cargoId);
        if ($municipioId) $partidosQ->where('vm.municipio_id', $municipioId);

        $partidos = $partidosQ->get();

        // ── Taxas de comparecimento ───────────────────────────────────────────
        $comparecimentoQ = DB::table('votos_municipio as vm')
            ->join('municipios as m', 'vm.municipio_id', '=', 'm.id')
            ->select(
                'm.id as municipio_id',
                'm.nome as municipio_nome',
                DB::raw('SUM(vm.total_aptos) as total_aptos'),
                DB::raw('SUM(vm.total_comparecimento) as total_comparecimento'),
                DB::raw('SUM(vm.total_votos) as total_votos')
            )
            ->groupBy('m.id', 'm.nome')
            ->orderByDesc('total_votos');

        if ($eleicaoId) $comparecimentoQ->where('vm.eleicao_id', $eleicaoId);
        if ($cargoId)   $comparecimentoQ->where('vm.cargo_id', $cargoId);
        if ($municipioId) $comparecimentoQ->where('vm.municipio_id', $municipioId);

        $comparecimento = $comparecimentoQ->get();

        return Inertia::render('app/estrategia', [
            'candidatos'      => $candidatos,
            'desempenho'      => $desempenho,
            'partidos'        => $partidos,
            'comparecimento'  => $comparecimento,
            'filtros'         => [
                'eleicaoId'   => $eleicaoId,
                'cargoId'     => $cargoId,
                'municipioId' => $municipioId,
                'partidoId'   => $partidoId,
            ],
            'eleicao_id' => $eleicaoId,
        ]);
    }
}
