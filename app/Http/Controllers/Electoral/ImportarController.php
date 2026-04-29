<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use App\Services\ImportadorSecaoService;
use App\Services\ImportadorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ImportarController extends Controller
{
    private const TAMANHO_LOTE_V2 = 5000;

    

    


    private function registrarRejeicaoImportacaoV3(
        int $importacaoId,
        string $tipo,
        int $numeroLinha,
        string $motivo,
        array $dadosLinha = [],
        ?string $erroDetalhado = null
    ): void {
        DB::table('importacoes_rejeicoes')->insert([
            'importacao_id'  => $importacaoId,
            'tipo_arquivo'   => $tipo,
            'numero_linha'   => $numeroLinha > 0 ? $numeroLinha : null,
            'motivo'         => $motivo,
            'erro_detalhado' => $erroDetalhado !== null ? mb_substr($erroDetalhado, 0, 65535) : null,
            'dados_linha'    => !empty($dadosLinha) ? json_encode($dadosLinha, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);
    }

    private function obterOuCriarComCacheV2(array &$cache, string $chave, callable $resolver): int
    {
        if (isset($cache[$chave])) {
            return $cache[$chave];
        }

        $id = (int) $resolver();
        $cache[$chave] = $id;
        return $id;
    }

    private function valorV2(array $dados, string $coluna): ?string
    {
        return array_key_exists($coluna, $dados) ? (string) $dados[$coluna] : null;
    }

    private function valorPorAliasV2(array $dados, array $aliases): ?string
    {
        foreach ($aliases as $alias) {
            $valor = $this->valorV2($dados, $alias);
            if ($valor !== null && trim($valor) !== '') {
                return $valor;
            }
        }

        return null;
    }

    private function mapearLinhaPorCabecalhoV2(array $cabecalho, array $linha): array
    {
        if (empty($cabecalho)) {
            return [];
        }

        $dados = [];
        $totalCabecalho = count($cabecalho);

        for ($i = 0; $i < $totalCabecalho; $i++) {
            $coluna = (string) $cabecalho[$i];

            if ($coluna === '') {
                continue;
            }

            $dados[$coluna] = array_key_exists($i, $linha) ? (string) $linha[$i] : null;
        }

        return $dados;
    }

    private function detectarSeparadorCsvV2(string $linha): string
    {
        $separadores = [
            ';' => substr_count($linha, ';'),
            ',' => substr_count($linha, ','),
            "\t" => substr_count($linha, "\t"),
            '|' => substr_count($linha, '|'),
        ];

        arsort($separadores);
        $separador = (string) array_key_first($separadores);

        return ($separadores[$separador] ?? 0) > 0 ? $separador : ';';
    }

    private function normalizarTextoV2(?string $valor): string
    {
        if ($valor === null) {
            return '';
        }

        $texto = trim($valor);
        if ($texto === '') {
            return '';
        }

        $texto = mb_convert_encoding($texto, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
        $texto = trim($texto);

        // Valores que o TSE usa para indicar "não preenchido" — tratamos como vazio
        if (in_array($texto, ['#NULO', '#NULO#', '#NE', '#NE#', '-1', '#'], true)) {
            return '';
        }

        return $texto;
    }

    private function inteiroV2(?string $valor): ?int
    {
        $texto = $this->normalizarTextoV2($valor);
        if ($texto === '') {
            return null;
        }

        $somenteNumeros = preg_replace('/[^0-9\-]/', '', $texto);
        if ($somenteNumeros === '' || $somenteNumeros === null || !is_numeric($somenteNumeros)) {
            return null;
        }

        return (int) $somenteNumeros;
    }

    private function normalizarNomeV2(string $nome): string
    {
        $normalizado = mb_strtolower($this->normalizarTextoV2($nome));
        $normalizado = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalizado) ?: $normalizado;
        $normalizado = preg_replace('/\s+/', ' ', $normalizado) ?? $normalizado;
        return trim($normalizado);
    }

    // GET /api/imports
    public function historico()
    {
        return response()->json(
            DB::table('importacoes')
                ->select('id', 'arquivo_nome', 'tipo', 'status', 'total_linhas', 'importados', 'erros', 'created_at')
                ->orderByDesc('id')
                ->limit(100)
                ->get()
        );
    }

    // DELETE /api/imports/{id}
    public function destroy(int $id)
    {
        $importacao = DB::table('importacoes')->where('id', $id)->first();
        if (!$importacao) {
            return response()->json(['error' => 'Importacao nao encontrada.'], 404);
        }

        DB::beginTransaction();
        try {
            $tabelas = [
                'importacoes_rejeicoes',
                'votos',
                'votos_zona',
                'votos_secao',
                'votos_municipio',
                'secoes',
                'candidaturas',
                'pessoas',
                'partidos',
                'cargos',
                'eleicoes',
            ];

            $apagados = [];
            foreach ($tabelas as $tabela) {
                $quantidade = DB::table($tabela)
                    ->where('importacao_id', $id)
                    ->delete();

                if ($quantidade > 0) {
                    $apagados[$tabela] = $quantidade;
                }
            }

            DB::table('importacoes')->where('id', $id)->delete();
            DB::commit();

            return response()->json([
                'success' => true,
                'apagados' => $apagados,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Nao foi possivel excluir a importacao: ' . $e->getMessage(),
            ], 422);
        }
    }


    

    // ══════════════════════════════════════════════════════════════════════════════
    // POST /api/import/v3  —  Fluxo em duas etapas (arquivo base + seções)
    // ══════════════════════════════════════════════════════════════════════════════

    public function storeV3(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:200000',
            'tipo' => 'nullable|in:candidato_munzona,votos_secao,municipio_referencia,boletim_urna',
        ]);

        $arquivo = $request->file('file');
        $path    = $arquivo->getRealPath();

        $handle = fopen($path, 'r');
        if (!$handle) {
            return response()->json(['error' => 'Não foi possível abrir o arquivo.'], 422);
        }

        $primLinha = fgets($handle);
        rewind($handle);
        $sep = $this->detectarSeparadorCsvV2((string) $primLinha);

        $headerRaw = fgetcsv($handle, 0, $sep, '"', '\\');
        if (!$headerRaw) {
            fclose($handle);
            return response()->json(['error' => 'Arquivo sem cabeçalho válido.'], 422);
        }

        $header = array_map(function ($h) {
            $v = trim(ltrim((string) $h, "\xEF\xBB\xBF"));
            return mb_strtoupper($this->normalizarTextoV2($v));
        }, $headerRaw);

        $tipo = $request->input('tipo') ?? $this->detectarTipoV3($header);
        if (!$tipo) {
            fclose($handle);
            return response()->json(['error' => 'Tipo de arquivo não reconhecido. Cabeçalho deve conter: QT_VOTOS_NOMINAIS (arquivo base), NR_SECAO + QT_VOTOS (seções), ou CD_MUNICIPIO_TSE + CD_MUNICIPIO_IBGE (referência de municípios).'], 422);
        }

        $totalLinhas = 0;
        $importados  = 0;
        $erros       = 0;
        $importacaoId = null;

        $cache = [
            'eleicao'     => [],
            'partido'     => [],
            'municipio'   => [],
            'zona'        => [],
            'local'       => [],
            'cargo'       => [],
            'pessoa'      => [],
            'candidatura' => [],
            'secao'       => [],
            'sq_cand'     => [],   // sq_candidato|eleicao_id → candidatura_id
        ];

        $eleicaoIdsProcessados   = [];
        $municipioIdsProcessados = [];
        $loteAtual = [];

        try {
            DB::beginTransaction();
            $importacaoId = DB::table('importacoes')->insertGetId([
                'arquivo_nome' => $arquivo->getClientOriginalName(),
                'tipo'         => $tipo,
                'status'       => 'processando',
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);
            DB::commit();

            while (($row = fgetcsv($handle, 0, $sep, '"', '\\')) !== false) {
                $totalLinhas++;
                $numeroLinhaArquivo = $totalLinhas + 1;
                $data = $this->mapearLinhaPorCabecalhoV2($header, $row);
                if (empty($data)) {
                    $erros++;
                    $this->registrarRejeicaoImportacaoV3(
                        $importacaoId,
                        $tipo,
                        $numeroLinhaArquivo,
                        'Linha sem dados mapeaveis pelo cabecalho.',
                        ['linha_bruta' => $row]
                    );
                    continue;
                }
                $loteAtual[] = [
                    'dados'       => $data,
                    'numero_linha'=> $numeroLinhaArquivo,
                ];

                if (count($loteAtual) >= self::TAMANHO_LOTE_V2) {
                    [$ok, $err, $eleicoes, $municipios] = $this->processarLoteV3($loteAtual, $tipo, $cache, $importacaoId);
                    $importados += $ok;
                    $erros      += $err;
                    foreach ($eleicoes   as $eid) { $eleicaoIdsProcessados[$eid]   = true; }
                    foreach ($municipios as $mid) { $municipioIdsProcessados[$mid] = true; }
                    $loteAtual = [];
                }
            }

            if (!empty($loteAtual)) {
                [$ok, $err, $eleicoes, $municipios] = $this->processarLoteV3($loteAtual, $tipo, $cache, $importacaoId);
                $importados += $ok;
                $erros      += $err;
                foreach ($eleicoes   as $eid) { $eleicaoIdsProcessados[$eid]   = true; }
                foreach ($municipios as $mid) { $municipioIdsProcessados[$mid] = true; }
            }

            DB::table('importacoes')->where('id', $importacaoId)->update([
                'status'       => 'concluida',
                'total_linhas' => $totalLinhas,
                'importados'   => $importados,
                'erros'        => $erros,
                'updated_at'   => now(),
            ]);
        } catch (\Throwable $e) {
            if ($importacaoId) {
                DB::table('importacoes')->where('id', $importacaoId)->update([
                    'status'        => 'falha',
                    'mensagem_erro' => mb_substr($e->getMessage(), 0, 65535),
                    'total_linhas'  => $totalLinhas,
                    'importados'    => $importados,
                    'erros'         => $erros,
                    'updated_at'    => now(),
                ]);
            }

            fclose($handle);
            return response()->json(['error' => 'Erro ao importar v3: ' . $e->getMessage()], 500);
        }

        fclose($handle);

        return response()->json([
            'success'      => true,
            'importacao_id'=> $importacaoId,
            'tipo'         => $tipo,
            'importados'   => $importados,
            'erros'        => $erros,
            'total_linhas' => $totalLinhas,
        ]);
    }

    // ── Detecção de tipo pelo cabeçalho ──────────────────────────────────────────

    private function detectarTipoV3(array $header): ?string
    {
        $campos = array_flip($header);

        // Arquivo base: tem votos nominais (por candidato, por município/zona)
        if (isset($campos['QT_VOTOS_NOMINAIS'])) {
            return 'candidato_munzona';
        }

        // Arquivo complementar: tem número de seção e quantidade de votos
        if (isset($campos['NR_SECAO']) && isset($campos['QT_VOTOS'])) {
            return 'votos_secao';
        }

        // Boletim de Urna: tem aptos + tipo_votavel explícito
        if (isset($campos['QT_APTOS']) && isset($campos['CD_TIPO_VOTAVEL'])) {
            return 'boletim_urna';
        }

        // Referência TSE/IBGE de municípios
        if (isset($campos['CD_MUNICIPIO_TSE']) && isset($campos['CD_MUNICIPIO_IBGE'])) {
            return 'municipio_referencia';
        }

        return null;
    }

    // ── Despacha lote para o handler correto ─────────────────────────────────────

    private function processarLoteV3(array $lote, string $tipo, array &$cache, int $importacaoId): array
    {
        $ok         = 0;
        $erro       = 0;
        $eleicoes   = [];
        $municipios = [];

        DB::transaction(function () use ($lote, $tipo, &$cache, $importacaoId, &$ok, &$erro, &$eleicoes, &$municipios) {
            foreach ($lote as $itemLote) {
                $registro    = $itemLote['dados'] ?? [];
                $numeroLinha = (int) ($itemLote['numero_linha'] ?? 0);

                try {
                    if ($tipo === 'votos_secao') {
                        // Arquivo de votos por seção — tem SQ_CANDIDATO, local com nome/endereço
                        $resultado = $this->processarVotosSecaoV3($registro, $cache, $importacaoId);
                        if ($resultado) {
                            $ok++;
                            $eleicoes[$resultado['eleicao']]     = true;
                            $municipios[$resultado['municipio']] = true;
                        } else {
                            $erro++;
                            $this->registrarRejeicaoImportacaoV3($importacaoId, $tipo, $numeroLinha,
                                'Registro rejeitado por campos obrigatorios ausentes ou invalidos.', $registro);
                        }

                    } elseif ($tipo === 'boletim_urna') {
                        // Boletim de Urna — tem aptos/comparecimento/abstencoes e tipo_votavel explícito
                        $resultado = $this->processarBoletimUrna($registro, $cache, $importacaoId);
                        if ($resultado) {
                            $ok++;
                            $eleicoes[$resultado['eleicao']]     = true;
                            $municipios[$resultado['municipio']] = true;
                        } else {
                            $erro++;
                            $this->registrarRejeicaoImportacaoV3($importacaoId, $tipo, $numeroLinha,
                                'Registro rejeitado por campos obrigatorios ausentes ou invalidos.', $registro);
                        }

                    } elseif ($tipo === 'municipio_referencia') {
                        // Tabela de referência TSE/IBGE de municípios
                        $processado = $this->processarMunicipioReferencia($registro);
                        if ($processado) {
                            $ok++;
                        } else {
                            $erro++;
                            $this->registrarRejeicaoImportacaoV3($importacaoId, $tipo, $numeroLinha,
                                'Registro rejeitado: CD_MUNICIPIO_TSE ou CD_MUNICIPIO_IBGE ausentes.', $registro);
                        }

                    } else {
                        // candidato_munzona — arquivo base com candidatos e totais por zona
                        $eleicaoId = $this->processarCandidatoMunzona($registro, $cache, $importacaoId);
                        if ($eleicaoId) {
                            $ok++;
                            $eleicoes[$eleicaoId] = true;
                        } else {
                            $erro++;
                            $this->registrarRejeicaoImportacaoV3($importacaoId, $tipo, $numeroLinha,
                                'Registro rejeitado por campos obrigatorios ausentes ou invalidos.', $registro);
                        }
                    }

                } catch (\Throwable $e) {
                    $erro++;
                    $this->registrarRejeicaoImportacaoV3($importacaoId, $tipo, $numeroLinha,
                        'Falha ao processar registro.', $registro, $e->getMessage());
                }
            }
        });

        return [$ok, $erro, array_keys($eleicoes), array_keys($municipios)];
    }

    // ── Resolvers compartilhados V3 ───────────────────────────────────────────────

    private function resolverEleicaoV3(int $ano, string $tipo, string $descricao, int $turno, string $uf, array &$cache, int $importacaoId): int
    {
        $chave = $ano . '|' . $tipo . '|' . $turno . '|' . $uf;
        return $this->obterOuCriarComCacheV2($cache['eleicao'], $chave, function () use ($ano, $tipo, $descricao, $turno, $uf, $importacaoId) {
            $id = DB::table('eleicoes')->where('ano', $ano)->value('id');
            $desc = $descricao !== '' ? $descricao : trim($tipo . ' turno ' . $turno . ' ' . $uf);
            $desc = $desc !== '' ? $desc : (string) $ano;

            if (!$id) {
                return DB::table('eleicoes')->insertGetId([
                    'ano' => $ano, 'descricao' => $desc,
                    'importacao_id' => $importacaoId,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            DB::table('eleicoes')->where('id', $id)->update(['descricao' => $desc, 'importacao_id' => $importacaoId, 'updated_at' => now()]);
            return (int) $id;
        });
    }

    private function resolverCargoV3(string $cdCargo, string $dsCargo, array &$cache, int $importacaoId): int
    {
        $chave = $cdCargo !== '' ? $cdCargo : $dsCargo;
        return $this->obterOuCriarComCacheV2($cache['cargo'], $chave, function () use ($cdCargo, $dsCargo, $importacaoId) {
            $desc = $dsCargo !== '' ? $dsCargo : ('Cargo ' . $cdCargo);
            $id = DB::table('cargos')->where('descricao', $desc)->value('id');
            if (!$id) {
                $id = DB::table('cargos')->insertGetId([
                    'descricao' => $desc, 'importacao_id' => $importacaoId,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            return (int) $id;
        });
    }

    private function resolverPartidoV3(?int $nrPartido, string $sgPartido, string $nmPartido, array &$cache, int $importacaoId): int
    {
        $chave = ($nrPartido ?? 0) . '|' . $sgPartido;
        return $this->obterOuCriarComCacheV2($cache['partido'], $chave, function () use ($nrPartido, $sgPartido, $nmPartido, $importacaoId) {
            $id = null;
            if ($sgPartido !== '') {
                $id = DB::table('partidos')->where('sigla', $sgPartido)->value('id');
            }
            if (!$id && $nrPartido !== null) {
                $id = DB::table('partidos')->where('numero', $nrPartido)->value('id');
            }
            if (!$id) {
                $id = DB::table('partidos')->insertGetId([
                    'sigla' => $sgPartido !== '' ? $sgPartido : 'SEM',
                    'nome'  => $nmPartido !== '' ? $nmPartido : null,
                    'numero'=> $nrPartido,
                    'importacao_id' => $importacaoId,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            } else {
                DB::table('partidos')->where('id', $id)->update([
                    'nome'  => $nmPartido !== '' ? $nmPartido : DB::raw('nome'),
                    'numero'=> $nrPartido ?? DB::raw('numero'),
                    'importacao_id' => $importacaoId, 'updated_at' => now(),
                ]);
            }
            return (int) $id;
        });
    }

    private function resolverMunicipioV3(int $cdMunicipio, string $nmMunicipio, string $uf, array &$cache, int $importacaoId): int
    {
        $chave = (string) $cdMunicipio;
        return $this->obterOuCriarComCacheV2($cache['municipio'], $chave, function () use ($cdMunicipio, $nmMunicipio, $uf, $importacaoId) {
            $codigoTse = (string) $cdMunicipio;
            $id = DB::table('municipios')->where('codigo_tse', $codigoTse)->value('id');
            if (!$id && $nmMunicipio !== '') {
                $id = DB::table('municipios')->where('nome', $nmMunicipio)->where('uf', $uf)->value('id');
            }
            if (!$id) {
                $id = DB::table('municipios')->insertGetId([
                    'nome' => $nmMunicipio, 'uf' => $uf !== '' ? $uf : null,
                    'codigo_tse' => $codigoTse,
                    'latitude' => null, 'longitude' => null,
                    'importacao_id' => $importacaoId,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            } else {
                DB::table('municipios')->where('id', $id)->update([
                    'nome' => $nmMunicipio !== '' ? $nmMunicipio : DB::raw('nome'),
                    'uf'   => $uf !== '' ? $uf : DB::raw('uf'),
                    'importacao_id' => $importacaoId, 'updated_at' => now(),
                ]);
            }
            return (int) $id;
        });
    }

    private function resolverZonaV3(string $nrZona, int $municipioId, array &$cache, int $importacaoId): int
    {
        $chave = $nrZona . '|' . $municipioId;
        return $this->obterOuCriarComCacheV2($cache['zona'], $chave, function () use ($nrZona, $municipioId, $importacaoId) {
            $id = DB::table('zonas_eleitorais')->where('numero', $nrZona)->where('municipio_id', $municipioId)->value('id');
            if (!$id) {
                $id = DB::table('zonas_eleitorais')->insertGetId([
                    'numero' => $nrZona, 'municipio_id' => $municipioId,
                    'importacao_id' => $importacaoId,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            return (int) $id;
        });
    }

    private function resolverLocalV3(string $nrLocal, string $nmLocal, string $dsEndereco, int $municipioId, int $zonaId, array &$cache, int $importacaoId): int
    {
        $chave = $nrLocal . '|' . $municipioId;
        return $this->obterOuCriarComCacheV2($cache['local'], $chave, function () use ($nrLocal, $nmLocal, $dsEndereco, $municipioId, $zonaId, $importacaoId) {
            $id = DB::table('locais_votacao')->where('numero', $nrLocal)->where('municipio_id', $municipioId)->value('id');
            if (!$id) {
                $id = DB::table('locais_votacao')->insertGetId([
                    'numero'      => $nrLocal !== '' ? $nrLocal : null,
                    'nome'        => $nmLocal !== '' ? $nmLocal : null,
                    'endereco'    => $dsEndereco !== '' ? $dsEndereco : null,
                    'municipio_id'=> $municipioId,
                    'zona_id'     => $zonaId,
                    'latitude'    => null, 'longitude' => null,
                    'importacao_id' => $importacaoId,
                    'created_at'  => now(), 'updated_at' => now(),
                ]);
            } else {
                DB::table('locais_votacao')->where('id', $id)->update([
                    'nome'     => $nmLocal !== '' ? $nmLocal : DB::raw('nome'),
                    'endereco' => $dsEndereco !== '' ? $dsEndereco : DB::raw('endereco'),
                    'importacao_id' => $importacaoId, 'updated_at' => now(),
                ]);
            }
            return (int) $id;
        });
    }

    private function resolverSecaoV3(string $nrSecao, int $zonaId, ?int $localId, array &$cache, int $importacaoId): int
    {
        $chave = $nrSecao . '|' . $zonaId;
        return $this->obterOuCriarComCacheV2($cache['secao'], $chave, function () use ($nrSecao, $zonaId, $localId, $importacaoId) {
            $id = DB::table('secoes')->where('numero', $nrSecao)->where('zona_id', $zonaId)->value('id');
            if (!$id) {
                $id = DB::table('secoes')->insertGetId([
                    'numero'           => $nrSecao,
                    'zona_id'          => $zonaId,
                    'local_votacao_id' => $localId,
                    'importacao_id'    => $importacaoId,
                    'created_at'       => now(), 'updated_at' => now(),
                ]);
            } else {
                $update = ['importacao_id' => $importacaoId, 'updated_at' => now()];
                // Só atualiza local se tiver um valor — evita sobrescrever com null (ex: BU não tem nome do local)
                if ($localId !== null) {
                    $update['local_votacao_id'] = $localId;
                }
                DB::table('secoes')->where('id', $id)->update($update);
            }
            return (int) $id;
        });
    }

    // ── Pós-processamento: reconstrói votos_municipio a partir da base ────────────

    private function reconstruirVotosMunicipioDaBase(array $eleicaoIds, int $importacaoId): void
    {
        if (empty($eleicaoIds)) return;

        DB::transaction(function () use ($eleicaoIds, $importacaoId) {
            // Remove apenas os votos_municipio das eleições afetadas (base)
            DB::table('votos_municipio')
                ->whereIn('eleicao_id', $eleicaoIds)
                ->delete();

            DB::insert(
                'INSERT INTO votos_municipio
                    (candidatura_id, municipio_id, eleicao_id, cargo_id,
                     total_votos, total_aptos, total_comparecimento, total_abstencoes,
                     total_secoes, created_at, updated_at, importacao_id)
                 SELECT
                    vz.candidatura_id,
                    ze.municipio_id,
                    vz.eleicao_id,
                    vz.cargo_id,
                    SUM(vz.total_votos),
                    0, 0, 0,
                    COUNT(DISTINCT vz.zona_id),
                    NOW(), NOW(), ?
                 FROM votos_zona vz
                 JOIN zonas_eleitorais ze ON ze.id = vz.zona_id
                 WHERE vz.fonte = \'base\'
                   AND vz.eleicao_id IN (' . implode(',', array_fill(0, count($eleicaoIds), '?')) . ')
                 GROUP BY vz.candidatura_id, ze.municipio_id, vz.eleicao_id, vz.cargo_id',
                array_merge([$importacaoId], $eleicaoIds)
            );
        });
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // POST /api/import/v4 — Importa apenas para a tabela matriz
    // ══════════════════════════════════════════════════════════════════════════════
    /**
     * Fluxo separado:
     * 1. CSV → raw_candidatos (cópia bruta, sem transformação)
     *
     * A validação e geração das tabelas finais ficam no endpoint processarV4().
     */
    public function storeV4(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:200000',
        ]);

        $arquivo = $request->file('file');
        $importadorService = new ImportadorService();

        try {
            // 1️⃣ Criar registro de importação
            $importacaoId = DB::table('importacoes')->insertGetId([
                'arquivo_nome' => $arquivo->getClientOriginalName(),
                'tipo'         => 'candidato_munzona',
                'status'       => 'importando_matriz',
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            // 2️⃣ CSV → raw_candidatos (rápido, sem transformação)
            $resultado1 = $importadorService->importarParaMatriz($arquivo, $importacaoId);

            // 3️⃣ Atualiza status da importação. A geração fica para outro fluxo.
            DB::table('importacoes')
                ->where('id', $importacaoId)
                ->update([
                    'status'       => 'matriz_importada',
                    'total_linhas' => $resultado1['total_linhas'],
                    'importados'   => 0,
                    'erros'        => 0,
                    'updated_at'   => now(),
                ]);

            return response()->json([
                'success'       => true,
                'importacao_id' => $importacaoId,
                'total_linhas'  => $resultado1['total_linhas'],
                'importados'    => 0,
                'erros'         => 0,
                'status'        => 'matriz_importada',
                'message'       => 'Arquivo importado para a tabela matriz. A geração das tabelas finais deve ser executada separadamente.',
            ]);

        } catch (\Throwable $e) {
            // Marcar importação como falha
            if (isset($importacaoId)) {
                DB::table('importacoes')
                    ->where('id', $importacaoId)
                    ->update([
                        'status'        => 'falha',
                        'mensagem_erro' => mb_substr($e->getMessage(), 0, 65535),
                        'updated_at'    => now(),
                    ]);
            }

            return response()->json([
                'error' => 'Erro ao importar: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // POST /api/imports/{id}/gerar — Processa matriz para as tabelas finais
    // ══════════════════════════════════════════════════════════════════════════════
    /**
     * Executa a geração das tabelas finais a partir da matriz já importada.
     */
    public function processarV4(int $id)
    {
        $importacao = DB::table('importacoes')->where('id', $id)->first();
        if (!$importacao) {
            return response()->json(['error' => 'Importacao nao encontrada.'], 404);
        }

        if (!in_array($importacao->tipo, ['candidato_munzona', 'votos_secao', 'boletim_urna'], true)) {
            return response()->json([
                'error' => 'Esta geracao separada esta disponivel apenas para importacoes do tipo candidato_munzona, votos_secao ou boletim_urna.',
            ], 422);
        }

        $usaRawSecoes = in_array($importacao->tipo, ['votos_secao', 'boletim_urna'], true);
        $tabelaRaw = $usaRawSecoes ? 'raw_secoes' : 'raw_candidatos';

        $pendentes = DB::table($tabelaRaw)
            ->where('importacao_id', $id)
            ->where('status', 'pendente')
            ->count();

        if ($pendentes === 0) {
            return response()->json([
                'error' => 'Nao ha registros pendentes para gerar nesta importacao.',
            ], 422);
        }

        $importadorService = $usaRawSecoes
            ? new ImportadorSecaoService()
            : new ImportadorService();

        try {
            DB::table('importacoes')
                ->where('id', $id)
                ->update([
                    'status'     => 'gerando',
                    'updated_at' => now(),
                ]);

            $validacao = $importadorService->validarMatriz($id);
            $resultado = $importadorService->processarMatriz($id);
            $totalErros = $validacao['total_erros'] + $resultado['falhas'];

            DB::table('importacoes')
                ->where('id', $id)
                ->update([
                    'status'     => 'concluida',
                    'importados' => $resultado['processados'],
                    'erros'      => $totalErros,
                    'updated_at' => now(),
                ]);

            return response()->json([
                'success'       => true,
                'importacao_id' => $id,
                'importados'    => $resultado['processados'],
                'erros'         => $totalErros,
                'validacao'     => [
                    'erros_validacao' => $validacao['total_erros'],
                    'primeiros_erros' => array_slice($validacao['erros_por_linha'], 0, 10),
                ],
            ]);
        } catch (\Throwable $e) {
            DB::table('importacoes')
                ->where('id', $id)
                ->update([
                    'status'        => 'falha',
                    'mensagem_erro' => mb_substr($e->getMessage(), 0, 65535),
                    'updated_at'    => now(),
                ]);

            return response()->json([
                'error' => 'Erro ao gerar dados da importacao: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ── Arquivo 3: boletim_urna — preenche participação e tipo_voto explícito ──────

    private function processarBoletimUrna(array $r, array &$cache, int $importacaoId): ?array
    {
        $ano         = $this->inteiroV2($this->valorV2($r, 'ANO_ELEICAO'));
        $tipo        = $this->normalizarTextoV2($this->valorV2($r, 'NM_TIPO_ELEICAO'));
        $descricao   = $this->normalizarTextoV2($this->valorV2($r, 'DS_ELEICAO'));
        $turno       = $this->inteiroV2($this->valorV2($r, 'NR_TURNO')) ?? 1;
        $uf          = $this->normalizarTextoV2($this->valorV2($r, 'SG_UF'));

        $cdMunicipio = $this->inteiroV2($this->valorV2($r, 'CD_MUNICIPIO'));
        $nmMunicipio = $this->normalizarTextoV2($this->valorV2($r, 'NM_MUNICIPIO'));
        $nrZona      = $this->normalizarTextoV2($this->valorV2($r, 'NR_ZONA'));
        $nrSecao     = $this->normalizarTextoV2($this->valorV2($r, 'NR_SECAO'));
        $nrLocal     = $this->normalizarTextoV2($this->valorV2($r, 'NR_LOCAL_VOTACAO'));

        // O BU usa CD_CARGO_PERGUNTA em vez de CD_CARGO
        $cdCargo     = $this->normalizarTextoV2($this->valorPorAliasV2($r, ['CD_CARGO_PERGUNTA', 'CD_CARGO']));
        $dsCargo     = $this->normalizarTextoV2($this->valorPorAliasV2($r, ['DS_CARGO_PERGUNTA', 'DS_CARGO']));

        $nrVotavel   = $this->normalizarTextoV2($this->valorV2($r, 'NR_VOTAVEL'));
        $nmVotavel   = $this->normalizarTextoV2($this->valorV2($r, 'NM_VOTAVEL'));
        $qtVotos     = $this->inteiroV2($this->valorV2($r, 'QT_VOTOS')) ?? 0;

        // Dados exclusivos do BU — participação eleitoral por seção
        $qtAptos          = $this->inteiroV2($this->valorV2($r, 'QT_APTOS'))          ?? 0;
        $qtComparecimento = $this->inteiroV2($this->valorV2($r, 'QT_COMPARECIMENTO')) ?? 0;
        $qtAbstencoes     = $this->inteiroV2($this->valorV2($r, 'QT_ABSTENCOES'))     ?? 0;

        // CD_TIPO_VOTAVEL: 1=Nominal, 2=Branco, 3=Nulo, 4=Legenda
        $cdTipoVotavel = $this->inteiroV2($this->valorV2($r, 'CD_TIPO_VOTAVEL'));
        $tipoVoto      = $cdTipoVotavel === 1 ? 'nominal' : 'especial';

        if (!$ano || !$cdMunicipio || $nrZona === '' || $nrSecao === '' || $nrVotavel === '') {
            return null;
        }

        $eleicaoId   = $this->resolverEleicaoV3($ano, $tipo, $descricao, $turno, $uf, $cache, $importacaoId);
        $municipioId = $this->resolverMunicipioV3($cdMunicipio, $nmMunicipio, $uf, $cache, $importacaoId);
        $zonaId      = $this->resolverZonaV3($nrZona, $municipioId, $cache, $importacaoId);
        $cargoId     = $this->resolverCargoV3($cdCargo, $dsCargo, $cache, $importacaoId);

        // BU não tem nome/endereço do local — só busca, nunca cria sem nome
        $localId = null;
        if ($nrLocal !== '') {
            $chaveLocal = $nrLocal . '|' . $municipioId;
            if (isset($cache['local'][$chaveLocal])) {
                $localId = $cache['local'][$chaveLocal];
            } else {
                $found = DB::table('locais_votacao')
                    ->where('numero', $nrLocal)
                    ->where('municipio_id', $municipioId)
                    ->value('id');
                if ($found) {
                    $localId = (int) $found;
                    $cache['local'][$chaveLocal] = $localId;
                }
            }
        }

        $secaoId = $this->resolverSecaoV3($nrSecao, $zonaId, $localId, $cache, $importacaoId);

        // Estratégia de atualização:
        // - Se o voto já existe (importado pelo votos_secao): atualiza apenas participação e tipo_voto
        //   SEM sobrescrever candidatura_id (que foi vinculado via SQ_CANDIDATO)
        // - Se não existe: insere novo registro sem candidatura_id (BU não tem SQ_CANDIDATO)
        $existing = DB::table('votos')
            ->where('nr_votavel',  $nrVotavel)
            ->where('secao_id',    $secaoId)
            ->where('eleicao_id',  $eleicaoId)
            ->where('cargo_id',    $cargoId)
            ->value('id');

        if ($existing) {
            DB::table('votos')->where('id', $existing)->update([
                'tipo_voto'      => $tipoVoto,
                'votos'          => $qtVotos,
                'aptos'          => $qtAptos,
                'comparecimento' => $qtComparecimento,
                'abstencoes'     => $qtAbstencoes,
                'updated_at'     => now(),
            ]);
        } else {
            DB::table('votos')->insert([
                'candidatura_id' => null,   // BU não tem SQ_CANDIDATO
                'nr_votavel'     => $nrVotavel,
                'nm_votavel'     => $nmVotavel !== '' ? $nmVotavel : null,
                'tipo_voto'      => $tipoVoto,
                'secao_id'       => $secaoId,
                'zona_id'        => $zonaId,
                'municipio_id'   => $municipioId,
                'eleicao_id'     => $eleicaoId,
                'cargo_id'       => $cargoId,
                'votos'          => $qtVotos,
                'aptos'          => $qtAptos,
                'comparecimento' => $qtComparecimento,
                'abstencoes'     => $qtAbstencoes,
                'importacao_id'  => $importacaoId,
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        }

        return ['eleicao' => $eleicaoId, 'municipio' => $municipioId];
    }

    // ── Arquivo de Referência: municipio_referencia (TSE/IBGE) ───────────────────

    private function processarMunicipioReferencia(array $r): bool
    {
        $cdTse   = $this->normalizarTextoV2($this->valorV2($r, 'CD_MUNICIPIO_TSE'));
        $cdIbge  = $this->normalizarTextoV2($this->valorV2($r, 'CD_MUNICIPIO_IBGE'));
        $nmIbge  = $this->normalizarTextoV2($this->valorV2($r, 'NM_MUNICIPIO_IBGE'));
        $nmTse   = $this->normalizarTextoV2($this->valorV2($r, 'NM_MUNICIPIO_TSE'));
        $sgUf    = $this->normalizarTextoV2($this->valorV2($r, 'SG_UF'));
        $nmUf    = $this->normalizarTextoV2($this->valorV2($r, 'NM_UF'));

        if ($cdTse === '' || $cdIbge === '') {
            return false;
        }

        // Nome canônico: IBGE; fallback TSE
        $nome = $nmIbge !== '' ? $nmIbge : ($nmTse !== '' ? $nmTse : 'Desconhecido');

        DB::table('municipios')->updateOrInsert(
            ['codigo_tse' => $cdTse],
            [
                'nome'        => $nome,
                'nome_tse'    => $nmTse !== '' && $nmTse !== $nome ? $nmTse : null,
                'uf'          => $sgUf !== '' ? $sgUf : null,
                'nm_uf'       => $nmUf !== '' ? $nmUf : null,
                'codigo_ibge' => $cdIbge !== '' ? $cdIbge : null,
                'updated_at'  => now(),
                'created_at'  => now(),
            ]
        );

        return true;
    }

    // ── Validação de consistência entre seções e arquivo base ────────────────────

    private function validarConsistenciaSecoes(array $eleicaoIds, array $municipioIds = []): array
    {
        if (empty($eleicaoIds)) return [];

        $eleicaoPlaceholders = implode(',', array_fill(0, count($eleicaoIds), '?'));
        $bindings = $eleicaoIds;

        $municipioClause = '';
        if (!empty($municipioIds)) {
            $municipioPlaceholders = implode(',', array_fill(0, count($municipioIds), '?'));
            $municipioClause = "AND ze.municipio_id IN ({$municipioPlaceholders})";
            $bindings = array_merge($bindings, $municipioIds);
        }

        $divergencias = DB::select(
            "SELECT
                c.sq_candidato,
                p.nome            AS candidato_nome,
                ze.numero         AS nr_zona,
                m.nome            AS municipio_nome,
                vz.total_votos    AS votos_base,
                COALESCE(SUM(v.votos), 0) AS votos_secoes,
                ABS(vz.total_votos - COALESCE(SUM(v.votos), 0)) AS divergencia
             FROM votos_zona vz
             JOIN candidaturas c      ON c.id  = vz.candidatura_id
             JOIN pessoas p           ON p.id  = c.pessoa_id
             JOIN zonas_eleitorais ze ON ze.id = vz.zona_id
             JOIN municipios m        ON m.id  = ze.municipio_id
             LEFT JOIN votos v        ON v.candidatura_id = vz.candidatura_id
                                     AND v.zona_id        = vz.zona_id
                                     AND v.tipo_voto      = 'nominal'
             WHERE vz.fonte = 'base'
               AND vz.eleicao_id IN ({$eleicaoPlaceholders})
               {$municipioClause}
             GROUP BY vz.id, c.sq_candidato, p.nome, ze.numero, m.nome, vz.total_votos
             HAVING divergencia > 0
             LIMIT 50",
            $bindings
        );

        return array_map(fn($row) => (array) $row, $divergencias);
    }

}
