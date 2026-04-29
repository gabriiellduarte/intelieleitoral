<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AppMunicipiosController extends Controller
{
    public function index(Request $request): Response
    {
        $busca = trim((string) $request->input('search', ''));
        $uf = strtoupper(trim((string) $request->input('uf', '')));

        $porPagina = (int) $request->input('per_page', 15);
        $permitidos = [10, 15, 25, 50, 100];
        if (!in_array($porPagina, $permitidos, true)) {
            $porPagina = 15;
        }

        $consulta = DB::table('municipios')
            ->select('id', 'nome', 'uf', 'codigo_ibge', 'codigo_tse', 'latitude', 'longitude', 'created_at', 'updated_at')
            ->when($busca !== '', function ($query) use ($busca) {
                $query->where(function ($sub) use ($busca) {
                    $sub->where('nome', 'like', "%{$busca}%")
                        ->orWhere('codigo_tse', 'like', "%{$busca}%")
                        ->orWhere('codigo_ibge', 'like', "%{$busca}%");
                });
            })
            ->when($uf !== '', function ($query) use ($uf) {
                $query->where('uf', $uf);
            })
            ->orderBy('nome');

        $municipios = $consulta->paginate($porPagina)->withQueryString();

        $ufs = DB::table('municipios')
            ->whereNotNull('uf')
            ->where('uf', '!=', '')
            ->distinct()
            ->orderBy('uf')
            ->pluck('uf')
            ->values();

        return Inertia::render('app/municipios', [
            'municipios' => $municipios,
            'filtros' => [
                'search' => $busca,
                'uf' => $uf,
                'per_page' => (string) $porPagina,
            ],
            'ufs' => $ufs,
        ]);
    }

    public function show(int $id): Response
    {
        $municipio = DB::table('municipios')
            ->select('id', 'nome', 'uf', 'codigo_ibge', 'codigo_tse', 'latitude', 'longitude', 'created_at', 'updated_at')
            ->where('id', $id)
            ->first();

        if (!$municipio) {
            return Inertia::render('app/municipio', [
                'erro' => 'Município não encontrado.',
            ]);
        }

        $totalZonas = DB::table('zonas_eleitorais')
            ->where('municipio_id', $id)
            ->count();

        $totalSecoes = DB::table('secoes as s')
            ->join('zonas_eleitorais as z', 's.zona_id', '=', 'z.id')
            ->where('z.municipio_id', $id)
            ->count();

        $totalLocais = DB::table('locais_votacao')
            ->where('municipio_id', $id)
            ->count();

        $totalCandidatos = DB::table('votos_municipio')
            ->where('municipio_id', $id)
            ->distinct()
            ->count('candidatura_id');

        $secoes = DB::table('secoes as s')
            ->join('zonas_eleitorais as z', 's.zona_id', '=', 'z.id')
            ->leftJoin('locais_votacao as lv', 's.local_votacao_id', '=', 'lv.id')
            ->leftJoin('votos as v', 'v.secao_id', '=', 's.id')
            ->where('z.municipio_id', $id)
            ->groupBy('s.id', 's.numero', 'z.numero', 'lv.nome', 'lv.endereco')
            ->orderBy('z.numero')
            ->orderBy('s.numero')
            ->select(
                's.id',
                's.numero as secao_numero',
                'z.numero as zona_numero',
                'lv.nome as local_nome',
                'lv.endereco as local_endereco',
                DB::raw('COALESCE(SUM(v.votos), 0) as total_votos'),
                DB::raw('COUNT(DISTINCT v.candidatura_id) as total_candidaturas')
            )
            ->limit(1000)
            ->get();

        $candidatos = DB::table('votos_municipio as vm')
            ->join('candidaturas as c', 'vm.candidatura_id', '=', 'c.id')
            ->join('pessoas as p', 'c.pessoa_id', '=', 'p.id')
            ->join('partidos as pt', 'c.partido_id', '=', 'pt.id')
            ->join('cargos as ca', 'c.cargo_id', '=', 'ca.id')
            ->where('vm.municipio_id', $id)
            ->orderByDesc('vm.total_votos')
            ->select(
                'c.id as candidatura_id',
                'p.nome as nome',
                'c.nome_urna as nome_urna',
                'c.numero as numero',
                'pt.sigla as partido_sigla',
                'ca.descricao as cargo_descricao',
                'c.situacao',
                'vm.nr_turno',
                'vm.total_votos',
                'vm.total_secoes',
                'vm.total_aptos',
                'vm.total_comparecimento',
                'vm.total_abstencoes',
                'vm.ds_sit_tot_turno'
            )
            ->limit(500)
            ->get();

        return Inertia::render('app/municipio', [
            'municipio' => $municipio,
            'resumo' => [
                'total_zonas' => $totalZonas,
                'total_secoes' => $totalSecoes,
                'total_locais' => $totalLocais,
                'total_candidatos' => $totalCandidatos,
            ],
            'secoes' => $secoes,
            'candidatos' => $candidatos,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'uf' => ['nullable', 'string', 'size:2'],
            'codigo_ibge' => ['nullable', 'string', 'max:10', 'unique:municipios,codigo_ibge'],
            'codigo_tse' => ['nullable', 'string', 'max:10', 'unique:municipios,codigo_tse'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        DB::table('municipios')->insert([
            'nome' => trim((string) $dados['nome']),
            'uf' => isset($dados['uf']) && $dados['uf'] !== '' ? strtoupper((string) $dados['uf']) : null,
            'codigo_ibge' => $this->normalizarCampoOpcional($dados['codigo_ibge'] ?? null),
            'codigo_tse' => $this->normalizarCampoOpcional($dados['codigo_tse'] ?? null),
            'latitude' => $dados['latitude'] ?? null,
            'longitude' => $dados['longitude'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Município criado com sucesso.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $municipio = DB::table('municipios')->where('id', $id)->first();
        if (!$municipio) {
            return back()->withErrors(['municipio' => 'Município não encontrado.']);
        }

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'uf' => ['nullable', 'string', 'size:2'],
            'codigo_ibge' => [
                'nullable',
                'string',
                'max:10',
                Rule::unique('municipios', 'codigo_ibge')->ignore($id),
            ],
            'codigo_tse' => [
                'nullable',
                'string',
                'max:10',
                Rule::unique('municipios', 'codigo_tse')->ignore($id),
            ],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        DB::table('municipios')->where('id', $id)->update([
            'nome' => trim((string) $dados['nome']),
            'uf' => isset($dados['uf']) && $dados['uf'] !== '' ? strtoupper((string) $dados['uf']) : null,
            'codigo_ibge' => $this->normalizarCampoOpcional($dados['codigo_ibge'] ?? null),
            'codigo_tse' => $this->normalizarCampoOpcional($dados['codigo_tse'] ?? null),
            'latitude' => $dados['latitude'] ?? null,
            'longitude' => $dados['longitude'] ?? null,
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Município atualizado com sucesso.');
    }

    public function destroy(int $id): RedirectResponse
    {
        $municipio = DB::table('municipios')->where('id', $id)->first();
        if (!$municipio) {
            return back()->withErrors(['municipio' => 'Município não encontrado.']);
        }

        $possuiDependencias =
            DB::table('zonas_eleitorais')->where('municipio_id', $id)->exists() ||
            DB::table('locais_votacao')->where('municipio_id', $id)->exists() ||
            DB::table('votos')->where('municipio_id', $id)->exists() ||
            DB::table('votos_municipio')->where('municipio_id', $id)->exists();

        if ($possuiDependencias) {
            return back()->withErrors([
                'municipio' => 'Não é possível excluir este município porque ele possui registros vinculados.',
            ]);
        }

        DB::table('municipios')->where('id', $id)->delete();

        return back()->with('success', 'Município excluído com sucesso.');
    }

    private function normalizarCampoOpcional(?string $valor): ?string
    {
        if ($valor === null) {
            return null;
        }

        $texto = trim($valor);
        return $texto !== '' ? $texto : null;
    }
}
