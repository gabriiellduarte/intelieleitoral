<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AppGeocodingController extends Controller
{
    public function obterCoordenadas(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'cidade' => ['required', 'string', 'max:255'],
            'uf' => ['nullable', 'string', 'size:2'],
            'endereco' => ['nullable', 'string', 'max:255'],
            'pais' => ['nullable', 'string', 'max:100'],
        ]);

        $chaveApi = config('services.google_maps.geocoding_api_key');
        if (!$chaveApi) {
            return response()->json([
                'error' => 'A chave da API de geocodificacao do Google nao foi configurada.',
            ], 422);
        }

        $cidade = trim((string) $dados['cidade']);
        $uf = isset($dados['uf']) ? strtoupper(trim((string) $dados['uf'])) : '';
        $endereco = isset($dados['endereco']) ? trim((string) $dados['endereco']) : '';
        $pais = isset($dados['pais']) && trim((string) $dados['pais']) !== ''
            ? trim((string) $dados['pais'])
            : 'Brasil';

        $partesEndereco = array_values(array_filter([$endereco, $cidade, $uf, $pais], function ($valor) {
            return trim((string) $valor) !== '';
        }));

        $enderecoCompleto = implode(', ', $partesEndereco);

        $resposta = Http::timeout(10)
            ->retry(2, 250)
            ->get('https://maps.googleapis.com/maps/api/geocode/json', [
                'address' => $enderecoCompleto,
                'language' => 'pt-BR',
                'region' => 'br',
                'key' => $chaveApi,
            ]);

        if (!$resposta->ok()) {
            return response()->json([
                'error' => 'Falha ao consultar o Google Geocoding.',
                'detalhe' => 'HTTP ' . $resposta->status(),
            ], 502);
        }

        $corpo = $resposta->json();
        $status = (string) ($corpo['status'] ?? 'ERRO_DESCONHECIDO');
        $resultados = $corpo['results'] ?? [];

        if ($status !== 'OK' || empty($resultados)) {
            return response()->json([
                'error' => 'Nao foi possivel localizar coordenadas para o endereco informado.',
                'status_google' => $status,
            ], 404);
        }

        $primeiroResultado = $resultados[0];
        $localizacao = $primeiroResultado['geometry']['location'] ?? null;

        if (!$localizacao || !isset($localizacao['lat'], $localizacao['lng'])) {
            return response()->json([
                'error' => 'Resposta de geocodificacao sem coordenadas validas.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'latitude' => (float) $localizacao['lat'],
            'longitude' => (float) $localizacao['lng'],
            'endereco_formatado' => $primeiroResultado['formatted_address'] ?? null,
            'place_id' => $primeiroResultado['place_id'] ?? null,
        ]);
    }
}
