<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AppLocaisVotacaoController extends Controller
{
    public function index(Request $request): Response
    {
        $busca = trim((string) $request->input('search', ''));
        $municipioId = $this->normalizarInteiro($request->input('municipio_id'));
        $zonaId = $this->normalizarInteiro($request->input('zona_id'));

        $porPagina = (int) $request->input('per_page', 15);
        $permitidos = [10, 15, 25, 50, 100];
        if (!in_array($porPagina, $permitidos, true)) {
            $porPagina = 15;
        }

        $consulta = DB::table('locais_votacao as lv')
            ->leftJoin('municipios as m', 'm.id', '=', 'lv.municipio_id')
            ->leftJoin('zonas_eleitorais as z', 'z.id', '=', 'lv.zona_id')
            ->select([
                'lv.id',
                'lv.municipio_id',
                'lv.zona_id',
                'lv.numero',
                'lv.nome',
                'lv.endereco',
                'lv.bairro',
                'lv.cep',
                'lv.latitude',
                'lv.longitude',
                'lv.created_at',
                'lv.updated_at',
                'm.nome as municipio_nome',
                'm.uf as municipio_uf',
                'z.numero as zona_numero',
            ])
            ->when($busca !== '', function ($query) use ($busca) {
                $query->where(function ($subconsulta) use ($busca) {
                    $subconsulta->where('lv.nome', 'like', "%{$busca}%")
                        ->orWhere('lv.numero', 'like', "%{$busca}%")
                        ->orWhere('lv.endereco', 'like', "%{$busca}%")
                        ->orWhere('m.nome', 'like', "%{$busca}%");
                });
            })
            ->when($municipioId !== null, function ($query) use ($municipioId) {
                $query->where('lv.municipio_id', $municipioId);
            })
            ->when($zonaId !== null, function ($query) use ($zonaId) {
                $query->where('lv.zona_id', $zonaId);
            })
            ->orderBy('m.nome')
            ->orderBy('lv.nome')
            ->orderBy('lv.numero');

        $locais = $consulta->paginate($porPagina)->withQueryString();

        $municipios = DB::table('municipios')
            ->select('id', 'nome', 'uf')
            ->orderBy('nome')
            ->get();

        $zonas = DB::table('zonas_eleitorais as z')
            ->join('municipios as m', 'm.id', '=', 'z.municipio_id')
            ->select('z.id', 'z.numero', 'z.municipio_id', 'm.nome as municipio_nome', 'm.uf as municipio_uf')
            ->orderBy('m.nome')
            ->orderBy('z.numero')
            ->get();

        return Inertia::render('app/locais-votacao', [
            'locais' => $locais,
            'filtros' => [
                'search' => $busca,
                'municipio_id' => $municipioId !== null ? (string) $municipioId : '',
                'zona_id' => $zonaId !== null ? (string) $zonaId : '',
                'per_page' => (string) $porPagina,
            ],
            'municipios' => $municipios,
            'zonas' => $zonas,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $this->validarDados($request);
        $this->validarRelacionamentoZonaMunicipio($dados['municipio_id'], $dados['zona_id']);

        DB::table('locais_votacao')->insert([
            'municipio_id' => $dados['municipio_id'],
            'zona_id' => $dados['zona_id'],
            'numero' => $this->normalizarCampoOpcional($dados['numero'] ?? null),
            'nome' => $this->normalizarCampoOpcional($dados['nome'] ?? null),
            'endereco' => $this->normalizarCampoOpcional($dados['endereco'] ?? null),
            'bairro' => $this->normalizarCampoOpcional($dados['bairro'] ?? null),
            'cep' => $this->normalizarCampoOpcional($dados['cep'] ?? null),
            'latitude' => $dados['latitude'] ?? null,
            'longitude' => $dados['longitude'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Local de votação criado com sucesso.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $local = DB::table('locais_votacao')->where('id', $id)->first();
        if (!$local) {
            return back()->withErrors(['local' => 'Local de votação não encontrado.']);
        }

        $dados = $this->validarDados($request);
        $this->validarRelacionamentoZonaMunicipio($dados['municipio_id'], $dados['zona_id']);

        DB::table('locais_votacao')->where('id', $id)->update([
            'municipio_id' => $dados['municipio_id'],
            'zona_id' => $dados['zona_id'],
            'numero' => $this->normalizarCampoOpcional($dados['numero'] ?? null),
            'nome' => $this->normalizarCampoOpcional($dados['nome'] ?? null),
            'endereco' => $this->normalizarCampoOpcional($dados['endereco'] ?? null),
            'bairro' => $this->normalizarCampoOpcional($dados['bairro'] ?? null),
            'cep' => $this->normalizarCampoOpcional($dados['cep'] ?? null),
            'latitude' => $dados['latitude'] ?? null,
            'longitude' => $dados['longitude'] ?? null,
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Local de votação atualizado com sucesso.');
    }

    public function destroy(int $id): RedirectResponse
    {
        $local = DB::table('locais_votacao')->where('id', $id)->first();
        if (!$local) {
            return back()->withErrors(['local' => 'Local de votação não encontrado.']);
        }

        $possuiDependencias =
            DB::table('secoes')->where('local_votacao_id', $id)->exists() ||
            DB::table('votos_secao')->where('local_votacao_id', $id)->exists();

        if ($possuiDependencias) {
            return back()->withErrors([
                'local' => 'Não é possível excluir este local porque ele possui registros vinculados.',
            ]);
        }

        DB::table('locais_votacao')->where('id', $id)->delete();

        return back()->with('success', 'Local de votação excluído com sucesso.');
    }

    private function validarDados(Request $request): array
    {
        return $request->validate([
            'municipio_id' => ['required', 'integer', 'exists:municipios,id'],
            'zona_id' => ['nullable', 'integer', 'exists:zonas_eleitorais,id'],
            'numero' => ['nullable', 'string', 'max:10'],
            'nome' => ['nullable', 'string', 'max:255'],
            'endereco' => ['nullable', 'string', 'max:255'],
            'bairro' => ['nullable', 'string', 'max:255'],
            'cep' => ['nullable', 'string', 'max:10'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);
    }

    private function validarRelacionamentoZonaMunicipio(int $municipioId, ?int $zonaId): void
    {
        if ($zonaId === null) {
            return;
        }

        $zonaPertenceAoMunicipio = DB::table('zonas_eleitorais')
            ->where('id', $zonaId)
            ->where('municipio_id', $municipioId)
            ->exists();

        if (!$zonaPertenceAoMunicipio) {
            throw ValidationException::withMessages([
                'zona_id' => 'A zona eleitoral selecionada não pertence ao município informado.',
            ]);
        }
    }

    private function normalizarCampoOpcional(null|string|int|float $valor): ?string
    {
        if ($valor === null) {
            return null;
        }

        $texto = trim((string) $valor);
        return $texto !== '' ? $texto : null;
    }

    private function normalizarInteiro(mixed $valor): ?int
    {
        if ($valor === null || $valor === '') {
            return null;
        }

        return is_numeric($valor) ? (int) $valor : null;
    }
}