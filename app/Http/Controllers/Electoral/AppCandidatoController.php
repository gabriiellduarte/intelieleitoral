<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AppCandidatoController extends Controller
{
    /**
     * Renderiza o perfil completo de um candidato
     */
    public function show(int $eleicao, int $candidatura)
    {
        $id = $candidatura;

        // ── Dados da candidatura ──────────────────────────────────────────────
        $candidatura = DB::table('candidaturas as ct')
            ->join('pessoas as p',   'ct.pessoa_id',  '=', 'p.id')
            ->join('partidos as pt', 'ct.partido_id', '=', 'pt.id')
            ->join('cargos as ca',   'ct.cargo_id',   '=', 'ca.id')
            ->join('eleicoes as e',  'ct.eleicao_id', '=', 'e.id')
            ->select(
                'ct.id',
                'ct.numero',
                'ct.situacao',
                'p.id as pessoa_id',
                'p.nome',
                'pt.sigla as partido_sigla',
                'pt.nome as partido_nome',
                'pt.numero as partido_numero',
                'ca.descricao as cargo_descricao',
                'e.id as eleicao_id',
                'e.ano as eleicao_ano',
                'e.descricao as eleicao_descricao'
            )
            ->where('ct.id', $id)
            ->first();

        if (!$candidatura) {
            return Inertia::render('app/candidato', [
                'erro' => 'Candidatura não encontrada',
            ]);
        }

        // ── Perfil da pessoa ──────────────────────────────────────────────────
        $perfil = DB::table('perfil_pessoa')
            ->where('pessoa_id', $candidatura->pessoa_id)
            ->first();

        // ── Redes sociais ─────────────────────────────────────────────────────
        $redesSociais = DB::table('redes_sociais_pessoa')
            ->where('pessoa_id', $candidatura->pessoa_id)
            ->orderBy('plataforma')
            ->get();

        // ── Votos por município ───────────────────────────────────────────────
        $votosMunicipio = DB::table('votos_municipio as vm')
            ->join('municipios as m', 'vm.municipio_id', '=', 'm.id')
            ->select(
                'vm.*',
                'm.nome as municipio_nome',
                'm.latitude',
                'm.longitude'
            )
            ->where('vm.candidatura_id', $id)
            ->orderByDesc('vm.total_votos')
            ->get();

        // ── Votos por zona eleitoral ──────────────────────────────────────────
        $votosZona = DB::table('votos_zona as vz')
            ->join('zonas_eleitorais as ze', 'vz.zona_id', '=', 'ze.id')
            ->join('municipios as m',        'ze.municipio_id', '=', 'm.id')
            ->select(
                'vz.*',
                'ze.numero as zona_numero',
                'm.nome as municipio_nome'
            )
            ->where('vz.candidatura_id', $id)
            ->orderByDesc('vz.total_votos')
            ->get();

        // ── Votos por seção ───────────────────────────────────────────────────
        $votosSecao = DB::table('votos_secao as vs')
            ->join('zonas_eleitorais as ze', 'vs.zona_id', '=', 'ze.id')
            ->join('municipios as m', 'vs.municipio_id', '=', 'm.id')
            ->leftJoin('locais_votacao as lv', 'vs.local_votacao_id', '=', 'lv.id')
            ->select(
                'vs.secao_numero',
                'vs.nr_turno',
                'ze.numero as zona_numero',
                'm.nome as municipio_nome',
                'vs.quantidade_votos',
                'vs.aptos',
                'vs.comparecimento',
                'vs.abstencoes',
                'lv.numero as local_numero',
                'lv.nome as local_nome',
                'lv.endereco as local_endereco'
            )
            ->where('vs.candidatura_id', $id)
            ->where('vs.quantidade_votos', '>', 0)
            ->orderByDesc('vs.quantidade_votos')
            ->limit(1000)
            ->get();

        // ── Calcular totais ───────────────────────────────────────────────────
        $totalVotos = $votosMunicipio->sum('total_votos');
        $totalMunicipios = $votosMunicipio->count();
        $totalZonas = $votosZona->count();

        return Inertia::render('app/candidato', [
            'id'              => $id,
            'candidatura'     => $candidatura,
            'perfil'          => $perfil,
            'redesSociais'    => $redesSociais,
            'votosMunicipio'  => $votosMunicipio,
            'votosZona'       => $votosZona,
            'votosSecao'      => $votosSecao,
            'totalVotos'      => $totalVotos,
            'totalMunicipios' => $totalMunicipios,
            'totalZonas'      => $totalZonas,
        ]);
    }
}
