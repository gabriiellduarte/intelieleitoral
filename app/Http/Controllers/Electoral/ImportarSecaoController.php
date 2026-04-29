<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use App\Models\Importacao;
use App\Services\ImportadorSecaoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ImportarSecaoController extends Controller
{
    private ImportadorSecaoService $service;

    public function __construct(ImportadorSecaoService $service)
    {
        $this->service = $service;
    }

    /**
     * POST /api/import/secoes/v1
     *
     * Importa dados de VOTACAO_SECAO apenas para a tabela matriz:
     * 1. CSV → raw_secoes (cópia bruta)
     *
     * A validação e geração das tabelas finais ficam em POST /api/imports/{id}/gerar.
     */
    public function storeV1(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
            'tipo' => 'nullable|in:votos_secao,boletim_urna',
        ]);

        $arquivo = $request->file('file');
        $tipo = $request->input('tipo', 'votos_secao');

        try {
            // 1. Criar registro de importação
            
            $importacaoId = DB::table('importacoes')->insertGetId([
                'arquivo_nome' => $arquivo->getClientOriginalName(),
                'tipo'         => $tipo,
                'status'       => 'importando_matriz',
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            // 2. Importar CSV para matriz
            $resultado1 = $this->service->importarParaMatriz(
                $request->file('file'),
                $importacaoId
            );

            // 3. Atualizar status da importação. A geração fica para outro fluxo.
            DB::table('importacoes')->where('id', $importacaoId)->update([
                'status' => 'matriz_importada',
                'total_linhas' => $resultado1['total_linhas'],
                'importados' => 0,
                'erros' => 0,
                'updated_at' => now(),
            ]);

            return response()->json([
                'importacao_id' => $importacaoId,
                'tipo' => $tipo,
                'total_linhas' => $resultado1['total_linhas'],
                'importados' => 0,
                'erros' => 0,
                'status' => 'matriz_importada',
                'message' => 'Arquivo de seções importado para a tabela matriz. A geração das tabelas finais deve ser executada separadamente.',
            ], 200);

        } catch (\Throwable $e) {
            \Log::error("Erro na importação de seções: {$e->getMessage()}", [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            if (isset($importacaoId)) {
                DB::table('importacoes')->where('id', $importacaoId)->update([
                    'status' => 'falha',
                    'mensagem_erro' => mb_substr($e->getMessage(), 0, 65535),
                    'updated_at' => now(),
                ]);
            }

            return response()->json([
                'erro' => 'Erro ao importar seções',
                'mensagem' => $e->getMessage(),
                'status' => 'erro',
            ], 400);
        }
    }

    /**
     * GET /api/import/secoes/status/{importacao_id}
     *
     * Consulta o status de uma importação de seções
     */
    public function status($importacao_id)
    {
        $importacao = DB::table('importacoes')->where('id', $importacao_id)->first();

        if (!$importacao) {
            return response()->json([
                'erro' => 'Importação não encontrada',
                'status' => 'erro',
            ], 404);
        }

        return response()->json([
            'importacao_id' => $importacao->id,
            'tipo' => $importacao->tipo,
            'status' => $importacao->status,
            'total_linhas' => $importacao->total_linhas,
            'processados' => $importacao->processados,
            'erros' => $importacao->erros,
            'criado_em' => $importacao->created_at,
            'concluido_em' => $importacao->updated_at,
        ], 200);
    }

    /**
     * GET /api/import/secoes/erros/{importacao_id}
     *
     * Retorna erros encontrados durante importação
     */
    public function erros($importacao_id)
    {
        $erros = \DB::table('raw_secoes')
            ->where('importacao_id', $importacao_id)
            ->where('status', 'erro')
            ->select('numero_linha', 'erros')
            ->get();

        return response()->json([
            'importacao_id' => $importacao_id,
            'total_erros' => $erros->count(),
            'erros' => $erros,
        ], 200);
    }
}
