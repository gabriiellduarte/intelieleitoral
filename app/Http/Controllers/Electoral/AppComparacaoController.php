<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AppComparacaoController extends Controller
{
    /**
     * Renderiza a página de comparação entre dois candidatos
     */
    public function index(Request $request, int $eleicao)
    {
        $idA = $request->input('candidato_a');
        $idB = $request->input('candidato_b');

        // Buscar candidatos disponíveis para seleção (filtrados pela eleição)
        $candidatos = DB::table('candidaturas as ct')
            ->join('pessoas as p',   'ct.pessoa_id',  '=', 'p.id')
            ->join('partidos as pt', 'ct.partido_id', '=', 'pt.id')
            ->join('cargos as ca',   'ct.cargo_id',   '=', 'ca.id')
            ->join('eleicoes as e',  'ct.eleicao_id', '=', 'e.id')
            ->leftJoinSub(
                DB::table('votos_municipio')
                    ->select('candidatura_id', DB::raw('SUM(total_votos) as total'))
                    ->groupBy('candidatura_id'),
                'tv',
                'tv.candidatura_id', '=', 'ct.id'
            )
            ->select(
                'ct.id',
                'p.nome',
                'pt.sigla as partido_sigla',
                'ca.descricao as cargo',
                DB::raw('COALESCE(tv.total, 0) as total_votos')
            )
            ->where('ct.eleicao_id', $eleicao)
            ->orderByDesc('total_votos')
            ->get();

        $candidatoA = null;
        $candidatoB = null;
        $comparacao = [];
        $totalA = 0;
        $totalB = 0;

        // Se ambos os IDs forem fornecidos, fazer a comparação
        if ($idA && $idB) {
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

            $candidatoA = $getCandidatura($idA);
            $candidatoB = $getCandidatura($idB);

            if ($candidatoA && $candidatoB) {
                // Votos por município para ambos
                $votosA = DB::table('votos_municipio as vm')
                    ->join('municipios as m', 'vm.municipio_id', '=', 'm.id')
                    ->select(
                        'vm.municipio_id', 'm.nome as municipio_nome',
                        'm.latitude', 'm.longitude',
                        'vm.total_votos', 'vm.total_aptos', 'vm.total_comparecimento'
                    )
                    ->where('vm.candidatura_id', $idA)
                    ->orderBy('m.nome')
                    ->get();

                $votosB = DB::table('votos_municipio as vm')
                    ->join('municipios as m', 'vm.municipio_id', '=', 'm.id')
                    ->select(
                        'vm.municipio_id', 'm.nome as municipio_nome',
                        'm.latitude', 'm.longitude',
                        'vm.total_votos', 'vm.total_aptos', 'vm.total_comparecimento'
                    )
                    ->where('vm.candidatura_id', $idB)
                    ->orderBy('m.nome')
                    ->get();

                // Mapear votos por município
                $munMap = [];
                foreach ($votosA as $v) {
                    $munMap[$v->municipio_id] = [
                        'municipio_id'   => $v->municipio_id,
                        'municipio_nome' => $v->municipio_nome,
                        'latitude'       => $v->latitude,
                        'longitude'      => $v->longitude,
                        'votos_a'        => $v->total_votos,
                        'votos_b'        => 0,
                        'aptos'          => $v->total_aptos,
                    ];
                }

                foreach ($votosB as $v) {
                    if (isset($munMap[$v->municipio_id])) {
                        $munMap[$v->municipio_id]['votos_b'] = $v->total_votos;
                    } else {
                        $munMap[$v->municipio_id] = [
                            'municipio_id'   => $v->municipio_id,
                            'municipio_nome' => $v->municipio_nome,
                            'latitude'       => $v->latitude,
                            'longitude'      => $v->longitude,
                            'votos_a'        => 0,
                            'votos_b'        => $v->total_votos,
                            'aptos'          => $v->total_aptos,
                        ];
                    }
                }

                // Calcular estatísticas por município
                $comparacao = array_map(function ($m) {
                    $total = $m['votos_a'] + $m['votos_b'];
                    return [
                        ...$m,
                        'diferenca'    => $m['votos_a'] - $m['votos_b'],
                        'vencedor'     => $m['votos_a'] > $m['votos_b'] ? 'A' : ($m['votos_b'] > $m['votos_a'] ? 'B' : 'EMPATE'),
                        'percentual_a' => $total > 0 ? round(($m['votos_a'] / $total) * 100, 1) : 0,
                        'percentual_b' => $total > 0 ? round(($m['votos_b'] / $total) * 100, 1) : 0,
                    ];
                }, $munMap);

                // Totais gerais
                $totalA = $votosA->sum('total_votos');
                $totalB = $votosB->sum('total_votos');
            }
        }

        return Inertia::render('app/comparacao', [
            'candidatos'  => $candidatos,
            'candidatoA'  => $candidatoA,
            'candidatoB'  => $candidatoB,
            'comparacao'  => array_values($comparacao),
            'totalA'      => $totalA,
            'totalB'      => $totalB,
        ]);
    }
}
