<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AppMonitoramentoController extends Controller
{
    public function index(int $eleicao): Response
    {
        return Inertia::render('app/monitoramento', ['eleicao_id' => $eleicao]);
    }

    public function favoritos(Request $request): JsonResponse
    {
        return response()->json($this->consultarFavoritos((int) $request->user()->id));
    }

    public function store(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'candidatura_id' => ['required', 'integer', 'exists:candidaturas,id'],
        ]);

        DB::table('candidatos_favoritos')->updateOrInsert(
            [
                'user_id' => $request->user()->id,
                'candidatura_id' => $dados['candidatura_id'],
            ],
            [
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json($this->consultarFavoritos((int) $request->user()->id));
    }

    public function destroy(Request $request, int $candidaturaId): JsonResponse
    {
        DB::table('candidatos_favoritos')
            ->where('user_id', $request->user()->id)
            ->where('candidatura_id', $candidaturaId)
            ->delete();

        return response()->json($this->consultarFavoritos((int) $request->user()->id));
    }

    private function consultarFavoritos(int $userId)
    {
        $totais = DB::table('votos_municipio')
            ->select(
                'candidatura_id',
                DB::raw('SUM(total_votos) as total_votos'),
                DB::raw('SUM(total_secoes) as total_secoes'),
                DB::raw('COUNT(DISTINCT municipio_id) as total_municipios')
            )
            ->groupBy('candidatura_id');

        $zonas = DB::table('votos_zona')
            ->select(
                'candidatura_id',
                DB::raw('COUNT(DISTINCT zona_id) as total_zonas')
            )
            ->groupBy('candidatura_id');

        $secoes = DB::table('votos_secao')
            ->select(
                'candidatura_id',
                DB::raw('COUNT(DISTINCT CONCAT(municipio_id, "-", zona_id, "-", secao_numero, "-", nr_turno)) as secoes_detalhadas')
            )
            ->where('quantidade_votos', '>', 0)
            ->groupBy('candidatura_id');

        $melhoresMunicipios = DB::table('votos_municipio as vm')
            ->join('municipios as m', 'vm.municipio_id', '=', 'm.id')
            ->select(
                'vm.candidatura_id',
                'm.nome as municipio_nome',
                'vm.total_votos',
                DB::raw('ROW_NUMBER() OVER (PARTITION BY vm.candidatura_id ORDER BY vm.total_votos DESC, m.nome ASC) as posicao')
            );

        return DB::table('candidatos_favoritos as cf')
            ->join('candidaturas as ct', 'cf.candidatura_id', '=', 'ct.id')
            ->join('pessoas as p', 'ct.pessoa_id', '=', 'p.id')
            ->join('partidos as pt', 'ct.partido_id', '=', 'pt.id')
            ->join('cargos as ca', 'ct.cargo_id', '=', 'ca.id')
            ->join('eleicoes as e', 'ct.eleicao_id', '=', 'e.id')
            ->leftJoinSub($totais, 'totais', 'totais.candidatura_id', '=', 'ct.id')
            ->leftJoinSub($zonas, 'zonas', 'zonas.candidatura_id', '=', 'ct.id')
            ->leftJoinSub($secoes, 'secoes', 'secoes.candidatura_id', '=', 'ct.id')
            ->leftJoinSub($melhoresMunicipios, 'melhor_municipio', function ($join) {
                $join->on('melhor_municipio.candidatura_id', '=', 'ct.id')
                    ->where('melhor_municipio.posicao', '=', 1);
            })
            ->where('cf.user_id', $userId)
            ->select(
                'ct.id',
                'ct.sq_candidato',
                'ct.numero',
                'ct.situacao',
                'ct.nome_urna as nome',
                'pt.sigla as partido_sigla',
                'ca.descricao as cargo_descricao',
                'e.ano as eleicao_ano',
                'e.descricao as eleicao_descricao',
                'cf.created_at as monitorado_em',
                DB::raw('COALESCE(totais.total_votos, 0) as total_votos'),
                DB::raw('COALESCE(totais.total_secoes, secoes.secoes_detalhadas, 0) as total_secoes'),
                DB::raw('COALESCE(totais.total_municipios, 0) as total_municipios'),
                DB::raw('COALESCE(zonas.total_zonas, 0) as total_zonas'),
                'melhor_municipio.municipio_nome as melhor_municipio',
                DB::raw('COALESCE(melhor_municipio.total_votos, 0) as melhor_municipio_votos')
            )
            ->orderByDesc('total_votos')
            ->orderBy('p.nome')
            ->get();
    }
}
