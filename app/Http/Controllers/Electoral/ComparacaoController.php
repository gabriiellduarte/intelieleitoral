<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComparacaoController extends Controller
{
    // GET /api/comparison?candidato_a=&candidato_b=
    public function index(Request $request)
    {
        $idA = $request->candidato_a;
        $idB = $request->candidato_b;

        if (!$idA || !$idB) {
            return response()->json(['error' => 'candidato_a e candidato_b são obrigatórios'], 400);
        }

        $getCandidatura = fn($id) => DB::table('candidaturas as ct')
            ->join('pessoas as p',   'ct.pessoa_id',  '=', 'p.id')
            ->join('partidos as pt', 'ct.partido_id', '=', 'pt.id')
            ->join('cargos as ca',   'ct.cargo_id',   '=', 'ca.id')
            ->join('eleicoes as e',  'ct.eleicao_id', '=', 'e.id')
            ->select(
                'ct.id', 'ct.numero', 'ct.situacao', 'p.nome',
                'pt.sigla as partido_sigla', 'pt.nome as partido_nome',
                'ca.descricao as cargo_descricao', 'e.ano as eleicao_ano'
            )
            ->where('ct.id', $id)
            ->first();

        $candA = $getCandidatura($idA);
        $candB = $getCandidatura($idB);

        if (!$candA || !$candB) {
            return response()->json(['error' => 'Candidatura não encontrada'], 404);
        }

        $getVotos = fn($id) => DB::table('votos_municipio as vm')
            ->join('municipios as m', 'vm.municipio_id', '=', 'm.id')
            ->select(
                'vm.municipio_id', 'm.nome as municipio_nome',
                'm.latitude', 'm.longitude',
                'vm.total_votos', 'vm.total_aptos', 'vm.total_comparecimento'
            )
            ->where('vm.candidatura_id', $id)
            ->orderBy('m.nome')
            ->get()
            ->keyBy('municipio_id');

        $votosA = $getVotos($idA);
        $votosB = $getVotos($idB);

        // Mescla municípios dos dois candidatos
        $municipioIds = $votosA->keys()->merge($votosB->keys())->unique();

        $comparison = $municipioIds->map(function ($munId) use ($votosA, $votosB) {
            $a = $votosA->get($munId);
            $b = $votosB->get($munId);

            $vA = $a ? $a->total_votos : 0;
            $vB = $b ? $b->total_votos : 0;
            $soma = $vA + $vB;

            return [
                'municipio_id'   => $munId,
                'municipio_nome' => ($a ?? $b)->municipio_nome,
                'latitude'       => ($a ?? $b)->latitude,
                'longitude'      => ($a ?? $b)->longitude,
                'votos_a'        => $vA,
                'votos_b'        => $vB,
                'aptos'          => ($a ?? $b)->total_aptos ?? 0,
                'diferenca'      => $vA - $vB,
                'vencedor'       => $vA > $vB ? 'A' : ($vB > $vA ? 'B' : 'EMPATE'),
                'percentual_a'   => $soma > 0 ? round($vA / $soma * 100, 1) : 0,
                'percentual_b'   => $soma > 0 ? round($vB / $soma * 100, 1) : 0,
            ];
        })->sortByDesc(fn($c) => abs($c['diferenca']))->values();

        $totalA = $votosA->sum('total_votos');
        $totalB = $votosB->sum('total_votos');

        return response()->json([
            'candidatoA'   => $candA,
            'candidatoB'   => $candB,
            'totalA'       => $totalA,
            'totalB'       => $totalB,
            'diferenca'    => $totalA - $totalB,
            'comparison'   => $comparison,
            'municipiosA'  => $comparison->where('vencedor', 'A')->count(),
            'municipiosB'  => $comparison->where('vencedor', 'B')->count(),
        ]);
    }

    // GET /api/comparison/estrategia/{id}
    public function estrategia(int $id)
    {
        $candidatura = DB::table('candidaturas as ct')
            ->join('pessoas as p',   'ct.pessoa_id',  '=', 'p.id')
            ->join('partidos as pt', 'ct.partido_id', '=', 'pt.id')
            ->join('cargos as ca',   'ct.cargo_id',   '=', 'ca.id')
            ->join('eleicoes as e',  'ct.eleicao_id', '=', 'e.id')
            ->select(
                'ct.id', 'ct.numero', 'ct.eleicao_id', 'ct.cargo_id',
                'p.nome', 'pt.sigla as partido_sigla',
                'ca.descricao as cargo_descricao', 'e.ano'
            )
            ->where('ct.id', $id)
            ->first();

        if (!$candidatura) {
            return response()->json(['error' => 'Candidatura não encontrada'], 404);
        }

        // Total de votos por município para o mesmo cargo/eleição
        $totalPorMunicipio = DB::table('votos_municipio as vm')
            ->join('municipios as m', 'vm.municipio_id', '=', 'm.id')
            ->select(
                'm.id as municipio_id', 'm.nome', 'm.latitude', 'm.longitude',
                DB::raw('SUM(vm.total_votos) as total_geral'),
                DB::raw('SUM(vm.total_aptos) as total_aptos')
            )
            ->where('vm.eleicao_id', $candidatura->eleicao_id)
            ->where('vm.cargo_id',   $candidatura->cargo_id)
            ->groupBy('m.id')
            ->get()
            ->keyBy('municipio_id');

        // Votos da candidatura por município
        $votosCand = DB::table('votos_municipio')
            ->select('municipio_id', 'total_votos')
            ->where('candidatura_id', $id)
            ->get()
            ->keyBy('municipio_id');

        // Monta análise
        $analise = $totalPorMunicipio->map(function ($m) use ($votosCand) {
            $votos = $votosCand->get($m->municipio_id)?->total_votos ?? 0;
            $pct   = $m->total_geral > 0 ? round($votos / $m->total_geral * 100, 2) : 0;

            return [
                'municipio_id'    => $m->municipio_id,
                'nome'            => $m->nome,
                'latitude'        => $m->latitude,
                'longitude'       => $m->longitude,
                'votos_candidato' => $votos,
                'votos_total'     => $m->total_geral,
                'aptos'           => $m->total_aptos,
                'percentual'      => $pct,
            ];
        })->sortByDesc('percentual')->values();

        $media = $analise->count() > 0
            ? round($analise->sum('percentual') / $analise->count(), 2)
            : 0;

        $redutos      = $analise->filter(fn($a) => $a['percentual'] >  $media * 1.5)->values();
        $competitivos = $analise->filter(fn($a) => $a['percentual'] >= $media * 0.7 && $a['percentual'] <= $media * 1.5)->values();
        $baixaVotacao = $analise->filter(fn($a) => $a['percentual'] <  $media * 0.7)->values();
        $crescimento  = $analise->filter(fn($a) => $a['percentual'] <  $media && $a['aptos'] > 1000)
                                ->sortByDesc('aptos')->values();

        return response()->json([
            'candidatura'    => $candidatura,
            'analise'        => $analise,
            'mediaPercentual'=> $media,
            'redutos'        => $redutos,
            'competitivos'   => $competitivos,
            'baixaVotacao'   => $baixaVotacao,
            'crescimento'    => $crescimento,
        ]);
    }
}
