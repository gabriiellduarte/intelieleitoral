<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CandidatosController extends Controller
{
    // GET /api/candidates?eleicao_id=&cargo_id=&partido_id=&search=&per_page=&page=
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 25), 100);

        $q = DB::table('candidaturas as ct')
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
                'ct.sq_candidato',
                'ct.numero',
                'ct.situacao',
                'p.id as pessoa_id',
                'ct.nome_urna as nome',
                'pt.sigla as partido_sigla',
                'pt.nome as partido_nome',
                'pt.numero as partido_numero',
                'ca.descricao as cargo_descricao',
                'e.id as eleicao_id',
                'e.ano as eleicao_ano',
                'e.descricao as eleicao_descricao',
                DB::raw('COALESCE(tv.total, 0) as total_votos')
            )
            ->orderByDesc('total_votos');

        if ($request->filled('eleicao_id')) $q->where('ct.eleicao_id', $request->eleicao_id);
        if ($request->filled('cargo_id'))   $q->where('ct.cargo_id',   $request->cargo_id);
        if ($request->filled('partido_id')) $q->where('ct.partido_id', $request->partido_id);
        if ($request->filled('numero'))     $q->where('ct.numero',     $request->numero);
        if ($request->filled('search'))     $q->where('p.nome', 'like', '%' . $request->search . '%');

        return response()->json($q->paginate($perPage));
    }

    // GET /api/candidates/{id}
    public function show(int $id)
    {
        $candidatura = DB::table('candidaturas as ct')
            ->join('pessoas as p',   'ct.pessoa_id',  '=', 'p.id')
            ->join('partidos as pt', 'ct.partido_id', '=', 'pt.id')
            ->join('cargos as ca',   'ct.cargo_id',   '=', 'ca.id')
            ->join('eleicoes as e',  'ct.eleicao_id', '=', 'e.id')
            ->select(
                'ct.id', 'ct.sq_candidato', 'ct.numero', 'ct.situacao',
                'p.id as pessoa_id', 'p.nome',
                'pt.sigla as partido_sigla', 'pt.nome as partido_nome', 'pt.numero as partido_numero',
                'ca.descricao as cargo_descricao',
                'e.id as eleicao_id', 'e.ano as eleicao_ano', 'e.descricao as eleicao_descricao'
            )
            ->where('ct.id', $id)
            ->first();

        if (!$candidatura) {
            return response()->json(['error' => 'Candidatura não encontrada'], 404);
        }

        $perfil = DB::table('perfil_pessoa')
            ->where('pessoa_id', $candidatura->pessoa_id)
            ->first();

        $redes = DB::table('redes_sociais_pessoa')
            ->where('pessoa_id', $candidatura->pessoa_id)
            ->orderBy('plataforma')
            ->get();

        $votosMunicipio = DB::table('votos_municipio as vm')
            ->join('municipios as m', 'vm.municipio_id', '=', 'm.id')
            ->select('vm.*', 'm.nome as municipio_nome', 'm.latitude', 'm.longitude')
            ->where('vm.candidatura_id', $id)
            ->orderByDesc('vm.total_votos')
            ->get();

        $votosZona = DB::table('votos_zona as vz')
            ->join('zonas_eleitorais as ze', 'vz.zona_id', '=', 'ze.id')
            ->join('municipios as m', 'ze.municipio_id', '=', 'm.id')
            ->select('vz.*', 'ze.numero as zona_numero', 'm.nome as municipio_nome')
            ->where('vz.candidatura_id', $id)
            ->orderByDesc('vz.total_votos')
            ->get();

        $mapaZona = DB::table('votos_secao as vs')
            ->join('zonas_eleitorais as ze', 'vs.zona_id', '=', 'ze.id')
            ->join('municipios as m', 'vs.municipio_id', '=', 'm.id')
            ->leftJoin('locais_votacao as lv', 'vs.local_votacao_id', '=', 'lv.id')
            ->select(
                'ze.id',
                'ze.numero as zona_numero',
                'm.nome as municipio_nome',
                DB::raw('CONCAT("Zona ", ze.numero, " - ", m.nome) as nome'),
                DB::raw('COALESCE(AVG(lv.latitude), m.latitude) as latitude'),
                DB::raw('COALESCE(AVG(lv.longitude), m.longitude) as longitude'),
                DB::raw('SUM(vs.quantidade_votos) as total_votos'),
                DB::raw('SUM(vs.aptos) as total_aptos')
            )
            ->where('vs.candidatura_id', $id)
            ->where('vs.quantidade_votos', '>', 0)
            ->groupBy('ze.id', 'ze.numero', 'm.nome', 'm.latitude', 'm.longitude')
            ->orderByDesc('total_votos')
            ->get();

        $mapaLocal = DB::table('votos_secao as vs')
            ->join('municipios as m', 'vs.municipio_id', '=', 'm.id')
            ->leftJoin('locais_votacao as lv', 'vs.local_votacao_id', '=', 'lv.id')
            ->select(
                'lv.id',
                'lv.numero',
                DB::raw('COALESCE(lv.nome, CONCAT("Local ", lv.numero)) as nome'),
                'm.nome as municipio_nome',
                'lv.latitude',
                'lv.longitude',
                DB::raw('SUM(vs.quantidade_votos) as total_votos'),
                DB::raw('SUM(vs.aptos) as total_aptos')
            )
            ->where('vs.candidatura_id', $id)
            ->where('vs.quantidade_votos', '>', 0)
            ->whereNotNull('vs.local_votacao_id')
            ->groupBy('lv.id', 'lv.numero', 'lv.nome', 'm.nome', 'lv.latitude', 'lv.longitude')
            ->orderByDesc('total_votos')
            ->get();

        $total = DB::table('votos_municipio')
            ->selectRaw('
                SUM(total_votos)         as total_votos,
                SUM(total_aptos)         as total_aptos,
                SUM(total_comparecimento) as total_comparecimento,
                SUM(total_abstencoes)    as total_abstencoes,
                SUM(total_secoes)        as total_secoes
            ')
            ->where('candidatura_id', $id)
            ->first();
        $votosSecaoResumo = DB::table('votos_secao')
            ->selectRaw('
                SUM(quantidade_votos) as total_votos,
                COUNT(DISTINCT CONCAT(municipio_id, "-", zona_id, "-", secao_numero, "-", nr_turno)) as total_secoes
            ')
            ->where('candidatura_id', $id)
            ->where('quantidade_votos', '>', 0)
            ->first();    

        $votosSecao = DB::table('votos_secao as vs')
            ->join('zonas_eleitorais as ze', 'vs.zona_id', '=', 'ze.id')
            ->join('municipios as m', 'vs.municipio_id', '=', 'm.id')
            ->leftJoin('locais_votacao as lv', 'vs.local_votacao_id', '=', 'lv.id')
            ->select(
                'vs.id',
                'vs.secao_numero',
                'vs.nr_turno',
                'vs.quantidade_votos',
                'vs.aptos',
                'vs.comparecimento',
                'vs.abstencoes',
                'ze.numero as zona_numero',
                'm.nome as municipio_nome',
                'lv.numero as local_numero',
                'lv.nome as local_nome',
                'lv.endereco as local_endereco'
            )
            ->where('vs.candidatura_id', $id)
            ->where('vs.quantidade_votos', '>', 0)
            ->orderByDesc('vs.quantidade_votos')
            ->orderBy('m.nome')
            ->orderBy('ze.numero')
            ->orderBy('vs.secao_numero')
            ->limit(1000)
            ->get();

        $historico = DB::table('candidaturas as ct2')
            ->join('eleicoes as e',  'ct2.eleicao_id', '=', 'e.id')
            ->join('partidos as pt', 'ct2.partido_id', '=', 'pt.id')
            ->join('cargos as ca',   'ct2.cargo_id',   '=', 'ca.id')
            ->leftJoin('votos_municipio as vm', 'vm.candidatura_id', '=', 'ct2.id')
            ->select(
                'ct2.id as candidatura_id', 'ct2.numero', 'ct2.situacao',
                'e.ano as eleicao_ano', 'e.descricao as eleicao_descricao',
                'pt.sigla as partido_sigla', 'ca.descricao as cargo_descricao',
                DB::raw('COALESCE(SUM(vm.total_votos), 0) as total_votos')
            )
            ->where('ct2.pessoa_id', $candidatura->pessoa_id)
            ->groupBy(
                'ct2.id', 'ct2.numero', 'ct2.situacao',
                'e.ano', 'e.descricao',
                'pt.sigla', 'ca.descricao'
            )
            ->orderByDesc('e.ano')
            ->get();

        // Compatibilidade: a página usa `candidato` como chave
        return response()->json([
            'candidato'    => $candidatura,
            'candidatura'  => $candidatura,
            'perfil'       => $perfil,
            'redes_sociais' => $redes,
            'total'         => $total,
            'secoes'        => $votosSecaoResumo,
            'votosSecao'    => $votosSecao,
            'votosMunicipio' => $votosMunicipio,
            'votosZona'    => $votosZona,
            'mapaZona'     => $mapaZona,
            'mapaLocal'    => $mapaLocal,
            'historico'    => $historico,
            'evolucao'     => $historico->map(fn($h) => [
                'ano'         => $h->eleicao_ano,
                'cargo'       => $h->cargo_descricao,
                'total_votos' => $h->total_votos,
            ]),
        ]);
    }
}
